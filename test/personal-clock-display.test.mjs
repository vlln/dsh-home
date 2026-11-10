import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clockFaceParts, personalClockDisplayParts } from '../src/client/personal-clock-display.ts'
import { defaultClockConfig, formatPersonalClock } from '../src/client/personal-model.ts'

const config = { timeZone: 'America/Los_Angeles' }

test('medallion follows configured zone at local midnight, including the previous UTC year', () => {
  const before = personalClockDisplayParts(Date.UTC(2026, 0, 1, 7, 59), config, 'en-US')
  const after = personalClockDisplayParts(Date.UTC(2026, 0, 1, 8), config, 'en-US')
  assert.equal(before.day, '31')
  assert.equal(before.month, 'Dec')
  assert.equal(after.day, '1')
  assert.equal(after.month, 'Jan')
  const shanghai = personalClockDisplayParts(Date.UTC(2025, 11, 31, 16), { ...config, timeZone: 'Asia/Shanghai' }, 'zh-CN')
  assert.equal(shanghai.day, '1')
  assert.equal(shanghai.month, '1月')
})

test('display parts retain Intl locale order, literals and localized day periods without parsing text', () => {
  const now = Date.UTC(2026, 9, 20, 10, 24)
  for (const locale of ['en-US', 'zh-CN', 'ar-EG', 'ja-JP', 'fr-FR']) {
    const selected = config
    const parts = personalClockDisplayParts(now, selected, locale)
    assert.deepEqual(parts.timeParts, new Intl.DateTimeFormat(locale, {
      timeZone: selected.timeZone, hour: '2-digit', minute: '2-digit',
    }).formatToParts(now))
    // Some ICU versions use a narrow NBSP only in formatToParts day-period literals.
    assert.equal(parts.timeParts.map(part => part.value).join('').replace(/\s/g, ' '),
      formatPersonalClock(now, selected, locale).time.replace(/\s/g, ' '))
    const date = new Intl.DateTimeFormat(locale, { timeZone: selected.timeZone, day: 'numeric', month: 'short' }).formatToParts(now)
    assert.equal(parts.day, date.find(part => part.type === 'day').value)
    assert.equal(parts.month, new Intl.DateTimeFormat(locale, { timeZone: selected.timeZone, month: 'short' }).format(now))
  }
})

test('empty zone preserves browser default and config stays immutable', () => {
  const now = Date.UTC(2026, 5, 30, 23, 59)
  const selected = defaultClockConfig()
  const before = structuredClone(selected)
  const result = personalClockDisplayParts(now, selected, 'en-US')
  const date = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).formatToParts(now)
  assert.equal(result.day, date.find(part => part.type === 'day').value)
  assert.equal(result.month, date.find(part => part.type === 'month').value)
  assert.deepEqual(selected, before)
})

test('the day period is painted after the numerals, whichever way Intl orders it', () => {
  const now = Date.UTC(2026, 0, 1, 20, 5)
  const en = personalClockDisplayParts(now, { timeZone: 'UTC', hour12: true }, 'en-US').timeParts
  const zh = personalClockDisplayParts(now, { timeZone: 'UTC', hour12: true }, 'zh-CN').timeParts
  // Intl itself puts the period first in zh and last in en.
  assert.equal(en[0].type, 'hour')
  assert.equal(zh[0].type, 'dayPeriod')
  for (const parts of [en, zh]) {
    const face = clockFaceParts(parts)
    assert.equal(face[0].type, 'hour', 'the numeral keeps the card edge')
    assert.equal(face.at(-1).type, 'dayPeriod', 'the period is a trailing unit')
    const kept = list => list.filter(part => !(part.type === 'literal' && /^\s+$/u.test(part.value)))
      .map(part => part.value).sort()
    assert.deepEqual(kept(face), kept(parts), 'only the whitespace before the period is dropped')
  }
  // 24h has no period at all, so the face is the parts untouched.
  const plain = personalClockDisplayParts(now, { timeZone: 'UTC', hour12: false }, 'zh-CN').timeParts
  assert.deepEqual(clockFaceParts(plain), plain)
})
