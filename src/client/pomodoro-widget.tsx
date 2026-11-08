/**
 * 番茄钟：25 分钟专注 + 5 分钟休息，独立的，不挂任何会话。
 *
 * 状态只在宿主 `focus.json` 里（按实例分槽）；到点由本组件发一次 `pomodoro.settle`，
 * 宿主记一轮并停在下一阶段起点。关着页面到点，下次打开只结算这一轮，不追补、不连跳。
 *
 * @module @vlln/dsh-home/client/pomodoro-widget
 */

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, todayKey, useNow } from './home-data.ts'
import { completedToday, formatClock, pomodoroSnapshot } from './focus-model.ts'
import { Button, Chip } from './ui/index.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { FocusPomodoro } from './api.ts'
import { IconPomodoro } from './widget-glyphs.tsx'

export type PomodoroConfig = { rounds: number }

function defaultPomodoroConfig(): PomodoroConfig {
  return { rounds: 0 }
}

function validatePomodoroConfig(value: unknown): value is PomodoroConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'rounds') && typeof config.rounds === 'number'
}

const PREVIEW_POMODORO: FocusPomodoro = {
  phase: 'focus', startedAt: null, elapsedMs: 7 * 60_000, focusMs: 25 * 60_000, breakMs: 5 * 60_000,
  completed: { '2026-11-06': 3 },
}

function PomodoroBody({ pomodoro, today, t, readOnly, onStart, onPause, onSkip, onReset }: {
  pomodoro: FocusPomodoro
  today: string
  t: Translate
  readOnly: boolean
  onStart: () => void
  onPause: () => void
  onSkip: () => void
  onReset: () => void
}): ReactNode {
  const running = pomodoro.startedAt !== null
  const now = useNow(1000, running && !readOnly)
  const snapshot = pomodoroSnapshot(pomodoro, now)
  const rounds = completedToday(pomodoro, today)
  const progress = snapshot.durationMs === 0 ? 0 : Math.min(1, (snapshot.durationMs - snapshot.remainingMs) / snapshot.durationMs)
  return <div className="dsh-pomodoro flex h-full min-h-0 flex-col items-center justify-between gap-2" data-phase={snapshot.phase}>
    <div className="dsh-pomodoro-head flex w-full items-center justify-between gap-2">
      <Chip variant="caption" color="blue">
        {snapshot.phase === 'focus' ? t('pomodoro.focus') : t('pomodoro.break')}
      </Chip>
      <span className="dsh-pomodoro-rounds text-caption-1-medium text-text-tertiary">{t('pomodoro.rounds', { count: rounds })}</span>
    </div>
    <div className="dsh-ring" data-running={running ? 'true' : 'false'}>
      <svg className="dsh-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="dsh-ring-track stroke-chart-track" cx="60" cy="60" r="52" />
        <circle className="dsh-ring-progress stroke-chart-4 transition-[stroke-dasharray] duration-500 ease-out" cx="60" cy="60" r="52" pathLength="1"
          strokeDasharray={`${Math.max(0.001, progress).toFixed(4)} 1`} transform="rotate(-90 60 60)" />
      </svg>
      <div className="dsh-ring-inner flex flex-col items-center gap-0.5">
        <span className="dsh-ring-value text-[30px] leading-none font-semibold tracking-tight tabular-nums text-text-primary" role="timer">{formatClock(snapshot.remainingMs)}</span>
        <span className="dsh-ring-caption text-caption-1-medium text-text-tertiary">{t(snapshot.phase === 'focus' ? 'pomodoro.focus' : 'pomodoro.break')}</span>
      </div>
    </div>
    <div className="dsh-timer-actions flex w-full items-center justify-center gap-1.5">
      <Button variant="primary" size="small" disabled={readOnly} onClick={running ? onPause : onStart}>
        {running ? t('timer.pause') : t('pomodoro.start')}
      </Button>
      <Button variant="secondary" size="xs" disabled={readOnly} onClick={onSkip}>{t('pomodoro.skip')}</Button>
      <Button variant="ghost" size="xs" disabled={readOnly} onClick={onReset}>{t('timer.reset')}</Button>
    </div>
  </div>
}

function ConnectedPomodoro(props: WidgetContentProps<PomodoroConfig>): ReactNode {
  const { t } = useBuiltin()
  const data = useHomeData()
  const instanceId = props.instance.instanceId
  const pomodoro = data.focus?.pomodoros[instanceId]
  const today = todayKey()
  const dueSent = useRef(0)
  // 到点只结算一次：宿主把阶段翻过去并停住，重复调用是无操作。
  useEffect(() => {
    if (pomodoro === undefined || data.focusStorage.writable === false || props.editing) return
    const snapshot = pomodoroSnapshot(pomodoro, Date.now())
    if (!snapshot.due || pomodoro.startedAt === null) return
    if (dueSent.current === pomodoro.startedAt) return
    dueSent.current = pomodoro.startedAt
    void data.store.mutateFocus({ op: 'pomodoro.settle', instanceId }).catch(() => {})
  })
  if (data.focusError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshFocus()}>{t('planner.retry')}</button>
    </div>
  }
  if (data.focus === null) return <p className="dsh-planner-loading" role="status">{t('planner.loading')}</p>
  const readOnly = props.editing || !data.focusStorage.writable
  const value = pomodoro ?? { phase: 'focus' as const, startedAt: null, elapsedMs: 0, focusMs: 25 * 60_000, breakMs: 5 * 60_000, completed: {} }
  return <PomodoroBody pomodoro={value} today={today} t={t} readOnly={readOnly}
    onStart={() => { void data.store.mutateFocus({ op: 'pomodoro.start', instanceId }).catch(() => {}) }}
    onPause={() => { void data.store.mutateFocus({ op: 'pomodoro.pause', instanceId }).catch(() => {}) }}
    onSkip={() => { void data.store.mutateFocus({ op: 'pomodoro.skip', instanceId }).catch(() => {}) }}
    onReset={() => { void data.store.mutateFocus({ op: 'pomodoro.reset', instanceId }).catch(() => {}) }} />
}

export function PomodoroContent(props: WidgetContentProps<PomodoroConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) {
    return <PomodoroBody pomodoro={PREVIEW_POMODORO} today="2026-11-06" t={t} readOnly
      onStart={() => {}} onPause={() => {}} onSkip={() => {}} onReset={() => {}} />
  }
  return <ConnectedPomodoro {...props} />
}

export function registerPomodoroWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<PomodoroConfig>({
    typeId: '@vlln/dsh-home:pomodoro', apiVersion: 1,
    title: () => t('widget.pomodoro.title'), description: () => t('gallery.description.pomodoro'), source: '@vlln/dsh-home', icon: IconPomodoro,
    preview: { config: defaultPomodoroConfig },
    sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }] },
    configVersion: 1, defaultConfig: defaultPomodoroConfig, validateConfig: (config): config is PomodoroConfig => validatePomodoroConfig(config),
    Content: PomodoroContent,
  })
}
