/** Fixed-stride canvas: raw drag preview, column-snapped commit, keyboard, persistence,
 * horizontal overflow. Private station only; never the main GUI. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/canvas-width-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const column = () => page.locator('.dsh-spatial-container').evaluate(el => el.clientWidth)
const saved = async () => (await api('prefs.get')).prefs.canvasWidth
/** Preferences persist through a debounce, so poll instead of guessing a delay. */
const savedWhen = async (predicate, label) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const value = await saved()
    if (predicate(value)) return value
    await page.waitForTimeout(50)
  }
  throw new Error(`saved canvas width never satisfied ${label}: ${await saved()}`)
}
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
/** Fixed-model invariants: board = cols*96 - 12 and the window only decides scrolling. */
const boardOf = () => page.evaluate(() => {
  const home = document.querySelector('.dsh-home'), surface = document.querySelector('.dsh-spatial-container')
  return {
    width: surface.clientWidth,
    cols: Number(surface.dataset.cols),
    scrollable: home.scrollWidth > home.clientWidth + 1,
    overflowX: getComputedStyle(home).overflowX,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }
})
const assertSnapped = async (width, label) => {
  const board = await boardOf()
  assert.equal(board.width, width, `${label}: rendered board equals the committed width`)
  assert.equal((width + 12) % 96, 0, `${label}: width is a whole column (${width})`)
  assert.equal(board.cols, (width + 12) / 96, `${label}: cols derive from the width`)
  assert.ok(board.cols >= 12 && board.cols <= 32, `${label}: columns stay in 12..32 (${board.cols})`)
  // A board is a whole number of ROW UNITS: a stray column can never be filled.
  assert.equal(board.cols % 4, 0, `${label}: board is a whole 4-column unit (${board.cols})`)
  assert.equal(board.documentOverflow, false, `${label}: the document never overflows horizontally`)
}
const gripOf = side => page.locator(`.dsh-canvas-grip[data-side="${side}"]`)
const boxOf = async side => { const box = await gripOf(side).boundingBox(); assert(box); return box }
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('.dsh-home-widget').first().waitFor()

  // The handle only exists while editing; reading mode must stay clean.
  assert.equal(await page.locator('.dsh-canvas-grip').count(), 0, 'no width handle outside edit mode')
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-canvas-grip').first().waitFor()
  const sides = await page.locator('.dsh-canvas-grip').evaluateAll(nodes => nodes.map(node => node.dataset.side))
  assert.deepEqual(sides.sort(), ['left', 'right'], `one strip on each side: ${sides}`)
  const strips = await page.locator('.dsh-canvas-grip').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(), column = node.closest('.dsh-home-inner').getBoundingClientRect()
    return { side: node.dataset.side, width: box.width, left: box.left, right: box.right, columnLeft: column.left, columnRight: column.right }
  }))
  for (const strip of strips) {
    assert.equal(Math.round(strip.width), 10, 'col-resize strip width')
    if (strip.side === 'left') assert(Math.abs(strip.right - strip.columnLeft) < 1, 'left strip hugs the board edge')
    else assert(Math.abs(strip.left - strip.columnRight) < 1, 'right strip hugs the board edge')
  }
  checks.push('edit mode exposes a col-resize strip on each side of the fixed board')

  // Normalize to the 12-column minimum before measuring a drag.
  await gripOf('right').focus()
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  // The rendered board is authoritative; a legacy preference in [1140,1151] may not
  // need a new write yet. The drag below commits a snapped value either way.
  await assertSnapped(1140, 'Home')
  const before = await column()
  const initialCols = (await boardOf()).cols
  assert.equal(initialCols, 12)

  const bar = await boxOf('right')
  const grabOffset = 5, dragOut = 120
  const startX = bar.x + grabOffset
  await page.mouse.move(startX, bar.y + 240)
  await page.mouse.down()
  // Widen: the raw preview must sit under the pointer before any snap happens.
  const trackedX = startX + dragOut
  await page.mouse.move(trackedX, bar.y + 240, { steps: 4 })
  await settle()
  const tracked = await boxOf('right')
  assert(Math.abs(tracked.x - (trackedX - grabOffset)) <= 2, `edge tracks the pointer: strip ${Math.round(tracked.x)} vs pointer ${trackedX}`)
  const noEase = await page.locator('.dsh-home-widget').first().evaluate(el => getComputedStyle(el).transitionDuration)
  assert(noEase.split(',').every(value => Number.parseFloat(value) === 0), `board must not ease while resizing: ${noEase}`)
  assert.equal(await gripOf('right').getAttribute('data-dragging'), '', 'drag state is exposed while dragging')
  const during = await column()
  assert(during >= before + 200, `raw preview follows the pointer: ${before} -> ${during}`)
  await page.mouse.up()
  await page.waitForFunction(() => !document.querySelector('.dsh-canvas-grip[data-dragging]'))
  await page.waitForTimeout(400)
  // The commit snaps: the raw preview (before + 2*120) is not what gets stored.
  const expected = (() => {
    const raw = Math.min(32, Math.max(12, Math.floor((during + 12) / 96)))
    const cols = Math.max(4, Math.round(raw / 4) * 4)
    return cols * 96 - 12
  })()
  const persisted = await savedWhen(value => value === expected, 'the snapped width chosen by the drag')
  const afterDrag = await column()
  assert.equal(persisted, afterDrag, `drag persists the snapped width: saved ${persisted} vs rendered ${afterDrag}`)
  await assertSnapped(persisted, 'drag commit')
  assert.notEqual(persisted, during, `commit snaps the raw preview (${during}) to a column (${persisted})`)
  await page.screenshot({ path: new URL('dragged.png', out).pathname, animations: 'disabled' })
  checks.push(`drag previews raw and commits one whole column (${before} -> ${afterDrag}, ${initialCols} -> ${(afterDrag + 12) / 96} cols)`)

  // Reload proves it is a saved preference, not session state.
  await page.reload()
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('.dsh-spatial-container').waitFor()
  await settle()
  assert.equal(await column(), persisted, 'reload restores the chosen board width in reading mode')
  await assertSnapped(persisted, 'reload')
  checks.push('reload applies the saved width without entering edit mode')

  // Keyboard path moves whole columns and reaches the fixed bounds.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-canvas-grip').first().waitFor()
  await gripOf('right').focus()
  const focused = await page.evaluate(() => document.activeElement?.className)
  assert.match(focused, /dsh-canvas-grip/)
  const valueOf = async () => Number(await gripOf('right').getAttribute('aria-valuenow'))
  const startKey = await valueOf()
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), startKey + 384, 'arrow key widens the board by one whole row unit')
  await assertSnapped(startKey + 384, 'ArrowRight')
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), 1140, 'Home clamps to the 12-column minimum')
  assert.equal(await column(), 1140, 'minimum is renderable')
  await page.keyboard.press('End'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), 3060, 'End reaches the 32-column maximum')
  const widest = await boardOf()
  assert.equal(widest.width, 3060, 'the widest board renders exactly 32 columns')
  assert.equal(widest.cols, 32)
  assert.equal(widest.scrollable, true, 'a board wider than the window scrolls horizontally')
  assert.equal(widest.overflowX, 'auto', 'the board scrolls inside .dsh-home')
  assert.equal(widest.documentOverflow, false, 'the document itself never overflows')
  checks.push('keyboard Home/End reach the fixed 1140 / 3060 bounds; an over-wide board scrolls without document overflow')
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  assert.equal(await column(), 1140, 'the same handle returns to the minimum')

  // The left strip is an equal control: dragging it outward widens the same value.
  const narrow = await column()
  const leftBar = await boxOf('left')
  await page.mouse.move(leftBar.x + leftBar.width / 2, leftBar.y + 240)
  await page.mouse.down()
  await page.mouse.move(leftBar.x - 48, leftBar.y + 240, { steps: 8 })
  await settle()
  const widened = await column()
  assert(widened >= narrow + 60, `left strip widens the board too: ${narrow} -> ${widened}`)
  await page.mouse.up(); await page.waitForTimeout(300)
  // The left strip previews raw during the drag and commits the same column snap.
  const leftExpected = (() => {
    const raw = Math.min(32, Math.max(12, Math.floor((widened + 12) / 96)))
    const cols = Math.max(4, Math.round(raw / 4) * 4)
    return cols * 96 - 12
  })()
  const leftSaved = await savedWhen(value => value === leftExpected, 'the snapped width the left strip committed')
  assert.equal(leftSaved, leftExpected, `left strip persists the snapped width: ${leftSaved} vs ${widened}`)
  await assertSnapped(leftExpected, 'left strip')
  checks.push('left strip is an equal control: dragging it outward widens and persists one row unit')

  // Double-click restores the default without touching widgets.
  const geometry = await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  await gripOf('left').dblclick()
  await page.waitForTimeout(400)
  assert.equal(await savedWhen(value => value === 1140, 'the default'), 1140, 'double-click restores the 12-column default')
  await assertSnapped(1140, 'double-click')
  assert.deepEqual(await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId)), geometry)
  checks.push('double-click restores the default and leaves every widget in place')

  // The board width never becomes a widget size: stored rectangles are identical.
  const after = await api('workbench.get')
  assert.deepEqual(after.layout, backup.layout)
  assert.deepEqual(after.instances, backup.instances)
  checks.push('no saved widget rectangle or instance changed while resizing the board')
  await page.screenshot({ path: new URL('restored.png', out).pathname, animations: 'disabled' })
  assert.deepEqual(errors, [])
} catch (error) {
  errors.push(error.stack ?? String(error)); process.exitCode = 1
  await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {})
} finally {
  await page?.close()
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors }, null, 2))
  console.log(out.pathname, JSON.stringify({ checks, errors }))
}
