import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { appendRead, localDayKey, spentToday, SPENT_DAYS } from '../src/balance-history.mjs'

/** Fixed base = 2026-11-10 12:00 local; `at()` is a day offset from it. */
const BASE = new Date(2026, 10, 10, 12, 0, 0).getTime()
const at = (dayOffset, hour = 12) => new Date(2026, 10, 10 + dayOffset, hour, 0, 0).getTime()

test('the day key is the local calendar day', () => {
  assert.equal(localDayKey(at(0, 0)), '2026-11-10')
  assert.equal(localDayKey(at(0, 23)), '2026-11-10')
  assert.equal(localDayKey(at(1, 1)), '2026-11-11')
})

test('a day keeps its first and last read, and old days fall off', () => {
  let reads = []
  for (let minute = 0; minute < 12; minute++) reads = appendRead(reads, { at: BASE + minute * 60_000, total: 100 - minute, toppedUp: 128.5 })
  assert.equal(reads.length, 2, 'twelve reads in one day collapse to first + last')
  assert.equal(reads[0].total, 100)
  assert.equal(reads[1].total, 89)

  // One read per day for more days than the window: only the last SPENT_DAYS days survive.
  let many = []
  for (let day = 0; day < SPENT_DAYS + 10; day++) many = appendRead(many, { at: at(-day), total: 50, toppedUp: 50 })
  const keptDays = new Set(many.map(entry => localDayKey(entry.at)))
  assert.equal(keptDays.size, SPENT_DAYS)
  assert.ok(localDayKey(many.at(-1).at) === localDayKey(at(0)), 'the newest day stays')
  assert.ok(!keptDays.has(localDayKey(at(-SPENT_DAYS - 1))), 'the oldest day is gone')
})

test('the same instant is recorded once', () => {
  const once = appendRead([], { at: BASE, total: 10, toppedUp: 10 })
  const twice = appendRead(once, { at: BASE, total: 10, toppedUp: 10 })
  assert.equal(twice.length, 1)
})

test('today costs the drop from yesterday\'s last read', () => {
  const reads = appendRead(appendRead([], { at: at(-1, 22), total: 100, toppedUp: 128.5 }), { at: at(0, 9), total: 99.5, toppedUp: 128.5 })
  const spent = spentToday(reads, at(0, 13))
  assert.equal(spent.spent, 0.5)
  assert.equal(spent.partial, false)
  assert.equal(spent.baselineAt, at(-1, 22))
})

test('a top-up is added back, so paying in does not erase the day', () => {
  // 100 → spend 3 → top up 50 → 147 left.
  const reads = [{ at: at(-1, 22), total: 100, toppedUp: 100 },
    { at: at(0, 9), total: 97, toppedUp: 100 },
    { at: at(0, 10), total: 147, toppedUp: 150 }]
  assert.equal(spentToday(reads, at(0, 11)).spent, 3)
})

test('the first day has no baseline, and says so', () => {
  const reads = [{ at: at(0, 9), total: 100, toppedUp: 100 }, { at: at(0, 11), total: 99.25, toppedUp: 100 }]
  const spent = spentToday(reads, at(0, 12))
  assert.equal(spent.spent, 0.75)
  assert.equal(spent.partial, true)
  assert.equal(spent.baselineAt, at(0, 9))
})

test('no read today means no spend number at all', () => {
  assert.equal(spentToday([], BASE), null)
  assert.equal(spentToday([{ at: at(-1, 22), total: 100, toppedUp: 100 }], at(0, 9)), null)
})

test('a rising balance (a grant, or an unknown top-up) reads as zero, never negative', () => {
  const reads = [{ at: at(-1, 22), total: 10, toppedUp: 10 }, { at: at(0, 9), total: 20, toppedUp: 10 }]
  assert.equal(spentToday(reads, at(0, 10)).spent, 0)
})

test('reads without a topped-up split still make a difference', () => {
  const reads = [{ at: at(-1, 22), total: 10, toppedUp: null }, { at: at(0, 9), total: 8.4, toppedUp: null }]
  assert.equal(spentToday(reads, at(0, 10)).spent, 1.6)
})

test('cents are rounded, not floated', () => {
  const reads = [{ at: at(-1, 22), total: 0.3, toppedUp: 0.3 }, { at: at(0, 9), total: 0.1, toppedUp: 0.3 }]
  assert.equal(spentToday(reads, at(0, 10)).spent, 0.2)
})

test('a day of reads spans two entries even after a re-read', () => {
  const dayLong = appendRead(appendRead([], { at: at(0, 8), total: 100, toppedUp: 100 }), { at: at(0, 20), total: 99, toppedUp: 100 })
  assert.deepEqual(dayLong.map(entry => entry.total), [100, 99])
})

test('reads survive the file, and a broken file degrades to no history', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'dsh-home-balance-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const { balanceFile, loadBalanceHistory, saveBalanceHistory } = await import('../src/state.mjs')
    assert.deepEqual(loadBalanceHistory(), [], 'no file yet: no history, not an error')
    saveBalanceHistory([{ at: BASE, total: 12.5, toppedUp: 12.5 }])
    assert.deepEqual(loadBalanceHistory(), [{ at: BASE, total: 12.5, toppedUp: 12.5 }])
    // A half-written or hand-edited file must not turn into a spend number.
    writeFileSync(balanceFile(), '{"version":1,"reads":"nope"}')
    assert.deepEqual(loadBalanceHistory(), [])
    writeFileSync(balanceFile(), 'not json at all')
    assert.deepEqual(loadBalanceHistory(), [])
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    rmSync(home, { recursive: true, force: true })
  }
})
