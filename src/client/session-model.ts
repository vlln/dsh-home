/**
 * Pure recent-session model. No runtime imports: also runnable with Node type stripping.
 * Catalog supplies live metadata; the ledger supplies activity, not the session universe.
 */
import type { LedgerSession, WidgetSize } from './api.ts'
import type { SessionStatus } from './focus.tsx'
import type { SessionMeta } from './store.ts'

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
  const controls = width! < 400 ? 118 : 74
  const row = width! < 400 ? 76 : 64
  return Math.max(1, Math.min(20, Math.floor((height! - controls) / row)))
}

/** Strip the standard prefix before shortening UUIDs; the full id remains the identity. */
export function shortSessionId(id: string): string {
  const bare = id.startsWith('session-') ? id.slice('session-'.length) : id
  return bare.length > 8 ? `${bare.slice(0, 8)}…` : bare || id
}

/** Indexing is not a claim that the account has no sessions or no search results yet. */
export function recentEmptyState(total: number, matched: number, indexing: boolean): 'indexing' | 'empty' | 'noMatch' | null {
  if (matched > 0) return null
  if (indexing) return 'indexing'
  return total === 0 ? 'empty' : 'noMatch'
}
