import { test } from 'node:test'
import assert from 'node:assert/strict'
import { insideDropZone } from '../src/client/drop-zone.ts'

const box = { left: 600, top: 12, right: 840, bottom: 48 }
const point = (x, y) => ({ x, y })

test('a release on the delete target is a delete, not a move', () => {
  assert.equal(insideDropZone(point(720, 30), box), true)
  assert.equal(insideDropZone(point(600, 12), box), true, 'the top-left corner counts')
  assert.equal(insideDropZone(point(840, 48), box), true, 'the bottom-right corner counts')
})

test('a release just outside the target keeps the ordinary drop', () => {
  assert.equal(insideDropZone(point(599, 30), box), false)
  assert.equal(insideDropZone(point(841, 30), box), false)
  assert.equal(insideDropZone(point(720, 11), box), false)
  assert.equal(insideDropZone(point(720, 49), box), false)
})

test('a missing pointer or target never deletes', () => {
  assert.equal(insideDropZone(null, box), false)
  assert.equal(insideDropZone(point(720, 30), null), false)
  assert.equal(insideDropZone(null, null), false)
})
