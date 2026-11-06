import { test } from 'node:test'
import assert from 'node:assert/strict'
import { debrisChips, debrisLifetime, debrisTiles, seededRandom } from '../src/client/debris.ts'

const tileArea = tiles => tiles.reduce((total, tile) => total + tile.width * tile.height, 0)

test('the tiles cover the card exactly, with no gap or overlap', () => {
  for (const [width, height] of [[372, 436], [756, 548], [300, 300]]) {
    const tiles = debrisTiles(width, height, seededRandom(7))
    assert.equal(tileArea(tiles), width * height, `${width}x${height} fully covered`)
    for (const tile of tiles) {
      assert.ok(tile.left >= 0 && tile.top >= 0)
      assert.ok(tile.left + tile.width <= width && tile.top + tile.height <= height)
    }
  }
})

test('debris always falls and outer pieces leave the middle sideways', () => {
  for (const seed of [1, 2, 3, 99]) {
    const tiles = debrisTiles(756, 548, seededRandom(seed))
    assert(tiles.every(tile => tile.dy > 0), 'every piece drops')
    const leftmost = tiles.filter(tile => tile.left === 0)
    const rightmost = tiles.filter(tile => tile.left + tile.width === 756)
    assert(leftmost.every(tile => tile.dx < 0), 'the left edge flies left')
    assert(rightmost.every(tile => tile.dx > 0), 'the right edge flies right')
    assert(tiles.every(tile => Math.abs(tile.rotate) <= 17))
  }
})

test('the burst is reproducible from its seed', () => {
  const first = debrisTiles(372, 436, seededRandom(42))
  const second = debrisTiles(372, 436, seededRandom(42))
  assert.deepEqual(first, second)
  assert.notDeepEqual(first, debrisTiles(372, 436, seededRandom(43)))
})

test('chips start inside the card and pick one of three material tones', () => {
  const random = seededRandom(5)
  const chips = debrisChips(372, 436, random, 26)
  assert.equal(chips.length, 26)
  for (const chip of chips) {
    assert.ok(chip.left >= 0 && chip.left <= 372)
    assert.ok(chip.top >= 0 && chip.top <= 436)
    assert.ok(chip.size >= 3 && chip.size <= 8)
    assert.ok(chip.tone >= 0 && chip.tone <= 2)
    assert.ok(chip.dy > 0)
  }
})

test('the layer lives exactly as long as the slowest piece', () => {
  const random = seededRandom(11)
  const tiles = debrisTiles(372, 436, random)
  const chips = debrisChips(372, 436, random)
  const slowest = Math.max(...tiles.map(tile => tile.delay + tile.duration), ...chips.map(chip => chip.delay + chip.duration))
  assert.equal(debrisLifetime(tiles, chips), slowest + 120)
})
