import { test } from 'node:test'
import assert from 'node:assert/strict'
import { API_PATH, CONNECTION_PATH, post } from '../src/client/api.ts'

/** 一个按 URL 决定响应的 fetch 替身：记录顺序，返回给定的状态与信封。 */
function stubFetch(plan) {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) })
    const step = plan.shift()
    if (step === undefined) throw new Error(`unexpected request ${url}`)
    return { ok: step.ok, status: step.status, json: async () => step.body }
  }
  return { calls, restore() { globalThis.fetch = original } }
}

test('a host without the connection fence falls back to the legacy path and stays there', async () => {
  const stub = stubFetch([
    { ok: false, status: 404, body: { ok: false, error: { code: 'not-found', message: 'no route' } } },
    { ok: true, status: 200, body: { ok: true, value: { n: 1 } } },
    { ok: true, status: 200, body: { ok: true, value: { n: 2 } } },
  ])
  try {
    assert.deepEqual(await post('probe'), { n: 1 })
    assert.deepEqual(await post('probe'), { n: 2 })
    assert.deepEqual(stub.calls.map(call => call.url), [CONNECTION_PATH, API_PATH, API_PATH])
  } finally {
    stub.restore()
  }
})

test('a real operation error is not retried on the legacy path', async () => {
  const stub = stubFetch([
    { ok: false, status: 400, body: { ok: false, error: { code: 'bad-title', message: 'title cannot be empty' } } },
  ])
  try {
    await assert.rejects(post('probe'), error => {
      assert.equal(error.code, 'bad-title')
      assert.equal(error.status, 400)
      return true
    })
    assert.equal(stub.calls.length, 1, 'no retry on an operation error')
    assert.equal(stub.calls[0].body.op, 'probe')
  } finally {
    stub.restore()
  }
})
