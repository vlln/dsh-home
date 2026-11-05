/** Host-owned config drafts: extension settings never receive persisted config by reference. */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardBoundary } from './boundary.tsx'
import type { Translate } from './format.ts'
import type { HomeStore } from './store.ts'
import type { JsonValue, RegisteredWidgetDefinition, WidgetContentProps, WidgetTitle } from './widget-contract.ts'
import { cloneWidgetConfig, validateWidgetConfig } from './widget-registry.ts'
export { cloneWidgetConfig } from './widget-registry.ts'

/** Extension metadata is untrusted render-time code, including translated title callbacks. */
export function widgetText(value: WidgetTitle | undefined, fallback: string): string {
  try {
    const text: unknown = typeof value === 'function' ? value() : value
    if (text instanceof Promise) { void text.catch(() => {}); return fallback }
    return typeof text === 'string' && text.trim() !== '' ? text : fallback
  } catch { return fallback }
}

/** Notify the host when a settings subtree failed, so Save cannot commit unseen defaults. */
function SettingsFailure({ t, onFailed }: { t: Translate; onFailed: () => void }): ReactNode {
  useEffect(onFailed, [onFailed])
  return <div className="dsh-error" role="alert">{t('settings.renderError')}</div>
}

export interface WidgetSettingsPanelProps {
  t: Translate
  store: HomeStore
  definition: RegisteredWidgetDefinition
  widgetProps: WidgetContentProps
  disabled: boolean
  onClose: () => void
}
export function WidgetSettingsPanel({ t, store, definition, widgetProps, disabled, onClose }: WidgetSettingsPanelProps): ReactNode {
  const [draft, setDraft] = useState<JsonValue | undefined>(() => {
    try { return cloneWidgetConfig(widgetProps.config) } catch { return undefined }
  })
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Settings = definition.Settings
  const save = async (): Promise<void> => {
    if (saving || disabled || failed || draft === undefined) return
    setSaving(true)
    setError(null)
    try {
      let config: JsonValue
      try { config = validateWidgetConfig(definition, draft) }
      catch { setError(t('settings.invalid')); return }
      await store.saveInstanceConfig(widgetProps.instance.instanceId, definition, config)
      onClose()
    } catch { setError(t('settings.saveError')) }
    finally { setSaving(false) }
  }
  const title = widgetText(definition.title, definition.typeId)
  return <section className="dsh-widget-settings" role="region" aria-label={t('settings.title', { title })} aria-busy={saving}>
    <h3 className="dsh-manager-heading">{t('settings.title', { title })}</h3>
    <div className="dsh-settings-fields" inert={saving || disabled || undefined}>
      {draft === undefined || Settings === undefined
        ? <div className="dsh-error" role="alert">{t('settings.renderError')}</div>
        : <CardBoundary fallback={<SettingsFailure t={t} onFailed={() => { setFailed(true) }} />}>
          <Settings {...widgetProps} instance={{ ...widgetProps.instance, config: cloneWidgetConfig(draft) }} config={cloneWidgetConfig(draft)} editing
            onConfigChange={config => {
              if (saving || disabled) return
              try { setDraft(cloneWidgetConfig(config)); setError(null) }
              catch { setError(t('settings.invalid')) }
            }} />
        </CardBoundary>}
    </div>
    {error !== null && <p className="dsh-task-error" role="alert">{error}</p>}
    <div className="dsh-manager-actions">
      <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>{t('settings.cancel')}</Button>
      <Button variant="primary" size="sm" disabled={saving || disabled || failed || draft === undefined || Settings === undefined} onClick={() => { void save() }}>{t(saving ? 'edit.saving' : 'settings.save')}</Button>
    </div>
  </section>
}
