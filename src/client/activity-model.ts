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
const mondayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7
const gridWidth = (columns: number, cell: number) => columns * cell + (columns - 1) * ACTIVITY_GAP
export function activityYearWidth(today: string, cell = ACTIVITY_MIN_CELL): number {
  const first = shiftCalendarDay(today, 1 - 365)
  const columns = Math.ceil((365 + mondayIndex(first)) / 7)
  return gridWidth(columns, cell) + 2 * ACTIVITY_SCROLL_PADDING
}
/**
 * 热力图几何。
 *
 * @param height 图表区（`.dsh-activity-scroll`）的实测高度；不再猜「卡片减去固定 chrome」，
 *   而是由布局量出来再交给这里，卡片就永远不会因为多一行说明文字而溢出。
 * @returns 单元格大小、周数、区块与图表宽度
 */
export function activityWeeks(days: ActivityDay[], today: string, width: number, range: ActivityConfig['range'], height = Infinity) {
  let available = Math.max(0, Number.isFinite(width) ? width - 2 * ACTIVITY_SCROLL_PADDING : 0)
  // Auto begins on Monday and ends today; each extra natural column adds seven actual
  // days. Only the 365-day cap may start mid-week. Explicit ranges stay exact.
  const columns = Math.max(1, Math.floor((available + ACTIVITY_GAP) / (ACTIVITY_NATURAL_CELL + ACTIVITY_GAP)))
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
  // Build the blocks before sizing: a 28-day slice padded to whole weeks spans five
  // grid rows, and sizing cells for four was what pushed the last row out of the card.
  const blocks = blocked ? Array.from({ length: 3 }, (_, i) => {
    const start = shiftCalendarDay(first, i * 28)
    const end = shiftCalendarDay(start, 27)
    return { first: start, last: end, weeks: makeWeeks(start, end) }
  }) : []
  const rows = blocked ? Math.max(...blocks.map(block => block.weeks.length)) : 7
  // Non-cell vertical chrome measured from the layout: the scroll container's padding,
  // the month row (or the block label + weekday row) and every grid gap.
  const reserve = blocked
    ? 2 * ACTIVITY_SCROLL_PADDING + 16 + 2 * 6 + 16 + (rows - 1) * ACTIVITY_GAP
    : 2 * ACTIVITY_SCROLL_PADDING + 16 + rows * ACTIVITY_GAP
  const heightLimit = Number.isFinite(height) ? (height - reserve) / rows : ACTIVITY_MAX_CELL
  const widthLimit = blocked
    ? (available - 2 * ACTIVITY_BLOCK_GAP - 3 * 6 * ACTIVITY_GAP) / 21
    : (available - (weeks.length - 1) * ACTIVITY_GAP) / weeks.length
  const cellSize = Math.max(ACTIVITY_MIN_CELL, Math.min(ACTIVITY_MAX_CELL, heightLimit, widthLimit))
  const chartWidth = blocked ? 3 * gridWidth(7, cellSize) + 2 * ACTIVITY_BLOCK_GAP : gridWidth(weeks.length, cellSize)
  return { weeks, count, first, cellSize, chartWidth, blocks }
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
/** 热力图占用的实际高度：月份行 / 区块标题、行间距与容器内边距都算进去。 */
export function activityChartHeight(grid: { cellSize: number; blocks: { weeks: unknown[] }[] }): number {
  const blocked = grid.blocks.length > 0
  const rows = blocked ? Math.max(...grid.blocks.map(block => block.weeks.length)) : 7
  const reserve = blocked
    ? 2 * ACTIVITY_SCROLL_PADDING + 16 + 2 * 6 + 16 + (rows - 1) * ACTIVITY_GAP
    : 2 * ACTIVITY_SCROLL_PADDING + 16 + rows * ACTIVITY_GAP
  return reserve + rows * grid.cellSize
}
export function activityLevel(messages: number): number {
  return messages <= 0 ? 0 : messages <= 2 ? 1 : messages <= 5 ? 2 : messages <= 10 ? 3 : 4
}
