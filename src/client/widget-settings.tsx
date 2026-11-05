/** Optional editing helper, explicitly chosen by a widget's Content; never shell UI. */
import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardBoundary } from './boundary.tsx'
import type { Translate } from './format.ts'
import type { JsonValue, WidgetContentProps, WidgetSettingsProps, WidgetTitle, WidgetConfigValidation } from './widget-contract.ts'
import { cloneWidgetConfig } from './widget-registry.ts'
export { cloneWidgetConfig } from './widget-registry.ts'

/** Extension metadata is untrusted render-time code, including translated title callbacks. */
export function widgetText(value: WidgetTitle | undefined, fallback: string): string {
  try {
    const text: unknown = typeof value === 'function' ? value() : value
    if (text instanceof Promise) { void text.catch(() => {}); return fallback }
    return typeof text === 'string' && text.trim() !== '' ? text : fallback
  } catch { return fallback }
}
function SettingsFailure({ t, onFailed }: { t: Translate; onFailed: () => void }): ReactNode {
  useEffect(onFailed, [onFailed])
  return <div className="dsh-error" role="alert">{t('settings.renderError')}</div>
}
function ConfigDraft<C extends JsonValue>({ t, widgetProps, title, Fields, validate, onClose }: {
  t: Translate; widgetProps: WidgetContentProps<C>; title: string; Fields: ComponentType<WidgetSettingsProps<C>>
  validate: (config: C) => WidgetConfigValidation; onClose: () => void
}): ReactNode {
  const [draft, setDraft] = useState<C>(() => cloneWidgetConfig(widgetProps.config) as C)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = !widgetProps.saveConfig || widgetProps.editing || Boolean(widgetProps.preview)
  const save = async (): Promise<void> => {
    if (saving || disabled || failed) return
    setSaving(true); setError(null)
    try {
      const next = cloneWidgetConfig(draft) as C
      try { const result = validate(next); if (result === false || typeof result === 'string' && result.length > 0) throw new Error('Invalid config') }
      catch { setError(t('settings.invalid')); return }
      await widgetProps.saveConfig!(next)
      onClose()
    } catch { setError(t('settings.saveError')) }
    finally { setSaving(false) }
  }
  return <Modal open title={title} closeLabel={t('settings.cancel')} onClose={() => { if (!saving) onClose() }} className="dsh-widget-config-modal"
    footer={<><Button variant="outline" disabled={saving} data-modal-autofocus onClick={onClose}>{t('settings.cancel')}</Button>
      <Button variant="primary" disabled={saving || disabled || failed} onClick={() => { void save() }}>{t(saving ? 'edit.saving' : 'settings.save')}</Button></>}>
    <div className="dsh-widget-settings" aria-busy={saving}>
      <div className="dsh-settings-fields" inert={saving || disabled || undefined}>
        <CardBoundary fallback={<SettingsFailure t={t} onFailed={() => setFailed(true)} />}>
          <Fields {...widgetProps} instance={{ ...widgetProps.instance, config: cloneWidgetConfig(draft) as C }} config={cloneWidgetConfig(draft) as C}
            onConfigChange={config => { if (!saving && !disabled) { try { setDraft(cloneWidgetConfig(config) as C); setError(null) } catch { setError(t('settings.invalid')) } } }} />
        </CardBoundary>
      </div>
      {error !== null && <p className="dsh-task-error" role="alert">{error}</p>}
    </div>
  </Modal>
}
/** Builtins opt in at their own content position; third-party widgets can build any editor. */
export function WidgetConfigEditor<C extends JsonValue>({ t, widgetProps, title, label, Fields, validate }: {
  t: Translate; widgetProps: WidgetContentProps<C>; title: string; label: string
  Fields: ComponentType<WidgetSettingsProps<C>>; validate: (config: C) => WidgetConfigValidation
}): ReactNode {
  const [open, setOpen] = useState(false)
  if (widgetProps.editing || widgetProps.preview) return null
  return <div className="dsh-widget-own-editor">
    <Button variant="ghost" size="sm" disabled={!widgetProps.saveConfig} onClick={() => setOpen(true)}>{label}</Button>
    {open && <ConfigDraft t={t} widgetProps={widgetProps} title={title} Fields={Fields} validate={validate} onClose={() => setOpen(false)} />}
  </div>
}
