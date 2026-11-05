/** Temporary one-dimensional drag surface; never part of persisted widget geometry. */
import type { GridRect } from './api.ts'
import { SPATIAL_GAP, SPATIAL_ROW_HEIGHT } from './spatial-model.ts'

const stride = SPATIAL_ROW_HEIGHT + SPATIAL_GAP
export const EDIT_CANVAS_MIN_HEIGHT = 900

export function canvasContentHeight(layout: readonly Pick<GridRect, 'y' | 'h'>[]): number {
  return Math.max(0, ...layout.map(item => (item.y + item.h) * stride - SPATIAL_GAP))
}

/** Retain the high-water mark, including unsnapped pixels and one viewport of runway.
 * Growing before scrolling avoids a browser clamp at the old board's bottom.
 * No additive padding or arbitrary pixel cap: the existing model owns legal y.
 */
export function extendCanvasHeight(previous: number, contentBottom: number, pixelBottom = 0, viewportBottom = 0, viewportHeight = 0): number {
  return Math.ceil(Math.max(previous, EDIT_CANVAS_MIN_HEIGHT, contentBottom + stride,
    pixelBottom + stride, viewportBottom + Math.max(stride, viewportHeight)))
}

/** A vertical canvas has a fixed horizontal footprint, even during RGL pixel dragging. */
export function clampCanvasLeft(left: number, canvasWidth: number, itemWidth: number): number {
  return Math.max(0, Math.min(left, Math.max(0, canvasWidth - itemWidth)))
}

export function clampCanvasScroll(top: number, scrollHeight: number, clientHeight: number): number {
  return Math.max(0, Math.min(top, Math.max(0, scrollHeight - clientHeight)))
}
