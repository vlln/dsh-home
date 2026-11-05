import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildActivity, validateActivityQuery } from '../src/activity.mjs'
import { foldSession } from '../src/ledger.mjs'
import { activityWeeks, activityLevel, shiftCalendarDay, validateActivityConfig } from '../src/client/activity-model.ts'
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
test('calendar windows retain Monday rows, leap days, compact auto and explicit scrollable year', () => {
  assert.equal(shiftCalendarDay('2024-02-28', 1), '2024-02-29')
  assert.equal(shiftCalendarDay('2026-11-01', 1), '2026-11-02')
  for (const [width, range, count] of [[300,'auto',84],[800,'auto',365],[300,'year',365],[800,'quarter',84]]) {
    const grid = activityWeeks([], '2026-11-04', width, range)
    assert.equal(grid.count, count)
    assert.equal(grid.weeks.flat().filter(Boolean).length, count)
    assert.ok(grid.weeks.every(w => w.length === 7))
  }
  assert.deepEqual([0,1,2,3,5,6,10,11].map(activityLevel), [0,1,1,2,2,3,3,4])
  assert.equal(validateActivityConfig({ cwd: '', range: 'auto' }), true)
  assert.equal(validateActivityConfig({ cwd: '', range: 'bogus' }), false)
})
