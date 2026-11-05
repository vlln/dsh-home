/**
 * 首页的数据型内置小组件。每张卡只画「卡片内部」，卡片外壳（圆角/描边/标题行/
 * 编辑工具）由 page.tsx 统一提供；专用个人组件与外部组件经公开注册表复用同一外壳。
 *
 * 口径提醒：数字全部来自宿主账本（`activeMs` 在场时长 = 事件簇跨度求和；
 * `runMs` = step 墙钟；`turns` = turn 数），标题/运行态来自官方会话目录。
 *
 * @module @vlln/dsh-home/client/widgets
 */

import type { ReactNode } from 'react'
import type { LedgerSession, LedgerSnapshot, WidgetSize } from './api.ts'
import type { SessionMeta } from './store.ts'
import { formatAgo, formatDuration, hhmm, shortcutHint, shortDay, type Translate } from './format.ts'
import { RecentBody } from './recent.tsx'
import { TasksBody } from './tasks.tsx'
import { PinnedBody } from './pinned-widget.tsx'
import type { SessionStatusMap } from './focus.tsx'

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
const DAY_MS = 86_400_000

function IconToday() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5.2V8l2 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRunning() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 8h3l2-4 3 8 2-4h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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

function IconQuick() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8.8 1.8 4 9h3.3l-.9 5.2L11.6 7H8.2l.6-5.2Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
}

/** 空的友好态（不画灰框，只给一句话 + 可选动作）。 */
function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="dsh-empty">
      <span>{children}</span>
      {action}
    </div>
  )
}

/** 空态里的主行动（开个新会话）。 */
function StartAction({ t, actions }: Pick<WidgetProps, 't' | 'actions'>) {
  return (
    <button type="button" className="dsh-empty-action" onClick={() => { actions.startSession() }}>
      {t('widget.empty.action')}
    </button>
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

/** 今天 0 点（本地时区，与宿主的分日口径一致）。 */
function startOfToday(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function TodayBody({ t, data, sessions, now, actions }: WidgetProps) {
  const start = startOfToday(now)
  const end = start + DAY_MS
  const segments: { left: number; width: number; live: boolean; label: string }[] = []
  let longest = 0
  for (const session of data?.sessions ?? []) {
    for (const [from, to] of session.clusters) {
      const begin = Math.max(from, start)
      const finish = Math.min(to, end)
      if (finish <= begin) continue
      longest = Math.max(longest, finish - begin)
      segments.push({
        left: ((begin - start) / DAY_MS) * 100,
        width: Math.max(0.4, ((finish - begin) / DAY_MS) * 100),
        live: finish >= now - 10 * 60_000,
        label: `${hhmm(begin)}–${hhmm(finish)} · ${formatDuration(finish - begin, t)} · ${sessionTitle(session, sessions, t)}`,
      })
    }
  }
  const nowFraction = Math.min(100, Math.max(0, ((now - start) / DAY_MS) * 100))
  const active = data?.today.activeMs ?? 0
  const run = data?.today.runMs ?? 0
  const hasActivity = segments.length > 0
  if (!hasActivity && active === 0) {
    // 一天还没开始：不要摆一个"0 分钟"的数字墙。
    return <Empty action={<StartAction t={t} actions={actions} />}>{t('widget.today.empty', { shortcut: shortcutHint() })}</Empty>
  }
  return (
    <div className="dsh-today-content">
      <div className="dsh-metric">
        <span className="dsh-number">{formatDuration(active, t)}</span>
        <span className="dsh-label">{t('widget.today.focused')}</span>
      </div>
      {hasActivity ? (
        <>
          <div className="dsh-band-track" aria-label={t('aria.band')} role="img">
            {segments.map((segment, index) => (
              <span
                key={index}
                className="dsh-band-seg"
                data-now={segment.live ? 'true' : 'false'}
                style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                title={segment.label}
              />
            ))}
            <span className="dsh-band-now" style={{ left: `${nowFraction}%` }} />
          </div>
          <div className="dsh-band-scale" aria-hidden="true">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
        </>
      ) : (
        <Empty action={<StartAction t={t} actions={actions} />}>
          {t('widget.today.empty', { shortcut: shortcutHint() })}
        </Empty>
      )}
      <div className="dsh-today-stats">
        <span><strong>{data?.today.sessions ?? 0}</strong><span>{t('widget.today.sessionsLabel')}</span></span>
        <span><strong>{data?.today.turns ?? 0}</strong><span>{t('widget.today.turnsLabel')}</span></span>
        <span><strong>{formatDuration(run, t)}</strong><span>{t('widget.today.runLabel')}</span></span>
      </div>
      {longest > 0 && <span className="dsh-muted dsh-today-longest">{t('widget.today.longest', { dur: formatDuration(longest, t) })}</span>}
    </div>
  )
}

function RunningBody({ t, data, sessions, now, actions }: WidgetProps) {
  const running = Object.values(sessions)
    .filter(session => session.running === true && session.blank !== true)
    .slice(0, 4)
  if (running.length === 0) return <Empty>{t('widget.running.empty')}</Empty>
  const byId = new Map((data?.sessions ?? []).map(session => [session.id, session]))
  return (
    <>
      <span className="dsh-label">{t('widget.running.count', { count: running.length })}</span>
      <div className="dsh-rows">
        {running.map((session) => {
          const ledger = byId.get(session.id)
          return (
            <button
              key={session.id}
              type="button"
              className="dsh-row"
              onClick={() => { actions.openSession(session.id) }}
            >
              <span className="dsh-row-top">
                <span className="dsh-row-live" />
                <span className="dsh-row-title">{sessionTitle(ledger ?? { id: session.id, cwd: session.cwd }, sessions, t)}</span>
                <span className="dsh-row-arrow" aria-hidden="true">→</span>
              </span>
              {ledger !== undefined && (
                <span className="dsh-row-meta">
                  {t('widget.running.open', { time: formatAgo(ledger.lastAt, now, t) })}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function AreasBody({ t, data, actions }: WidgetProps) {
  const groups = new Map<string, {
    name: string
    ms: number
    sessions: number
    lastAt: number
    topLevelId?: string
  }>()
  // 子代理会话也算进它的工作区（时长归因要能对得上「今天」的总数）；
  // 但点击只开顶层会话，只有子代理的组不可点。
  for (const session of data?.sessions ?? []) {
    if (session.todayMs <= 0 && session.todayTurns <= 0) continue
    const key = session.cwd ?? ''
    const name = key.split('/').filter(Boolean).pop() ?? t('unit.unknown')
    const group = groups.get(key) ?? { name, ms: 0, sessions: 0, lastAt: 0 }
    group.ms += session.todayMs
    group.sessions += 1
    const topLevelSession = session.parentSessionId === undefined && session.origin !== 'subagent'
    if (topLevelSession && session.lastAt >= group.lastAt) {
      group.lastAt = session.lastAt
      group.topLevelId = session.id
    }
    groups.set(key, group)
  }
  const sorted = [...groups.values()].sort((left, right) => right.ms - left.ms)
  const rows = sorted.slice(0, 5)
  const rest = sorted.slice(5)
  if (rows.length === 0) {
    return <Empty action={<StartAction t={t} actions={actions} />}>{t('widget.areas.empty')}</Empty>
  }
  const restMs = rest.reduce((sum, group) => sum + group.ms, 0)
  const restSessions = rest.reduce((sum, group) => sum + group.sessions, 0)
  return (
    <div className="dsh-rows dsh-area-rows">
      {rows.map(group => {
        const meta = (
          <span className="dsh-row-meta">
            {t('widget.areas.row', { dur: formatDuration(group.ms, t), sessions: group.sessions })}
          </span>
        )
        const title = (
          <span className="dsh-row-top">
            <span className="dsh-row-title">{group.name}</span>
            <span className="dsh-area-duration">{formatDuration(group.ms, t)}</span>
          </span>
        )
        const bar = <span className="dsh-area-track" aria-hidden="true"><span style={{ width: `${sorted[0]!.ms > 0 ? group.ms / sorted[0]!.ms * 100 : 0}%` }} /></span>
        return group.topLevelId === undefined
          ? <div key={group.name} className="dsh-row dsh-row-static">{title}{bar}{meta}</div>
          : (
            <button
              key={group.name}
              type="button"
              className="dsh-row"
              onClick={() => { actions.openSession(group.topLevelId as string) }}
            >
              {title}
              {bar}
              {meta}
            </button>
          )
      })}
      {rest.length > 0 && (
        <div className="dsh-row dsh-row-static">
          <span className="dsh-row-top">
            <span className="dsh-row-title">{t('widget.areas.others', { count: rest.length })}</span>
          </span>
          <span className="dsh-row-meta">
            {t('widget.areas.row', { dur: formatDuration(restMs, t), sessions: restSessions })}
          </span>
        </div>
      )}
    </div>
  )
}

function RhythmBody({ t, data }: WidgetProps) {
  const days = data?.days ?? []
  if (days.length === 0) return <Empty>{t('widget.rhythm.empty')}</Empty>
  const peak = Math.max(1, ...days.map(day => day.activeMs))
  const total = days.reduce((sum, day) => sum + day.activeMs, 0)
  const best = days.reduce((winner, day) => (day.activeMs > winner.activeMs ? day : winner), days[0]!)
  const todayKey = days[days.length - 1]?.key
  return (
    <div className="dsh-rhythm-content">
      <div className="dsh-metric">
        <span className="dsh-number">{formatDuration(total, t)}</span>
        <span className="dsh-label">{t('widget.rhythm.totalLabel')}</span>
      </div>
      <div className="dsh-rhythm" role="img" aria-label={t('aria.rhythm')}>
        {days.map(day => (
          <span key={day.key} className="dsh-rhythm-col" title={`${shortDay(day.key)} · ${formatDuration(day.activeMs, t)}`}>
            <span
              className="dsh-rhythm-bar"
              data-today={day.key === todayKey ? 'true' : 'false'}
              style={{ height: `${Math.max(day.activeMs > 0 ? 4 : 1, (day.activeMs / peak) * 100)}%` }}
            />
          </span>
        ))}
      </div>
      <div className="dsh-rhythm-days" aria-hidden="true">
        {days.map(day => (
          <span key={day.key}>{day.key.slice(8)}</span>
        ))}
      </div>
      <span className="dsh-muted">
        {t('widget.rhythm.peak', { dur: formatDuration(best.activeMs, t), day: shortDay(best.key) })}
      </span>
    </div>
  )
}

/** 内置小组件表：顺序即默认排布。 */
export const BUILTIN_WIDGETS: readonly BuiltinWidget[] = [
  {
    id: 'recent', order: 0, defaultSize: 'm', defaultHeight: 7, Glyph: IconSessions,
    title: t => t('widget.recent.title'), body: RecentBody,
  },
  {
    id: 'pinned', order: 5, defaultSize: 's', defaultHeight: 7, Glyph: IconPin,
    title: t => t('widget.pinned.title'), body: PinnedBody,
  },
  {
    id: 'tasks', order: 10, defaultSize: 's', defaultHeight: 8, Glyph: IconQuick,
    title: t => t('widget.tasks.title'), body: TasksBody,
  },
  {
    id: 'today', order: 20, defaultSize: 'm', defaultHeight: 4, Glyph: IconToday,
    title: t => t('widget.today.title'), body: TodayBody,
  },
  {
    id: 'running', order: 30, defaultSize: 's', defaultHeight: 4, Glyph: IconRunning,
    title: t => t('widget.running.title'), body: RunningBody,
  },
  {
    id: 'areas', order: 40, defaultSize: 's', defaultHeight: 4, Glyph: IconSessions,
    title: t => t('widget.areas.title'), body: AreasBody,
  },
  {
    id: 'rhythm', order: 50, defaultSize: 'm', defaultHeight: 4, Glyph: IconRhythm,
    title: t => t('widget.rhythm.title'), body: RhythmBody,
  },
]
