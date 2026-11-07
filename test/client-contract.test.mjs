/** node --experimental-strip-types --test test/client-contract.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { zh, en } from '../src/client/locales.ts'
import { CONNECTION_PATH, emptyLayout, emptyPrefs, fetchLayout, saveLayout } from '../src/client/api.ts'
import { HomeStore } from '../src/client/store.ts'
import { initialInstances } from '../src/widget-state.mjs'

const storage = { writable: true, status: 'ready', error: null }

/** Test-only validator: compare full key sets and placeholder multisets, not just counts. */
function validateLocales(left, right) {
  const keys = Object.keys(left).sort()
  assert.deepEqual(Object.keys(right).sort(), keys, 'locale keys differ')
  const placeholders = value => [...value.matchAll(/\{([^{}]+)\}/gu)].map(match => match[1]).sort()
  for (const key of keys) {
    assert.equal(typeof left[key], 'string', `${key}: left must be a string`)
    assert.equal(typeof right[key], 'string', `${key}: right must be a string`)
    assert.ok(left[key].trim().length > 0, `${key}: left is empty`)
    assert.ok(right[key].trim().length > 0, `${key}: right is empty`)
    assert.deepEqual(placeholders(left[key]), placeholders(right[key]), `${key}: placeholders differ`)
  }
}

function snapshot() {
  return {
    generatedAt: 1000, scannedAt: 1000, scanning: false, progress: { done: 0, total: 0 },
    sessionCount: 0, days: [], sessions: [],
    today: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
    week: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
  }
}

/** Only stub fetch for this callback. Every store is disposed even if an assertion fails. */
async function withStore(layout, callback) {
  const originalFetch = globalThis.fetch
  const calls = []
  let persisted = structuredClone(layout)
  let instances = initialInstances(layout)
  let store
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    calls.push({ url, init, body })
    let value
    switch (body.op) {
      case 'snapshot': value = snapshot(); break
      case 'workbench.get': value = { layout: structuredClone(persisted), instances: structuredClone(instances), storage }; break
      case 'layout.get': value = { layout: structuredClone(persisted) }; break
      case 'prefs.get': value = { prefs: emptyPrefs() }; break
      case 'workbench.set':
        instances = structuredClone(body.instances)
        persisted = structuredClone(body.layout)
        value = { layout: structuredClone(persisted), instances: structuredClone(instances), storage }
        break
      case 'layout.set':
        persisted = structuredClone(body.layout)
        value = { layout: structuredClone(persisted) }
        break
      case 'prefs.set': value = { prefs: body.prefs }; break
      default: throw new Error(`Unexpected operation: ${body.op}`)
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  try {
    store = new HomeStore()
    // Drain the constructor's fulfilled fetch/json chains; no clocks, sleeps or busy polling.
    await setImmediate()
    assert.equal(store.getSnapshot().loading, false)
    assert.equal(store.getSnapshot().error, null)
    assert.deepEqual(calls.map(call => call.body.op), ['snapshot', 'workbench.get', 'prefs.get'])
    for (const { url, init } of calls) {
      assert.equal(url, CONNECTION_PATH)
      assert.equal(init.method, 'POST')
      assert.equal(init.credentials, 'same-origin')
      assert.equal(init.headers['content-type'], 'application/json')
    }
    await callback(store, calls)
  } finally {
    store?.dispose()
    globalThis.fetch = originalFetch
  }
}

test('zh/en dictionaries have identical keys, nonempty text and matching placeholder names', () => {
  validateLocales(zh, en)
  for (const key of ['widget.recent.title', 'widget.tasks.title', 'recent.more', 'recent.count', 'tasks.open']) {
    assert.ok(Object.hasOwn(zh, key), `missing ${key}`)
  }
})

test('locale validator negative controls reject missing/extra keys, empty strings and placeholder drift', () => {
  const reference = { 'test.plain': '文本', 'test.count': '{count} / {total}' }
  validateLocales(reference, { 'test.plain': 'Text', 'test.count': '{total} / {count}' })
  assert.throws(() => validateLocales(reference, { 'test.plain': 'Text' }), /locale keys differ/)
  assert.throws(() => validateLocales(reference, { ...reference, 'test.extra': 'Extra' }), /locale keys differ/)
  assert.throws(() => validateLocales(reference, { ...reference, 'test.plain': ' \n ' }), /right is empty/)
  assert.throws(() => validateLocales({ ...reference, 'test.plain': '' }, reference), /left is empty/)
  assert.throws(() => validateLocales(reference, { ...reference, 'test.count': '{number} / {total}' }), /placeholders differ/)
  assert.throws(() => validateLocales(reference, { ...reference, 'test.count': '{count}' }), /placeholders differ/)
  assert.throws(() => validateLocales(reference, { ...reference, 'test.count': '{count} / {total} / {count}' }), /placeholders differ/)
})

test('catalog adapter maps parentId and legacy parentSessionId, preserves metadata and unsubscribes on dispose', async () => {
  const fetchBefore = globalThis.fetch
  await withStore(emptyLayout(), async store => {
    let catalog = { byId: {
      child: {
        id: 'ignored-inner-id', title: 'Child title', cwd: '/work/child', running: true,
        blank: false, updatedAt: 123, parentId: 'root', parentSessionId: 'legacy-parent', origin: 'subagent',
      },
      legacy: { title: 'Legacy child', parentSessionId: 'root-old', running: false, origin: 'user' },
      root: { title: 'Root title', cwd: '/work/root', running: false, blank: false, parentId: null, origin: 'user' },
      unknown: { title: 42, cwd: null, running: 'false', blank: 0, updatedAt: '123', origin: 123, parentId: 8 },
    } }
    const listeners = new Set()
    let unsubscribed = 0
    store.attachSessions({
      getSnapshot: () => catalog,
      subscribe: listener => {
        listeners.add(listener)
        return () => { unsubscribed += 1; listeners.delete(listener) }
      },
    })
    assert.deepEqual(store.getSnapshot().sessions, {
      child: { id: 'child', title: 'Child title', cwd: '/work/child', running: true, blank: false, updatedAt: 123, parentSessionId: 'root', origin: 'subagent' },
      legacy: { id: 'legacy', title: 'Legacy child', running: false, parentSessionId: 'root-old', origin: 'user' },
      root: { id: 'root', title: 'Root title', cwd: '/work/root', running: false, blank: false, origin: 'user' },
      unknown: { id: 'unknown' },
    })
    catalog = { byId: { root: { title: 'Updated', cwd: '/work/new', running: true, origin: 'cli' } } }
    for (const listener of listeners) listener()
    assert.deepEqual(store.getSnapshot().sessions, {
      root: { id: 'root', title: 'Updated', cwd: '/work/new', running: true, origin: 'cli' },
    })
    assert.equal(listeners.size, 1)
    store.dispose()
    assert.equal(listeners.size, 0)
    assert.equal(unsubscribed, 1)
    const stateAfterDispose = store.getSnapshot()
    catalog = { byId: {} }
    for (const listener of listeners) listener()
    assert.equal(store.getSnapshot(), stateAfterDispose)
  })
  assert.equal(globalThis.fetch, fetchBefore, 'fetch must be restored after test')
})

test('reattaching a catalog detaches the previous source before dispose detaches the current one', async () => {
  await withStore(emptyLayout(), async store => {
    const makeCatalog = id => {
      const listeners = new Set()
      let offCount = 0
      return {
        listeners,
        get offCount() { return offCount },
        getSnapshot: () => ({ byId: { [id]: { title: id, origin: 'user' } } }),
        subscribe: listener => {
          listeners.add(listener)
          return () => { offCount += 1; listeners.delete(listener) }
        },
      }
    }
    const first = makeCatalog('first')
    const second = makeCatalog('second')
    store.attachSessions(first)
    assert.equal(first.listeners.size, 1)
    store.attachSessions(second)
    assert.equal(first.listeners.size, 0)
    assert.equal(first.offCount, 1)
    assert.equal(second.listeners.size, 1)
    assert.deepEqual(Object.keys(store.getSnapshot().sessions), ['second'])
    store.dispose()
    assert.equal(first.offCount, 1)
    assert.equal(second.listeners.size, 0)
    assert.equal(second.offCount, 1)
  })
})

test('action capability changes notify subscribers immediately and stop changing snapshots after dispose', async () => {
  await withStore(emptyLayout(), async (store, calls) => {
    const initial = store.getSnapshot()
    const revisions = []
    const unsubscribe = store.subscribe(() => { revisions.push(store.getSnapshot().actionRevision) })
    const networkCount = calls.length
    try {
      store.notifyActionsChanged()
      const first = store.getSnapshot()
      assert.notEqual(first, initial, 'external-store consumers need a new snapshot identity')
      assert.equal(first.actionRevision, initial.actionRevision + 1)
      assert.deepEqual(revisions, [initial.actionRevision + 1])
      assert.equal(first.sessions, initial.sessions)
      assert.equal(first.layout, initial.layout)
      assert.equal(first.prefs, initial.prefs)
      assert.equal(first.ledger, initial.ledger)

      store.notifyActionsChanged()
      const second = store.getSnapshot()
      assert.notEqual(second, first)
      assert.deepEqual(revisions, [initial.actionRevision + 1, initial.actionRevision + 2])
      assert.equal(calls.length, networkCount, 'capability notifications must not fetch or persist')

      store.dispose()
      store.notifyActionsChanged()
      assert.equal(store.getSnapshot(), second, 'disposed stores must not change snapshot or revision')
      assert.deepEqual(revisions, [initial.actionRevision + 1, initial.actionRevision + 2])
      assert.equal(calls.length, networkCount)
    } finally {
      unsubscribe()
    }
  })
})

test('detaching the catalog is idempotent and a later service can attach and update normally', async () => {
  await withStore(emptyLayout(), async store => {
    let currentId = 'first'
    let offCount = 0
    const listeners = new Set()
    const catalog = {
      getSnapshot: () => ({ byId: { [currentId]: { title: currentId, origin: 'user' } } }),
      subscribe: listener => {
        listeners.add(listener)
        return () => { offCount += 1; listeners.delete(listener) }
      },
    }
    store.attachSessions(catalog)
    assert.equal(listeners.size, 1)
    assert.deepEqual(Object.keys(store.getSnapshot().sessions), ['first'])
    store.detachSessions()
    store.detachSessions()
    assert.equal(offCount, 1, 'repeated detach must not call the old unsubscriber twice')
    assert.equal(listeners.size, 0)

    currentId = 'remounted'
    store.attachSessions(catalog)
    assert.equal(offCount, 1, 'reattach after detach must not unsubscribe the old source again')
    assert.equal(listeners.size, 1)
    assert.deepEqual(Object.keys(store.getSnapshot().sessions), ['remounted'])
    currentId = 'updated'
    for (const listener of listeners) listener()
    assert.deepEqual(Object.keys(store.getSnapshot().sessions), ['updated'])

    store.detachSessions()
    assert.equal(offCount, 2)
    assert.equal(listeners.size, 0)
    store.dispose()
    store.detachSessions()
    assert.equal(offCount, 2, 'dispose after detach must not double unsubscribe')
  })
})

test('disposing during an in-flight scan response never creates a follow-up timer or late update', async () => {
  const originalFetch = globalThis.fetch
  const originalTimeout = globalThis.setTimeout
  let releaseSnapshot
  const pendingSnapshot = new Promise(resolve => { releaseSnapshot = resolve })
  const timerCalls = []
  let store
  globalThis.setTimeout = (...args) => {
    timerCalls.push(args)
    // If a regression calls this, return an inert handle: never leave a real 3s timer behind.
    return { unref() {} }
  }
  globalThis.fetch = async (_url, init) => {
    const { op } = JSON.parse(init.body)
    if (op === 'snapshot') return { ok: true, status: 200, json: () => pendingSnapshot }
    if (op === 'workbench.get') return { ok: true, status: 200, json: async () => ({ ok: true, value: { layout: emptyLayout(), instances: initialInstances(), storage } }) }
    if (op === 'prefs.get') return { ok: true, status: 200, json: async () => ({ ok: true, value: { prefs: emptyPrefs() } }) }
    throw new Error(`Unexpected operation: ${op}`)
  }
  try {
    store = new HomeStore()
    await setImmediate()
    assert.equal(store.getSnapshot().refreshing, true)
    store.dispose()
    const disposedState = store.getSnapshot()
    releaseSnapshot({ ok: true, value: { ...snapshot(), scannedAt: null, scanning: true } })
    await setImmediate()
    assert.equal(store.getSnapshot(), disposedState, 'late response must not update disposed store')
    assert.deepEqual(timerCalls, [], 'late scanning response must not create follow-up timer')
  } finally {
    store?.dispose()
    globalThis.fetch = originalFetch
    globalThis.setTimeout = originalTimeout
  }
})

test('empty layout is independent and recent/tasks join default order without changing legacy overrides', async () => {
  const first = emptyLayout()
  const second = emptyLayout()
  first.order.push('sentinel')
  first.hidden.push('sentinel')
  first.size.sentinel = 'l'
  assert.deepEqual(second, { order: [], focusOrder: [], size: {}, hidden: [] })

  const legacy = {
    order: ['quick', 'third-party', 'areas', 'removed-widget', 'rhythm'],
    focusOrder: ['today', 'resume', 'queue'],
    hidden: ['areas', 'third-party', 'removed-widget'],
    size: { quick: 's', areas: 'l', 'third-party': 'm', 'removed-widget': 's' },
  }
  const before = structuredClone(legacy)
  const defaults = ['recent', 'tasks', 'areas', 'rhythm', 'quick', 'third-party']
  await withStore(legacy, async store => {
    assert.deepEqual(store.getSnapshot().layout, before)
    assert.deepEqual(store.ordered(defaults), ['quick', 'third-party', 'areas', 'rhythm', 'recent', 'tasks'])
    assert.deepEqual(store.orderedFocus(['resume', 'queue', 'today']), ['today', 'resume', 'queue'])
    const layout = store.getSnapshot().layout
    assert.deepEqual(store.ordered(defaults).filter(id => !layout.hidden.includes(id)), ['quick', 'rhythm', 'recent', 'tasks'])
    assert.equal(layout.size.areas, 'l')
    assert.equal(layout.size.recent, undefined, 'new widgets use their registry default size')
    assert.equal(layout.size.tasks, undefined)
    assert.deepEqual(legacy, before, 'loading/ordering must not mutate persisted input')
  })
})

test('editing recent/tasks retains old hidden/size overrides and API layout round trip', async () => {
  const legacy = {
    order: ['quick', 'areas'], focusOrder: [], hidden: ['areas', 'third-party'],
    size: { quick: 's', areas: 'l', 'third-party': 'm' },
  }
  const defaults = ['recent', 'tasks', 'areas', 'rhythm', 'quick']
  await withStore(legacy, async (store, calls) => {
    store.setSize('recent', 'l')
    store.setSize('tasks', 's')
    store.hide('tasks')
    store.hide('tasks')
    store.moveRelative('recent', 'quick', 'before', defaults)
    const edited = structuredClone(store.getSnapshot().layout)
    assert.deepEqual(edited.order, ['recent', 'quick', 'areas', 'tasks', 'rhythm'])
    assert.deepEqual(edited.size, { quick: 's', areas: 'l', 'third-party': 'm', recent: 'l', tasks: 's' })
    assert.deepEqual(edited.hidden, ['areas', 'third-party', 'tasks'])
    assert.deepEqual(edited.focusOrder, [])

    assert.deepEqual(await saveLayout(edited), edited)
    assert.deepEqual(await fetchLayout(), edited)
    assert.deepEqual(calls.slice(-2).map(call => call.body.op), ['layout.set', 'layout.get'])
    assert.deepEqual(calls.at(-2).body.layout, edited)
    await store.loadLayout()
    assert.deepEqual(store.getSnapshot().layout, edited)
    assert.deepEqual(store.ordered(defaults), edited.order)
    store.toggleHidden('tasks')
    assert.deepEqual(store.getSnapshot().layout.hidden, ['areas', 'third-party'])
    assert.deepEqual(store.getSnapshot().layout.size, edited.size)
  })
})
