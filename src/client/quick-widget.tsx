/** The builtin quick type uses the public instance/settings contract without owning layout or persistence. */
import { useEffect, useRef, useState } from 'react'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { Button, RowButton, RowLink } from './ui/index.ts'
import { builtinPreviewData, useBuiltin } from './builtin-registration.tsx'
import { formatAgo, shortcutHint, type Translate } from './format.ts'
import type { WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'
import {
  QUICK_CONFIG_VERSION, QUICK_KINDS, QUICK_LIMITS, QUICK_TYPE_ID,
  defaultQuickConfig, migrateQuickConfig, quickConfigError, quickLinkError, quickWorkdirDraft, validateQuickConfig,
  type QuickConfig, type QuickKind, type QuickLink,
} from './quick-model.ts'

function QuickGlyph() {
  return <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8.8 1.8 4 9h3.3l-.9 5.2L11.6 7H8.2l.6-5.2Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
}

export function QuickContent(props: WidgetContentProps<QuickConfig>) {
  const { config, instance, editing, visible, preview } = props
  const { state, t, actions } = useBuiltin()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => {
    if (preview) return
    return () => { pending.current?.abort() }
  }, [preview])
  useEffect(() => {
    if (preview) return
    if (editing || !visible) pending.current?.abort()
  }, [editing, visible, preview])
  const last = (state.ledger?.sessions ?? [])
    .filter(session => session.parentSessionId === undefined && session.origin !== 'subagent' && session.turns > 0)
    .reduce<(NonNullable<typeof state.ledger>['sessions'][number]) | undefined>((latest, session) =>
      latest === undefined || session.lastAt > latest.lastAt ? session : latest, undefined)
  const disabled = Boolean(preview) || editing || !visible || busy
  const configError = quickConfigError(config)
  const open = (link: QuickLink) => {
    if (disabled || quickLinkError(link) !== null) return
    setError(null)
    if (link.kind === 'session') {
      if (state.sessions[link.target] === undefined && !state.ledger?.sessions.some(session => session.id === link.target)) {
        setError(t('quick.sessionMissing'))
        return
      }
      try { actions.openSession(link.target) } catch { setError(t('quick.actionError')) }
    } else if (link.kind === 'workdir') {
      if (actions.startTask === undefined) { setError(t('quick.workdirUnavailable')); return }
      const controller = new AbortController()
      pending.current = controller
      setBusy(true)
      // The host retains any existing draft; this API prepares only, never sends a model request.
      void actions.startTask({ ...quickWorkdirDraft(link.target), signal: controller.signal })
        .catch(() => { if (!controller.signal.aborted) setError(t('quick.actionError')) })
        .finally(() => {
          if (pending.current === controller) { pending.current = null; setBusy(false) }
        })
    }
  }
  return <div className="dsh-quick-widget flex h-full min-h-0 flex-col gap-1" data-quick-instance={instance.instanceId} aria-busy={busy}>
    <Button variant="primary" size="small" disabled={disabled} onClick={() => { actions.startSession() }} className="w-full [&>span]:w-full">
      <span className="flex w-full items-center justify-between gap-3"><span>{t('widget.quick.new')}</span><span className="dsh-key text-text-white/70">{shortcutHint()}</span></span>
    </Button>
    {last !== undefined && <RowButton disabled={disabled} onClick={() => { actions.openSession(last.id) }} trailing={formatAgo(last.lastAt, state.now, t)}>
      {t('widget.quick.resume')}
    </RowButton>}
    {configError === null && config.links.length > 0 && <div className="dsh-quick-widget-links flex min-h-0 flex-1 flex-col overflow-hidden">
      {config.links.map((link, index) => link.kind === 'url'
        ? <RowLink key={index} href={disabled ? undefined : link.target} target="_blank" rel="noopener noreferrer"
          aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined} title={link.target} trailing={<span aria-hidden="true">↗</span>}>
          {link.label}
        </RowLink>
        : <RowButton key={index} disabled={disabled || (link.kind === 'workdir' && actions.startTask === undefined)}
          title={link.target} onClick={() => { open(link) }} trailing={t(`quick.kind.${link.kind}`)}>
          {link.label}
        </RowButton>)}
    </div>}
    {configError !== null && <p className="dsh-quick-widget-error" role="alert">{t(`quick.error.${configError}`)}</p>}
    {busy && <p className="dsh-muted" role="status">{t('quick.preparing')}</p>}
    {error !== null && <p className="dsh-quick-widget-error" role="alert">{error}</p>}
    <span className="dsh-muted mt-auto">{t('quick.hint')}</span>
    <WidgetConfigEditor t={t} widgetProps={props} title={t('widget.quick.title')} label={t('quick.edit')}
      Fields={QuickSettings} validate={validateQuickConfig} />
  </div>
}

export function QuickSettings({ config, onConfigChange }: WidgetSettingsProps<QuickConfig>) {
  const { t } = useBuiltin()
  const update = (index: number, patch: Partial<QuickLink>) => onConfigChange({
    links: config.links.map((link, at) => at === index ? { ...link, ...patch } : { ...link }),
  })
  return <div className="dsh-quick-settings">
    <p className="dsh-muted">{t('quick.settings.hint')}</p>
    {config.links.length === 0 && <p className="dsh-muted">{t('quick.settings.empty')}</p>}
    {config.links.map((link, index) => {
      const error = quickLinkError(link)
      return <fieldset key={index} className="dsh-quick-settings-row">
        <legend>{t('quick.linkNumber', { n: index + 1 })}</legend>
        <label className="dsh-quick-settings-field"><span>{t('quick.kind')}</span>
          {/* The host has no native-select primitive; preserve the platform selector's keyboard behavior. */}
          <select className="dsh-home-select" value={link.kind} onChange={event => {
            update(index, { kind: event.target.value as QuickKind, target: '' })
          }}>{QUICK_KINDS.map(kind => <option value={kind} key={kind}>{t(`quick.kind.${kind}`)}</option>)}</select>
        </label>
        <label className="dsh-quick-settings-field"><span>{t('quick.label')}</span>
          <Input value={link.label} maxLength={QUICK_LIMITS.label} onChange={event => { update(index, { label: event.target.value }) }} />
        </label>
        <label className="dsh-quick-settings-field"><span>{t(`quick.target.${link.kind}`)}</span>
          <Input value={link.target} placeholder={t(`quick.placeholder.${link.kind}`)} maxLength={QUICK_LIMITS[link.kind]}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={error === link.kind || undefined}
            onChange={event => { update(index, { target: event.target.value }) }} />
        </label>
        {error !== null && <p className="dsh-quick-widget-error" role="status">{t(`quick.error.${error}`)}</p>}
        <Button variant="ghost" size="small" aria-label={t('quick.removeLabel', { n: index + 1 })}
          onClick={() => { onConfigChange({ links: config.links.filter((_, at) => at !== index).map(link => ({ ...link })) }) }}>{t('quick.remove')}</Button>
      </fieldset>
    })}
    <Button variant="secondary" size="small" disabled={config.links.length >= QUICK_LIMITS.links} onClick={() => {
      if (config.links.length >= QUICK_LIMITS.links) return
      onConfigChange({ links: [...config.links.map(link => ({ ...link })), { kind: 'url', label: t('quick.newLabel'), target: '' }] })
    }}>{t('quick.add')}</Button>
  </div>
}

/** Caller owns cleanup; register in place of the generic legacy quick definition, never alongside it. */
export function registerQuickWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<QuickConfig>({
    typeId: QUICK_TYPE_ID, apiVersion: 1, title: () => t('widget.quick.title'),
    description: () => t('quick.description'), source: '@vlln/dsh-home', icon: QuickGlyph,
    preview: { data: builtinPreviewData(t) }, sizing: { default: {w:4,h:6}, supported: [{w:4,h:4},{w:4,h:6},{w:4,h:8},{w:8,h:6}] }, configVersion: QUICK_CONFIG_VERSION,
    defaultConfig: defaultQuickConfig, validateConfig: validateQuickConfig, migrateConfig: migrateQuickConfig,
    Content: QuickContent,
  })
}
