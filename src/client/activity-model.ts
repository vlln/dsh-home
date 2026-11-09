/** Calendar-only math: never add 24h to a local timestamp across DST. */
export type ActivityConfig = { range: 'auto' | 'quarter' | 'year' }
export interface ActivityDay { key: string; messages: number; sessions: number }
export interface ActivitySnapshot {
  generatedAt: number; timeZone: string; today: string; days: ActivityDay[]; workspaces: string[]
  available: boolean; complete: boolean; failed: number; scanError: boolean; scanning: boolean
  progress: { done: number; total: number }; sessions: { id: string; cwd?: string; messages: number }[]; matchedSessions: number
}
export function validateActivityConfig(value: unknown): value is ActivityConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const c = value as ActivityConfig
  return Object.keys(c).every(key => key === 'range') && ['auto', 'quarter', 'year'].includes(c.range)
}
/** v1 存过 cwd；工作足迹现在始终统计全部工作区，迁移时直接丢掉。 */
export function migrateActivityConfig(config: unknown, fromVersion: number): ActivityConfig {
  const range = config !== null && typeof config === 'object' && !Array.isArray(config)
    ? (config as { range?: unknown }).range : undefined
  return { range: ['auto', 'quarter', 'year'].includes(range as string) ? range as ActivityConfig['range'] : 'auto' }
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
/** 一年的窄卡宁可把方格缩到 2px、间距收到 1px，也不出现横向滚动条。 */
export const ACTIVITY_COMPACT_CELL = 2
export const ACTIVITY_COMPACT_GAP = 1
const mondayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7
const gridWidth = (columns: number, cell: number, gap = ACTIVITY_GAP) => columns * cell + (columns - 1) * gap
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
/**
 * Days in the rolling year that ends at `today`. A leap day inside the window makes it 366;
 * the grid then has one more cell than the usual 365, which is the point.
 */
export function yearDays(today: string): number {
  for (let back = 1; back <= 366; back++) {
    const key = shiftCalendarDay(today, -back)
    if (key.endsWith('-02-29')) return 366
  }
  return 365
}

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
  // A year on a narrow card: 53 columns of 12px cannot fit, so allow 2px dots and a
  // 1px gap. Only the year range is allowed to get this dense; auto/quarter keep 12px.
  const compact = range === 'year' && !blocked
    && (available - (weeks.length - 1) * ACTIVITY_GAP) / weeks.length < 8
  const gap = compact ? ACTIVITY_COMPACT_GAP : ACTIVITY_GAP
  // 一年允许比常规 12px 更小：窄卡 2px 点阵，宽卡最低 8px，保证 53 列总能装下。
  const minCell = compact ? ACTIVITY_COMPACT_CELL : range === 'year' ? 8 : ACTIVITY_MIN_CELL
  // Non-cell vertical chrome measured from the layout: the scroll container's padding,
  // the month row (or the block label + weekday row) and every grid gap.
  const reserve = blocked
    ? 2 * ACTIVITY_SCROLL_PADDING + 16 + 2 * 6 + 16 + (rows - 1) * gap
    : 2 * ACTIVITY_SCROLL_PADDING + 16 + rows * gap
  const heightLimit = Number.isFinite(height) ? (height - reserve) / rows : ACTIVITY_MAX_CELL
  const widthLimit = blocked
    ? (available - 2 * ACTIVITY_BLOCK_GAP - 3 * 6 * gap) / 21
    : (available - (weeks.length - 1) * gap) / weeks.length
  const cellSize = Math.max(minCell, Math.min(ACTIVITY_MAX_CELL, heightLimit, widthLimit))
  const chartWidth = blocked ? 3 * gridWidth(7, cellSize, gap) + 2 * ACTIVITY_BLOCK_GAP : gridWidth(weeks.length, cellSize, gap)
  return { weeks, count, first, cellSize, chartWidth, blocks, gap }
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
export function activityChartHeight(grid: { cellSize: number; gap: number; blocks: { weeks: unknown[] }[] }): number {
  const blocked = grid.blocks.length > 0
  const rows = blocked ? Math.max(...grid.blocks.map(block => block.weeks.length)) : 7
  const reserve = blocked
    ? 2 * ACTIVITY_SCROLL_PADDING + 16 + 2 * 6 + 16 + (rows - 1) * grid.gap
    : 2 * ACTIVITY_SCROLL_PADDING + 16 + rows * grid.gap
  return reserve + rows * grid.cellSize
}
export function activityLevel(messages: number): number {
  return messages <= 0 ? 0 : messages <= 2 ? 1 : messages <= 5 ? 2 : messages <= 10 ? 3 : 4
}
