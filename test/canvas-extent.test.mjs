import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canvasContentHeight, clampCanvasLeft, clampCanvasScroll, extendCanvasHeight } from '../src/client/canvas-extent.ts'
import { pinDraggedItem } from '../src/client/drag-visual.ts'
import { snapCandidate } from '../src/client/collision-preview.ts'
import { multiPreviewPlacement } from '../src/client/multi-preview.ts'
import { buildSpatialLayout, mergeSpatialPositions } from '../src/client/spatial-model.ts'
import { emptyLayout } from '../src/client/api.ts'

const item = (i, x, y, w = 4, h = 4) => ({ i, x, y, w, h, minW: 3, minH: 3, maxW: 12 })

test('empty/normal content uses RGL 44px rows and 12px gaps without inventing geometry', () => {
  assert.equal(canvasContentHeight([]), 0)
  assert.equal(canvasContentHeight([item('a', 0, 3)]), 380)
  assert.equal(canvasContentHeight([item('a', 0, 3), item('b', 4, 20, 4, 7)]), 1500)
})

test('raw unsnapped pixels and displaced peers retain extent even when drop snapshot is unchanged', () => {
  const snapshot = Object.freeze([Object.freeze(item('active', 0, 0)), Object.freeze(item('peer', 4, 12))])
  const pixelBottom = 3200.4
  const extent = extendCanvasHeight(900, canvasContentHeight(snapshot), pixelBottom, 900, 800)
  assert.equal(extent, 3257)
  assert.equal(extendCanvasHeight(extent, 212, 100, 800, 800), extent, 'returning to original board must not shrink scrolling mid-drag')
  assert.equal(extendCanvasHeight(extent, 5000, 200, 900, 800), 5056, 'collision peers also contribute to retained area')
  assert.deepEqual(snapshot, [item('active', 0, 0), item('peer', 4, 12)])
})

test('stationary edge scrolling grows before scroll without a 2000px padding ceiling', () => {
  let height = 900
  for (let scroll = 0; scroll < 16000; scroll += 16) {
    const viewportBottom = 800 + scroll
    height = extendCanvasHeight(height, 212, 0, viewportBottom, 800)
    assert(height >= viewportBottom + 800, 'one viewport of scroll runway must already exist')
  }
  assert(height > 16000)
})

test('far downward candidate pins visual, preserves fixed size and commits/reloads existing format at each breakpoint', () => {
  for (const cols of [12, 6, 2]) {
    const w = Math.min(4, cols)
    const snapshot = [item('active', 0, 0, w), item('peer', 0, 6, w)]
    const candidate = snapCandidate({ x: 0, y: 150.3 }, 'active', snapshot, cols, snapshot[0])
    const preview = multiPreviewPlacement(snapshot, 'active', candidate, cols)
    assert.equal(candidate.y, 150)
    assert.deepEqual(pinDraggedItem(preview, 'active', candidate), preview)
    const saved = mergeSpatialPositions(emptyLayout(), preview, cols)
    const reloaded = buildSpatialLayout(saved, [{ id: 'active', defaultSize: 's', defaultHeight: 4 }, { id: 'peer', defaultSize: 's', defaultHeight: 4 }], cols)
    for (const original of preview) {
      const actual = reloaded.find(entry => entry.i === original.i)
      for (const key of ['x', 'y', 'w', 'h']) assert.equal(actual[key], original[key])
    }
    assert.equal(candidate.w, w)
    assert.equal(candidate.h, 4)
    assert(canvasContentHeight(preview) > 8000)
  }
})

test('live pixel x cannot disappear beyond fixed horizontal footprint; y is unaffected', () => {
  assert.equal(clampCanvasLeft(-500, 1000, 320), 0)
  assert.equal(clampCanvasLeft(1500, 1000, 320), 680)
  assert.equal(clampCanvasLeft(450.5, 1000, 320), 450.5)
  assert.equal(clampCanvasLeft(1500, 1000, 1000), 0)
  assert.equal(clampCanvasLeft(1500, 1000, 1100), 0)
})

test('cancel returns start scroll while accepted release clamps only surplus runway', () => {
  assert.equal(clampCanvasScroll(125, 1200, 800), 125)
  assert.equal(clampCanvasScroll(6000, 1200, 800), 400)
  assert.equal(clampCanvasScroll(6000, 9000, 800), 6000)
  assert.equal(clampCanvasScroll(125, 700, 800), 0)
  assert.equal(clampCanvasScroll(-10, 1200, 800), 0)
})
