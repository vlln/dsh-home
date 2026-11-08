/** The angle → segment mapping is the part of Donut that can be wrong silently. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { segmentAtPoint } from '../src/client/ui/ring.ts'

const ring = [{ key: 'input', value: 50 }, { key: 'cache', value: 30 }, { key: 'output', value: 20 }]

test('a point maps to the segment whose share contains its angle', () => {
  // Shares are 50/30/20, so the boundaries sit at 0.5 and 0.8 of the turn:
  // top = 0 (input), right = 0.25 (input), bottom = 0.5 (cache), left = 0.75 (cache).
  assert.equal(segmentAtPoint(ring, 0, -10), 'input')
  assert.equal(segmentAtPoint(ring, 10, 0), 'input')
  // Exactly at a boundary the earlier segment wins, so the bottom edge is input.
  assert.equal(segmentAtPoint(ring, 0, 10), 'input')
  assert.equal(segmentAtPoint(ring, -7, 7), 'cache')
  assert.equal(segmentAtPoint(ring, -7, -7), 'output')
  assert.equal(segmentAtPoint(ring, -10, 0), 'cache')
})

test('an empty ring maps to nothing instead of guessing', () => {
  assert.equal(segmentAtPoint([{ key: 'a', value: 0 }], 0, -10), null)
  assert.equal(segmentAtPoint([], 0, -10), null)
})

test('a zero-value segment can never win the hit test', () => {
  const withZero = [{ key: 'a', value: 100 }, { key: 'b', value: 0 }]
  for (let step = 0; step < 24; step += 1) {
    const angle = (step / 24) * 2 * Math.PI
    assert.equal(segmentAtPoint(withZero, Math.sin(angle) * 10, -Math.cos(angle) * 10), 'a')
  }
})
