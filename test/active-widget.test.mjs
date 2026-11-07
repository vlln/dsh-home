import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activePreviewData, validateActiveConfig } from '../src/client/active-model.ts'

test('only the three bar windows are valid widget config; retired windows are rejected', () => {
  for (const range of ['7d', '14d', '30d']) assert.equal(validateActiveConfig({ range }), true)
  for (const value of [null, undefined, {}, { range: '14' }, { range: 'month' }, [], 'today', { range: 'today' }, { range: '2d' }, { range: '7d', extra: 1 }]) {
    assert.equal(validateActiveConfig(value), false, `rejects ${JSON.stringify(value)}`)
  }
})

test('the gallery sample is a full 30-day window the widget can render', () => {
  const sample = activePreviewData()
  assert(Array.isArray(sample.days))
  assert.equal(sample.days.length, 30)
  for (const day of sample.days) {
    assert.match(day.key, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(Number.isFinite(day.activeMs) && day.activeMs >= 0)
  }
  assert.ok(sample.days.some(day => day.activeMs > 0), 'the sample shows activity')
  assert.ok(sample.today.activeMs >= 0)
  assert.ok(Array.isArray(sample.sessions))
})

test('the retired today and 2-day windows migrate to a 7-day bar window', async () => {
  const { migrateActiveConfig } = await import('../src/client/active-model.ts')
  assert.deepEqual(migrateActiveConfig({ range: 'today' }, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '14d' }, 1), { range: '14d' })
  assert.deepEqual(migrateActiveConfig({ range: 'month' }, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig(null, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '2d' }, 2), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '30d' }, 2), { range: '30d' })
  assert.deepEqual(migrateActiveConfig({ range: 'today' }, 2), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '2d' }, 3), { range: '7d' })
})
