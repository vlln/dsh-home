/** Pure drag previews. Always pass the geometry captured at the start of the drag. */
import type { GridRect } from './api.ts'
import type { SpatialItem } from './spatial-model.ts'
import { canPlace, SPATIAL_MAX_Y } from './spatial-model.ts'
import { CANVAS_MAX_COLUMNS } from './canvas-width.ts'

type Point = { x: number; y: number }
export type DisplacementDirection = 'up' | 'down' | 'left' | 'right'
const SNAP_DISTANCE = 0.22
const RELEASE_DISTANCE = 0.62
const EPSILON = 1e-9

function validColumns(cols: number): boolean {
  // Any real grid width, up to the widest fixed-stride canvas.
  return Number.isInteger(cols) && cols >= 1 && cols <= CANVAS_MAX_COLUMNS
}

function overlaps(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w
    && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Choose among direct collisions only, excluding the active card. A target under
 * the pointer wins; otherwise use the target nearest the candidate's center.
 * Equal distances retain snapshot order. Use the dominant normalized center
 * offset to push away from the pointer (or candidate center), preferring vertical
 * on axis ties and down at the exact center. Coordinates are grid units.
 */
export function displacementDirection(
  snapshot: readonly SpatialItem[], id: string, candidate: GridRect, pointer?: Point,
): DisplacementDirection {
  const center = { x: candidate.x + candidate.w / 2, y: candidate.y + candidate.h / 2 }
  let target: SpatialItem | undefined
  let targetContainsPointer = false
  let nearest = Infinity
  for (const peer of snapshot) {
    if (peer.i === id || !overlaps(candidate, peer)) continue
    const containsPointer = pointer !== undefined
      && pointer.x >= peer.x && pointer.x < peer.x + peer.w
      && pointer.y >= peer.y && pointer.y < peer.y + peer.h
    const distance = (center.x - peer.x - peer.w / 2) ** 2
      + (center.y - peer.y - peer.h / 2) ** 2
    if (!target || (containsPointer && !targetContainsPointer)
      || (containsPointer === targetContainsPointer && distance < nearest)) {
      target = peer
      targetContainsPointer = containsPointer
      nearest = distance
    }
  }
  if (!target) return 'down'
  const point = pointer ?? center
  const dx = (point.x - target.x - target.w / 2) / (target.w / 2)
  const dy = (point.y - target.y - target.h / 2) / (target.h / 2)
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'left' : 'right'
  return dy > 0 ? 'up' : 'down'
}

/**
 * Keep the active card at rect, pushing only actual collisions along direction.
 * A chain crossing the grid boundary is discarded and retried once in the
 * opposite direction from the original snapshot, never with mixed pushes.
 * No compaction, first-fit search, or mutation is involved. Snapshot order and
 * metadata survive unchanged; invalid input or two blocked directions roll back.
 */
export function previewPlacement(
  snapshot: readonly SpatialItem[], id: string, rect: GridRect, cols: number,
  direction: DisplacementDirection = 'down',
): SpatialItem[] {
  const clone = () => snapshot.map(item => ({ ...item }))
  const activeIndex = snapshot.findIndex(item => item.i === id)
  if (!validColumns(cols) || activeIndex < 0 || !canPlace([], id, rect, cols)) return clone()
  const ids = new Set<string>()
  for (const item of snapshot) {
    if (ids.has(item.i) || !canPlace(snapshot, item.i, item, cols)) return clone()
    ids.add(item.i)
  }

  const attempt = (push: DisplacementDirection): SpatialItem[] | null => {
    const next = clone()
    next[activeIndex] = { ...next[activeIndex]!, x: rect.x, y: rect.y, w: rect.w, h: rect.h }
    const pending = new Set([activeIndex])
    const axis = push === 'left' || push === 'right' ? 'x' : 'y'
    const cross = axis === 'x' ? 'y' : 'x'
    const sign = push === 'up' || push === 'left' ? -1 : 1
    // Process the nearest pending card along the pushing direction first. Reverse
    // original-axis order for up/left too; cross-axis/input order break ties.
    const compare = (a: number, b: number) => sign * (next[a]![axis] - next[b]![axis])
      || sign * (snapshot[a]![axis] - snapshot[b]![axis])
      || snapshot[a]![cross] - snapshot[b]![cross] || a - b
    while (pending.size > 0) {
      const index = [...pending].sort(compare)[0]!
      pending.delete(index)
      const pushing = next[index]!
      for (let peerIndex = 0; peerIndex < next.length; peerIndex++) {
        if (peerIndex === index || peerIndex === activeIndex) continue
        const peer = next[peerIndex]!
        if (!overlaps(pushing, peer)) continue
        if (push === 'up') peer.y = pushing.y - peer.h
        else if (push === 'down') peer.y = pushing.y + pushing.h
        else if (push === 'left') peer.x = pushing.x - peer.w
        else peer.x = pushing.x + pushing.w
        if (peer.x < 0 || peer.x + peer.w > cols || peer.y < 0 || peer.y > SPATIAL_MAX_Y) return null
        pending.add(peerIndex)
      }
    }
    return next
  }
  const opposite: Record<DisplacementDirection, DisplacementDirection> = {
    up: 'down', down: 'up', left: 'right', right: 'left',
  }
  return attempt(direction) ?? attempt(opposite[direction]) ?? clone()
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value))
}

function snapAxis(raw: number, max: number, targets: readonly number[], previous?: number): number {
  const bounded = clamp(raw, max)
  if (previous !== undefined && Number.isInteger(previous) && previous >= 0 && previous <= max
    && Math.abs(bounded - previous) <= RELEASE_DISTANCE + EPSILON) return previous

  let result = Math.round(bounded)
  let nearest = SNAP_DISTANCE + EPSILON
  for (const target of targets) {
    if (!Number.isInteger(target) || target < 0 || target > max) continue
    const distance = Math.abs(bounded - target)
    if (distance < nearest || (distance === nearest && target < result)) {
      result = target
      nearest = distance
    }
  }
  return clamp(result, max)
}

/**
 * Raw x/y are floating grid coordinates (not pixels). Grid edges already include
 * the standard gap: peer.right and peer.bottom are adjacency targets, not +1.
 * Magnetic targets only participate within 0.22 cells; previous x/y independently
 * hold until 0.62 cells away, so jitter never drags either axis across the board.
 * Dimensions always come from the drag-start active item, including at cols=2.
 * Missing ids return a bounded default shape; bad raw axes retain their origin.
 */
export function snapCandidate(
  raw: Point, id: string, snapshot: readonly SpatialItem[], cols: number, previous?: Point,
): GridRect {
  const count = validColumns(cols) ? cols : 12
  const active = snapshot.find(item => item.i === id)
  const shape = active && canPlace([], id, active, count)
    ? active : { x: 0, y: 0, w: Math.min(3, count), h: 3 }
  const maxX = count - shape.w
  const xTargets = [0, maxX]
  const yTargets = [0, SPATIAL_MAX_Y]
  for (const peer of snapshot) {
    if (peer.i === id || !canPlace([], peer.i, peer, count)) continue
    // Same leading/trailing edge, then either side's adjacent edge.
    xTargets.push(peer.x, peer.x + peer.w - shape.w, peer.x - shape.w, peer.x + peer.w)
    yTargets.push(peer.y, peer.y + peer.h - shape.h, peer.y - shape.h, peer.y + peer.h)
  }
  return {
    x: snapAxis(Number.isFinite(raw.x) ? raw.x : shape.x, maxX, xTargets, previous?.x),
    y: snapAxis(Number.isFinite(raw.y) ? raw.y : shape.y, SPATIAL_MAX_Y, yTargets, previous?.y),
    w: shape.w,
    h: shape.h,
  }
}
