import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildActivity, validateActivityQuery } from '../src/activity.mjs'
import { foldSession } from '../src/ledger.mjs'
import { activityChartHeight, activityWeeks, activityYearWidth, activityLevel, shiftCalendarDay, validateActivityConfig, ACTIVITY_NATURAL_CELL, ACTIVITY_MIN_CELL, ACTIVITY_MAX_CELL } from '../src/client/activity-model.ts'
const now = Date.parse('2026-11-04T18:00:00Z')
const user = time => ({ type: 'user/message', time: Date.parse(time), data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'hello' }] } })
function session(id, events, extra = {}) { return foldSession({ id, createdAt: now - 86400000, cwd: '/project', ...extra }, events, now) }
test('human messages retain UTC minute counts; automatic turns are not work footprints', () => {
  const s = session('a', [user('2026-11-04T01:00:00Z'), user('2026-11-04T01:00:20Z'),
    { type: 'turn/start', time: now - 1000, data: {} },
    { ...user('2026-11-04T02:00:00Z'), data: { source: { kind: 'system' }, content: [] } }])
  assert.deepEqual(Object.values(s.humanMinutes), [2])
  assert.equal(s.turns, 1)
})
test('year aggregation uses browser zone, excludes subagents, and day click matches exact project', () => {
  const state = { scannedAt: now, sessions: {
    a: session('a', [user('2026-11-04T01:00:00Z')]),
    b: session('b', [user('2026-11-04T10:00:00Z')], { cwd: '/other' }),
    c: session('c', [user('2026-11-04T10:00:00Z')], { parentSession: 'a', origin: 'subagent' }),
  } }
  const all = buildActivity(state, { timeZone: 'America/Los_Angeles', date: '2026-11-03' }, { now })
  assert.equal(all.days.length, 365)
  assert.equal(all.complete, true)
  assert.deepEqual(all.days.find(d => d.key === '2026-11-03'), { key: '2026-11-03', messages: 1, sessions: 1 })
  assert.deepEqual(all.sessions.map(s => s.id), ['a'])
  const filtered = buildActivity(state, { timeZone: 'UTC', cwd: '/project', date: '2026-11-04' }, { now })
  assert.equal(filtered.days.at(-1).messages, 1)
  assert.deepEqual(filtered.sessions.map(s => s.id), ['a'])
  assert.deepEqual(filtered.workspaces, ['/other', '/project'])
})
test('half-hour and DST browser zones attribute human events by calendar not fixed days', () => {
  const s = session('a', [user('2026-11-01T08:30:00Z'), user('2026-11-01T09:30:00Z'), user('2026-11-03T19:00:00Z')])
  const state = { sessions: { a: s }, scannedAt: now }
  const la = buildActivity(state, { timeZone: 'America/Los_Angeles' }, { now })
  assert.equal(la.days.find(d => d.key === '2026-11-01').messages, 2)
  const india = buildActivity(state, { timeZone: 'Asia/Kolkata' }, { now })
  assert.equal(india.days.find(d => d.key === '2026-11-04').messages, 1)
})
test('unindexed, failed and unavailable history never claims complete zero days', () => {
  for (const [state, options] of [ [{ sessions: {} }, {}], [{ scannedAt: now, sessions: {}, scanning: true }, {}],
    [{ scannedAt: now, sessions: { failed: { failed: true } } }, {}], [{ scannedAt: now, sessions: {} }, { available: false }],
    [{ scannedAt: now, sessions: {} }, { scanError: true }]]) {
    assert.equal(buildActivity(state, {}, { now, ...options }).complete, false)
  }
})
test('query rejects invalid time zones, dates and unbounded directories', () => {
  for (const input of [{ timeZone: 'not/a/zone' }, { timeZone: 1 }, { date: '2026-02-30' },
    { date: '2026-99-99' }, { date: '2026-00-00' }, { date: '2026-13-01' }, { date: '2026-01-32' },
    { date: '2025-02-29' }, { date: 'x' }, { cwd: 'a'.repeat(4097) }]) {
    assert.throws(() => validateActivityQuery(input), error => error.code === 'bad-activity-query' && /Invalid activity/.test(error.message))
  }
  assert.equal(validateActivityQuery({ date: '2024-02-29' }).date, '2024-02-29')
})
test('auto adds natural full weeks monotonically, fitting intermediate windows before the year cap', () => {
  for (const year of [2024, 2025, 2026]) for (let day = 1; day <= 14; day++) {
    const today = `${year}-01-${String(day).padStart(2, '0')}`
    let previous = 0
    for (let width = 180; width <= 1100; width++) {
      const grid = activityWeeks([], today, width, 'auto')
      assert.ok(grid.count >= previous && (previous === 0 || grid.count - previous <= 7))
      assert.ok(grid.chartWidth + 6 <= width + 0.0001)
      assert.ok(grid.cellSize >= ACTIVITY_MIN_CELL && grid.cellSize <= ACTIVITY_MAX_CELL)
      assert.equal(grid.weeks.flat().filter(Boolean).length, grid.count)
      if (grid.count < 365) assert.equal(new Date(`${grid.first}T12:00:00Z`).getUTCDay(), 1)
      previous = grid.count
    }
    const full = activityWeeks([], today, activityYearWidth(today, ACTIVITY_NATURAL_CELL), 'auto')
    assert.equal(full.count, 365)
    const natural = activityWeeks([], today, 766, 'auto')
    assert.ok(natural.count > 84 && natural.count < 365)
    const explicitYear = activityWeeks([], today, 200, 'year')
    assert.equal(explicitYear.count, 365)
    assert.equal(explicitYear.cellSize, ACTIVITY_MIN_CELL)
    assert.equal(explicitYear.chartWidth + 6, activityYearWidth(today))
    assert.ok(explicitYear.chartWidth > 200, 'explicit year keeps local scrolling rather than shrinking cells')
  }
})
test('quarter uses three chronological 28-day blocks with exact boundaries and Monday weekday padding', () => {
  for (let day = 1; day <= 14; day++) {
    const today = `2026-11-${String(day).padStart(2, '0')}`
    const grid = activityWeeks([], today, 766, 'quarter')
    assert.equal(grid.count, 84)
    assert.equal(grid.blocks.length, 3)
    assert.ok(grid.cellSize >= 23 && grid.cellSize <= ACTIVITY_MAX_CELL)
    assert.ok(grid.chartWidth > 0.75 * 766 && grid.chartWidth + 6 <= 766)
    const keys = []
    for (const block of grid.blocks) {
      const entries = block.weeks.flat().filter(Boolean)
      assert.equal(entries.length, 28)
      assert.equal(entries[0].key, block.first)
      assert.equal(entries.at(-1).key, block.last)
      for (const week of block.weeks) week.forEach((entry, i) => {
        if (entry) assert.equal((new Date(`${entry.key}T12:00:00Z`).getUTCDay() + 6) % 7, i)
      })
      keys.push(...entries.map(entry => entry.key))
    }
    assert.equal(new Set(keys).size, 84)
    assert.deepEqual(keys, Array.from({ length: 84 }, (_, i) => shiftCalendarDay(today, i - 83)))
    const narrow = activityWeeks([], today, 300, 'quarter')
    assert.equal(narrow.blocks.length, 0)
    assert.equal(narrow.weeks.flat().filter(Boolean).length, 84)
    assert.ok(narrow.chartWidth + 6 <= 300)
  }
})
test('chart height bounds keep cells square and the grid inside the measured box', () => {
  for (const range of ['auto', 'quarter', 'year']) for (const width of [300, 540, 766, 1200]) {
    const wide = activityWeeks([], '2026-11-04', width, range)
    for (const height of [150, 194, 300, 420]) {
      const bounded = activityWeeks([], '2026-11-04', width, range, height)
      // Explicit ranges stay exact. Auto may add weeks when the height cap shrinks
      // cells, so it fills the width instead of leaving a blank tail; never > 365.
      if (range === 'auto') { assert.ok(bounded.count >= wide.count); assert.ok(bounded.count <= 365) }
      else assert.equal(bounded.count, wide.count)
      assert.ok(bounded.cellSize <= wide.cellSize)
      assert.ok(bounded.cellSize >= ACTIVITY_MIN_CELL)
      assert.ok(activityChartHeight(bounded) <= height + 0.5, `${range} ${width}x${height}: ${activityChartHeight(bounded)} fits`)
      // Auto never overflows horizontally: weeks still fit the available width.
      if (range === 'auto') assert.ok(bounded.chartWidth <= width - 6 + 0.5, `auto ${width}: ${bounded.chartWidth}`)
    }
  }
  assert.equal(activityWeeks([], '2026-11-04', 766, 'quarter', 80).cellSize, ACTIVITY_MIN_CELL)
})
test('calendar retains leap days, exact explicit ranges and values without mutating or inventing counts', () => {
  assert.equal(shiftCalendarDay('2024-02-28', 1), '2024-02-29')
  assert.equal(shiftCalendarDay('2026-11-01', 1), '2026-11-02')
  const recorded = { key: '2026-11-04', messages: 7, sessions: 2 }
  const input = [recorded]
  for (const [width, range, count] of [[300,'auto',101],[640,'auto',227],[820,'auto',297],[300,'year',365],[820,'quarter',84]]) {
    const grid = activityWeeks(input, '2026-11-04', width, range)
    assert.equal(grid.count, count)
    assert.equal(grid.weeks.flat().filter(Boolean).length, count)
    assert.ok(grid.weeks.every(w => w.length === 7))
    assert.equal(grid.weeks.flat().find(day => day?.key === recorded.key), recorded)
    assert.equal(grid.weeks.flat().filter(Boolean).reduce((sum, day) => sum + day.messages, 0), 7)
  }
  assert.deepEqual(input, [recorded])
  for (const width of [0, -1, NaN, Infinity]) {
    const grid = activityWeeks([], '2026-11-04', width, 'auto')
    assert.ok(grid.count > 0 && Number.isFinite(grid.chartWidth))
  }
  assert.deepEqual([0,1,2,3,5,6,10,11].map(activityLevel), [0,1,1,2,2,3,3,4])
  assert.equal(validateActivityConfig({ cwd: '', range: 'auto' }), true)
  assert.equal(validateActivityConfig({ cwd: '', range: 'bogus' }), false)
})
