/** The canvas is a fixed-pixel grid: a widget's width comes from its column span,
 * never from the window. A wider canvas fits more columns; it never stretches a
 * card. The user's one width preference chooses the column count. */
export const CANVAS_COLUMN_WIDTH = 84
export const CANVAS_COLUMN_GAP = 12
/** Origin-to-origin distance of adjacent columns. `(board + gap) / cols` is exactly this. */
export const CANVAS_COLUMN_STRIDE = CANVAS_COLUMN_WIDTH + CANVAS_COLUMN_GAP
/** 12 keeps every rectangle saved before the fixed-stride model valid (x + w <= 12). */
export const CANVAS_MIN_COLUMNS = 12
/** 32 columns fill an ultrawide window; the canvas never stretches a widget to do it. */
export const CANVAS_MAX_COLUMNS = 32

/** Default board: 12 columns, so an untouched workspace keeps using positions["12"]. */
export const CANVAS_DEFAULT_COLUMNS = CANVAS_MIN_COLUMNS

function boardWidth(columns: number): number {
  return columns * CANVAS_COLUMN_WIDTH + (columns - 1) * CANVAS_COLUMN_GAP
}

/** `12 * 84 + 11 * 12 = 1140`. */
export const CANVAS_MIN_WIDTH = boardWidth(CANVAS_MIN_COLUMNS)
/** `32 * 84 + 31 * 12 = 3060`. */
export const CANVAS_MAX_WIDTH = boardWidth(CANVAS_MAX_COLUMNS)
export const CANVAS_DEFAULT_WIDTH = boardWidth(CANVAS_DEFAULT_COLUMNS)

function clampColumns(value: number): number {
  return Math.max(CANVAS_MIN_COLUMNS, Math.min(CANVAS_MAX_COLUMNS, Math.round(value)))
}

/** Runtime grid columns: the fixed-stride canvas 12..32 plus the legacy 2/6
 * breakpoint data that must stay readable. Anything else is not a grid. */
export function isGridColumns(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && (value === 2 || value === 6 || (value >= CANVAS_MIN_COLUMNS && value <= CANVAS_MAX_COLUMNS))
}

/** `cols = clamp(floor((W + 12) / 96), 12, 32)`; the window is never an input. */
export function columnsForWidth(width: number): number {
  if (typeof width !== 'number' || !Number.isFinite(width)) return CANVAS_DEFAULT_COLUMNS
  return clampColumns(Math.floor((width + CANVAS_COLUMN_GAP) / CANVAS_COLUMN_STRIDE))
}

/** Exact board pixel width for a column count: `cols*84 + (cols-1)*12`. */
export function boardWidthForColumns(columns: number): number {
  return boardWidth(clampColumns(columns))
}

/** Exact widget pixel width for a span: `w*84 + (w-1)*12`, constant for a given w. */
export function widgetWidthForColumns(span: number): number {
  return boardWidth(span)
}

/** A board is a whole number of ROW UNITS, never an arbitrary column count: one
 * stray column can never be filled by the declared spans (4 + 8 = 12), so every row
 * would end with a gap. 4 divides the declared 4/8/12 widths, so any mix tiles. */
export const CANVAS_COLUMN_UNIT = 4

/** Nearest whole row unit, never below one unit. */
function unitColumns(columns: number): number {
  return Math.max(CANVAS_COLUMN_UNIT, Math.round(columns / CANVAS_COLUMN_UNIT) * CANVAS_COLUMN_UNIT)
}

/** The column count actually used: a whole row unit, so a saved 12-column layout keeps
 * its own breakpoint instead of drifting onto a stray 13-column board. */
export function boardColumnsFor(width: number): number {
  return unitColumns(columnsForWidth(width))
}

/** Snap any width to a whole row unit: the board the user actually gets. */
export function snapCanvasWidth(width: number): number {
  return boardWidthForColumns(boardColumnsFor(width))
}

export function clampCanvasWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CANVAS_DEFAULT_WIDTH
  return Math.round(Math.max(CANVAS_MIN_WIDTH, Math.min(CANVAS_MAX_WIDTH, value)))
}

/** A saved preference, or the default when the user never chose one. */
export function resolveCanvasWidth(saved: number | null | undefined): number {
  return saved === null || saved === undefined ? CANVAS_DEFAULT_WIDTH : clampCanvasWidth(saved)
}

/** Pixel width from a pointer delta along one edge, so dragging out always widens.
 * The column is centred, so one edge moving `dx` outward widens the box by `2·dx`
 * and the edge itself stays exactly under the pointer. The result is raw: the
 * gesture previews continuously and only the commit snaps to a whole column. */
export function canvasWidthFromEdgeDrag(startWidth: number, startX: number, currentX: number, side: 'left' | 'right'): number {
  const outward = side === 'right' ? currentX - startX : startX - currentX
  return clampCanvasWidth(startWidth + outward * 2)
}

/** Keyboard equivalent: one whole column per press. Home and End reach the bounds. */
export function canvasWidthFromKey(width: number, key: string): number {
  const columns = boardColumnsFor(width)
  if (key === 'ArrowLeft') return boardWidthForColumns(columns - CANVAS_COLUMN_UNIT)
  if (key === 'ArrowRight') return boardWidthForColumns(columns + CANVAS_COLUMN_UNIT)
  if (key === 'Home') return CANVAS_MIN_WIDTH
  if (key === 'End') return CANVAS_MAX_WIDTH
  return width
}
