import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILTIN_WIDGET_IDS, retireWidgetTypes } from '../src/widget-state.mjs'

const layout = ids => ({
  order: ids, focusOrder: ids, hidden: ids.slice(0, 1), size: Object.fromEntries(ids.map(id => [id, 'm'])),
  positions: { 12: Object.fromEntries(ids.map((id, index) => [id, { x: 0, y: index * 4, w: 4, h: 4 }])) },
})
const instance = (instanceId, typeId, config = {}) => ({ instanceId, typeId, configVersion: 1, config })

test('the builtin set no longer creates instances for the retired cards', () => {
  for (const retired of ['tasks', 'resume', 'queue']) assert.equal(BUILTIN_WIDGET_IDS.includes(retired), false)
  assert.ok(BUILTIN_WIDGET_IDS.includes('running'), 'running became session status rather than disappearing')
})

test('a lone queue instance becomes the session-status card in place', () => {
  const workbench = { layout: layout(['queue']), instances: [instance('queue', '@vlln/dsh-home:queue')] }
  const { changed, workbench: next } = retireWidgetTypes(workbench)
  assert.equal(changed, true)
  assert.deepEqual(next.instances, [instance('queue', '@vlln/dsh-home:running')])
  assert.deepEqual(next.layout.order, ['queue'], 'the card keeps its place on the board')
  assert.deepEqual(next.layout.positions['12'].queue, { x: 0, y: 0, w: 4, h: 4 })
})

test('queue merges into an existing running card, dropping its instance and layout references', () => {
  const workbench = {
    layout: layout(['running', 'queue', 'tasks']),
    instances: [instance('running', '@vlln/dsh-home:running'), instance('queue', '@vlln/dsh-home:queue'),
      instance('tasks', '@vlln/dsh-home:tasks')],
  }
  const { changed, workbench: next } = retireWidgetTypes(workbench)
  assert.equal(changed, true)
  assert.deepEqual(next.instances.map(item => item.instanceId), ['running'])
  assert.deepEqual(next.layout.order, ['running'])
  assert.deepEqual(next.layout.focusOrder, ['running'])
  assert.deepEqual(next.layout.hidden, ['running'])
  assert.deepEqual(next.layout.size, { running: 'm' })
  assert.deepEqual(Object.keys(next.layout.positions['12']), ['running'])
})

test('a workbench with no retired types is returned untouched', () => {
  const workbench = { layout: layout(['recent']), instances: [instance('recent', '@vlln/dsh-home:recent')] }
  const result = retireWidgetTypes(workbench)
  assert.equal(result.changed, false)
  assert.strictEqual(result.workbench, workbench)
  assert.strictEqual(result.workbench.layout, workbench.layout)
})

test('retirement never mutates its input', () => {
  const workbench = { layout: layout(['queue', 'tasks']), instances: [
    instance('queue', '@vlln/dsh-home:queue'), instance('tasks', '@vlln/dsh-home:tasks')] }
  const before = structuredClone(workbench)
  retireWidgetTypes(workbench)
  assert.deepEqual(workbench, before)
})
