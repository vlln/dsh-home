// Candidate credential references for the balance read: current describe() rows keep
// `apiKeyEnv` under `value`, older hosts had it flat, and pi-ai providers nest it under
// `value.providers`. DeepSeek rows come first so another provider's key is never used.
import assert from 'node:assert/strict'
import test from 'node:test'
import { platformKeyRefs } from '../src/balance-key.mjs'

test('current describe() shape: apiKeyEnv lives under value', () => {
  const rows = [{ ns: 'llm-deepseek', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }]
  assert.deepEqual(platformKeyRefs(rows), ['DEEPSEEK_API_KEY'])
})

test('legacy flat shape is still accepted', () => {
  const rows = [{ ns: 'old-host', apiKeyEnv: 'LEGACY_KEY' }]
  assert.deepEqual(platformKeyRefs(rows), ['LEGACY_KEY'])
})

test('providers nested under value.providers contribute their own refs', () => {
  const rows = [{ ns: 'llm-pi-ai', value: { providers: { official: { apiKeyEnv: 'DEEPSEEK_OFFICIAL_KEY' } } } }]
  assert.deepEqual(platformKeyRefs(rows), ['DEEPSEEK_OFFICIAL_KEY'])
})

test('volatile leaves are unwrapped and empty/non-string refs are dropped', () => {
  const rows = [
    { ns: 'a', value: { apiKeyEnv: { get: () => 'FROM_VOLATILE' } } },
    { ns: 'b', value: { apiKeyEnv: '' } },
    { ns: 'c', value: { apiKeyEnv: 42 } },
    { ns: 'd', value: {} },
    {},
  ]
  assert.deepEqual(platformKeyRefs(rows), ['FROM_VOLATILE'])
})

test('deepseek rows come first, the rest keep their row order, refs are unique', () => {
  const rows = [
    { ns: 'llm-pi-ai', value: { providers: { x: { apiKeyEnv: 'P' } } } },
    { ns: 'web-search', value: { apiKeyEnv: 'SEARCH_KEY' } },
    { ns: 'llm-deepseek', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' } },
    { ns: 'deepseek-other', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' } },
  ]
  assert.deepEqual(platformKeyRefs(rows), ['DEEPSEEK_API_KEY', 'P', 'SEARCH_KEY'])
})

test('non-array input yields no refs', () => {
  assert.deepEqual(platformKeyRefs(undefined), [])
  assert.deepEqual(platformKeyRefs(null), [])
  assert.deepEqual(platformKeyRefs({}), [])
})
