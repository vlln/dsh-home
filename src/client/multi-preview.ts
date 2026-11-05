/** Local, reversible axial drag previews. Always pass the drag-start snapshot. */
import type { GridRect } from './api.ts'
import type { SpatialItem } from './spatial-model.ts'
import { canPlace } from './spatial-model.ts'

type Point = { x: number; y: number }
type Axis = 'x' | 'y'
type Sign = -1 | 0 | 1

function overlaps(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w
    && a.y < b.y + b.h && b.y < a.y + a.h
}

function contains(rect: GridRect, point: Point): boolean {
  return point.x >= rect.x && point.x < rect.x + rect.w
    && point.y >= rect.y && point.y < rect.y + rect.h
}

/**
 * Choose one axis for the entire direct collision set, never separately per peer.
 * A single target uses its normalized pointer offset (candidate center outside
 * that target). Multiple targets minimize summed edge-exit distance; ties use y.
 */
export function placementAxis(
  snapshot: readonly SpatialItem[], id: string, rect: GridRect, pointer?: Point,
): Axis {
  if (!rect) return 'y'
  const direct = snapshot.filter(peer => peer.i !== id && overlaps(rect, peer))
  if (direct.length === 1) {
    const peer = direct[0]!
    const point = pointer && contains(peer, pointer) ? pointer
      : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
    const dx = (point.x - peer.x - peer.w / 2) / peer.w
    const dy = (point.y - peer.y - peer.h / 2) / peer.h
    return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  }
  let dx = 0
  let dy = 0
  for (const peer of direct) {
    dx += Math.min(Math.abs(rect.x - peer.x - peer.w), Math.abs(rect.x + rect.w - peer.x))
    dy += Math.min(Math.abs(rect.y - peer.y - peer.h), Math.abs(rect.y + rect.h - peer.y))
  }
  return dx < dy ? 'x' : 'y'
}

/**
 * Keep successful preferred-axis previews byte-for-byte. Only after that entire
 * axis is exhausted may the other axis run, once; never combine axes in a solve.
 */
export function multiPreviewPlacement(
  snapshot: readonly SpatialItem[], id: string, rect: GridRect, cols: number, pointer?: Point,
): SpatialItem[] {
  const axis = placementAxis(snapshot, id, rect, pointer)
  return solveAxis(snapshot, id, rect, cols, axis, pointer)
    ?? solveAxis(snapshot, id, rect, cols, axis === 'x' ? 'y' : 'x', pointer)
    ?? snapshot.map(item => ({ ...item }))
}

/** Internal forced-axis seam: failure is a complete snapshot clone, as at entry. */
export function multiPreviewOnAxis(
  snapshot: readonly SpatialItem[], id: string, rect: GridRect, cols: number, axis: Axis, pointer?: Point,
): SpatialItem[] {
  return solveAxis(snapshot, id, rect, cols, axis, pointer) ?? snapshot.map(item => ({ ...item }))
}

/**
 * One shared axis, immutable cross coordinates and original peer order. Keep
 * the original preferred sweep and bounded direct-peer partitions unchanged;
 * aligned direct groups stay together and chain peers inherit their direction.
 * No arbitrary moves, active relocation, or free reordering are searched.
 */
function solveAxis(
  snapshot: readonly SpatialItem[], id: string, rect: GridRect, cols: number, axis: Axis, pointer?: Point,
): SpatialItem[] | undefined {
  const clone = () => snapshot.map(item => ({ ...item }))
  const activeIndex = snapshot.findIndex(item => item.i === id)
  if ((axis !== 'x' && axis !== 'y') || !Number.isInteger(cols) || cols < 1 || cols > 12 || activeIndex < 0
    || !canPlace([], id, rect, cols)
    || (pointer !== undefined && (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)))) {
    return undefined
  }
  const ids = new Set<string>()
  for (const item of snapshot) {
    if (typeof item.i !== 'string' || ids.has(item.i) || !canPlace(snapshot, item.i, item, cols)) return undefined
    ids.add(item.i)
  }
  const cross = axis === 'x' ? 'y' : 'x'
  const size = axis === 'x' ? 'w' : 'h'
  const crossSize = axis === 'x' ? 'h' : 'w'
  const center = rect[axis] + rect[size] / 2
  const origin = snapshot[activeIndex]!
  const originCenter = origin[axis] + origin[size] / 2
  const preferred: Sign[] = snapshot.map(() => 0)
  const direct = snapshot.map((peer, index) => index !== activeIndex && overlaps(rect, peer) ? index : -1)
    .filter(index => index >= 0)

  for (const index of direct) {
    const peer = snapshot[index]!
    const peerCenter = peer[axis] + peer[size] / 2
    let sign: Sign = peerCenter < center ? -1 : peerCenter > center ? 1 : 0
    if (sign === 0) {
      // A pointer inside either card of an aligned row/column belongs to the
      // whole group. It must not send one member up and the other member down.
      const group = direct.filter(other => snapshot[other]![axis] === peer[axis]
        && snapshot[other]![size] === peer[size])
      const insideGroup = pointer && group.some(other => contains(snapshot[other]!, pointer))
      sign = insideGroup ? (pointer[axis] > peerCenter ? -1 : 1)
        : originCenter > center ? -1 : 1
    }
    preferred[index] = sign
  }

  const peers = snapshot.map((_, index) => index).filter(index => index !== activeIndex)
    .sort((a, b) => snapshot[a]![axis] - snapshot[b]![axis] || a - b)
  const crossOverlaps = (a: GridRect, b: GridRect) => a[cross] < b[cross] + b[crossSize]
    && b[cross] < a[cross] + a[crossSize]

  const sweep = (directSigns: readonly Sign[]): SpatialItem[] | undefined => {
    const next = clone()
    next[activeIndex] = { ...next[activeIndex]!, x: rect.x, y: rect.y, w: rect.w, h: rect.h }
    const signs = [...directSigns]
    for (const index of direct) {
      next[index]![axis] = signs[index]! < 0 ? rect[axis] - snapshot[index]![size] : rect[axis] + rect[size]
    }
    for (const sign of [-1, 1] as const) {
      const ordered = sign < 0 ? peers.slice().reverse() : peers
      for (const blockerIndex of ordered) {
        if (signs[blockerIndex] !== sign) continue
        const blocker = next[blockerIndex]!
        for (const peerIndex of ordered) {
          const peer = next[peerIndex]!
          if (peerIndex === blockerIndex || !crossOverlaps(blocker, peer)) continue
          // Original order also catches peers jumped over, not just overlaps.
          const before = snapshot[peerIndex]![axis] < snapshot[blockerIndex]![axis]
          if ((sign < 0) !== before) continue
          const edge = sign < 0 ? blocker[axis] - peer[size] : blocker[axis] + blocker[size]
          if (sign < 0 ? peer[axis] <= edge : peer[axis] >= edge) continue
          if (signs[peerIndex] !== 0 && signs[peerIndex] !== sign) return undefined
          signs[peerIndex] = sign
          peer[axis] = edge
        }
      }
    }
    for (const peer of next) if (!canPlace(next, peer.i, peer, cols)) return undefined
    return next
  }

  // Preserve every successful preferred preview exactly, including its tie-breaks.
  const original = sweep(preferred)
  if (original) return original

  const sortedDirect = [...direct].sort((a, b) => snapshot[a]![axis] - snapshot[b]![axis]
    || snapshot[a]![size] - snapshot[b]![size] || a - b)
  const partitions: { signs: Sign[]; violations: number; split: number }[] = []
  for (let split = 0; split <= sortedDirect.length; split++) {
    const left = snapshot[sortedDirect[split - 1]!]
    const right = snapshot[sortedDirect[split]!]
    // A split cannot bisect an aligned row/column group.
    if (left && right && left[axis] === right[axis] && left[size] === right[size]) continue
    const signs: Sign[] = snapshot.map(() => 0)
    let violations = 0
    for (let position = 0; position < sortedDirect.length; position++) {
      const index = sortedDirect[position]!
      signs[index] = position < split ? -1 : 1
      if (signs[index] !== preferred[index]) violations++
    }
    partitions.push({ signs, violations, split })
  }
  partitions.sort((a, b) => a.violations - b.violations || a.split - b.split)
  let best: SpatialItem[] | undefined
  let bestViolations = Infinity
  let bestMovement = Infinity
  for (const partition of partitions) {
    if (partition.violations > bestViolations) break
    const next = sweep(partition.signs)
    if (!next) continue
    const movement = peers.reduce((sum, index) => sum + Math.abs(next[index]![axis] - snapshot[index]![axis]), 0)
    if (movement < bestMovement) {
      best = next
      bestViolations = partition.violations
      bestMovement = movement
    }
  }
  return best
}
