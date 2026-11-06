/** Deleting a card is an immediate drag onto the page-level target that shatters the
 * card where it was dropped — no trash button, no confirmation dialog. Private station
 * only; original instances, layout and preferences are restored in `finally`. */
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
const card = target => target.locator('[data-widget-id="drag-delete"]')
const zone = target => target.locator('.dsh-home-delete-zone')
const cols = target => target.locator('.dsh-spatial-container').getAttribute('data-cols')
const storedRect = async target => (await api('workbench.get')).layout.positions?.[await cols(target)]?.[fixture.instanceId] ?? null
/** Layout writes are debounced, so poll the API instead of reading right after a drop. */
const storedWhen = async (target, predicate, label) => {
  let value = null
  for (let attempt = 0; attempt < 100; attempt++) {
    value = await storedRect(target)
    if (predicate(value)) return value
    await target.waitForTimeout(50)
  }
  throw new Error(`stored rectangle never satisfied ${label}: ${JSON.stringify(value)}`)
}
const instanceGone = async (target, timeout = 5000) => {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (!(await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId)) return
    await target.waitForTimeout(50)
  }
  throw new Error('the instance was never removed')
}
/** Re-create the disposable card after a deletion. */
const installFixture = async (instanceId = fixture.instanceId) => {
  const current = await api('workbench.get')
  const hidden = current.instances.map(instance => instance.instanceId).filter(id => id !== instanceId)
  await api('workbench.set', {
    instances: [...current.instances.filter(instance => instance.instanceId !== instanceId), { ...fixture, instanceId }],
    layout: { ...current.layout, instanceLayout: true, hidden,
      order: [...current.layout.order.filter(id => id !== instanceId), instanceId],
      positions: { ...current.layout.positions, 12: { ...current.layout.positions?.['12'], [instanceId]: original } } },
  })
}
const openEditor = async target => {
  await target.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await target.locator('[data-widget-id="drag-delete"]').waitFor()
  await target.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await target.locator('.dsh-edit-bar').waitFor()
}
const gripBox = async target => { const box = await card(target).locator('.dsh-tools .dsh-widget-grip').boundingBox(); assert(box); return box }
const pressGrip = async target => {
  const box = await gripBox(target)
  await target.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await target.mouse.down()
  await target.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 18, { steps: 4 })
}
const zoneBox = async target => { await zone(target).waitFor(); const box = await zone(target).boundingBox(); assert(box); return box }
const armed = async target => await target.locator('.dsh-home-delete-zone[data-armed="true"]').count() > 0
const moveOntoZone = async target => {
  const box = await zoneBox(target)
  await target.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  await target.waitForTimeout(140)
}
const settle = target => target.waitForTimeout(160)

try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null } })
  await installFixture()
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await openEditor(page)

  // No trash button anywhere, no target before a drag, no confirmation surface at all.
  assert.equal(await page.locator('.dsh-delete-widget').count(), 0, 'the header trash button is gone')
  assert.equal(await zone(page).count(), 0, 'no delete target outside a drag')
  assert.equal(await page.locator('.dsh-home-delete-modal').count(), 0, 'no confirmation dialog exists')
  checks.push('no trash button, no target before a drag, no confirmation dialog')

  // A drag that ends on the board stays a move: the target may appear, it must not arm.
  await pressGrip(page)
  await zone(page).waitFor()
  assert.equal(await armed(page), false, 'the target is dormant while the pointer is on the board')
  const grid = await page.locator('.dsh-spatial-grid').boundingBox(); assert(grid)
  await page.mouse.move(grid.x + 500, grid.y + 520, { steps: 12 })
  await settle(page)
  assert.equal(await armed(page), false, 'moving over the board never arms the target')
  await page.mouse.up()
  await settle(page)
  const movedRect = await storedWhen(page, rect => rect !== null && (rect.x !== original.x || rect.y !== original.y), 'a moved card')
  assert.notDeepEqual(movedRect, original, 'the board drop moved the card instead of deleting it')
  assert.ok((await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId), 'the card still exists')
  checks.push('a board drop moves the card and never deletes it')
  await page.screenshot({ path: new URL('moved.png', out).pathname, animations: 'disabled' })

  // Escape aborts an armed drag: no move, no deletion.
  const afterMove = await storedRect(page)
  await pressGrip(page)
  await moveOntoZone(page)
  assert.equal(await armed(page), true, 'the target arms when the pointer enters it')
  assert.equal(await page.locator('.dsh-home-delete-zone-armed').isVisible(), true, 'the armed label replaces the idle one')
  await page.screenshot({ path: new URL('armed.png', out).pathname, animations: 'disabled' })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await settle(page)
  assert.deepEqual(await storedRect(page), afterMove, 'Esc leaves the stored rectangle untouched')
  assert.ok((await api('workbench.get')).instances.some(instance => instance.instanceId === fixture.instanceId), 'Esc keeps the card')
  checks.push('Esc over the target cancels the drag without deleting or moving')

  // Keyboard parity: Delete on the focused grip deletes immediately.
  await card(page).locator('.dsh-tools .dsh-widget-grip').focus()
  await page.keyboard.press('Delete')
  await instanceGone(page)
  assert.equal(await card(page).count(), 0, 'the card is gone from the board')
  assert.equal(await page.locator('.dsh-home-delete-modal').count(), 0, 'the keyboard path asks nothing')
  assert.equal(await storedRect(page), null, 'its rectangle is gone from the active breakpoint')
  checks.push('Delete on the focused grip removes the card immediately')

  // Drop on the target: deleted on release, no confirmation, no burst under reduced motion.
  await installFixture()
  await page.reload()
  await openEditor(page)
  assert.deepEqual(await storedRect(page), original, 'the re-installed card is back at its rectangle')
  await pressGrip(page)
  await moveOntoZone(page)
  await page.mouse.up()
  await instanceGone(page)
  assert.equal(await page.locator('.dsh-home-delete-modal').count(), 0, 'dropping on the target never asks')
  assert.equal(await card(page).count(), 0, 'the card disappeared with the drop')
  assert.equal(await storedRect(page), null, 'its rectangle is gone')
  assert.equal(await page.locator('.dsh-debris').count(), 0, 'reduced motion deletes without a burst')
  checks.push('a delete drop removes the card immediately, with no dialog')
  await page.screenshot({ path: new URL('after-delete.png', out).pathname, animations: 'disabled' })

  assert.deepEqual(errors, [])

  // The shatter itself needs a context that allows motion.
  await installFixture()
  const motion = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' })
  const moving = await motion.newPage()
  moving.on('pageerror', error => errors.push(`motion: ${error.message}`))
  try {
    await moving.goto(url.href)
    await openEditor(moving)
    await pressGrip(moving)
    await moveOntoZone(moving)
    await moving.mouse.up()
    await moving.locator('.dsh-debris').waitFor({ timeout: 3000 })
    const burst = await moving.evaluate(() => {
      const layer = document.querySelector('.dsh-debris')
      return {
        particles: layer?.querySelectorAll('.dsh-debris-particle').length ?? 0,
        halo: layer?.querySelectorAll('.dsh-debris-halo').length ?? 0,
        clonesCard: layer?.querySelector('.dsh-home-widget') !== null,
        onBody: layer?.parentElement === document.body,
        zIndex: layer === null ? -1 : Number(getComputedStyle(layer).zIndex),
      }
    })
    assert.ok(burst.particles >= 20, `a cloud of dust lifts off (${burst.particles})`)
    assert.equal(burst.halo, 1, 'one soft halo blooms behind it')
    assert.equal(burst.clonesCard, false, 'the card itself is not duplicated: only debris appears around it')
    assert.equal(burst.onBody, true, 'the puff is a viewport layer')
    assert.ok(burst.zIndex >= 50, `the puff paints above the board (z ${burst.zIndex})`)
    await moving.screenshot({ path: new URL('debris.png', out).pathname })
    // The card itself is gone while the dust is still in the air.
    assert.equal(await moving.locator('[data-widget-id="drag-delete"]').count(), 0, 'the card is removed while the debris flies')
    await moving.waitForFunction(() => document.querySelector('.dsh-debris') === null, null, { timeout: 5000 })
    assert.equal(await moving.locator('.dsh-debris').count(), 0, 'the puff cleans itself up')
    await instanceGone(moving)
    checks.push(`dropping on the target removes the card and puffs ${burst.particles} debris particles around it`)
  } finally {
    await motion.close()
  }
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
