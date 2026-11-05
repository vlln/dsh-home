/** Collision dwell state, advanced only by the caller's clock and snapped grid rect. */
export const HOVER_DWELL_MS = 500

export interface HoverIntent {
  key: string
  since: number
  confirmed: boolean
}

export function advanceHover(
  previous: HoverIntent | null,
  candidate: { x: number; y: number; w: number; h: number },
  colliding: boolean,
  now: number,
): { intent: HoverIntent | null; ready: boolean; remaining: number } {
  if (!colliding) return { intent: null, ready: true, remaining: 0 }

  // Invalid samples cannot confirm a collision or seed an artificial start time.
  if (!Number.isFinite(now) || now < 0) {
    return { intent: null, ready: false, remaining: HOVER_DWELL_MS }
  }

  const key = `${candidate.x},${candidate.y},${candidate.w},${candidate.h}`
  if (!previous || previous.key !== key || !Number.isFinite(previous.since)
    || previous.since < 0 || now < previous.since) {
    return {
      intent: { key, since: now, confirmed: false },
      ready: false,
      remaining: HOVER_DWELL_MS,
    }
  }

  const remaining = Math.max(0, HOVER_DWELL_MS - (now - previous.since))
  if (previous.confirmed || remaining === 0) {
    return {
      intent: previous.confirmed ? previous : { ...previous, confirmed: true },
      ready: true,
      remaining: 0,
    }
  }
  return { intent: previous, ready: false, remaining }
}
