/** 「最近活跃」的纯模型：窗口枚举、配置校验、画廊样例。
 *
 * 与渲染分离，方便单测（Node 的类型剥离不处理 JSX）。窗口是同一个量（每天在场时长）
 * 的不同表达，所以这里只有窗口，没有别的业务字段。
 */
import type { JsonValue } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'

export type ActiveRange = 'today' | '2d' | '7d' | '14d'
export type ActiveConfig = { range: ActiveRange }

export const ACTIVE_RANGES: readonly ActiveRange[] = ['today', '2d', '7d', '14d']
export const ACTIVE_DAY_COUNT: Record<ActiveRange, number> = { today: 1, '2d': 2, '7d': 7, '14d': 14 }

/** 配置只认这四个窗口；手改的文件退回默认，不抛错。 */
export function validateActiveConfig(value: unknown): value is ActiveConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && ACTIVE_RANGES.includes((value as { range?: unknown }).range as ActiveRange)
}

/** 画廊预览用的样例：固定日期，避免每次渲染都变。 */
export function activePreviewData(): JsonValue {
  const days: DayBucket[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 6 + index))
    const activeMs = [42, 0, 96, 61, 130, 0, 18, 74, 155, 88, 0, 210, 133, 64][index]! * 60_000
    return { key: date.toISOString().slice(0, 10), activeMs, runMs: Math.round(activeMs * 0.4), turns: Math.round(activeMs / 9e5), sessions: activeMs > 0 ? 1 : 0 }
  })
  const sample: Pick<LedgerSnapshot, 'days' | 'today' | 'sessions'> = {
    days,
    today: { activeMs: days[13]!.activeMs, runMs: days[13]!.runMs, turns: days[13]!.turns, sessions: 1 },
    sessions: [],
  }
  return sample as unknown as JsonValue
}
