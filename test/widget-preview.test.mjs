import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { HomeWidgetRegistry, cloneWidgetConfig, createWidgetPreviewProps } from '../src/client/widget-registry.ts'

const dimensions = { size: 's', width: 360, height: 240 }
function widget(overrides = {}) {
  return { typeId: '@test/preview:sample', apiVersion: 1, title: 'Sample', configVersion: 1,
    defaultConfig: () => ({ label: 'default' }), validateConfig: c => typeof c.label === 'string',
    Content: () => null, ...overrides }
}
function register(overrides) {
  const registry = new HomeWidgetRegistry()
  registry.register(widget(overrides))
  return { registry, definition: registry.get('@test/preview:sample') }
}

test('old definitions preview the same Content with isolated defaults and explicit null data', () => {
  let contentCalls = 0
  const { registry, definition } = register({ Content: () => { contentCalls++ } })
  const before = registry.getSnapshot()
  const props = createWidgetPreviewProps(definition, dimensions)
  assert.equal(contentCalls, 0, 'pure props construction never invokes Content')
  assert.deepEqual(props.config, { label: 'default' })
  assert.deepEqual(props.preview, { data: null })
  assert.equal(props.editing, false)
  assert.equal(props.visible, true)
  assert.equal(props.width, 360)
  assert.equal(props.height, 240)
  assert.equal(props.instance.typeId, definition.typeId)
  assert.equal(props.instance.configVersion, 1)
  assert.strictEqual(props.config, props.instance.config)
  assert.strictEqual(registry.getSnapshot(), before)
  assert.deepEqual(Object.keys(props.instance).sort(), ['config', 'configVersion', 'instanceId', 'typeId'])
})

test('sample config and data are cloned independently from registration, persistence and other previews', () => {
  const config = { label: 'sample', nested: ['fixture'] }
  const data = { rows: [{ text: 'synthetic' }] }
  const { registry, definition } = register({ preview: { config: () => config, data } })
  data.rows[0].text = 'external mutation'
  assert.equal(definition.preview.data.rows[0].text, 'synthetic')
  assert.ok(Object.isFrozen(definition.preview))
  assert.ok(Object.isFrozen(definition.preview.data.rows[0]))
  const first = createWidgetPreviewProps(definition, dimensions)
  const second = createWidgetPreviewProps(definition, dimensions)
  first.config.nested.push('first only')
  first.preview.data.rows[0].text = 'first only'
  assert.deepEqual(second.config.nested, ['fixture'])
  assert.equal(second.preview.data.rows[0].text, 'synthetic')
  assert.deepEqual(config.nested, ['fixture'])
  assert.deepEqual(registry.createInstance(definition.typeId, 'real-instance').config, { label: 'default' })
})

test('preview config factories are validated synchronously at registration and every later preview', () => {
  for (const config of [() => ({ label: 42 }), () => undefined, () => Promise.resolve({ label: 'async' }),
    async () => { throw Error('rejected async') }, () => { throw Error('bad sample') }]) {
    assert.throws(() => register({ preview: { config } }), /preview.config/)
  }
  let good = true
  const { definition } = register({ preview: { config: () => ({ label: good ? 'sample' : 42 }) } })
  good = false
  assert.throws(() => createWidgetPreviewProps(definition, dimensions), /preview.config/)
})

test('preview JSON obeys config safety limits and metadata getters are not invoked', () => {
  let getterCalls = 0
  const getter = Object.defineProperty({}, 'data', { enumerable: true, get() { getterCalls++; return {} } })
  const cycle = {}; cycle.child = cycle
  for (const preview of [null, [], new Date(), { config: 3 }, getter, { extra: true },
    { data: cycle }, { data: { text: 'x'.repeat(8193) } }, { data: new Date() },
    { data: JSON.parse('{"__proto__":{"polluted":true}}') }, { data: Promise.resolve(null) }]) {
    assert.throws(() => register({ preview }), /homeWidgets:/)
  }
  assert.equal(getterCalls, 0)
})

test('validators cannot mutate accepted preview config and missing data is always null', () => {
  const { definition } = register({ validateConfig: c => { c.label = 'validator mutation'; return true },
    preview: { config: () => ({ label: 'sample' }) } })
  const props = createWidgetPreviewProps(definition, dimensions)
  assert.equal(props.config.label, 'sample')
  assert.equal(props.preview.data, null)
})

test('synthetic builtin ledger fixtures meet bounded JSON contract with localized labels', async () => {
  const source = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
  // Extract only the pure producer; importing the TSX runtime is deliberately unnecessary here.
  const start = source.indexOf('export function builtinPreviewData(')
  const end = source.indexOf('/** An isolated runtime', start)
  const js = stripTypeScriptTypes(source.slice(start, end).replace('export function', 'function'), { mode: 'strip' })
  const produce = new Function('PREVIEW_NOW', `${js}; return builtinPreviewData`)(Date.UTC(2026, 9, 20, 10, 24))
  const data = produce(key => key)
  assert.deepEqual(cloneWidgetConfig(data), data)
  assert.equal(data.ledger.sessions.length, 3)
  assert.equal(data.ledger.days.length, 14)
  assert.equal(data.sessions['sample-0'].title, 'gallery.sample.project')
  assert.deepEqual(data.statuses[1], ['sample-1', { pendingInteraction: 'approval' }])
  assert.ok(data.ledger.sessions.every(session => session.cwd.startsWith('sample/')))
})

test('real Content renderer and builtin preview gates never use deprecated illustrations or construct HomeStore', async () => {
  const source = async name => readFile(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
  const renderer = await source('widget-preview.tsx')
  assert.match(renderer, /const Content = definition.Content/)
  assert.match(renderer, /<Content \{\.\.\.sample\}/)
  assert.match(renderer, /<BuiltinPreviewProvider/)
  assert.match(renderer, /inert aria-hidden="true"/)
  assert.doesNotMatch(renderer, /definition\.Preview|new HomeStore/)
  const builtins = await source('builtin-registration.tsx')
  assert.doesNotMatch(builtins, /new HomeStore|import \{ HomeStore/)
  assert.match(builtins, /getSnapshot: \(\) => state, subscribe: \(\) => inert, dismiss: inert/)
  const clock = await source('personal-widgets.tsx')
  assert.match(clock, /if \(preview \|\| !visible\) return/)
  const activity = await source('activity-widget.tsx')
  assert.match(activity, /useEffect\(\(\) => \{\s*if \(preview\) return\s*let active = true/)
  const quick = await source('quick-widget.tsx')
  assert.match(quick, /const disabled = Boolean\(preview\)/)
  for (const name of ['builtin-registration.tsx', 'personal-widgets.tsx', 'activity-widget.tsx', 'quick-widget.tsx']) {
    assert.doesNotMatch(await source(name), /builtinPreview\(/)
  }
})
