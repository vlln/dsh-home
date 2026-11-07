/** 页面切走再回来：共享数据 store 必须能重新装载，而不是被 reset 永久关死。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const STORAGE = { writable: true, status: 'ready', error: null }
const envelope = value => new Response(JSON.stringify({ ok: true, value }), { status: 200, headers: { 'content-type': 'application/json' } })

test('a remounted page reloads planner and focus after reset', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body))
    if (body.op === 'planner.get') return envelope({ planner: { version: 1, revision: 1, items: [], habits: [] }, storage: STORAGE })
    if (body.op === 'focus.get') return envelope({ focus: { version: 1, revision: 1, timers: {}, pomodoros: {} }, storage: STORAGE })
    throw new Error(`unexpected ${body.op}`)
  }
  try {
    const { HomeDataStore } = await import('../src/client/home-data-store.ts')
    const store = new HomeDataStore()
    const wait = async () => { for (let i = 0; i < 50 && store.getSnapshot().planner === null; i++) await new Promise(resolve => setTimeout(resolve, 5)) }
    store.load(); await wait()
    assert.notEqual(store.getSnapshot().planner, null, 'first mount loads the planner')
    assert.notEqual(store.getSnapshot().focus, null, 'first mount loads the focus document')

    store.reset()
    assert.equal(store.getSnapshot().planner, null, 'reset clears the page view')
    store.load()
    await wait()
    assert.notEqual(store.getSnapshot().planner, null, 'the next mount loads the planner again')
    assert.notEqual(store.getSnapshot().focus, null, 'the next mount loads the focus document again')
    assert.equal(store.getSnapshot().plannerError, null)
    assert.equal(store.getSnapshot().focusError, null)
  } finally {
    globalThis.fetch = original
  }
})
