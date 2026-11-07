/** Preview geometry: the gallery must render the same pixel box a real card has.
 *
 * Kept free of React/JSX so the numbers are unit-testable and stay in one place.
 */
import { widgetWidthForColumns } from './canvas-width.ts'
import { SPATIAL_GAP, SPATIAL_ROW_HEIGHT } from './spatial-model.ts'
import type { GridShape } from './widget-contract.ts'

/** Card chrome around the content: 14px top + 16px bottom padding, 18px header, one 10px gap. */
export const CARD_CHROME_HEIGHT = 14 + 16 + 18 + 10

/** Real card pixel height for a row span, identical to the board's geometry. */
export function cardHeightForRows(rows: number): number {
  return rows * SPATIAL_ROW_HEIGHT + (rows - 1) * SPATIAL_GAP
}

/** Content-box size for a card of `columns × rows` cells. */
export function cardContentSize(columns: number, rows: number): { width: number; height: number } {
  return {
    width: Math.max(1, widgetWidthForColumns(columns) - 32),
    height: Math.max(1, cardHeightForRows(rows) - CARD_CHROME_HEIGHT),
  }
}

/** Card pixel size of a definition's default grid shape. */
export function cardSizeForShape(shape: GridShape): { width: number; height: number } {
  return { width: widgetWidthForColumns(shape.w), height: cardHeightForRows(shape.h) }
}
