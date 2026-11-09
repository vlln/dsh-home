/** node --experimental-strip-types --test test/spatial-model.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  buildSpatialLayout, canPlace, defaultSpatialHeight, findSpatialSpace,
  mergeSpatialPositions, moveSpatialItem, sizeFromRect, widthFromSize,
  SPATIAL_MAX_H, SPATIAL_MAX_Y, SPATIAL_ROW_HEIGHT, SPATIAL_GAP,
} from '../src/client/spatial-model.ts'
import { homeOrder } from '../src/client/layout-model.ts'

const DEFAULT = ['recent', 'tasks', 'resume', 'queue', 'today', 'running', 'areas', 'rhythm', 'quick']
const metas = (ids = DEFAULT, defaultSize = 's') => ids.map(id => ({ id, defaultSize }))
const layout = (overrides = {}) => ({ order: [], focusOrder: [], size: {}, hidden: [], ...overrides })
const rect = (x, y, w = 4, h = 4) => ({ x, y, w, h })
const getRect = ({ x, y, w, h }) => ({ x, y, w, h })
const item = (i, x, y, w = 4, h = 4, cols = 12) => ({
  i, ...rect(x, y, w, h), minW: Math.min(3, cols), minH: 3, maxW: cols,
})

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function assertValid(geometry, cols) {
  for (const entry of geometry) {
    assert.equal(canPlace(geometry, entry.i, entry, cols), true, `${entry.i} is collision-free and bounded`)
    assert.equal(entry.minW, Math.min(3, cols))
    assert.equal(entry.minH, 3)
    assert.equal(entry.maxW, cols)
  }
}

test('saved whitespace and exact legal rectangles survive repeated projection and JSON reload', () => {
  const saved = deepFreeze(layout({
    order: ['queue', 'tasks', 'recent'],
    size: { tasks: 'l' },
    positions: { 12: { queue: rect(8, 19), tasks: rect(0, 43, 8, 8), recent: rect(0, 0, 4, 7) } },
  }))
  const before = structuredClone(saved)
  const geometry = buildSpatialLayout(saved, metas(['recent', 'tasks', 'queue']), 12)
  assert.deepEqual(geometry.map(entry => entry.i), ['queue', 'tasks', 'recent'])
  for (const entry of geometry) assert.deepEqual(getRect(entry), saved.positions['12'][entry.i])
  assert.deepEqual(buildSpatialLayout(JSON.parse(JSON.stringify(saved)), metas(['recent', 'tasks', 'queue']), 12), geometry)
  assert.deepEqual(saved, before)
  assertValid(geometry, 12)
})

test('keyboard moves preserve empty space, block collision and boundaries, never push neighbors', () => {
  const geometry = deepFreeze([item('a', 0, 0), item('b', 4, 0)])
  assert.equal(canPlace(geometry, 'a', rect(1, 0), 12), false)
  assert.equal(canPlace(geometry, 'a', rect(0, 4), 12), true)
  assert.equal(canPlace(geometry, 'a', rect(0, 0), 12), true)
  assert.equal(moveSpatialItem(geometry, 'a', 1, 0), geometry)
  assert.equal(moveSpatialItem(geometry, 'a', -1, 0), geometry)
  assert.equal(moveSpatialItem(geometry, 'b', 5, 0), geometry)
  assert.equal(moveSpatialItem(geometry, 'a', 0, -1), geometry)
  const moved = moveSpatialItem(geometry, 'a', 0, 20)
  assert.notEqual(moved, geometry)
  assert.deepEqual(getRect(moved[0]), rect(0, 20))
  assert.equal(moved[1], geometry[1])
  assert.deepEqual(getRect(geometry[0]), rect(0, 0))
  assert.equal(moveSpatialItem(geometry, 'missing', 1, 0), geometry)
  assert.equal(moveSpatialItem(geometry, 'a', 0, 0), geometry)
  for (const delta of [NaN, Infinity, 0.5, -0.5]) assert.equal(moveSpatialItem(geometry, 'a', delta, 0), geometry)
})

test('legacy sizes map to responsive widths and card-specific row heights', () => {
  assert.equal(SPATIAL_ROW_HEIGHT, 44)
  assert.equal(SPATIAL_GAP, 12)
  for (const [cols, expected] of [[12, [4, 8, 12]], [6, [3, 6, 6]], [2, [2, 2, 2]]]) {
    assert.deepEqual(['s', 'm', 'l'].map(size => widthFromSize(size, cols)), expected)
    const saved = layout({ size: { recent: 'l', tasks: 'm', resume: 's' } })
    const geometry = buildSpatialLayout(saved, metas(['recent', 'tasks', 'resume']), cols)
    assert.deepEqual(geometry.map(entry => entry.w), [expected[2], expected[1], expected[0]])
    assert.deepEqual(geometry.map(entry => entry.h), [7, 8, 4])
    assertValid(geometry, cols)
  }
  for (const id of ['resume', 'queue', 'today', 'external:weather']) assert.equal(defaultSpatialHeight(id), 4)
  assert.equal(sizeFromRect({ w: 4 }, 12), 's')
  assert.equal(sizeFromRect({ w: 8 }, 12), 'm')
  assert.equal(sizeFromRect({ w: 12 }, 12), 'l')
  assert.equal(sizeFromRect({ w: 3 }, 6), 's')
  assert.equal(sizeFromRect({ w: 6 }, 6), 'm')
  assert.equal(sizeFromRect({ w: 2 }, 2), 's')
})

test('old split order migrates through homeOrder and first-fit fills real holes', () => {
  const saved = layout({ order: ['quick', 'tasks', 'recent'], focusOrder: ['today', 'queue', 'resume'] })
  const geometry = buildSpatialLayout(saved, metas(), 12)
  assert.deepEqual(geometry.map(entry => entry.i), homeOrder(saved, DEFAULT))
  // tasks/recent are 8/7 rows; the short focus card leaves a real four-column slot underneath.
  assert.deepEqual(getRect(geometry[0]), rect(0, 0, 4, 8))
  assert.deepEqual(getRect(geometry[1]), rect(4, 0, 4, 7))
  assert.deepEqual(getRect(geometry[2]), rect(8, 0))
  assert.deepEqual(getRect(geometry[3]), rect(8, 4))
  assertValid(geometry, 12)
  assert.equal(saved.positions, undefined, 'migration is read-only until explicitly saved')
})

test('defaultSize applies when a card has no size override and duplicate metadata keeps first', () => {
  const geometry = buildSpatialLayout(layout(), [
    { id: 'a', defaultSize: 'm' }, { id: 'a', defaultSize: 'l' }, { id: 'b', defaultSize: 'l' },
  ], 12)
  assert.deepEqual(geometry.map(entry => [entry.i, entry.w]), [['a', 8], ['b', 12]])
  assert.deepEqual(buildSpatialLayout(layout(), [], 12), [])
})

test('all legal saved rectangles reserve their space before unsaved or invalid preceding cards', () => {
  const saved = layout({ positions: { 12: { a: rect(-10, 0), b: rect(0, 0), c: rect(4, 0) } } })
  const geometry = buildSpatialLayout(saved, metas(['a', 'b', 'c', 'd']), 12)
  assert.deepEqual(getRect(geometry[1]), saved.positions['12'].b)
  assert.deepEqual(getRect(geometry[2]), saved.positions['12'].c)
  assert.deepEqual(getRect(geometry[0]), rect(8, 0))
  assert.deepEqual(getRect(geometry[3]), rect(0, 4))
  assertValid(geometry, 12)
})

test('conflicting corrupt saved data relocates only the later conflicting card', () => {
  const saved = deepFreeze(layout({ positions: { 12: { a: rect(0, 6), b: rect(0, 6), c: rect(8, 6) } } }))
  const geometry = buildSpatialLayout(saved, metas(['a', 'b', 'c']), 12)
  assert.deepEqual(getRect(geometry[0]), saved.positions['12'].a)
  assert.deepEqual(getRect(geometry[2]), saved.positions['12'].c)
  assert.deepEqual(getRect(geometry[1]), rect(0, 0))
  assertValid(geometry, 12)
})

test('hidden cards do not occupy space, keep saved positions and restore in a free slot on conflict', () => {
  const saved = deepFreeze(layout({
    hidden: ['external:hidden'],
    positions: { 12: { a: rect(0, 0), 'external:hidden': rect(0, 0), b: rect(4, 14) } },
  }))
  const registered = metas(['a', 'external:hidden', 'b'])
  const visible = buildSpatialLayout(saved, registered, 12)
  assert.deepEqual(visible.map(entry => entry.i), ['a', 'b'])
  assert.deepEqual(getRect(visible[1]), rect(4, 14))
  const merged = mergeSpatialPositions(saved, visible, 12)
  assert.deepEqual(merged.positions['12']['external:hidden'], rect(0, 0))
  const restored = buildSpatialLayout({ ...merged, hidden: [] }, registered, 12)
  assert.deepEqual(getRect(restored[0]), rect(0, 0))
  assert.deepEqual(getRect(restored[1]), rect(4, 0))
  assert.deepEqual(getRect(restored[2]), rect(4, 14))
  assertValid(restored, 12)
})

test('restore helper can relocate an earlier ordered hidden card without disturbing existing cards', () => {
  // The store knows which card is being restored; the stateless projection cannot infer this history.
  const geometry = deepFreeze([item('existing', 0, 0), item('other', 4, 9)])
  const free = findSpatialSpace(geometry, rect(0, 0), 12)
  assert.deepEqual(free, rect(4, 0))
  const saved = layout({
    positions: { 12: { restored: free, existing: rect(0, 0), other: rect(4, 9) } },
  })
  const next = buildSpatialLayout(saved, metas(['restored', 'existing', 'other']), 12)
  assert.deepEqual(getRect(next[1]), getRect(geometry[0]))
  assert.deepEqual(getRect(next[2]), getRect(geometry[1]))
  assertValid(next, 12)
})

test('a canvas breakpoint with no saved rows reads the nearest saved one verbatim', () => {
  const saved = deepFreeze(layout({ positions: { 12: { a: rect(0, 12, 8, 6), b: rect(8, 12, 4, 6) } } }))
  const at12 = buildSpatialLayout(saved, metas(['a', 'b']), 12)
  for (const cols of [13, 14, 16, 20, 24, 32]) {
    const geometry = buildSpatialLayout(saved, metas(['a', 'b']), cols)
    assert.deepEqual(geometry.map(getRect), at12.map(getRect), `cols ${cols} reuses the 12-column rectangles`)
    assert.equal(geometry[0].w, 8, 'columns are never scaled')
    assert.equal(geometry[0].viewportCols, cols)
  }
  const two = layout({ positions: { 12: { a: rect(0, 0, 8, 6) }, 16: { a: rect(12, 0, 4, 6) } } })
  assert.deepEqual(getRect(buildSpatialLayout(two, metas(['a']), 16)[0]), rect(12, 0, 4, 6), 'exact key wins')
  assert.deepEqual(getRect(buildSpatialLayout(two, metas(['a']), 20)[0]), rect(12, 0, 4, 6), 'largest key <= cols')
  assert.deepEqual(getRect(buildSpatialLayout(two, metas(['a']), 13)[0]), rect(0, 0, 8, 6), 'largest key <= cols can be legacy 12')
  assert.deepEqual(getRect(buildSpatialLayout(two, metas(['a']), 32)[0]), rect(12, 0, 4, 6), 'largest stored key wins over the lower bound')
  // No key at or below cols: fall back to the smallest existing one above.
  const above = layout({ positions: { 24: { a: rect(0, 40, 4, 4) } } })
  assert.deepEqual(getRect(buildSpatialLayout(above, metas(['a']), 13)[0]), rect(0, 40, 4, 4))
})

test('a saved rectangle that no longer fits the current columns is relocated, never dropped', () => {
  const saved = layout({ positions: { 16: { a: rect(12, 0, 4, 4) } } })
  assert.deepEqual(getRect(buildSpatialLayout(saved, metas(['a']), 16)[0]), rect(12, 0, 4, 4))
  const narrow = buildSpatialLayout(saved, metas(['a']), 13)
  assert.equal(narrow.length, 1)
  assert.deepEqual(getRect(narrow[0]), rect(0, 0, 4, 4))
})

test('32-column canvases accept full-width geometry and write only the active key', () => {
  const saved = deepFreeze(layout({ positions: { 32: { a: rect(28, 0, 4, 4) } } }))
  const geometry = buildSpatialLayout(saved, metas(['a']), 32)
  assert.deepEqual(getRect(geometry[0]), rect(28, 0, 4, 4))
  assert.equal(geometry[0].viewportCols, 32)
  assertValid(geometry, 32)
  const moved = moveSpatialItem(geometry, 'a', -1, 0)
  assert.deepEqual(getRect(moved[0]), rect(27, 0, 4, 4))
  assert.equal(moveSpatialItem(geometry, 'a', 1, 0), geometry, 'cannot leave the 32-column board')
  const merged = mergeSpatialPositions(saved, moved, 32)
  assert.deepEqual(merged.positions['32'].a, rect(27, 0, 4, 4))
  assert.equal(saved.positions['12'], undefined, 'a wide board does not materialize a legacy key')
})

test('breakpoints use independent saved rectangles and saving 6 never rewrites 12 or 2', () => {
  const saved = deepFreeze(layout({ positions: {
    12: { a: rect(8, 30), 'external:absent': rect(0, 70) },
    6: { a: rect(3, 2, 3) },
    2: { a: rect(0, 100, 2) },
  } }))
  for (const cols of [12, 6, 2]) {
    const geometry = buildSpatialLayout(saved, metas(['a']), cols)
    assert.deepEqual(getRect(geometry[0]), saved.positions[String(cols)].a)
  }
  const geometry6 = buildSpatialLayout(saved, metas(['a']), 6)
  const moved6 = moveSpatialItem(geometry6, 'a', 0, 5)
  assert.equal(moveSpatialItem(geometry6, 'a', 1, 0), geometry6, 'maxW infers six-column boundary')
  const merged = mergeSpatialPositions(saved, moved6, 6)
  assert.equal(merged.positions['12'], saved.positions['12'])
  assert.equal(merged.positions['2'], saved.positions['2'])
  assert.deepEqual(merged.positions['6'].a, rect(3, 7, 3))
  assert.deepEqual(saved.positions['6'].a, rect(3, 2, 3))
})

test('a missing breakpoint uses independent legacy first-fit without materializing or replacing others', () => {
  const saved = deepFreeze(layout({ positions: { 12: { a: rect(8, 90) } } }))
  const six = buildSpatialLayout(saved, metas(['a', 'b']), 6)
  assert.deepEqual(six.map(getRect), [rect(0, 0, 3), rect(3, 0, 3)])
  assert.equal(saved.positions['6'], undefined)
  const merged = mergeSpatialPositions(saved, six, 6)
  assert.equal(merged.positions['12'], saved.positions['12'])
  assert.deepEqual(merged.positions['12'].a, rect(8, 90))
})

test('unregistered external cards do not collide and data survives uninstall, edits and reinstall', () => {
  const saved = deepFreeze(layout({
    order: ['queue', 'external:notes', 'a'], size: { 'external:notes': 'l' },
    positions: { 12: { queue: rect(8, 0), a: rect(4, 20), 'external:notes': rect(0, 50, 12) } },
  }))
  const geometry = buildSpatialLayout(saved, metas(['queue', 'a']), 12)
  assert.deepEqual(geometry.map(entry => entry.i), ['queue', 'a'])
  const merged = mergeSpatialPositions(saved, moveSpatialItem(geometry, 'a', 0, 10), 12)
  assert.deepEqual(merged.positions['12']['external:notes'], rect(0, 50, 12))
  assert.equal(merged.size['external:notes'], 'l')
  const installed = buildSpatialLayout(merged, metas(['queue', 'a', 'external:notes']), 12)
  assert.deepEqual(installed.map(entry => entry.i), ['queue', 'external:notes', 'a'])
  assert.deepEqual(getRect(installed[1]), rect(0, 50, 12))
  assertValid(installed, 12)
})

test('invalid and out-of-bounds rectangles recover to bounded integers without disturbing legal saved cards', () => {
  const invalid = [
    null, [], 'bad', {}, rect(NaN, 0), rect(Infinity, 0), rect(-1, 0), rect(0, -1),
    rect(0.5, 0), rect(9, 0), rect(0, SPATIAL_MAX_Y + 1), rect(0, 0, 100, 100),
    rect(0, 0, -1, -1), rect(0, 0, 1, 1), rect(0, 0, 4.2, 3.4), rect(0, 0, NaN, Infinity),
  ]
  for (const bad of invalid) {
    const saved = layout({ positions: { 12: { bad, valid: rect(8, 9) } } })
    const geometry = buildSpatialLayout(saved, metas(['bad', 'valid']), 12)
    assert.equal(geometry.length, 2)
    assert.deepEqual(getRect(geometry[1]), rect(8, 9))
    assertValid(geometry, 12)
    assert.ok(geometry[0].h <= SPATIAL_MAX_H)
    assert.ok(geometry[0].y <= SPATIAL_MAX_Y)
  }
  const atLimit = buildSpatialLayout(layout({ positions: { 12: { a: rect(0, SPATIAL_MAX_Y, 12, SPATIAL_MAX_H) } } }), metas(['a']), 12)
  assert.deepEqual(getRect(atLimit[0]), rect(0, SPATIAL_MAX_Y, 12, SPATIAL_MAX_H))
  assert.equal(moveSpatialItem(atLimit, 'a', 0, 1), atLimit)
})

test('placement and merge reject bad proposals, retaining hidden records and all legacy fields', () => {
  const saved = deepFreeze(layout({
    order: ['queue'], focusOrder: ['today'], size: { a: 'l' }, hidden: ['hidden'],
    positions: { 12: { hidden: rect(0, 3), a: rect(4, 3) }, 6: { a: rect(0, 9, 6) } },
  }))
  const geometry = [item('a', -1, 0), item('hidden', 8, 20)]
  const merged = mergeSpatialPositions(saved, geometry, 12)
  assert.deepEqual(merged, saved)
  assert.notEqual(merged, saved)
  assert.equal(merged.order, saved.order)
  assert.equal(merged.size, saved.size)
  for (const bad of [rect(-1, 0), rect(0, NaN), rect(0, 0, 0, 3), rect(0, 0, 4, 31)]) {
    assert.equal(canPlace([], 'a', bad, 12), false)
    assert.equal(findSpatialSpace([], bad, 12) === null, bad.w === 0 || bad.h === 31)
  }
})

test('external ids with prototype-looking keys are own data, not inherited geometry or prototype mutation', () => {
  const ids = ['__proto__', 'constructor', 'toString']
  const saved = layout({ positions: { 12: {} } })
  const geometry = buildSpatialLayout(saved, metas(ids), 12)
  assert.deepEqual(geometry.map(entry => entry.i), ids)
  const merged = mergeSpatialPositions(saved, geometry, 12)
  assert.equal(Object.getPrototypeOf(merged.positions['12']), Object.prototype)
  for (const entry of geometry) {
    assert.equal(Object.hasOwn(merged.positions['12'], entry.i), true)
    assert.deepEqual(merged.positions['12'][entry.i], getRect(entry))
  }
  assertValid(geometry, 12)
})

test('first-fit handles bounded capacity exhaustion without emitting an overlapping fallback', () => {
  const occupied = []
  for (let y = 0; y <= SPATIAL_MAX_Y; y += SPATIAL_MAX_H) occupied.push(item(String(y), 0, y, 12, SPATIAL_MAX_H))
  assert.equal(findSpatialSpace(occupied, rect(0, 0, 12), 12), null)
})

test('a gesture never re-packs the board: packing is an explicit action', async () => {
  // "Pack on release" made the board un-arrangeable — every drag snapped the card back
  // to the top row, so a gap could not be left and a card could not be put beside a tall
  // one. Tidy layout is the only compaction path; the drop path must stay free.
  const grid = await readFile(new URL('../src/client/spatial-grid.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(grid, /compactSpatialLayout\(/)
})

test('a canvas resize carries the rectangles instead of re-placing them', async () => {
  const { carrySpatialBreakpoint } = await import('../src/client/spatial-model.ts')
  const layout = {
    order: ['a', 'b'], focusOrder: [], size: {}, hidden: [], instanceLayout: true,
    positions: { 12: { a: { x: 0, y: 0, w: 4, h: 4 }, b: { x: 4, y: 0, w: 8, h: 4 } } },
  }
  const wider = carrySpatialBreakpoint(layout, 12, 16)
  assert.deepEqual(wider.positions['16'], layout.positions['12'], 'widening keeps every rectangle verbatim')
  assert.deepEqual(layout.positions['16'], undefined, 'the source layout is not mutated')
  // Narrowing drops what no longer fits; the rest still carries.
  const narrower = carrySpatialBreakpoint(layout, 12, 10)
  assert.deepEqual(narrower.positions['10'], { a: { x: 0, y: 0, w: 4, h: 4 } })
})
