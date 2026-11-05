/** Pure node tests: importing the registry must never load React or a home-private store. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  HomeWidgetRegistry, WIDGET_JSON_LIMITS,
  cloneWidgetConfig, validateWidgetConfig, migrateWidgetInstance,
} from '../src/client/widget-registry.ts'

function widget(overrides = {}) {
  return {
    apiVersion: 1, typeId: '@test/widgets:notes', title: 'Notes', configVersion: 1,
    defaultConfig: () => ({ text: '', tags: [], nested: { enabled: true } }),
    validateConfig: config => typeof config?.text === 'string' || 'text must be a string',
    Content: () => null,
    ...overrides,
  }
}

function raw(config = { text: 'saved' }, configVersion = 1) {
  return { instanceId: 'notes-1', typeId: '@test/widgets:notes', configVersion, config }
}

test('registration publishes immutable stable snapshots with detached useSyncExternalStore functions', () => {
  const registry = new HomeWidgetRegistry()
  const { getSnapshot, subscribe } = registry
  const initial = getSnapshot()
  assert.strictEqual(initial, getSnapshot())
  assert.ok(Object.isFrozen(initial))
  const changes = []
  const unsubscribe = subscribe(() => changes.push(getSnapshot()))
  const definition = widget({ title: () => 'Localized notes', source: '@test/widgets', defaults: { size: 's', height: 5 } })
  const dispose = registry.register(definition)
  const first = getSnapshot()
  assert.notStrictEqual(first, initial)
  assert.equal(changes.length, 1)
  assert.strictEqual(changes[0], first)
  assert.strictEqual(first, getSnapshot())
  assert.strictEqual(registry.get(definition.typeId), first[0])
  assert.equal(first[0].title(), 'Localized notes')
  assert.deepEqual(first[0].defaults, { size: 's', height: 6, minWidth: 4, maxWidth: 4, minHeight: 6, maxHeight: 6 })
  assert.deepEqual(first[0].sizing, { default: '4x6', supported: ['4x6'] })
  assert.ok(Object.isFrozen(first[0].sizing))
  assert.ok(Object.isFrozen(first[0].sizing.supported))
  assert.ok(Object.isFrozen(first[0]))
  assert.ok(Object.isFrozen(first[0].defaults))
  definition.defaults.height = 8
  definition.title = 'Changed externally'
  assert.equal(first[0].defaults.height, 6)
  assert.equal(first[0].title(), 'Localized notes')
  assert.throws(() => first.push(widget()), TypeError)
  unsubscribe()
  unsubscribe()
  dispose()
  dispose()
  assert.equal(changes.length, 1)
  assert.equal(getSnapshot().length, 0)
  assert.strictEqual(getSnapshot(), getSnapshot())
})

test('public sizing is independently frozen and legacy defaults deterministically map to one host preset', () => {
  const sizing = { default: '4x6', supported: ['4x6', '8x6'] }
  const registry = new HomeWidgetRegistry()
  registry.register(widget({ sizing }))
  const definition = registry.get('@test/widgets:notes')
  assert.deepEqual(definition.sizing, sizing)
  assert.notStrictEqual(definition.sizing.supported, sizing.supported)
  assert.ok(Object.isFrozen(definition.sizing))
  assert.ok(Object.isFrozen(definition.sizing.supported))
  assert.deepEqual(definition.defaults, { size: 's', height: 6, minWidth: 4, maxWidth: 8, minHeight: 6, maxHeight: 6 })
  sizing.default = '8x6'
  sizing.supported.push('12x12')
  assert.deepEqual(definition.sizing, { default: '4x6', supported: ['4x6', '8x6'] })
  for (const [height, expected] of [[3, 4], [4, 4], [5, 6], [6, 6], [7, 8], [8, 8], [9, 12], [12, 12], [30, 12]]) {
    const legacy = new HomeWidgetRegistry()
    legacy.register(widget({ defaults: { size: 's', height } }))
    const entry = legacy.get('@test/widgets:notes')
    assert.deepEqual(entry.sizing, { default: `4x${expected}`, supported: [`4x${expected}`] })
    assert.deepEqual(entry.defaults, { size: 's', height: expected, minWidth: 4, maxWidth: 4, minHeight: expected, maxHeight: expected })
  }
})

test('public identifiers are namespaced and legacy registration is restricted to explicit adapter option', () => {
  for (const typeId of ['notes', '', '  @test/widgets:notes', 'x:bad name', '__proto__', 'legacy:notes', '@scope:notes', 'x:']) {
    assert.throws(() => new HomeWidgetRegistry().register(widget({ typeId })), /typeId/)
  }
  for (const typeId of ['@test/widgets:notes', 'test.widgets:notes', 'test/extension:notes', 'test:notes/detail']) {
    const registry = new HomeWidgetRegistry()
    registry.register(widget({ typeId }))
    assert.ok(registry.get(typeId))
  }
  const registry = new HomeWidgetRegistry()
  registry.register(widget({ typeId: 'legacy:Old_slot-ID' }), { internalLegacyTypeId: true })
  assert.ok(registry.get('legacy:Old_slot-ID'))
  assert.throws(() => registry.register(widget({ typeId: 'unqualified' }), { internalLegacyTypeId: true }), /namespaced/)
})

test('duplicate rejection is atomic, emits no notification and does not call second factory', () => {
  const registry = new HomeWidgetRegistry()
  registry.register(widget())
  const before = registry.getSnapshot()
  let updates = 0
  let called = false
  registry.subscribe(() => updates++)
  assert.throws(() => registry.register(widget({ defaultConfig: () => { called = true; return {} } })), /duplicate typeId "@test\/widgets:notes"/)
  assert.equal(called, false)
  assert.equal(updates, 0)
  assert.strictEqual(registry.getSnapshot(), before)
})

test('disposing an old registration never removes replacement; insertion order remains deterministic', () => {
  const registry = new HomeWidgetRegistry()
  const oldDispose = registry.register(widget())
  registry.register(widget({ typeId: 'test:other' }))
  oldDispose()
  const replacementDispose = registry.register(widget({ title: 'Replacement' }))
  const snapshot = registry.getSnapshot()
  oldDispose()
  assert.strictEqual(registry.getSnapshot(), snapshot)
  assert.equal(registry.get('@test/widgets:notes').title, 'Replacement')
  assert.deepEqual(snapshot.map(item => item.typeId), ['test:other', '@test/widgets:notes'])
  replacementDispose()
  assert.equal(registry.get('@test/widgets:notes'), undefined)
})

test('a broken subscriber reports its error but cannot prevent disposal or other notifications', () => {
  const registry = new HomeWidgetRegistry()
  const previous = console.error
  const diagnostics = []
  console.error = (...args) => diagnostics.push(args)
  try {
    registry.subscribe(() => { throw new Error('broken consumer') })
    let calls = 0
    registry.subscribe(() => calls++)
    const dispose = registry.register(widget())
    assert.equal(calls, 1)
    dispose()
    assert.equal(calls, 2)
    assert.equal(registry.getSnapshot().length, 0)
    assert.equal(diagnostics.length, 2)
    assert.match(diagnostics[0][0], /subscriber failed/)
    assert.match(diagnostics[0][1].message, /broken consumer/)
  } finally { console.error = previous }
})

test('reentrant factory cannot silently overwrite another registration with the same typeId', () => {
  const registry = new HomeWidgetRegistry()
  assert.throws(() => registry.register(widget({ defaultConfig: () => {
    registry.register(widget({ title: 'Inner registration' }))
    return { text: '' }
  } })), /duplicate typeId/)
  assert.equal(registry.get('@test/widgets:notes').title, 'Inner registration')
  assert.equal(registry.getSnapshot().length, 1)
})

test('registration rejects unsupported versions, invalid metadata, components and geometry without publishing', () => {
  const invalid = [
    [{ apiVersion: 2 }, /apiVersion/], [{ apiVersion: '1' }, /apiVersion/],
    ...[0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map(configVersion => [{ configVersion }, /configVersion/]),
    [{ title: '' }, /title/], [{ title: 1 }, /title/], [{ description: '' }, /description/],
    [{ source: '' }, /source/], [{ Content: undefined }, /Content/], [{ Settings: {} }, /Settings/], [{ icon: 'svg' }, /icon/],
    [{ defaultConfig: {} }, /defaultConfig/], [{ validateConfig: false }, /validateConfig/], [{ migrateConfig: true }, /migrateConfig/],
    [{ defaults: null }, /defaults/], [{ defaults: { size: 'xl' } }, /size/],
    [{ defaults: { height: 2 } }, /height/], [{ defaults: { height: 31 } }, /height/],
    ...[0, 1, 2].map(minWidth => [{ defaults: { minWidth } }, /minWidth.*between 3 and 12/]),
    ...[1, 2, 13].map(maxWidth => [{ defaults: { maxWidth } }, /maxWidth.*between 3 and 12/]),
    [{ defaults: { minHeight: 4.5 } }, /minHeight/], [{ defaults: { maxHeight: Infinity } }, /maxHeight/],
    [{ defaults: { minWidth: 8, maxWidth: 4 } }, /minWidth/],
    [{ defaults: { minHeight: 5, maxHeight: 4 } }, /minHeight/],
    [{ defaults: { minHeight: 5 } }, /height/],
    [{ defaults: { size: 'l', maxWidth: 8 } }, /size/],
    [{ defaults: { unexpected: 3 } }, /unexpected/],
  ]
  for (const [overrides, expected] of invalid) {
    const registry = new HomeWidgetRegistry()
    const before = registry.getSnapshot()
    assert.throws(() => registry.register(widget(overrides)), expected)
    assert.strictEqual(registry.getSnapshot(), before)
  }
})

test('default factories and validators must be synchronous, JSON-safe and semantically valid', () => {
  for (const [overrides, pattern] of [
    [{ defaultConfig: () => undefined }, /defaultConfig.*JSON/],
    [{ defaultConfig: async () => ({ text: '' }) }, /defaultConfig.*synchronously/],
    [{ defaultConfig: async () => { throw new Error('async factory failure') } }, /defaultConfig.*synchronously/],
    [{ defaultConfig: () => ({ text: 10 }) }, /text must be a string/],
    [{ defaultConfig: () => { throw new Error('factory exploded') } }, /factory exploded/],
    [{ validateConfig: () => false }, /validateConfig rejected/],
    [{ validateConfig: () => 'precise diagnostic' }, /precise diagnostic/],
    [{ validateConfig: () => { throw new Error('validator exploded') } }, /validator exploded/],
    [{ validateConfig: () => Promise.resolve(true) }, /synchronously/],
    [{ validateConfig: async () => { throw new Error('async validator failure') } }, /synchronously/],
    [{ validateConfig: () => ({ ok: true }) }, /synchronously/],
  ]) {
    const registry = new HomeWidgetRegistry()
    assert.throws(() => registry.register(widget(overrides)), pattern)
    assert.equal(registry.getSnapshot().length, 0)
  }
})

test('default config and constructed instances are independent even when provider reuses one object', () => {
  const shared = { text: 'default', nested: { tags: ['one'] } }
  const registry = new HomeWidgetRegistry()
  registry.register(widget({ defaultConfig: () => shared, validateConfig: config => {
    config.nested.tags.push('validator mutation')
    return true
  } }))
  const definition = registry.get('@test/widgets:notes')
  const first = definition.defaultConfig()
  const second = definition.defaultConfig()
  const instance = registry.createInstance('@test/widgets:notes', 'notes-a')
  assert.deepEqual(first, shared)
  first.nested.tags.push('first only')
  instance.config.nested.tags.push('instance only')
  assert.deepEqual(second.nested.tags, ['one'])
  assert.deepEqual(shared.nested.tags, ['one'])
  assert.notStrictEqual(first, second)
  assert.deepEqual(Object.keys(instance).sort(), ['config', 'configVersion', 'instanceId', 'typeId'])
  assert.equal(instance.configVersion, 1)
  assert.throws(() => registry.createInstance('missing:type', 'notes-b'), /unknown typeId/)
  for (const id of ['', 'bad id', '__proto__', 'x'.repeat(201)]) {
    assert.throws(() => registry.createInstance('@test/widgets:notes', id), /instanceId/)
  }
})

test('every later factory call remains validated rather than trusting the registration probe', () => {
  let valid = true
  const registry = new HomeWidgetRegistry()
  registry.register(widget({ defaultConfig: () => valid ? { text: '' } : { text: null } }))
  valid = false
  assert.throws(() => registry.createInstance('@test/widgets:notes', 'notes-1'), /defaultConfig.*text must be a string/)
})

test('JSON clone accepts plain/null-prototype records and repeated references without retaining aliases', () => {
  const nested = { text: 'hello' }
  const object = Object.assign(Object.create(null), { a: nested, b: nested })
  const input = [null, true, 42, 'text', object]
  const cloned = cloneWidgetConfig(input)
  assert.deepEqual(cloned, [null, true, 42, 'text', { a: { text: 'hello' }, b: { text: 'hello' } }])
  assert.notStrictEqual(cloned[4].a, nested)
  assert.notStrictEqual(cloned[4].a, cloned[4].b)
  assert.strictEqual(Object.getPrototypeOf(cloned[4]), Object.prototype)
})

test('JSON clone rejects unsafe prototypes, keys, getters, cycles, sparse arrays and non-JSON values', () => {
  let accessed = false
  const getter = Object.defineProperty({}, 'secret', { enumerable: true, get() { accessed = true; return 'no' } })
  const cycle = {}; cycle.self = cycle
  const namedArray = []; namedArray.extra = 1
  const nonenumerable = Object.defineProperty({}, 'hidden', { value: 1 })
  const symbolKey = { [Symbol('secret')]: true }
  for (const value of [
    undefined, NaN, Infinity, -Infinity, 1n, () => null, Symbol('x'),
    new Date(), new Map(), new Set(), new Uint8Array(2), Promise.resolve(1),
    Object.create({ polluted: true }), JSON.parse('{"__proto__":{"polluted":true}}'),
    { nested: { constructor: {} } }, { prototype: {} }, getter, nonenumerable,
    cycle, new Array(2), [undefined], namedArray, symbolKey,
  ]) assert.throws(() => cloneWidgetConfig(value), /homeWidgets:/)
  assert.equal(accessed, false)
  assert.equal({}.polluted, undefined)
})

test('JSON validation bounds depth, nodes, keys and serialized UTF-8 bytes before saving', () => {
  let deep = null
  for (let i = 0; i <= WIDGET_JSON_LIMITS.maxDepth; i++) deep = { child: deep }
  assert.throws(() => cloneWidgetConfig(deep), /depth limit/)
  assert.throws(() => cloneWidgetConfig(Array(WIDGET_JSON_LIMITS.maxNodes).fill(null)), /node limit/)
  assert.throws(() => cloneWidgetConfig('x'.repeat(WIDGET_JSON_LIMITS.maxBytes + 1)), /byte limit/)
  assert.throws(() => cloneWidgetConfig('汉'.repeat(3000)), /byte limit/)
  assert.throws(() => cloneWidgetConfig('\n'.repeat(5000)), /byte limit/)
  assert.throws(() => cloneWidgetConfig({ ['k'.repeat(WIDGET_JSON_LIMITS.maxKeyLength + 1)]: null }), /key exceeds/)
  assert.equal(cloneWidgetConfig('x'.repeat(WIDGET_JSON_LIMITS.maxBytes - 2)).length, 8190)
})

test('migration validates and clones equal-version configs without calling migrateConfig', () => {
  const input = raw()
  const result = migrateWidgetInstance(widget({ migrateConfig: () => { throw new Error('not called') } }), input)
  assert.equal(result.ok, true)
  assert.equal(result.migrated, false)
  assert.deepEqual(result.instance, input)
  assert.notStrictEqual(result.instance, input)
  assert.notStrictEqual(result.instance.config, input.config)
  const config = validateWidgetConfig(widget(), input.config)
  assert.notStrictEqual(config, input.config)
})

test('migration runs once to target version on an isolated config then validates output', () => {
  const input = raw({ text: 'old', nested: { count: 1 } })
  let calls = 0
  const result = migrateWidgetInstance(widget({ configVersion: 3, migrateConfig: (config, from, to) => {
    calls++
    assert.equal(from, 1)
    assert.equal(to, 3)
    config.nested.count++
    return { text: config.text + ' migrated', count: config.nested.count }
  } }), input)
  assert.equal(result.ok, true)
  assert.equal(result.migrated, true)
  assert.equal(calls, 1)
  assert.equal(result.instance.configVersion, 3)
  assert.deepEqual(result.instance.config, { text: 'old migrated', count: 2 })
  assert.deepEqual(input.config, { text: 'old', nested: { count: 1 } })
})

test('all migration failures preserve exact raw instance and return actionable diagnostics', () => {
  const cases = [
    [widget({ configVersion: 2 }), raw(), /migrateConfig is required/],
    [widget(), raw({}, 2), /newer/],
    [widget(), raw({}, 0), /instance configVersion/],
    [widget({ typeId: 'different:type' }), raw(), /typeId/],
    [widget(), raw({ text: 42 }), /text must be a string/],
    [widget(), raw({ text: '', constructor: true }), /unsafe config key/],
    [widget({ configVersion: 2, migrateConfig: config => { config.text = 'mutated'; throw new Error('migration exploded') } }), raw(), /migration exploded/],
    [widget({ configVersion: 2, migrateConfig: async () => ({ text: '' }) }), raw(), /synchronously/],
    [widget({ configVersion: 2, migrateConfig: async () => { throw new Error('async migration failure') } }), raw(), /synchronously/],
    [widget({ configVersion: 2, migrateConfig: () => ({ text: 0 }) }), raw(), /text must be a string/],
    [widget({ configVersion: 2, migrateConfig: () => ({ text: '', dangerous: undefined }) }), raw(), /JSON/],
  ]
  for (const [definition, input, expected] of cases) {
    const original = structuredClone(input)
    const result = migrateWidgetInstance(definition, input)
    assert.equal(result.ok, false)
    assert.strictEqual(result.instance, input)
    assert.deepEqual(input, original)
    assert.match(result.error, expected)
    assert.match(result.error, /Widget/)
  }
})

test('contract is type-only and registry runtime imports stay within the pure sizing helper', async () => {
  const contract = await readFile(new URL('../src/client/widget-contract.ts', import.meta.url), 'utf8')
  const registry = await readFile(new URL('../src/client/widget-registry.ts', import.meta.url), 'utf8')
  assert.match(contract, /declare module '@deepseek-ai\/cordis'/)
  assert.match(contract, /homeWidgets: HomeWidgets/)
  assert.doesNotMatch(contract, /^import (?!type\b)/m)
  const runtimeImports = [...registry.matchAll(/^import (?!type\b)[\s\S]*?from ['"]([^'"]+)['"]/gm)].map(match => match[1])
  assert.deepEqual(runtimeImports, ['./widget-sizing.ts'])
  const sizing = await readFile(new URL('../src/client/widget-sizing.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(sizing, /^import (?!type\b)/m)
  for (const source of [registry, sizing]) assert.doesNotMatch(source, /from ['"].*(?:store|geometry|spatial|react)/)
})
