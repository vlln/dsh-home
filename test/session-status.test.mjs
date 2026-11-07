import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  effectiveGroup, groupCounts, SESSION_STATUS_GROUPS, statusGroupOf, statusSessions, workspaceHue,
} from '../src/client/session-model.ts'

const sessions = [
  { id: 'run', lastAt: 300, running: true },
  { id: 'wait', lastAt: 200 },
  { id: 'done', lastAt: 100 },
  { id: 'idle', lastAt: 400 },
  { id: 'unknown', lastAt: null },
]
const statuses = new Map([
  ['wait', { pendingInteraction: 'approval' }],
  ['done', { completionUnread: true }],
  ['idle', { running: false }],
])

test('sessions split into running, waiting and unread; idle and unknown stay out', () => {
  const rows = statusSessions(sessions, statuses)
  assert.deepEqual(rows.map(row => `${row.session.id}:${row.group}`), ['run:running', 'wait:waiting', 'done:done'])
  assert.deepEqual(groupCounts(rows), { running: 1, waiting: 1, done: 1 })
  assert.equal(statusGroupOf('idle'), null)
  assert.equal(statusGroupOf('unknown'), null)
})

test('a dismissed waiting session stays hidden until it has new activity', () => {
  assert.equal(statusSessions(sessions, statuses, { wait: 200 }).some(row => row.session.id === 'wait'), false)
  assert.equal(statusSessions(sessions, statuses, { wait: 199 }).some(row => row.session.id === 'wait'), true)
  // Dismissing never hides the same session from another group.
  assert.equal(statusSessions(sessions, new Map([['wait', { completionUnread: true }]]), { wait: 200 })
    .some(row => row.session.id === 'wait'), true)
})

test('an undismissed waiting row with unknown activity is not mistaken for seen', () => {
  const unknown = [{ id: 'u', lastAt: null }]
  const waiting = new Map([['u', { pendingInteraction: 'question' }]])
  assert.equal(statusSessions(unknown, waiting).length, 1)
  assert.equal(statusSessions(unknown, waiting, { u: 0 }).length, 0, 'an explicit dismissal still mutes it')
})

test('rows are newest-first and stable for identical timestamps', () => {
  const ties = [{ id: 'b', lastAt: 5 }, { id: 'a', lastAt: 5 }, { id: 'c', lastAt: 9 }]
  const withStatus = new Map([['a', { running: true }], ['b', { running: true }], ['c', { running: true }]])
  assert.deepEqual(statusSessions(ties, withStatus).map(row => row.session.id), ['c', 'a', 'b'])
})

test('without a host status map only the running view can be filled', () => {
  const rows = statusSessions(sessions, undefined)
  assert.deepEqual(rows.map(row => row.group), ['running'])
})

test('the chosen view wins while it has rows; an empty choice falls back to the first filled view', () => {
  assert.deepEqual(SESSION_STATUS_GROUPS, ['running', 'waiting', 'done'])
  assert.equal(effectiveGroup({ running: 0, waiting: 2, done: 0 }, 'running'), 'waiting')
  assert.equal(effectiveGroup({ running: 0, waiting: 0, done: 1 }, 'running'), 'done')
  assert.equal(effectiveGroup({ running: 1, waiting: 2, done: 0 }, 'done'), 'running')
  assert.equal(effectiveGroup({ running: 0, waiting: 0, done: 0 }, 'waiting'), 'waiting')
})

test('workspace hues are deterministic, bounded and spread across the palette', () => {
  for (const cwd of [undefined, '', '/', 'C:\\Projects\\X', '/项目/工作台', '/.hidden']) {
    const hue = workspaceHue(cwd)
    assert.equal(hue, workspaceHue(cwd))
    assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 6)
  }
  assert.equal(workspaceHue('/a/b'), workspaceHue('/a/b'))
  const hues = new Set(['/a', '/b', '/c', '/d', '/e', '/f', '/g', '/h', '/i', '/j'].map(workspaceHue))
  assert.ok(hues.size >= 3, 'ten paths should not share one colour')
})
