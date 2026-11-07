import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBalance } from '../src/index.mjs'

test('a platform balance becomes the four numbers the card shows', () => {
  assert.deepEqual(parseBalance({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '128.50', granted_balance: '0.00', topped_up_balance: '128.50' }] }),
    { available: true, currency: 'CNY', total: 128.5, granted: 0, toppedUp: 128.5 })
})

test('a missing or malformed body answers a typed reason', () => {
  assert.deepEqual(parseBalance(null), { available: false, reason: 'bad-response' })
  assert.deepEqual(parseBalance({ balance_infos: [] }), { available: false, reason: 'bad-response' })
  assert.deepEqual(parseBalance({ balance_infos: [{ total_balance: 'nope' }] }), { available: false, reason: 'bad-response' })
})

test('optional split balances stay null when absent', () => {
  assert.deepEqual(parseBalance({ balance_infos: [{ total_balance: 12 }] }), { available: true, currency: 'CNY', total: 12, granted: null, toppedUp: null })
})
