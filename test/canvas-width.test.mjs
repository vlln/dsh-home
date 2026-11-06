import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CANVAS_DEFAULT_WIDTH, CANVAS_MAX_WIDTH, CANVAS_MIN_WIDTH,
  canvasWidthFromDrag, canvasWidthFromKey, clampCanvasWidth, resolveCanvasWidth,
} from '../src/client/canvas-width.ts'
import { emptyPrefs, normalizePrefs } from '../src/state.mjs'

test('canvas width clamps to the usable range and falls back to the default', () => {
  assert.equal(clampCanvasWidth(1280), 1280)
  assert.equal(clampCanvasWidth(10), CANVAS_MIN_WIDTH)
  assert.equal(clampCanvasWidth(99999), CANVAS_MAX_WIDTH)
  assert.equal(clampCanvasWidth(1279.6), 1280)
  for (const bad of [null, undefined, NaN, Infinity, '1280', {}, []]) assert.equal(clampCanvasWidth(bad), CANVAS_DEFAULT_WIDTH)
  // Never below the 12-column breakpoint, so a drag cannot reshuffle the layout.
  assert.ok(CANVAS_MIN_WIDTH >= 950)
  assert.ok(resolveCanvasWidth(null) === CANVAS_DEFAULT_WIDTH && resolveCanvasWidth(undefined) === CANVAS_DEFAULT_WIDTH)
  assert.equal(resolveCanvasWidth(1100), 1100)
  assert.equal(resolveCanvasWidth(2400), CANVAS_MAX_WIDTH)
})

test('dragging and keyboard move the same bounded value', () => {
  assert.equal(canvasWidthFromDrag(1200, 500, 560), 1260)
  assert.equal(canvasWidthFromDrag(1200, 500, 440), 1140)
  assert.equal(canvasWidthFromDrag(1200, 500, -5000), CANVAS_MIN_WIDTH)
  assert.equal(canvasWidthFromDrag(1200, 500, 5000), CANVAS_MAX_WIDTH)
  assert.equal(canvasWidthFromKey(1200, 'ArrowRight'), 1240)
  assert.equal(canvasWidthFromKey(1200, 'ArrowLeft'), 1160)
  assert.equal(canvasWidthFromKey(1200, 'Home'), CANVAS_MIN_WIDTH)
  assert.equal(canvasWidthFromKey(1200, 'End'), CANVAS_MAX_WIDTH)
  assert.equal(canvasWidthFromKey(1200, 'Enter'), 1200)
  assert.equal(canvasWidthFromKey(CANVAS_MIN_WIDTH, 'ArrowLeft'), CANVAS_MIN_WIDTH)
})

test('saved preferences carry the board width across a host round trip', () => {
  assert.equal(emptyPrefs().canvasWidth, null)
  assert.equal(normalizePrefs({}).canvasWidth, null)
  assert.equal(normalizePrefs({ canvasWidth: 1100 }).canvasWidth, 1100)
  // The host bounds hand-edited files instead of trusting them.
  assert.equal(normalizePrefs({ canvasWidth: 5000 }).canvasWidth, CANVAS_MAX_WIDTH)
  assert.equal(normalizePrefs({ canvasWidth: 100 }).canvasWidth, CANVAS_MIN_WIDTH)
  assert.equal(normalizePrefs({ canvasWidth: 'wide' }).canvasWidth, null)
  assert.equal(normalizePrefs({ canvasWidth: Number.NaN }).canvasWidth, null)
  // Normalizing is idempotent, which the "corrupt file" comparison relies on.
  const once = normalizePrefs({ canvasWidth: 1440, lastSeenAt: 5, dismissed: {} })
  assert.deepEqual(normalizePrefs(once), once)
})

test('host and client keep identical bounds', () => {
  const host = readFileSync(new URL('../src/state.mjs', import.meta.url), 'utf8')
  const min = Number(host.match(/export const CANVAS_MIN_WIDTH = (\d+)/)[1])
  const max = Number(host.match(/export const CANVAS_MAX_WIDTH = (\d+)/)[1])
  assert.deepEqual([min, max], [CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH])
})
