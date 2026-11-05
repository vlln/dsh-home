/** node --experimental-strip-types --test test/session-model.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activityTimestamp, cwdFilterValue, cwdLabels, filterRecentSessions, mergeRecentSessions,
  recentEmptyState, recentPageSize, recentSessionStatus, shortSessionId,
} from '../src/client/session-model.ts'

function ledger(id, overrides = {}) {
  return {
    id, createdAt: 100, lastAt: 200, turns: 1, activeMs: 0, runMs: 0,
    todayMs: 0, todayTurns: 0, clusters: [], ...overrides,
  }
}

function row(id, overrides = {}) {
  return { id, lastAt: null, ...overrides }
}

test('union retains catalog-only and ledger-only sessions, merges metadata and freshest activity', () => {
  const catalog = {
    existing: { id: 'existing', title: ' New title ', cwd: '/new/work', updatedAt: 400, running: true },
    catalogOnly: { id: 'catalogOnly', title: 'Not indexed', updatedAt: 300, blank: false },
    noTime: { id: 'noTime', blank: false },
  }
  const entries = [ledger('existing', { lastAt: 200, cwd: '/old/work' }), ledger('ledgerOnly', { cwd: '/ledger/work' })]
  const before = structuredClone({ catalog, entries })
  assert.deepEqual(mergeRecentSessions(catalog, entries), [
    { id: 'existing', title: 'New title', cwd: '/new/work', lastAt: 400, running: true },
    { id: 'catalogOnly', title: 'Not indexed', cwd: undefined, lastAt: 300, running: undefined },
    { id: 'ledgerOnly', title: undefined, cwd: '/ledger/work', lastAt: 200, running: undefined },
    { id: 'noTime', title: undefined, cwd: undefined, lastAt: null, running: undefined },
  ])
  assert.deepEqual({ catalog, entries }, before)
})

test('ledger activity can be newer than catalog; blank metadata falls back to ledger cwd only', () => {
  const [merged] = mergeRecentSessions({ a: { id: 'a', title: '  ', cwd: '', updatedAt: 150 } }, [ledger('a', { cwd: '/work' })])
  assert.equal(merged.lastAt, 200)
  assert.equal(merged.title, undefined)
  assert.equal(merged.cwd, '/work')
})

test('excludes catalog blanks and subagents identified by either source', () => {
  const catalog = {
    blank: { id: 'blank', blank: true },
    catalogChild: { id: 'catalogChild', parentSessionId: 'parent' },
    catalogOrigin: { id: 'catalogOrigin', origin: 'subagent' },
    ledgerChild: { id: 'ledgerChild' },
    ledgerOrigin: { id: 'ledgerOrigin' },
    root: { id: 'root', parentSessionId: null, origin: 'user' },
    '': { id: '' },
  }
  const entries = [
    ledger('blank'), ledger('catalogChild'), ledger('catalogOrigin'),
    ledger('ledgerChild', { parentSessionId: 'parent' }), ledger('ledgerOrigin', { origin: 'subagent' }),
    ledger('emptyHeader', { turns: 0 }),
    ledger('withInput', { turns: 0, lastUserText: 'hello' }),
    ledger('whiteInput', { turns: 0, lastUserText: '   ' }),
  ]
  assert.deepEqual(mergeRecentSessions(catalog, entries).map(item => item.id), ['withInput', 'root'])
})

test('unknown/invalid timestamps sort last; ties resolve by id independent of source order', () => {
  const entries = [ledger('z'), ledger('a'), ledger('nan', { lastAt: NaN }), ledger('zero', { lastAt: 0 })]
  const catalog = {
    unknown: { id: 'unknown', updatedAt: Infinity },
    future: { id: 'future', updatedAt: 999 },
    nan: { id: 'nan', updatedAt: -1 },
  }
  const expected = ['future', 'a', 'z', 'nan', 'unknown', 'zero']
  assert.deepEqual(mergeRecentSessions(catalog, entries).map(item => item.id), expected)
  assert.deepEqual(mergeRecentSessions(Object.fromEntries(Object.entries(catalog).reverse()), [...entries].reverse()).map(item => item.id), expected)
  assert.equal(mergeRecentSessions({}, [ledger('a', { lastAt: NaN, createdAt: 999 })])[0].lastAt, null)
})

test('timestamp validation never turns missing or invalid times into now', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, 0, -1, '123', 8_640_000_000_000_001]) {
    assert.equal(activityTimestamp(value), null)
  }
  assert.equal(activityTimestamp(123), 123)
  assert.equal(activityTimestamp(8_640_000_000_000_000), 8_640_000_000_000_000)
})

test('runtime statuses support string/object interactions, precedence, and never infer completion', () => {
  const running = row('running', { running: true })
  for (const [kind, expected] of [['approval', 'approval'], ['plan-review', 'plan'], ['question', 'question']]) {
    assert.equal(recentSessionStatus(running, { running: true, pendingInteraction: kind }), expected)
    assert.equal(recentSessionStatus(running, { pendingInteraction: { kind, key: 'pending', sessionId: 'running' } }), expected)
  }
  assert.equal(recentSessionStatus(running, { running: true, completionUnread: true }), 'running')
  assert.equal(recentSessionStatus(running, { running: false, completionUnread: true }), 'unread')
  assert.equal(recentSessionStatus(running, { running: false }), 'idle')
  assert.equal(recentSessionStatus(running), 'running')
  assert.equal(recentSessionStatus(row('idle', { running: false })), 'idle')
  assert.equal(recentSessionStatus(row('unknown')), 'unknown')
  assert.equal(recentSessionStatus(row('unknown'), {}), 'unknown')
  assert.equal(recentSessionStatus(row('unknown'), { completionUnread: false }), 'unknown')
})

test('cwd labels show shortest distinguishing suffix while retaining original path keys', () => {
  const paths = ['/alpha/src/project', '/beta/src/project', '/beta/other', '/alpha/src/project', '/', undefined]
  assert.deepEqual([...cwdLabels(paths)], [
    ['/alpha/src/project', 'alpha/src/project'], ['/beta/src/project', 'beta/src/project'],
    ['/beta/other', 'other'], ['/', '/'],
  ])
  const similar = cwdLabels(['/project', '/a/project', 'project', 'C:\\work\\other'])
  assert.equal(new Set(similar.values()).size, similar.size)
  assert.equal(similar.get('/a/project'), 'a/project')
  assert.equal(similar.get('C:\\work\\other'), 'other')
})

test('search includes title, full id and cwd; multi-token matching intersects directory filter', () => {
  const rows = [
    row('session-abc12345-first', { title: 'Fix Alpha', cwd: '/home/one/project' }),
    row('session-abc12345-second', { title: 'Fix Beta', cwd: '/home/two/project' }),
    row('none', { title: 'Unknown workspace' }),
  ]
  assert.equal(filterRecentSessions(rows, '  FIX   /one/ ').length, 1)
  assert.equal(filterRecentSessions(rows, 'abc12345-second')[0].id, rows[1].id)
  assert.equal(filterRecentSessions(rows, 'fix', cwdFilterValue('/home/two/project'))[0].id, rows[1].id)
  assert.equal(filterRecentSessions(rows, 'alpha', cwdFilterValue('/home/two/project')).length, 0)
  assert.deepEqual(filterRecentSessions(rows, '', '?'), [rows[2]])
  assert.equal(filterRecentSessions(rows, '', cwdFilterValue('/missing')).length, 0)
  assert.deepEqual(filterRecentSessions(rows, ' '), rows)
  assert.notEqual(filterRecentSessions(rows), rows)
})

test('select values distinguish missing cwd from any actual path', () => {
  assert.equal(cwdFilterValue(undefined), '?')
  assert.notEqual(cwdFilterValue('?'), '?')
  assert.notEqual(cwdFilterValue(''), '')
})

test('size pages and short IDs do not lose canonical identity', () => {
  assert.deepEqual(['s', 'm', 'l'].map(recentPageSize), [3, 6, 10])
  assert.equal(shortSessionId('session-abc12345-full-uuid'), 'abc12345…')
  assert.equal(shortSessionId('abcdefghijk'), 'abcdefgh…')
  assert.equal(shortSessionId('short'), 'short')
  assert.equal(shortSessionId('session-'), 'session-')
})

test('empty state separates indexing, no sessions, and filtered no match', () => {
  assert.equal(recentEmptyState(0, 0, false), 'empty')
  assert.equal(recentEmptyState(10, 0, false), 'noMatch')
  assert.equal(recentEmptyState(0, 0, true), 'indexing')
  assert.equal(recentEmptyState(10, 0, true), 'indexing')
  assert.equal(recentEmptyState(10, 3, true), null)
})
