/** Pure external-library drag coordinates: no DOM, React, store or browser dependency. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { libraryItem, libraryPointerInside, libraryCandidate, validLibraryDrop } from '../src/client/library-drag-model.ts'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
import { multiPreviewPlacement } from '../src/client/multi-preview.ts'

function definition(defaults = {}) {
  const registry = new HomeWidgetRegistry()
  registry.register({ typeId: 'test/library:notes', apiVersion: 1, title: 'Notes', configVersion: 1,
    Content: () => null, defaultConfig: () => ({}), validateConfig: () => true, defaults })
  return registry.get('test/library:notes')
}
const item = (i, x = 0, y = 0, w = 4, h = 4) => ({ i, x, y, w, h, minW: 3, minH: 3, maxW: 12 })
const rect = ({ x, y, w, h }) => ({ x, y, w, h })

for (const [size, widths] of [['s', [4, 3, 2]], ['m', [8, 6, 2]], ['l', [12, 6, 2]]]) {
  test(`library draft ${size} dimensions follow the ordinary 12/6/2-column grid`, () => {
    const def = definition({ size, height: 7 })
    assert.deepEqual(def.sizing, { default: `${widths[0]}x8`, supported: [`${widths[0]}x8`] })
    for (const [index, cols] of [12, 6, 2].entries()) {
      const peer = Object.freeze(item('peer', 0, 9, Math.min(cols, 4), 5))
      const snapshot = Object.freeze([peer])
      const draft = libraryItem(def, 'draft', cols, snapshot)
      assert.equal(draft.i, 'draft')
      assert.deepEqual(rect(draft), { x: 0, y: 14, w: widths[index], h: 8 })
      assert.equal(draft.minW, widths[index])
      assert.equal(draft.maxW, widths[index])
      assert.equal(draft.minH, 8)
      assert.equal(draft.maxH, 8)
      assert.deepEqual(snapshot, [peer], 'draft staging never moves existing cards')
    }
  })
}

test('draft starts at origin and legacy bounds cannot widen its single projected host preset', () => {
  const def = definition({ size: 's', height: 6, minWidth: 4, maxWidth: 8, minHeight: 5, maxHeight: 9 })
  const wide = libraryItem(def, 'draft', 12, [])
  assert.deepEqual(rect(wide), { x: 0, y: 0, w: 4, h: 6 })
  assert.deepEqual({ minW: wide.minW, maxW: wide.maxW, minH: wide.minH, maxH: wide.maxH, viewportCols: wide.viewportCols },
    { minW: 4, maxW: 4, minH: 6, maxH: 6, viewportCols: 12 })
  const middle = libraryItem(def, 'draft', 6, [])
  assert.deepEqual(rect(middle), { x: 0, y: 0, w: 3, h: 6 })
  const narrow = libraryItem(def, 'draft', 2, [])
  assert.deepEqual(rect(narrow), { x: 0, y: 0, w: 2, h: 6 })
  assert.equal(narrow.minW, 2)
  assert.equal(narrow.maxW, 2)
})

test('draft staging rejects exhausted vertical space instead of emitting overlapping geometry', () => {
  const def = definition({ size: 's', height: 4 })
  assert.equal(libraryItem(def, 'draft', 12, [item('peer', 0, 9992)]).y, 9996)
  assert.throws(() => libraryItem(def, 'draft', 12, [item('peer', 0, 9993)]), /No space/)
})

test('pointer hit testing uses physical viewport bounds, excluding right/bottom edges and space outside the grid', () => {
  const grid = { left: 100, top: 200, width: 600, height: 120 }
  for (const point of [{ x: 100, y: 200 }, { x: 699.9, y: 319.9 }, { x: 400, y: 250 }]) {
    assert.equal(libraryPointerInside(point, grid), true)
  }
  for (const point of [{ x: 99, y: 200 }, { x: 700, y: 200 }, { x: 100, y: 199 }, { x: 100, y: 320 },
    { x: 400, y: 800 }, { x: NaN, y: 200 }, { x: 100, y: Infinity }]) {
    assert.equal(libraryPointerInside(point, grid), false)
  }
  assert.equal(libraryPointerInside({ x: 400, y: 1399.9 }, { ...grid, height: 1200 }), true)
  assert.equal(libraryPointerInside({ x: 400, y: 1400 }, { ...grid, height: 1200 }), false)
  for (const invalid of [{ ...grid, width: 0 }, { ...grid, height: -1 }, { ...grid, left: NaN }, { ...grid, height: Infinity }]) {
    assert.equal(libraryPointerInside({ x: 100, y: 200 }, invalid), false)
  }
})

test('draft creation rejects duplicate identities and unsupported breakpoints without touching peers', () => {
  const def = definition({ size: 's', height: 4 })
  const peer = Object.freeze(item('existing'))
  assert.throws(() => libraryItem(def, 'existing', 12, [peer]), /identity/)
  for (const cols of [0, 1, 3, 6.5, 13, NaN, Infinity]) {
    assert.throws(() => libraryItem(def, 'new', cols, [peer]), /columns/)
  }
  assert.deepEqual(peer, item('existing'))
})

test('pointer conversion subtracts grid origin and grab offset, using 12px gaps and 56px rows', () => {
  for (const cols of [12, 6, 2]) {
    const width = 708
    const active = Object.freeze(item('draft', 0, 20, Math.min(4, cols), 7))
    const snapshot = Object.freeze([active])
    const grab = { x: 27, y: 19 }
    const grid = { left: 130, top: -84 }
    const x = Math.min(2, cols - active.w)
    const point = { x: grid.left + grab.x + x * ((width + 12) / cols), y: grid.top + grab.y + 3 * 56 }
    assert.deepEqual(libraryCandidate(point, grab, grid, width, cols, active.i, snapshot, active),
      { x, y: 3, w: active.w, h: active.h })
    assert.deepEqual(snapshot, [active])
  }
})

test('candidate holds jitter until release threshold then advances, while retaining draft dimensions', () => {
  const active = item('draft', 2, 3, 4, 7)
  const candidate = (x, y, previous = active) => libraryCandidate({ x: x * 60, y: y * 56 },
    { x: 0, y: 0 }, { left: 0, top: 0 }, 708, 12, 'draft', [active], previous)
  assert.deepEqual(candidate(2.62, 3.62), { x: 2, y: 3, w: 4, h: 7 })
  assert.deepEqual(candidate(2.63, 3.63), { x: 3, y: 4, w: 4, h: 7 })
  assert.deepEqual(candidate(-100, -100), { x: 0, y: 0, w: 4, h: 7 })
  assert.deepEqual(candidate(1000, 20000), { x: 8, y: 10000, w: 4, h: 7 })
  assert.deepEqual(candidate(NaN, Infinity), { x: 2, y: 3, w: 4, h: 7 })
})

test('accepted drop requires the exact active rectangle and no overlap; a displaced-peer solver preview qualifies', () => {
  const snapshot = [item('peer'), item('draft', 0, 10)]
  const saved = structuredClone(snapshot)
  const candidate = { x: 0, y: 0, w: 4, h: 4 }
  assert.equal(validLibraryDrop(snapshot, 'draft', candidate, 12), false)
  const preview = multiPreviewPlacement(snapshot, 'draft', candidate, 12)
  assert.equal(validLibraryDrop(preview, 'draft', candidate, 12), true)
  assert.equal(validLibraryDrop(preview, 'missing', candidate, 12), false)
  assert.equal(validLibraryDrop([item('draft')], 'draft', { ...candidate, x: 9 }, 12), false)
  assert.equal(validLibraryDrop([item('draft'), item('peer', 0, 0)], 'draft', candidate, 12), false)
  assert.deepEqual(snapshot, saved)
})

test('drop validity rejects active/candidate size mismatches, not just matching top-left coordinates', () => {
  const active = item('draft')
  assert.equal(validLibraryDrop([active], 'draft', { ...rect(active), w: 3 }, 12), false)
  assert.equal(validLibraryDrop([active], 'draft', { ...rect(active), h: 3 }, 12), false)
})
