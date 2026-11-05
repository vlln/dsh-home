/** Personal builtins use only the public widget registry; the host owns drafts and persistence. */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IconClockOutlineRegular, IconEditOutlineRegular, SettingsValueField, Switch,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useBuiltin } from './builtin-registration.tsx'
import { builtinPreview } from './widget-previews.tsx'
import type { Translate } from './format.ts'
import type { HomeWidgets, WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import {
  CLOCK_ZONE_MAX_LENGTH, PERSONAL_CONFIG_MAX_BYTES, PERSONAL_LABEL_MAX_LENGTH,
  defaultClockConfig, defaultNotesConfig, formatPersonalClock, isValidTimeZone,
  personalConfigBytes, startMinuteClock, validateClockConfig, validateNotesConfig,
} from './personal-model.ts'
import type { ClockConfig, NotesConfig } from './personal-model.ts'

function textFieldLabels(t: Translate) {
  // No composition-layer override exists for widget instance drafts; hide that badge/reset row.
  return { overridden: false, overriddenLabel: t('personal.edited'), resetLabel: t('personal.reset'), disabled: false }
}

export function NotesContent({ config }: WidgetContentProps<NotesConfig>): ReactNode {
  const { t } = useBuiltin()
  return <div className="dsh-personal-notes">
    {config.title !== '' && <h3 className="dsh-personal-label">{config.title}</h3>}
    {config.text === ''
      ? <p className="dsh-personal-hint">{t('notes.empty')}</p>
      : <div className="dsh-personal-note-text">{config.text}</div>}
  </div>
}

export function NotesSettings({ config, onConfigChange }: WidgetSettingsProps<NotesConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  const [tooLong, setTooLong] = useState(false)
  const update = (next: NotesConfig): void => {
    // Do not send oversized JSON to the host draft cloner, and never truncate text silently.
    if (!validateNotesConfig(next)) { setTooLong(true); return }
    setTooLong(false)
    onConfigChange(next)
  }
  return <div className="dsh-personal-settings">
    <SettingsValueField {...textFieldLabels(t)} id={`${id}-title`} label={t('notes.title')}
      text={config.title} invalid={false} hint={t('personal.labelLimit')} invalidLabel={t('personal.labelLimit')}
      onEdit={title => update({ ...config, title })} onReset={() => update({ ...config, title: '' })} />
    <label className="dsh-personal-field" htmlFor={`${id}-text`}>
      <span>{t('notes.text')}</span>
      {/* The official text field is single-line; notes need native multiline/plain-text editing. */}
      <textarea id={`${id}-text`} className="dsh-personal-textarea" rows={7} value={config.text}
        aria-describedby={`${id}-hint ${id}-bytes${tooLong ? ` ${id}-error` : ''}`}
        onChange={event => update({ ...config, text: event.target.value })} />
    </label>
    <p id={`${id}-hint`} className="dsh-personal-hint">{t('notes.plainText')} {t('notes.limit')}</p>
    <p id={`${id}-bytes`} className="dsh-personal-hint">{t('notes.bytes', {
      used: personalConfigBytes(config), max: PERSONAL_CONFIG_MAX_BYTES,
    })}</p>
    {tooLong && <p id={`${id}-error`} className="dsh-personal-error" role="alert">{t('notes.limitError')}</p>}
  </div>
}

export function ClockContent({ config, visible }: WidgetContentProps<ClockConfig>): ReactNode {
  const { t } = useBuiltin()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!visible) return
    return startMinuteClock(setNow, {
      now: Date.now,
      hidden: () => document.visibilityState === 'hidden',
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: handle => window.clearTimeout(handle as number),
      subscribeVisibility: callback => {
        document.addEventListener('visibilitychange', callback)
        return () => document.removeEventListener('visibilitychange', callback)
      },
    })
  }, [visible])
  const { time, date } = formatPersonalClock(now, config, t('clock.dateLocale'))
  return <div className="dsh-personal-clock">
    {config.label !== '' && <h3 className="dsh-personal-label">{config.label}</h3>}
    <time className="dsh-personal-clock-time" dateTime={new Date(now).toISOString()}>{time}</time>
    <p className="dsh-personal-clock-date">{date}</p>
    <p className="dsh-personal-hint">{config.timeZone || t('clock.browserZone')}</p>
  </div>
}

export function ClockSettings({ config, onConfigChange }: WidgetSettingsProps<ClockConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  const [labelTooLong, setLabelTooLong] = useState(false)
  const [zoneTooLong, setZoneTooLong] = useState(false)
  return <div className="dsh-personal-settings">
    <SettingsValueField {...textFieldLabels(t)} id={`${id}-label`} label={t('clock.label')}
      text={config.label} invalid={labelTooLong} invalidLabel={t('personal.labelLimit')} hint={t('personal.labelLimit')}
      onEdit={label => {
        setLabelTooLong(label.length > PERSONAL_LABEL_MAX_LENGTH)
        if (label.length <= PERSONAL_LABEL_MAX_LENGTH) onConfigChange({ ...config, label })
      }} onReset={() => { setLabelTooLong(false); onConfigChange({ ...config, label: '' }) }} />
    <SettingsValueField {...textFieldLabels(t)} id={`${id}-zone`} label={t('clock.timeZone')}
      text={config.timeZone} invalid={zoneTooLong || !isValidTimeZone(config.timeZone)} invalidLabel={t('clock.zoneInvalid')}
      placeholder="Asia/Shanghai" hint={t('clock.zoneHint')}
      onEdit={timeZone => {
        // Invalid intermediate zone text stays in the host-owned draft; Save validation rejects it.
        setZoneTooLong(timeZone.length > CLOCK_ZONE_MAX_LENGTH)
        if (timeZone.length <= CLOCK_ZONE_MAX_LENGTH) onConfigChange({ ...config, timeZone })
      }} onReset={() => { setZoneTooLong(false); onConfigChange({ ...config, timeZone: '' }) }} />
    <div className="dsh-personal-switch-row">
      <span>{t('clock.hour12')}</span>
      <Switch checked={config.hour12} label={t('clock.hour12')}
        onChange={hour12 => onConfigChange({ ...config, hour12 })} />
    </div>
  </div>
}

/** Registers types only; adding/duplicating instances remains a host/user decision. */
export function registerPersonalWidgets(registry: HomeWidgets, t: Translate): () => void {
  const disposers: (() => void)[] = []
  const dispose = (): void => { for (const off of disposers.splice(0).reverse()) off() }
  try {
    disposers.push(registry.register<NotesConfig>({
      typeId: '@vlln/dsh-home:notes', apiVersion: 1, configVersion: 1, source: '@vlln/dsh-home',
      title: () => t('widget.notes.title'), description: () => t('widget.notes.description'), icon: IconEditOutlineRegular,
      Preview: builtinPreview('notes', t), defaults: { size: 's', height: 6, minHeight: 4 },
      defaultConfig: defaultNotesConfig, validateConfig: validateNotesConfig, Content: NotesContent, Settings: NotesSettings,
    }))
    disposers.push(registry.register<ClockConfig>({
      typeId: '@vlln/dsh-home:clock', apiVersion: 1, configVersion: 1, source: '@vlln/dsh-home',
      title: () => t('widget.clock.title'), description: () => t('widget.clock.description'), icon: IconClockOutlineRegular,
      Preview: builtinPreview('clock', t), defaults: { size: 's', height: 4, minHeight: 4 },
      defaultConfig: defaultClockConfig, validateConfig: validateClockConfig, Content: ClockContent, Settings: ClockSettings,
    }))
  } catch (error) { dispose(); throw error }
  return dispose
}
