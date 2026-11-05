/** Real HomeStore + workbench HTTP envelopes, without browser/React mocks. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { HomeStore } from '../src/client/store.ts'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
import { emptyLayout, emptyPrefs } from '../src/client/api.ts'
import { buildSpatialLayout } from '../src/client/spatial-model.ts'

const READY = { writable: true, status: 'ready', error: null }
const definition = (overrides = {}) => ({
  typeId: 'test/widgets:notes', apiVersion: 1, title: 'Notes', configVersion: 1,
  defaults: { size: 's', height: 4 }, Content: () => null,
  defaultConfig: () => ({ text: '', nested: { labels: [] } }),
  validateConfig: config => typeof config?.text === 'string' || 'text must be a string',
  ...overrides,
})
const instance = (id = 'notes-1', config = { text: 'initial', nested: { labels: [] } }, configVersion = 1) =>
  ({ instanceId: id, typeId: 'test/widgets:notes', configVersion, config })
const ledger = () => ({ generatedAt: 1, scannedAt: 1, scanning: false, progress: { done: 0, total: 0 },
  sessionCount: 0, days: [], sessions: [], today: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
  week: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 } })
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function withStore(document, callback) {
  const originalFetch = globalThis.fetch
  let store
  let persisted = structuredClone({ layout: emptyLayout(), instances: [], storage: READY, ...document })
  const writes = []
  const control = {
    get persisted() { return structuredClone(persisted) }, writes,
    failNext: null, gateNext: null, failLoad: false,
  }
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    let value
    switch (body.op) {
      case 'snapshot': value = ledger(); break
      case 'prefs.get': value = emptyPrefs(); break
      case 'prefs.set': value = body.prefs; break
      case 'workbench.get':
        if (control.failLoad) throw new Error('read failed')
        value = structuredClone(persisted)
        break
      case 'workbench.set': {
        writes.push(structuredClone(body))
        const gate = control.gateNext
        control.gateNext = null
        if (gate) await gate.promise
        if (control.failNext) {
          const error = control.failNext
          control.failNext = null
          throw error
        }
        persisted = { layout: structuredClone(body.layout), instances: structuredClone(body.instances), storage: READY }
        value = structuredClone(persisted)
        break
      }
      default: throw new Error(`Unexpected workbench test op: ${body.op}`)
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  try {
    store = new HomeStore()
    await setImmediate()
    assert.equal(store.getSnapshot().workbenchLoaded, true)
    await callback(store, control)
  } finally {
    store?.dispose()
    globalThis.fetch = originalFetch
  }
}

function geometry(store) {
  const state = store.getSnapshot()
  return buildSpatialLayout(state.layout, state.instances.map(item => ({ id: item.instanceId, defaultSize: 's', defaultHeight: 4 })), 12)
}

test('add two instances of one type and duplicate: ids, configs and persisted documents stay independent', async () => {
  const shared = { text: 'default', nested: { labels: [] } }
  await withStore({}, async (store, control) => {
    const def = definition({ defaultConfig: () => shared })
    store.addInstance(def, geometry(store), 12)
    store.addInstance(def, geometry(store), 12)
    const [first, second] = store.getSnapshot().instances
    assert.notEqual(first.instanceId, second.instanceId)
    assert.equal(first.typeId, second.typeId)
    assert.notStrictEqual(first.config, second.config)
    assert.notStrictEqual(first.config.nested, shared.nested)
    await store.saveInstanceConfig(first.instanceId, def, { text: 'edited', nested: { labels: ['first'] } })
    store.duplicateInstance(first.instanceId, def, geometry(store), 12)
    const clone = store.getSnapshot().instances[2]
    assert.notEqual(clone.instanceId, first.instanceId)
    assert.deepEqual(clone.config, store.getSnapshot().instances[0].config)
    assert.notStrictEqual(clone.config.nested, store.getSnapshot().instances[0].config.nested)
    await store.saveInstanceConfig(clone.instanceId, def, { text: 'clone', nested: { labels: ['clone'] } })
    await store.flushLayout()
    assert.deepEqual(control.persisted.instances.map(item => item.config.text), ['edited', 'default', 'clone'])
    assert.deepEqual(shared, { text: 'default', nested: { labels: [] } })
    assert.equal(new Set(control.persisted.instances.map(item => item.instanceId)).size, 3)
  })
})

test('settings save waits for durable success and snapshots its caller-owned draft', async () => {
  await withStore({ instances: [instance()] }, async (store, control) => {
    const before = store.getSnapshot().instances[0].config
    const draft = { text: 'saved', nested: { labels: ['draft'] } }
    const gate = deferred()
    control.gateNext = gate
    const saving = store.saveInstanceConfig('notes-1', definition(), draft)
    draft.text = 'mutated after submit'
    draft.nested.labels.push('external mutation')
    assert.equal(store.getSnapshot().workbenchBusy, true)
    assert.strictEqual(store.getSnapshot().instances[0].config, before)
    await setImmediate()
    assert.equal(control.writes.length, 1)
    assert.equal(control.persisted.instances[0].config.text, 'initial')
    gate.resolve()
    await saving
    assert.equal(store.getSnapshot().workbenchBusy, false)
    assert.deepEqual(store.getSnapshot().instances[0].config, { text: 'saved', nested: { labels: ['draft'] } })
    assert.deepEqual(control.persisted.instances[0].config, store.getSnapshot().instances[0].config)
  })
})

test('failed config write preserves config, exposes diagnostic, and a later retry succeeds', async () => {
  await withStore({ instances: [instance()] }, async (store, control) => {
    const original = store.getSnapshot().instances[0]
    control.failNext = new Error('disk full diagnostic')
    await assert.rejects(store.saveInstanceConfig('notes-1', definition(), { text: 'unsaved' }), /disk full diagnostic/)
    assert.strictEqual(store.getSnapshot().instances[0], original)
    assert.equal(control.persisted.instances[0].config.text, 'initial')
    assert.equal(store.getSnapshot().workbenchBusy, false)
    assert.equal(store.getSnapshot().storage.status, 'write-error')
    assert.match(store.getSnapshot().storage.error.message, /disk full/)
    await store.saveInstanceConfig('notes-1', definition(), { text: 'retry' })
    assert.equal(store.getSnapshot().instances[0].config.text, 'retry')
    assert.equal(control.persisted.instances[0].config.text, 'retry')
    assert.equal(store.getSnapshot().storage.status, 'ready')
  })
})

test('invalid config is rejected before busy state or network persistence', async () => {
  await withStore({ instances: [instance()] }, async (store, control) => {
    const before = store.getSnapshot()
    await assert.rejects(store.saveInstanceConfig('notes-1', definition(), { text: 123 }), /text must be a string/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
  })
})

test('unknown or mismatched instance definitions reject duplication/config saving without changing state', async () => {
  await withStore({ instances: [instance()] }, async (store, control) => {
    const before = store.getSnapshot()
    const mismatched = definition({ typeId: 'other/widgets:notes' })
    assert.throws(() => store.duplicateInstance('notes-1', mismatched, geometry(store), 12), /mismatched definition/)
    assert.throws(() => store.duplicateInstance('unknown', definition(), geometry(store), 12), /Unknown widget instance/)
    await assert.rejects(store.saveInstanceConfig('notes-1', mismatched, { text: 'wrong type' }), /mismatched definition/)
    await assert.rejects(store.saveInstanceConfig('unknown', definition(), { text: 'missing' }), /Unknown widget instance/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
    assert.deepEqual(control.persisted.instances, [instance()])
  })
})

test('instance creation rejects malformed definitions before modifying state or persistence', async () => {
  await withStore({}, async (store, control) => {
    const before = store.getSnapshot()
    for (const def of [definition({ typeId: 'unqualified' }), definition({ apiVersion: 2 }),
      definition({ defaults: { minWidth: 2 } }), definition({ defaultConfig: () => ({ text: 1 }) })]) {
      assert.throws(() => store.addInstance(def, [], 12), /homeWidgets:/)
      assert.strictEqual(store.getSnapshot(), before)
    }
    assert.equal(control.writes.length, 0)
    assert.deepEqual(control.persisted.instances, [])
  })
})

test('queued document writes cannot let an old layout response overwrite a newer config save', async () => {
  await withStore({ instances: [instance()] }, async (store, control) => {
    store.setSize('notes-1', 'l')
    const gate = deferred()
    control.gateNext = gate
    const flushing = store.flushLayout()
    await setImmediate()
    assert.equal(control.writes.length, 1)
    const saving = store.saveInstanceConfig('notes-1', definition(), { text: 'new config' })
    await setImmediate()
    assert.equal(control.writes.length, 1, 'second network write must wait for first')
    gate.resolve()
    await Promise.all([flushing, saving])
    assert.equal(control.writes.length, 2)
    assert.equal(control.writes[0].instances[0].config.text, 'initial')
    assert.equal(control.writes[1].instances[0].config.text, 'new config')
    assert.equal(control.persisted.instances[0].config.text, 'new config')
    assert.equal(store.getSnapshot().instances[0].config.text, 'new config')
    assert.equal(control.persisted.layout.size['notes-1'], 'l')
    assert.equal(store.getSnapshot().layout.size['notes-1'], 'l')
  })
})

test('remove clears identity from order, hidden, size and every breakpoint without touching siblings', async () => {
  const rect = { x: 0, y: 0, w: 2, h: 4 }
  const layout = { ...emptyLayout(), instanceLayout: true, order: ['notes-1', 'notes-2'], focusOrder: ['notes-1'],
    hidden: ['notes-1'], size: { 'notes-1': 's', 'notes-2': 'm' },
    positions: Object.fromEntries(['12', '6', '2'].map(cols => [cols, { 'notes-1': rect, 'notes-2': { ...rect, y: 4 } }])) }
  await withStore({ layout, instances: [instance(), instance('notes-2')] }, async (store, control) => {
    store.removeInstance('notes-1')
    await store.flushLayout()
    assert.deepEqual(control.persisted.instances.map(item => item.instanceId), ['notes-2'])
    assert.deepEqual(control.persisted.layout.order, ['notes-2'])
    assert.deepEqual(control.persisted.layout.focusOrder, [])
    assert.deepEqual(control.persisted.layout.hidden, [])
    assert.deepEqual(control.persisted.layout.size, { 'notes-2': 'm' })
    for (const rows of Object.values(control.persisted.layout.positions)) assert.deepEqual(Object.keys(rows), ['notes-2'])
  })
})

test('hide and restore retain instance/config and relocate only the restored card if its saved spot is occupied', async () => {
  await withStore({ instances: [instance(), instance('notes-2')] }, async (store, control) => {
    const metas = ['notes-1', 'notes-2'].map(id => ({ id, defaultSize: 's', defaultHeight: 4 }))
    const firstGeometry = geometry(store)
    store.setSpatialLayout(firstGeometry, 12)
    store.toggleSpatialHidden('notes-1', firstGeometry, metas, 12)
    assert.ok(store.getSnapshot().layout.hidden.includes('notes-1'))
    assert.equal(store.getSnapshot().instances.length, 2)
    const savedFirst = firstGeometry.find(item => item.i === 'notes-1')
    const movedSibling = { ...firstGeometry.find(item => item.i === 'notes-2'), x: savedFirst.x, y: savedFirst.y }
    store.setSpatialLayout([movedSibling], 12)
    store.toggleSpatialHidden('notes-1', [movedSibling], metas, 12)
    await store.flushLayout()
    assert.deepEqual(control.persisted.layout.hidden, [])
    assert.deepEqual(control.persisted.layout.positions['12']['notes-2'], { x: movedSibling.x, y: movedSibling.y, w: movedSibling.w, h: movedSibling.h })
    const restored = control.persisted.layout.positions['12']['notes-1']
    assert.ok(restored.x !== movedSibling.x || restored.y !== movedSibling.y)
    assert.deepEqual(control.persisted.instances, [instance(), instance('notes-2')])
  })
})

test('registry migration failure or absent type preserves raw instances and causes no migration write', async () => {
  const saved = [instance('old', { text: 'raw', nested: { labels: ['keep'] } }),
    { ...instance('missing'), typeId: 'missing:extension', configVersion: 7 }]
  await withStore({ instances: saved }, async (store, control) => {
    const registry = new HomeWidgetRegistry()
    registry.register(definition({ configVersion: 2, migrateConfig: config => {
      config.nested.labels.push('must not leak')
      throw new Error('cannot migrate')
    } }))
    const before = store.getSnapshot().instances
    store.reconcileDefinitions(registry)
    assert.strictEqual(store.getSnapshot().instances[0], before[0])
    assert.strictEqual(store.getSnapshot().instances[1], before[1])
    assert.deepEqual(store.getSnapshot().instances, saved)
    assert.equal(control.writes.length, 0)
    await store.flushLayout()
    assert.deepEqual(control.persisted.instances, saved)
  })
})

test('successful migration persists new version/config without erasing unavailable siblings', async () => {
  const missing = { ...instance('missing'), typeId: 'missing:extension', configVersion: 7 }
  await withStore({ instances: [instance(), missing] }, async (store, control) => {
    const registry = new HomeWidgetRegistry()
    registry.register(definition({ configVersion: 2, migrateConfig: config => ({ ...config, text: 'migrated' }) }))
    store.reconcileDefinitions(registry)
    await store.flushLayout()
    assert.equal(control.persisted.instances[0].configVersion, 2)
    assert.equal(control.persisted.instances[0].config.text, 'migrated')
    assert.deepEqual(control.persisted.instances[1], missing)
  })
})

test('read-only workbench refuses adding, removing and config saves without sending writes', async () => {
  await withStore({ instances: [instance()], storage: { writable: false, status: 'read-only', error: { code: 'corrupt-state', message: 'Saved state needs recovery' } } }, async (store, control) => {
    assert.throws(() => store.addInstance(definition(), [], 12), /needs recovery/)
    assert.throws(() => store.removeInstance('notes-1'), /needs recovery/)
    await assert.rejects(store.saveInstanceConfig('notes-1', definition(), { text: 'no' }), /needs recovery/)
    assert.equal(control.writes.length, 0)
    assert.equal(store.getSnapshot().instances[0].config.text, 'initial')
  })
})
