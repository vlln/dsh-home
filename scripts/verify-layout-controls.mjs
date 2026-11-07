/** Real pointer/control acceptance; only the explicitly isolated private station, restores state. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3186')
const out = new URL(`../../.work/dsh-home/evidence/controls-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
let page, backup, prefs
const errors = [], checks = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const body = await response.json(); assert(body.ok, JSON.stringify(body)); return body.value
}
const poll = async fn => { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise(r => setTimeout(r, 50)) } throw Error('condition timed out') }
const type = name => `@vlln/dsh-home:${name}`
const item = (name, config) => ({ instanceId: `controls-${name}`, typeId: type(name), configVersion: 1, config })
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  const samples = [item('notes', { title: 'Sample note', text: 'Keep this text' }), item('clock', { label: '', timeZone: 'UTC', hour12: false }), item('activity', { cwd: '', range: 'quarter' })]
  // Keep all original records; hide temporarily while exercising disposable fixtures.
  const layout = { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(i => i.instanceId), order: [...backup.layout.order, ...samples.map(i => i.instanceId)], positions: { ...backup.layout.positions, 12: { ...(backup.layout.positions?.[12] ?? {}), 'controls-notes': { x: 0, y: 5, w: 4, h: 6 }, 'controls-clock': { x: 8, y: 15, w: 4, h: 4 }, 'controls-activity': { x: 0, y: 25, w: 8, h: 6 } } } }
  await api('workbench.set', { layout, instances: [...backup.instances, ...samples] })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  const open = async () => { await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('[data-widget-id="controls-clock"]').waitFor() }
  await open()
  const note = page.locator('[data-widget-id="controls-notes"]')
  const editNote = () => note.getByRole('button', { name: /^(Edit note|编辑便笺)$/ })
  await editNote().click()
  let dialog = page.locator('.dsh-widget-config-modal')
  await dialog.getByRole('textbox', { name: /^(Text|内容)$/ }).fill('Cancel this draft')
  await dialog.getByRole('button', { name: /^(Cancel|取消)$/ }).last().click()
  assert.equal((await api('workbench.get')).instances.find(i => i.instanceId === 'controls-notes').config.text, 'Keep this text')
  checks.push('note owns editing entry in reading mode; Cancel preserves configuration')
  await editNote().click(); dialog = page.locator('.dsh-widget-config-modal')
  await dialog.getByRole('textbox', { name: /^(Text|内容)$/ }).fill('Saved by widget')
  let fail = true
  const intercept = async route => { if (route.request().postDataJSON()?.op === 'workbench.set' && fail) { await route.fulfill({ status: 500, json: { ok: false, error: 'injected save failure' } }); return } await route.continue() }
  await page.route('**/plugins/dsh-home/api', intercept)
  await dialog.getByRole('button', { name: /^(Save|保存)$/ }).click(); await dialog.getByRole('alert').waitFor()
  assert.equal((await api('workbench.get')).instances.find(i => i.instanceId === 'controls-notes').config.text, 'Keep this text')
  assert.equal(await dialog.getByRole('textbox', { name: /^(Text|内容)$/ }).inputValue(), 'Saved by widget')
  fail = false; await dialog.getByRole('button', { name: /^(Save|保存)$/ }).click(); await dialog.waitFor({ state: 'hidden' })
  await page.unroute('**/plugins/dsh-home/api', intercept)
  assert.equal((await api('workbench.get')).instances.find(i => i.instanceId === 'controls-notes').config.text, 'Saved by widget')
  checks.push('widget-owned config failure retains draft and old data; retry persists successfully')
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  assert.equal(await page.getByRole('button', { name: /^(Reset|恢复默认|Confirm reset\?|确认恢复默认？)$/ }).count(), 0)
  assert.equal(await page.locator('.dsh-w-head').getByRole('button', { name: /^(Settings|设置|Edit content|编辑内容)$/ }).count(), 0)
  assert.equal(await editNote().count(), 0)
  checks.push('Reset and shell settings absent; layout editing has only geometry/delete controls')
  const before = await api('workbench.get')
  await page.getByRole('button', { name: /^(Tidy layout|整理布局)$/ }).click()
  await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
  const after = await api('workbench.get')
  assert.deepEqual(after.instances, before.instances)
  for (const sample of samples) { const a = after.layout.positions[12][sample.instanceId], b = before.layout.positions[12][sample.instanceId]; assert.equal(a.w, b.w); assert.equal(a.h, b.h) }
  assert.equal(Math.min(...samples.map(s => after.layout.positions[12][s.instanceId].y)), 0)
  assert(Math.max(...samples.map(s => after.layout.positions[12][s.instanceId].y + after.layout.positions[12][s.instanceId].h)) < 15)
  for (const key of ['2', '6']) assert.deepEqual(after.layout.positions?.[key], before.layout.positions?.[key])
  checks.push('Tidy preserves instances/configs/sizes and other breakpoints; removes large canvas holes')
  await open(); await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  const remove = note.getByRole('button', { name: /^(Delete|删除)$/ })
  const color = await remove.evaluate(el => ({ actual: getComputedStyle(el).color, expected: getComputedStyle(el).getPropertyValue('--dsw-alias-state-error-primary').trim() }))
  assert(color.actual !== ''); assert(color.expected !== '')
  assert.equal(await remove.evaluate(el => { const probe = document.createElement('span'); probe.style.color = 'var(--dsw-alias-state-error-primary)'; el.append(probe); const expected = getComputedStyle(probe).color; probe.remove(); return getComputedStyle(el).color === expected }), true)
  await remove.click(); const confirmation = page.locator('.dsh-home-delete-modal'); await confirmation.waitFor()
  assert.equal(await note.locator('.dsh-delete-confirm').count(), 0)
  assert(await confirmation.getByRole('button', { name: /^(Cancel|取消)$/ }).last().evaluate(el => el === document.activeElement))
  await page.screenshot({ path: new URL('delete-modal.png', out).pathname, fullPage: true, animations: 'disabled' })
  await page.keyboard.press('Escape'); await confirmation.waitFor({ state: 'hidden' })
  assert.equal(await page.locator('.dsh-home').getAttribute('data-editing'), 'true')
  assert(await remove.evaluate(el => el === document.activeElement))
  checks.push('red trash control opens independent modal; Cancel focused; Escape restores focus and keeps layout mode')
  await remove.click()
  fail = true; await page.route('**/plugins/dsh-home/api', intercept)
  await confirmation.getByRole('button', { name: /^(Confirm delete|确认删除)$/ }).click(); await confirmation.getByRole('alert').waitFor()
  assert((await api('workbench.get')).instances.some(i => i.instanceId === 'controls-notes'))
  checks.push('failed delete retains original card and confirmation for retry')
  fail = false; await confirmation.getByRole('button', { name: /^(Confirm delete|确认删除)$/ }).click()
  await poll(async () => !(await api('workbench.get')).instances.some(i => i.instanceId === 'controls-notes'))
  await page.unroute('**/plugins/dsh-home/api', intercept)
  const removed = await api('workbench.get'); for (const rows of Object.values(removed.layout.positions)) assert(!rows['controls-notes'])
  checks.push('confirmed deletion removes only selected instance and all its breakpoint positions')
  await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
  const clock = page.locator('[data-widget-id="controls-clock"]')
  await clock.locator('.dsh-clock-zone').waitFor()
  assert.equal(await page.locator('.dsh-widget-config-modal').count(), 0, 'the clock edits its zone inline')
  const activity = page.locator('[data-widget-id="controls-activity"]')
  await activity.locator('.dsh-activity-scale').waitFor()
  assert.equal(await page.locator('.dsh-widget-config-modal').count(), 0, 'the footprints filter inline')
  checks.push('clock and activity expose their own inline controls (no dialog)')
  // Isolated short-lived extra fixtures exercise the other independently owned editors.
  await page.close()
  const extraBase = await api('workbench.get')
  const extras = [
    { instanceId: 'controls-quick', typeId: type('quick'), configVersion: 2, config: { links: [] } },
    { instanceId: 'controls-counter', typeId: '@vlln/dsh-home-example:counter', configVersion: 2, config: { label: 'Counter sample', start: 3, fail: true } },
  ]
  await api('workbench.set', { layout: { ...extraBase.layout, order: [...extraBase.layout.order, ...extras.map(i => i.instanceId)] }, instances: [...extraBase.instances, ...extras] })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); await open()
  const quick = page.locator('[data-widget-id="controls-quick"]')
  await quick.getByRole('button', { name: /^(Manage shortcuts|管理入口)$/ }).click(); await page.locator('.dsh-widget-config-modal').waitFor(); await page.keyboard.press('Escape')
  const counter = page.locator('[data-widget-id="controls-counter"]')
  await counter.getByRole('alert').waitFor()
  await counter.getByRole('button', { name: /^(Counter options|计数器选项)$/ }).click()
  const options = page.getByRole('dialog', { name: /^(Counter options|计数器选项)$/ })
  await options.getByRole('textbox', { name: /^(Label|标签)$/ }).fill('Recovered counter')
  await options.getByRole('button', { name: /^(Save|保存)$/ }).click(); await options.waitFor({ state: 'hidden' })
  assert.deepEqual((await api('workbench.get')).instances.find(i => i.instanceId === 'controls-counter').config, { label: 'Recovered counter', start: 3 })
  await counter.getByRole('button', { name: /^(Increment|加一)$/ }).click()
  assert.equal(await counter.locator('output').textContent(), '4')
  checks.push('Quick owns shortcut editor; external counter owns options and recovers legacy error without shell settings')
  await page.screenshot({ path: new URL('tidy-layout.png', out).pathname, fullPage: true, animations: 'disabled' })
  assert.deepEqual(errors, [])
} catch (error) { errors.push(error.stack ?? String(error)); process.exitCode = 1; await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {}) }
finally {
  await page?.close()
  if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors }, null, 2))
  console.log(out.pathname, JSON.stringify({ checks, errors }))
}
