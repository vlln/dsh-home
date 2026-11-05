/** node --experimental-strip-types --test test/hover-intent.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceHover, HOVER_DWELL_MS } from '../src/client/hover-intent.ts'

const rect = (x = 0, y = 0, w = 4, h = 4) => ({ x, y, w, h })

test('entering a collision starts a 500ms dwell rather than confirming a pass-through', () => {
  assert.equal(HOVER_DWELL_MS, 500)
  const first = advanceHover(null, rect(), true, 100)
  assert.deepEqual(first, {
    intent: { key: '0,0,4,4', since: 100, confirmed: false },
    ready: false,
    remaining: 500,
  })
  const passing = advanceHover(first.intent, rect(), true, 300)
  assert.equal(passing.ready, false)
  assert.equal(passing.intent.confirmed, false)
  assert.equal(passing.remaining, 300)
  assert.deepEqual(advanceHover(passing.intent, rect(), false, 301), {
    intent: null, ready: true, remaining: 0,
  })
})

test('499ms is unconfirmed, exactly 500ms confirms, and later frames stay ready', () => {
  const first = advanceHover(null, rect(), true, 500)
  const before = advanceHover(first.intent, rect(), true, 999)
  assert.deepEqual(before, { intent: first.intent, ready: false, remaining: 1 })
  const boundary = advanceHover(before.intent, rect(), true, 1000)
  assert.deepEqual(boundary, {
    intent: { key: '0,0,4,4', since: 500, confirmed: true },
    ready: true,
    remaining: 0,
  })
  assert.deepEqual(advanceHover(boundary.intent, rect(), true, 2001), boundary)
  assert.deepEqual(advanceHover(boundary.intent, rect(), true, 10000), boundary)
})

test('small pointer movements with the same snapped cell never restart dwell', () => {
  // The caller supplies grid geometry, not raw pointer coordinates; fresh rect objects
  // from nearby mouse positions still represent the same cell.
  const first = advanceHover(null, rect(4, 8), true, 1000)
  let state = first
  for (const now of [1001, 1050, 1200, 1400, 1499]) {
    state = advanceHover(state.intent, { ...rect(4, 8) }, true, now)
    assert.equal(state.intent.since, 1000)
    assert.equal(state.ready, false)
    assert.equal(state.remaining, 1500 - now)
  }
  assert.equal(advanceHover(state.intent, rect(4, 8), true, 1500).ready, true)
})

test('changing any rect field resets dwell and returning to a prior cell starts anew', () => {
  const origin = rect(1, 2, 3, 4)
  const confirmed = advanceHover(advanceHover(null, origin, true, 0).intent, origin, true, 1500)
  for (const field of ['x', 'y', 'w', 'h']) {
    const nextRect = { ...origin, [field]: origin[field] + 1 }
    const moved = advanceHover(confirmed.intent, nextRect, true, 2000)
    assert.equal(moved.ready, false)
    assert.equal(moved.remaining, 500)
    assert.equal(moved.intent.since, 2000)
    assert.equal(moved.intent.confirmed, false)
    assert.notEqual(moved.intent.key, confirmed.intent.key)
    const returned = advanceHover(moved.intent, origin, true, 2100)
    assert.deepEqual(returned, {
      intent: { key: '1,2,3,4', since: 2100, confirmed: false },
      ready: false,
      remaining: 500,
    })
    assert.equal(advanceHover(returned.intent, origin, true, 2599).ready, false)
    assert.equal(advanceHover(returned.intent, origin, true, 2600).ready, true)
  }
})

test('no collision passes immediately and cancels both pending and confirmed intent', () => {
  const pending = advanceHover(null, rect(), true, 0).intent
  const confirmed = advanceHover(pending, rect(), true, 1500).intent
  for (const previous of [null, pending, confirmed]) {
    const cleared = advanceHover(previous, rect(), false, 2000)
    assert.deepEqual(cleared, { intent: null, ready: true, remaining: 0 })
    const returned = advanceHover(cleared.intent, rect(), true, 2001)
    assert.equal(returned.intent.since, 2001)
    assert.equal(returned.ready, false)
    assert.equal(returned.remaining, 500)
  }
})

test('invalid clock samples never accidentally confirm a collision', () => {
  const pending = advanceHover(null, rect(), true, 100).intent
  const confirmed = advanceHover(pending, rect(), true, 1600).intent
  for (const now of [NaN, Infinity, -Infinity, -1, undefined, null, '1600']) {
    for (const previous of [null, pending, confirmed]) {
      const invalid = advanceHover(previous, rect(), true, now)
      assert.deepEqual(invalid, { intent: null, ready: false, remaining: 500 })
      const recovered = advanceHover(invalid.intent, rect(), true, 2000)
      assert.equal(recovered.intent.since, 2000)
      assert.equal(recovered.ready, false)
    }
    assert.deepEqual(advanceHover(pending, rect(), false, now), {
      intent: null, ready: true, remaining: 0,
    })
  }
})

test('backward clocks and invalid prior timestamps restart the dwell safely', () => {
  const pending = advanceHover(null, rect(), true, 1000).intent
  const confirmed = advanceHover(pending, rect(), true, 2500).intent
  for (const previous of [pending, confirmed,
    ...[NaN, Infinity, -Infinity, -1].map(since => ({ ...pending, since }))]) {
    const restarted = advanceHover(previous, rect(), true, 900)
    assert.deepEqual(restarted, {
      intent: { key: '0,0,4,4', since: 900, confirmed: false },
      ready: false,
      remaining: 500,
    })
  }
})

test('advancing is deterministic and never mutates the previous state or candidate', () => {
  const candidate = Object.freeze(rect())
  const previous = Object.freeze({ key: '0,0,4,4', since: 100, confirmed: false })
  const expected = {
    intent: { key: '0,0,4,4', since: 100, confirmed: true }, ready: true, remaining: 0,
  }
  assert.deepEqual(advanceHover(previous, candidate, true, 1600), expected)
  assert.deepEqual(advanceHover(previous, candidate, true, 1600), expected)
  assert.deepEqual(previous, { key: '0,0,4,4', since: 100, confirmed: false })
  assert.deepEqual(candidate, rect())
})
