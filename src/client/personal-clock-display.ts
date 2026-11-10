/** Pure display parts: use Intl's zoned calendar, never the machine's Date getters. */
import type { ClockConfig } from './personal-model.ts'

export function personalClockDisplayParts(now: number, config: ClockConfig, locale: string): {
  timeParts: Intl.DateTimeFormatPart[]; day: string; month: string
} {
  // Omitting the option (rather than substituting UTC) preserves browser-zone mode.
  const zone = config.timeZone === '' ? {} : { timeZone: config.timeZone }
  // `null` means "whatever the locale does"; only an explicit flip overrides it.
  const cycle = typeof config.hour12 === 'boolean' ? { hour12: config.hour12 } : {}
  const dateParts = new Intl.DateTimeFormat(locale, {
    ...zone, day: 'numeric', month: 'short',
  }).formatToParts(now)
  return {
    // The locale owns the hour cycle until the reader flips it by clicking the numeral.
    timeParts: new Intl.DateTimeFormat(locale, {
      ...zone, ...cycle, hour: '2-digit', minute: '2-digit',
    }).formatToParts(now),
    day: dateParts.find(part => part.type === 'day')?.value ?? '',
    // A standalone month retains locale-owned units (for example zh-CN's 月)
    // that appear as literals, not inside the month part of a full date.
    month: new Intl.DateTimeFormat(locale, { ...zone, month: 'short' })
      .formatToParts(now).map(part => part.value).join(''),
  }
}

/**
 * The card paints the numerals first and the day period last.
 *
 * Intl is right about the idiom — zh puts 上午 before the digits, en puts PM after them — but the
 * numeral is the card's left edge in both formats, so a leading 上午 would shift the whole time
 * 40px right whenever the reader flips to 12h. The period becomes a unit after the time instead.
 */
export function clockFaceParts(parts: Intl.DateTimeFormatPart[]): Intl.DateTimeFormatPart[] {
  const period = parts.filter(part => part.type === 'dayPeriod')
  if (period.length === 0) return parts
  const time: Intl.DateTimeFormatPart[] = []
  for (const [index, part] of parts.entries()) {
    if (part.type === 'dayPeriod') continue
    // The whitespace Intl emits before an en-US "PM" is replaced by the unit's own margin.
    if (part.type === 'literal' && /^\s+$/u.test(part.value) && parts[index + 1]?.type === 'dayPeriod') continue
    time.push(part)
  }
  return [...time, ...period]
}
