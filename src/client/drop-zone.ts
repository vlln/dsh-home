/**
 * Hit test for the delete drop target.
 *
 * Deletion is a gesture, not a button: while a card is being dragged the page shows a
 * viewport-anchored target at the top, and releasing inside it aborts the move and asks
 * for confirmation. This module is the only geometric rule involved, so the browser
 * suite and the grid agree on what "inside" means.
 */

export interface DropPoint {
  x: number
  y: number
}

export interface DropBox {
  left: number
  top: number
  right: number
  bottom: number
}

/** Inclusive on every edge: a release exactly on the border still aims at the target. */
export function insideDropZone(point: DropPoint | null, box: DropBox | null): boolean {
  if (point === null || box === null) return false
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom
}
