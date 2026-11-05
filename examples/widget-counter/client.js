window.__ModuleLoader__.load({
  id: '@vlln/dsh-home-example-counter',
  factory(require) {
    const React = require('react'); // Shared host React; never bundle a second copy.
    const h = React.createElement;
    const namespace = 'home.example.counter';
    const dictionaries = {
      en: { title: 'Example counter', description: 'Independent state, settings drafts and cleanup.', label: 'Label', start: 'Initial value', increment: 'Increment', ticks: 'Active seconds', fail: 'Throw a render error (test only)', default: 'Counter' },
      zh: { title: '示例计数器', description: '独立状态、设置草稿与生命周期清理。', label: '标签', start: '初始值', increment: '加一', ticks: '活跃秒数', fail: '抛出渲染错误（仅测试）', default: '计数器' },
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
          function Content({ instance, config, visible, editing, preview }) {
            useLocale();
            const [count, setCount] = React.useState(config.start);
            const [ticks, setTicks] = React.useState(0);
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
            if (config.fail) throw new Error('home example: requested render failure');
            // Installed runtime exposes no standalone ui-primitives npm package: use semantic HTML,
            // retaining native keyboard/focus behavior and only the installed theme alias tokens.
            return h('div', { 'data-home-example-instance': instance.instanceId, style: { display: 'grid', gap: 8 } },
              h('strong', null, config.label),
              h('output', { 'data-home-example-count': instance.instanceId, style: { fontSize: 28 } }, String(count)),
              h('button', { type: 'button', onClick: () => setCount(n => n + 1), style: { color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-module-platform)', border: '0.5px solid var(--dsw-alias-border-l4)', borderRadius: 'var(--dsw-radius-sm)', padding: '6px 10px' } }, t('increment')),
              h('small', null, t('ticks') + ': ' + ticks));
          }
          function Settings({ config, onConfigChange }) {
            useLocale();
            const update = patch => onConfigChange({ ...config, ...patch });
            const row = (text, input) => h('label', { style: { display: 'grid', gap: 4 } }, text, input);
            return h('div', { style: { display: 'grid', gap: 12 } },
              row(t('label'), h('input', { value: config.label, maxLength: 120, onChange: e => update({ label: e.target.value }) })),
              row(t('start'), h('input', { type: 'number', step: 1, value: config.start, onChange: e => { const start = Number(e.target.value); if (Number.isSafeInteger(start)) update({ start }); } })),
              row(t('fail'), h('input', { type: 'checkbox', checked: !!config.fail, onChange: e => update({ fail: e.target.checked }) })));
          }
          scoped.effect(() => scoped.homeWidgets.register({
            typeId: '@vlln/dsh-home-example:counter', apiVersion: 1,
            title: () => t('title'), description: () => t('description'),
            source: '@vlln/dsh-home-example-counter',
            defaults: { size: 's', height: 4, minWidth: 3, maxWidth: 12, minHeight: 4, maxHeight: 12 },
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
            Content, Settings,
          }));
        });
      },
    };
  },
});
