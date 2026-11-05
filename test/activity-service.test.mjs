import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createHomeService, apply } from '../src/index.mjs'
const oldHome = process.env.DSH_HOME
const home = mkdtempSync(path.join(os.tmpdir(), 'dsh-home-activity-'))
process.env.DSH_HOME = home
// The OS-managed fixture is intentionally disposable. Never read or write the shared home.
assert.ok(path.basename(home).startsWith('dsh-home-activity-'))
const now = Date.now()
const event = { type: 'user/message', time: now - 60000, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'synthetic' }] } }
test('service uses official logical persistence, invalidates cached queries on rescan and returns detached data', async () => {
  let events = [event]
  let revision = 1
  let closes = 0
  const persistence = {
    list: async () => [{ header: { id: 'synthetic', cwd: '/synthetic', createdAt: now - 100000 }, revision }],
    open: async () => ({ read: async () => ({ events }), close: async () => { closes++ } }),
  }
  const service = createHomeService({})
  assert.equal(service.activity({ timeZone: 'UTC' }).available, false)
  await service.attach(persistence)
  const a = service.activity({ timeZone: 'UTC' })
  assert.equal(a.complete, true)
  assert.equal(a.days.reduce((n, d) => n + d.messages, 0), 1)
  a.days.at(-1).messages = 999
  a.workspaces.push('mutated')
  const b = service.activity({ timeZone: 'UTC' })
  assert.notEqual(b.days.at(-1).messages, 999)
  assert.deepEqual(b.workspaces, ['/synthetic'])
  events = [event, { ...event, time: now - 30000 }]; revision++
  await service.scan()
  assert.equal(service.activity({ timeZone: 'UTC' }).days.reduce((n, d) => n + d.messages, 0), 2)
  assert.equal(closes, 2)
})
test('activity route rejects invalid query with 400 and keeps origin fence', async () => {
  let handler
  apply({ inject() {}, get() { return { register(value) { handler = value.handler; return () => {} } } }, effect(fn) { fn() } })
  const request = async (body, origin) => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]); req.method = 'POST'; req.headers = { host: 'localhost', ...(origin ? { origin } : {}) }
    let status, data
    await handler(req, { writeHead(s) { status = s }, end(value) { data = JSON.parse(value) } })
    return { status, ...data }
  }
  for (const body of [{ timeZone: 'bad/zone' }, { date: '2026-99-99' }, { cwd: 12 }]) {
    const r = await request({ op: 'activity', ...body })
    assert.equal(r.status, 400); assert.equal(r.error.code, 'bad-activity-query')
  }
  assert.equal((await request({ op: 'activity' }, 'https://evil.example')).status, 403)
  const valid = await request({ op: 'activity', timeZone: 'UTC' })
  assert.equal(valid.status, 200); assert.equal(valid.value.available, false)
})
process.on('exit', () => { if (oldHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = oldHome })
