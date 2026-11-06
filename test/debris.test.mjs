import { test } from 'node:test'
import assert from 'node:assert/strict'
import { debrisLifetime, debrisParticles, debrisPuff, seededRandom } from '../src/client/debris.ts'

const W = 372, H = 436

test('the dust lifts off inside the card footprint', () => {
  for (const seed of [1, 2, 7, 99]) {
    const particles = debrisParticles(W, H, seededRandom(seed))
    assert.equal(particles.length, 46)
    for (const particle of particles) {
      assert.ok(particle.x >= 0 && particle.x <= W, `x inside the card (${particle.x})`)
      assert.ok(particle.y >= 0 && particle.y <= H, `y inside the card (${particle.y})`)
      assert.ok(particle.size >= 2 && particle.size <= 7, `small particles only (${particle.size})`)
      assert.ok(particle.opacity >= .45 && particle.opacity <= .85, 'translucent dust')
      assert.ok(particle.tone >= 0 && particle.tone <= 2)
    }
  }
})

test('debris drifts away from the middle of the card, biased toward its edges', () => {
  const particles = debrisParticles(W, H, seededRandom(5))
  const left = particles.filter(particle => particle.x < W / 3)
  const right = particles.filter(particle => particle.x > W * 2 / 3)
  assert(left.length > 0 && right.length > 0, 'both sides of the card are dusted')
  assert(left.every(particle => particle.dx <= 24), 'the left side never flies right')
  assert(right.every(particle => particle.dx >= -24), 'the right side never flies left')
  // The cloud radiates: top-edge dust lifts, bottom-edge dust sinks. Nothing is hurled
  // across the screen the way a hard shard would be.
  const top = particles.filter(particle => particle.y < H / 3)
  const bottom = particles.filter(particle => particle.y > H * 2 / 3)
  assert(top.length > 0 && bottom.length > 0)
  const average = list => list.reduce((total, particle) => total + particle.dy, 0) / list.length
  assert(average(top) < -20, 'the top edge lifts')
  assert(average(bottom) > average(top) + 30, 'the cloud radiates: the lower half settles instead')
  assert(particles.every(particle => particle.dy >= -140 && particle.dy <= 60))
  assert(particles.every(particle => Math.abs(particle.dx) <= W))
})

test('the puff is reproducible from its seed', () => {
  const first = debrisPuff(W, H, seededRandom(42))
  const second = debrisPuff(W, H, seededRandom(42))
  assert.deepEqual(first, second)
  assert.notDeepEqual(first, debrisPuff(W, H, seededRandom(43)))
  assert.equal(first.halo, Math.round(Math.min(W, H) * 0.95))
})

test('the layer lives as long as the slowest piece plus a grace period', () => {
  const puff = debrisPuff(W, H, seededRandom(11))
  const slowest = Math.max(...puff.particles.map(particle => particle.delay + particle.duration))
  assert.equal(debrisLifetime(puff), Math.max(slowest, puff.haloDuration) + 140)
  assert.ok(debrisLifetime(puff) > 500 && debrisLifetime(puff) < 1200)
})
