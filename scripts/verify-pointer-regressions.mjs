/** Isolated private station only: real grip/title releases and overlay state. Always restores records. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3186')
const out = new URL(`../../.work/dsh-home/evidence/pointer-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => { const r = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } }); const j = await r.json(); assert(j.ok, JSON.stringify(j)); return j.value }
const poll = async fn => { for (let n = 0; n < 80; n++) { if (await fn()) return; await new Promise(r => setTimeout(r, 25)) } throw Error('condition timed out') }
try {
  await context.request.get(url.href); backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  // Pin the board to the 12-column default: the fixture rectangle lives in that breakpoint,
  // and a wider inherited board scrolls it under the sidebar where no grip drag can start.
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  const fixture = { instanceId: 'pointer-note', typeId: '@vlln/dsh-home:notes', configVersion: 1, config: { title: 'Drag regression', text: 'Disposable test note' } }
  await api('workbench.set', { instances: [...backup.instances, fixture], layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(i => i.instanceId), order: [...backup.layout.order, fixture.instanceId], positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], [fixture.instanceId]: { x: 0, y: 8, w: 4, h: 6 } } } } })
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  let panel = page.locator('.dsh-library-panel'), search = panel.getByRole('searchbox', { name: /^(Search widgets|搜索小组件)$/ })
  await search.fill('clock')
  let source = panel.locator('[data-widget-type="@vlln/dsh-home:clock"]')
  await source.waitFor()
  for (const kind of ['grip', 'title']) {
    const anchor = kind === 'grip' ? source.locator('.dsh-tools .dsh-widget-grip') : source.locator('.dsh-w-title')
    const start = await anchor.boundingBox(), grid = await page.locator('.dsh-spatial-grid').boundingBox()
    const before = await api('workbench.get')
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2); await page.mouse.down()
    await page.mouse.move(grid.x + grid.width * .52, grid.y + 55, { steps: 1 })
    // No screenshot, dwell, locator wait, or artificial delay before releasing.
    await page.mouse.up()
    await poll(async () => await page.locator('.dsh-library-ghost').count() === 0)
    assert.equal(await page.evaluate(() => document.body.classList.contains('dsh-home-dragging')), false)
    const after = await api('workbench.get')
    await poll(async () => (await api('workbench.get')).instances.length > before.instances.length)
    const added = (await api('workbench.get')).instances.find(i => !before.instances.some(old => old.instanceId === i.instanceId))
    assert(added)
    await page.mouse.move(grid.x + grid.width * .6, grid.y + 240)
    assert.equal(await page.locator('.dsh-library-ghost').count(), 0)
    checks.push(`${kind}: immediate release ends drag exactly once and commits valid empty-space drop`)
    // Remove only the disposable drop and retain original fixture for the next case.
    await page.close(); const now = await api('workbench.get')
    const layout = structuredClone(now.layout); layout.order = layout.order.filter(i => i !== added.instanceId); delete layout.size[added.instanceId]; for (const rows of Object.values(layout.positions)) delete rows[added.instanceId]
    await api('workbench.set', { layout, instances: now.instances.filter(i => i.instanceId !== added.instanceId) })
    page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click(); await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click(); panel = page.locator('.dsh-library-panel'); search = panel.getByRole('searchbox', { name: /^(Search widgets|搜索小组件)$/ }); source = panel.locator('[data-widget-type="@vlln/dsh-home:clock"]'); await search.fill('clock')
  }
  // Source listeners must still terminate when a downstream bubble listener stops pointerup.
  await page.evaluate(() => { document.addEventListener('pointerup', event => event.stopImmediatePropagation(), { once: true }) })
  let start = await source.locator('.dsh-w-title').boundingBox(), grid = await page.locator('.dsh-spatial-grid').boundingBox()
  await page.mouse.move(start.x + 30, start.y + 8); await page.mouse.down(); await page.mouse.move(grid.x + grid.width * .52, grid.y + 55, { steps: 5 }); await page.mouse.up()
  await poll(async () => await page.locator('.dsh-library-ghost').count() === 0)
  checks.push('pointerup stopped by a downstream bubble listener still ends transport')
  await search.fill('activity')
  const activitySource = panel.locator('[data-widget-type="@vlln/dsh-home:activity"]')
  await activitySource.hover()
  assert.equal(await activitySource.getAttribute('title'), null)
  await poll(async () => await page.getByRole('tooltip').count() === 1)
  assert.equal(await activitySource.locator('.dsh-w-head [title]').count(), 1, 'only the grip has a native action title, not description ancestors')
  await page.screenshot({ path: new URL('single-tooltip.png', out).pathname, fullPage: true, animations: 'disabled' })
  // Armed over the delete target, then Esc: nothing is deleted and the open library
  // keeps its panel and its filter.
  const openGrip = await page.locator('[data-widget-id="pointer-note"] .dsh-tools .dsh-widget-grip').boundingBox()
  assert(openGrip)
  await page.mouse.move(openGrip.x + 6, openGrip.y + 6); await page.mouse.down()
  await page.mouse.move(openGrip.x + 6, openGrip.y - 24, { steps: 4 })
  await page.locator('.dsh-home-delete-zone').waitFor()
  const openZone = await page.locator('.dsh-home-delete-zone').boundingBox(); assert(openZone)
  await page.mouse.move(openZone.x + openZone.width / 2, openZone.y + openZone.height / 2, { steps: 8 })
  await page.locator('.dsh-home-delete-zone[data-armed="true"]').waitFor()
  await page.screenshot({ path: new URL('library-with-armed-target.png', out).pathname, fullPage: true, animations: 'disabled' })
  await page.keyboard.press('Escape'); await page.mouse.up()
  await poll(async () => await page.locator('.dsh-home-delete-zone').count() === 0)
  assert.equal(await panel.count(), 1); assert.equal(await search.inputValue(), 'activity')
  assert.equal(await page.locator('.dsh-home').getAttribute('data-editing'), 'true')
  assert.ok((await api('workbench.get')).instances.some(i => i.instanceId === 'pointer-note'))
  checks.push('deleting is a drag gesture; Esc over the target keeps the card and the mounted library')
  // Outside release cancels and a later move cannot resurrect a ghost.
  start = await activitySource.locator('.dsh-w-title').boundingBox()
  const before = (await api('workbench.get')).instances.length
  await page.mouse.move(start.x + 30, start.y + 8); await page.mouse.down(); await page.mouse.move(100, 50, { steps: 4 }); await page.mouse.up()
  await poll(async () => await page.locator('.dsh-library-ghost').count() === 0)
  assert.equal((await api('workbench.get')).instances.length, before)
  checks.push('outside release cancels without phantom instance or stuck ghost')
  for (const reason of ['Escape', 'blur', 'pointercancel', 'buttons0']) {
    start = await activitySource.locator('.dsh-w-title').boundingBox()
    const count = (await api('workbench.get')).instances.length
    await page.mouse.move(start.x + 30, start.y + 8); await page.mouse.down(); await page.mouse.move(700, 450, { steps: 4 })
    await page.locator('.dsh-library-ghost').waitFor()
    if (reason === 'Escape') await page.keyboard.press('Escape')
    else await page.evaluate(reason => {
      if (reason === 'blur') window.dispatchEvent(new Event('blur'))
      else window.dispatchEvent(new PointerEvent(reason === 'buttons0' ? 'pointermove' : 'pointercancel', { pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 700, clientY: 450 }))
    }, reason)
    await page.mouse.up(); await poll(async () => await page.locator('.dsh-library-ghost').count() === 0)
    assert.equal(await page.evaluate(() => document.body.classList.contains('dsh-home-dragging')), false)
    assert.equal((await api('workbench.get')).instances.length, count)
    checks.push(`${reason} safely cancels and clears all drag visuals without creating an instance`)
  }
  // Deletion is a drag onto the page-level target; the header has no trash button any more.
  assert.equal(await page.locator('.dsh-delete-widget').count(), 0)
  const delGrip = await page.locator('[data-widget-id="pointer-note"] .dsh-tools .dsh-widget-grip').boundingBox()
  assert(delGrip)
  await page.mouse.move(delGrip.x + 6, delGrip.y + 6); await page.mouse.down()
  await page.mouse.move(delGrip.x + 6, delGrip.y - 24, { steps: 4 })
  await page.locator('.dsh-home-delete-zone').waitFor()
  const delZone = await page.locator('.dsh-home-delete-zone').boundingBox(); assert(delZone)
  await page.mouse.move(delZone.x + delZone.width / 2, delZone.y + delZone.height / 2, { steps: 8 })
  await page.locator('.dsh-home-delete-zone[data-armed="true"]').waitFor()
  await page.mouse.up()
  await poll(async () => !(await api('workbench.get')).instances.some(i => i.instanceId === 'pointer-note'))
  assert.equal(await page.locator('.dsh-home-delete-modal').count(), 0, 'deletion needs no confirmation')
  assert.equal(await panel.count(), 1); assert.equal(await search.inputValue(), 'activity')
  checks.push('deleting a card immediately also preserves the library and current filter')
  assert.deepEqual(errors, [])
} catch (error) { errors.push(error.stack ?? String(error)); process.exitCode = 1; await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {}) }
finally {
  await page?.close()
  if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  await browser.close(); await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors }, null, 2)); console.log(out.pathname, JSON.stringify({ checks, errors }))
}
