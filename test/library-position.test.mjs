import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  LIBRARY_PANEL_MARGIN, clampLibraryPosition, libraryPositionFromDrag, libraryPositionFromKey,
} from '../src/client/library-position.ts'

const viewport = { width: 1440, height: 1000 }
const size = { width: 400, height: 720 }
const inside = (point, margin = LIBRARY_PANEL_MARGIN) => {
  assert.ok(point.x >= margin, `x ${point.x} respects the margin`)
  assert.ok(point.y >= margin, `y ${point.y} respects the margin`)
  assert.ok(point.x + size.width <= viewport.width - margin, `right edge ${point.x + size.width} stays inside`)
  assert.ok(point.y + size.height <= viewport.height - margin, `bottom edge ${point.y + size.height} stays inside`)
}

test('a stored corner is clamped back into the viewport instead of restoring off screen', () => {
  inside(clampLibraryPosition({ x: 5000, y: 5000 }, viewport, size))
  inside(clampLibraryPosition({ x: -900, y: -900 }, viewport, size))
  inside(clampLibraryPosition({ x: 400, y: 200 }, viewport, size))
})

test('dragging moves the window 1:1 and clamps once it reaches an edge', () => {
  const start = { x: 900, y: 120 }
  const dragged = libraryPositionFromDrag(start, { x: -25.4, y: 33.6 }, viewport, size, LIBRARY_PANEL_MARGIN)
  assert.deepEqual(dragged, { x: 875, y: 154 })
  const pastLeft = libraryPositionFromDrag(start, { x: -5000, y: 0 }, viewport, size, LIBRARY_PANEL_MARGIN)
  assert.equal(pastLeft.x, LIBRARY_PANEL_MARGIN)
  const pastBottom = libraryPositionFromDrag(start, { x: 0, y: 5000 }, viewport, size, LIBRARY_PANEL_MARGIN)
  assert.equal(pastBottom.y, viewport.height - size.height - LIBRARY_PANEL_MARGIN)
  inside(pastBottom)
})

test('the host frame clearance is the floor for the top edge', () => {
  const clearance = 48
  const dragged = libraryPositionFromDrag({ x: 900, y: 200 }, { x: 0, y: -5000 }, viewport, size, clearance)
  assert.equal(dragged.y, clearance)
})

test('a window larger than the viewport never yields negative coordinates and cannot jump', () => {
  const tiny = { width: 320, height: 240 }
  const huge = { width: 900, height: 900 }
  assert.deepEqual(clampLibraryPosition({ x: 400, y: 300 }, tiny, huge), { x: LIBRARY_PANEL_MARGIN, y: LIBRARY_PANEL_MARGIN })
})

test('keyboard steps match the drag, ignore unrelated keys and clamp at the edges', () => {
  const start = { x: 900, y: 200 }
  assert.deepEqual(libraryPositionFromKey(start, 'ArrowLeft', viewport, size, LIBRARY_PANEL_MARGIN), { x: 884, y: 200 })
  assert.deepEqual(libraryPositionFromKey(start, 'ArrowDown', viewport, size, LIBRARY_PANEL_MARGIN, 64), { x: 900, y: 264 })
  assert.equal(libraryPositionFromKey(start, 'Enter', viewport, size, LIBRARY_PANEL_MARGIN), null)
  assert.equal(libraryPositionFromKey(start, 'a', viewport, size, LIBRARY_PANEL_MARGIN), null)
  const leftEdge = libraryPositionFromKey({ x: LIBRARY_PANEL_MARGIN + 4, y: 200 }, 'ArrowLeft', viewport, size, LIBRARY_PANEL_MARGIN)
  assert.equal(leftEdge.x, LIBRARY_PANEL_MARGIN)
})

test('the panel keeps a default corner in CSS and no longer docks to the bottom', async () => {
  const styles = await readFile(new URL('../src/client/library-styles.ts', import.meta.url), 'utf8')
  const rule = styles.match(/\.dsh-library-panel \{[^}]+\}/)?.[0]
  assert(rule)
  assert.match(rule, /top:92px/)
  assert.match(rule, /right:20px/)
  // A docked `bottom` would fight the dragged `top`; the height was capped instead.
  assert.doesNotMatch(rule, /bottom:/)
  assert.match(rule, /height:min\(720px,calc\(100vh - 132px\)\)/)
})
