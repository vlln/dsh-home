/**
 * 数字与时间的人话格式：时长、相对时间、日期、快捷键提示。
 *
 * @module @vlln/dsh-home/client/format
 */

/** 翻译函数的最小形状（槽组件从 `PropsLocale` 拿到的是同一形状）。 */
export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * 时长：`0` → "0 分钟"，`<1h` → 分钟，整点 → 小时，其余 → 小时+分。
 * @param ms 毫秒
 * @param t 翻译
 */
export function formatDuration(ms: number, t: Translate): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  if (minutes <= 0) return t('dur.none')
  if (minutes < 60) return t('dur.minutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return t('dur.hours', { h: hours })
  return t('dur.hoursMinutes', { h: hours, m: rest })
}

/**
 * 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前。
 * @param time 目标时刻
 * @param now 当前时刻
 * @param t 翻译
 */
export function formatAgo(time: number, now: number, t: Translate): string {
  const delta = Math.max(0, now - time)
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { n: hours })
  return t('time.daysAgo', { n: Math.floor(hours / 24) })
}

/**
 * 今天的日期行：地区化月日 + 星期。
 * @param now 当前时刻
 * @param locale 语言（`ctx.locale` 的 active）
 */
export function formatDay(now: number, locale: string): string {
  const tag = locale === 'zh' || locale.startsWith('zh') ? 'zh-CN' : 'en-US'
  try {
    return new Intl.DateTimeFormat(tag, { month: 'long', day: 'numeric', weekday: 'short' }).format(now)
  } catch {
    return new Date(now).toDateString()
  }
}

/**
 * 日期键 → 短标签（`10-22` / `10/22`）。
 * @param key `YYYY-MM-DD`
 */
export function shortDay(key: string): string {
  const [, month, day] = key.split('-')
  return month === undefined || day === undefined ? key : `${month}-${day}`
}

/**
 * 平台快捷键提示：macOS 用 ⌘N，其余 Ctrl+N。
 * @returns 可直接嵌进文案的字符串
 */
export function shortcutHint(): string {
  const platform = typeof navigator === 'undefined' ? '' : navigator.platform
  return /mac/i.test(platform) ? '⌘N' : 'Ctrl+N'
}

/**
 * 把毫秒映射到一天里的比例（0..1）。
 * @param time 时刻
 */
export function dayFraction(time: number): number {
  const date = new Date(time)
  return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86_400
}
