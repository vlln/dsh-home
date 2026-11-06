/**
 * Geometry for the floating "Add widgets" window.
 *
 * The library is a viewport-anchored window, not a docked column: it covers the board's
 * right edge by default, so the user must be able to park it wherever it fits. The
 * default corner stays in CSS (`top: 92px; right: 20px`) — `null` means "use the sheet".
 * Once dragged, the panel carries a concrete top-left corner in viewport pixels, which
 * is also what `prefs.libraryPosition` stores, so the placement survives a reload.
 */

/** Top-left corner of the panel, in viewport CSS pixels. */
export interface LibraryPoint {
  x: number
  y: number
}

export interface LibrarySize {
  width: number
  height: number
}

/** Keep this much viewport around the window on every side, so no edge is ever flush. */
export const LIBRARY_PANEL_MARGIN = 8

function round(value: number, min: number, max: number): number {
  const low = Math.round(min)
  const high = Math.round(Math.max(min, max))
  return Math.min(high, Math.max(low, Math.round(value)))
}

/**
 * Clamp a corner so the whole window stays reachable.
 * @param minTop minimum `y`; the caller passes the host frame clearance so the window
 *   can never hide its title bar under the host chrome.
 */
export function clampLibraryPosition(position: LibraryPoint, viewport: LibrarySize, size: LibrarySize, minTop: number = LIBRARY_PANEL_MARGIN): LibraryPoint {
  return {
    x: round(position.x, LIBRARY_PANEL_MARGIN, viewport.width - size.width - LIBRARY_PANEL_MARGIN),
    y: round(position.y, minTop, viewport.height - size.height - LIBRARY_PANEL_MARGIN),
  }
}

/** The window follows the pointer 1:1 from where it was grabbed, then clamps. */
export function libraryPositionFromDrag(start: LibraryPoint, delta: LibraryPoint, viewport: LibrarySize, size: LibrarySize, minTop: number): LibraryPoint {
  return clampLibraryPosition({ x: start.x + delta.x, y: start.y + delta.y }, viewport, size, minTop)
}

const KEY_STEPS: Record<string, LibraryPoint> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

/** Keyboard parity for the drag. Unknown keys return `null` so the caller ignores them. */
export function libraryPositionFromKey(position: LibraryPoint, key: string, viewport: LibrarySize, size: LibrarySize, minTop: number, step = 16): LibraryPoint | null {
  const direction = KEY_STEPS[key]
  if (direction === undefined) return null
  return clampLibraryPosition({ x: position.x + direction.x * step, y: position.y + direction.y * step }, viewport, size, minTop)
}
