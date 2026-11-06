/**
 * Geometry for the delete puff: the card itself is gone the moment it is dropped, and a
 * small cloud of debris lifts off around where it was — the same read as deleting an app
 * on a phone. Everything here is pure and seeded so the burst can be replayed in tests;
 * `debris-burst.ts` only turns these numbers into elements and animations.
 */

export interface DebrisParticle {
  /** Where the dust lifts off inside the card footprint. */
  x: number
  y: number
  size: number
  /** Outward travel away from the card's middle. */
  dx: number
  dy: number
  delay: number
  duration: number
  /** Which sampled card colour the particle uses: 0 label, 1 border, 2 accent. */
  tone: number
  /** Starting alpha; the dust is translucent, it is not a solid object. */
  opacity: number
}

export interface DebrisPuff {
  particles: DebrisParticle[]
  /** Diameter of the soft halo that blooms behind the dust, centred on the card. */
  halo: number
  haloDuration: number
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

/**
 * Mostly uniform across the card, with a bias toward its edges so the cloud reads as a
 * rim of dust around the footprint rather than a dot in the middle.
 */
export function debrisParticles(width: number, height: number, random: () => number, count = 46): DebrisParticle[] {
  const particles: DebrisParticle[] = []
  for (let index = 0; index < count; index++) {
    const edge = index % 3 === 0
    const x = edge ? (random() < 0.5 ? random() * width * 0.18 : width - random() * width * 0.18) : random() * width
    const y = edge ? (random() < 0.5 ? random() * height * 0.18 : height - random() * height * 0.18) : random() * height
    const awayX = x - width / 2
    const awayY = y - height / 2
    const reach = 0.35 + random() * 0.55
    particles.push({
      x: Math.round(x), y: Math.round(y), size: 2 + Math.floor(random() * 6),
      // Dust drifts outward and slightly up, then settles; it is not thrown like a shard.
      dx: Math.round(awayX * reach + (random() - 0.5) * 26),
      dy: Math.round(awayY * reach * 0.45 - 6 - random() * 34),
      delay: Math.round(random() * 70),
      duration: 380 + Math.round(random() * 240),
      tone: index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
      opacity: 0.45 + random() * 0.4,
    })
  }
  return particles
}

/** @param width source card width so the bloom roughly matches its footprint. */
export function debrisPuff(width: number, height: number, random: () => number, count = 46): DebrisPuff {
  const particles = debrisParticles(width, height, random, count)
  // Slightly smaller than the footprint: the bloom is a glow at the centre, not a disc
  // that covers the whole card area with a hard edge.
  return { particles, halo: Math.round(Math.min(width, height) * 0.95), haloDuration: 420 }
}

/** How long the layer must stay alive: the slowest particle plus a small grace. */
export function debrisLifetime(puff: DebrisPuff): number {
  const slowest = Math.max(0, ...puff.particles.map(particle => particle.delay + particle.duration))
  return Math.max(slowest, puff.haloDuration) + 140
}
