import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { activityStyles } from '../src/client/activity-styles.ts'
import { widgetRefinementStyles } from '../src/client/widget-refinement-styles.ts'
import { zhActivity, enActivity } from '../src/client/activity-locales.ts'
test('activity summary uses only actual observed counts and fixed square calendar cells', async () => {
  const activity = await readFile(new URL('../src/client/activity-widget.tsx', import.meta.url), 'utf8')
  assert.match(activity, /className="dsh-activity-number">\{active\}/)
  assert.match(activity, /activity.messages', \{ count: messages \}/)
  assert.match(activity, /gridTemplateColumns: `repeat\(\$\{weeks.length\}, var\(--dsh-activity-cell-size\)\)`/)
  assert.match(activityStyles, /width:var\(--dsh-activity-cell-size\); height:var\(--dsh-activity-cell-size\)/)
  assert.match(activityStyles, /data-activity-range="year".*12px/)
  assert.match(activityStyles, /overflow-x:auto/)
  assert.deepEqual(Object.keys(zhActivity).sort(), Object.keys(enActivity).sort())
})
test('refinements are theme driven, reduced-motion aware, and do not hardcode widget identities', () => {
  assert.match(widgetRefinementStyles, /prefers-reduced-motion/)
  assert.match(widgetRefinementStyles, /--dsw-font-s-strong-14/)
  assert.match(widgetRefinementStyles, /--dsw-alias-label-primary/)
  assert.doesNotMatch(widgetRefinementStyles, /#[0-9a-fA-F]{3,8}\b|@vlln\/dsh-home:|data-widget-type/)
})
