import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLayout } from '../src/state.mjs'

const rect = (x = 0, y = 0, w = 4, h = 4) => ({ x, y, w, h })
const layout = (overrides = {}) => ({ order: [], focusOrder: [], size: {}, hidden: [], ...overrides })

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

test('state positions retain independent 12/6/2 geometry through normalization and JSON roundtrip', () => {
  const raw = freeze(layout({
    order: ['tasks', 'external:weather'], size: { tasks: 'm' },
    positions: {
      12: { tasks: rect(4, 37, 8, 8), 'external:weather': rect(0, 90) },
      6: { tasks: rect(0, 15, 6, 8), 'external:weather': rect(3, 80, 3) },
      2: { tasks: rect(0, 100, 2, 8), 'external:weather': rect(0, 10000, 2, 30) },
    },
  }))
  const normalized = normalizeLayout(raw)
  assert.deepEqual(normalized, raw)
  assert.deepEqual(normalizeLayout(JSON.parse(JSON.stringify(normalized))), raw)
  assert.notEqual(normalized, raw)
  assert.notEqual(normalized.positions, raw.positions)
  for (const cols of ['12', '6', '2']) assert.notEqual(normalized.positions[cols], raw.positions[cols])
})

test('old state shape does not gain positions when absent, null, scalar or array', () => {
  const legacy = layout({ order: ['tasks'], focusOrder: ['today'], hidden: ['queue'], size: { tasks: 'l' } })
  assert.deepEqual(normalizeLayout(legacy), legacy)
  assert.equal(Object.hasOwn(normalizeLayout(legacy), 'positions'), false)
  for (const positions of [undefined, null, 'bad', 3, []]) {
    const normalized = normalizeLayout({ ...legacy, positions })
    assert.deepEqual(normalized, legacy)
    assert.equal(Object.hasOwn(normalized, 'positions'), false)
  }
})

test('positions accept canonical breakpoints 1..32 and reject everything else', () => {
  const normalized = normalizeLayout(layout({ positions: {
    12: { ok: rect() }, 6: [], 2: null, 4: { legacy: rect() },
    13: { wide: rect(0, 10) }, 24: { wide: rect(20, 20) }, 32: { wide: rect(0, 0, 32) },
    0: { ignored: rect() }, 33: { ignored: rect() }, '06': { ignored: rect() }, desktop: { ignored: rect() },
  } }))
  assert.deepEqual(normalized.positions, {
    12: { ok: rect() }, 4: { legacy: rect() },
    13: { wide: rect(0, 10) }, 24: { wide: rect(20, 20) }, 32: { wide: rect(0, 0, 32) },
  })
  assert.deepEqual(normalizeLayout(layout({ positions: {} })).positions, {})
  // 6/2 stay preserved verbatim for old data.
  const legacy = layout({ positions: { 6: { a: rect(0, 4, 6) }, 2: { a: rect(0, 8, 2) } } })
  assert.deepEqual(normalizeLayout(legacy).positions, legacy.positions)
})

test('bad, noninteger, negative and unsafe rectangles are filtered rather than coerced or clamped', () => {
  const invalid = [null, [], 'bad', 5, {},
    rect(-1), rect(0, -1), rect(0.1), rect(0, 0.5), rect(0, 0, 3.5), rect(0, 0, 4, 3.5),
    rect(NaN), rect(Infinity), rect(0, NaN), rect(0, Infinity), rect(0, 0, Infinity), rect(0, 0, 4, NaN),
    rect('0'), rect(0, '0'), rect(0, 0, '4'), rect(0, 0, 4, '4'),
    rect(0, 10001), rect(0, 0, 0), rect(0, 0, -1), rect(0, 0, 13), rect(9),
    rect(0, 0, 4, 0), rect(0, 0, 4, 2), rect(0, 0, 4, 31),
    { x: 0, y: 0, w: 4 }, { x: 0, y: 0, h: 4 },
  ]
  for (const bad of invalid) {
    const normalized = normalizeLayout(layout({ positions: { 12: { bad, good: rect(8, 40) } } }))
    assert.deepEqual(normalized.positions['12'], { good: rect(8, 40) }, `reject ${JSON.stringify(bad)}`)
  }
  for (const [cols, invalidWidth, invalidX] of [[6, 7, 4], [2, 3, 1]]) {
    const normalized = normalizeLayout(layout({ positions: { [cols]: {
      badWidth: rect(0, 0, invalidWidth), badX: rect(invalidX, 0, cols === 6 ? 3 : 2),
      valid: rect(0, 10000, cols, 30),
    } } }))
    assert.deepEqual(normalized.positions[String(cols)], { valid: rect(0, 10000, cols, 30) })
  }
})

test('normalization keeps only rectangle geometry and bounds saved ids and entry counts', () => {
  const tooLong = 'a'.repeat(121)
  const positions = Object.fromEntries([
    ['', rect()], [tooLong, rect()], ['good', { ...rect(), i: 'ignored', minW: 3, injected: true }],
  ])
  assert.deepEqual(normalizeLayout(layout({ positions: { 12: positions } })).positions, { 12: { good: rect() } })
  const many = Object.fromEntries(Array.from({ length: 80 }, (_, index) => [`external:${index}`, rect(0, index * 4)]))
  assert.equal(Object.keys(normalizeLayout(layout({ positions: { 12: many } })).positions['12']).length, 64)
})

test('prototype-looking external ids remain own position data without prototype pollution', () => {
  const positions = JSON.parse('{"12":{"__proto__":{"x":0,"y":0,"w":4,"h":4},"constructor":{"x":4,"y":0,"w":4,"h":4},"toString":{"x":8,"y":0,"w":4,"h":4}}}')
  const raw = freeze(layout({ positions }))
  const normalized = normalizeLayout(raw)
  const entries = normalized.positions['12']
  assert.equal(Object.getPrototypeOf(entries), Object.prototype)
  assert.equal(Object.getPrototypeOf(normalized.positions), Object.prototype)
  assert.equal(Object.prototype.polluted, undefined)
  for (const id of ['__proto__', 'constructor', 'toString']) {
    assert.equal(Object.hasOwn(entries, id), true)
    assert.deepEqual(entries[id], positions['12'][id])
  }
  assert.deepEqual(normalizeLayout(JSON.parse(JSON.stringify(normalized))), normalized)
})

test('hidden and unregistered external ids keep saved positions even when absent from order', () => {
  const raw = freeze(layout({
    order: ['tasks'], hidden: ['external:hidden'], size: { 'external:uninstalled': 'l' },
    positions: {
      12: { tasks: rect(0, 0, 8, 8), 'external:hidden': rect(0, 50), 'external:uninstalled': rect(0, 70, 12) },
      6: { 'external:hidden': rect(0, 40, 3), 'external:uninstalled': rect(0, 90, 6) },
    },
  }))
  assert.deepEqual(normalizeLayout(raw), raw)
  assert.deepEqual(normalizeLayout(JSON.parse(JSON.stringify(raw))), raw)
})
