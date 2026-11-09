import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { activityStyles } from '../src/client/activity-styles.ts'
import { widgetRefinementStyles } from '../src/client/widget-refinement-styles.ts'
import { zhActivity, enActivity } from '../src/client/activity-locales.ts'
test('activity summary uses observed counts with bounded responsive square calendars', async () => {
  const activity = await readFile(new URL('../src/client/activity-widget.tsx', import.meta.url), 'utf8')
  assert.match(activity, /className="dsh-activity-number[^"]*">\{active\}/)
  assert.match(activity, /activity.messages', \{ count: messages \}/)
  assert.match(activity, /gridTemplateColumns: `repeat\(\$\{weeks.length\}, var\(--dsh-activity-cell-size\)\)`/)
  assert.match(activityStyles, /width:var\(--dsh-activity-cell-size\); height:var\(--dsh-activity-cell-size\)/)
  assert.match(activity, /'--dsh-activity-cell-size': `\$\{cellSize\}px`/)
  assert.match(activity, /data-activity-layout=\{blocks.length \? 'blocks' : 'weeks'\}/)
  assert.match(activity, /block.weeks.flat\(\).map\(cell\)/)
  assert.match(activity, /setDate\(previous => previous === day\.key \? undefined : day\.key\)/)
  assert.match(activity, /unknown=\{!result\.complete && day\.messages === 0\}/)
  assert.match(activity, /detailReady/)
  assert.match(activity, /post<ActivitySnapshot>\('activity', \{ cwd, timeZone: zone/)
  assert.match(activityStyles, /margin-inline:auto/)
  assert.match(activityStyles, /dsh-activity-caption.*justify-content:space-between/s)
  assert.match(activityStyles, /overflow:hidden/)
  assert.deepEqual(Object.keys(zhActivity).sort(), Object.keys(enActivity).sort())
})
test('content patterns use container geometry without hiding outer overflow or adding a UI framework', async () => {
  const widgets = await readFile(new URL('../src/client/widgets.tsx', import.meta.url), 'utf8')
  const builtin = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
  const personal = await readFile(new URL('../src/client/personal-styles.ts', import.meta.url), 'utf8')
  assert.match(widgets, /dsh-today-stats/)
  assert.match(builtin, /size, width, height/)
  assert.match(widgetRefinementStyles, /container-type:inline-size/)
  assert.match(personal, /16cqi/)
  assert.match(widgetRefinementStyles, /dsh-recent-list.*overflow:hidden/)
  assert.doesNotMatch(widgetRefinementStyles, /dsh-home-widget-content[^}]*overflow:hidden/)
  assert.match(personal, /dsh-note-input\{[^}]*min-height:100%/s)
})
test('the geometry layer stays geometry: no fonts, colours or card surfaces of its own', () => {
  // This layer used to restate the card: its background, its title font, its colours.
  // Two other layers did the same, so the page had three competing card definitions and
  // the last one to load won. Typography and surface now belong to theme.css (.dsh-card);
  // a rule here that sets them again is the bug, not a refinement.
  assert.match(widgetRefinementStyles, /prefers-reduced-motion/)
  assert.doesNotMatch(widgetRefinementStyles, /\.dsh-w-title[^{]*\{[^}]*font/)
  assert.doesNotMatch(widgetRefinementStyles, /dsh-home-widget\s*\{[^}]*background/)
  assert.doesNotMatch(widgetRefinementStyles, /dsh-home-widget\s*\{[^}]*border-color/)
  assert.doesNotMatch(widgetRefinementStyles, /#[0-9a-fA-F]{3,8}\b|@vlln\/dsh-home:|data-widget-type/)
})
