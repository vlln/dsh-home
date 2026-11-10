import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
// The host keeps the platform read in a module-level 5-minute cache, which is exactly what we
// want in production and exactly what a second `apply` in the same module instance would
// inherit. Each case therefore loads its own instance of the host module.
async function host(cacheKey) {
  const module = await import(`../src/index.mjs?case=${cacheKey}`)
  return module
}

// The platform is not called here: `readBalance` uses the global fetch, so the test stands in
// for it. Everything below the network — the read log, the spend arithmetic, the route body —
// is the real code.
const home = mkdtempSync(path.join(os.tmpdir(), 'dsh-home-balance-route-'))
assert.ok(path.basename(home).startsWith('dsh-home-balance-route-'), 'never write the shared home')
process.env.DSH_HOME = home
process.env.DEEPSEEK_API_KEY = 'synthetic-key'
const previousHome = process.env.DSH_HOME
const dataDir = path.join(home, 'data', 'dsh-home')
const historyFile = path.join(dataDir, 'balance.json')
const yesterday = (() => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(22, 0, 0, 0)
  return date.getTime()
})()

/** Mount one host instance on a fake host and return its balance route. */
function mount(hostModule) {
  const routes = new Map()
  const connection = {
    fetch: {
      register(spec) {
        routes.set(spec.path, spec.fetch)
        return () => {}
      },
    },
  }
  const scoped = {
    get: name => (name === 'connection' ? connection : undefined),
    effect: fn => { fn() },
  }
  const ctx = {
    inject(names, register) {
      if (names.includes('connection')) register(scoped)
    },
    get(name) {
      return name === 'webServer' ? { register: () => () => {} } : undefined
    },
    effect(fn) { fn() },
  }
  hostModule.apply(ctx)
  const route = routes.get(hostModule.BALANCE_PATH)
  assert.equal(typeof route, 'function', 'the balance route is mounted')
  return route
}

test('the balance route reports what the day has cost so far', async () => {
  // Yesterday evening the account held 100.00. Fake platform now says 98.75.
  const route = mount(await host('spend'))
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(historyFile, JSON.stringify({
    version: 1,
    reads: [{ at: yesterday, total: 100, toppedUp: 100 }],
  }))
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    is_available: true,
    balance_infos: [{ currency: 'CNY', total_balance: '98.75', granted_balance: '0.00', topped_up_balance: '100.00' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
  try {
    const body = await (await route()).json()
    assert.equal(body.available, true)
    assert.equal(body.total, 98.75)
    assert.equal(body.todaySpent, 1.25, 'spend is the drop from the last read before today')
    // The read itself is on disk, so the next request (or a restart) can keep counting.
    const saved = JSON.parse(readFileSync(historyFile, 'utf8'))
    assert.equal(saved.reads.length, 2)
    assert.equal(saved.reads.at(-1).total, 98.75)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a platform that is not configured is a reason, not a spend of zero', async () => {
  const route = mount(await host('offline'))
  const realKey = process.env.DEEPSEEK_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('the platform must not be called without a key') }
  try {
    const body = await (await route()).json()
    assert.equal(body.available, false)
    assert.equal(body.reason, 'not-configured')
    assert.equal(body.todaySpent, undefined, 'no balance, no spend claim')
  } finally {
    globalThis.fetch = realFetch
    process.env.DEEPSEEK_API_KEY = realKey
  }
})

process.on('exit', () => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
})
