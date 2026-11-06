import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = name => readFile(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
test('delete confirmation never closes or remounts the widget library', async () => {
  const page = await source('page.tsx')
  const handler = page.match(/const requestDelete = useCallback\(\(instanceId: string\) => \{([^}]+)\}/)?.[1]
  assert(handler, 'the page owns one delete request handler')
  assert.doesNotMatch(handler, /setTrayOpen/)
  assert.match(handler, /setConfirmDelete/)
})
test('deletion is a drag onto the page target, not a header button', async () => {
  const frame = await source('widget-frame.tsx')
  assert.doesNotMatch(frame, /dsh-delete-widget|IconTrash/)
  assert.match(frame, /onKeyDelete/)
  const grid = await source('spatial-grid.tsx')
  assert.match(grid, /overDeleteZone\(\)/)
  assert.match(grid, /deleteRequest\.current\?\.\(id\)/)
  const page = await source('page.tsx')
  assert.match(page, /dsh-home-delete-zone/)
})
test('library descriptions use one host portal tooltip and no native title or custom bubble', async () => {
  const gallery = await source('widget-gallery.tsx')
  assert.match(gallery, /<Tooltip[^>]+portal/)
  assert.doesNotMatch(gallery, /dsh-library-tooltip|role="tooltip"/)
  assert.doesNotMatch(gallery, /<article[^>]+ title=/)
  assert.match(gallery, /disabled=\{disabled \|\| dragSource !== null\}/)
})
