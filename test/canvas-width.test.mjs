import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CANVAS_COLUMN_GAP, CANVAS_COLUMN_STRIDE, CANVAS_COLUMN_WIDTH, CANVAS_DEFAULT_COLUMNS,
  CANVAS_DEFAULT_WIDTH, CANVAS_MAX_COLUMNS, CANVAS_MAX_WIDTH, CANVAS_MIN_COLUMNS, CANVAS_MIN_WIDTH,
  boardWidthForColumns, canvasWidthFromEdgeDrag, canvasWidthFromKey, clampCanvasWidth, columnsForWidth, isGridColumns,
  resolveCanvasWidth, snapCanvasWidth, widgetWidthForColumns,
} from '../src/client/canvas-width.ts'
import { emptyPrefs, normalizePrefs } from '../src/state.mjs'

test('fixed stride makes columns a pure function of the width preference', () => {
  assert.equal(CANVAS_COLUMN_WIDTH, 84)
  assert.equal(CANVAS_COLUMN_GAP, 12)
  assert.equal(CANVAS_COLUMN_STRIDE, 96)
  assert.deepEqual([CANVAS_MIN_COLUMNS, CANVAS_MAX_COLUMNS], [12, 32])
  // cols = clamp(floor((W + 12) / 96), 12, 32)
  assert.equal(columnsForWidth(1140), 12)
  assert.equal(columnsForWidth(1141), 12)
  assert.equal(columnsForWidth(1236), 13)
  assert.equal(columnsForWidth(1265), 13)
  assert.equal(columnsForWidth(2292), 24)
  assert.equal(columnsForWidth(3060), 32)
  // Below the minimum and above the maximum clamp instead of wrapping.
  assert.equal(columnsForWidth(0), 12)
  assert.equal(columnsForWidth(-500), 12)
  assert.equal(columnsForWidth(99999), 32)
  // Runtime grid domain: fixed-stride 12..32 plus readable legacy 2/6.
  for (const valid of [2, 6, 12, 13, 32]) assert.equal(isGridColumns(valid), true)
  for (const bad of [0, 1, 3, 11, 33, 6.5, '12', NaN]) assert.equal(isGridColumns(bad), false)
  for (const bad of [null, undefined, NaN, Infinity, '1236', {}, []]) assert.equal(columnsForWidth(bad), CANVAS_DEFAULT_COLUMNS)
  // Every snapped width round-trips to its own column count.
  for (let cols = CANVAS_MIN_COLUMNS; cols <= CANVAS_MAX_COLUMNS; cols++) {
    assert.equal(columnsForWidth(boardWidthForColumns(cols)), cols)
  }
})

test('board and widget pixel widths are exact and independent of any window width', () => {
  assert.equal(boardWidthForColumns(12), 12 * 84 + 11 * 12)
  assert.equal(boardWidthForColumns(12), 1140)
  assert.equal(boardWidthForColumns(13), 1236)
  assert.equal(boardWidthForColumns(24), 2292)
  assert.equal(boardWidthForColumns(32), 32 * 84 + 31 * 12)
  assert.equal(boardWidthForColumns(32), 3060)
  assert.equal(CANVAS_MIN_WIDTH, 1140)
  assert.equal(CANVAS_MAX_WIDTH, 3060)
  assert.equal(CANVAS_DEFAULT_WIDTH, 1140)
  // A widget's width is w*84 + (w-1)*12: same span, same pixels at every column count.
  for (const [w, width] of [[1, 84], [4, 372], [8, 756], [12, 1140]]) assert.equal(widgetWidthForColumns(w), width)
  for (const W of [1140, 1236, 1500, 2292, 3060]) {
    const cols = columnsForWidth(W)
    assert.equal(widgetWidthForColumns(4), 372, `4-wide card stays 372px at W=${W} (${cols} cols)`)
  }
  // Snapping is floor-to-column: `cols*96 - 12`, never a proportional pixel width.
  assert.equal(snapCanvasWidth(1140), 1140)
  assert.equal(snapCanvasWidth(1180), 1140)
  assert.equal(snapCanvasWidth(1236), 1236)
  assert.equal(snapCanvasWidth(1280), 1236)
  assert.equal(snapCanvasWidth(1500), 1428)
  assert.equal(snapCanvasWidth(99999), 3060)
})

test('the width preference clamps to the board range and falls back to 12 columns', () => {
  assert.equal(clampCanvasWidth(CANVAS_DEFAULT_WIDTH), CANVAS_DEFAULT_WIDTH)
  assert.equal(clampCanvasWidth(10), CANVAS_MIN_WIDTH)
  assert.equal(clampCanvasWidth(99999), CANVAS_MAX_WIDTH)
  assert.equal(clampCanvasWidth(1235.6), 1236)
  for (const bad of [null, undefined, NaN, Infinity, '1280', {}, []]) assert.equal(clampCanvasWidth(bad), CANVAS_DEFAULT_WIDTH)
  assert.equal(resolveCanvasWidth(null), CANVAS_DEFAULT_WIDTH)
  assert.equal(resolveCanvasWidth(undefined), CANVAS_DEFAULT_WIDTH)
  assert.equal(resolveCanvasWidth(1440), 1440)
  assert.equal(resolveCanvasWidth(99999), CANVAS_MAX_WIDTH)
})

test('dragging previews a raw width and only the commit snaps to a whole column', () => {
  // The column is centred, so an edge moving 20px outward widens the box by 40px.
  assert.equal(canvasWidthFromEdgeDrag(1236, 500, 520, 'right'), 1276)
  assert.equal(canvasWidthFromEdgeDrag(1236, 500, 480, 'right'), 1196)
  assert.equal(canvasWidthFromEdgeDrag(1236, 500, 480, 'left'), 1276)
  assert.equal(canvasWidthFromEdgeDrag(1236, 500, 520, 'left'), 1196)
  // Inward drags stop at the 12-column minimum instead of shrinking below it.
  assert.equal(canvasWidthFromEdgeDrag(1140, 500, 480, 'right'), 1140)
  assert.equal(canvasWidthFromEdgeDrag(1140, 500, -5000, 'right'), CANVAS_MIN_WIDTH)
  assert.equal(canvasWidthFromEdgeDrag(1140, 500, 5000, 'right'), CANVAS_MAX_WIDTH)
  assert.equal(canvasWidthFromEdgeDrag(1140, 500, 5000, 'left'), CANVAS_MIN_WIDTH)
  // Raw preview values are not snapped; the gesture layer writes them directly.
  const raw = canvasWidthFromEdgeDrag(1140, 500, 507, 'right')
  assert.equal(raw, 1154)
  assert.equal(snapCanvasWidth(raw), 1140)
  assert.equal(snapCanvasWidth(canvasWidthFromEdgeDrag(1140, 500, 560, 'right')), 1236)
  // Keyboard moves exactly one column; Home / End reach the fixed bounds.
  assert.equal(canvasWidthFromKey(1140, 'ArrowRight'), 1236)
  assert.equal(canvasWidthFromKey(1140, 'ArrowLeft'), 1140)
  assert.equal(canvasWidthFromKey(1236, 'ArrowLeft'), 1140)
  assert.equal(canvasWidthFromKey(1140, 'End'), CANVAS_MAX_WIDTH)
  assert.equal(canvasWidthFromKey(3060, 'ArrowRight'), 3060)
  assert.equal(canvasWidthFromKey(1140, 'Home'), CANVAS_MIN_WIDTH)
  assert.equal(canvasWidthFromKey(1236, 'Enter'), 1236)
})

test('saved preferences carry the board width across a host round trip', () => {
  assert.equal(emptyPrefs().canvasWidth, null)
  assert.equal(normalizePrefs({}).canvasWidth, null)
  assert.equal(normalizePrefs({ canvasWidth: 1236 }).canvasWidth, 1236)
  // The host bounds hand-edited files with the same 12..32 column range.
  assert.equal(normalizePrefs({ canvasWidth: 5000 }).canvasWidth, CANVAS_MAX_WIDTH)
  assert.equal(normalizePrefs({ canvasWidth: 100 }).canvasWidth, CANVAS_MIN_WIDTH)
  assert.equal(normalizePrefs({ canvasWidth: 'wide' }).canvasWidth, null)
  assert.equal(normalizePrefs({ canvasWidth: Number.NaN }).canvasWidth, null)
  // Normalizing is idempotent, which the "corrupt file" comparison relies on.
  const once = normalizePrefs({ canvasWidth: 1428, lastSeenAt: 5, dismissed: {} })
  assert.deepEqual(normalizePrefs(once), once)
})

test('host and client keep identical bounds', () => {
  const host = readFileSync(new URL('../src/state.mjs', import.meta.url), 'utf8')
  const min = Number(host.match(/export const CANVAS_MIN_WIDTH = (\d+)/)[1])
  const max = Number(host.match(/export const CANVAS_MAX_WIDTH = (\d+)/)[1])
  assert.deepEqual([min, max], [CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH])
})
