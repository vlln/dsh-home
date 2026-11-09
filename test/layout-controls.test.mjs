import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createWidgetPreviewProps, HomeWidgetRegistry } from '../src/client/widget-registry.ts'
const source = name => readFile(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
test('shell owns only geometry/deletion, never settings or reset', async () => {
  const page = await source('page.tsx'), frame = await source('widget-frame.tsx')
  assert.doesNotMatch(page, /WidgetSettingsPanel|definition\??\.Settings|onEdit=|confirmReset|store\.reset\(/)
  assert.doesNotMatch(frame, /onEdit|library\.edit/)
  // Deletion moved out of the header: the page owns the drag target and the modal.
  assert.doesNotMatch(frame, /IconTrashOutlineRegular|dsh-delete-widget/)
  assert.match(frame, /onKeyDelete/)
  // Deletion is immediate: no confirmation surface, the card is shattered and removed.
  assert.doesNotMatch(page, /dsh-home-delete-modal|manager\.deleteTitle|manager\.confirmDelete/)
  assert.match(page, /removeInstanceDurably/)
  assert.match(page, /scatterDebris/)
  assert.match(page, /event\.defaultPrevented/)
  assert.match(page, /store\.compactSpatialLayout\(geometry, cols\)/)
})
test('preview cannot receive durable config capability', () => {
  const registry = new HomeWidgetRegistry()
  registry.register({ typeId: '@test/config:content', apiVersion: 1, title: 'Content', configVersion: 1,
    defaultConfig: () => ({ text: 'sample' }), validateConfig: () => true, Content: () => null })
  const props = createWidgetPreviewProps(registry.get('@test/config:content'), { size: 's', width: 300, height: 200 })
  assert.equal(props.saveConfig, undefined)
  assert.equal(props.preview.data, null)
})
test('builtins choose editors themselves and retain forms without shell registration', async () => {
  // Notes, clock, timer and footprints edit inside the card: no dialog, no shell form.
  for (const name of ['personal-widgets.tsx', 'timer-widget.tsx', 'activity-widget.tsx']) {
    const text = await source(name)
    assert.doesNotMatch(text, /<WidgetConfigEditor|dsh-widget-config-modal/)
  }
  assert.match(await source('personal-widgets.tsx'), /dsh-clock-zone/)
  assert.match(await source('timer-widget.tsx'), /dsh-timer-dial/)
  const helper = await source('widget-settings.tsx')
  assert.match(helper, /widgetProps\.editing \|\| widgetProps\.preview/)
  assert.match(helper, /await widgetProps\.saveConfig!\(next\)/)
  assert.match(helper, /className="dsh-widget-config-modal"/)
})
