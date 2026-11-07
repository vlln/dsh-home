import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayCoverage, localDayWindow } from '../src/client/widget-visual-model.ts'
import { widgetExpressionStyles } from '../src/client/widget-expression-styles.ts'

test('dial coverage unions overlaps, clips day boundaries and never inflates short intervals', () => {
  const input = [{left:0,width:25},{left:20,width:30},{left:75,width:.001},{left:95,width:20},{left:-2,width:3},{left:NaN,width:4},{left:50,width:0}]
  const copy = structuredClone(input)
  assert.deepEqual(dayCoverage(input), [{from:0,to:50},{from:75,to:75.001},{from:95,to:100}])
  assert.deepEqual(input, copy)
  assert.deepEqual(dayCoverage([]), [])
})
test('local calendar windows honor both DST boundaries', () => {
  const previous = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'
  try {
    const spring = localDayWindow(Date.parse('2026-03-08T12:00:00-07:00'))
    assert.equal(spring.end - spring.start, 23 * 3600000)
    const fall = localDayWindow(Date.parse('2026-11-01T12:00:00-08:00'))
    assert.equal(fall.end - fall.start, 25 * 3600000)
    assert.equal(new Date(fall.end).getHours(), 0)
    assert.equal(new Date(fall.end).getDate(), 2)
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
test('visual expression stays token driven without resize controls or identity coupling', () => {
  assert.match(widgetExpressionStyles, /--dsw-alias-state-success-primary/)
  assert.match(widgetExpressionStyles, /dsh-area-track/)
  assert.doesNotMatch(widgetExpressionStyles, /#[0-9a-fA-F]{3,8}\b|data-ds-dark-theme|data-widget-type|resize-handle|@vlln\/dsh-home:/)
})
