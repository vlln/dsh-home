/**
 * 首页的数据型内置小组件。每张卡只画「卡片内部」，卡片外壳（圆角/描边/标题行/
 * 编辑工具）由 page.tsx 统一提供；专用个人组件与外部组件经公开注册表复用同一外壳。
 *
 * 口径提醒：数字全部来自宿主账本（`activeMs` 在场时长 = 事件簇跨度求和；
 * `runMs` = step 墙钟；`turns` = turn 数），标题/运行态来自官方会话目录。
 *
 * @module @vlln/dsh-home/client/widgets
 */

import { useRef } from 'react'
import type { ReactNode } from 'react'
import type { LedgerSession, LedgerSnapshot, WidgetSize } from './api.ts'
import type { SessionMeta } from './store.ts'
import { formatDuration, hhmm, shortcutHint, shortDay, type Translate } from './format.ts'
import { RecentBody } from './recent.tsx'
import { PinnedBody } from './pinned-widget.tsx'
import { dayCoverage, localDayWindow } from './widget-visual-model.ts'
import { Button, CardEmpty, cx, Meter, SparkBars } from './ui/index.ts'
import { useVisibleRows } from './fit-rows.ts'
import { useHoverTip } from './hover-tip.tsx'
import type { SessionStatusMap } from './session-model.ts'

/** 导航动作（由 index.tsx 接到官方 `uiWorkspace` 上）。 */
export interface WidgetActions {
  openSession: (id: string) => void
  startSession: () => void
  /** Prepare only: no submission or model call; existing drafts are appended to. */
  startTask?: (input: { cwd?: string; prompt: string; signal?: AbortSignal }) => Promise<void>
  pickDirectory?: () => Promise<string | null>
  /** 回到当前会话（`layout.selectPanel(null)`）。 */
  leave: () => void
}

/** 每张卡收到的 props。 */
export interface WidgetProps {
  t: Translate
  data: LedgerSnapshot | null
  sessions: Record<string, SessionMeta>
  now: number
  actions: WidgetActions
  size: WidgetSize
  /** Measured content viewport, excluding shell header/padding. */
  width?: number
  height?: number
  statuses?: SessionStatusMap
  statusSource?: 'runtime' | 'none'
  loading?: boolean
  loadError?: boolean
}

/** 内置小组件描述。 */
export interface BuiltinWidget {
  id: string
  order: number
  defaultSize: WidgetSize
  defaultHeight: number
  title: (t: Translate) => string
  Glyph: () => ReactNode
  body: (props: WidgetProps) => ReactNode
}

function IconPin() {
  return <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 2h6l-1 5 2 2H9l-1 5-1-5H4l2-2-1-5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
}

function IconToday() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5.2V8l2 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSessions() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5h10M3 8h10M3 11.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconRhythm() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 12V8.5M6.4 12V5M9.8 12V7M13.2 12V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** 空的友好态（不画灰框，只给一句话 + 可选动作）。 */
function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <CardEmpty title={children} action={action} />
}

/** 空态里的主行动（开个新会话）。 */
function StartAction({ t, actions }: Pick<WidgetProps, 't' | 'actions'>) {
  return (
    <Button variant="primary" size="xs" onClick={() => { actions.startSession() }}>
      {t('widget.empty.action')}
    </Button>
  )
}

/** 会话标题：官方标题 → 目录名 → 短 id。 */
export function sessionTitle(
  session: Pick<LedgerSession, 'id' | 'cwd'> | undefined,
  sessions: Record<string, SessionMeta>,
  t: Translate,
): string {
  const title = session === undefined ? undefined : sessions[session.id]?.title?.trim()
  if (title !== undefined && title !== '') return title
  const cwd = session?.cwd ?? (session === undefined ? undefined : sessions[session.id]?.cwd)
  if (cwd !== undefined && cwd !== '') {
    const base = cwd.split('/').filter(Boolean).pop()
    if (base !== undefined && base !== '') return base
  }
  return t('widget.unknown')
}

// The elapsed-day axis expands on 23/25h DST days; minute labels remain exact.
function dayMsLabel(start: number, end: number, fraction: number): string {
  if (fraction === 1) return '24'
  const time = hhmm(start + (end - start) * fraction)
  return time.endsWith(':00') ? time.slice(0, 2) : time
}

function TodayBody({ t, data, sessions, now, actions, height }: WidgetProps) {
  const tip = useHoverTip()
  const { start, end } = localDayWindow(now)
  const dayMs = end - start
  const segments: { left: number; width: number; live: boolean; label: string }[] = []
  let longest = 0
  for (const session of data?.sessions ?? []) {
    for (const [from, to] of session.clusters) {
      const begin = Math.max(from, start)
      const finish = Math.min(to, end)
      if (!Number.isFinite(begin) || !Number.isFinite(finish) || finish <= begin) continue
      longest = Math.max(longest, finish - begin)
      segments.push({
        left: ((begin - start) / dayMs) * 100,
        width: ((finish - begin) / dayMs) * 100,
        live: finish >= now - 10 * 60_000,
        label: `${hhmm(begin)}–${hhmm(finish)} · ${formatDuration(finish - begin, t)} · ${sessionTitle(session, sessions, t)}`,
      })
    }
  }
  const nowFraction = Math.min(100, Math.max(0, ((now - start) / dayMs) * 100))
  const active = data?.today.activeMs ?? 0
  const run = data?.today.runMs ?? 0
  const hasActivity = segments.length > 0
  // An empty day still gets the full frame — metric, rail, scale — because an empty
  // card is a hole in the board. What it does not get is three zeroed stat columns;
  // one line with the shortcut is the honest version of "nothing happened yet".
  const empty = !hasActivity && active === 0
  return (
    <div className="dsh-today-content" data-roomy={(height ?? 0) >= 190}>
      <div className="dsh-today-hero">
        <div className="dsh-metric">
          <span className="dsh-number">{formatDuration(active, t)}</span>
          <span className="dsh-label">{t('widget.today.focused')}</span>
        </div>
        {hasActivity && <span className="dsh-today-runs text-caption-1-medium text-text-tertiary">{t('widget.today.longest', { dur: formatDuration(longest, t) })}</span>}
      </div>
      <div className="dsh-today-timeline">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-chart-track"
          aria-label={`${t('aria.band')}: ${segments.map(segment => segment.label).join('; ')}`} role="img">
          {segments.map((segment, index) => (
            <span
              key={index}
              className={cx('absolute inset-y-0 min-w-0.5 rounded-full bg-chart-4', segment.live ? 'opacity-100' : 'opacity-60 hover:opacity-100')}
              data-now={segment.live ? 'true' : 'false'}
              style={{ left: `${segment.left}%`, width: `${Math.max(0.4, segment.width)}%` }}
              {...tip.bind(segment.label)}
            />
          ))}
          <span className="absolute inset-y-0 w-0.5 rounded-full bg-status-yellow-text" style={{ left: `${nowFraction}%` }} />
        </div>
        {tip.node}
        <div className="dsh-band-scale" aria-hidden="true">
          {[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{dayMsLabel(start, end, fraction)}</span>)}
        </div>
      </div>
      {empty
        ? <div className="dsh-today-empty flex flex-wrap items-center gap-2 text-caption-1-medium text-text-tertiary">
          <span>{t('widget.today.empty', { shortcut: shortcutHint() })}</span>
          <StartAction t={t} actions={actions} />
        </div>
        : <>
          <div className="dsh-today-stats">
            <span><strong>{data?.today.sessions ?? 0}</strong><span>{t('widget.today.sessionsLabel')}</span></span>
            <span><strong>{data?.today.turns ?? 0}</strong><span>{t('widget.today.turnsLabel')}</span></span>
            <span><strong>{formatDuration(run, t)}</strong><span>{t('widget.today.runLabel')}</span></span>
          </div>
          {longest > 0 && <span className="dsh-muted dsh-today-longest">{t('widget.today.longest', { dur: formatDuration(longest, t) })}</span>}
        </>}
    </div>
  )
}

/** 内置小组件表：顺序即默认排布。 */
export const BUILTIN_WIDGETS: readonly BuiltinWidget[] = [
  {
    id: 'recent', order: 0, defaultSize: 's', defaultHeight: 8, Glyph: IconSessions,
    title: t => t('widget.recent.title'), body: RecentBody,
  },
  {
    id: 'pinned', order: 5, defaultSize: 's', defaultHeight: 7, Glyph: IconPin,
    title: t => t('widget.pinned.title'), body: PinnedBody,
  },
  {
    id: 'today', order: 20, defaultSize: 'm', defaultHeight: 4, Glyph: IconToday,
    title: t => t('widget.today.title'), body: TodayBody,
  },
]
