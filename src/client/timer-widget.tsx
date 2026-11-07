/**
 * 计时器：一个可命名的正计时。
 *
 * 时间存在宿主的 `focus.json`（按实例分槽，只记开始时间戳 + 已累计），刷新、关页面、
 * 重启宿主都接着走；本组件只负责每秒重算显示。名称属于该实例的配置。
 *
 * @module @vlln/dsh-home/client/timer-widget
 */

import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, useNow } from './home-data.ts'
import { formatClock, timerElapsed } from './focus-model.ts'
import { formatDuration } from './format.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'
import type { FocusTimer } from './api.ts'

export type TimerConfig = { label: string }

const MAX_LABEL = 80

function defaultTimerConfig(): TimerConfig {
  return { label: '' }
}

function validateTimerConfig(value: unknown): value is TimerConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'label') && typeof config.label === 'string' && config.label.length <= MAX_LABEL
}

const PREVIEW_SLOT: FocusTimer = { label: '写文档', startedAt: null, accumulatedMs: 754_000, running: false }

function TimerSettings({ config, onConfigChange }: WidgetSettingsProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  return <div className="dsh-personal-settings">
    <label className="dsh-item-field" htmlFor={`${id}-label`}>
      <span className="dsh-item-label">{t('timer.label')}</span>
      <input id={`${id}-label`} type="text" maxLength={MAX_LABEL} value={config.label}
        placeholder={t('timer.labelPlaceholder')}
        onChange={event => onConfigChange({ label: event.target.value })} />
    </label>
    <p className="dsh-personal-hint">{t('timer.labelHint')}</p>
  </div>
}

function TimerBody({ slot, label, t, readOnly, onStart, onPause, onReset }: {
  slot: FocusTimer
  label: string
  t: Translate
  readOnly: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}): ReactNode {
  const now = useNow(1000, slot.running && !readOnly)
  const elapsed = timerElapsed(slot, now)
  return <div className="dsh-timer">
    <div className="dsh-timer-face">
      <span className="dsh-timer-label">{label.trim() === '' ? t('widget.timer.title') : label}</span>
      <span className="dsh-timer-clock" data-running={slot.running ? 'true' : 'false'} role="timer"
        aria-label={formatDuration(elapsed, t)}>{formatClock(elapsed)}</span>
    </div>
    <div className="dsh-timer-actions">
      <button type="button" className="dsh-timer-button dsh-timer-primary" disabled={readOnly}
        onClick={slot.running ? onPause : onStart}>
        {slot.running ? t('timer.pause') : elapsed > 0 ? t('timer.resume') : t('timer.start')}
      </button>
      <button type="button" className="dsh-timer-button" disabled={readOnly || (!slot.running && elapsed === 0)}
        onClick={onReset}>{t('timer.reset')}</button>
    </div>
  </div>
}

function ConnectedTimer(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const data = useHomeData()
  const instanceId = props.instance.instanceId
  const slot = data.focus?.timers[instanceId]
  // Self-healing read: the page loads shared data on mount, but this card must not stay
  // blank if it mounts before (or without) that effect, or after a failed read.
  useEffect(() => {
    if (data.focus === null && !data.focusLoading && data.focusError === null) void data.store.refreshFocus()
  }, [data.focus, data.focusLoading, data.focusError, data.store])
  if (data.focusError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>
    </div>
  }
  // The face is never blocked on the document: a card that says "reading…" forever is worse
  // than one that starts at 00:00 and enables its buttons once the timer is known.
  const ready = data.focus !== null
  const readOnly = props.editing || !ready || !data.focusStorage.writable
  const value = slot ?? { label: '', startedAt: null, accumulatedMs: 0, running: false }
  return <div className="dsh-timer-wrap" aria-busy={ready ? undefined : 'true'}>
    <TimerBody slot={value} label={props.config.label} t={t} readOnly={readOnly}
      onStart={() => { void data.store.mutateFocus({ op: 'timer.start', instanceId }).catch(() => {}) }}
      onPause={() => { void data.store.mutateFocus({ op: 'timer.pause', instanceId }).catch(() => {}) }}
      onReset={() => { void data.store.mutateFocus({ op: 'timer.reset', instanceId }).catch(() => {}) }} />
    {!ready && !data.focusLoading && <button type="button" className="dsh-planner-retry"
      onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>}
    <WidgetConfigEditor t={t} widgetProps={props} title={t('widget.timer.title')} label={t('timer.settings')}
      Fields={TimerSettings} validate={validateTimerConfig} />
  </div>
}

export function TimerContent(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview
  if (preview !== undefined) {
    return <TimerBody slot={PREVIEW_SLOT} label={props.config.label} t={t} readOnly
      onStart={() => {}} onPause={() => {}} onReset={() => {}} />
  }
  return <ConnectedTimer {...props} />
}

export function registerTimerWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<TimerConfig>({
    typeId: '@vlln/dsh-home:timer', apiVersion: 1,
    title: () => t('widget.timer.title'), description: () => t('gallery.description.timer'), source: '@vlln/dsh-home',
    preview: { config: () => ({ label: t('timer.previewLabel') }) },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }] },
    configVersion: 1, defaultConfig: defaultTimerConfig, validateConfig: (config): config is TimerConfig => validateTimerConfig(config),
    Content: TimerContent,
  })
}
