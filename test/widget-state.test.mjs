import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { apply, createHomeService } from '../src/index.mjs'
import { emptyState, loadState, saveState, stateFile, stateStorage } from '../src/state.mjs'
import { BUILTIN_WIDGET_IDS, initialInstances, validateInstances } from '../src/widget-state.mjs'

const layout = (overrides = {}) => ({ order: [], focusOrder: [], hidden: [], size: {}, ...overrides })
const instance = (instanceId = 'one', overrides = {}) => ({ instanceId, typeId: '@example/widgets:clock', configVersion: 1, config: {}, ...overrides })
const rect = (x, y, w, h = 4) => ({ x, y, w, h })

async function isolated(run) {
  const previous = process.env.DSH_HOME
  const home = mkdtempSync(path.join(tmpdir(), 'dsh-home-widget-state-'))
  process.env.DSH_HOME = home
  try { return await run(home) } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    // Only remove the exact directory created above, never the real DSH_HOME.
    assert.equal(path.dirname(home), tmpdir().replace(/\/$/, ''))
    assert.ok(path.basename(home).startsWith('dsh-home-widget-state-'))
    rmSync(home, { recursive: true, force: true })
  }
}
function put(value) {
  mkdirSync(path.dirname(stateFile()), { recursive: true })
  writeFileSync(stateFile(), typeof value === 'string' ? value : JSON.stringify(value))
}
function route() {
  let handler
  const ctx = { inject() {}, get() { return { register(value) { handler = value.handler; return () => {} } } }, effect(fn) { fn() } }
  apply(ctx)
  return async body => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))])
    req.method = 'POST'
    req.headers = { host: 'localhost' }
    let status
    let response
    await handler(req, { writeHead(value) { status = value }, end(value) { response = JSON.parse(value) } })
    return { status, ...response }
  }
}

test('v3 defaults initialize deterministically once and removed defaults never return', async () => isolated(() => {
  assert.deepEqual(loadState(), emptyState())
  assert.equal(stateStorage(loadState()).writable, true)
  assert.deepEqual(initialInstances().map(item => item.instanceId), BUILTIN_WIDGET_IDS)
  assert.throws(() => readFileSync(stateFile()), { code: 'ENOENT' })
  const service = createHomeService({})
  const only = [instance('recent', { typeId: '@vlln/dsh-home:recent' })]
  service.setWorkbench({ layout: null, instances: only })
  assert.deepEqual(loadState().instances, only)
  assert.deepEqual(createHomeService({}).getWorkbench().instances, only)
  service.setWorkbench({ layout: null, instances: [] })
  assert.deepEqual(loadState().instances, [])
}))

test('v2 migration preserves all geometry, optional layout shape, prefs and absent external IDs, deferring backup/write', async () => isolated(() => {
  const old = { version: 2, layout: layout({
    order: ['tasks', 'old-order'], focusOrder: ['resume', 'old-focus'], hidden: ['old-hidden'], size: { 'old-size': 'l' },
    positions: { 12: { 'old-desktop': rect(5, 90, 7) }, 6: { 'old-tablet': rect(0, 44, 6) }, 2: { 'old-mobile': rect(0, 10000, 2, 30) } },
  }), prefs: { lastSeenAt: 101, dismissed: { absent: 99 }, extensionPreference: { preserve: true } }, custom: 'retained' }
  const bytes = JSON.stringify(old, null, 2)
  put(bytes)
  const migrated = loadState()
  assert.equal(migrated.version, 3)
  assert.deepEqual(migrated.layout, old.layout)
  assert.deepEqual(migrated.prefs, old.prefs)
  assert.equal(migrated.custom, 'retained')
  assert.equal(stateStorage(migrated).status, 'migrated')
  assert.equal(readFileSync(stateFile(), 'utf8'), bytes)
  assert.throws(() => readFileSync(`${stateFile()}.v2.bak`), { code: 'ENOENT' })
  for (const id of ['old-order', 'old-focus', 'old-hidden', 'old-size', 'old-desktop', 'old-tablet', 'old-mobile']) {
    assert.deepEqual(migrated.instances.find(item => item.instanceId === id), instance(id, { typeId: `legacy:${id}` }))
  }
  const service = createHomeService({})
  service.setPrefs({ lastSeenAt: 202, dismissed: { absent: 199 } })
  assert.equal(readFileSync(`${stateFile()}.v2.bak`, 'utf8'), bytes)
  assert.deepEqual(loadState().layout, old.layout)
  assert.deepEqual(loadState().instances, migrated.instances)
  assert.deepEqual(loadState().prefs.extensionPreference, { preserve: true })
}))

test('malformed migration and future versions are read-only, byte preserved even through prefs markSeen and direct save', async () => {
  for (const saved of ['{broken', JSON.stringify({ version: 77, layout: { future: true }, prefs: { lastSeenAt: 4 }, instances: [] }), JSON.stringify({ version: 2, layout: layout({ positions: { 12: { missing: rect(0, -1, 4) } } }), prefs: { lastSeenAt: 1, dismissed: {} } })]) {
    await isolated(async () => {
      put(saved)
      const service = createHomeService({})
      assert.equal(service.getWorkbench().storage.writable, false)
      assert.equal(service.getWorkbench().storage.status, 'read-only')
      assert.throws(() => service.setPrefs({ lastSeenAt: Date.now(), dismissed: {} }), { code: 'state-read-only' })
      assert.throws(() => service.setWorkbench({ layout: null, instances: [] }), { code: 'state-read-only' })
      assert.throws(() => saveState(emptyState()), { code: 'state-read-only' })
      const call = route()
      const get = await call({ op: 'workbench.get' })
      assert.equal(get.status, 200)
      assert.equal(get.value.storage.writable, false)
      assert.ok(get.value.storage.error.code)
      for (const op of ['workbench.set', 'layout.set', 'prefs.set']) {
        const response = await call({ op, layout: layout(), instances: [], prefs: { lastSeenAt: 42 } })
        assert.equal(response.ok, false)
        assert.equal(response.error.code, 'state-read-only')
      }
      assert.equal(readFileSync(stateFile(), 'utf8'), saved)
    })
  }
})

test('workbench, compatibility layout and prefs commits preserve each other, returning detached canonical values', async () => isolated(async () => {
  const call = route()
  const configs = [instance('clock-A', { config: { timeZone: 'UTC', nested: [true, null, 3] } }), instance('clock-B')]
  const geometry = layout({ instanceLayout: true, order: ['clock-A', 'clock-B'], hidden: ['clock-B'], positions: { 2: { 'clock-A': rect(0, 30, 2) } } })
  const response = await call({ op: 'workbench.set', layout: geometry, instances: configs })
  assert.equal(response.status, 200)
  assert.deepEqual(response.value.layout, geometry)
  assert.deepEqual(response.value.instances, configs)
  assert.equal(response.value.storage.status, 'ready')
  await call({ op: 'prefs.set', prefs: { lastSeenAt: 99, dismissed: { test: 20 } } })
  await call({ op: 'layout.set', layout: layout({ order: ['clock-B'], hidden: ['clock-A'] }) })
  assert.deepEqual(loadState().instances, configs)
  assert.deepEqual(loadState().prefs, { lastSeenAt: 99, dismissed: { test: 20 } })
  const service = createHomeService({})
  const fetched = service.getWorkbench()
  fetched.instances[0].config.timeZone = 'changed'
  assert.equal(service.getWorkbench().instances[0].config.timeZone, 'UTC')
}))

test('instance requests strictly reject duplicates, invalid types, excessive count, depth, bytes and JSON', () => {
  const cycle = {}; cycle.loop = cycle
  let deep = {}; for (let i = 0; i < 10; i++) deep = { child: deep }
  const invalid = [null, {}, [instance(), instance()], Array.from({ length: 65 }, (_, i) => instance(`id-${i}`)),
    [instance('', {})], [instance('one', { extra: true })], [instance('one', { typeId: 'unnamespaced' })],
    [instance('one', { configVersion: 0 })], [instance('one', { configVersion: 1.2 })],
    [instance('one', { config: { text: 'a'.repeat(8192) } })],
    [instance('one', { config: deep })], [instance('one', { config: cycle })], [instance('one', { config: { bad: undefined } })],
    [instance('one', { config: { bad: Infinity } })], [instance('one', { config: { bad: new Date() } })],
  ]
  for (const value of invalid) assert.throws(() => validateInstances(value), { code: 'bad-workbench' })
  const protoConfig = JSON.parse('{"__proto__":{"safe":true},"constructor":4}')
  assert.throws(() => validateInstances([instance('safe', { config: protoConfig })]), { code: 'bad-workbench' })
  for (const config of [[], [1, 'two', null], null, true, 10, 'text']) {
    assert.deepEqual(validateInstances([instance('root', { config })])[0].config, config)
  }
  assert.equal(Object.prototype.safe, undefined)
})

test('validation is all-or-nothing and concurrent API calls return their canonical saved snapshot', async () => isolated(async () => {
  const call = route()
  await call({ op: 'workbench.set', layout: layout({ order: ['one'] }), instances: [instance()] })
  const before = readFileSync(stateFile(), 'utf8')
  for (const change of [
    { layout: layout({ order: ['missing'] }), instances: [instance()] },
    { layout: layout(), instances: [instance(), instance()] },
    { layout: layout({ positions: { 12: { one: rect(0, -1, 4) } } }), instances: [instance()] },
  ]) {
    const failed = await call({ op: 'workbench.set', ...change })
    assert.equal(failed.status, 400)
    assert.equal(failed.ok, false)
    assert.equal(readFileSync(stateFile(), 'utf8'), before)
  }
  const responses = await Promise.all(['A', 'B'].map(id => call({ op: 'workbench.set', layout: layout({ order: [id] }), instances: [instance(id)] })))
  responses.forEach((response, i) => assert.equal(response.value.instances[0].instanceId, ['A', 'B'][i]))
  assert.equal(loadState().instances[0].instanceId, 'B')
}))

test('real filesystem write failures propagate to API and roll back layout, instances and prefs', async () => isolated(async () => {
  const service = createHomeService({})
  service.setWorkbench({ layout: layout({ order: ['one'] }), instances: [instance()] })
  const before = service.state
  const bytes = readFileSync(stateFile(), 'utf8')
  // A directory at the staging filename forces a real write failure, even as root.
  mkdirSync(`${stateFile()}.tmp`)
  assert.throws(() => service.setWorkbench({ layout: null, instances: [] }), { code: 'state-write-error' })
  assert.deepEqual(service.state, before)
  assert.throws(() => service.setLayout(layout()), { code: 'state-write-error' })
  assert.deepEqual(service.state, before)
  assert.throws(() => service.setPrefs({ lastSeenAt: 100 }), { code: 'state-write-error' })
  assert.deepEqual(service.state, before)
  assert.equal(readFileSync(stateFile(), 'utf8'), bytes)
  assert.equal(service.getWorkbench().storage.status, 'write-error')
  const call = route()
  const response = await call({ op: 'workbench.set', layout: null, instances: [] })
  assert.equal(response.status, 500)
  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'state-write-error')
  assert.equal((await call({ op: 'workbench.get' })).value.instances[0].instanceId, 'one')
  renameSync(`${stateFile()}.tmp`, `${stateFile()}.blocked`)
  service.setPrefs({ lastSeenAt: 120 })
  assert.equal(service.getWorkbench().storage.status, 'ready')
  assert.equal(loadState().prefs.lastSeenAt, 120)
}))

test('over-capacity v2 migration refuses writes rather than silently truncating absent external IDs', async () => isolated(() => {
  const external = Array.from({ length: 64 }, (_, index) => `removed:${index}`)
  const old = JSON.stringify({ version: 2, layout: layout({ hidden: external }), prefs: { lastSeenAt: 8, dismissed: {} } })
  put(old)
  const service = createHomeService({})
  assert.equal(service.getWorkbench().storage.writable, false)
  assert.equal(service.getWorkbench().storage.error.code, 'state-corrupt')
  assert.throws(() => service.setPrefs({ lastSeenAt: 10 }), { code: 'state-read-only' })
  assert.equal(readFileSync(stateFile(), 'utf8'), old)
}))

test('oversized full documents fail before save instead of becoming unreadable on reload', async () => isolated(() => {
  const service = createHomeService({})
  service.setWorkbench({ layout: null, instances: [] })
  const before = readFileSync(stateFile(), 'utf8')
  const dismissed = Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`${i}-${'s'.repeat(100)}`, i]))
  assert.throws(() => service.setPrefs({ lastSeenAt: 10, dismissed }), { code: 'state-write-error' })
  assert.equal(readFileSync(stateFile(), 'utf8'), before)
  assert.deepEqual(service.getPrefs(), { lastSeenAt: null, dismissed: {} })
  assert.equal(stateStorage(loadState()).writable, true)
}))

test('a future disk document appearing after service load is protected on the next commit', async () => isolated(() => {
  const service = createHomeService({})
  const future = '{"version":999,"futureData":"must survive"}'
  put(future)
  assert.throws(() => service.setPrefs({ lastSeenAt: 10 }), { code: 'state-read-only' })
  assert.equal(service.getWorkbench().storage.writable, false)
  assert.equal(readFileSync(stateFile(), 'utf8'), future)
}))
