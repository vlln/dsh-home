/** Pure display parts: use Intl's zoned calendar, never the machine's Date getters. */
import type { ClockConfig } from './personal-model.ts'

export function personalClockDisplayParts(now: number, config: ClockConfig, locale: string): {
  timeParts: Intl.DateTimeFormatPart[]; day: string; month: string
} {
  // Omitting the option (rather than substituting UTC) preserves browser-zone mode.
  const zone = config.timeZone === '' ? {} : { timeZone: config.timeZone }
  const dateParts = new Intl.DateTimeFormat(locale, {
    ...zone, day: 'numeric', month: 'short',
  }).formatToParts(now)
  return {
    timeParts: new Intl.DateTimeFormat(locale, {
      ...zone, hour: '2-digit', minute: '2-digit', hour12: config.hour12,
    }).formatToParts(now),
    day: dateParts.find(part => part.type === 'day')?.value ?? '',
    // A standalone month retains locale-owned units (for example zh-CN's 月)
    // that appear as literals, not inside the month part of a full date.
    month: new Intl.DateTimeFormat(locale, { ...zone, month: 'short' })
      .formatToParts(now).map(part => part.value).join(''),
  }
}
