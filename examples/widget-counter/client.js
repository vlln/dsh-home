window.__ModuleLoader__.load({
  id: '@vlln/dsh-home-example-counter',
  factory(require) {
    const React = require('react'); // Shared host React; never bundle a second copy.
    const { Button, Input, Modal } = require('@deepseek-ai/dsh-client-ui-primitives');
    const h = React.createElement;
    const namespace = 'home.example.counter';
    const dictionaries = {
      en: {
        title: 'Example counter', description: 'Independent state, its own options editor and cleanup.',
        label: 'Label', start: 'Initial value', increment: 'Increment', ticks: 'Active seconds', default: 'Counter',
        options: 'Counter options', save: 'Save', cancel: 'Cancel', saving: 'Saving…',
        invalid: 'Use a label of at most 120 characters and a safe integer as the initial value.',
        saveError: 'Could not save counter options. Your draft is still here; try again or cancel.',
        legacyError: 'This counter has a legacy error flag. Open Counter options and save to recover.',
      },
      zh: {
        title: '示例计数器', description: '独立状态、自有选项编辑器与生命周期清理。',
        label: '标签', start: '初始值', increment: '加一', ticks: '活跃秒数', default: '计数器',
        options: '计数器选项', save: '保存', cancel: '取消', saving: '正在保存…',
        invalid: '标签不能超过 120 个字符，初始值必须是安全整数。',
        saveError: '计数器选项保存失败。草稿已保留，可重试或取消。',
        legacyError: '此计数器带有历史错误标记。打开「计数器选项」并保存即可恢复。',
      },
    };
    function validateConfig(config) {
      if (!config || typeof config !== 'object' || Array.isArray(config)) return 'config must be an object';
      if (typeof config.label !== 'string' || config.label.length > 120) return 'label must be a string of at most 120 characters';
      if (!Number.isSafeInteger(config.start)) return 'start must be a safe integer';
      if (config.fail !== undefined && typeof config.fail !== 'boolean') return 'fail must be a boolean';
      return true;
    }
    return {
      name: 'home-example-counter',
      apply(ctx) {
        // Home is OPTIONAL. A required top-level inject makes the whole shell fail boot if absent.
        // Never return this pending child fiber from outer apply.
        ctx.inject(['homeWidgets', 'locale'], scoped => {
          const locale = scoped.locale;
          scoped.effect(() => locale.register(namespace, dictionaries));
          const t = locale.bind(namespace);
          const subscribeLocale = fn => locale.subscribe(fn);
          const readLocale = () => locale.getSnapshot();
          function useLocale() { React.useSyncExternalStore(subscribeLocale, readLocale); }
          // Development-only observability, intentionally kept after cleanup so leak checks can inspect it.
          const stats = window.__homeExampleStats ||= { mounts: 0, unmounts: 0, activeTimers: 0, instances: {} };
          // Fields are private to this package; Home does not render or own this editor.
          function Fields({ draft, onDraftChange, disabled }) {
            const row = (text, input) => h('label', { style: { display: 'grid', gap: 4 } }, text, input);
            return h('div', { style: { display: 'grid', gap: 12 } },
              row(t('label'), h(Input, { value: draft.label, maxLength: 120, disabled, 'data-modal-autofocus': true,
                onChange: e => onDraftChange({ ...draft, label: e.target.value }) })),
              row(t('start'), h(Input, { type: 'number', step: 1, value: draft.start, disabled,
                onChange: e => onDraftChange({ ...draft, start: e.target.value }) })));
          }
          function OptionsEditor({ config, saveConfig, onClose }) {
            // Keep the number as text so an empty/invalid draft is not silently changed to zero.
            const [draft, setDraft] = React.useState(() => ({ label: config.label, start: String(config.start) }));
            const [saving, setSaving] = React.useState(false);
            const [error, setError] = React.useState(null);
            const pending = React.useRef(false);
            const close = () => { if (!pending.current) onClose(); };
            const save = async () => {
              if (pending.current || typeof saveConfig !== 'function') return;
              // Only documented user fields are saved: a legacy fail flag is cleared on success.
              const next = { label: draft.label, start: Number(draft.start) };
              if (draft.start.trim() === '' || validateConfig(next) !== true) { setError(t('invalid')); return; }
              pending.current = true; setSaving(true); setError(null);
              try {
                await saveConfig(next);
                onClose();
              } catch {
                setError(t('saveError'));
              } finally {
                pending.current = false; setSaving(false);
              }
            };
            return h(Modal, { open: true, title: t('options'), closeLabel: t('cancel'), onClose: close,
              footer: h(React.Fragment, null,
                h(Button, { type: 'button', variant: 'outline', disabled: saving, onClick: close }, t('cancel')),
                h(Button, { type: 'button', variant: 'primary', disabled: saving || typeof saveConfig !== 'function',
                  onClick: () => { void save(); } }, t(saving ? 'saving' : 'save'))) },
            h('div', { 'data-home-example-editor': true, 'aria-busy': saving, style: { display: 'grid', gap: 12 } },
              h(Fields, { draft, disabled: saving || typeof saveConfig !== 'function',
                onDraftChange: next => { if (!pending.current) { setDraft(next); setError(null); } } }),
              error && h('p', { role: 'alert', style: { color: 'var(--dsw-alias-state-error-primary)' } }, error)));
          }
          function Content({ instance, config, visible, editing, preview, saveConfig }) {
            useLocale();
            const [count, setCount] = React.useState(config.start);
            const [ticks, setTicks] = React.useState(0);
            const [optionsOpen, setOptionsOpen] = React.useState(false);
            React.useEffect(() => { if (editing || preview) setOptionsOpen(false); }, [editing, preview]);
            React.useEffect(() => { setCount(config.start); }, [config.start]);
            React.useEffect(() => {
              if (preview) return;
              stats.mounts++;
              stats.instances[instance.instanceId] = (stats.instances[instance.instanceId] || 0) + 1;
              return () => { stats.unmounts++; stats.instances[instance.instanceId]--; };
            }, [instance.instanceId, preview]);
            React.useEffect(() => {
              if (preview || !visible || editing) return;
              stats.activeTimers++;
              const timer = setInterval(() => setTicks(n => n + 1), 1000);
              return () => { clearInterval(timer); stats.activeTimers--; };
            }, [visible, editing, preview]);
            // A persisted legacy fail flag must never remove the widget's recovery controls.
            return h('div', { 'data-home-example-instance': instance.instanceId, style: { display: 'grid', gap: 8 } },
              h('strong', null, config.label),
              config.fail && h('p', { role: 'alert', style: { color: 'var(--dsw-alias-state-error-primary)' } }, t('legacyError')),
              h('output', { 'data-home-example-count': instance.instanceId, style: { fontSize: 28 } }, String(count)),
              h(Button, { type: 'button', size: 'sm', variant: 'outline', disabled: editing || !!preview,
                onClick: () => setCount(n => n + 1) }, t('increment')),
              h('small', null, t('ticks') + ': ' + ticks),
              !editing && !preview && h(Button, { type: 'button', size: 'sm', variant: 'ghost',
                disabled: typeof saveConfig !== 'function', onClick: () => setOptionsOpen(true) }, t('options')),
              optionsOpen && !editing && !preview && h(OptionsEditor, { config, saveConfig, onClose: () => setOptionsOpen(false) }));
          }
          scoped.effect(() => scoped.homeWidgets.register({
            typeId: '@vlln/dsh-home-example:counter', apiVersion: 1,
            title: () => t('title'), description: () => t('description'),
            source: '@vlln/dsh-home-example-counter',
            sizing: { default: {w:4,h:6}, supported: [{w:4,h:6},{w:8,h:8}] },
            configVersion: 2,
            defaultConfig: () => ({ label: t('default'), start: 0 }),
            validateConfig,
            migrateConfig(config, fromVersion, toVersion) {
              if (fromVersion !== 1 || toVersion !== 2) throw new Error('unsupported example migration');
              const migrated = {
                label: typeof config?.label === 'string' ? config.label : t('default'),
                start: Number.isSafeInteger(config?.start) ? config.start : 0,
                ...(typeof config?.fail === 'boolean' ? { fail: config.fail } : {}),
              };
              const valid = validateConfig(migrated);
              if (valid !== true) throw new Error(valid);
              return migrated;
            },
            Content,
          }));
        });
      },
    };
  },
});
