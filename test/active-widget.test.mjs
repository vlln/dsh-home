import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activePreviewData, validateActiveConfig } from '../src/client/active-model.ts'

test('only the four windows are valid widget config', () => {
  for (const range of ['today', '2d', '7d', '14d']) assert.equal(validateActiveConfig({ range }), true)
  for (const value of [null, undefined, {}, { range: '14' }, { range: 'month' }, [], 'today', { range: 'today', extra: 1 }]) {
    assert.equal(validateActiveConfig(value), value !== null && typeof value === 'object' && !Array.isArray(value) && value.range === 'today', `rejects ${JSON.stringify(value)}`)
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
