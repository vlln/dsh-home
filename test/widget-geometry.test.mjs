/** Widget geometry metadata integration, deliberately independent of collision preview algorithms. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
import { emptyLayout } from '../src/client/api.ts'
import { buildSpatialLayout, canPlace, moveSpatialItem } from '../src/client/spatial-model.ts'

function registered(defaults) {
  const registry = new HomeWidgetRegistry()
  registry.register({ typeId: 'test/geometry:bounded', apiVersion: 1, title: 'Bounded',
    configVersion: 1, defaultConfig: () => ({}), validateConfig: () => true,
    Content: () => null, defaults })
  return registry.get('test/geometry:bounded')
}
function meta(definition, id = 'widget-a') {
  const defaults = definition.defaults
  return { id, sizing: definition.sizing, defaultSize: defaults.size, defaultHeight: defaults.height,
    minWidth: defaults.minWidth, maxWidth: defaults.maxWidth,
    minHeight: defaults.minHeight, maxHeight: defaults.maxHeight }
}
const rect = ({ x, y, w, h }) => ({ x, y, w, h })

test('legacy defaults map to one fixed shape and its projected metadata on 12/6/2-column breakpoints', () => {
  const definition = registered({ size: 's', height: 6, minWidth: 4, maxWidth: 5, minHeight: 5, maxHeight: 7 })
  const initial = emptyLayout()
  const before = structuredClone(initial)
  assert.deepEqual(definition.sizing, { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 6 }] })
  for (const [cols, width] of [[12, 4], [6, 3], [2, 2]]) {
    const [item] = buildSpatialLayout(initial, [meta(definition)], cols)
    assert.equal(item.w, width)
    assert.equal(item.h, 6)
    assert.equal(item.minW, width)
    assert.equal(item.maxW, width)
    assert.equal(item.minH, 6)
    assert.equal(item.maxH, 6)
    assert.ok(item.w >= item.minW && item.w <= item.maxW)
    assert.ok(item.h >= item.minH && item.h <= item.maxH)
    assert.equal(canPlace([item], item.i, item, cols), true)
  }
  assert.deepEqual(initial, before)
})

test('new layouts use widget-owned arbitrary default shape and bounds from its finite declarations', () => {
  for (const shape of [{ w: 1, h: 30 }, { w: 5, h: 11 }, { w: 7, h: 9 }]) {
    const registry = new HomeWidgetRegistry()
    registry.register({ typeId: 'test/geometry:custom', apiVersion: 1, title: 'Custom', configVersion: 1,
      Content: () => null, defaultConfig: () => ({}), validateConfig: () => true,
      sizing: { default: shape, supported: [shape, { w: 12, h: 12 }] } })
    const definition = registry.get('test/geometry:custom')
    const layout = { ...emptyLayout(), instanceLayout: true }
    const before = structuredClone(layout)
    for (const cols of [12, 6, 2]) {
      const [item] = buildSpatialLayout(layout, [meta(definition)], cols)
      const width = cols === 12 ? shape.w : cols === 6 ? shape.w <= 4 ? Math.min(shape.w, 3) : Math.min(shape.w, 6) : Math.min(shape.w, 2)
      assert.deepEqual(rect(item), { x: 0, y: 0, w: width, h: shape.h })
      assert.equal(item.minW, width)
      assert.equal(item.maxW, cols)
      assert.equal(item.minH, Math.min(shape.h, 12))
      assert.equal(item.maxH, Math.max(shape.h, 12))
      assert.equal(canPlace([item], item.i, item, cols), true)
    }
    assert.deepEqual(layout, before)
  }
})

test('legacy size-only records keep their chosen width when a breakpoint is first projected', () => {
  const definition = registered({ size: 's', height: 5, minWidth: 3, maxWidth: 5, minHeight: 4, maxHeight: 6 })
  const layout = { ...emptyLayout(), size: { 'widget-a': 'l' } }
  for (const cols of [12, 6, 2]) {
    const [item] = buildSpatialLayout(layout, [meta(definition)], cols)
    assert.equal(item.w, cols)
    assert.equal(item.h, 5)
  }
})

test('malformed saved rectangles recover to the host default without moving or resizing a legal legacy sibling', () => {
  const definition = registered({ size: 's', height: 5, minWidth: 3, maxWidth: 5, minHeight: 4, maxHeight: 6 })
  for (const cols of [12, 6, 2]) {
    const sibling = { x: 0, y: 20, w: Math.min(4, cols), h: 5 }
    const layout = { ...emptyLayout(), instanceLayout: true, order: ['widget-a', 'widget-b'],
      positions: { [cols]: { 'widget-a': { x: -1, y: -1, w: 999, h: 999 }, 'widget-b': sibling } } }
    const geometry = buildSpatialLayout(layout, [meta(definition), meta(definition, 'widget-b')], cols)
    assert.deepEqual(rect(geometry.find(item => item.i === 'widget-b')), sibling)
    const repaired = geometry.find(item => item.i === 'widget-a')
    assert.equal(repaired.w, cols === 12 ? 4 : cols === 6 ? 3 : 2)
    assert.equal(repaired.h, 5)
    assert.equal(canPlace(geometry, repaired.i, repaired, cols), true)
  }
})

test('constraint upgrades preserve globally legal saved geometry and neighboring cards without silent migration', () => {
  const definition = registered({ size: 's', height: 6, minWidth: 4, maxWidth: 5, minHeight: 5, maxHeight: 7 })
  const saved = { 'widget-a': { x: 0, y: 10, w: 8, h: 4 }, 'widget-b': { x: 8, y: 10, w: 4, h: 6 } }
  const layout = { ...emptyLayout(), instanceLayout: true, order: ['widget-a', 'widget-b'], positions: { 12: saved } }
  const before = structuredClone(layout)
  const geometry = buildSpatialLayout(layout, [meta(definition), meta(definition, 'widget-b')], 12)
  for (const item of geometry) assert.deepEqual(rect(item), saved[item.i])
  assert.equal(geometry[0].maxW, 8, 'engine metadata includes grandfathered width rather than clamping it')
  assert.equal(geometry[0].minH, 4, 'engine metadata includes grandfathered height')
  assert.equal(geometry[0].maxH, 6)
  assert.deepEqual(layout, before)
})

test('single preset metadata never clamps saved narrow widths, nonpreset heights or tall legacy cards', () => {
  const definition = registered({ size: 's', height: 6 })
  for (const cols of [12, 6, 2]) {
    const saved = Object.fromEntries([1, 2].flatMap(w => [3, 5, 7, 30].map((h, index) =>
      [`w${w}h${h}`, { x: 0, y: index * 40, w, h }])))
    // Each width group has its own rows so the preservation assertion is not a collision repair case.
    for (const [id, value] of Object.entries(saved)) if (id.startsWith('w2')) value.y += 200
    const layout = { ...emptyLayout(), instanceLayout: true, order: Object.keys(saved), positions: { [cols]: saved } }
    const before = structuredClone(layout)
    const geometry = buildSpatialLayout(layout, Object.keys(saved).map(id => meta(definition, id)), cols)
    assert.equal(geometry.length, Object.keys(saved).length)
    for (const item of geometry) {
      assert.deepEqual(rect(item), saved[item.i])
      assert.ok(item.minW <= item.w && item.maxW >= item.w)
      assert.ok(item.minH <= item.h && item.maxH >= item.h)
      assert.equal(canPlace(geometry, item.i, item, cols), true)
    }
    assert.deepEqual(layout, before)
  }
})

test('implicit keyboard movement uses viewport columns rather than the widget resize maximum', () => {
  const definition = registered({ size: 's', minWidth: 3, maxWidth: 4 })
  for (const cols of [12, 6]) {
    const initial = buildSpatialLayout(emptyLayout(), [meta(definition)], cols)
    assert.equal(initial[0].viewportCols, cols)
    const moved = moveSpatialItem(initial, 'widget-a', 1, 0)
    assert.notStrictEqual(moved, initial)
    assert.equal(moved[0].x, 1)
    assert.equal(moved[0].maxW, cols === 12 ? 4 : 3)
    const explicit = moveSpatialItem(initial, 'widget-a', 1, 0, cols)
    assert.deepEqual(moved, explicit)
  }
  const narrow = buildSpatialLayout(emptyLayout(), [meta(definition)], 2)
  assert.strictEqual(moveSpatialItem(narrow, 'widget-a', 1, 0), narrow)
})

test('RGL-to-spatial adapter preserves registered resize bounds and uses fallback values only when absent', async () => {
  const source = await readFile(new URL('../src/client/spatial-grid.tsx', import.meta.url), 'utf8')
  // Execute just the real pure adapter, avoiding a React/RGL runtime dependency in node tests.
  const adapter = source.match(/const items = \(value: EngineLayout, cols: number\): SpatialItem\[\] => value\.map\(item => \(\{[\s\S]*?\}\)\)/)?.[0]
  assert.ok(adapter, 'pure EngineLayout adapter remains identifiable')
  const mapItems = new Function(`${stripTypeScriptTypes(adapter)}; return items`)()
  const custom = { i: 'bounded', x: 0, y: 0, w: 4, h: 6, minW: 4, maxW: 5, minH: 5, maxH: 7, viewportCols: 12 }
  const [preserved] = mapItems([custom], 12)
  assert.deepEqual(preserved, custom)
  const [narrowed] = mapItems([custom], 6)
  assert.equal(narrowed.maxW, 5)
  assert.equal(narrowed.maxH, 7)
  const [fallback] = mapItems([{ i: 'plain', x: 0, y: 0, w: 4, h: 4 }], 6)
  assert.equal(fallback.minW, 3)
  assert.equal(fallback.maxW, 6)
  assert.equal(fallback.minH, 3)
  // Last wrapper into RGL must not replace custom maxH with the global ceiling.
  assert.match(source, /current\.map\(item => \(\{ \.\.\.item, maxH: item\.maxH \?\? 30 \}\)\)/)
  assert.match(source, /layout=\{constrained\}/)
})
