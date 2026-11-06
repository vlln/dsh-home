/** Deleting a card is a drag onto the page-level target, not a trash button in the
 * header. Private station only; the original instances, layout and preferences are
 * restored in `finally`. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/drag-delete-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const fixture = { instanceId: 'drag-delete', typeId: '@vlln/dsh-home:notes', configVersion: 1, config: { title: 'Disposable delete target', text: 'Only this disposable card may be deleted.' } }
const original = { x: 0, y: 6, w: 4, h: 6 }
const card = () => page.locator('[data-widget-id="drag-delete"]')
const modal = () => page.locator('.dsh-home-delete-modal')
const zone = () => page.locator('.dsh-home-delete-zone')
const cols = () => page.locator('.dsh-spatial-container').getAttribute('data-cols')
const storedRect = async () => (await api('workbench.get')).layout.positions?.[await cols()]?.[fixture.instanceId] ?? null
/** Layout writes are debounced, so poll the API instead of reading right after a drop. */
const storedWhen = async (predicate, label) => {
  let value = null
  for (let attempt = 0; attempt < 80; attempt++) {
    value = await storedRect()
    if (predicate(value)) return value
    await page.waitForTimeout(50)
  }
  throw new Error(`stored rectangle never satisfied ${label}: ${JSON.stringify(value)}`)
}
const gripBox = async () => { const box = await card().locator('.dsh-tools .dsh-widget-grip').boundingBox(); assert(box); return box }
const zoneBox = async () => { await zone().waitFor(); const box = await zone().boundingBox(); assert(box); return box }
const armed = async () => await page.locator('.dsh-home-delete-zone[data-armed="true"]').count() > 0
const pressGrip = async () => { const box = await gripBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 18, { steps: 4 }) }
const settle = () => page.waitForTimeout(120)
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null } })
  await api('workbench.set', {
    instances: [...backup.instances, fixture],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(instance => instance.instanceId),
      order: [...backup.layout.order, fixture.instanceId],
      positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], [fixture.instanceId]: original } } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await card().waitFor()
  // Reading mode offers no delete affordance and no drop target.
  assert.equal(await page.locator('.dsh-delete-widget').count(), 0, 'the header trash button is gone')
  assert.equal(await zone().count(), 0, 'no delete target outside a drag')
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').waitFor()
  assert.equal(await page.locator('.dsh-delete-widget').count(), 0, 'still no trash button in edit mode')
  checks.push('no delete button in either mode, and no target before a drag')

  // A drag that ends on the board stays a move: the target may appear, it must not arm.
  await pressGrip()
  await zone().waitFor()
  assert.equal(await armed(), false, 'the target is dormant while the pointer is on the board')
  const grid = await page.locator('.dsh-spatial-grid').boundingBox(); assert(grid)
  await page.mouse.move(grid.x + 500, grid.y + 520, { steps: 12 })
  await settle()
  assert.equal(await armed(), false, 'moving over the board never arms the target')
  await page.mouse.up()
  await settle()
  assert.equal(await modal().count(), 0, 'a board drop never asks to delete')
  const movedRect = await storedWhen(rect => rect !== null && (rect.x !== original.x || rect.y !== original.y), 'a moved card')
  assert.notDeepEqual(movedRect, original, 'the board drop moved the card instead')
  assert.ok((await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId), 'the card still exists')
  checks.push('a board drop moves the card and never opens the delete confirmation')
  await page.screenshot({ path: new URL('moved.png', out).pathname, animations: 'disabled' })

  // Escape aborts an armed drag: no move, no confirmation.
  const afterMove = await storedRect()
  await pressGrip()
  const target = await zoneBox()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 })
  await settle()
  assert.equal(await armed(), true, 'the target arms when the pointer enters it')
  await page.screenshot({ path: new URL('armed.png', out).pathname, animations: 'disabled' })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await settle()
  assert.equal(await modal().count(), 0, 'Esc cancels instead of deleting')
  assert.deepEqual(await storedRect(), afterMove, 'Esc leaves the stored rectangle untouched')
  checks.push('Esc over the target cancels the drag without deleting or moving')

  // Dropping on the target asks for confirmation and restores the pre-drag position.
  await pressGrip()
  const drop = await zoneBox()
  await page.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, { steps: 10 })
  await settle()
  await page.mouse.up()
  await modal().waitFor()
  assert.equal(await zone().count(), 0, 'the drop target disappears with the gesture')
  await page.screenshot({ path: new URL('confirm.png', out).pathname, animations: 'disabled' })
  assert.deepEqual(await storedRect(), afterMove, 'a delete drop never writes the dragged position')
  assert.ok((await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId), 'the instance still exists while confirming')
  await modal().locator('[data-modal-autofocus]').click()
  await settle()
  assert.equal(await modal().count(), 0)
  assert.ok((await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId), 'cancelling keeps the instance')
  assert.deepEqual(await storedRect(), afterMove)
  checks.push('a delete drop asks first, never moves the card, and cancelling keeps it')

  // Keyboard parity: Delete on the focused grip asks for confirmation too.
  await card().locator('.dsh-tools .dsh-widget-grip').focus()
  await page.keyboard.press('Delete')
  await modal().waitFor()
  await modal().locator('[data-modal-autofocus]').click()
  await settle()
  checks.push('Delete on the focused grip opens the same confirmation')

  // Confirming removes the instance and its coordinates.
  await pressGrip()
  const finalDrop = await zoneBox()
  await page.mouse.move(finalDrop.x + finalDrop.width / 2, finalDrop.y + finalDrop.height / 2, { steps: 10 })
  await settle()
  await page.mouse.up()
  await modal().waitFor()
  await modal().getByRole('button', { name: /^(Confirm delete|确认删除)$/ }).click()
  for (let attempt = 0; attempt < 100 && (await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId); attempt++) await page.waitForTimeout(50)
  const removed = await api('workbench.get')
  assert.equal(removed.instances.some(instance => instance.instanceId === fixture.instanceId), false, 'the confirmed instance is gone')
  assert.equal(await storedRect(), null, 'its rectangle is gone from the active breakpoint')
  for (let attempt = 0; attempt < 100 && await card().count() > 0; attempt++) await page.waitForTimeout(50)
  assert.equal(await card().count(), 0, 'the card is gone from the board')
  checks.push('confirming the drop removes the instance and its saved rectangle')

  assert.deepEqual(errors, [])
  await page.screenshot({ path: new URL('after-delete.png', out).pathname, animations: 'disabled' })
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
