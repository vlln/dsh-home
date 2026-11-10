import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickQuote, quoteIndex } from '../src/client/quote-model.ts'
import { pictureSource, validatePictureConfig } from '../src/client/picture-model.ts'

test('a quote is stable for a day and changes across days', () => {
  const config = { lines: [] }
  const first = pickQuote(config, '2026-11-06', 'zh-CN')
  assert.equal(pickQuote(config, '2026-11-06', 'zh-CN'), first, 'same day, same line')
  const week = Array.from({ length: 7 }, (_, index) => pickQuote(config, `2026-11-${String(6 + index).padStart(2, '0')}`, 'zh-CN'))
  assert(week.some(line => line !== first), 'the week is not one single line')
  assert.notEqual(pickQuote(config, '2026-11-06', 'zh-CN'), pickQuote(config, '2026-11-06', 'en-us'), 'languages differ')
})

test('a custom list takes over and empties fall back', () => {
  assert.equal(pickQuote({ lines: ['only one'] }, '2026-11-06', 'en'), 'only one')
  assert.equal(pickQuote({ lines: ['  ', ''] }, '2026-11-06', 'en'), pickQuote({ lines: [] }, '2026-11-06', 'en'))
  assert.equal(quoteIndex('2026-11-06', 0), 0)
})

test('picture sources: remote direct, local via the host route, everything else empty', () => {
  assert.deepEqual(pictureSource(''), { kind: 'none' })
  assert.deepEqual(pictureSource('  '), { kind: 'none' })
  assert.deepEqual(pictureSource('https://example.com/a.png'), { kind: 'remote', url: 'https://example.com/a.png' })
  assert.deepEqual(pictureSource('http://example.com/a.png'), { kind: 'remote', url: 'http://example.com/a.png' })
  assert.deepEqual(pictureSource('/Users/me/a b.png'), { kind: 'local', url: '/api/dsh-home/image?path=%2FUsers%2Fme%2Fa%20b.png' })
  assert.deepEqual(pictureSource('~/Pictures/a.png'), { kind: 'local', url: '/api/dsh-home/image?path=~%2FPictures%2Fa.png' })
  assert.deepEqual(pictureSource('relative/a.png'), { kind: 'none' })
  assert.deepEqual(pictureSource('file:///etc/passwd'), { kind: 'none' })
  assert.deepEqual(pictureSource('javascript:alert(1)'), { kind: 'none' })
  // A file picked in the dialog arrives as a data URL; dropping it here left the card
  // showing "No picture chosen" after a successful pick.
  assert.deepEqual(pictureSource('data:image/png;base64,iVBORw0KGgo='), { kind: 'embedded', url: 'data:image/png;base64,iVBORw0KGgo=' })
  assert.deepEqual(pictureSource('data:image/svg+xml;utf8,%3Csvg%3E'), { kind: 'embedded', url: 'data:image/svg+xml;utf8,%3Csvg%3E' })
  assert.deepEqual(pictureSource('data:text/html,<b>x</b>'), { kind: 'none' })
})

test('picture config is strict', () => {
  assert.equal(validatePictureConfig({ src: '', title: '', fit: 'cover' }), true)
  assert.equal(validatePictureConfig({ src: '', title: '', fit: 'contain' }), true)
  assert.equal(validatePictureConfig({ src: '', title: '', fit: 'stretch' }), false)
  assert.equal(validatePictureConfig({ src: '', title: '' }), false)
  assert.equal(validatePictureConfig({ src: 1, title: '', fit: 'cover' }), false)
  assert.equal(validatePictureConfig({ src: '', title: '', fit: 'cover', extra: 1 }), false)
})
