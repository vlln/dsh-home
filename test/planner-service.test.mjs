import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { apply, createHomeService } from '../src/index.mjs'
import { focusFile, plannerFile } from '../src/state.mjs'

async function isolated(run) {
  const previous = process.env.DSH_HOME
  const home = mkdtempSync(path.join(tmpdir(), 'dsh-home-planner-'))
  process.env.DSH_HOME = home
  try { return await run(home) } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    assert.equal(path.dirname(home), tmpdir().replace(/\/$/, ''))
    assert.ok(path.basename(home).startsWith('dsh-home-planner-'))
    rmSync(home, { recursive: true, force: true })
  }
}

function route() {
  let handler
  const ctx = {
    inject() {},
    get(name) { return name === 'webServer' ? { register(value) { handler = value.handler; return () => {} } } : undefined },
    effect(fn) { fn() },
  }
  apply(ctx)
  assert.ok(handler !== undefined, 'the route registered')
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

const json = file => JSON.parse(readFileSync(file, 'utf8'))

test('the planner starts empty and persists each op', async () => isolated(async () => {
  const post = route()
  const empty = await post({ op: 'planner.get' })
  assert.equal(empty.status, 200)
  assert.deepEqual(empty.value.planner.items, [])
  assert.equal(empty.value.storage.writable, true)

  const created = await post({ op: 'planner.apply', operation: { op: 'item.create', item: { title: '写周报', day: '2026-11-06' } } })
  assert.equal(created.status, 200)
  assert.equal(created.value.planner.items.length, 1)
  assert.equal(created.value.planner.revision, 1)
  const id = created.value.planner.items[0].id

  const saved = json(plannerFile())
  assert.equal(saved.items.length, 1)
  assert.equal(saved.items[0].title, '写周报')

  const toggled = await post({ op: 'planner.apply', operation: { op: 'item.toggle', id } })
  assert.equal(toggled.value.planner.items[0].done, true)
  assert.equal(json(plannerFile()).items[0].done, true)
}))

test('concurrent clients do not overwrite each other', async () => isolated(async () => {
  const post = route()
  const first = await post({ op: 'planner.apply', operation: { op: 'item.create', item: { title: 'A' } } })
  const second = await post({ op: 'planner.apply', operation: { op: 'item.create', item: { title: 'B' } } })
  assert.equal(first.value.planner.items.length, 1)
  assert.equal(second.value.planner.items.length, 2, 'the second op applied on top of the first')
  assert.deepEqual(json(plannerFile()).items.map(item => item.title), ['A', 'B'])
}))

test('a corrupt planner is reported and never overwritten', async () => isolated(async () => {
  const post = route()
  mkdirSync(path.dirname(plannerFile()), { recursive: true })
  writeFileSync(plannerFile(), '{"version":1,"items":')
  const read = await post({ op: 'planner.get' })
  assert.equal(read.status, 200)
  assert.equal(read.value.storage.writable, false)
  assert.equal(read.value.storage.error.code, 'planner-corrupt')

  const write = await post({ op: 'planner.apply', operation: { op: 'item.create', item: { title: 'A' } } })
  assert.equal(write.status, 409)
  assert.equal(write.error.code, 'planner-corrupt')
  assert.equal(readFileSync(plannerFile(), 'utf8'), '{"version":1,"items":', 'the original file survived')

  // Fixing the file is picked up without a restart.
  writeFileSync(plannerFile(), JSON.stringify({ version: 1, revision: 4, items: [], habits: [] }))
  const recovered = await post({ op: 'planner.get' })
  assert.equal(recovered.value.storage.writable, true)
  assert.equal(recovered.value.planner.revision, 4)
}))

test('invalid ops answer 400 with the typed code', async () => isolated(async () => {
  const post = route()
  const bad = await post({ op: 'planner.apply', operation: { op: 'item.create', item: { title: '' } } })
  assert.equal(bad.status, 400)
  assert.equal(bad.error.code, 'bad-title')
  const unknown = await post({ op: 'planner.apply', operation: { op: 'nope' } })
  assert.equal(unknown.error.code, 'unknown-op')
  const missing = await post({ op: 'planner.apply', operation: { op: 'item.toggle', id: 'it_nope' } })
  assert.equal(missing.error.code, 'missing-item')
}))

test('timers and pomodoros persist through focus.apply', async () => isolated(async () => {
  const post = route()
  const empty = await post({ op: 'focus.get' })
  assert.deepEqual(empty.value.focus.timers, {})

  const started = await post({ op: 'focus.apply', operation: { op: 'timer.start', instanceId: 'timer-1' } })
  assert.equal(started.status, 200)
  assert.equal(started.value.focus.timers['timer-1'].running, true)
  assert.equal(json(focusFile()).timers['timer-1'].running, true)

  const pomodoro = await post({ op: 'focus.apply', operation: { op: 'pomodoro.start', instanceId: 'pomo-1' } })
  assert.equal(pomodoro.value.focus.pomodoros['pomo-1'].phase, 'focus')

  const bad = await post({ op: 'focus.apply', operation: { op: 'timer.pause', instanceId: 'missing' } })
  assert.equal(bad.status, 400)
  assert.equal(bad.error.code, 'missing-timer')
}))

test('deleting a widget instance prunes its timer slots', async () => isolated(async () => {
  const post = route()
  await post({ op: 'focus.apply', operation: { op: 'timer.start', instanceId: 'timer-1' } })
  await post({ op: 'focus.apply', operation: { op: 'pomodoro.start', instanceId: 'pomo-1' } })
  assert.deepEqual(Object.keys(json(focusFile()).timers), ['timer-1'])

  const workbench = await post({ op: 'workbench.get' })
  await post({ op: 'workbench.set', layout: workbench.value.layout, instances: [] })
  assert.deepEqual(Object.keys(json(focusFile()).timers), [], 'the removed instance lost its slot')
  assert.deepEqual(Object.keys(json(focusFile()).pomodoros), [])
}))

test('a corrupt focus document is reported, not overwritten', async () => isolated(async () => {
  const post = route()
  mkdirSync(path.dirname(focusFile()), { recursive: true })
  writeFileSync(focusFile(), '{"version":1,"timers":{},"pomodoros":{"a":{"phase":"nap"}}}')
  const read = await post({ op: 'focus.get' })
  assert.equal(read.value.storage.writable, false)
  const write = await post({ op: 'focus.apply', operation: { op: 'timer.start', instanceId: 'timer-1' } })
  assert.equal(write.status, 409)
  assert.equal(readFileSync(focusFile(), 'utf8'), '{"version":1,"timers":{},"pomodoros":{"a":{"phase":"nap"}}}')
}))

test('the service keeps planner and focus independent of the layout document', async () => isolated(async () => {
  const service = createHomeService({})
  service.applyPlanner({ op: 'item.create', item: { title: 'A' } })
  service.applyFocus({ op: 'timer.start', instanceId: 'timer-1' })
  service.setPrefs({ lastSeenAt: 5, dismissed: {} })
  const fresh = createHomeService({})
  assert.equal(fresh.getPlanner().planner.items.length, 1)
  assert.equal(fresh.getFocus().focus.timers['timer-1'].running, true)
  assert.equal(fresh.getPrefs().lastSeenAt, 5)
}))
