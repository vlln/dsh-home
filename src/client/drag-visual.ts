/** Visual drag geometry is independent of whether a collision proposal is committable. */
import type { GridRect } from './api.ts'
import type { SpatialItem } from './spatial-model.ts'

export function pinDraggedItem(
  peers: readonly SpatialItem[], id: string, candidate: GridRect,
): SpatialItem[] {
  return peers.map(item => item.i === id ? { ...item, ...candidate } : { ...item })
}

export function placementAccepted(preview: readonly SpatialItem[], id: string, candidate: GridRect): boolean {
  const item = preview.find(entry => entry.i === id)
  return item !== undefined && item.x === candidate.x && item.y === candidate.y
    && item.w === candidate.w && item.h === candidate.h
}
