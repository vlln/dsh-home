import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  QUICK_CONFIG_VERSION, QUICK_LIMITS, QUICK_TYPE_ID,
  defaultQuickConfig, isSafeQuickSession, isSafeQuickUrl, isSafeQuickWorkdir,
  migrateQuickConfig, quickConfigError, quickLinkError, quickWorkdirDraft, validateQuickConfig,
} from '../src/client/quick-model.ts'
import { HomeWidgetRegistry, migrateWidgetInstance } from '../src/client/widget-registry.ts'
import { enQuick, zhQuick } from '../src/client/quick-locales.ts'

const link = (kind = 'url', target = 'https://example.com/a?q=1#part') => ({ kind, label: 'Shortcut', target })
const definition = () => ({
  typeId: QUICK_TYPE_ID, apiVersion: 1, title: 'Quick', defaults: { size: 's', height: 4 },
  configVersion: QUICK_CONFIG_VERSION, defaultConfig: defaultQuickConfig,
  validateConfig: validateQuickConfig, migrateConfig: migrateQuickConfig, Content: () => null,
})

test('legacy empty v1 quick config migrates without changing instance identity or geometry', () => {
  const registry = new HomeWidgetRegistry()
  registry.register(definition())
  const old = { instanceId: 'builtin:quick', typeId: QUICK_TYPE_ID, configVersion: 1, config: {} }
  const migrated = migrateWidgetInstance(registry.get(QUICK_TYPE_ID), old)
  assert.equal(migrated.ok, true)
  assert.equal(migrated.migrated, true)
  assert.deepEqual(migrated.instance, { ...old, configVersion: 2, config: { links: [] } })
  assert.deepEqual(old.config, {})
  assert.equal(old.configVersion, 1)
  assert.equal(registry.get(QUICK_TYPE_ID).defaults.size, 's')
  assert.equal(registry.get(QUICK_TYPE_ID).defaults.height, 4)
  assert.notStrictEqual(migrateQuickConfig({}, 1, 2).links, migrateQuickConfig({}, 1, 2).links)
  for (const args of [[{}, 0, 2], [{}, 1, 3], [{}, 2, 2], [{ links: [] }, 1, 2], [null, 1, 2]]) {
    assert.throws(() => migrateQuickConfig(...args), /Unsupported/)
  }
})

test('quick instances have independent JSON configuration and fresh defaults', () => {
  const registry = new HomeWidgetRegistry()
  const dispose = registry.register(definition())
  const a = registry.createInstance(QUICK_TYPE_ID, 'quick-a')
  const b = registry.createInstance(QUICK_TYPE_ID, 'quick-b')
  assert.notStrictEqual(a.config, b.config)
  assert.notStrictEqual(a.config.links, b.config.links)
  const edited = { ...a.config, links: [link()] }
  assert.equal(validateQuickConfig(edited), true)
  assert.deepEqual(b.config, { links: [] })
  assert.deepEqual(defaultQuickConfig(), { links: [] })
  dispose()
  assert.equal(registry.get(QUICK_TYPE_ID), undefined)
})

test('HTTP(S) validation accepts explicit web URLs only', () => {
  for (const target of ['https://example.com', 'http://localhost:3081/path', 'https://example.com/%E4%B8%AD', 'https://例子.测试/路径', 'HTTPS://example.com']) {
    assert.equal(isSafeQuickUrl(target), true, target)
  }
  for (const target of [
    'javascript:alert(1)', 'JavaScript://example.com', 'file:///etc/passwd', 'data:text/html,<h1>x</h1>',
    'mailto:a@example.com', 'tel:123', 'ftp://example.com', 'dsh://session/id', 'vscode://file/a',
    '//example.com', '/relative', 'example.com', 'https:example.com', 'https:///example.com',
    ' https://example.com', 'https://example.com ', 'https://exa mple.com', 'https://user:pass@example.com',
    'https://example.com\n', 'https://example.com/\u0000', 'https://example.com/\u007f',
    'https://example.com\\@evil.example', 'http://', '', null, 23, 'https://example.com/' + 'a'.repeat(QUICK_LIMITS.url),
  ]) assert.equal(isSafeQuickUrl(target), false, String(target))
})

test('external schemes are never accepted as session IDs or local working directories', () => {
  for (const target of ['javascript:alert(1)', 'file:///tmp', 'data:text/plain,x', 'https://example.com', 'mailto:a@b', 'vscode://file/tmp', 'dsh://session/a', 'x://example.com']) {
    assert.equal(isSafeQuickSession(target), false, target)
    assert.equal(isSafeQuickWorkdir(target), false, target)
    assert.equal(quickLinkError(link('session', target)), 'session')
    assert.equal(quickLinkError(link('workdir', target)), 'workdir')
  }
})

test('session IDs and working-directory paths are bounded and reject controls or network shares', () => {
  for (const target of ['session-abc_123', '019a-abcdef-1234', 'abc.def']) assert.equal(isSafeQuickSession(target), true)
  for (const target of ['', 'a/b', '../a', '.hidden', 'white space', 'a\n', 'a'.repeat(201), null]) assert.equal(isSafeQuickSession(target), false)
  assert.equal(isSafeQuickSession('a'.repeat(200)), true)
  for (const target of ['/project/with space', '~/Projects', './repo', '../repo', 'repo', 'C:\\Projects\\repo', 'D:/repo', '/']) assert.equal(isSafeQuickWorkdir(target), true, target)
  for (const target of ['', ' ', '/tmp\u0000', '/tmp\n', '//server/share', '\\\\server\\share', ' x', 'x ', '/'.repeat(4097), null]) assert.equal(isSafeQuickWorkdir(target), false, String(target))
  assert.equal(isSafeQuickWorkdir('/' + 'a'.repeat(4095)), true)
})

test('config validation enforces up to eight complete labeled links and no extra fields', () => {
  assert.equal(validateQuickConfig({ links: [] }), true)
  assert.equal(validateQuickConfig({ links: [link(), link('session', 'session-1'), link('workdir', '/repo')] }), true)
  assert.equal(validateQuickConfig({ links: Array.from({ length: 8 }, () => link()) }), true)
  assert.equal(quickConfigError({ links: Array.from({ length: 9 }, () => link()) }), 'limit')
  for (const invalid of [null, {}, [], { links: null }, { links: [null] }, { links: [link()], executable: true }, { links: [{ ...link(), script: 'x' }] }]) assert.equal(validateQuickConfig(invalid), false)
  for (const label of ['', ' ', 'a'.repeat(81), 'bad\nlabel', 'bad\u007flabel']) assert.equal(quickLinkError({ ...link(), label }), 'label')
  assert.equal(quickLinkError({ ...link(), label: 'a'.repeat(80) }), null)
  assert.equal(quickLinkError(link('command', 'whoami')), 'kind')
  assert.equal(quickLinkError(link('url', 'javascript:alert(1)')), 'url')
})

test('workdir action payload is always a blank unsent draft and leaves existing draft text untouched', () => {
  const existingDraft = 'Unsent user text'
  assert.deepEqual(quickWorkdirDraft('/repo'), { cwd: '/repo', prompt: '' })
  assert.equal(existingDraft + quickWorkdirDraft('/repo').prompt, existingDraft)
  assert.throws(() => quickWorkdirDraft('javascript:alert(1)'), /Invalid/)
})

test('quick locale dictionaries have identical complete keys', () => {
  assert.deepEqual(Object.keys(zhQuick).sort(), Object.keys(enQuick).sort())
  for (const dictionary of [zhQuick, enQuick]) for (const value of Object.values(dictionary)) assert.ok(value.trim())
})
