/**
 * 计时器：一个可命名的正计时，可另设目标时长。
 *
 * 时间与目标时长存在宿主的 `focus.json`（按实例分槽），刷新、关页面、重启宿主都接着走；
 * 名称属于该实例的配置。卡片内没有设置弹窗：名字点一下就地改，目标时长用右侧滚轮拖。
 * 目标时长存在 focus 槽而不是配置里，因为配置一改整张卡会重挂（边界键含配置），
 * 拖动滚轮时那样会打断手势。
 *
 * @module @vlln/dsh-home/client/timer-widget
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, useNow } from './home-data.ts'
import { formatClock, timerElapsed } from './focus-model.ts'
import { formatDuration, type Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { FocusTimer } from './api.ts'

export type TimerConfig = { label: string }

const MAX_LABEL = 80
/** 滚轮的档位（分钟）；0 表示不限。 */
const TARGET_STEPS = [0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120] as const
const MAX_TARGET_MS = 12 * 3600_000

function defaultTimerConfig(): TimerConfig {
  return { label: '' }
}

function validateTimerConfig(value: unknown): value is TimerConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'label') && typeof config.label === 'string' && config.label.length <= MAX_LABEL
}

const PREVIEW_SLOT: FocusTimer = { label: '写文档', startedAt: null, accumulatedMs: 754_000, running: false, targetMs: 25 * 60_000 }

/** 离当前值最近的档位；手改过的值也能落回一个可拖的档。 */
function nearestStep(minutes: number): number {
  let best = 0
  for (let index = 1; index < TARGET_STEPS.length; index += 1) {
    if (Math.abs(TARGET_STEPS[index]! - minutes) < Math.abs(TARGET_STEPS[best]! - minutes)) best = index
  }
  return best
}

function TimerWheel({ targetMs, disabled, t, onChange }: {
  targetMs: number; disabled: boolean; t: Translate; onChange: (ms: number) => void
}): ReactNode {
  const latest = useRef(targetMs)
  latest.current = targetMs
  const index = nearestStep(targetMs / 60_000)
  const label = (minutes: number | undefined): string => minutes === undefined
    ? '' : minutes === 0 ? t('timer.noTarget') : t('timer.minutes', { n: minutes })
  const step = (direction: number): void => {
    const next = TARGET_STEPS[Math.max(0, Math.min(TARGET_STEPS.length - 1, nearestStep(latest.current / 60_000) + direction))]!
    if (next * 60_000 === latest.current) return
    latest.current = next * 60_000
    onChange(next * 60_000)
  }
  const drag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    const startY = event.clientY
    let applied = 0
    const move = (next: PointerEvent): void => {
      const steps = Math.trunc((startY - next.clientY) / 18)
      while (applied < steps) { applied += 1; step(1) }
      while (applied > steps) { applied -= 1; step(-1) }
    }
    const finish = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  return <div className="dsh-timer-wheel" role="spinbutton" tabIndex={disabled ? -1 : 0}
    data-disabled={disabled ? 'true' : undefined}
    aria-label={t('timer.target')} aria-valuemin={0} aria-valuemax={MAX_TARGET_MS / 60_000}
    aria-valuenow={Math.round(targetMs / 60_000)} aria-valuetext={label(Math.round(targetMs / 60_000))}
    title={t('timer.targetHint')} onPointerDown={drag}
    onKeyDown={event => {
      if (disabled) return
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); step(1) }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
      else if (event.key === 'Home') { event.preventDefault(); onChange(0) }
      else if (event.key === 'End') { event.preventDefault(); onChange(TARGET_STEPS[TARGET_STEPS.length - 1]! * 60_000) }
    }}>
    <span className="dsh-wheel-row" data-side="-1">{label(TARGET_STEPS[index - 1])}</span>
    <span className="dsh-wheel-row" data-current="true">{label(TARGET_STEPS[index])}</span>
    <span className="dsh-wheel-row" data-side="1">{label(TARGET_STEPS[index + 1])}</span>
  </div>
}

function TimerBody({ slot, label, t, readOnly, renaming, draftName, onDraftName, onRenameStart, onRenameEnd, onCancelRename,
  onStart, onPause, onReset, onTarget }: {
  slot: FocusTimer
  label: string
  t: Translate
  readOnly: boolean
  renaming: boolean
  draftName: string
  onDraftName: (value: string) => void
  onRenameStart: () => void
  onRenameEnd: () => void
  onCancelRename: () => void
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onTarget: (ms: number) => void
}): ReactNode {
  const now = useNow(1000, slot.running && !readOnly)
  const elapsed = timerElapsed(slot, now)
  const targetMs = slot.targetMs ?? 0
  const remaining = targetMs > 0 ? Math.max(0, targetMs - elapsed) : 0
  const reached = targetMs > 0 && elapsed >= targetMs
  const display = targetMs > 0 ? remaining : elapsed
  return <div className="dsh-timer" data-reached={reached ? 'true' : 'false'} data-target={targetMs > 0 ? 'true' : 'false'}>
    <div className="dsh-timer-main">
      {renaming
        ? <input className="dsh-timer-name-input" autoFocus value={draftName} maxLength={MAX_LABEL}
          aria-label={t('timer.name')} placeholder={t('timer.namePlaceholder')}
          onChange={event => { onDraftName(event.target.value) }}
          onBlur={onRenameEnd}
          onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); onRenameEnd() }
            else if (event.key === 'Escape') { event.preventDefault(); onCancelRename() }
          }} />
        : <button type="button" className="dsh-timer-name" disabled={readOnly} title={readOnly ? undefined : t('timer.rename')}
          onClick={onRenameStart}>{label.trim() === '' ? t('timer.unnamed') : label}</button>}
      <span className="dsh-timer-clock" data-running={slot.running ? 'true' : 'false'}
        aria-label={formatDuration(display, t)}>{formatClock(display)}</span>
      <div className="dsh-timer-actions">
        <button type="button" className="dsh-timer-button dsh-timer-primary" disabled={readOnly}
          onClick={slot.running ? onPause : onStart}>
          {slot.running ? t('timer.pause') : elapsed > 0 ? t('timer.resume') : t('timer.start')}
        </button>
        <button type="button" className="dsh-timer-button" disabled={readOnly || (!slot.running && elapsed === 0)}
          onClick={onReset}>{t('timer.reset')}</button>
        {reached && <span className="dsh-timer-reached" role="status">{t('timer.reached')}</span>}
      </div>
    </div>
    <TimerWheel targetMs={targetMs} disabled={readOnly} t={t} onChange={onTarget} />
  </div>
}

function ConnectedTimer(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const data = useHomeData()
  const instanceId = props.instance.instanceId
  const slot = data.focus?.timers[instanceId]
  const [targetMs, setTargetMs] = useState<number>(slot?.targetMs ?? 0)
  const synced = useRef(false)
  const writes = useRef<Promise<unknown>>(Promise.resolve())
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(props.config.label)
  // Self-healing read: the page loads shared data on mount, but this card must not stay
  // blank if it mounts before (or without) that effect, or after a failed read.
  useEffect(() => {
    if (data.focus === null && !data.focusLoading && data.focusError === null) void data.store.refreshFocus()
  }, [data.focus, data.focusLoading, data.focusError, data.store])
  // Take the stored target once, when the document first arrives. Later echoes of our own
  // writes must not fight the wheel; a page reload remounts and re-syncs.
  useEffect(() => {
    if (synced.current || slot === undefined) return
    synced.current = true
    setTargetMs(slot.targetMs ?? 0)
  }, [slot])
  useEffect(() => { if (!renaming) setDraftName(props.config.label) }, [props.config.label, renaming])
  const saveConfig = props.saveConfig
  const commitName = (): void => {
    setRenaming(false)
    if (saveConfig === undefined || draftName === props.config.label) return
    void saveConfig({ label: draftName.slice(0, MAX_LABEL) }).catch(() => {})
  }
  const setTarget = (ms: number): void => {
    setTargetMs(ms)
    // Serialize writes: a fast drag fires several steps, and each op sets an absolute value.
    writes.current = writes.current
      .then(() => data.store.mutateFocus({ op: 'timer.target', instanceId, targetMs: ms }))
      .catch(() => {})
  }
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
  const value = slot ?? { label: '', startedAt: null, accumulatedMs: 0, running: false, targetMs: 0 }
  return <div className="dsh-timer-wrap" aria-busy={ready ? undefined : 'true'}>
    <TimerBody slot={value} label={props.config.label} t={t} readOnly={readOnly}
      renaming={renaming} draftName={draftName} onDraftName={setDraftName}
      onRenameStart={() => { if (!readOnly) { setDraftName(props.config.label); setRenaming(true) } }}
      onRenameEnd={commitName} onCancelRename={() => { setDraftName(props.config.label); setRenaming(false) }}
      onStart={() => { void data.store.mutateFocus({ op: 'timer.start', instanceId }).catch(() => {}) }}
      onPause={() => { void data.store.mutateFocus({ op: 'timer.pause', instanceId }).catch(() => {}) }}
      onReset={() => { void data.store.mutateFocus({ op: 'timer.reset', instanceId }).catch(() => {}) }}
      onTarget={setTarget} />
    {!ready && !data.focusLoading && <button type="button" className="dsh-planner-retry"
      onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>}
  </div>
}

export function TimerContent(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview
  if (preview !== undefined) {
    return <TimerBody slot={PREVIEW_SLOT} label={props.config.label} t={t} readOnly
      renaming={false} draftName="" onDraftName={() => {}} onRenameStart={() => {}} onRenameEnd={() => {}}
      onCancelRename={() => {}} onStart={() => {}} onPause={() => {}} onReset={() => {}} onTarget={() => {}} />
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
