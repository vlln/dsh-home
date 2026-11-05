/** Mock transport only; exercise the real HomeStore and spatial model together. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { HomeStore } from '../src/client/store.ts'
import { initialInstances } from '../src/widget-state.mjs'

const storage = { writable: true, status: 'ready', error: null }
import { buildSpatialLayout, canPlace, moveSpatialItem } from '../src/client/spatial-model.ts'

const rect = (x = 0, y = 0, w = 4, h = 4) => ({ x, y, w, h })
const layout = (overrides = {}) => ({ order: [], focusOrder: [], size: {}, hidden: [], ...overrides })
const metas = ids => ids.map(id => ({ id, defaultSize: 's' }))
const getRect = ({ x, y, w, h }) => ({ x, y, w, h })

async function withStore(initial, callback) {
  const original = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  const pending = new Set()
  const writes = []
  let persisted = structuredClone(initial)
  let instances = initialInstances(initial)
  let store
  globalThis.setTimeout = (fn, delay, ...args) => {
    const handle = { fn, delay, args }
    pending.add(handle)
    return handle
  }
  globalThis.clearTimeout = handle => pending.delete(handle)
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    let value
    if (body.op === 'workbench.get') value = { layout: structuredClone(persisted), instances: structuredClone(instances), storage }
    else if (body.op === 'workbench.set') {
      writes.push(structuredClone(body.layout))
      persisted = structuredClone(body.layout)
      instances = structuredClone(body.instances)
      value = { layout: persisted, instances, storage }
    } else if (body.op === 'prefs.get') value = { prefs: { lastSeenAt: null, dismissed: {} } }
    else if (body.op === 'snapshot') value = {
      generatedAt: 1000, scannedAt: 1000, scanning: false, progress: { done: 0, total: 0 },
      sessionCount: 0, days: [], sessions: [],
      today: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
      week: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
    }
    else throw new Error(`Unexpected op ${body.op}`)
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  try {
    store = new HomeStore()
    await setImmediate()
    assert.deepEqual(store.getSnapshot().layout, initial)
    await callback(store, { pending, writes, saved: () => structuredClone(persisted) })
  } finally {
    store?.dispose()
    Object.assign(globalThis, original)
  }
  assert.equal(pending.size, 0, 'dispose releases every debounce handle')
}

function geometry(store, registered, cols = 12) {
  const result = buildSpatialLayout(store.getSnapshot().layout, registered, cols)
  for (const item of result) assert.equal(canPlace(result, item.i, item, cols), true)
  return result
}

test('setSpatialLayout persists active breakpoint only, retaining hidden and unknown external records', async () => {
  const registered = metas(['queue', 'tasks', 'external:hidden'])
  const initial = layout({
    order: ['queue', 'tasks'], focusOrder: ['today'], hidden: ['external:hidden'],
    size: { tasks: 'm', 'external:uninstalled': 'l' },
    positions: {
      12: { queue: rect(8, 20), tasks: rect(0, 40, 8, 8), 'external:hidden': rect(0, 80), 'external:uninstalled': rect(0, 100, 12) },
      6: { queue: rect(3, 10, 3), tasks: rect(0, 30, 6, 8), 'external:uninstalled': rect(0, 100, 6) },
      2: { queue: rect(0, 200, 2), tasks: rect(0, 220, 2, 8) },
    },
  })
  await withStore(initial, async (store, io) => {
    const current = geometry(store, registered, 12)
    const moved = moveSpatialItem(current, 'queue', 0, 9)
    store.setSpatialLayout(moved, 12)
    const next = store.getSnapshot().layout
    assert.deepEqual(next.positions['12'].queue, rect(8, 29))
    assert.deepEqual(next.positions['12'].tasks, initial.positions['12'].tasks)
    assert.deepEqual(next.positions['12']['external:hidden'], initial.positions['12']['external:hidden'])
    assert.deepEqual(next.positions['12']['external:uninstalled'], initial.positions['12']['external:uninstalled'])
    assert.deepEqual(next.positions['6'], initial.positions['6'])
    assert.deepEqual(next.positions['2'], initial.positions['2'])
    for (const field of ['order', 'focusOrder', 'size', 'hidden']) assert.deepEqual(next[field], initial[field])
    assert.equal(io.pending.size, 1)
    assert.equal(io.writes.length, 0)
    await store.flushLayout()
    assert.deepEqual(io.saved(), next)
    assert.equal(io.writes.length, 1)
    assert.equal(io.pending.size, 0)
  })
})

test('setSpatialLayout on absent breakpoint materializes only that breakpoint without resetting others', async () => {
  const initial = layout({ positions: { 12: { a: rect(8, 80), 'external:uninstalled': rect(0, 100, 12) } } })
  await withStore(initial, async (store, io) => {
    const six = geometry(store, metas(['a', 'b']), 6)
    store.setSpatialLayout(six, 6)
    const next = store.getSnapshot().layout
    assert.deepEqual(next.positions['12'], initial.positions['12'])
    assert.deepEqual(next.positions['6'], { a: rect(0, 0, 3), b: rect(3, 0, 3) })
    assert.equal(next.positions['2'], undefined)
    await store.flushLayout()
    assert.deepEqual(io.saved(), next)
  })
})

test('toggleSpatialHidden hides without deleting any saved position and restores a nonconflicting old rectangle exactly', async () => {
  const registered = metas(['restored', 'existing', 'other'])
  const initial = layout({ positions: {
    12: { restored: rect(8, 60), existing: rect(0, 0), other: rect(4, 20) },
    6: { restored: rect(0, 90, 3) }, 2: { restored: rect(0, 190, 2) },
  } })
  await withStore(initial, async (store, io) => {
    store.toggleSpatialHidden('restored', geometry(store, registered), registered, 12)
    assert.deepEqual(store.getSnapshot().layout.hidden, ['restored'])
    assert.deepEqual(store.getSnapshot().layout.positions, initial.positions)
    const current = geometry(store, registered)
    assert.deepEqual(current.map(item => item.i), ['existing', 'other'])
    store.toggleSpatialHidden('restored', current, registered, 12)
    const next = store.getSnapshot().layout
    assert.deepEqual(next.hidden, [])
    assert.deepEqual(next.positions, initial.positions, 'restoring must not compact a legal saved rectangle into the first hole')
    const restored = geometry(store, registered)
    assert.deepEqual(getRect(restored[0]), rect(8, 60))
    assert.deepEqual(restored.slice(1).map(getRect), current.map(getRect))
    assert.equal(io.pending.size, 1, 'hide and restore share a single debounce')
    await store.flushLayout()
    assert.deepEqual(io.saved(), next)
  })
})

test('restoring an earlier ordered colliding card relocates only that card, not existing cards or breakpoints', async () => {
  const registered = metas(['restored', 'existing', 'other'])
  const initial = layout({
    hidden: ['restored', 'external:uninstalled'],
    positions: {
      12: { restored: rect(0, 0), existing: rect(0, 0), other: rect(4, 20), 'external:uninstalled': rect(8, 80) },
      6: { restored: rect(0, 90, 3) }, 2: { restored: rect(0, 190, 2) },
    },
  })
  await withStore(initial, async (store, io) => {
    const current = geometry(store, registered)
    store.toggleSpatialHidden('restored', current, registered, 12)
    const next = store.getSnapshot().layout
    assert.deepEqual(next.hidden, ['external:uninstalled'])
    assert.deepEqual(next.positions['12'].restored, rect(4, 0))
    assert.deepEqual(next.positions['12'].existing, initial.positions['12'].existing)
    assert.deepEqual(next.positions['12'].other, initial.positions['12'].other)
    assert.deepEqual(next.positions['12']['external:uninstalled'], initial.positions['12']['external:uninstalled'])
    assert.deepEqual(next.positions['6'], initial.positions['6'])
    assert.deepEqual(next.positions['2'], initial.positions['2'])
    const restored = geometry(store, registered)
    assert.deepEqual(restored.slice(1).map(getRect), current.map(getRect))
    await store.flushLayout()
    assert.deepEqual(io.saved(), next)
  })
})

test('restoring a never-positioned card first-fits around existing cards and persists migrated geometry', async () => {
  const registered = metas(['new', 'existing', 'other'])
  const initial = layout({ hidden: ['new'], positions: { 6: { existing: rect(0, 5, 3), other: rect(3, 0, 3) } } })
  await withStore(initial, async (store, io) => {
    const current = geometry(store, registered, 6)
    store.toggleSpatialHidden('new', current, registered, 6)
    const restored = geometry(store, registered, 6)
    assert.deepEqual(getRect(restored[0]), rect(0, 0, 3))
    assert.deepEqual(restored.slice(1).map(getRect), current.map(getRect))
    assert.equal(store.getSnapshot().layout.positions['12'], undefined)
    await store.flushLayout()
    assert.deepEqual(io.saved().positions['6'].new, rect(0, 0, 3))
  })
})
