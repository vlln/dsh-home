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
  return { id, defaultSize: defaults.size, defaultHeight: defaults.height,
    minWidth: defaults.minWidth, maxWidth: defaults.maxWidth,
    minHeight: defaults.minHeight, maxHeight: defaults.maxHeight }
}
const rect = ({ x, y, w, h }) => ({ x, y, w, h })

test('registered defaults constrain new geometry and metadata on 12/6/2-column breakpoints', () => {
  const definition = registered({ size: 's', height: 6, minWidth: 4, maxWidth: 5, minHeight: 5, maxHeight: 7 })
  const initial = emptyLayout()
  const before = structuredClone(initial)
  for (const [cols, width] of [[12, 4], [6, 4], [2, 2]]) {
    const [item] = buildSpatialLayout(initial, [meta(definition)], cols)
    assert.equal(item.w, width)
    assert.equal(item.h, 6)
    assert.equal(item.minW, Math.min(4, cols))
    assert.equal(item.maxW, Math.min(5, cols))
    assert.equal(item.minH, 5)
    assert.equal(item.maxH, 7)
    assert.ok(item.w >= item.minW && item.w <= item.maxW)
    assert.ok(item.h >= item.minH && item.h <= item.maxH)
    assert.equal(canPlace([item], item.i, item, cols), true)
  }
  assert.deepEqual(initial, before)
})

test('legacy size override cannot exceed a registered width maximum for a newly placed widget', () => {
  const definition = registered({ size: 's', height: 5, minWidth: 3, maxWidth: 5, minHeight: 4, maxHeight: 6 })
  const layout = { ...emptyLayout(), size: { 'widget-a': 'l' } }
  for (const cols of [12, 6, 2]) {
    const [item] = buildSpatialLayout(layout, [meta(definition)], cols)
    assert.equal(item.w, Math.min(5, cols))
    assert.equal(item.h, 5)
  }
})

test('malformed saved rectangles are repaired inside registered constraints without moving a valid sibling', () => {
  const definition = registered({ size: 's', height: 5, minWidth: 3, maxWidth: 5, minHeight: 4, maxHeight: 6 })
  for (const cols of [12, 6, 2]) {
    const sibling = { x: 0, y: 20, w: Math.min(4, cols), h: 5 }
    const layout = { ...emptyLayout(), instanceLayout: true, order: ['widget-a', 'widget-b'],
      positions: { [cols]: { 'widget-a': { x: -1, y: -1, w: 999, h: 999 }, 'widget-b': sibling } } }
    const geometry = buildSpatialLayout(layout, [meta(definition), meta(definition, 'widget-b')], cols)
    assert.deepEqual(rect(geometry.find(item => item.i === 'widget-b')), sibling)
    const repaired = geometry.find(item => item.i === 'widget-a')
    assert.equal(repaired.w, Math.min(5, cols))
    assert.equal(repaired.h, 6)
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
  assert.equal(geometry[0].maxW, 5)
  assert.equal(geometry[0].minH, 5)
  assert.deepEqual(layout, before)
})

test('implicit keyboard movement uses viewport columns rather than the widget resize maximum', () => {
  const definition = registered({ size: 's', minWidth: 3, maxWidth: 4 })
  for (const cols of [12, 6]) {
    const initial = buildSpatialLayout(emptyLayout(), [meta(definition)], cols)
    assert.equal(initial[0].viewportCols, cols)
    const moved = moveSpatialItem(initial, 'widget-a', 1, 0)
    assert.notStrictEqual(moved, initial)
    assert.equal(moved[0].x, 1)
    assert.equal(moved[0].maxW, 4)
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
