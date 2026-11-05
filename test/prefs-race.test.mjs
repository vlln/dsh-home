import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { HomeStore } from '../src/client/store.ts'
import { HomeApiError, emptyLayout, post } from '../src/client/api.ts'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'

const READY = { writable: true, status: 'ready', error: null }
const READONLY = { writable: false, status: 'read-only', error: { code: 'state-version', message: 'Saved version is unsupported' } }
const originalPrefs = () => ({ lastSeenAt: 5, dismissed: { existing: 123 } })
const definition = (overrides = {}) => ({ typeId: 'test/widgets:notes', apiVersion: 1, title: 'Notes', configVersion: 1,
  defaultConfig: () => ({ text: 'old' }), validateConfig: config => typeof config.text === 'string', Content: () => null, ...overrides })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function harness(run, { delayedPrefs = false, initialStorage = READY } = {}) {
  const originals = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  const timers = new Set(); const calls = []; const prefsGate = deferred()
  const control = { prefsError: false, writeReadonly: false, writeGate: null }
  let store
  globalThis.setTimeout = fn => { const handle = { fn }; timers.add(handle); return handle }
  globalThis.clearTimeout = handle => { timers.delete(handle) }
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body); calls.push(body)
    let value
    if (body.op === 'snapshot') value = { scanning: false, scannedAt: 1, sessions: [] }
    else if (body.op === 'workbench.get') value = { layout: emptyLayout(), instances: [{ instanceId: 'notes', typeId: 'test/widgets:notes', configVersion: 1, config: { text: 'old' } }], storage: initialStorage }
    else if (body.op === 'prefs.get') {
      if (delayedPrefs) await prefsGate.promise
      if (control.prefsError) throw new Error('prefs load unavailable')
      value = { prefs: originalPrefs() }
    } else if (body.op === 'workbench.set' || body.op === 'prefs.set') {
      if (control.writeGate) await control.writeGate.promise
      if (control.writeReadonly) return { ok: false, status: 409, json: async () => ({ ok: false, error: { code: 'state-read-only', message: 'Do not overwrite future state' }, storage: READONLY }) }
      value = body.op === 'prefs.set' ? { prefs: body.prefs } : { layout: body.layout, instances: body.instances, storage: READY }
    } else throw new Error(`unexpected operation ${body.op}`)
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  const drainTimers = async () => {
    for (const handle of [...timers]) { timers.delete(handle); handle.fn() }
    await setImmediate()
  }
  try {
    store = new HomeStore(); await setImmediate()
    await run({ store, calls, timers, control, prefsGate, drainTimers })
  } finally {
    store?.dispose(); Object.assign(globalThis, originals)
  }
}

test('slow preferences cannot be overwritten by markSeen or dismiss before loading', async () => harness(async ({ store, calls, prefsGate, drainTimers }) => {
  assert.equal(store.getSnapshot().prefsLoaded, false)
  store.markSeen(); store.dismiss('new')
  await drainTimers()
  assert.deepEqual(calls.map(call => call.op), ['snapshot', 'workbench.get', 'prefs.get'])
  prefsGate.resolve(); await setImmediate()
  assert.equal(store.getSnapshot().prefsLoaded, true)
  assert.deepEqual(store.getSnapshot().prefs, originalPrefs())
  store.markSeen(); store.dismiss('new'); await drainTimers()
  const saved = calls.find(call => call.op === 'prefs.set').prefs
  assert.equal(saved.dismissed.existing, 123)
  assert.equal(typeof saved.dismissed.new, 'number')
  assert.ok(saved.lastSeenAt > 5)
}, { delayedPrefs: true }))

test('failed prefs reads leave preference writes disabled until a successful explicit retry', async () => harness(async ({ store, calls, control, prefsGate, drainTimers }) => {
  control.prefsError = true; prefsGate.resolve(); await setImmediate()
  store.markSeen(); store.dismiss('new'); await drainTimers()
  assert.equal(store.getSnapshot().prefsLoaded, false)
  assert.equal(calls.filter(call => call.op === 'prefs.set').length, 0)
  control.prefsError = false; await store.loadPrefs()
  store.dismiss('new'); await drainTimers()
  assert.equal(calls.find(call => call.op === 'prefs.set').prefs.dismissed.existing, 123)
}, { delayedPrefs: true }))

test('initial read-only storage prevents markSeen, dismiss and preference timers', async () => harness(async ({ store, calls, drainTimers }) => {
  const before = store.getSnapshot().prefs
  store.markSeen(); store.dismiss('new'); await drainTimers()
  assert.equal(store.getSnapshot().prefs, before)
  assert.equal(calls.filter(call => call.op === 'prefs.set').length, 0)
}, { initialStorage: READONLY }))

test('typed readonly workbench failure disables editor, queued requests and pending preference saves', async () => harness(async ({ store, calls, control, timers, drainTimers }) => {
  store.dismiss('new')
  const staleTimers = [...timers]
  control.writeReadonly = true
  const first = store.flushLayout()
  const second = store.flushLayout()
  await assert.rejects(first, error => error instanceof HomeApiError && error.code === 'state-read-only' && error.storage.writable === false)
  await assert.rejects(second, { code: 'state-read-only' })
  assert.equal(store.getSnapshot().storage.writable, false)
  assert.equal(store.getSnapshot().storage.status, 'read-only')
  assert.equal(calls.filter(call => call.op === 'workbench.set').length, 1)
  assert.equal(timers.size, 0)
  // A timer already dispatched by the event loop still rechecks writability.
  for (const timer of staleTimers) timer.fn()
  await drainTimers()
  assert.equal(calls.filter(call => call.op === 'prefs.set').length, 0)
}))

test('readonly preference failure is exposed and blocks later preference mutations', async () => harness(async ({ store, control, drainTimers }) => {
  control.writeReadonly = true
  store.dismiss('new'); await drainTimers()
  assert.equal(store.getSnapshot().storage.writable, false)
  const before = store.getSnapshot().prefs
  store.markSeen(); store.dismiss('later')
  assert.equal(store.getSnapshot().prefs, before)
}))

test('legacy definitions can be explicitly added without automatic instance installation', async () => harness(async ({ store }) => {
  const registry = new HomeWidgetRegistry()
  registry.register(definition({ typeId: 'legacy:weather' }), { internalLegacyTypeId: true })
  store.addInstance(registry.get('legacy:weather'), [], 12)
  assert.equal(store.getSnapshot().instances.at(-1).typeId, 'legacy:weather')
}))

test('definition update received during settings save retries migration when busy ends', async () => harness(async ({ store, control }) => {
  const registry = new HomeWidgetRegistry()
  const old = definition()
  const unregister = registry.register(old)
  store.reconcileDefinitions(registry)
  control.writeGate = deferred()
  const save = store.saveInstanceConfig('notes', old, { text: 'saved' })
  await setImmediate()
  assert.equal(store.getSnapshot().workbenchBusy, true)
  unregister()
  registry.register(definition({ configVersion: 2, migrateConfig: config => ({ text: `${config.text}-migrated` }) }))
  store.reconcileDefinitions(registry)
  assert.equal(store.getSnapshot().instances[0].configVersion, 1)
  control.writeGate.resolve(); await save
  assert.equal(store.getSnapshot().instances[0].configVersion, 2)
  assert.equal(store.getSnapshot().instances[0].config.text, 'saved-migrated')
}))
