import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url = process.env.DSH_VERIFY_URL
assert(url && new URL(url).port === '3186', 'Use only the explicitly supplied private 3186 instance')
const output = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const checks = []
let page
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => page.getByRole('button', { name: 'Continue', exact: true }).click())
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click())
  await page.goto(url)
  const api = (op, extra = {}) => page.evaluate(async ({ op, extra }) => {
    const r = await fetch('/plugins/dsh-home/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op, ...extra }) })
    const j = await r.json(); if (!j.ok) throw Error('home API failed'); return j.value
  }, { op, extra })
  const open = async () => { await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('.dsh-spatial-grid').waitFor() }
  await open()
  const savedBefore = (await api('layout.get')).layout
  await writeFile(new URL('spatial-before-layout.json', output), JSON.stringify(savedBefore, null, 2))
  // Seed just two harmless widget positions in the owned test home, preserving all original data.
  const hidden = ['resume', 'queue', 'today', 'running', 'areas', 'rhythm', 'quick']
  await api('layout.set', { layout: { ...savedBefore, hidden, positions: { ...savedBefore?.positions, '12': { recent: { x: 0, y: 0, w: 4, h: 4 }, tasks: { x: 8, y: 0, w: 4, h: 4 } } } } })
  await page.reload(); await open()
  const widget = id => page.locator(`[data-widget-id="${id}"]`)
  const edit = () => page.getByRole('button', { name: /^(Edit layout|编辑布局)$/, exact: true }).click()
  const done = () => page.getByRole('button', { name: /^(Done|完成)$/, exact: true }).click()
  const geometry = () => api('layout.get').then(j => j.layout.positions['12'])
  await edit()
  assert.equal(await page.locator('.react-resizable-handle').count(), 2)
  const r = await widget('recent').boundingBox()
  const grip = await widget('recent').locator('button.dsh-widget-grip').boundingBox()
  const neighbor = await widget('tasks').boundingBox()
  assert(r && grip && neighbor)
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
  await page.mouse.move(start.x, start.y); await page.mouse.down()
  await page.mouse.move(start.x + 37, start.y + 19, { steps: 8 })
  await widget('recent').filter({ has: page.locator('.dsh-widget-grip') }).waitFor()
  const followed = await widget('recent').boundingBox()
  assert(followed && Math.abs((followed.x - r.x) - 37) <= 6 && Math.abs((followed.y - r.y) - 19) <= 6, `Widget must follow actual pixels: ${JSON.stringify({ r, followed })}`)
  assert.equal(await page.locator('.react-grid-placeholder').count(), 1)
  const still = await widget('tasks').boundingBox()
  assert(still && Math.abs(still.x - neighbor.x) < 1 && Math.abs(still.y - neighbor.y) < 1)
  await page.screenshot({ path: new URL('spatial-follow.png', output).pathname })
  checks.push('real drag follows pointer pixel-for-pixel; grid placeholder visible; neighbor stays fixed')
  await page.mouse.up()
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  let positions = await geometry()
  await edit()
  const collideGrip = await widget('recent').locator('button.dsh-widget-grip').boundingBox()
  const collideTarget = await widget('tasks').boundingBox()
  assert(collideGrip && collideTarget)
  const fixedNeighbor = structuredClone(positions.tasks)
  await page.mouse.move(collideGrip.x + 10, collideGrip.y + 10); await page.mouse.down()
  await page.mouse.move(collideTarget.x + 30, collideTarget.y + 25, { steps: 16 }); await page.mouse.up()
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  positions = await geometry()
  assert.deepEqual(positions.tasks, fixedNeighbor)
  const a = positions.recent, b = positions.tasks
  assert(!(a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y), 'Collision drop must not overlap')
  checks.push('dropping onto occupied cells is blocked without pushing the occupied widget')
  // Move downward into a genuinely empty area and verify no compaction after reload.
  await edit()
  const grid = await page.locator('.dsh-spatial-grid').boundingBox()
  const from = await widget('recent').locator('button.dsh-widget-grip').boundingBox()
  assert(grid && from)
  const begin = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  await page.mouse.move(begin.x, begin.y); await page.mouse.down()
  await page.mouse.move(begin.x, begin.y + 336, { steps: 18 }); await page.mouse.up()
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  positions = await geometry()
  assert(positions.recent.y >= 5, `Expected durable blank space: ${JSON.stringify(positions.recent)}`)
  const durable = structuredClone(positions)
  await page.reload(); await open()
  assert.deepEqual(await geometry(), durable)
  checks.push('empty rows stay empty after drop, Done and reload')
  // Resize inside empty space.
  await edit()
  const handle = widget('recent').locator('.react-resizable-handle-se')
  await handle.scrollIntoViewIfNeeded()
  const corner = await handle.boundingBox(); assert(corner)
  await page.mouse.move(corner.x + 12, corner.y + 12); await page.mouse.down()
  await page.mouse.move(corner.x + 90, corner.y + 68, { steps: 12 }); await page.mouse.up()
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  const resized = await geometry()
  assert(resized.recent.w > durable.recent.w || resized.recent.h > durable.recent.h)
  assert.deepEqual(resized.tasks, durable.tasks)
  checks.push('real lower-right resize saves width/height without moving neighbors')
  // Esc cancels an active drag, retaining editor and saved geometry.
  await edit()
  const beforeCancel = await geometry()
  const h = await widget('tasks').locator('button.dsh-widget-grip').boundingBox(); assert(h)
  await page.mouse.move(h.x + 10, h.y + 10); await page.mouse.down(); await page.mouse.move(h.x - 30, h.y + 75, { steps: 8 })
  await page.keyboard.press('Escape'); await page.mouse.up()
  assert.equal(await page.locator('.dsh-home[data-editing=true]').count(), 1)
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  assert.deepEqual(await geometry(), beforeCancel)
  checks.push('Esc rolls back active drag and does not persist cancelled position')
  assert.equal(await page.locator('.react-resizable-handle:visible').count(), 0)
  assert.deepEqual(errors, [])
  await edit(); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: new URL('spatial-editor.png', output).pathname })
  await page.keyboard.press('Escape'); await page.locator('.dsh-home[data-editing=false]').waitFor()
  // A breakpoint switch during drag must cancel the old transaction and release Done.
  await edit()
  const bpGrip = await widget('tasks').locator('button.dsh-widget-grip').boundingBox(); assert(bpGrip)
  await page.mouse.move(bpGrip.x + 10, bpGrip.y + 10); await page.mouse.down()
  await page.mouse.move(bpGrip.x - 20, bpGrip.y + 35, { steps: 6 })
  await page.setViewportSize({ width: 920, height: 1100 }); await page.mouse.up()
  await page.getByRole('button', { name: /^(Done|完成)$/, exact: true }).waitFor({ state: 'visible' })
  assert.equal(await page.getByRole('button', { name: /^(Done|完成)$/, exact: true }).isEnabled(), true)
  await done(); await page.locator('.dsh-home[data-editing=false]').waitFor()
  assert.deepEqual((await api('layout.get')).layout.positions['12'], beforeCancel)
  checks.push('breakpoint change during drag releases interaction and preserves desktop coordinates')
  // Restore user/test-site original layout; the prototype's edit history is not a data reset.
  await api('layout.set', { layout: savedBefore })
  await writeFile(new URL('spatial-report.json', output), JSON.stringify({ checks, errors, restoredOriginalLayout: true }, null, 2))
  console.log(checks.map(s => 'PASS ' + s).join('\n'))
} catch (error) {
  await page?.screenshot({ path: new URL('spatial-failure.png', output).pathname }).catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally { await browser.close() }
