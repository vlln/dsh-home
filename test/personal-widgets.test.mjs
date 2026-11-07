/** node --experimental-strip-types --test test/personal-widgets.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PERSONAL_CONFIG_MAX_BYTES,
  defaultClockConfig, defaultNotesConfig, formatPersonalClock, isValidTimeZone,
  migrateClockConfig, migrateNotesConfig, millisecondsToNextMinute, personalConfigBytes, startMinuteClock,
  validateClockConfig, validateNotesConfig,
} from '../src/client/personal-model.ts'
import { enPersonal, zhPersonal } from '../src/client/personal-locales.ts'
import { HomeWidgetRegistry, validateWidgetConfig } from '../src/client/widget-registry.ts'

const encoder = new TextEncoder()

test('notes accept empty and literal plain text without trimming, parsing or mutation', () => {
  const config = { text: '  第一行\n\n\t<script>alert("x")</script>\n**not Markdown**  ' }
  const before = structuredClone(config)
  assert.equal(validateNotesConfig(config), true)
  assert.equal(validateNotesConfig(defaultNotesConfig()), true)
  assert.deepEqual(config, before)
})

test('notes bound UTF-8 serialized JSON including escapes at 8 KiB', () => {
  const baseBytes = personalConfigBytes(defaultNotesConfig())
  const exact = { text: 'a'.repeat(PERSONAL_CONFIG_MAX_BYTES - baseBytes) }
  assert.equal(personalConfigBytes(exact), PERSONAL_CONFIG_MAX_BYTES)
  assert.equal(validateNotesConfig(exact), true)
  assert.equal(validateNotesConfig({ text: exact.text + 'a' }), false)
  for (const glyph of ['中', '😀', '\n', '"', '\\', '\u0000']) {
    const config = { text: glyph.repeat(2_500) }
    assert.equal(personalConfigBytes(config), encoder.encode(JSON.stringify(config)).byteLength)
    assert.equal(validateNotesConfig(config), personalConfigBytes(config) <= PERSONAL_CONFIG_MAX_BYTES)
  }
})

test('notes reject wrong schema and accessors; v1 titles migrate into the first line', () => {
  for (const config of [null, [], '', {}, { title: '' }, { text: 1 },
    { text: null }, { text: '', title: 'old' }, { text: '', html: true }]) {
    assert.equal(validateNotesConfig(config), false)
  }
  let accessed = false
  const accessor = { get text() { accessed = true; throw new Error('not data') } }
  assert.equal(validateNotesConfig(accessor), false)
  assert.equal(accessed, false)
  assert.equal(validateNotesConfig(Object.assign(Object.create(null), { text: '' })), true)
  assert.deepEqual(migrateNotesConfig({ title: 'T', text: 'B' }, 1), { text: 'T\n\nB' })
  assert.deepEqual(migrateNotesConfig({ title: '', text: 'B' }, 1), { text: 'B' })
  assert.deepEqual(migrateNotesConfig({ title: 'T', text: '' }, 1), { text: 'T' })
  assert.deepEqual(migrateNotesConfig({ title: '  ', text: '  ' }, 1), { text: '' })
  assert.deepEqual(migrateNotesConfig(null, 1), { text: '' })
  assert.deepEqual(migrateNotesConfig({ text: 'kept' }, 2), { text: 'kept' })
  assert.deepEqual(migrateNotesConfig({ text: 3 }, 2), { text: '' })
})

test('clock takes exactly one time zone and treats only the empty string as browser zone', () => {
  for (const zone of ['', 'UTC', 'Asia/Shanghai', 'America/Los_Angeles', 'Europe/London', 'Asia/Kathmandu']) {
    assert.equal(isValidTimeZone(zone), true, zone)
    assert.equal(validateClockConfig({ timeZone: zone }), true)
  }
  for (const zone of [null, undefined, 0, {}, 'Mars/Olympus', 'Not/A_Zone', ' UTC', 'UTC ', ' ', 'x'.repeat(101)]) {
    assert.equal(isValidTimeZone(zone), false, String(zone))
    assert.equal(validateClockConfig({ timeZone: zone }), false)
  }
  for (const config of [null, [], {}, { timeZone: '', label: 'stale' },
    { timeZone: '', hour12: true }, { timeZone: '', seconds: true }, { timeZone: '', extra: 1 }]) {
    assert.equal(validateClockConfig(config), false)
  }
  assert.deepEqual(migrateClockConfig({ label: 'x', timeZone: 'Asia/Shanghai', hour12: true }, 2), { timeZone: 'Asia/Shanghai' })
  assert.deepEqual(migrateClockConfig({ timeZone: '' }, 2), { timeZone: '' })
  assert.deepEqual(migrateClockConfig({ timeZone: 'Mars/Olympus' }, 2), { timeZone: '' })
  assert.deepEqual(migrateClockConfig(null, 2), { timeZone: '' })
  assert.deepEqual(migrateClockConfig({ timeZone: 'UTC' }, 3), { timeZone: 'UTC' })
})

test('clock formats minute-only time and localized date in the selected zone across midnight', () => {
  const now = Date.UTC(2026, 0, 1, 0, 5, 47)
  const config = { timeZone: 'America/Los_Angeles' }
  const formatted = formatPersonalClock(now, config, 'en-US')
  assert.equal(formatted.time, new Intl.DateTimeFormat('en-US', {
    timeZone: config.timeZone, hour: '2-digit', minute: '2-digit',
  }).format(now), 'the locale owns the hour cycle')
  assert.match(formatted.time, /PM/u)
  assert.equal(formatted.date, new Intl.DateTimeFormat('en-US', {
    timeZone: config.timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(now))
  assert.match(formatted.date, /2025/)
  assert.equal(formatPersonalClock(now, config, 'zh-CN').time,
    new Intl.DateTimeFormat('zh-CN', { timeZone: config.timeZone, hour: '2-digit', minute: '2-digit' }).format(now))
  const chinese = formatPersonalClock(now, { ...config, timeZone: 'Asia/Shanghai' }, 'zh-CN')
  assert.match(chinese.date, /2026.*1.*1/)
  assert.notEqual(chinese.date, formatted.date)
})

test('empty clock zone follows browser/system Intl default without a fixed-zone assumption', () => {
  const now = Date.UTC(2026, 5, 30, 23, 59, 50)
  const config = defaultClockConfig()
  assert.equal(formatPersonalClock(now, config, 'en-US').time,
    new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now))
  assert.deepEqual(config, defaultClockConfig())
})

test('default factories and public registry create independent instance configurations', () => {
  const registry = new HomeWidgetRegistry()
  const off = registry.register({
    typeId: '@test/personal:notes', apiVersion: 1, title: 'Notes', configVersion: 1,
    defaults: { height: 6, minHeight: 4 }, defaultConfig: defaultNotesConfig,
    validateConfig: validateNotesConfig, Content() { return null },
  })
  const a = registry.createInstance('@test/personal:notes', 'a')
  const b = registry.createInstance('@test/personal:notes', 'b')
  a.config.text = 'Only A'
  assert.equal(b.config.text, '')
  assert.equal(defaultNotesConfig().text, '')
  const draft = structuredClone(a.config)
  draft.text = 'Draft only'
  assert.equal(a.config.text, 'Only A')
  const saved = validateWidgetConfig(registry.get('@test/personal:notes'), draft)
  draft.text = 'Changed again'
  assert.equal(saved.text, 'Draft only')
  assert.equal(a.config.text, 'Only A')
  assert.throws(() => validateWidgetConfig(registry.get('@test/personal:notes'), { text: '中'.repeat(4_000) }))
  const clockA = defaultClockConfig()
  clockA.timeZone = 'UTC'
  assert.equal(defaultClockConfig().timeZone, '')
  off()
})

function fakeClock(initial = 65_123, initiallyHidden = false) {
  let now = initial
  let hidden = initiallyHidden
  let nextId = 0
  const timers = new Map()
  const listeners = new Set()
  const environment = {
    now: () => now, hidden: () => hidden,
    schedule(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id },
    cancel(id) { timers.delete(id) },
    subscribeVisibility(callback) { listeners.add(callback); return () => listeners.delete(callback) },
  }
  return {
    environment, timers, listeners,
    setHidden(value) { hidden = value; for (const listener of listeners) listener() },
    setTime(value) { now = value },
    fire() { const timer = timers.values().next().value; assert.ok(timer); timer.callback() },
  }
}

test('minute scheduler aligns boundaries and never schedules second updates', () => {
  for (const [now, expected] of [[0, 60_000], [1, 59_999], [59_999, 1], [60_000, 60_000], [-1, 1]]) {
    assert.equal(millisecondsToNextMinute(now), expected)
  }
  const clock = fakeClock()
  const ticks = []
  const stop = startMinuteClock(value => ticks.push(value), clock.environment)
  assert.deepEqual(ticks, [65_123])
  assert.equal(clock.timers.size, 1)
  assert.equal(clock.timers.values().next().value.delay, 54_877)
  clock.setTime(120_000)
  clock.fire()
  assert.deepEqual(ticks, [65_123, 120_000])
  assert.equal(clock.timers.size, 1)
  assert.equal(clock.timers.values().next().value.delay, 60_000)
  stop()
  assert.equal(clock.timers.size, 0)
  assert.equal(clock.listeners.size, 0)
})

test('clock pauses hidden tabs, resumes immediately and cancels stale callbacks on cleanup', () => {
  const clock = fakeClock(0, true)
  const ticks = []
  const stop = startMinuteClock(value => ticks.push(value), clock.environment)
  assert.equal(ticks.length, 0)
  assert.equal(clock.timers.size, 0)
  clock.setTime(155_000)
  clock.setHidden(false)
  assert.deepEqual(ticks, [155_000])
  assert.equal(clock.timers.size, 1)
  clock.setHidden(true)
  assert.equal(clock.timers.size, 0)
  clock.setTime(360_000)
  clock.setHidden(false)
  assert.deepEqual(ticks, [155_000, 360_000])
  const stale = clock.timers.values().next().value.callback
  stop()
  stop()
  stale()
  clock.setHidden(false)
  assert.deepEqual(ticks, [155_000, 360_000])
  assert.equal(clock.timers.size, 0)
  assert.equal(clock.listeners.size, 0)
})

test('personal dictionaries have matching keys and explicit date locale tags', () => {
  assert.deepEqual(Object.keys(enPersonal).sort(), Object.keys(zhPersonal).sort())
  assert.equal(zhPersonal['clock.dateLocale'], 'zh-CN')
  assert.equal(enPersonal['clock.dateLocale'], 'en-US')
  for (const dictionary of [zhPersonal, enPersonal]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.match(key, /^[a-z]+\./)
      assert.ok(value.trim())
    }
  }
})
