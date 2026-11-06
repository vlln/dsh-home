/** Mutating, serial-only regression. Parent owns installation/station. Restores all fixture data. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
assert.equal(process.env.DSH_VERIFY_SERIAL, '1', 'Run alone: DSH_VERIFY_SERIAL=1')
const out = new URL(`../../.work/dsh-home/evidence/extending-canvas-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
let page, backup, prefs
const errors = [], checks = [], evidence = {}
const id = 'extending-canvas-regression'
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  assert(!backup.instances.some(instance => instance.instanceId === id))
  const fixture = { instanceId: id, typeId: '@vlln/dsh-home:notes', configVersion: 1, config: { title: 'Extending canvas regression', text: 'Disposable fixture' } }
  const initial = { x: 0, y: 0, w: 4, h: 6 }
  const seed = { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(instance => instance.instanceId), order: [...backup.layout.order, id], positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], [id]: initial } } }
  await api('workbench.set', { instances: [...backup.instances, fixture], layout: seed })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => page.getByRole('button', { name: 'Continue', exact: true }).click())
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click())
  const home = async () => { await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('.dsh-spatial-grid').waitFor() }
  const edit = () => page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  const done = async () => { await page.getByRole('button', { name: /^(Done|完成)$/ }).click(); await page.locator('.dsh-home[data-editing=false]').waitFor() }
  const widget = () => page.locator(`[data-widget-id="${id}"]`)
  // Writes now land on the active fixed-stride breakpoint, not always "12".
  const activeCols = async () => await page.locator('.dsh-spatial-container').getAttribute('data-cols')
  const geometry = async () => (await api('workbench.get')).layout.positions[await activeCols()]?.[id]
  await page.goto(url.href); await home(); await edit()
  evidence.ancestors = await page.locator('.dsh-spatial-grid').evaluate(grid => {
    const result = []
    for (let element = grid; element; element = element.parentElement) {
      const style = getComputedStyle(element), box = element.getBoundingClientRect()
      result.push({ className: element.className, overflowX: style.overflowX, overflowY: style.overflowY, contain: style.contain, clipPath: style.clipPath, height: box.height })
    }
    return result
  })
  const startDrag = async () => {
    const grip = widget().locator('.dsh-tools .dsh-widget-grip')
    await grip.scrollIntoViewIfNeeded()
    const box = await grip.boundingBox(); assert(box)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 8)
    const viewport = await page.locator('.dsh-home').boundingBox(); assert(viewport)
    const target = { x: box.x + box.width / 2, y: Math.min(890, viewport.y + viewport.height - 18) }
    await page.mouse.move(target.x, target.y, { steps: 18 })
    return target
  }
  const sampleDrag = async (target, frames) => page.evaluate(async ({ id, target, frames }) => {
    const records = []
    for (let i = 0; i < frames; i++) {
      await new Promise(resolve => requestAnimationFrame(resolve))
      const grid = document.querySelector('.dsh-spatial-grid'), home = document.querySelector('.dsh-home'), widget = document.querySelector(`[data-widget-id="${id}"]`)
      const box = widget.getBoundingClientRect(), surface = grid.getBoundingClientRect()
      records.push({ top: box.top, bottom: box.bottom, width: box.width, height: box.height, extent: surface.height, scroll: home.scrollTop,
        dragging: widget.classList.contains('react-draggable-dragging'), visible: Boolean(document.elementFromPoint(target.x, Math.max(box.top + 8, Math.min(target.y, box.bottom - 8)))?.closest(`[data-widget-id="${id}"]`)) })
    }
    return records
  }, { id, target, frames })
  // Pixel x must remain on the fixed footprint even when raw pointer leaves it.
  const sideGrip = await widget().locator('.dsh-tools .dsh-widget-grip').boundingBox(); assert(sideGrip)
  const sideStart = { x: sideGrip.x + sideGrip.width / 2, y: sideGrip.y + sideGrip.height / 2 }
  const horizontalExtent = () => page.locator('.dsh-home').evaluate(home => home.scrollWidth)
  const horizontalBefore = await horizontalExtent()
  await page.mouse.move(sideStart.x, sideStart.y); await page.mouse.down()
  for (const x of [5, 1435]) {
    await page.mouse.move(x, sideStart.y + 12, { steps: 12 })
    const bounds = await page.locator('.dsh-spatial-grid').boundingBox(), box = await widget().boundingBox()
    assert(bounds && box && box.x >= bounds.x - 1 && box.x + box.width <= bounds.x + bounds.width + 1, 'Sideways pixel drag cannot escape the fixed board')
    // The board is intentionally scrollable when it is wider than the window; a
    // sideways widget drag must not change that scroll range at all.
    assert.equal(await horizontalExtent(), horizontalBefore, 'Sideways pixel drag cannot create horizontal canvas')
  }
  await page.keyboard.press('Escape'); await page.mouse.up()
  checks.push('left/right out-of-board pointer keeps the live widget within the fixed board and never grows the scroll range')
  const target = await startDrag()
  const samples = await sampleDrag(target, 360)
  evidence.samples = samples
  const stable = samples.slice(4)
  assert(stable.at(-1).scroll - stable[0].scroll > 3000, 'Stationary pointer must continuously scroll past old board and old 2000px padding limit')
  assert(Math.max(...stable.map(row => row.top)) - Math.min(...stable.map(row => row.top)) < 4, 'Live widget must not jump while ancestor scrolls')
  assert(stable.every(row => row.dragging && row.visible), 'Dragged widget must remain hit-test visible throughout extension')
  assert(stable.every(row => Math.abs(row.width - stable[0].width) < 1 && Math.abs(row.height - stable[0].height) < 1), 'Drag must not resize widget')
  assert(stable.every((row, index) => index === 0 || row.extent >= stable[index - 1].extent), 'Temporary scroll extent must not shrink during a gesture')
  await page.screenshot({ path: new URL('beyond-original-bottom.png', out).pathname })
  await page.mouse.up()
  await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging'))
  assert.equal(await page.locator('.react-grid-placeholder').count(), 0)
  await done()
  const committed = await geometry()
  assert(committed.y > 50)
  assert.equal(committed.w, initial.w); assert.equal(committed.h, initial.h)
  await page.reload(); await home()
  assert.deepEqual(await geometry(), committed)
  assert.deepEqual((await api('workbench.get')).instances, [...backup.instances, fixture])
  checks.push('stationary edge pointer extends >3000px past original surface; visual stays under pointer at fixed dimensions; release/Done/reload retains exact coordinates and instances')

  // Reset only the disposable fixture to test cancellation against a small board.
  await page.close(); await api('workbench.set', { instances: [...backup.instances, fixture], layout: seed })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href); await home(); await edit()
  const cancelTarget = await startDrag()
  await sampleDrag(cancelTarget, 210)
  await page.keyboard.press('Escape'); await page.mouse.up()
  await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging'))
  assert.equal(await page.locator('.dsh-home[data-editing=true]').count(), 1)
  assert.equal(await page.locator('.react-grid-placeholder').count(), 0)
  const cancelledView = await page.locator('.dsh-home').evaluate(home => ({ top: home.scrollTop, max: home.scrollHeight - home.clientHeight, extent: document.querySelector('.dsh-spatial-grid').getBoundingClientRect().height }))
  assert(cancelledView.top >= 0 && cancelledView.top <= Math.max(0, cancelledView.max))
  assert(cancelledView.top < 10, 'Cancel should restore the starting view rather than strand it in temporary blank space')
  assert(cancelledView.extent <= 901, 'Cancel removes temporary runway')
  await done(); assert.deepEqual(await geometry(), initial)
  checks.push('Escape rolls back extension and positions, restores/clamps starting view, removes placeholder/runway, remains editable')

  await edit(); await startDrag()
  const colsBefore = await page.locator('.dsh-spatial-container').getAttribute('data-cols')
  await page.setViewportSize({ width: 920, height: 900 })
  // A narrow window must not re-project the board: the column count stays fixed and
  // the board scrolls horizontally instead. Cancel the in-flight drag first.
  await page.waitForFunction(() => {
    const home = document.querySelector('.dsh-home')
    return home.scrollWidth > home.clientWidth + 1
  })
  assert.equal(await page.locator('.dsh-spatial-container').getAttribute('data-cols'), colsBefore, 'Window width never changes the canvas columns')
  await page.keyboard.press('Escape'); await page.mouse.up()
  await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging'))
  assert.equal(await page.locator('.dsh-home[data-editing=true]').count(), 1)
  assert.equal(await page.getByRole('button', { name: /^(Done|完成)$/ }).isEnabled(), true)
  await done(); assert.deepEqual(await geometry(), initial)
  const narrow = await page.evaluate(() => {
    const home = document.querySelector('.dsh-home')
    return { boardScrolls: home.scrollWidth > home.clientWidth + 1,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
  })
  assert(narrow.boardScrolls, 'A board wider than the narrow window scrolls horizontally')
  assert(!narrow.documentOverflow, 'The document itself never overflows horizontally')
  checks.push('narrow window keeps the canvas columns, cancels the drag and leaves stored geometry unchanged; the board scrolls, the page does not')
  assert.deepEqual(errors, [])
} catch (error) {
  errors.push(error.stack ?? String(error)); process.exitCode = 1
  await page?.screenshot({ path: new URL('failure.png', out).pathname }).catch(() => {})
} finally {
  await page?.close()
  if (backup) await api('workbench.set', { instances: backup.instances, layout: backup.layout })
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors, evidence }, null, 2))
  console.log(out.pathname, JSON.stringify({ checks, errors }))
}
