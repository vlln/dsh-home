import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = name => readFile(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
test('delete modal never closes or remounts the widget library', async () => {
  const page = await source('page.tsx')
  const handler = page.match(/onDelete=\{\(\) => \{([^}]+)\}\}/)?.[1]
  assert(handler)
  assert.doesNotMatch(handler, /setTrayOpen/)
  assert.match(handler, /setConfirmDelete/)
})
test('library descriptions use one host portal tooltip and no native title or custom bubble', async () => {
  const gallery = await source('widget-gallery.tsx')
  assert.match(gallery, /<Tooltip[^>]+portal/)
  assert.doesNotMatch(gallery, /dsh-library-tooltip|role="tooltip"/)
  assert.doesNotMatch(gallery, /<article[^>]+ title=/)
  assert.match(gallery, /disabled=\{disabled \|\| dragSource !== null\}/)
})
