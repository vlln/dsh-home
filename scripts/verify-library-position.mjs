/** The Add-widgets window is movable: drag / keyboard / reset, clamped inside the
 * viewport, persisted in preferences, and it no longer permanently covers the board's
 * right edge. Private station only; never the main GUI. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/library-position-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
let page, backup, prefs
const errors = [], checks = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const savedPosition = async () => (await api('prefs.get')).prefs.libraryPosition ?? null
/** Preference writes are debounced, so poll the API instead of guessing a delay. */
const savedWhen = async (predicate, label) => {
  for (let attempt = 0; attempt < 80; attempt++) {
    const value = await savedPosition()
    if (predicate(value)) return value
    await page.waitForTimeout(50)
  }
  throw new Error(`saved library position never satisfied ${label}: ${JSON.stringify(await savedPosition())}`)
}
const boxOf = async (selector) => {
  const box = await page.locator(selector).boundingBox()
  assert(box, `${selector} is visible`)
  return box
}
const panelBox = () => boxOf('.dsh-library-panel')
const gridBox = () => boxOf('.dsh-spatial-grid')
const openLibrary = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor()
  await page.locator('.dsh-directory-item').first().evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {})))
  })
}
/** Grab the title bar away from the close / grip buttons. */
const headingGrab = async () => {
  const box = await page.locator('.dsh-library-heading h2').boundingBox()
  assert(box)
  return { x: box.x + Math.min(60, box.width / 2), y: box.y + box.height / 2 }
}
const clampFloor = () => page.locator('.dsh-library-panel').evaluate(el => {
  const clearance = Number.parseFloat(getComputedStyle(el).getPropertyValue('--dsh-frame-top-clearance'))
  return 8 + (Number.isFinite(clearance) ? Math.max(0, clearance) : 0)
})
const until = async (fn, label) => {
  let last
  for (let attempt = 0; attempt < 100; attempt++) {
    try { last = await fn(); if (last === true) return } catch (error) { last = error }
    await page.waitForTimeout(50)
  }
  throw new Error(`timed out waiting for ${label}: ${String(last)}`)
}
const dragPanel = async (delta) => {
  const start = await headingGrab()
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(60)
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  // Deterministic board and window state; the full original preference document is restored below.
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  // Disposable fixture: an empty desktop, so the final card drop has free space. The
  // original instances and layout are restored in `finally`.
  const fixture = { ...backup.layout, hidden: backup.instances.map(instance => instance.instanceId) }
  await api('workbench.set', { layout: fixture, instances: backup.instances })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await openLibrary()
  const defaults = await panelBox(), board = await gridBox(), viewport = page.viewportSize()
  assert(Math.abs(defaults.x + defaults.width - (viewport.width - 20)) < 2, `default corner hugs the right edge (${defaults.x + defaults.width})`)
  assert(Math.abs(defaults.y - 92) < 2, `default corner sits below the frame chrome (${defaults.y})`)
  assert.equal(await savedPosition(), null, 'the default corner is stored as null, not duplicated in preferences')
  const boardRight = board.x + board.width
  // The floating window is viewport-anchored while the board is centred in the main area,
  // so "covers the right area" means its right edge reaches the board's right edge band.
  assert(defaults.x + defaults.width > boardRight - 60, `the default window covers the board's right band (${defaults.x + defaults.width} vs ${boardRight})`)
  checks.push('default corner is the docked top-right window and overlaps the board edge')

  // Drag left and up: the window follows the pointer, then keeps the dropped corner.
  await dragPanel({ x: -320, y: -24 })
  const moved = await panelBox(), floor = await clampFloor()
  assert(Math.abs(moved.x - (defaults.x - 320)) < 2, `dragged left by 320 (${moved.x} vs ${defaults.x - 320})`)
  assert(Math.abs(moved.y - Math.max(defaults.y - 24, floor)) < 2, `dragged up by 24 and held the frame floor (${moved.y})`)
  assert(moved.x + moved.width <= boardRight - 200, `after the drag the board's right area is uncovered (${moved.x + moved.width} vs ${boardRight})`)
  assert.equal((await savedWhen(value => value !== null, 'a dragged corner'))?.x, Math.round(moved.x))
  checks.push('dragging moves the window 1:1 and the board right edge becomes visible')

  // The placement is a preference: reopening the library (and reloading) keeps it.
  await page.reload()
  await openLibrary()
  await until(async () => {
    const box = await panelBox()
    return Math.abs(box.x - moved.x) < 2 && Math.abs(box.y - moved.y) < 2
  }, 'the stored corner after a reload')
  const reopened = await panelBox()
  checks.push('the corner survives a reload')

  // Drag far past the right edge: the window clamps instead of leaving the viewport.
  await dragPanel({ x: 2000, y: 0 })
  const clamped = await panelBox()
  assert(clamped.x + clamped.width <= viewport.width - 8 + 1, `stays inside the right margin (${clamped.x + clamped.width})`)
  assert(clamped.x >= 8, 'stays inside the left margin')
  checks.push('overshooting the viewport clamps the window fully inside it')

  // Keyboard parity: arrows step the window, Home restores the default corner.
  const grip = page.locator('.dsh-library-panel .dsh-library-grip')
  await grip.focus()
  const beforeKeys = await panelBox()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(80)
  const afterKeys = await panelBox()
  assert(Math.abs(afterKeys.x - (beforeKeys.x - 32)) < 2, `two arrow steps move 32px (${afterKeys.x} vs ${beforeKeys.x - 32})`)
  assert.equal((await savedWhen(value => value !== null && Math.round(value.x) === Math.round(afterKeys.x), 'keyboard step'))?.x, Math.round(afterKeys.x))
  await page.keyboard.press('Home')
  await page.waitForTimeout(80)
  const reset = await panelBox()
  assert(Math.abs(reset.x - defaults.x) < 2 && Math.abs(reset.y - defaults.y) < 2, `Home restores the default corner (${reset.x},${reset.y})`)
  assert.equal(await savedWhen(value => value === null, 'a reset corner'), null)
  checks.push('arrow keys step the window and Home restores the default corner')

  // Double-clicking the title is the mouse equivalent of Home.
  await dragPanel({ x: -200, y: 0 })
  const beforeDouble = await panelBox()
  assert(Math.abs(beforeDouble.x - (defaults.x - 200)) < 2, 'a second drag moved the window again')
  const start = await headingGrab()
  await page.mouse.dblclick(start.x, start.y)
  await page.waitForTimeout(80)
  const afterDouble = await panelBox()
  assert(Math.abs(afterDouble.x - defaults.x) < 2 && Math.abs(afterDouble.y - defaults.y) < 2, 'double-click returns to the default corner')
  assert.equal(await savedWhen(value => value === null, 'a double-click reset'), null)
  checks.push('double-clicking the title resets the corner')

  // Moving the window must not break dragging a card out of it.
  const before = (await api('workbench.get')).instances.length
  const card = page.locator('.dsh-directory-item').first()
  const title = card.locator('.dsh-w-head')
  const from = await title.boundingBox(), grid = await gridBox()
  assert(from && grid)
  await page.mouse.move(from.x + 60, from.y + 10)
  await page.mouse.down()
  await page.mouse.move(from.x + 30, from.y + 20, { steps: 3 })
  await page.mouse.move(grid.x + 90, grid.y + 70, { steps: 16 })
  await page.mouse.up()
  for (let attempt = 0; attempt < 100 && (await api('workbench.get')).instances.length !== before + 1; attempt++) await page.waitForTimeout(50)
  assert.equal((await api('workbench.get')).instances.length, before + 1, 'dragging a card still creates one instance')
  checks.push('moving the window keeps card dragging intact')

  assert.deepEqual(errors, [])
  await page.screenshot({ path: new URL('library-position.png', out).pathname, animations: 'disabled' })
} catch (error) {
  errors.push(error.stack ?? String(error))
  process.exitCode = 1
  await page?.screenshot({ path: new URL('failure.png', out).pathname }).catch(() => {})
} finally {
  await page?.close()
  if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors }, null, 2))
  console.log(out.pathname, JSON.stringify({ checks, errors }))
}
