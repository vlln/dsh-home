/**
 * Pure recent-session model. No runtime imports: also runnable with Node type stripping.
 * Catalog supplies live metadata; the ledger supplies activity, not the session universe.
 */
import type { LedgerSession, WidgetSize } from './api.ts'
import type { SessionMeta } from './store.ts'

/** 宿主 `sessionStatus` 根钩子的快照值。 */
export interface SessionStatus {
  running?: boolean
  /** rc.5 使用对象；保留早期宿主的字符串兼容。 */
  pendingInteraction?: 'approval' | 'plan-review' | 'question' | { kind: string }
  completionUnread?: boolean
}

/** 会话状态表。 */
export type SessionStatusMap = Map<string, SessionStatus>

/** Extra catalog fields must be preserved by the store's catalog adapter. */
export type CatalogSession = SessionMeta & {
  parentSessionId?: string | null
  origin?: string
}

export interface RecentSession {
  id: string
  title?: string
  cwd?: string
  /** Unknown activity is null, never fabricated as the current time or creation time. */
  lastAt: number | null
  running?: boolean
}

export type RecentStatus = 'approval' | 'plan' | 'question' | 'running' | 'unread' | 'idle' | 'unknown'

/** Non-positive / non-finite / out-of-Date-range timestamps are not usable activity. */
export function activityTimestamp(value: unknown): number | null {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
    && value <= 8_640_000_000_000_000 ? value : null
}

function text(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value.trim()
}

function isSubagent(session: { parentSessionId?: string | null; origin?: string } | undefined): boolean {
  return session !== undefined && (text(session.parentSessionId ?? undefined) !== undefined || session.origin === 'subagent')
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Union by id; exclusion evidence from either source wins; does not mutate either input. */
export function mergeRecentSessions(
  catalog: Readonly<Record<string, CatalogSession>>,
  ledger: readonly LedgerSession[] = [],
): RecentSession[] {
  const byId = new Map(ledger.map(session => [session.id, session]))
  const ids = new Set([...Object.keys(catalog), ...byId.keys()])
  const result: RecentSession[] = []
  for (const id of ids) {
    const meta = Object.hasOwn(catalog, id) ? catalog[id] : undefined
    const activity = byId.get(id)
    if (id.trim() === '' || meta?.blank === true || isSubagent(meta) || isSubagent(activity)) continue
    // A ledger-only header with no conversation is blank. Catalog-only nonblank sessions
    // remain usable while indexing; do not require a ledger row to show them.
    if (meta === undefined && activity !== undefined
      && !(activity.turns > 0 || text(activity.lastUserText) !== undefined)) continue
    const catalogAt = activityTimestamp(meta?.updatedAt)
    const ledgerAt = activityTimestamp(activity?.lastAt)
    result.push({
      id,
      title: text(meta?.title),
      cwd: text(meta?.cwd) ?? text(activity?.cwd),
      lastAt: catalogAt === null ? ledgerAt : ledgerAt === null ? catalogAt : Math.max(catalogAt, ledgerAt),
      running: meta?.running,
    })
  }
  return result.sort((left, right) => {
    if (left.lastAt === null && right.lastAt !== null) return 1
    if (left.lastAt !== null && right.lastAt === null) return -1
    return (right.lastAt ?? 0) - (left.lastAt ?? 0) || compareText(left.id, right.id)
  })
}

/** Runtime status wins; false running means idle, not completed. Missing means unknown. */
export function recentSessionStatus(session: RecentSession, status?: SessionStatus): RecentStatus {
  const pending: unknown = status?.pendingInteraction
  const kind = typeof pending === 'string' ? pending
    : pending !== null && typeof pending === 'object' && 'kind' in pending ? pending.kind : undefined
  if (kind === 'approval') return 'approval'
  if (kind === 'plan-review') return 'plan'
  if (kind === 'question') return 'question'
  if (status?.running === true) return 'running'
  if (status?.completionUnread === true) return 'unread'
  if (status?.running === false) return 'idle'
  if (session.running === true) return 'running'
  if (session.running === false) return 'idle'
  return 'unknown'
}

/** Shortest unique trailing path among known working directories; identical cwd shares a label. */
export function cwdLabels(paths: readonly (string | undefined)[]): Map<string, string> {
  const unique = [...new Set(paths.filter((path): path is string => path !== undefined && path !== ''))]
  const parts = new Map(unique.map(path => [path, path.replaceAll('\\', '/').split('/').filter(Boolean)]))
  const labels = new Map<string, string>()
  for (const path of unique) {
    const components = parts.get(path)!
    let label = path
    for (let depth = 1; depth <= components.length; depth += 1) {
      const suffix = components.slice(-depth).join('/')
      const collision = unique.some(other => other !== path && parts.get(other)!.slice(-depth).join('/') === suffix)
      if (!collision) { label = suffix; break }
    }
    labels.set(path, label)
  }
  // Relative-vs-absolute and differently spelled paths can yield identical suffixes.
  // Fall back to the original full paths for every collision, never ambiguous labels.
  const counts = new Map<string, number>()
  for (const label of labels.values()) counts.set(label, (counts.get(label) ?? 0) + 1)
  for (const [path, label] of labels) if (counts.get(label)! > 1) labels.set(path, path)
  return labels
}

/** Native select values: empty means all, '?' means missing cwd, paths have a ':' prefix. */
export function cwdFilterValue(cwd: string | undefined): string {
  return cwd === undefined ? '?' : `:${cwd}`
}

/** All query tokens must match title, full path, or full id (case insensitive). */
export function filterRecentSessions(
  sessions: readonly RecentSession[],
  query = '',
  directory = '',
): RecentSession[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean)
  return sessions.filter(session => {
    if (directory !== '' && cwdFilterValue(session.cwd) !== directory) return false
    const haystack = [session.title ?? '', session.cwd ?? '', session.id].join('\n').toLocaleLowerCase()
    return tokens.every(token => haystack.includes(token))
  })
}

/** UI page size. Show more adds another page, without fetching or hiding rows permanently. */
export function recentPageSize(size: WidgetSize): number {
  return size === 's' ? 3 : size === 'm' ? 6 : 10
}

/** Content-height capacity, not width buckets. Reserve filters, footer and gaps;
 * the list stays scrollable for larger fonts/long metadata and Show more. */
export function recentViewportPageSize(size: WidgetSize, width?: number, height?: number): number {
  if (!Number.isFinite(height) || !Number.isFinite(width) || height! <= 0 || width! <= 0) return recentPageSize(size)
  // One-line rows: a tinted workspace segment plus the title plate.
  const controls = width! < 400 ? 104 : 62
  const row = 30
  return Math.max(1, Math.min(20, Math.floor((height! - controls) / row)))
}

/** Indexing is not a claim that the account has no sessions or no search results yet. */
export function recentEmptyState(total: number, matched: number, indexing: boolean): 'indexing' | 'empty' | 'noMatch' | null {
  if (matched > 0) return null
  if (indexing) return 'indexing'
  return total === 0 ? 'empty' : 'noMatch'
}

/** 「会话状态」的三个视图；等待交互曾是独立组件，现在只是 running 的另一个视图。 */
export type SessionStatusGroup = 'running' | 'waiting' | 'done'
export const SESSION_STATUS_GROUPS: readonly SessionStatusGroup[] = ['running', 'waiting', 'done']

/** 细状态 → 视图；idle/unknown 不属于任何视图，也就不出现在这个组件里。 */
export function statusGroupOf(status: RecentStatus): SessionStatusGroup | null {
  if (status === 'running') return 'running'
  if (status === 'approval' || status === 'plan' || status === 'question') return 'waiting'
  if (status === 'unread') return 'done'
  return null
}

export interface StatusSession {
  session: RecentSession
  status: RecentStatus
  group: SessionStatusGroup
  at: number
}

/**
 * 按视图分组的行。`dismissed` 只静音「在等你」到下一次活动：看过了不等于永远别看。
 * 排序是最近活动在前，同刻按 id，保证同一份数据两次渲染顺序一致。
 */
export function statusSessions(
  sessions: readonly RecentSession[],
  statuses: ReadonlyMap<string, SessionStatus> | undefined,
  dismissed: Readonly<Record<string, number>> = {},
): StatusSession[] {
  const rows: StatusSession[] = []
  for (const session of sessions) {
    const status = recentSessionStatus(session, statuses?.get(session.id))
    const group = statusGroupOf(status)
    if (group === null) continue
    const at = session.lastAt ?? 0
    // Only an explicit dismissal mutes a row; an unknown activity time must not be
    // mistaken for "already seen" (both would compare as 0).
    const muted = dismissed[session.id]
    if (group === 'waiting' && muted !== undefined && muted >= at) continue
    rows.push({ session, status, group, at })
  }
  return rows.sort((left, right) => right.at - left.at
    || (left.session.id < right.session.id ? -1 : left.session.id > right.session.id ? 1 : 0))
}

/** 每个视图的条数，用于顶部筛选上的计数。 */
export function groupCounts(rows: readonly StatusSession[]): Record<SessionStatusGroup, number> {
  const counts: Record<SessionStatusGroup, number> = { running: 0, waiting: 0, done: 0 }
  for (const row of rows) counts[row.group] += 1
  return counts
}

/**
 * 当前展示哪个视图：用户选的优先；它空了就落到第一个有内容的视图，
 * 这样卡片不会因为一个空状态变成一张空卡。全都空时仍尊重用户的选择。
 */
export function effectiveGroup(counts: Record<SessionStatusGroup, number>, chosen: SessionStatusGroup): SessionStatusGroup {
  if (counts[chosen] > 0) return chosen
  return SESSION_STATUS_GROUPS.find(group => counts[group] > 0) ?? chosen
}

/**
 * 工作区胶囊的颜色档：同一路径永远同一档，不同路径尽量分散到六个色相。
 * 只决定装饰色，不携带状态含义。
 */

