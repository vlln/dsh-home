/** Personal builtins use only the public widget registry; the host owns drafts and persistence. */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { IconClockOutlineRegular, IconEditOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { useBuiltin } from './builtin-registration.tsx'
import type { Translate } from './format.ts'
import type { HomeWidgets, WidgetContentProps } from './widget-contract.ts'
import {
  CLOCK_ZONES, clockHour12, defaultClockConfig, defaultNotesConfig, formatPersonalClock, migrateClockConfig,
  migrateNotesConfig, startMinuteClock, validateClockConfig, validateNotesConfig,
} from './personal-model.ts'
import type { ClockConfig, NotesConfig } from './personal-model.ts'
import { clockFaceParts, personalClockDisplayParts } from './personal-clock-display.ts'

export function NotesContent(props: WidgetContentProps<NotesConfig>): ReactNode {
  const { config, preview, editing, saveConfig } = props
  const { t } = useBuiltin()
  const [draft, setDraft] = useState(config.text)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<'limit' | 'save' | null>(null)
  // In-place editing is the only editor: the card writes on idle/blur, never a dialog.
  const editable = saveConfig !== undefined && preview === undefined && !editing
  useEffect(() => { if (!active) setDraft(config.text) }, [config.text, active])
  const commit = (text: string): void => {
    if (saveConfig === undefined || text === config.text) return
    if (!validateNotesConfig({ text })) { setError('limit'); return }
    saveConfig({ text }).then(() => { setError(null) }, () => { setError('save') })
  }
  useEffect(() => {
    if (!active || draft === config.text) return
    // Save on a typing pause; a short pause is cheaper than a write per keystroke.
    const timer = window.setTimeout(() => { commit(draft) }, 600)
    return () => { window.clearTimeout(timer) }
  }, [draft, active, config.text, commit])
  const begin = (): void => { if (editable) { setError(null); setActive(true) } }
  if (!editable || !active) {
    const shown = editable ? draft : config.text
    const [shownTitle, ...shownRest] = shown.split('\n')
    const shownBody = shownRest.join('\n').replace(/^\n+/u, '')
    return <div className="dsh-note flex h-full min-h-0 flex-col gap-1" data-empty={shown.trim() === '' ? 'true' : 'false'} data-editable={editable ? 'true' : 'false'}
      role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined} aria-label={editable ? t('notes.edit') : undefined}
      onClick={editable ? begin : undefined} onKeyDown={editable ? event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); begin() }
      } : undefined}>
      {(shownTitle ?? '').trim() !== '' && <h3 className="dsh-note-title text-title-2-semibold text-text-primary">{shownTitle}</h3>}
      {shownBody.trim() !== '' && <p className="dsh-note-body line-clamp-[12] text-body-regular text-text-secondary">{shownBody}</p>}
      {shown.trim() === '' && <p className="dsh-note-title text-body-regular text-text-tertiary" data-placeholder="true">{t('notes.placeholder')}</p>}
    </div>
  }
  return <div className="dsh-note" data-editing="true">
    <textarea className="dsh-note-input" aria-label={t('widget.notes.title')} value={draft} autoFocus
      placeholder={t('notes.placeholder')} spellCheck={false}
      onBlur={() => { commit(draft); setActive(false) }}
      onChange={event => { setError(null); setDraft(event.target.value) }} />
    {error !== null && <p className="dsh-note-error" role="alert">{t(error === 'limit' ? 'notes.limitError' : 'notes.saveError')}</p>}
  </div>
}

export function ClockContent(props: WidgetContentProps<ClockConfig>): ReactNode {
  const { config, visible, preview, editing, saveConfig } = props
  const { t, state } = useBuiltin()
  const [liveNow, setNow] = useState(() => preview ? state.now : Date.now())
  const now = preview ? state.now : liveNow
  useEffect(() => {
    if (preview || !visible) return
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
  }, [visible, preview])
  const locale = t('clock.dateLocale')
  const { time, date } = formatPersonalClock(now, config, locale)
  const { timeParts, day, month } = personalClockDisplayParts(now, config, locale)
  const editable = saveConfig !== undefined && preview === undefined && !editing
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const zones = config.timeZone !== '' && !CLOCK_ZONES.includes(config.timeZone)
    ? [config.timeZone, ...CLOCK_ZONES] : CLOCK_ZONES
  // The card's geometry lives in personal-styles.ts: a fluid numeral, the date as a hairline
  // tile, and the whole stack centred. Utility classes used to sit on top of exactly those
  // three decisions — `justify-between` pinned the zone row to the bottom edge, `bg-[--dsh-sunken]`
  // turned the date tile into a grey slab, `text-display-3-semibold` froze the numeral at 40px —
  // and utilities is the last cascade layer, so the stylesheet never got a say. The classes are
  // gone; the card is one centred block again, on a numeral that grows with the card.
  const twelve = clockHour12(config, locale)
  // The numeral is the button: one press flips 12/24 and the choice is stored on the instance.
  // A label above a switch would have been a second row on a card that has no room for one.
  const flip = (): void => {
    if (saveConfig === undefined) return
    void saveConfig({ timeZone: config.timeZone, hour12: !twelve })
  }
  const face = clockFaceParts(timeParts)
    .map((part, index) => <span key={index} data-part={part.type} aria-hidden="true">{part.value}</span>)
  return <div className="dsh-personal-clock" data-hour12={String(twelve)}>
    <div className="dsh-personal-clock-display">
      {editable
        ? <button type="button" className="dsh-personal-clock-time" onClick={flip}
          title={t('clock.toggleFormat')} aria-label={`${time} · ${t('clock.toggleFormat')}`} aria-pressed={twelve}>
          {face}
        </button>
        : <time className="dsh-personal-clock-time" dateTime={new Date(now).toISOString()} aria-label={time}>{face}</time>}
      <div className="dsh-personal-clock-date" role="img" aria-label={date} title={date}>
        <span className="dsh-personal-clock-day" aria-hidden="true">{day}</span>
        <span className="dsh-personal-clock-month" aria-hidden="true">{month}</span>
      </div>
    </div>
    <div className="dsh-personal-clock-zone" data-static={editable ? undefined : 'true'}>
      {/* A native <select> sizes itself to its longest option, so the caret sat a hundred pixels
          away from a two-word label and the row read as a stranded form field. The visible text
          is ours (the chosen option, one line); the select lies invisibly over it and keeps the
          keyboard, the native list and the accessibility. */}
      <span className="dsh-clock-zone-label" aria-hidden="true">
        {config.timeZone === '' ? t('clock.followBrowser') : config.timeZone}
        <span className="dsh-clock-zone-caret">▾</span>
      </span>
      <select className="dsh-clock-zone" aria-label={t('clock.timeZone')}
        title={config.timeZone === '' ? `${t('clock.followBrowser')} · ${browserZone}` : config.timeZone}
        value={config.timeZone} disabled={!editable}
        onChange={event => { void saveConfig?.({ timeZone: event.target.value, hour12: config.hour12 }) }}>
        <option value="">{t('clock.followBrowser')}</option>
        {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
      </select>
    </div>
  </div>
}

/** Registers types only; adding/duplicating instances remains a host/user decision. */
export function registerPersonalWidgets(registry: HomeWidgets, t: Translate): () => void {
  const disposers: (() => void)[] = []
  const dispose = (): void => { for (const off of disposers.splice(0).reverse()) off() }
  try {
    disposers.push(registry.register<NotesConfig>({
      typeId: '@vlln/dsh-home:notes', apiVersion: 1, configVersion: 2, source: '@vlln/dsh-home',
      title: () => t('widget.notes.title'), description: () => t('widget.notes.description'), icon: IconEditOutlineRegular,
      preview: { config: () => ({ text: `${t('gallery.sample.noteTitle')}\n\n${t('gallery.sample.noteText')}` }) }, sizing: { default: {w:4,h:6}, supported: [{w:4,h:6},{w:4,h:8},{w:8,h:8},{w:8,h:12}] },
      defaultConfig: defaultNotesConfig, validateConfig: validateNotesConfig, migrateConfig: migrateNotesConfig, Content: NotesContent,
    }))
    disposers.push(registry.register<ClockConfig>({
      typeId: '@vlln/dsh-home:clock', apiVersion: 1, configVersion: 4, source: '@vlln/dsh-home',
      title: () => t('widget.clock.title'), description: () => t('widget.clock.description'), icon: IconClockOutlineRegular,
      preview: { config: () => ({ timeZone: 'UTC', hour12: null }), data: { now: Date.UTC(2026, 9, 20, 10, 24) } }, sizing: { default: {w:4,h:4}, supported: [{w:4,h:4}] },
      defaultConfig: defaultClockConfig, validateConfig: validateClockConfig, migrateConfig: migrateClockConfig, Content: ClockContent,
    }))
  } catch (error) { dispose(); throw error }
  return dispose
}
