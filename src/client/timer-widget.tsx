/**
 * 计时器：一个倒计时圆盘。
 *
 * 圆盘就是设置器：没启动时拖动圆环设定剩余时间（1–60 分钟），中间显示倒计时数字；
 * 启动后圆环按剩余比例收缩，下方只剩 Pause / Reset 两个选择，暂停后是 Resume / Reset。
 *
 * 时间状态存在宿主的 `focus.json`（按实例分槽：startedAt + accumulatedMs + targetMs），
 * 刷新、关页面、重启宿主都接着走。拖圆盘时只改本地预览，松手才写一次 `timer.target`，
 * 否则拖动会变成一串 RPC。
 *
 * @module @vlln/dsh-home/client/timer-widget
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, useNow } from './home-data.ts'
import { formatClock, timerElapsed } from './focus-model.ts'
import { Button, Chip } from './ui/index.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { FocusTimer } from './api.ts'
import { IconTimer } from './widget-glyphs.tsx'

/** 新计时器的默认时长；圆盘可以随时改。 */
const DEFAULT_TARGET_MS = 5 * 60_000
/** 一圈最多 60 分钟：1 分钟 = 6°。 */
export const MAX_TARGET_MINUTES = 60
/** 圆盘右侧的快捷时长（分钟）。 */
const PRESETS = [5, 10, 15, 25, 45, 60] as const

export type TimerConfig = Record<string, never>

function defaultTimerConfig(): TimerConfig { return {} }

/** v1 的 `label` 不再是这张卡的内容（圆盘中间只有数字），迁移时直接丢弃。 */
function migrateTimerConfig(): TimerConfig {
  // v2 has no fields at all; any stored label from v1 is dropped.
  return {}
}

function validateTimerConfig(value: unknown): value is TimerConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0
}

const PREVIEW: FocusTimer = { label: '', startedAt: null, accumulatedMs: 12 * 60_000 + 26_000, running: false, targetMs: 25 * 60_000 }

/** 把指针角度换算成分钟：正上方 = 60，顺时针一圈 = 1…60。 */
export function minutesFromAngle(dx: number, dy: number): number {
  const angle = Math.atan2(dx, -dy)
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle
  return Math.min(MAX_TARGET_MINUTES, Math.max(1, Math.round((normalized / (Math.PI * 2)) * MAX_TARGET_MINUTES)))
}

function TimerDial({ targetMs, fraction, displayMs, reached, editable, t, onPreview, onCommit }: {
  targetMs: number
  /** 圆环画多少：设置时是目标占一圈的比例，倒计时时是剩余占目标的比例。 */
  fraction: number
  displayMs: number
  reached: boolean
  /** 只有「没启动」时才可拖动设时间。 */
  editable: boolean
  t: Translate
  onPreview: (ms: number) => void
  onCommit: (ms: number) => void
}): ReactNode {
  const minutes = Math.round(targetMs / 60_000)
  const latest = useRef(minutes)
  latest.current = minutes
  const dial = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<number | null>(null)
  const flush = (): void => {
    window.clearTimeout(timer.current)
    if (pending.current === null) return
    const value = pending.current
    pending.current = null
    onCommit(value)
  }
  const later = (ms: number): void => {
    window.clearTimeout(timer.current)
    pending.current = ms
    timer.current = window.setTimeout(flush, 260)
  }
  useEffect(() => () => flush(), [])
  // A notch of the wheel is one minute (Shift: five) while the pointer is anywhere on
  // the dial, digits included. The listener is non-passive so the card does not scroll.
  useEffect(() => {
    const node = dial.current
    if (node === null || !editable) return
    const wheel = (event: WheelEvent): void => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1 : -1
      const step = event.shiftKey ? 5 : 1
      const next = Math.min(MAX_TARGET_MINUTES, Math.max(1, latest.current + direction * step))
      if (next === latest.current) return
      latest.current = next
      onPreview(next * 60_000)
      later(next * 60_000)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => { node.removeEventListener('wheel', wheel) }
  })
  const arc = Math.min(1, Math.max(0, fraction))
  const angle = arc * Math.PI * 2 - Math.PI / 2
  const handleX = 50 + 44 * Math.cos(angle)
  const handleY = 50 + 44 * Math.sin(angle)
  const nudge = (delta: number): void => {
    const next = Math.min(MAX_TARGET_MINUTES, Math.max(1, latest.current + delta))
    if (next === latest.current) return
    latest.current = next
    onPreview(next * 60_000)
    later(next * 60_000)
  }
  const drag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!editable || event.button !== 0) return
    event.preventDefault()
    const node = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    let started = false
    let value = latest.current * 60_000
    const apply = (next: PointerEvent): void => {
      const rect = node.getBoundingClientRect()
      const minutesAt = minutesFromAngle(next.clientX - (rect.left + rect.width / 2), next.clientY - (rect.top + rect.height / 2))
      value = minutesAt * 60_000
      latest.current = minutesAt
      onPreview(value)
    }
    const move = (next: PointerEvent): void => {
      if (!started) {
        // A plain click on the card must not silently change the duration.
        if (Math.hypot(next.clientX - startX, next.clientY - startY) < 4) return
        started = true
      }
      apply(next)
    }
    const finish = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      if (started) {
        pending.current = value
        flush()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  return <div ref={dial} className="dsh-timer-dial" role="slider" tabIndex={editable ? 0 : -1}
    aria-label={t('timer.dial')} aria-valuemin={1} aria-valuemax={MAX_TARGET_MINUTES} aria-valuenow={minutes}
    aria-valuetext={t('timer.minutes', { n: minutes })} aria-disabled={editable ? undefined : true}
    data-draggable={editable ? 'true' : undefined} onPointerDown={drag}
    onKeyDown={event => {
      if (!editable) return
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); nudge(1) }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); nudge(-1) }
      else if (event.key === 'PageUp') { event.preventDefault(); nudge(5) }
      else if (event.key === 'PageDown') { event.preventDefault(); nudge(-5) }
      else if (event.key === 'Home') { event.preventDefault(); onPreview(60_000); later(60_000) }
      else if (event.key === 'End') { event.preventDefault(); onPreview(MAX_TARGET_MINUTES * 60_000); later(MAX_TARGET_MINUTES * 60_000) }
    }}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle className="dsh-dial-track" cx="50" cy="50" r="44" />
      <circle className="dsh-dial-arc" cx="50" cy="50" r="44" pathLength="1" transform="rotate(-90 50 50)"
        strokeDasharray={`${Math.max(0.0001, arc)} ${1 - Math.max(0.0001, arc)}`} />
      {arc > 0.001 && <circle className="dsh-dial-handle" cx={handleX} cy={handleY} r="3.4" />}
    </svg>
    <span className="dsh-timer-face">
      <span className="dsh-dial-value">{formatClock(displayMs)}</span>
      {reached && <span className="dsh-dial-note">{t('timer.reached')}</span>}
    </span>
  </div>
}

function TimerBody({ elapsed, targetMs, running, readOnly, t, onPreview, onCommit, onStart, onPause, onReset, onRestart }: {
  elapsed: number
  targetMs: number
  running: boolean
  readOnly: boolean
  t: Translate
  onPreview: (ms: number) => void
  onCommit: (ms: number) => void
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onRestart: () => void
}): ReactNode {
  const target = Math.max(60_000, targetMs)
  const remaining = Math.max(0, target - elapsed)
  const reached = elapsed >= target
  const idle = !running && elapsed === 0
  const display = idle ? target : remaining
  const fraction = idle ? target / (MAX_TARGET_MINUTES * 60_000) : remaining / target
  const primary = reached ? t('timer.restart') : idle ? t('timer.start') : running ? t('timer.pause') : t('timer.resume')
  const editable = !readOnly && idle
  return <div className="dsh-timer" data-running={running ? 'true' : 'false'} data-reached={reached ? 'true' : 'false'}
    data-idle={idle ? 'true' : 'false'}>
    <TimerDial targetMs={target} fraction={fraction} displayMs={display} reached={reached}
      editable={editable} t={t} onPreview={onPreview} onCommit={onCommit} />
    <div className="dsh-timer-presets" role="group" aria-label={t('timer.presets')}>
      {PRESETS.map(minutes => {
        const active = Math.round(target / 60_000) === minutes
        return <Chip key={minutes} variant="caption" color={active ? 'blue' : 'neutral'}
          className={active ? 'ring-1 ring-chart-4/40' : undefined}
          aria-pressed={active} role="button" tabIndex={editable ? 0 : -1}
          onClick={() => { if (!editable) return; onPreview(minutes * 60_000); onCommit(minutes * 60_000) }}
          onKeyDown={event => {
            if (!editable || (event.key !== 'Enter' && event.key !== ' ')) return
            event.preventDefault()
            onPreview(minutes * 60_000); onCommit(minutes * 60_000)
          }}>{t('timer.preset', { n: minutes })}</Chip>
      })}
    </div>
    <div className="dsh-timer-actions">
      {/* Idle: one button. Started: two choices. Reached: start over or clear. */}
      {idle
        ? <Button variant="primary" size="small" disabled={readOnly} onClick={onStart}>{t('timer.start')}</Button>
        : <>
          <Button variant="primary" size="small" disabled={readOnly}
            onClick={reached ? onRestart : running ? onPause : onStart}>{primary}</Button>
          <Button variant="ghost" size="small" disabled={readOnly} onClick={onReset}>{t('timer.reset')}</Button>
        </>}
    </div>
  </div>
}

function ConnectedTimer(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const data = useHomeData()
  const instanceId = props.instance.instanceId
  const slot = data.focus?.timers[instanceId]
  const [targetMs, setTargetMs] = useState<number>(slot?.targetMs || DEFAULT_TARGET_MS)
  const synced = useRef(false)
  // Self-healing read: the page loads shared data on mount, but this card must not stay
  // blank if it mounts before (or without) that effect, or after a failed read.
  useEffect(() => {
    if (data.focus === null && !data.focusLoading && data.focusError === null) void data.store.refreshFocus()
  }, [data.focus, data.focusLoading, data.focusError, data.store])
  // Take the stored duration once, when the document first arrives. A later echo of our own
  // write must not fight the dial; a page reload remounts and re-syncs.
  useEffect(() => {
    if (synced.current || slot === undefined) return
    synced.current = true
    setTargetMs(slot.targetMs > 0 ? slot.targetMs : DEFAULT_TARGET_MS)
  }, [slot])
  const running = slot?.running === true
  const now = useNow(1000, running)
  const elapsed = slot === undefined ? 0 : timerElapsed(slot, now)
  // A countdown stops itself at zero, even if the page was closed at the boundary.
  useEffect(() => {
    if (data.focus === null || slot === undefined || !slot.running) return
    if (slot.targetMs > 0 && timerElapsed(slot, Date.now()) >= slot.targetMs) {
      void data.store.mutateFocus({ op: 'timer.pause', instanceId }).catch(() => {})
    }
  }, [data.focus, slot, instanceId, elapsed])
  if (data.focusError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>
    </div>
  }
  const ready = data.focus !== null
  const readOnly = props.editing || !ready || !data.focusStorage.writable
  // Never leave a card that looks alive but silently drops every write: surface the
  // first failed mutation (a stale host half or a read-only store looks exactly like this).
  const [problem, setProblem] = useState<'readonly' | 'save' | null>(null)
  // A host can accept the request and still drop it (an old server half is exactly that).
  // Remember what we asked for and check the echoed document; only then clear the badge.
  const wantedTarget = useRef<number | null>(null)
  const wantedRun = useRef<boolean | null>(null)
  const run = (operation: Parameters<typeof data.store.mutateFocus>[0]): Promise<void> =>
    data.store.mutateFocus(operation).catch(() => { setProblem('save'); throw new Error('timer write failed') })
  const persistTarget = (ms: number): void => {
    wantedTarget.current = ms
    void run({ op: 'timer.target', instanceId, targetMs: ms }).catch(() => {})
  }
  useEffect(() => {
    if (slot === undefined) return
    if (wantedTarget.current !== null) {
      if (slot.targetMs === wantedTarget.current) wantedTarget.current = null
      else setProblem('save')
    }
    if (wantedRun.current !== null) {
      if (slot.running === wantedRun.current) wantedRun.current = null
      else setProblem('save')
    }
    if (wantedTarget.current === null && wantedRun.current === null) setProblem(previous => previous === 'save' ? null : previous)
  }, [slot])
  // A fresh timer starts at five minutes rather than 00:00: Start must mean something.
  useEffect(() => {
    if (!ready || readOnly) return
    if ((slot?.targetMs ?? 0) > 0 || slot?.running === true || (slot?.accumulatedMs ?? 0) > 0) return
    persistTarget(DEFAULT_TARGET_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, readOnly, slot?.targetMs, slot?.running, slot?.accumulatedMs])
  // Editing dims the card on purpose; the badge is only for a host that cannot write.
  const alert = props.editing ? null : data.focusStorage.writable ? problem : 'readonly'
  return <div className="dsh-timer-wrap" aria-busy={ready ? undefined : 'true'}>
    <TimerBody elapsed={elapsed} targetMs={targetMs} running={running} readOnly={readOnly} t={t}
      onPreview={setTargetMs} onCommit={persistTarget}
      onStart={() => { wantedRun.current = true; void run({ op: 'timer.start', instanceId }).catch(() => {}) }}
      onPause={() => { wantedRun.current = false; void run({ op: 'timer.pause', instanceId }).catch(() => {}) }}
      onReset={() => { wantedRun.current = false; void run({ op: 'timer.reset', instanceId }).catch(() => {}) }}
      onRestart={() => {
        wantedRun.current = true
        void run({ op: 'timer.reset', instanceId }).then(() => run({ op: 'timer.start', instanceId })).catch(() => {})
      }} />
    {alert !== null && <span className="dsh-timer-alert" role="status" title={t('timer.writeHint')}>
      {t(alert === 'readonly' ? 'timer.readOnly' : 'timer.writeFailed')}</span>}
    {!ready && !data.focusLoading && <button type="button" className="dsh-planner-retry"
      onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>}
  </div>
}

export function TimerContent(props: WidgetContentProps<TimerConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview
  if (preview !== undefined) {
    const elapsed = timerElapsed(PREVIEW, Date.now())
    return <TimerBody elapsed={elapsed} targetMs={PREVIEW.targetMs} running={false} readOnly t={t}
      onPreview={() => {}} onCommit={() => {}} onStart={() => {}} onPause={() => {}} onReset={() => {}} onRestart={() => {}} />
  }
  return <ConnectedTimer {...props} />
}

export function registerTimerWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<TimerConfig>({
    typeId: '@vlln/dsh-home:timer', apiVersion: 1,
    title: () => t('widget.timer.title'), description: () => t('gallery.description.timer'), source: '@vlln/dsh-home', icon: IconTimer,
    preview: { config: () => ({}) },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }] },
    configVersion: 2, defaultConfig: defaultTimerConfig, validateConfig: (config): config is TimerConfig => validateTimerConfig(config),
    migrateConfig: migrateTimerConfig,
    Content: TimerContent,
  })
}
