/** 「最近活跃」的纯模型：窗口枚举、配置校验、画廊样例。
 *
 * 与渲染分离，方便单测（Node 的类型剥离不处理 JSX）。窗口是同一个量（每天在场时长）
 * 的不同表达，所以这里只有窗口，没有别的业务字段。
 */
import type { JsonValue } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'

export type ActiveRange = '7d' | '14d' | '30d'
export type ActiveConfig = { range: ActiveRange }

/** 2 天看不出节奏，已删除；30 天覆盖一个自然月的工作节律。
 * 「今天」曾经也是这里的一个窗口；24 小时时间带与柱状图不是同一种图，已移出。 */
export const ACTIVE_RANGES: readonly ActiveRange[] = ['7d', '14d', '30d']
export const ACTIVE_DAY_COUNT: Record<ActiveRange, number> = { '7d': 7, '14d': 14, '30d': 30 }

/** 配置只认这三个窗口；手改的文件（含旧 today / 2d）退回默认，不抛错。 */
export function validateActiveConfig(value: unknown): value is ActiveConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  if (!Object.keys(value).every(key => key === 'range')) return false
  return ACTIVE_RANGES.includes((value as { range?: unknown }).range as ActiveRange)
}

/** v1→v2 删掉「今天」，v2→v3 删掉「2 天」：旧值统一落到 7 天，其它非法值同样处理。 */
export function migrateActiveConfig(config: unknown, fromVersion: number): ActiveConfig {
  if (fromVersion >= 3) return validateActiveConfig(config) ? config : { range: '7d' }
  const range = config !== null && typeof config === 'object' && !Array.isArray(config)
    ? (config as { range?: unknown }).range : undefined
  return { range: ACTIVE_RANGES.includes(range as ActiveRange) ? range as ActiveRange : '7d' }
}

/** 画廊预览用的样例：固定日期，避免每次渲染都变。 */
export function activePreviewData(): JsonValue {
  const days: DayBucket[] = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 6 + index))
    const activeMs = [42, 0, 96, 61, 130, 0, 18, 74, 155, 88, 0, 210, 133, 64, 51, 0, 120, 93, 46, 168, 0, 72, 141, 118, 0, 205, 96, 64, 133, 88][index]! * 60_000
    const tokens = { input: Math.round(activeMs / 900), output: Math.round(activeMs / 3_600), cacheRead: Math.round(activeMs / 260), cacheWrite: 0 }
    return { key: date.toISOString().slice(0, 10), activeMs, runMs: Math.round(activeMs * 0.4), turns: Math.round(activeMs / 9e5), sessions: activeMs > 0 ? 1 : 0, tokens }
  })
  const sample: Pick<LedgerSnapshot, 'days' | 'today' | 'sessions'> = {
    days,
    today: { activeMs: days.at(-1)!.activeMs, runMs: days.at(-1)!.runMs, turns: days.at(-1)!.turns, sessions: 1, tokens: days.at(-1)!.tokens },
    sessions: [],
  }
  return sample as unknown as JsonValue
}
