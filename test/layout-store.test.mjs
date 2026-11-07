/** node --experimental-strip-types --test test/layout-store.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { CONNECTION_PATH, emptyLayout, emptyPrefs } from '../src/client/api.ts'
import { HomeStore } from '../src/client/store.ts'
import { initialInstances } from '../src/widget-state.mjs'

const storage = { writable: true, status: 'ready', error: null }

const FALLBACK = ['recent', 'tasks', 'resume', 'queue', 'today', 'running', 'areas', 'rhythm', 'quick', 'external:notes']

function snapshot() {
  return {
    generatedAt: 1000, scannedAt: 1000, scanning: false, progress: { done: 0, total: 0 },
    sessionCount: 0, days: [], sessions: [],
    today: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
    week: { activeMs: 0, runMs: 0, turns: 0, sessions: 0 },
  }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

/** Scoped network and inert timeout stubs; always dispose and restore globals. */
async function withStore(layout, callback) {
  const originalFetch = globalThis.fetch
  const originalTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  const calls = []
  const timers = []
  const pending = new Set()
  let persisted = structuredClone(layout)
  let instances = initialInstances(layout)
  let saveGate = null
  let store
  globalThis.setTimeout = (fn, delay, ...args) => {
    const handle = { fn, delay, args }
    timers.push(handle)
    pending.add(handle)
    return handle
  }
  globalThis.clearTimeout = handle => { pending.delete(handle) }
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    calls.push({ url, init, body })
    let value
    switch (body.op) {
      case 'snapshot': value = snapshot(); break
      case 'workbench.get': value = { layout: structuredClone(persisted), instances: structuredClone(instances), storage }; break
      case 'prefs.get': value = { prefs: emptyPrefs() }; break
      case 'workbench.set':
        if (saveGate !== null) await saveGate.promise
        persisted = structuredClone(body.layout)
        instances = structuredClone(body.instances)
        value = { layout: structuredClone(persisted), instances: structuredClone(instances), storage }
        break
      default: throw new Error(`Unexpected operation: ${body.op}`)
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) }
  }
  try {
    store = new HomeStore()
    await setImmediate()
    assert.equal(store.getSnapshot().loading, false)
    assert.equal(store.getSnapshot().error, null)
    assert.deepEqual(store.getSnapshot().layout, layout)
    assert.deepEqual(calls.map(call => call.body.op), ['snapshot', 'workbench.get', 'prefs.get'])
    for (const { url, init } of calls) {
      assert.equal(url, CONNECTION_PATH)
      assert.equal(init.method, 'POST')
      assert.equal(init.credentials, 'same-origin')
    }
    assert.equal(timers.length, 0, 'loaded, non-scanning store needs no constructor timeouts')
    await callback(store, {
      calls, timers, pending,
      saved: () => structuredClone(persisted),
      gate: value => { saveGate = value },
      writes: () => calls.filter(call => call.body.op === 'workbench.set'),
    })
  } finally {
    store?.dispose()
    globalThis.fetch = originalFetch
    globalThis.setTimeout = originalTimeout
    globalThis.clearTimeout = originalClearTimeout
  }
  assert.equal(pending.size, 0, 'dispose must clear every remaining debounce timeout')
}

test('first cross-region move migrates legacy focus/grid, preserves hidden/size and persists unified order', async () => {
  const layout = {
    order: ['quick', 'tasks', 'running', 'today', 'recent', 'areas', 'rhythm', 'external:notes'],
    focusOrder: ['today', 'queue', 'resume'],
    hidden: ['queue', 'recent', 'external:notes', 'uninstalled:card'],
    size: { recent: 'l', queue: 's', 'external:notes': 'l', 'uninstalled:card': 'm' },
  }
  await withStore(layout, async (store, io) => {
    store.moveHomeRelative('quick', 'queue', 'before', FALLBACK)
    const migrated = [
      'tasks', 'recent', 'today', 'quick', 'queue', 'resume',
      'running', 'areas', 'rhythm', 'external:notes',
    ]
    assert.deepEqual(store.getSnapshot().layout, { ...layout, order: migrated })
    assert.equal(io.pending.size, 1)
    assert.equal(io.timers[0].delay, 500)
    store.moveHomeRelative('recent', 'external:notes', 'after', FALLBACK)
    const expected = [...migrated.filter(id => id !== 'recent'), 'recent']
    assert.deepEqual(store.getSnapshot().layout.order, expected)
    assert.equal(io.pending.size, 1, 'second move replaces the debounce rather than accumulating timers')
    assert.equal(io.writes().length, 0)
    const beforeFlush = store.getSnapshot()
    await store.flushLayout()
    assert.equal(store.getSnapshot(), beforeFlush, 'successful persistence must not rewrite the in-memory layout')
    assert.equal(io.pending.size, 0)
    assert.equal(io.writes().length, 1)
    assert.deepEqual(io.saved(), { ...layout, order: expected })
    assert.ok(io.saved().order.includes('resume'))
    assert.ok(io.saved().order.includes('queue'))
    assert.equal(io.saved().order.filter(id => id === 'today').length, 1)
  })
})

test('unknown source/target and self moves do not notify, migrate, persist or create timers', async () => {
  await withStore({ ...emptyLayout(), focusOrder: ['queue', 'resume', 'today'] }, async (store, io) => {
    const before = store.getSnapshot()
    let changes = 0
    const off = store.subscribe(() => { changes += 1 })
    try {
      for (const [id, target] of [['unknown', 'recent'], ['recent', 'unknown'], ['unknown', 'unknown'], ['recent', 'recent']]) {
        store.moveHomeRelative(id, target, 'before', FALLBACK)
        store.moveHomeRelative(id, target, 'after', FALLBACK)
      }
      assert.equal(store.getSnapshot(), before)
      assert.equal(changes, 0)
      assert.equal(io.timers.length, 0)
      assert.equal(io.writes().length, 0)
    } finally { off() }
  })
})

test('flushLayout awaits durable success and cancels debounce without starting another timer', async () => {
  await withStore(emptyLayout(), async (store, io) => {
    store.moveHomeRelative('queue', 'recent', 'before', FALLBACK)
    const state = store.getSnapshot()
    const timerCount = io.timers.length
    const gate = deferred()
    io.gate(gate)
    let settled = false
    const flushing = store.flushLayout().then(() => { settled = true })
    await setImmediate()
    assert.equal(settled, false, 'flush must not resolve before its layout.set response')
    assert.equal(io.pending.size, 0)
    assert.equal(io.writes().length, 1)
    assert.deepEqual(io.saved(), emptyLayout(), 'server has not committed while request is pending')
    assert.equal(store.getSnapshot(), state)
    gate.resolve()
    await flushing
    assert.equal(settled, true)
    assert.deepEqual(io.saved(), state.layout)
    assert.equal(io.timers.length, timerCount)
    assert.equal(store.getSnapshot(), state)
  })
})

test('flushLayout rejects failed writes without reverting memory or scheduling retries; explicit retry succeeds', async () => {
  const initial = { ...emptyLayout(), hidden: ['resume'], size: { resume: 'l' } }
  await withStore(initial, async (store, io) => {
    store.moveHomeRelative('resume', 'quick', 'after', FALLBACK)
    const edited = store.getSnapshot()
    const timerCount = io.timers.length
    const gate = deferred()
    io.gate(gate)
    let settled = false
    const flushing = store.flushLayout()
    const rejected = assert.rejects(flushing, /save unavailable/).then(() => { settled = true })
    await setImmediate()
    assert.equal(settled, false)
    gate.reject(new Error('save unavailable'))
    await rejected
    assert.equal(store.getSnapshot().layout, edited.layout, 'failure retains the edited layout identity')
    assert.equal(store.getSnapshot().instances, edited.instances, 'failure retains configured instances')
    assert.equal(store.getSnapshot().storage.status, 'write-error', 'failure is exposed without reverting edits')
    assert.deepEqual(io.saved(), initial)
    assert.equal(io.pending.size, 0)
    assert.equal(io.timers.length, timerCount, 'failure must not create an implicit retry timeout')
    io.gate(null)
    await store.flushLayout()
    assert.deepEqual(io.saved(), edited.layout)
    assert.equal(io.writes().length, 2)
    assert.equal(io.timers.length, timerCount)
  })
})

test('dispose clears queued saves and in-flight flush completion cannot update memory or create timers', async () => {
  for (const outcome of ['success', 'failure']) {
    await withStore(emptyLayout(), async (store, io) => {
      store.moveHomeRelative('tasks', 'resume', 'after', FALLBACK)
      const gate = deferred()
      io.gate(gate)
      const flushing = store.flushLayout()
      const done = outcome === 'failure' ? assert.rejects(flushing, /disposed write failed/) : flushing
      // Serialized persistence starts in a microtask; ensure this is truly in flight.
      await setImmediate()
      assert.equal(io.writes().length, 1)
      const lastState = store.getSnapshot()
      const timerCount = io.timers.length
      store.dispose()
      assert.equal(io.pending.size, 0)
      if (outcome === 'failure') gate.reject(new Error('disposed write failed'))
      else gate.resolve()
      await done
      assert.equal(store.getSnapshot(), lastState)
      assert.equal(io.timers.length, timerCount)
      assert.equal(io.pending.size, 0)
      assert.equal(io.writes().length, 1)
    })
  }
  await withStore(emptyLayout(), async (store, io) => {
    store.moveHomeRelative('queue', 'quick', 'after', FALLBACK)
    assert.equal(io.pending.size, 1)
    store.dispose()
    assert.equal(io.pending.size, 0)
    assert.equal(io.writes().length, 0, 'dispose must cancel, not execute, a queued save')
  })
})
