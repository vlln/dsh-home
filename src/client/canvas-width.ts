/** Canvas width is one user preference for the whole board, never a per-widget size. */
export const CANVAS_DEFAULT_WIDTH = 1280
/** Stay at or above the 12-column breakpoint (950px): dragging cannot reshuffle the layout. */
export const CANVAS_MIN_WIDTH = 960
/** Absolute ceiling for a stored value (also bounds hand-edited files). The practical
 * maximum is derived from the space available, which is what dragging should reach. */
export const CANVAS_MAX_WIDTH = 4096
/** Edge reserve, mirroring the host Conversation width controls: the content column
 * stops this far short of the available width so the handles keep a gutter and a
 * safe zone instead of sitting on the window edge. */
export const CANVAS_EDGE_BUDGET = 176

/** Widest board that fits the available space without eating the reserved edge. */
export function canvasMaxFor(available: number): number {
  if (!Number.isFinite(available) || available <= 0) return CANVAS_MAX_WIDTH
  return Math.max(CANVAS_MIN_WIDTH, Math.min(CANVAS_MAX_WIDTH, Math.round(available - CANVAS_EDGE_BUDGET)))
}

export function clampCanvasWidth(value: unknown, max = CANVAS_MAX_WIDTH): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CANVAS_DEFAULT_WIDTH
  return Math.round(Math.max(CANVAS_MIN_WIDTH, Math.min(max, value)))
}

/** A saved preference, or the default when the user never chose one. */
export function resolveCanvasWidth(saved: number | null | undefined): number {
  return saved === null || saved === undefined ? CANVAS_DEFAULT_WIDTH : clampCanvasWidth(saved)
}

/** The width actually applied: the preference, bounded by what still leaves an edge. */
export function appliedCanvasWidth(saved: number | null | undefined, available: number): number {
  return Math.min(resolveCanvasWidth(saved), canvasMaxFor(available))
}

/** Pixel width from a pointer delta along one edge, so dragging out always widens.
 * The column is centred, so one edge moving `dx` outward widens the box by `2·dx`
 * and the edge itself stays exactly under the pointer. */
export function canvasWidthFromEdgeDrag(startWidth: number, startX: number, currentX: number, side: 'left' | 'right', max = CANVAS_MAX_WIDTH): number {
  const outward = side === 'right' ? currentX - startX : startX - currentX
  return clampCanvasWidth(startWidth + outward * 2, max)
}

/** Keyboard equivalent of the same edit, in pixels. Home and End reach the bounds. */
export function canvasWidthFromKey(width: number, key: string, step = 40, max = CANVAS_MAX_WIDTH): number {
  if (key === 'ArrowLeft') return clampCanvasWidth(width - step, max)
  if (key === 'ArrowRight') return clampCanvasWidth(width + step, max)
  if (key === 'Home') return CANVAS_MIN_WIDTH
  if (key === 'End') return max
  return width
}
