/** node --experimental-strip-types --test test/collision-preview.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displacementDirection, previewPlacement, snapCandidate } from '../src/client/collision-preview.ts'
import { canPlace, SPATIAL_MAX_Y } from '../src/client/spatial-model.ts'

const rect = (x, y, w = 4, h = 4) => ({ x, y, w, h })
const item = (i, x, y, w = 4, h = 4, cols = 12) => ({
  i, ...rect(x, y, w, h), minW: Math.min(3, cols), minH: 3, maxW: cols,
})
const geometry = entries => entries.map(({ x, y, w, h }) => rect(x, y, w, h))
const frozen = entries => Object.freeze(entries.map(entry => Object.freeze(entry)))
function valid(entries, cols = 12) {
  for (const entry of entries) {
    assert.equal(canPlace(entries, entry.i, entry, cols), true, `${entry.i} is bounded and collision-free`)
  }
}

test('a large card covering two small cards pushes both to its bottom', () => {
  const snapshot = frozen([item('large', 0, 12, 8, 8), item('left', 0, 0), item('right', 4, 0)])
  const next = previewPlacement(snapshot, 'large', rect(0, 0, 8, 8), 12)
  assert.deepEqual(geometry(next), [rect(0, 0, 8, 8), rect(0, 8), rect(4, 8)])
  valid(next)
})

test('dragging back to origin restores the complete nonoverlapping snapshot', () => {
  const snapshot = frozen([item('large', 0, 15, 8, 8), item('left', 0, 0), item('right', 4, 0), item('gap', 8, 43)])
  const preview = previewPlacement(snapshot, 'large', rect(0, 0, 8, 8), 12)
  assert.notDeepEqual(preview, snapshot)
  assert.deepEqual(previewPlacement(snapshot, 'large', snapshot[0], 12), snapshot)
  assert.deepEqual(previewPlacement(snapshot, 'large', snapshot[0], 12), snapshot, 'repeated frames never accumulate pushes')
})

test('downward collisions recursively push only their actual chain', () => {
  const snapshot = frozen([
    item('active', 8, 0), item('a', 0, 0), item('b', 0, 4), item('c', 0, 8),
    item('side', 4, 4), item('distant', 0, 40),
  ])
  const next = previewPlacement(snapshot, 'active', rect(0, 0), 12)
  assert.deepEqual(geometry(next), [rect(0, 0), rect(0, 4), rect(0, 8), rect(0, 12), rect(4, 4), rect(0, 40)])
  assert.deepEqual(next[4], snapshot[4])
  assert.deepEqual(next[5], snapshot[5])
  valid(next)
})

test('a collision branch can join, without pushing a lower sibling ahead of an upper sibling', () => {
  // Deliberately put the lower sibling first in array order.
  const snapshot = frozen([
    item('active', 8, 0, 4, 12), item('lower', 0, 4), item('upper', 0, 0), item('other', 4, 0),
  ])
  const next = previewPlacement(snapshot, 'active', rect(0, 0, 8, 8), 12)
  assert.deepEqual(geometry(next), [rect(0, 0, 8, 8), rect(0, 12), rect(0, 8), rect(4, 8)])
  valid(next)
})

test('unequal-height branches merge without overlap or unnecessary extra movement', () => {
  const snapshot = frozen([
    item('active', 0, 30, 8), item('left', 0, 0, 4, 8), item('right', 4, 0),
    item('bridge', 0, 8, 8), item('far', 8, 50),
  ])
  const next = previewPlacement(snapshot, 'active', rect(0, 0, 8), 12)
  assert.deepEqual(geometry(next), [rect(0, 0, 8), rect(0, 4, 4, 8), rect(4, 4), rect(0, 12, 8), rect(8, 50)])
  valid(next)
})

test('moving into whitespace leaves every peer and every existing hole exactly alone', () => {
  const snapshot = frozen([item('a', 0, 0), item('b', 4, 19), item('c', 0, 90), item('d', 8, 90)])
  const next = previewPlacement(snapshot, 'a', rect(4, 50), 12)
  assert.deepEqual(next.slice(1), snapshot.slice(1))
  assert.deepEqual(geometry(next), [rect(4, 50), rect(4, 19), rect(0, 90), rect(8, 90)])
  valid(next)
})

test('touching edges are not collisions and do not trigger a push', () => {
  const snapshot = frozen([item('a', 8, 0), item('b', 0, 4), item('c', 4, 0)])
  const next = previewPlacement(snapshot, 'a', rect(0, 0), 12)
  assert.deepEqual(next.slice(1), snapshot.slice(1))
  valid(next)
})

test('previews are deterministic, preserve order and metadata, and never mutate frozen inputs', () => {
  const snapshot = frozen([
    { ...item('z', 8, 0), custom: 'keep', minH: 4 }, item('__proto__', 0, 0), item('a', 0, 4),
  ])
  const before = structuredClone(snapshot)
  const candidate = Object.freeze(rect(0, 0))
  const first = previewPlacement(snapshot, 'z', candidate, 12)
  const second = previewPlacement(snapshot, 'z', candidate, 12)
  assert.deepEqual(first, second)
  assert.notEqual(first, second)
  assert.deepEqual(snapshot, before)
  assert.deepEqual(first.map(entry => entry.i), snapshot.map(entry => entry.i))
  assert.equal(first[0].custom, 'keep')
  assert.equal(first[0].minH, 4)
  valid(first)
})

test('two-column previews push a vertical chain and restore from the same snapshot', () => {
  const snapshot = frozen([item('a', 0, 16, 2, 4, 2), item('b', 0, 0, 2, 4, 2), item('c', 0, 4, 2, 4, 2)])
  const next = previewPlacement(snapshot, 'a', rect(0, 0, 2), 2)
  assert.deepEqual(geometry(next), [rect(0, 0, 2), rect(0, 4, 2), rect(0, 8, 2)])
  assert.deepEqual(previewPlacement(snapshot, 'a', snapshot[0], 2), snapshot)
  valid(next, 2)
})

test('invalid rects, missing ids and columns return an untouched snapshot clone', () => {
  const snapshot = frozen([item('a', 0, 0), item('b', 4, 8)])
  const badRects = [
    null, [], {}, rect(-1, 0), rect(9, 0), rect(0, -1), rect(0, SPATIAL_MAX_Y + 1),
    rect(NaN, 0), rect(0, Infinity), rect(0.5, 0), rect(0, 0, 0),
    rect(0, 0, 4, 2), rect(0, 0, 4, 31), rect(0, 0, 4.5),
  ]
  for (const bad of badRects) assert.deepEqual(previewPlacement(snapshot, 'a', bad, 12), snapshot)
  for (const cols of [0, -1, 13, NaN, Infinity, 2.5]) {
    assert.deepEqual(previewPlacement(snapshot, 'a', rect(0, 0), cols), snapshot)
  }
  const missing = previewPlacement(snapshot, 'missing', rect(0, 0), 12)
  assert.deepEqual(missing, snapshot)
  assert.notEqual(missing, snapshot)
})

test('down overflow retries the complete chain upward; y=10000 itself remains legal', () => {
  const snapshot = frozen([item('a', 4, 0), item('b', 0, SPATIAL_MAX_Y)])
  const reversed = previewPlacement(snapshot, 'a', rect(0, SPATIAL_MAX_Y), 12)
  assert.deepEqual(geometry(reversed), [rect(0, SPATIAL_MAX_Y), rect(0, SPATIAL_MAX_Y - 4)])
  valid(reversed)
  const atLimit = previewPlacement(snapshot, 'a', rect(4, SPATIAL_MAX_Y), 12)
  assert.equal(atLimit[0].y, SPATIAL_MAX_Y)
  valid(atLimit)
  const chain = frozen([item('a', 4, 0), item('b', 0, 9993), item('c', 0, 9997)])
  const next = previewPlacement(chain, 'a', rect(0, 9993), 12)
  assert.deepEqual(geometry(next), [rect(0, 9993), rect(0, 9989), rect(0, 9997)])
  valid(next)
})

test('corrupt overlapping, invalid or duplicate-id snapshots are not partially repaired', () => {
  for (const snapshot of [
    [item('a', 0, 0), item('b', 0, 0)],
    [item('a', 0, 0), item('b', -1, 20)],
    [item('a', 0, 0), item('a', 4, 20)],
  ]) assert.deepEqual(previewPlacement(frozen(snapshot), 'a', rect(8, 40), 12), snapshot)
})

test('target lower/upper halves select up/down and produce opposite collision previews', () => {
  const snapshot = frozen([item('active', 8, 24), item('target', 0, 12)])
  for (const [y, direction, targetY] of [[15, 'up', 8], [13, 'down', 16], [14, 'down', 16]]) {
    const candidate = rect(0, 12)
    assert.equal(displacementDirection(snapshot, 'active', candidate, { x: 2, y }), direction)
    const next = previewPlacement(snapshot, 'active', candidate, 12, direction)
    assert.equal(next[1].y, targetY)
    valid(next)
  }
})

test('upward collisions recursively push only the actual chain and can restore the snapshot', () => {
  const snapshot = frozen([
    { ...item('active', 8, 28), custom: 'kept' }, item('a', 0, 16), item('b', 0, 12), item('c', 0, 8),
    item('side', 4, 12), item('distant', 0, 40),
  ])
  const before = structuredClone(snapshot)
  const candidate = Object.freeze(rect(0, 16))
  const next = previewPlacement(snapshot, 'active', candidate, 12, 'up')
  assert.deepEqual(geometry(next), [rect(0, 16), rect(0, 12), rect(0, 8), rect(0, 4), rect(4, 12), rect(0, 40)])
  assert.equal(next[0].custom, 'kept')
  assert.deepEqual(next, previewPlacement(snapshot, 'active', candidate, 12, 'up'))
  assert.deepEqual(previewPlacement(snapshot, 'active', snapshot[0], 12, 'up'), snapshot)
  assert.deepEqual(snapshot, before)
  valid(next)
})

test('up queue processes lower siblings first, independently of snapshot order', () => {
  const entries = [item('active', 8, 0, 4, 12), item('upper', 0, 20), item('lower', 0, 24), item('other', 4, 24)]
  for (const order of [entries, [entries[0], entries[2], entries[3], entries[1]]]) {
    const next = previewPlacement(frozen(order), 'active', rect(0, 20, 8, 8), 12, 'up')
    const byId = new Map(next.map(entry => [entry.i, entry]))
    assert.equal(byId.get('lower').y, 16)
    assert.equal(byId.get('upper').y, 12)
    assert.equal(byId.get('other').y, 16)
    assert.deepEqual(next.map(entry => entry.i), order.map(entry => entry.i))
    valid(next)
  }
})

test('upward unequal-height branches join without overlap or extra movement', () => {
  const snapshot = frozen([
    item('active', 0, 40, 8), item('left', 0, 20, 4, 8), item('right', 4, 24),
    item('bridge', 0, 16, 8), item('far', 8, 50),
  ])
  const next = previewPlacement(snapshot, 'active', rect(0, 24, 8), 12, 'up')
  assert.deepEqual(geometry(next), [rect(0, 24, 8), rect(0, 16, 4, 8), rect(4, 20), rect(0, 12, 8), rect(8, 50)])
  valid(next)
})

test('one branch hitting the top discards every upward push before running down', () => {
  const snapshot = frozen([
    item('active', 8, 20, 4, 8), item('room', 0, 6), item('blocked', 4, 0),
    item('above', 4, 4), item('below', 0, 16, 8),
  ])
  const candidate = rect(0, 6, 8)
  const next = previewPlacement(snapshot, 'active', candidate, 12, 'up')
  assert.deepEqual(next, previewPlacement(snapshot, 'active', candidate, 12, 'down'))
  assert.deepEqual(geometry(next), [rect(0, 6, 8), rect(0, 10), rect(4, 0), rect(4, 10), rect(0, 16, 8)])
  assert.equal(next[1].y, 10, 'the successful upward branch must not remain above the candidate')
  valid(next)
})

test('up can land exactly at zero; whitespace and touching edges do not compact in any direction', () => {
  const snapshot = frozen([item('active', 8, 20), item('peer', 0, 4), item('far', 4, 70)])
  const atTop = previewPlacement(snapshot, 'active', rect(0, 4), 12, 'up')
  assert.equal(atTop[1].y, 0)
  valid(atTop)
  for (const direction of ['up', 'down', 'left', 'right']) {
    const whitespace = previewPlacement(snapshot, 'active', rect(8, 40), 12, direction)
    assert.deepEqual(whitespace.slice(1), snapshot.slice(1))
    const touching = previewPlacement(snapshot, 'active', rect(0, 8), 12, direction)
    assert.deepEqual(touching.slice(1), snapshot.slice(1))
    valid(touching)
  }
})

test('direction selector excludes active and indirect peers and defaults to down without collisions', () => {
  const snapshot = frozen([item('active', 0, 4), item('target', 0, 12), item('indirect', 0, 8)])
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 4), { x: 2, y: 7 }), 'down')
  assert.equal(displacementDirection(snapshot, 'active', rect(4, 12)), 'down', 'touching is not overlap')
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 14)), 'up', 'candidate center is used without pointer')
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 12)), 'down', 'exact center chooses down')
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 12), { x: 2, y: 9 }), 'down', 'pointer outside targets still chooses the direct target')
})

test('direction selector prefers pointer-containing overlap targets, then candidate-center distance', () => {
  const snapshot = frozen([item('active', 8, 30), item('left', 0, 10), item('right', 4, 14)])
  const candidate = rect(0, 12, 8)
  assert.equal(displacementDirection(snapshot, 'active', candidate, { x: 6, y: 14.5 }), 'down')
  assert.equal(displacementDirection(snapshot, 'active', candidate, { x: 2, y: 13.5 }), 'up')
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 11, 8)), 'left', 'nearest target is left and candidate center is near its right edge')
  assert.equal(displacementDirection(snapshot, 'active', rect(0, 13, 8)), 'right', 'nearest target is right and candidate center is near its left edge')
  assert.equal(displacementDirection(snapshot, 'active', candidate), 'up', 'equal distances retain snapshot order')
  const reversed = frozen([snapshot[0], snapshot[2], snapshot[1]])
  assert.equal(displacementDirection(reversed, 'active', candidate), 'down')
  for (let index = 0; index < 5; index++) assert.equal(displacementDirection(snapshot, 'active', candidate), 'up')
})

test('direction uses dominant normalized axis, vertical ties, and pushes away from the pointer', () => {
  const snapshot = frozen([item('active', 8, 40), item('target', 0, 10, 8, 4)])
  const candidate = rect(0, 10, 8)
  for (const [pointer, expected] of [
    [{ x: 7, y: 12 }, 'left'], [{ x: 1, y: 12 }, 'right'],
    [{ x: 4, y: 13.5 }, 'up'], [{ x: 4, y: 10.5 }, 'down'],
    [{ x: 6, y: 13 }, 'up'], [{ x: 2, y: 11 }, 'down'],
    [{ x: 4, y: 12 }, 'down'], [{ x: 7, y: 13 }, 'left'],
  ]) assert.equal(displacementDirection(snapshot, 'active', candidate, pointer), expected)
})

test('left and right collisions push horizontal chains, preserving unrelated rows and gaps', () => {
  for (const direction of ['left', 'right']) {
    const snapshot = frozen([
      item('active', 0, 20, 3), item('a', 3, 0, 3), item('b', direction === 'left' ? 0 : 6, 0, 3),
      item('side', 0, 4, 3), item('far', 6, 40, 3),
    ])
    const next = previewPlacement(snapshot, 'active', rect(direction === 'left' ? 6 : 0, 0, 4), 12, direction)
    assert.deepEqual(geometry(next), [
      rect(direction === 'left' ? 6 : 0, 0, 4), rect(direction === 'left' ? 3 : 4, 0, 3),
      rect(direction === 'left' ? 0 : 7, 0, 3), rect(0, 4, 3), rect(6, 40, 3),
    ])
    assert.deepEqual(previewPlacement(snapshot, 'active', snapshot[0], 12, direction), snapshot)
    valid(next)
  }
})

test('horizontal queue processes near siblings first and lands exactly at either boundary', () => {
  for (const direction of ['left', 'right']) {
    const snapshot = frozen([
      item('active', 0, 20, 3), item('first', direction === 'left' ? 3 : 6, 0, 3),
      item('second', direction === 'left' ? 6 : 3, 0, 3), item('other', 3, 4, 3),
    ])
    const next = previewPlacement(snapshot, 'active', rect(direction === 'left' ? 6 : 0, 0, 6, 8), 12, direction)
    assert.deepEqual(geometry(next), [
      rect(direction === 'left' ? 6 : 0, 0, 6, 8), rect(direction === 'left' ? 0 : 9, 0, 3),
      rect(direction === 'left' ? 3 : 6, 0, 3), rect(direction === 'left' ? 3 : 6, 4, 3),
    ])
    valid(next)
  }
})

test('horizontal boundary fallback retries the opposite direction transactionally', () => {
  for (const direction of ['left', 'right']) {
    const x = direction === 'left' ? 0 : 8
    const snapshot = frozen([item('active', 4, 20), item('peer', x, 0)])
    const candidate = rect(x, 0)
    const opposite = direction === 'left' ? 'right' : 'left'
    const next = previewPlacement(snapshot, 'active', candidate, 12, direction)
    assert.deepEqual(next, previewPlacement(snapshot, 'active', candidate, 12, opposite))
    assert.equal(next[1].x, direction === 'left' ? 4 : 4)
    valid(next)
  }
})

test('two blocked directions return an untouched clone without cycling or partial pushes', () => {
  const horizontal = frozen([item('active', 0, 20, 12), item('peer', 4, 0)])
  for (const direction of ['left', 'right']) {
    const next = previewPlacement(horizontal, 'active', rect(0, 0, 12), 12, direction)
    assert.deepEqual(next, horizontal)
    assert.notEqual(next, horizontal)
  }
  const vertical = frozen([
    item('active', 4, 0, 4, 30),
    ...Array.from({ length: 334 }, (_, index) => item(`peer-${index}`, 0, index * 30, 4, 30)),
  ])
  for (const direction of ['up', 'down']) {
    const next = previewPlacement(vertical, 'active', rect(0, 4980, 4, 30), 12, direction)
    assert.deepEqual(next, vertical)
    assert.notEqual(next, vertical)
  }
})

test('grid rounding is the baseline, with no long-distance peer teleport', () => {
  const snapshot = frozen([item('a', 0, 0, 3), item('peer', 8, 80)])
  assert.deepEqual(snapCandidate({ x: 2.49, y: 25.49 }, 'a', snapshot, 12), rect(2, 25, 3))
  assert.deepEqual(snapCandidate({ x: 2.51, y: 25.51 }, 'a', snapshot, 12), rect(3, 26, 3))
  assert.deepEqual(snapCandidate({ x: 3.3, y: 27.7 }, 'a', snapshot, 12), rect(3, 28, 3))
})

test('0.22-cell magnets align leading/trailing edges and gap-inclusive adjacent edges on both axes', () => {
  const snapshot = frozen([item('a', 0, 0, 3), item('peer', 4, 20, 4, 8)])
  const cases = [
    [{ x: 4.22, y: 20.22 }, rect(4, 20, 3)], // left/top
    [{ x: 5.21, y: 24.21 }, rect(5, 24, 3)], // right/bottom alignment
    [{ x: 1.21, y: 16.21 }, rect(1, 16, 3)], // preceding adjacency
    [{ x: 7.79, y: 27.79 }, rect(8, 28, 3)], // following adjacency
    [{ x: 0.21, y: 0.21 }, rect(0, 0, 3)],
    [{ x: 8.79, y: 40.1 }, rect(9, 40, 3)], // container right
  ]
  for (const [raw, expected] of cases) assert.deepEqual(snapCandidate(raw, 'a', snapshot, 12), expected)
})

test('previous position holds through 0.62 cells and releases beyond it, independently per axis', () => {
  const snapshot = frozen([item('a', 0, 0), item('peer', 4, 40)])
  const previous = Object.freeze({ x: 4, y: 20 })
  for (const delta of [-0.62, -0.51, 0, 0.51, 0.62]) {
    assert.deepEqual(snapCandidate({ x: 4 + delta, y: 20 + delta }, 'a', snapshot, 12, previous), rect(4, 20))
  }
  assert.deepEqual(snapCandidate({ x: 4.621, y: 20.6 }, 'a', snapshot, 12, previous), rect(5, 20))
  assert.deepEqual(snapCandidate({ x: 3.379, y: 20.621 }, 'a', snapshot, 12, previous), rect(3, 21))
  assert.deepEqual(snapCandidate({ x: 7.8, y: 70.2 }, 'a', snapshot, 12, previous), rect(8, 70))
})

test('self is excluded and stale previous values cannot cause a distant magnetic jump', () => {
  const snapshot = frozen([item('a', 4, 40)])
  assert.deepEqual(snapCandidate({ x: 4.7, y: 40.7 }, 'a', snapshot, 12), rect(5, 41))
  assert.deepEqual(snapCandidate({ x: 1.4, y: 10.4 }, 'a', snapshot, 12, { x: 4, y: 40 }), rect(1, 10))
  assert.deepEqual(snapCandidate({ x: 1.6, y: 10.6 }, 'a', snapshot, 12, { x: NaN, y: Infinity }), rect(2, 11))
})

test('snapping retains active dimensions, bounds candidates and works with full-width cols=2', () => {
  const snapshot = frozen([item('a', 0, 0, 2, 7, 2), item('peer', 0, 20, 2, 4, 2)])
  assert.deepEqual(snapCandidate({ x: 100, y: 19.8 }, 'a', snapshot, 2), rect(0, 20, 2, 7))
  assert.deepEqual(snapCandidate({ x: -20, y: -20 }, 'a', snapshot, 2), rect(0, 0, 2, 7))
  assert.deepEqual(snapCandidate({ x: 20, y: 20000 }, 'a', snapshot, 2), rect(0, 10000, 2, 7))
  assert.deepEqual(snapCandidate({ x: NaN, y: Infinity }, 'a', snapshot, 2), rect(0, 0, 2, 7))
  assert.deepEqual(snapCandidate({ x: 0, y: 0 }, 'missing', snapshot, 2), rect(0, 0, 2, 3))
})

test('snap is pure, deterministic and ignores invalid peers and invalid previous coordinates', () => {
  const snapshot = frozen([item('a', 0, 0, 3, 7), item('bad', 90, 0), item('peer', 4, 20)])
  const before = structuredClone(snapshot)
  const raw = Object.freeze({ x: 2.7, y: 13.2 })
  const previous = Object.freeze({ x: -1, y: 2.5 })
  const first = snapCandidate(raw, 'a', snapshot, 12, previous)
  assert.deepEqual(first, rect(3, 13, 3, 7))
  assert.deepEqual(first, snapCandidate(raw, 'a', snapshot, 12, previous))
  assert.deepEqual(snapshot, before)
})

test('many deterministic candidates preserve all non-collision coordinates without overlap', () => {
  const snapshot = frozen([
    item('active', 8, 60), item('a', 0, 0), item('b', 4, 0), item('c', 0, 4, 8),
    item('d', 0, 15), item('e', 4, 25), item('far', 8, 200),
  ])
  for (let y = 0; y < 45; y++) {
    for (const x of [0, 2, 4, 8]) {
      const next = previewPlacement(snapshot, 'active', rect(x, y), 12)
      valid(next)
      assert.deepEqual(next.map(entry => entry.i), snapshot.map(entry => entry.i))
      assert.deepEqual(next.at(-1), snapshot.at(-1))
      assert.deepEqual(next, previewPlacement(snapshot, 'active', rect(x, y), 12))
      for (let index = 1; index < next.length; index++) {
        assert.equal(next[index].x, snapshot[index].x)
        assert.ok(next[index].y >= snapshot[index].y)
      }
    }
  }
})
