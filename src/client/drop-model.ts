/** Pure drop geometry: full-width/single-column cards split vertically; grid cells horizontally. */
export type DropSide = 'before' | 'after'

export interface DropRect {
  left: number
  top: number
  width: number
  height: number
}

export function dropSideAt(
  target: DropRect,
  container: Pick<DropRect, 'width'>,
  point: { x: number; y: number },
): DropSide {
  // Allow grid padding/gaps and rounding without treating a two-column cell as a full row.
  const fullRow = container.width > 0 && target.width >= container.width * 0.8
  const after = fullRow
    ? point.y > target.top + target.height / 2
    : point.x > target.left + target.width / 2
  return after ? 'after' : 'before'
}
