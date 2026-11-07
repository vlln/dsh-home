import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activePreviewData, validateActiveConfig } from '../src/client/active-model.ts'

test('only the three bar windows are valid widget config; the retired today window is rejected', () => {
  for (const range of ['2d', '7d', '14d']) assert.equal(validateActiveConfig({ range }), true)
  for (const value of [null, undefined, {}, { range: '14' }, { range: 'month' }, [], 'today', { range: 'today' }, { range: '2d', extra: 1 }]) {
    assert.equal(validateActiveConfig(value), false, `rejects ${JSON.stringify(value)}`)
  }
})

test('the gallery sample is a full 14-day window the widget can render', () => {
  const sample = activePreviewData()
  assert(Array.isArray(sample.days))
  assert.equal(sample.days.length, 14)
  for (const day of sample.days) {
    assert.match(day.key, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(Number.isFinite(day.activeMs) && day.activeMs >= 0)
  }
  assert.ok(sample.days.some(day => day.activeMs > 0), 'the sample shows activity')
  assert.ok(sample.today.activeMs >= 0)
  assert.ok(Array.isArray(sample.sessions))
})

test('the retired today window migrates to a 7-day bar window', async () => {
  const { migrateActiveConfig } = await import('../src/client/active-model.ts')
  assert.deepEqual(migrateActiveConfig({ range: 'today' }, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '14d' }, 1), { range: '14d' })
  assert.deepEqual(migrateActiveConfig({ range: 'month' }, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig(null, 1), { range: '7d' })
  assert.deepEqual(migrateActiveConfig({ range: '2d' }, 2), { range: '2d' })
  assert.deepEqual(migrateActiveConfig({ range: 'today' }, 2), { range: '7d' })
})
