/**
 * 首页的内置小组件（六张卡）。每张卡只画「卡片内部」，卡片外壳（圆角/描边/标题行/
 * 编辑工具）由 page.tsx 统一提供——第三方经 `home.widget` 槽贡献的组件同样复用这层外壳。
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

/** 导航动作（由 index.tsx 接到官方 `uiWorkspace` 上）。 */
export interface WidgetActions {
  openSession: (id: string) => void
  startSession: () => void
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
}

/** 内置小组件描述。 */
export interface BuiltinWidget {
  id: string
  order: number
  defaultSize: WidgetSize
  title: (t: Translate) => string
  Glyph: () => ReactNode
  body: (props: WidgetProps) => ReactNode
}

const DAY_MS = 86_400_000

function IconContinue() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

/** 顶层会话（排除子代理会话）。 */
function topLevel(data: LedgerSnapshot | null): LedgerSession[] {
  return (data?.sessions ?? []).filter(session => session.parentSessionId === undefined && session.origin !== 'subagent')
}

/** 今天 0 点（本地时区，与宿主的分日口径一致）。 */
function startOfToday(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function ContinueBody({ t, data, sessions, now, actions }: WidgetProps) {
  const rows = topLevel(data)
    .filter(session => session.turns > 0 && session.lastAt >= now - 14 * DAY_MS)
    .slice(0, 4)
  if (rows.length === 0) return <Empty action={<StartAction t={t} actions={actions} />}>{t('widget.continue.empty')}</Empty>
  return (
    <div className="dsh-rows">
      {rows.map((session) => {
        const live = sessions[session.id]?.running === true
        const meta = session.todayMs > 0
          ? t('widget.continue.today', { dur: formatDuration(session.todayMs, t) })
          : t('widget.continue.total', { dur: formatDuration(session.activeMs, t) })
        return (
          <button
            key={session.id}
            type="button"
            className="dsh-row"
            onClick={() => { actions.openSession(session.id) }}
          >
            <span className="dsh-row-top">
              {live && <span className="dsh-row-live" />}
              <span className="dsh-row-title">{sessionTitle(session, sessions, t)}</span>
              <span className="dsh-row-arrow" aria-hidden="true">→</span>
            </span>
            <span className="dsh-row-meta">
              {t('widget.continue.lastAt', { time: formatAgo(session.lastAt, now, t) })}
              {' · '}
              {meta}
            </span>
          </button>
        )
      })}
    </div>
  )
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
  return (
    <>
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
      <div className="dsh-w-facts">
        <span>{t('widget.today.stats', { sessions: data?.today.sessions ?? 0, turns: data?.today.turns ?? 0 })}</span>
        {longest > 0 && <span>· {t('widget.today.longest', { dur: formatDuration(longest, t) })}</span>}
      </div>
      <span className="dsh-muted">
        {t('widget.today.run', { dur: formatDuration(run, t) })}
        {' · '}
        {t('widget.today.waiting')}
      </span>
    </>
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

function SessionsBody({ t, data, sessions, now, actions }: WidgetProps) {
  const rows = topLevel(data)
    .filter(session => session.todayTurns > 0)
    .slice(0, 5)
  if (rows.length === 0) return <Empty action={<StartAction t={t} actions={actions} />}>{t('widget.sessions.empty')}</Empty>
  return (
    <div className="dsh-rows">
      {rows.map((session) => (
        <button
          key={session.id}
          type="button"
          className="dsh-row"
          onClick={() => { actions.openSession(session.id) }}
        >
          <span className="dsh-row-top">
            <span className="dsh-row-title">{sessionTitle(session, sessions, t)}</span>
            <span className="dsh-row-arrow" aria-hidden="true">→</span>
          </span>
          <span className="dsh-row-meta">
            {t('widget.sessions.row', {
              turns: session.todayTurns,
              dur: formatDuration(session.todayMs, t),
            })}
          </span>
        </button>
      ))}
    </div>
  )
}

function RhythmBody({ t, data }: WidgetProps) {
  const days = data?.days ?? []
  if (days.length === 0) return <Empty>{t('widget.sessions.empty')}</Empty>
  const peak = Math.max(1, ...days.map(day => day.activeMs))
  const total = days.reduce((sum, day) => sum + day.activeMs, 0)
  const best = days.reduce((winner, day) => (day.activeMs > winner.activeMs ? day : winner), days[0]!)
  const todayKey = days[days.length - 1]?.key
  return (
    <>
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
        {days.map((day, index) => (
          <span key={day.key}>{index === days.length - 1 ? shortDay(day.key) : day.key.slice(8)}</span>
        ))}
      </div>
      <span className="dsh-muted">
        {t('widget.rhythm.peak', { dur: formatDuration(best.activeMs, t), day: shortDay(best.key) })}
      </span>
    </>
  )
}

function QuickBody({ t, data, now, actions }: WidgetProps) {
  const last = topLevel(data).find(session => session.turns > 0)
  return (
    <div className="dsh-quick">
      <button type="button" className="dsh-quick-button dsh-quick-primary" onClick={() => { actions.startSession() }}>
        <span>{t('widget.quick.new')}</span>
        <span className="dsh-key">{shortcutHint()}</span>
      </button>
      {last !== undefined && (
        <button type="button" className="dsh-quick-button" onClick={() => { actions.openSession(last.id) }}>
          <span>{t('widget.quick.resume')}</span>
          <span className="dsh-key">{formatAgo(last.lastAt, now, t)}</span>
        </button>
      )}
      <span className="dsh-muted">{t('widget.quick.hint')}</span>
    </div>
  )
}

/** 内置小组件表：顺序即默认排布。 */
export const BUILTIN_WIDGETS: readonly BuiltinWidget[] = [
  {
    id: 'continue', order: 10, defaultSize: 'm', Glyph: IconContinue,
    title: t => t('widget.continue.title'), body: ContinueBody,
  },
  {
    id: 'today', order: 20, defaultSize: 'm', Glyph: IconToday,
    title: t => t('widget.today.title'), body: TodayBody,
  },
  {
    id: 'running', order: 30, defaultSize: 's', Glyph: IconRunning,
    title: t => t('widget.running.title'), body: RunningBody,
  },
  {
    id: 'sessions', order: 40, defaultSize: 's', Glyph: IconSessions,
    title: t => t('widget.sessions.title'), body: SessionsBody,
  },
  {
    id: 'rhythm', order: 50, defaultSize: 'm', Glyph: IconRhythm,
    title: t => t('widget.rhythm.title'), body: RhythmBody,
  },
  {
    id: 'quick', order: 60, defaultSize: 's', Glyph: IconQuick,
    title: t => t('widget.quick.title'), body: QuickBody,
  },
]
