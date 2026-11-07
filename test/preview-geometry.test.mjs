import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CARD_CHROME_HEIGHT, PREVIEW_MAX_HEIGHT, cardContentSize, cardHeightForRows, cardSizeForShape, previewShape } from '../src/client/preview-geometry.ts'

test('preview geometry matches the board grid', () => {
  assert.equal(cardHeightForRows(4), 212)
  assert.equal(cardHeightForRows(6), 324)
  assert.deepEqual(cardSizeForShape({ w: 4, h: 6 }), { width: 372, height: 324 })
  assert.deepEqual(cardSizeForShape({ w: 8, h: 4 }), { width: 756, height: 212 })
  assert.deepEqual(cardContentSize(4, 6), { width: 340, height: 324 - CARD_CHROME_HEIGHT })
  assert.deepEqual(cardContentSize(1, 3), { width: 52, height: Math.max(1, 156 - CARD_CHROME_HEIGHT) })
})

test('a gallery preview uses the narrowest declared shape so its text stays readable', () => {
  assert.deepEqual(previewShape({ default: { w: 8, h: 8 }, supported: [{ w: 4, h: 8 }, { w: 8, h: 10 }, { w: 12, h: 10 }] }), { w: 4, h: 8 })
  assert.deepEqual(previewShape({ default: { w: 4, h: 6 }, supported: [{ w: 4, h: 6 }, { w: 4, h: 8 }] }), { w: 4, h: 6 }, 'the shortest variant of the narrow width')
  assert.deepEqual(previewShape({ default: { w: 8, h: 4 } }), { w: 8, h: 4 }, 'no supported list keeps the default')
  assert.ok(PREVIEW_MAX_HEIGHT > 100)
})
