import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bucketsOf, cacheHitRate, compactCount, emptyBuckets, sumDays, tokensPerSecond, totalTokens } from '../src/client/usage-model.ts'

test('buckets read defensively from a day', () => {
  assert.deepEqual(bucketsOf(undefined), emptyBuckets())
  assert.deepEqual(bucketsOf({}), emptyBuckets())
  assert.deepEqual(bucketsOf({ tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 } }), { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 })
})

test('totals and weekly sums add every bucket', () => {
  assert.equal(totalTokens({ input: 10, output: 5, cacheRead: 100, cacheWrite: 0 }), 115)
  const days = [
    { tokens: { input: 10, output: 1, cacheRead: 0, cacheWrite: 0 } },
    { tokens: { input: 5, output: 2, cacheRead: 50, cacheWrite: 1 } },
    {},
  ]
  assert.deepEqual(sumDays(days), { input: 15, output: 3, cacheRead: 50, cacheWrite: 1 })
})

test('the cache hit rate ignores output and answers null without prompt tokens', () => {
  assert.equal(cacheHitRate({ input: 30, output: 999, cacheRead: 70, cacheWrite: 0 }), 0.7)
  assert.equal(cacheHitRate(emptyBuckets()), null)
  assert.equal(cacheHitRate({ input: 0, output: 5, cacheRead: 0, cacheWrite: 0 }), null)
})

test('the output rate needs a real run duration', () => {
  assert.equal(tokensPerSecond({ input: 0, output: 600, cacheRead: 0, cacheWrite: 0 }, 60_000), 10)
  assert.equal(tokensPerSecond({ input: 0, output: 600, cacheRead: 0, cacheWrite: 0 }, 0), null)
  assert.equal(tokensPerSecond({ input: 0, output: 600, cacheRead: 0, cacheWrite: 0 }, Number.NaN), null)
})

test('compact counts stay short and never invent precision', () => {
  assert.equal(compactCount(0), '0')
  assert.equal(compactCount(999), '999')
  assert.equal(compactCount(1234), '1.2k')
  assert.equal(compactCount(12_400), '12k')
  assert.equal(compactCount(3_400_000), '3.4M')
  assert.equal(compactCount(-5), '0')
})
