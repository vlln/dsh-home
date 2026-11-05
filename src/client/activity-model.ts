/** Calendar-only math: never add 24h to a local timestamp across DST. */
export type ActivityConfig = { cwd: string; range: 'auto' | 'quarter' | 'year' }
export interface ActivityDay { key: string; messages: number; sessions: number }
export interface ActivitySnapshot {
  generatedAt: number; timeZone: string; today: string; days: ActivityDay[]; workspaces: string[]
  available: boolean; complete: boolean; failed: number; scanError: boolean; scanning: boolean
  progress: { done: number; total: number }; sessions: { id: string; cwd?: string; messages: number }[]; matchedSessions: number
}
export function validateActivityConfig(value: unknown): value is ActivityConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const c = value as ActivityConfig
  return typeof c.cwd === 'string' && c.cwd.length <= 4096 && ['auto', 'quarter', 'year'].includes(c.range)
}
export function shiftCalendarDay(key: string, delta: number): string {
  const date = new Date(`${key}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}
/** Geometry is shared with CSS; responsive sizing never changes stored config. */
export const ACTIVITY_MIN_CELL = 12
export const ACTIVITY_NATURAL_CELL = 16
export const ACTIVITY_MAX_CELL = 24
export const ACTIVITY_GAP = 3
export const ACTIVITY_SCROLL_PADDING = 3
export const ACTIVITY_BLOCK_GAP = 24
/** Measured non-cell height of the week-column layout (summary, month row, caption, footer, gaps). */
const WEEKS_CHROME = 140
const mondayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7
const gridWidth = (columns: number, cell: number) => columns * cell + (columns - 1) * ACTIVITY_GAP
export function activityYearWidth(today: string, cell = ACTIVITY_MIN_CELL): number {
  const first = shiftCalendarDay(today, 1 - 365)
  const columns = Math.ceil((365 + mondayIndex(first)) / 7)
  return gridWidth(columns, cell) + 2 * ACTIVITY_SCROLL_PADDING
}
export function activityWeeks(days: ActivityDay[], today: string, width: number, range: ActivityConfig['range'], height = Infinity) {
  let available = Math.max(0, Number.isFinite(width) ? width - 2 * ACTIVITY_SCROLL_PADDING : 0)
  // A short card caps the cell before width does. Size auto's week count from that
  // capped cell, so the extra weeks fill the width instead of leaving a blank tail.
  const weeksHeightCell = Number.isFinite(height) ? (height - WEEKS_CHROME - 6 * ACTIVITY_GAP) / 7 : ACTIVITY_NATURAL_CELL
  const autoCell = Math.max(ACTIVITY_MIN_CELL, Math.min(ACTIVITY_NATURAL_CELL, weeksHeightCell))
  const columns = Math.max(1, Math.floor((available + ACTIVITY_GAP) / (autoCell + ACTIVITY_GAP)))
  // Auto begins on Monday and ends today. Each extra natural column adds seven
  // actual days, instead of leaving an 84-day chart until a whole year fits.
  // Only the final 365-day cap may start mid-week. Explicit ranges stay exact.
  const count = range === 'year' ? 365 : range === 'quarter' ? 84
    : Math.min(365, (columns - 1) * 7 + mondayIndex(today) + 1)
  const first = shiftCalendarDay(today, 1 - count)
  const values = new Map(days.map(day => [day.key, day]))
  const makeWeeks = (from: string, to: string) => {
    const weeks: (ActivityDay | null)[][] = []
    for (let key = shiftCalendarDay(from, -mondayIndex(from)); key <= to;) {
      const week: (ActivityDay | null)[] = []
      for (let i = 0; i < 7; i++) {
        week.push(key < from || key > to ? null : values.get(key) ?? { key, messages: 0, sessions: 0 })
        key = shiftCalendarDay(key, 1)
      }
      weeks.push(week)
    }
    return weeks
  }
  const weeks = makeWeeks(first, today)
  // Three chronological 28-day blocks use a broad quarter card without inflating
  // its cells or pretending these fixed four-week periods are calendar months.
  const blocked = range === 'quarter' && available >= 3 * gridWidth(7, ACTIVITY_NATURAL_CELL) + 2 * ACTIVITY_BLOCK_GAP
  const sidebar = blocked && available >= 660
  if (sidebar) available -= 156 // 140px observed-count summary + 16px gap.
  // Fit the default-height card too, not just its width. Keep readable 12px
  // squares on legacy tiny cards; status and selected-day details may scroll.
  const rows = blocked ? Math.max(...Array.from({ length: 3 }, (_, i) => makeWeeks(shiftCalendarDay(first, i * 28), shiftCalendarDay(first, i * 28 + 27)).length)) : 7
  // Non-cell vertical chrome: summary, caption, footer, flex gaps and the month row.
  // Inter-row gaps are added explicitly, otherwise a 7-row chart overflows by ~18px.
  const chrome = blocked ? (sidebar ? 120 : 160) : WEEKS_CHROME
  const heightLimit = Number.isFinite(height) ? (height - chrome - (rows - 1) * ACTIVITY_GAP) / rows : ACTIVITY_MAX_CELL
  const cellSize = Math.max(ACTIVITY_MIN_CELL, Math.min(ACTIVITY_MAX_CELL, heightLimit, blocked
    ? (available - 2 * ACTIVITY_BLOCK_GAP - 3 * 6 * ACTIVITY_GAP) / 21
    : (available - (weeks.length - 1) * ACTIVITY_GAP) / weeks.length))
  const blocks = blocked ? Array.from({ length: 3 }, (_, i) => {
    const start = shiftCalendarDay(first, i * 28)
    const end = shiftCalendarDay(start, 27)
    return { first: start, last: end, weeks: makeWeeks(start, end) }
  }) : []
  const chartWidth = blocked ? 3 * gridWidth(7, cellSize) + 2 * ACTIVITY_BLOCK_GAP : gridWidth(weeks.length, cellSize)
  return { weeks, count, first, cellSize, chartWidth, blocks, sidebar }
}
/** Synthetic gallery sample. Registry preview JSON is capped at 8 KiB, so keep it
 * to 84 days; a full year (~16 KiB) makes registration throw and the plugin fail to boot. */
export function activityPreviewSnapshot(): ActivitySnapshot {
  return {
    generatedAt: Date.UTC(2026, 9, 20, 10, 24), timeZone: 'UTC', today: '2026-10-20',
    days: Array.from({ length: 84 }, (_, i) => ({ key: shiftCalendarDay('2026-10-20', i - 83), messages: (i * 7 + Math.floor(i / 9)) % 15, sessions: i % 3 })),
    workspaces: [], available: true, complete: true, failed: 0, scanError: false, scanning: false,
    progress: { done: 3, total: 3 }, sessions: [], matchedSessions: 0,
  }
}
export function activityLevel(messages: number): number {
  return messages <= 0 ? 0 : messages <= 2 ? 1 : messages <= 5 ? 2 : messages <= 10 ? 3 : 4
}
