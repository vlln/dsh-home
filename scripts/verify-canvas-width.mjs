/** Canvas width is one board preference: drag, keyboard, persist, restore. Private station only. */
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
    if (strip.side === 'left') assert(Math.abs(strip.right - strip.columnLeft) < 1, 'left strip hugs the column edge')
    else assert(Math.abs(strip.left - strip.columnRight) < 1, 'right strip hugs the column edge')
  }
  checks.push('edit mode exposes a col-resize strip on each side of the column')

  const grip = page.locator('.dsh-canvas-grip[data-side="right"]')
  const boxOf = async side => { const box = await page.locator(`.dsh-canvas-grip[data-side="${side}"]`).boundingBox(); assert(box); return box }
  const preDragWidth = await saved()
  const bar = await boxOf('right')
  const before = await column()
  const grabOffset = 5
  await page.mouse.move(bar.x + grabOffset, bar.y + 240)
  await page.mouse.down()
  // A small inward move, before any clamp: the grabbed edge must sit exactly under
  // the cursor, which is what "the line follows the mouse" means.
  const trackedX = bar.x - 60
  await page.mouse.move(trackedX, bar.y + 240, { steps: 4 })
  await settle()
  const tracked = await boxOf('right')
  assert(Math.abs(tracked.x - (trackedX - grabOffset)) <= 2, `edge tracks the pointer: strip ${Math.round(tracked.x)} vs pointer ${trackedX}`)
  const noEase = await page.locator('.dsh-home-widget').first().evaluate(el => getComputedStyle(el).transitionDuration)
  assert(noEase.split(',').every(value => Number.parseFloat(value) === 0), `board must not ease while resizing: ${noEase}`)
  assert.equal(await grip.getAttribute('data-dragging'), '', 'drag state is exposed while dragging')
  // Then drag well past the lower bound to prove movement and clamping.
  await page.mouse.move(bar.x - 500, bar.y + 240, { steps: 12 })
  await settle()
  const during = await column()
  assert(during <= before - 100, `live resize follows the pointer: ${before} -> ${during}`)
  await page.mouse.up()
  await page.waitForFunction(() => !document.querySelector('.dsh-canvas-grip[data-dragging]'))
  await page.waitForTimeout(400)
  const persisted = await savedWhen(value => value !== preDragWidth, 'the width chosen by the drag')
  const afterDrag = await column()
  assert.equal(persisted, afterDrag, `drag persists the measured width: saved ${persisted} vs rendered ${afterDrag}`)
  assert(persisted >= 960, `clamped to the minimum, not an unusable sliver: ${persisted}`)
  await page.screenshot({ path: new URL('dragged.png', out).pathname, animations: 'disabled' })
  checks.push(`drag resizes the board live, tracks the pointer and persists one bounded width (${before} -> ${afterDrag})`)

  // Reload proves it is a saved preference, not session state.
  await page.reload()
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('.dsh-spatial-container').waitFor()
  await settle()
  assert.equal(await column(), persisted, 'reload restores the chosen width in reading mode')
  checks.push('reload applies the saved width without entering edit mode')

  // Keyboard path must reach the same value and stay bounded.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-canvas-grip').first().waitFor()
  await grip.focus()
  const focused = await page.evaluate(() => document.activeElement?.className)
  assert.match(focused, /dsh-canvas-grip/)
  const valueOf = async () => Number(await grip.getAttribute('aria-valuenow'))
  const startKey = await valueOf()
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), startKey + 40, 'arrow key widens the preference by one step')
  const afterArrow = await column()
  assert(afterArrow >= 960 && afterArrow <= startKey + 40, `rendered column never exceeds the preference: ${afterArrow}`)
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), 960, 'Home clamps to the minimum')
  assert.equal(await column(), 960, 'minimum is renderable')
  await page.keyboard.press('End'); await page.waitForTimeout(300)
  assert.equal(await valueOf(), 1600, 'End reaches the maximum preference')
  const room = await column()
  assert(room >= 960 && room <= 1600, `a narrower window shows only what fits: ${room}`)
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  assert.equal(await column(), 960, 'the same handle returns to the minimum')
  checks.push('keyboard arrows/Home/End resize the same bounded value and expose it as aria-valuenow')

  // The left strip is an equal control: dragging it outward widens the same value.
  await page.keyboard.press('Home'); await page.waitForTimeout(300)
  const narrow = await column()
  const leftBar = await boxOf('left')
  await page.mouse.move(leftBar.x + leftBar.width / 2, leftBar.y + 240)
  await page.mouse.down()
  await page.mouse.move(leftBar.x - 100, leftBar.y + 240, { steps: 8 })
  await settle()
  const widened = await column()
  assert(widened >= narrow + 150, `left strip widens the board too: ${narrow} -> ${widened}`)
  await page.mouse.up(); await page.waitForTimeout(300)
  const leftSaved = await savedWhen(value => value === widened, 'the width the left strip rendered')
  assert.equal(leftSaved, widened, `left strip persists what it rendered: ${leftSaved} vs ${widened}`)
  checks.push('left strip is an equal control: dragging it outward widens and persists')

  // Double-click restores the default without touching widgets.
  const geometry = await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  await page.locator('.dsh-canvas-grip[data-side="left"]').dblclick()
  await page.waitForTimeout(400)
  assert.equal(await savedWhen(value => value === 1280, 'the default'), 1280, 'double-click restores the default width')
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
