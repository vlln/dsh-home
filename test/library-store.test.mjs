/** Real HomeStore external-library transactions using the widget-instance-store HTTP-envelope harness pattern. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { HomeStore } from '../src/client/store.ts'
import { emptyLayout, emptyPrefs } from '../src/client/api.ts'

const READY = { writable: true, status: 'ready', error: null }
const definition = (overrides = {}) => ({
  typeId: 'test/library:notes', apiVersion: 1, title: 'Notes', configVersion: 1,
  defaults: { size: 's', height: 4 }, Content: () => null,
  defaultConfig: () => ({ text: 'new', nested: { labels: [] } }),
  validateConfig: config => typeof config?.text === 'string' || 'text must be a string',
  ...overrides,
})
const instance = (instanceId, overrides = {}) => ({ instanceId, typeId: 'test/library:notes', configVersion: 1,
  config: { text: instanceId, nested: { labels: [instanceId] } }, ...overrides })
const item = (i, x = 0, y = 0, w = 4, h = 4) => ({ i, x, y, w, h, minW: 3, minH: 3, maxW: 12 })
const rect = ({ x, y, w, h }) => ({ x, y, w, h })
const ledger = () => ({ generatedAt: 1, scannedAt: 1, scanning: false, progress: { done: 0, total: 0 },
  sessionCount: 0, days: [], sessions: [], today: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
  week: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 } })
function deferred() {
  let resolve
  const promise = new Promise(yes => { resolve = yes })
  return { promise, resolve }
}
async function withStore(document, callback) {
  const originalFetch = globalThis.fetch
  let store
  let persisted = structuredClone({ layout: emptyLayout(), instances: [], storage: READY, ...document })
  const control = { writes: [], failNext: null, gateNext: null,
    get persisted() { return structuredClone(persisted) } }
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    let value
    switch (body.op) {
      case 'snapshot': value = ledger(); break
      case 'prefs.get': value = emptyPrefs(); break
      case 'workbench.get': value = structuredClone(persisted); break
      case 'workbench.set': {
        control.writes.push(structuredClone(body))
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
      default: throw new Error(`Unexpected library-store test op: ${body.op}`)
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

function document() {
  return {
    instances: [instance('notes'), instance('tasks'), instance('hidden'),
      instance('unavailable', { typeId: 'unavailable:plugin', configVersion: 7, config: { raw: ['preserve'] } })],
    layout: { ...emptyLayout(), instanceLayout: true, order: ['notes', 'tasks', 'hidden', 'unavailable'],
      focusOrder: ['tasks'], hidden: ['hidden'], size: { notes: 'm', hidden: 'l' },
      positions: {
        '12': { notes: { x: 0, y: 0, w: 4, h: 4 }, tasks: { x: 4, y: 0, w: 4, h: 4 },
          hidden: { x: 0, y: 0, w: 8, h: 5 }, unavailable: { x: 8, y: 0, w: 4, h: 4 },
          'orphan-position': { x: 0, y: 20, w: 4, h: 4 } },
        '6': { notes: { x: 0, y: 10, w: 3, h: 7 }, hidden: { x: 3, y: 0, w: 3, h: 4 } },
        '2': { tasks: { x: 0, y: 4, w: 2, h: 9 } },
      } },
  }
}
const accepted = () => [item('notes', 0, 4), item('tasks', 4, 0), item('unavailable', 8, 0), item('new', 0, 0)]

test('accepted new instance and displaced peers publish once and persist as one full document, preserving unrelated state', async () => {
  const input = document()
  const sharedConfig = { text: 'default', nested: { labels: ['new'] } }
  await withStore(input, async (store, control) => {
    const before = store.getSnapshot()
    const notifications = []
    const off = store.subscribe(() => notifications.push(store.getSnapshot()))
    const proposal = accepted()
    const savedProposal = structuredClone(proposal)
    const def = definition({ defaultConfig: () => sharedConfig })
    store.dropInstance(def, 'new', proposal, 12)
    off()
    assert.equal(notifications.length, 1, 'no intermediate first-fit instance or layout notification')
    const after = notifications[0]
    assert.equal(after.instances.length, before.instances.length + 1)
    assert.equal(after.layout.positions['12'].notes.y, 4, 'displaced peer moves in same publication as new card')
    assert.deepEqual(after.layout.positions['12'].new, rect(proposal[3]))
    assert.deepEqual(after.layout.order, ['notes', 'tasks', 'hidden', 'unavailable', 'new'], 'generic order is not legacy-reordered')
    assert.equal(after.layout.instanceLayout, true)
    assert.deepEqual(after.instances.slice(0, -1), input.instances)
    for (const [index, original] of before.instances.entries()) assert.strictEqual(after.instances[index], original)
    assert.deepEqual(after.instances.at(-1), { instanceId: 'new', typeId: def.typeId, configVersion: 1, config: sharedConfig })
    assert.notStrictEqual(after.instances.at(-1).config.nested, sharedConfig.nested)
    assert.deepEqual(after.layout.hidden, input.layout.hidden)
    assert.deepEqual(after.layout.focusOrder, input.layout.focusOrder)
    assert.deepEqual(after.layout.size, input.layout.size)
    assert.deepEqual(after.layout.positions['6'], input.layout.positions['6'])
    assert.deepEqual(after.layout.positions['2'], input.layout.positions['2'])
    assert.deepEqual(after.layout.positions['12'].hidden, input.layout.positions['12'].hidden)
    assert.deepEqual(after.layout.positions['12']['orphan-position'], input.layout.positions['12']['orphan-position'])
    assert.deepEqual(proposal, savedProposal, 'store never mutates solver output')
    assert.equal(control.writes.length, 0)
    proposal[0].y = 900
    proposal[3].x = 9
    sharedConfig.nested.labels.push('caller mutation')
    assert.equal(after.layout.positions['12'].notes.y, 4)
    assert.equal(after.layout.positions['12'].new.x, 0)
    assert.deepEqual(after.instances.at(-1).config.nested.labels, ['new'])
    await store.flushLayout()
    assert.equal(control.writes.length, 1)
    assert.deepEqual(control.persisted.layout, after.layout)
    assert.deepEqual(control.persisted.instances, after.instances)
    assert.deepEqual(before.layout, input.layout, 'prior state snapshot remains immutable')
  })
})

for (const cols of [12, 6, 2]) {
  test(`empty workbench accepts an exact ${cols}-column drop with no invented first-fit placement`, async () => {
    await withStore({}, async (store, control) => {
      const proposal = [item('new', 0, 14, cols === 12 ? 4 : cols === 6 ? 3 : 2, 4)]
      store.dropInstance(definition(), 'new', proposal, cols)
      await store.flushLayout()
      assert.deepEqual(control.persisted.layout.positions[String(cols)].new, rect(proposal[0]))
      assert.deepEqual(control.persisted.layout.order, ['new'])
      assert.equal(control.persisted.instances[0].instanceId, 'new')
    })
  })
}

const malformed = [
  ['omitted visible peer', value => value.filter(entry => entry.i !== 'tasks')],
  ['omitted unavailable peer', value => value.filter(entry => entry.i !== 'unavailable')],
  ['missing new instance', value => value.filter(entry => entry.i !== 'new')],
  ['duplicate peer identity', value => value.map(entry => entry.i === 'tasks' ? { ...entry, i: 'notes' } : entry)],
  ['substituted unknown peer', value => value.map(entry => entry.i === 'tasks' ? { ...entry, i: 'unknown' } : entry)],
  ['extra hidden peer', value => [...value, item('hidden', 0, 12)]],
  ['extra arbitrary identity', value => [...value, item('arbitrary', 0, 12)]],
  ['overlapping peer', value => value.map(entry => entry.i === 'tasks' ? { ...entry, x: 0, y: 0 } : entry)],
  ...Object.entries({ x: -1, y: -1, w: 2, h: 2 }).map(([key, invalid]) => [`invalid ${key}`, value => value.map(entry => entry.i === 'new' ? { ...entry, [key]: invalid } : entry)]),
  ['fractional x', value => value.map(entry => entry.i === 'new' ? { ...entry, x: 0.5 } : entry)],
  ['NaN y', value => value.map(entry => entry.i === 'new' ? { ...entry, y: NaN } : entry)],
  ['infinite h', value => value.map(entry => entry.i === 'new' ? { ...entry, h: Infinity } : entry)],
  ['right overflow', value => value.map(entry => entry.i === 'new' ? { ...entry, x: 10 } : entry)],
  ['bottom overflow', value => value.map(entry => entry.i === 'new' ? { ...entry, y: 10000 } : entry)],
  ['excessive height', value => value.map(entry => entry.i === 'new' ? { ...entry, y: 100, h: 31 } : entry)],
]
for (const [label, change] of malformed) {
  test(`malformed/stale drop rejects ${label} without publication or persistence`, async () => {
    const input = document()
    await withStore(input, async (store, control) => {
      const before = store.getSnapshot()
      let notifications = 0
      const off = store.subscribe(() => notifications++)
      assert.throws(() => store.dropInstance(definition(), 'new', change(accepted()), 12), /drop|preset dimensions/i)
      off()
      assert.strictEqual(store.getSnapshot(), before)
      assert.equal(notifications, 0)
      await setImmediate()
      assert.equal(control.writes.length, 0)
      assert.deepEqual(control.persisted.instances, input.instances)
      assert.deepEqual(control.persisted.layout, input.layout)
    })
  })
}

for (const cols of [0, 1, 3, 6.5, 11, 33, NaN, Infinity]) {
  test(`drop rejects malformed/unsupported breakpoint ${cols}`, async () => {
    await withStore({}, async (store, control) => {
      const before = store.getSnapshot()
      assert.throws(() => store.dropInstance(definition(), 'new', [item('new')], cols), /drop|column|breakpoint/i)
      assert.strictEqual(store.getSnapshot(), before)
      assert.equal(control.writes.length, 0)
    })
  })
}

test('new-instance dimensions must match the fixed legacy shape rather than bounds or caller metadata', async () => {
  const def = definition({ defaults: { size: 's', height: 5, minWidth: 4, maxWidth: 8, minHeight: 5, maxHeight: 9 } })
  await withStore({}, async (store, control) => {
    const before = store.getSnapshot()
    for (const proposal of [item('new', 0, 0, 3, 5), item('new', 0, 0, 9, 5), item('new', 0, 0, 4, 4), item('new', 0, 0, 4, 10),
      item('new', 0, 0, 4, 6), item('new', 0, 0, 5, 6), item('new', 0, 0, 8, 6)]) {
      assert.throws(() => store.dropInstance(def, 'new', [proposal], 12), /drop|dimension|bound/i)
      assert.strictEqual(store.getSnapshot(), before)
    }
    assert.equal(control.writes.length, 0)
    store.dropInstance(def, 'new', [item('new', 0, 0, 2, 5)], 2)
    await store.flushLayout()
    assert.deepEqual(control.persisted.layout.positions['2'].new, { x: 0, y: 0, w: 2, h: 5 })
  })
})

test('library drops require the widget default even when another declared shape is supported', async () => {
  const def = definition({ defaults: undefined, sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 6 }, { w: 7, h: 9 }] } })
  await withStore({}, async (store, control) => {
    const before = store.getSnapshot()
    assert.throws(() => store.dropInstance(def, 'new', [item('new', 0, 0, 7, 9)], 12), /preset dimensions/i)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
    store.dropInstance(def, 'new', [item('new', 0, 14, 4, 6)], 12)
    await store.flushLayout()
    assert.deepEqual(control.persisted.layout.positions['12'].new, { x: 0, y: 14, w: 4, h: 6 })
  })
})

test('new drops persist arbitrary per-widget object dimensions without legacy size rounding', async () => {
  for (const shape of [{ w: 1, h: 30 }, { w: 5, h: 11 }, { w: 7, h: 9 }]) {
    const def = definition({ defaults: undefined, sizing: { default: shape, supported: [shape, { w: 12, h: 12 }] } })
    for (const cols of [12, 6, 2]) {
      await withStore({}, async (store, control) => {
        const width = cols === 12 ? shape.w : cols === 6 ? shape.w <= 4 ? Math.min(shape.w, 3) : Math.min(shape.w, 6) : Math.min(shape.w, 2)
        const proposal = [item('new', 0, 14, width, shape.h)]
        store.dropInstance(def, 'new', proposal, cols)
        await store.flushLayout()
        assert.deepEqual(control.persisted.layout.positions[String(cols)].new, rect(proposal[0]))
      })
    }
  }
})

test('duplicate/new invalid ids and malformed definitions reject before touching saved instances', async () => {
  await withStore(document(), async (store, control) => {
    const before = store.getSnapshot()
    assert.throws(() => store.dropInstance(definition(), 'notes', accepted(), 12), /Invalid new instance/)
    for (const id of ['', 'has space', '__proto__', 'x'.repeat(121)]) {
      assert.throws(() => store.dropInstance(definition(), id, accepted().map(entry => entry.i === 'new' ? { ...entry, i: id } : entry), 12), /instanceId|Invalid new/)
    }
    for (const def of [definition({ typeId: 'unqualified' }), definition({ apiVersion: 2 }),
      definition({ defaults: { minWidth: 2 } }), definition({ defaultConfig: () => ({ text: 123 }) })]) {
      assert.throws(() => store.dropInstance(def, 'new', accepted(), 12), /homeWidgets:/)
    }
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
  })
})

test('stale visible membership after another instance is added rejects the old drag snapshot', async () => {
  await withStore(document(), async (store, control) => {
    const stale = accepted()
    store.dropInstance(definition(), 'other', [...accepted().filter(entry => entry.i !== 'new'), item('other', 0, 12)], 12)
    await store.flushLayout()
    const before = store.getSnapshot()
    const writes = control.writes.length
    assert.throws(() => store.dropInstance(definition(), 'new', stale, 12), /Stale drop/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, writes)
  })
})

test('read-only, busy and full workbenches reject library drops without a write', async () => {
  await withStore({ storage: { writable: false, status: 'read-only', error: { code: 'corrupt-state', message: 'needs recovery' } } }, async (store, control) => {
    const before = store.getSnapshot()
    assert.throws(() => store.dropInstance(definition(), 'new', [item('new')], 12), /needs recovery/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
  })
  await withStore({ instances: Array.from({ length: 64 }, (_, index) => instance(`peer-${index}`)) }, async (store, control) => {
    const before = store.getSnapshot()
    assert.throws(() => store.dropInstance(definition(), 'new', [item('new')], 12), /Invalid new instance|limit/)
    assert.strictEqual(store.getSnapshot(), before)
    assert.equal(control.writes.length, 0)
  })
  await withStore({ instances: [instance('peer')] }, async (store, control) => {
    const gate = deferred()
    control.gateNext = gate
    const saving = store.saveInstanceConfig('peer', definition(), { text: 'saving' })
    await setImmediate()
    const before = store.getSnapshot()
    try {
      assert.throws(() => store.dropInstance(definition(), 'new', [item('peer', 0, 4), item('new')], 12), /not editable/)
      assert.strictEqual(store.getSnapshot(), before)
      assert.equal(control.writes.length, 1, 'only in-flight config write is sent')
    } finally { gate.resolve(); await saving }
  })
})

test('failed durable drop write preserves coherent optimistic document and retries without duplication', async () => {
  await withStore(document(), async (store, control) => {
    const original = control.persisted
    store.dropInstance(definition(), 'new', accepted(), 12)
    const acceptedState = store.getSnapshot()
    control.failNext = new Error('disk full during drop')
    await assert.rejects(store.flushLayout(), /disk full during drop/)
    assert.deepEqual(control.persisted, original)
    assert.strictEqual(store.getSnapshot().layout, acceptedState.layout)
    assert.strictEqual(store.getSnapshot().instances, acceptedState.instances)
    assert.equal(store.getSnapshot().storage.status, 'write-error')
    await store.flushLayout()
    assert.equal(control.writes.length, 2)
    assert.deepEqual(control.writes[0], control.writes[1])
    assert.deepEqual(control.persisted.layout, acceptedState.layout)
    assert.deepEqual(control.persisted.instances, acceptedState.instances)
    assert.equal(control.persisted.instances.filter(entry => entry.instanceId === 'new').length, 1)
    assert.equal(store.getSnapshot().storage.status, 'ready')
  })
})
