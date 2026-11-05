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
/** Keep these calendar geometry constants shared with the stylesheet. */
export const ACTIVITY_YEAR_CELL = 12
export const ACTIVITY_QUARTER_CELL = 16
export const ACTIVITY_GAP = 3
export const ACTIVITY_SCROLL_PADDING = 3
export function activityYearWidth(today: string): number {
  const first = shiftCalendarDay(today, 1 - 365)
  const leading = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7
  const columns = Math.ceil((365 + leading) / 7)
  return columns * ACTIVITY_YEAR_CELL + (columns - 1) * ACTIVITY_GAP + 2 * ACTIVITY_SCROLL_PADDING
}
export function activityWeeks(days: ActivityDay[], today: string, width: number, range: ActivityConfig['range']) {
  // Auto shows a year only if its actual fixed square columns fit. Explicit
  // year remains intentionally scrollable on narrower cards.
  const count = range === 'year' || (range === 'auto' && width >= activityYearWidth(today)) ? 365 : 84
  const first = shiftCalendarDay(today, 1 - count)
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7
  const start = shiftCalendarDay(first, -weekday)
  const values = new Map(days.map(day => [day.key, day]))
  const weeks: (ActivityDay | null)[][] = []
  for (let key = start; key <= today;) {
    const week: (ActivityDay | null)[] = []
    for (let i = 0; i < 7; i++) {
      week.push(key < first || key > today ? null : values.get(key) ?? { key, messages: 0, sessions: 0 })
      key = shiftCalendarDay(key, 1)
    }
    weeks.push(week)
  }
  return { weeks, count, first }
}
export function activityLevel(messages: number): number {
  return messages <= 0 ? 0 : messages <= 2 ? 1 : messages <= 5 ? 2 : messages <= 10 ? 3 : 4
}
