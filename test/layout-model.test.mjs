/** node --experimental-strip-types --test test/layout-model.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeOrder, visibleHomeOrder } from '../src/client/layout-model.ts'

const DEFAULT = ['recent', 'tasks', 'resume', 'queue', 'today', 'running', 'areas', 'rhythm', 'quick']

function layout(overrides = {}) {
  return { order: [], focusOrder: [], size: {}, hidden: [], ...overrides }
}

function freezeLayout(value) {
  Object.freeze(value.order)
  Object.freeze(value.focusOrder)
  Object.freeze(value.hidden)
  Object.freeze(value.size)
  return Object.freeze(value)
}

test('empty legacy layout includes every builtin and appends new external cards', () => {
  const fallback = [...DEFAULT, 'external:weather', 'external:notes']
  assert.deepEqual(homeOrder(layout(), fallback), fallback)
  assert.deepEqual(homeOrder(layout(), []), [])
})

test('legacy grid keeps recent/tasks relative order, persisted focusOrder and remaining grid order', () => {
  const saved = layout({
    order: ['quick', 'tasks', 'running', 'today', 'recent', 'areas', 'external:saved', 'rhythm'],
    focusOrder: ['today', 'queue', 'resume'],
  })
  // Simulate a JSON persistence/reload boundary: focusOrder must not reset.
  const reloaded = JSON.parse(JSON.stringify(saved))
  const fallback = [...DEFAULT, 'external:saved', 'external:new']
  const expected = [
    'tasks', 'recent', 'today', 'queue', 'resume',
    'quick', 'running', 'areas', 'external:saved', 'rhythm', 'external:new',
  ]
  assert.deepEqual(homeOrder(reloaded, fallback), expected)
  assert.deepEqual(homeOrder(reloaded, fallback), expected)
})

test('legacy partial focusOrder covers only focus ids and appends missing focus defaults', () => {
  const saved = layout({ order: ['tasks'], focusOrder: ['queue', 'quick', 'queue', 'unknown'] })
  assert.deepEqual(homeOrder(saved, DEFAULT), [
    'tasks', 'recent', 'queue', 'resume', 'today', 'running', 'areas', 'rhythm', 'quick',
  ])
  assert.deepEqual(homeOrder(layout({ focusOrder: ['today'] }), ['today', 'quick']), ['today', 'quick'])
})

test('legacy today appears exactly once even if repeated in order, focusOrder and fallback', () => {
  const saved = layout({ order: ['today', 'running', 'today'], focusOrder: ['today', 'today', 'resume'] })
  const order = homeOrder(saved, [...DEFAULT, 'today', 'running'])
  assert.equal(order.filter(id => id === 'today').length, 1)
  assert.equal(new Set(order).size, DEFAULT.length)
  assert.deepEqual(order, ['recent', 'tasks', 'today', 'resume', 'queue', 'running', 'areas', 'rhythm', 'quick'])
})

test('unified order preserves arbitrary cross-region placement instead of regrouping', () => {
  const saved = layout({
    order: ['external:notes', 'queue', 'quick', 'tasks', 'today', 'running', 'resume', 'recent', 'areas', 'rhythm'],
    focusOrder: ['resume', 'today', 'queue'],
  })
  assert.deepEqual(homeOrder(saved, [...DEFAULT, 'external:notes', 'external:new']), [...saved.order, 'external:new'])
})

test('either resume or queue alone marks unified order and missing defaults append in fallback order', () => {
  for (const marker of ['resume', 'queue']) {
    const saved = layout({ order: ['quick', marker, 'tasks'], focusOrder: ['today', 'queue', 'resume'] })
    assert.deepEqual(homeOrder(saved, DEFAULT), [
      'quick', marker, 'tasks', ...DEFAULT.filter(id => !['quick', marker, 'tasks'].includes(id)),
    ])
  }
})

test('hidden filtering applies equally to every builtin and external without changing full order', () => {
  const fallback = [...DEFAULT, 'external:notes']
  for (const hidden of fallback) {
    const saved = layout({ hidden: [hidden, 'unregistered'] })
    assert.deepEqual(homeOrder(saved, fallback), fallback)
    assert.deepEqual(visibleHomeOrder(saved, fallback), fallback.filter(id => id !== hidden))
  }
  assert.deepEqual(visibleHomeOrder(layout({ hidden: fallback }), fallback), [])
  const saved = layout({ order: ['quick', 'queue', 'recent', 'external:notes'], hidden: ['queue', 'recent'] })
  assert.deepEqual(visibleHomeOrder(saved, fallback), homeOrder(saved, fallback).filter(id => !saved.hidden.includes(id)))
})

test('external uninstall and reinstall ignores absent ids and never duplicates restored cards', () => {
  const fallback = [...DEFAULT, 'external:notes', 'external:new', 'external:notes']
  for (const order of [
    ['external:notes', 'tasks', 'external:notes', 'recent'],
    ['external:notes', 'queue', 'recent', 'external:notes', 'tasks'],
  ]) {
    const saved = layout({ order, hidden: ['external:notes'], size: { 'external:notes': 'l' } })
    const installed = homeOrder(saved, fallback)
    const uninstalled = homeOrder(saved, DEFAULT)
    assert.equal(installed.filter(id => id === 'external:notes').length, 1)
    assert.equal(uninstalled.includes('external:notes'), false)
    assert.deepEqual(homeOrder(saved, fallback), installed)
    assert.equal(visibleHomeOrder(saved, fallback).includes('external:notes'), false)
    // A user may persist a new order while the plugin is absent; reinstall appends it once.
    const movedWhileAbsent = { ...saved, order: uninstalled }
    const restored = homeOrder(movedWhileAbsent, fallback)
    assert.equal(restored.filter(id => id === 'external:notes').length, 1)
    assert.equal(restored.at(-2), 'external:notes')
    assert.equal(movedWhileAbsent.size['external:notes'], 'l')
  }
})

test('unknown ids are ignored and repeated known ids deduplicate in legacy and unified orders', () => {
  for (const order of [
    ['unknown', 'tasks', 'tasks', 'today', 'removed:widget'],
    ['unknown', 'queue', 'queue', 'tasks', 'removed:widget', 'today', 'today'],
  ]) {
    const saved = layout({ order, focusOrder: ['unknown', 'queue', 'queue'] })
    const result = homeOrder(saved, [...DEFAULT, 'tasks'])
    assert.equal(result.length, DEFAULT.length)
    assert.equal(new Set(result).size, result.length)
    assert.deepEqual(new Set(result), new Set(DEFAULT))
  }
})

test('projection preserves layout API shape, hidden/size overrides and both input arrays', () => {
  for (const order of [['quick', 'tasks'], ['quick', 'resume', 'tasks']]) {
    const saved = freezeLayout(layout({
      order,
      focusOrder: ['queue', 'today', 'resume'],
      hidden: ['recent', 'resume', 'external:removed'],
      size: { recent: 'l', resume: 's', 'external:removed': 'm' },
    }))
    const before = structuredClone(saved)
    const fallback = Object.freeze([...DEFAULT, 'external:notes'])
    const full = homeOrder(saved, fallback)
    visibleHomeOrder(saved, fallback)
    assert.deepEqual(saved, before)
    assert.deepEqual(fallback, [...DEFAULT, 'external:notes'])
    full.push('caller:mutation')
    assert.equal(homeOrder(saved, fallback).includes('caller:mutation'), false)
  }
})
