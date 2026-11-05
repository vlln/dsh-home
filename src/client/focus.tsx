/**
 * 首页的"三件事"：回到现场 / 在等我 / 今天。
 *
 * 这三块是产品本身（可排序，不可隐藏）；可编排的小组件网格退到「更多」里
 * （见 page.tsx）。两张卡的记忆由 `prefs.dismissed` 承担：dismiss 记一个时间戳，
 * 会话在那之后有新活动就重新出现——"看过了"不等于"永远别看"。
 *
 * @module @vlln/dsh-home/client/focus
 */

import type { ReactNode } from 'react'
import { formatAgo, formatDuration, type Translate } from './format.ts'
import type { LedgerSession, LedgerSnapshot } from './api.ts'
import type { SessionMeta } from './store.ts'
import { BUILTIN_WIDGETS, sessionTitle, type WidgetActions, type WidgetProps } from './widgets.tsx'

/** 客户端会话状态（官方 `sessionStatus` 根钩子的快照值）。 */
export interface SessionStatus {
  running?: boolean
  /** rc.5 使用对象；保留早期宿主的字符串兼容。 */
  pendingInteraction?: 'approval' | 'plan-review' | 'question' | { kind: string }
  completionUnread?: boolean
}

/** 会话状态表。 */
export type SessionStatusMap = Map<string, SessionStatus>

/** 三件事共用的 props。 */
export interface FocusProps {
  t: Translate
  data: LedgerSnapshot | null
  sessions: Record<string, SessionMeta>
  statuses: SessionStatusMap
  dismissed: Record<string, number>
  now: number
  actions: WidgetActions
  /** `runtime` = 官方 sessionStatus 钩子到位；`none` = 这个组合没有该钩子。 */
  statusSource: 'runtime' | 'none'
  /** Shared home widget shell supplies headings and decoration. */
  embedded?: boolean
}

function isTopLevel(session: LedgerSession): boolean {
  return session.parentSessionId === undefined && session.origin !== 'subagent'
}

/**
 * 「回到现场」的候选：顶层、真有对话、且没被 dismiss（或在 dismiss 之后又有新活动）。
 * 按最近活动倒序——最近的那个最可能就是你要接的。
 */
export function resumeCandidates(data: LedgerSnapshot | null, dismissed: Record<string, number>): LedgerSession[] {
  return (data?.sessions ?? [])
    .filter(isTopLevel)
    .filter(session => session.turns > 0 || session.lastUserText !== undefined)
    .filter(session => (dismissed[session.id] ?? 0) < session.lastAt)
    .sort((left, right) => right.lastAt - left.lastAt)
}

function interactionText(status: SessionStatus | undefined, t: Translate): string | undefined {
  const interaction = typeof status?.pendingInteraction === 'string'
    ? status.pendingInteraction : status?.pendingInteraction?.kind
  if (interaction === 'approval') return t('queue.approval')
  if (interaction === 'plan-review') return t('queue.plan')
  if (interaction === 'question') return t('queue.question')
  if (status?.completionUnread === true) return t('queue.done')
  return undefined
}

/** 一张"回到现场"卡：标题 + 最后一句人话 + 停在哪 + 一个动作。 */
export function FocusResume(props: FocusProps & {
  index: number
  onNext: () => void
  onDismiss: (id: string) => void
  handle?: ReactNode
}): ReactNode {
  const { t, data, sessions, statuses, dismissed, now, actions, index, onNext, onDismiss, handle } = props
  const candidates = resumeCandidates(data, dismissed)
  const candidate = candidates.length === 0 ? undefined : candidates[index % candidates.length]

  if (candidate === undefined) {
    return (
      <section className="dsh-focus dsh-focus-empty" aria-label={t('aria.resume')}>
        {!props.embedded && <span className="dsh-focus-eyebrow">{t('resume.eyebrow')}</span>}
        <p className="dsh-focus-empty-text">{t('resume.empty')}</p>
        <button type="button" className="dsh-focus-primary" onClick={() => { actions.startSession() }}>
          {t('resume.emptyAction')}
        </button>
      </section>
    )
  }

  const status = statuses.get(candidate.id)
  const waiting = interactionText(status, t)
  return (
    <section className="dsh-focus" aria-label={t('aria.resume')}>
      <div className="dsh-focus-eyebrow-row">
        {!props.embedded && <span className="dsh-focus-eyebrow">{t('resume.eyebrow')}</span>}
        {handle}
        <button
          type="button"
          className="dsh-icon-button"
          aria-label={t('resume.dismiss')}
          title={t('resume.dismiss')}
          onClick={() => { onDismiss(candidate.id) }}
        >
          ×
        </button>
      </div>
      <h2 className="dsh-focus-title">{sessionTitle(candidate, sessions, t)}</h2>
      {candidate.lastUserText !== undefined && candidate.lastUserText !== '' && (
        <p className="dsh-focus-snippet">“{candidate.lastUserText}”</p>
      )}
      <div className="dsh-focus-meta">
        <span>{t('resume.paused', { time: formatAgo(candidate.lastAt, now, t) })}</span>
        <span className="dsh-duo" aria-hidden="true">·</span>
        <span>
          {candidate.todayMs > 0
            ? t('resume.today', { dur: formatDuration(candidate.todayMs, t) })
            : t('resume.total', { dur: formatDuration(candidate.activeMs, t) })}
        </span>
        <span className="dsh-duo" aria-hidden="true">·</span>
        <span>{t('resume.turns', { count: candidate.turns })}</span>
        {waiting !== undefined && <span className="dsh-chip" data-tone="warn">{waiting}</span>}
      </div>
      <div className="dsh-focus-actions">
        <button type="button" className="dsh-focus-primary" onClick={() => { actions.openSession(candidate.id) }}>
          <span>{t('resume.open')}</span>
          <span aria-hidden="true">→</span>
        </button>
        {candidates.length > 1 && (
          <button type="button" className="dsh-focus-secondary" onClick={onNext}>
            {t('resume.next')}
          </button>
        )}
      </div>
    </section>
  )
}

interface QueueItem {
  id: string
  reason: string
  tone: 'warn' | 'info'
  at: number
}

/** 「在等我」：官方 sessionStatus 给的待审批 / 待回答 / 跑完没看。 */
export function FocusQueue(props: FocusProps & { onDismiss: (id: string) => void; handle?: ReactNode }): ReactNode {
  const { t, data, sessions, statuses, dismissed, now, actions, onDismiss, handle } = props
  const lastAt = new Map((data?.sessions ?? []).map(session => [session.id, session.lastAt]))
  const items: QueueItem[] = []
  for (const [id, status] of statuses) {
    const reason = interactionText(status, t)
    if (reason === undefined) continue
    const activity = lastAt.get(id) ?? sessions[id]?.updatedAt ?? now
    // dismiss 之后又有新活动 → 重新出现。
    if ((dismissed[id] ?? 0) >= activity) continue
    items.push({
      id,
      reason,
      tone: status.pendingInteraction === undefined ? 'info' : 'warn',
      at: activity,
    })
  }
  items.sort((left, right) => right.at - left.at)
  const shown = items.slice(0, 6)
  const rest = items.length - shown.length

  return (
    <section
      className="dsh-w dsh-queue"
      data-empty={items.length === 0 ? 'true' : 'false'}
      aria-label={t('aria.queue')}
      data-status-source={props.statusSource}
    >
      {!props.embedded && <div className="dsh-w-head">
        <QueueGlyph />
        <h2 className="dsh-w-title">{t('queue.title')}</h2>
        {items.length > 0 && <span className="dsh-w-extra">{items.length}</span>}
        {handle}
      </div>}
      <div className="dsh-w-body">
        {items.length === 0 ? (
          <p className="dsh-muted dsh-queue-empty">{t('queue.empty')}</p>
        ) : (
          <>
            {shown.map(item => (
              <div key={item.id} className="dsh-queue-row">
                <button
                  type="button"
                  className="dsh-queue-main"
                  onClick={() => { actions.openSession(item.id) }}
                >
                  <span className="dsh-row-title">{sessionTitle({ id: item.id, cwd: sessions[item.id]?.cwd }, sessions, t)}</span>
                  <span className="dsh-queue-meta">
                    <span className="dsh-chip" data-tone={item.tone}>{item.reason}</span>
                    <span className="dsh-muted">{formatAgo(item.at, now, t)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="dsh-icon-button"
                  aria-label={t('queue.dismiss')}
                  title={t('queue.dismiss')}
                  onClick={() => { onDismiss(item.id) }}
                >
                  ×
                </button>
              </div>
            ))}
            {rest > 0 && <p className="dsh-muted">{t('queue.more', { count: rest })}</p>}
          </>
        )}
      </div>
    </section>
  )
}

/** 「今天」：一条时间带 + 一个主数字 + 两句事实，不上数字墙。 */
export function FocusToday(props: FocusProps & { handle?: ReactNode }): ReactNode {
  const { t, data, sessions, now, actions, handle } = props
  const widget = BUILTIN_WIDGETS.find(item => item.id === 'today')
  const widgetProps: WidgetProps = { t, data, sessions, now, actions, size: 'l' }
  return (
    <section className="dsh-w dsh-today" aria-label={t('widget.today.title')}>
      <div className="dsh-w-head">
        <TodayGlyph />
        <h2 className="dsh-w-title">{t('widget.today.title')}</h2>
        {handle}
        {data !== null && data.scanning && (
          <span className="dsh-w-extra">
            {t('today.progress', { done: data.progress.done, total: data.progress.total })}
          </span>
        )}
      </div>
      <div className="dsh-w-body">{widget?.body(widgetProps)}</div>
    </section>
  )
}

function QueueGlyph() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 4.5h11M2.5 8h7M2.5 11.5h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function TodayGlyph() {
  return (
    <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5.2V8l2 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
