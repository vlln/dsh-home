/** Browser-zone activity queries over the existing ledger; no raw-log reads or extra scans. */
const DAY = 86_400_000
export function validateActivityQuery(raw = {}) {
  const timeZone = raw.timeZone ?? 'UTC'
  if (typeof timeZone !== 'string' || timeZone.length > 100) throw badQuery()
  try { new Intl.DateTimeFormat('en', { timeZone }).format(0) } catch { throw badQuery() }
  const cwd = raw.cwd ?? ''
  if (typeof cwd !== 'string' || cwd.length > 4096) throw badQuery()
  const date = raw.date
  if (date !== undefined) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badQuery()
    const parsed = new Date(`${date}T12:00:00Z`)
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw badQuery()
  }
  return { timeZone, cwd, date }
}
function badQuery() { return Object.assign(new Error('Invalid activity query'), { code: 'bad-activity-query' }) }
function keyFormatter(timeZone) { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }) }
export function zonedDayKey(time, timeZone) {
  const parts = keyFormatter(timeZone).formatToParts(time)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-')
}
function shift(key, days) { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
export function buildActivity(state, raw = {}, { now = Date.now(), available = true, scanError = false } = {}) {
  const query = validateActivityQuery(raw)
  const formatter = keyFormatter(query.timeZone)
  // Concurrent sessions often share minutes. Scope this cache to a query so it
  // cannot retain stale locale/zone state or grow across requests.
  const minuteDays = new Map()
  const keyAt = time => {
    const minute = Math.floor(time / 60_000)
    let key = minuteDays.get(minute)
    if (key === undefined) {
      const parts = formatter.formatToParts(time)
      key = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-')
      minuteDays.set(minute, key)
    }
    return key
  }
  const today = keyAt(now)
  const first = shift(today, -364)
  const totals = new Map()
  const matches = []
  const workspaces = new Set()
  let failed = 0
  for (const session of Object.values(state.sessions ?? {})) {
    if (session.failed) { failed++; continue }
    if (session.parentSessionId !== undefined || session.origin === 'subagent') continue
    if (session.cwd) workspaces.add(session.cwd)
    if (query.cwd && session.cwd !== query.cwd) continue
    const perDay = new Map()
    for (const [minute, count] of Object.entries(session.humanMinutes ?? {})) {
      const time = Number(minute) * 60_000
      if (!Number.isFinite(time) || time < now - 367 * DAY || time > now || !Number.isSafeInteger(count) || count <= 0) continue
      const key = keyAt(time)
      if (key < first || key > today) continue
      perDay.set(key, (perDay.get(key) ?? 0) + count)
    }
    for (const [key, messages] of perDay) {
      const total = totals.get(key) ?? { messages: 0, sessions: 0 }
      total.messages += messages
      total.sessions++
      totals.set(key, total)
    }
    const messages = perDay.get(query.date) ?? 0
    if (messages > 0) matches.push({ id: session.id, cwd: session.cwd, messages })
  }
  const days = []
  for (let key = first; key <= today; key = shift(key, 1)) days.push({ key, ...(totals.get(key) ?? { messages: 0, sessions: 0 }) })
  matches.sort((a, b) => b.messages - a.messages || a.id.localeCompare(b.id))
  const complete = available && !scanError && state.scannedAt != null && !state.scanning && failed === 0
  return { generatedAt: now, timeZone: query.timeZone, today, days, workspaces: [...workspaces].sort(),
    complete, available, failed, scanError, scanning: state.scanning === true,
    progress: state.progress ?? { done: 0, total: 0 },
    sessions: matches.slice(0, 100), matchedSessions: matches.length }
}
