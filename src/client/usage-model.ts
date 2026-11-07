/**
 * Token 用量的展示计算：桶的合并、速率、紧凑数字。
 *
 * 数据全部来自账本的天桶（宿主侧折叠），这里只做求和与格式化，不猜、不补零。
 *
 * @module @vlln/dsh-home/client/usage-model
 */

import type { DayBucket, TokenBuckets } from './api.ts'

export type { TokenBuckets }

export function emptyBuckets(): TokenBuckets {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

/** 合计各桶；缺字段按 0（老账本或未采样的天）。 */
export function bucketsOf(day: { tokens?: TokenBuckets } | undefined): TokenBuckets {
  const tokens = day?.tokens
  if (tokens === undefined) return emptyBuckets()
  return {
    input: tokens.input ?? 0,
    output: tokens.output ?? 0,
    cacheRead: tokens.cacheRead ?? 0,
    cacheWrite: tokens.cacheWrite ?? 0,
  }
}

/** 一天的总 token（输入 + 输出 + 缓存读 + 缓存写）。 */
export function totalTokens(buckets: TokenBuckets): number {
  return buckets.input + buckets.output + buckets.cacheRead + buckets.cacheWrite
}

/** 多天求和。 */
export function sumDays(days: readonly { tokens?: TokenBuckets }[]): TokenBuckets {
  return days.reduce((total, day) => {
    const buckets = bucketsOf(day)
    return {
      input: total.input + buckets.input,
      output: total.output + buckets.output,
      cacheRead: total.cacheRead + buckets.cacheRead,
      cacheWrite: total.cacheWrite + buckets.cacheWrite,
    }
  }, emptyBuckets())
}

/** 缓存命中率 = 缓存读 /（未缓存输入 + 缓存读 + 缓存写）；没有输入时返回 null。 */
export function cacheHitRate(buckets: TokenBuckets): number | null {
  const prompt = buckets.input + buckets.cacheRead + buckets.cacheWrite
  return prompt === 0 ? null : buckets.cacheRead / prompt
}

/** 速率 = 输出 token ÷ 运行时长（token/s）；没有运行时长时返回 null。 */
export function tokensPerSecond(buckets: TokenBuckets, runMs: number): number | null {
  if (!Number.isFinite(runMs) || runMs <= 0) return null
  return buckets.output / (runMs / 1000)
}

/** 紧凑数字：1 234 → 1.2k，3 400 000 → 3.4M。 */
export function compactCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/u, '')}k`
  return `${(value / 1_000_000).toFixed(value < 10_000_000 ? 1 : 0).replace(/\.0$/u, '')}M`
}
