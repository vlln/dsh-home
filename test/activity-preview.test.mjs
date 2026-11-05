import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
import { activityPreviewSnapshot, shiftCalendarDay } from '../src/client/activity-model.ts'

// Regression: a 365-day sample exceeded the 8 KiB preview limit, so register()
// threw inside apply() and the whole plugin failed to boot ("did not activate").
test('activity gallery sample registers within the real registry preview limit', () => {
  const registry = new HomeWidgetRegistry()
  const data = activityPreviewSnapshot()
  assert.doesNotThrow(() => registry.register({
    typeId: '@vlln/dsh-home:activity', apiVersion: 1, title: 'Activity', configVersion: 1,
    defaultConfig: () => ({ cwd: '', range: 'auto' }), validateConfig: () => true,
    preview: { data }, Content: () => null,
  }))
  assert.equal(data.days.length, 84)
  assert.equal(data.days.at(-1).key, data.today)
  assert.equal(data.days[0].key, shiftCalendarDay(data.today, -83))
})

test('the registry still rejects an oversized year sample, proving the guard is real', () => {
  const registry = new HomeWidgetRegistry()
  const year = { ...activityPreviewSnapshot(), days: Array.from({ length: 365 }, (_, i) => ({ key: shiftCalendarDay('2026-10-20', i - 364), messages: i % 15, sessions: i % 3 })) }
  assert.throws(() => registry.register({
    typeId: '@test/activity:oversized', apiVersion: 1, title: 'Oversized', configVersion: 1,
    defaultConfig: () => ({}), validateConfig: () => true, preview: { data: year }, Content: () => null,
  }), /byte limit/)
})
