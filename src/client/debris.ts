/**
 * Geometry for the delete shatter. The card is diced into tiles that fly apart and fall
 * while a handful of small chips (碎屑) scatter with it. Everything here is pure and
 * seeded: the burst is reproducible, and the DOM runner in `debris-burst.ts` only turns
 * these numbers into elements and animations.
 */

export interface DebrisTile {
  left: number
  top: number
  width: number
  height: number
  /** Horizontal escape distance, in pixels, away from the card's middle. */
  dx: number
  /** Vertical drop; always downward, because debris falls. */
  dy: number
  rotate: number
  delay: number
  duration: number
}

export interface DebrisChip {
  left: number
  top: number
  size: number
  dx: number
  dy: number
  rotate: number
  delay: number
  duration: number
  /** Which sampled card colour the chip uses: 0 background, 1 border, 2 accent. */
  tone: number
}

/** Deterministic PRNG (mulberry32) so a burst can be replayed in tests. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Tiles must exactly cover the card: rounding happens on the shared borders. */
export function debrisTiles(width: number, height: number, random: () => number, columns = 3, rows = 3): DebrisTile[] {
  const tiles: DebrisTile[] = []
  const edge = (total: number, index: number, count: number): number => Math.round(total * index / count)
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = edge(width, column, columns)
      const right = edge(width, column + 1, columns)
      const top = edge(height, row, rows)
      const bottom = edge(height, row + 1, rows)
      const awayX = (left + right) / 2 - width / 2
      const awayY = (top + bottom) / 2 - height / 2
      // Pieces leave the middle sideways, then gravity wins: dy is always downward.
      const spread = 0.85 + random() * 0.8
      tiles.push({
        left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top),
        dx: Math.round(awayX * spread + (random() - 0.5) * 24),
        dy: Math.max(12, Math.round(awayY * 0.3 + 54 + random() * 110)),
        rotate: Math.round((random() - 0.5) * 34),
        delay: Math.round(random() * 40),
        duration: 560 + Math.round(random() * 200),
      })
    }
  }
  return tiles
}

/** Small chips that leave the card faster and fade earlier than the big tiles. */
export function debrisChips(width: number, height: number, random: () => number, count = 26): DebrisChip[] {
  const chips: DebrisChip[] = []
  for (let index = 0; index < count; index++) {
    const left = random() * width
    const top = random() * height
    chips.push({
      left: Math.round(left), top: Math.round(top), size: 3 + Math.floor(random() * 6),
      dx: Math.round((left - width / 2) * (0.6 + random() * 0.9)),
      dy: Math.round((top - height / 2) * 0.5 + 60 + random() * 120),
      rotate: Math.round((random() - 0.5) * 180),
      delay: Math.round(random() * 60),
      duration: 620 + Math.round(random() * 240),
      tone: Math.floor(random() * 3),
    })
  }
  return chips
}

/** Longest animation in the burst; the runner keeps the layer alive this long. */
export function debrisLifetime(tiles: readonly DebrisTile[], chips: readonly DebrisChip[]): number {
  const longest = Math.max(0, ...tiles.map(tile => tile.delay + tile.duration), ...chips.map(chip => chip.delay + chip.duration))
  return longest + 120
}
