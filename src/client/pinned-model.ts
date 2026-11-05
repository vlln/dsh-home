/** Native pin order is authoritative. No ledger/recency/blank/subagent filtering. */
import type { SessionMeta, HomeState } from './store.ts'
import { activityTimestamp, type RecentSession } from './session-model.ts'
export function pinnedSessionRows(pins: HomeState['nativePins'], sessions: Readonly<Record<string, SessionMeta>>): RecentSession[] {
  const archived = new Set(pins?.archived ?? [])
  const seen = new Set<string>()
  return (pins?.ids ?? []).flatMap(id => {
    if (typeof id !== 'string' || id.trim() === '' || seen.has(id) || archived.has(id)) return []
    seen.add(id)
    const meta = Object.hasOwn(sessions, id) ? sessions[id] : undefined
    return [{ id, title: meta?.title?.trim() || undefined, cwd: meta?.cwd?.trim() || undefined,
      lastAt: activityTimestamp(meta?.updatedAt), running: meta?.running }]
  })
}
