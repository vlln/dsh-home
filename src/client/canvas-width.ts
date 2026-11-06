/** Canvas width is one user preference for the whole board, never a per-widget size. */
export const CANVAS_DEFAULT_WIDTH = 1280
/** Stay at or above the 12-column breakpoint (950px): dragging cannot reshuffle the layout. */
export const CANVAS_MIN_WIDTH = 960
export const CANVAS_MAX_WIDTH = 1600

export function clampCanvasWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CANVAS_DEFAULT_WIDTH
  return Math.round(Math.max(CANVAS_MIN_WIDTH, Math.min(CANVAS_MAX_WIDTH, value)))
}

/** A saved preference, or the default when the user never chose one. */
export function resolveCanvasWidth(saved: number | null | undefined): number {
  return saved === null || saved === undefined ? CANVAS_DEFAULT_WIDTH : clampCanvasWidth(saved)
}

/** Pixel width from a pointer delta, so dragging right always widens. */
export function canvasWidthFromDrag(startWidth: number, startX: number, currentX: number): number {
  return clampCanvasWidth(startWidth + (currentX - startX))
}

/** Keyboard equivalent of the same edit, in pixels. */
export function canvasWidthFromKey(width: number, key: string, step = 40): number {
  if (key === 'ArrowLeft') return clampCanvasWidth(width - step)
  if (key === 'ArrowRight') return clampCanvasWidth(width + step)
  if (key === 'Home') return CANVAS_MIN_WIDTH
  if (key === 'End') return CANVAS_MAX_WIDTH
  return width
}
