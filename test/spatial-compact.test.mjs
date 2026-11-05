/** Explicit packing is separate from normal projection, movement and persistence. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { buildSpatialLayout, canPlace, compactSpatialLayout, findSpatialSpace, moveSpatialItem } from '../src/client/spatial-model.ts'
import { HomeStore } from '../src/client/store.ts'
import { emptyLayout, emptyPrefs } from '../src/client/api.ts'

const READY = { writable: true, status: 'ready', error: null }
const rect = (x, y, w = 4, h = 4) => ({ x, y, w, h })
const item = (i, x, y, w = 4, h = 4, cols = 12) => ({ i, ...rect(x, y, w, h), minW: Math.min(3, cols), minH: 3, maxW: cols })
const shape = ({ x, y, w, h }) => ({ x, y, w, h })
const instance = id => ({ instanceId: id, typeId: 'test/widgets:notes', configVersion: 1, config: { text: id, nested: [1, 2] } })
const meta = ids => ids.map(id => ({ id, defaultSize: 's', defaultHeight: 4 }))
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}
function assertPacked(before, after, cols) {
  assert.deepEqual(after.map(value => value.i), before.map(value => value.i), 'array order is not rewritten')
  for (const value of after) {
    const old = before.find(entry => entry.i === value.i)
    assert.deepEqual({ ...value, x: old.x, y: old.y }, old, 'only x/y may change')
    assert.equal(canPlace(after, value.i, value, cols), true)
    assert.deepEqual(findSpatialSpace(after.filter(peer => peer !== value), value, cols), shape(value), 'no earlier row-major slot with peers held fixed')
  }
}

test('explicit compaction follows original visual y/x order, not array order, preserving all sizes and metadata', () => {
  const current = freeze([
    { ...item('bottom', 0, 70, 4, 7), marker: { config: 'not geometry-owned' } },
    item('right', 8, 20, 4, 3), item('left', 0, 20, 8, 5),
  ])
  const packed = compactSpatialLayout(current, 12)
  assert.deepEqual(packed.map(shape), [rect(8, 3, 4, 7), rect(8, 0, 4, 3), rect(0, 0, 8, 5)])
  assert.strictEqual(packed[0].marker, current[0].marker)
  assertPacked(current, packed, 12)
  assert.deepEqual(compactSpatialLayout(current, 12), packed, 'deterministic')
  assert.strictEqual(compactSpatialLayout(packed, 12), packed, 'idempotent, identity no-op')
  assert.deepEqual(current.map(value => value.y), [70, 20, 20], 'input frozen and unchanged')
})

test('first-fit fills an earlier hole with a later narrow card rather than enforcing a shelf or strict final order', () => {
  const current = freeze([item('wide-first', 0, 10, 8, 7), item('wide-next', 0, 30, 8, 3), item('narrow-last', 8, 40, 4, 5)])
  const packed = compactSpatialLayout(current, 12)
  assert.deepEqual(packed.map(shape), [rect(0, 0, 8, 7), rect(0, 7, 8, 3), rect(8, 0, 4, 5)])
  assertPacked(current, packed, 12)
})

test('locally tight shape-constrained holes stay unchanged even when rebuilding visual first-fit would reshuffle', () => {
  const current = freeze([item('a', 0, 0, 7, 10), item('b', 0, 10, 8, 10), item('c', 7, 0, 5, 3), item('d', 8, 3, 3, 8)])
  assert.strictEqual(compactSpatialLayout(current, 12), current)
})

test('all public breakpoints compact independently, including full-width and maximum-height cards', () => {
  for (const cols of [2, 6, 12]) {
    const current = freeze([item('a', 0, 300, cols, 30, cols), item('b', 0, 900, cols, 3, cols)])
    const packed = compactSpatialLayout(current, cols)
    assert.deepEqual(packed.map(shape), [rect(0, 0, cols, 30), rect(0, 30, cols, 3)])
    assertPacked(current, packed, cols)
  }
  const empty = freeze([])
  assert.strictEqual(compactSpatialLayout(empty, 12), empty)
  const already = freeze([item('__proto__', 0, 0), item('constructor', 4, 0)])
  assert.strictEqual(compactSpatialLayout(already, 12), already)
})

test('invalid breakpoint, duplicate ids, overlap and malformed geometry reject without repairing or resizing', () => {
  for (const cols of [0, 1, 3, 8, 13, NaN, Infinity, 6.5, '12', undefined]) {
    assert.throws(() => compactSpatialLayout([], cols), /columns/)
  }
  const invalid = [
    null, undefined, {}, [null], [item('', 0, 0)], [item('a', 0, 0), item('a', 4, 0)],
    [item('a', 0, 0), item('b', 0, 1)], [item('a', -1, 0)], [item('a', 0, -1)],
    [item('a', 0, 10001)], [item('a', 0.5, 0)], [item('a', 0, NaN)],
    [item('a', 0, 0, 13)], [item('a', 10, 0)], [item('a', 0, 0, 2)],
    [item('a', 0, 0, 4, 31)], [item('a', 0, 0, 4, 2)],
    Array.from({ length: 65 }, (_, n) => item(String(n), 0, n * 4)),
  ]
  for (const current of invalid) {
    const before = structuredClone(current)
    assert.throws(() => compactSpatialLayout(current, 12), /[Ii]nvalid|[Oo]verlapping/)
    assert.deepEqual(current, before)
  }
})

test('seeded mixed-size cases remain deterministic and collision-free across repeated explicit packing', () => {
  let seed = 15191
  const random = max => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % max }
  for (const cols of [2, 6, 12]) for (let run = 0; run < 35; run++) {
    const current = freeze(Array.from({ length: 20 }, (_, n) => {
      const w = cols === 2 ? 2 : 3 + random(cols - 2)
      return item(String(n), random(cols - w + 1), 50 + n * 31, w, 3 + random(28), cols)
    }))
    const packed = compactSpatialLayout(current, cols)
    assertPacked(current, packed, cols)
    assert.deepEqual(compactSpatialLayout(current, cols), packed)
    assert.strictEqual(compactSpatialLayout(packed, cols), packed, 'locally tight output is idempotent')
  }
})

async function withStore(document, callback, options = {}) {
  const original = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  const pending = new Set(), writes = []
  let persisted = structuredClone({ layout: emptyLayout(), instances: [], storage: READY, ...document })
  let store
  const control = { pending, writes, failNext: false, gate: null, saved: () => structuredClone(persisted) }
  globalThis.setTimeout = (fn, delay, ...args) => { const handle = { fn, delay, args }; pending.add(handle); return handle }
  globalThis.clearTimeout = handle => pending.delete(handle)
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    let value
    if (body.op === 'workbench.get') {
      if (options.loadGate) await options.loadGate
      value = structuredClone(persisted)
    } else if (body.op === 'workbench.set') {
      writes.push(structuredClone(body))
      if (control.gate) await control.gate
      if (control.failNext) { control.failNext = false; throw new Error('disk full') }
      persisted = { layout: body.layout, instances: body.instances, storage: READY }
      value = structuredClone(persisted)
    } else if (body.op === 'prefs.get') value = emptyPrefs()
    else if (body.op === 'snapshot') value = { scannedAt: 1, scanning: false }
    else throw new Error(`Unexpected op ${body.op}`)
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  try { store = new HomeStore(); await setImmediate(); await callback(store, control) }
  finally { store?.dispose(); Object.assign(globalThis, original) }
  assert.equal(pending.size, 0)
}
function geometry(store, cols = 12) {
  const state = store.getSnapshot()
  return buildSpatialLayout(state.layout, meta(state.instances.map(value => value.instanceId)), cols)
}

test('store compacts only clicked breakpoint, preserving instance/config identity, hidden data and all non-position fields', async () => {
  const layout = { ...emptyLayout(), instanceLayout: true, order: ['b', 'a', 'hidden'], focusOrder: ['a'], hidden: ['hidden'], size: { b: 'm' }, positions: {
    12: { a: rect(0, 30, 8, 7), b: rect(8, 20, 4, 3), hidden: rect(0, 99), absent: rect(8, 70) },
    6: { a: rect(0, 90, 6, 7) }, 2: { a: rect(0, 80, 2, 7) },
  } }
  await withStore({ layout, instances: ['a', 'b', 'hidden'].map(instance) }, async (store, io) => {
    const before = store.getSnapshot(), current = freeze(geometry(store))
    assert.equal(io.pending.size, 0, 'loading/projecting do not trigger compaction')
    assert.equal(store.compactSpatialLayout(current, 12), true)
    const next = store.getSnapshot()
    assert.strictEqual(next.instances, before.instances)
    for (const field of ['order', 'focusOrder', 'size', 'hidden', 'instanceLayout']) assert.strictEqual(next.layout[field], before.layout[field])
    assert.strictEqual(next.layout.positions['6'], before.layout.positions['6'])
    assert.strictEqual(next.layout.positions['2'], before.layout.positions['2'])
    for (const id of ['hidden', 'absent']) assert.deepEqual(next.layout.positions['12'][id], layout.positions['12'][id])
    assert.deepEqual(next.layout.positions['12'].b, rect(0, 0, 4, 3))
    assert.deepEqual(next.layout.positions['12'].a, rect(4, 0, 8, 7))
    assert.equal(io.pending.size, 1)
    assert.equal(io.writes.length, 0, 'normal debounce, no immediate transport')
    const noop = store.getSnapshot()
    assert.equal(store.compactSpatialLayout(geometry(store), 12), false)
    assert.strictEqual(store.getSnapshot(), noop)
    assert.equal(io.pending.size, 1)
    await store.flushLayout()
    assert.deepEqual(io.saved().layout, next.layout)
    assert.deepEqual(io.saved().instances, before.instances)
    assert.equal(io.writes.length, 1)
  })
})

test('normal moves still preserve whitespace, and explicit compaction persistence failures are retryable', async () => {
  await withStore({ instances: [instance('a')], layout: { ...emptyLayout(), positions: { 12: { a: rect(8, 40) } } } }, async (store, io) => {
    store.setSpatialLayout(moveSpatialItem(geometry(store), 'a', 0, 20, 12), 12)
    assert.deepEqual(store.getSnapshot().layout.positions['12'].a, rect(8, 60))
    store.compactSpatialLayout(geometry(store), 12)
    io.failNext = true
    await assert.rejects(store.flushLayout(), /disk full/)
    assert.equal(store.getSnapshot().storage.status, 'write-error')
    assert.deepEqual(store.getSnapshot().layout.positions['12'].a, rect(0, 0))
    await store.flushLayout()
    assert.equal(store.getSnapshot().storage.status, 'ready')
    assert.deepEqual(io.saved().layout.positions['12'].a, rect(0, 0))
  })
})

test('durable delete waits for persistence, guards busy edits and cleans only the deleted instance from every breakpoint', async () => {
  const layout = { ...emptyLayout(), order: ['a', 'b'], focusOrder: ['a'], hidden: ['a'], size: { a: 'l', b: 's' }, positions: {
    12: { a: rect(0, 40), b: rect(8, 70) }, 6: { a: rect(0, 50, 3), b: rect(3, 60, 3) }, 2: { a: rect(0, 80, 2) },
  } }
  await withStore({ layout, instances: ['a', 'b'].map(instance) }, async (store, io) => {
    let unlock
    io.gate = new Promise(resolve => { unlock = resolve })
    const before = store.getSnapshot()
    store.setSpatialLayout(geometry(store), 12)
    assert.equal(io.pending.size, 1)
    const pending = store.removeInstanceDurably('a')
    const busy = store.getSnapshot()
    assert.equal(busy.workbenchBusy, true)
    assert.strictEqual(busy.instances, before.instances)
    assert.deepEqual(busy.layout, before.layout)
    assert.equal(io.pending.size, 0, 'deletion supersedes queued geometry save')
    assert.throws(() => store.compactSpatialLayout(geometry(store), 12), /not editable/)
    await assert.rejects(store.removeInstanceDurably('b'), /not editable/)
    await setImmediate()
    assert.equal(io.writes.length, 1)
    assert.equal(io.saved().instances.length, 2, 'not published before persistence')
    unlock(); await pending
    const after = store.getSnapshot()
    assert.equal(after.workbenchBusy, false)
    assert.deepEqual(after.instances.map(value => value.instanceId), ['b'])
    assert.strictEqual(after.instances[0], before.instances[1])
    assert.deepEqual(after.layout.order, ['b'])
    assert.deepEqual(after.layout.focusOrder, [])
    assert.deepEqual(after.layout.hidden, [])
    assert.deepEqual(after.layout.size, { b: 's' })
    for (const rows of Object.values(after.layout.positions)) assert.equal(Object.hasOwn(rows, 'a'), false)
    assert.deepEqual(after.layout.positions['12'].b, layout.positions['12'].b)
    assert.deepEqual(after.layout.positions['6'].b, layout.positions['6'].b)
    assert.deepEqual(io.saved().layout, after.layout)
    assert.equal(io.pending.size, 0)
  })
})

test('failed durable delete preserves exact instance/config/layout and can be retried; unknown and readonly deletes reject', async () => {
  await withStore({ instances: [instance('a')], layout: { ...emptyLayout(), positions: { 12: { a: rect(8, 90) } } } }, async (store, io) => {
    const before = store.getSnapshot()
    await assert.rejects(store.removeInstanceDurably('missing'), /Unknown/)
    assert.strictEqual(store.getSnapshot(), before)
    io.failNext = true
    await assert.rejects(store.removeInstanceDurably('a'), /disk full/)
    const failed = store.getSnapshot()
    assert.strictEqual(failed.layout, before.layout)
    assert.strictEqual(failed.instances, before.instances)
    assert.equal(failed.workbenchBusy, false)
    assert.equal(failed.storage.status, 'write-error')
    assert.deepEqual(io.saved().instances, before.instances)
    assert.equal(io.pending.size, 0)
    await store.removeInstanceDurably('a')
    assert.deepEqual(store.getSnapshot().instances, [])
    assert.equal(store.getSnapshot().storage.status, 'ready')
    assert.deepEqual(io.saved().instances, [])
  })
  await withStore({ instances: [instance('a')], storage: { writable: false, status: 'read-only', error: null } }, async (store, io) => {
    const before = store.getSnapshot()
    await assert.rejects(store.removeInstanceDurably('a'), /not editable/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(io.writes.length, 0)
  })
})

test('store no longer exposes destructive reset while retaining ordinary layout APIs', () => {
  assert.equal(Object.hasOwn(HomeStore.prototype, 'reset'), false)
  assert.equal(typeof HomeStore.prototype.setSpatialLayout, 'function')
  assert.equal(typeof HomeStore.prototype.flushLayout, 'function')
})

test('empty/already packed layouts are store no-ops without writes or debounce; missing breakpoint does not reset others', async () => {
  for (const ids of [[], ['a', 'b']]) await withStore({ instances: ids.map(instance), layout: { ...emptyLayout(), positions: { 12: { a: rect(0, 900) } } } }, async (store, io) => {
    const before = store.getSnapshot()
    assert.equal(store.compactSpatialLayout(geometry(store, 6), 6), false)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(io.pending.size, 0)
    assert.equal(io.writes.length, 0)
    assert.equal(store.getSnapshot().layout.positions['6'], undefined)
  })
})

test('illegal, stale, hidden or missing requests leave snapshot, timers and document unchanged', async () => {
  await withStore({ instances: ['a', 'hidden'].map(instance), layout: { ...emptyLayout(), hidden: ['hidden'], positions: { 12: { a: rect(8, 40), hidden: rect(0, 80) } } } }, async (store, io) => {
    const before = store.getSnapshot(), current = geometry(store)
    for (const [request, cols] of [[current, 8], [[], 12], [[...current, item('hidden', 0, 80)], 12], [[item('alien', 8, 40)], 12], [[item('a', 0, 900)], 12], [[{ ...current[0], w: 3 }], 12], [[item('a', NaN, 0)], 12]]) {
      assert.throws(() => store.compactSpatialLayout(request, cols))
      assert.strictEqual(store.getSnapshot(), before)
      assert.equal(io.pending.size, 0)
      assert.equal(io.writes.length, 0)
    }
  })
})

test('read-only, not-yet-loaded, config-save busy and disposed stores reject compaction atomically', async () => {
  await withStore({ storage: { writable: false, status: 'read-only', error: { code: 'state-read-only', message: 'blocked document' } } }, async (store, io) => {
    const before = store.getSnapshot()
    assert.throws(() => store.compactSpatialLayout([], 12), /blocked document/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(io.pending.size, 0)
  })
  let release
  const gate = new Promise(resolve => { release = resolve })
  await withStore({}, async (store, io) => {
    assert.equal(store.getSnapshot().workbenchLoaded, false)
    assert.throws(() => store.compactSpatialLayout([], 12), /not editable/)
    assert.equal(io.pending.size, 0)
    release(); await setImmediate()
  }, { loadGate: gate })
  await withStore({ instances: [instance('a')] }, async (store, io) => {
    let unlock
    io.gate = new Promise(resolve => { unlock = resolve })
    const def = { typeId: 'test/widgets:notes', apiVersion: 1, title: 'Notes', configVersion: 1, defaults: { size: 's', height: 4 }, Content: () => null, validateConfig: () => true }
    const saving = store.saveInstanceConfig('a', def, { text: 'saved' })
    const before = store.getSnapshot()
    assert.equal(before.workbenchBusy, true)
    assert.throws(() => store.compactSpatialLayout(geometry(store), 12), /not editable/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(io.pending.size, 0)
    unlock(); await saving
    store.dispose()
    assert.throws(() => store.compactSpatialLayout(geometry(store), 12), /disposed/)
  })
})
