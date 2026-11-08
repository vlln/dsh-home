/**
 * The asset layer is the product: a widget may fill in data, but it may not
 * bypass the收口, invent a colour, or register without an icon and a size.
 * These assertions run over the real source tree, not fixtures.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { runChecks } from '../scripts/check-assets.mjs'

test('asset layer: one entry point, no literal colour, registration contract', () => {
  const { groups, failures, scanned } = runChecks()
  assert.ok(scanned > 50, `expected to scan the client tree, scanned ${scanned}`)
  for (const [group, list] of Object.entries(groups)) {
    assert.deepEqual(list, [], `${group}:\n${list.join('\n')}`)
  }
  assert.deepEqual(failures, [])
})
