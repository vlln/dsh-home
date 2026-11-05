/** Real extension lifecycle UI regression. Run only when the private fixture site is coordinated. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'Supply DSH_VERIFY_URL explicitly; no default/main-site fallback is allowed')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied private loopback port 3186 instance is permitted')
const output = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(output, { recursive: true })
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${crypto.randomUUID().slice(0, 8)}`
const evidence = name => new URL(`widget-instances-${runId}-${name}`, output).pathname
const typeId = '@vlln/dsh-home-example:counter'
const text = {
  edit: /^(Edit layout|编辑布局)$/,
  done: /^(Done|完成)$/,
  widgets: /^(Widgets|小组件)$/,
  add: /^(Add|添加)$/,
  settings: /^(Settings|设置)$/,
  save: /^(Save|保存)$/,
  cancel: /^(Cancel|取消)$/,
  duplicate: /^(Duplicate|复制)$/,
  hide: /^(Hide|隐藏)$/,
  show: /^(Show|显示)$/,
  delete: /^(Delete|删除)$/,
  confirmDelete: /^(Confirm delete|确认删除)$/,
  label: /^(Label|标签|名称)$/,
  start: /^(Initial value|初始值)$/,
  fail: /^(Throw a render error \(test only\)|抛出渲染错误（仅测试）)$/,
  increment: /^(Increment|加一)$/,
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
const checks = []
const errors = []
const expectedErrors = []
let expectingRenderFailure = false
let page
let backup
let restored = false
let restoreError
let failure
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, {
    headers: { Origin: target.origin }, data: { op, ...extra },
  })
  const envelope = await response.json()
  assert(response.ok() && envelope.ok, `${op} failed: ${JSON.stringify(envelope.error)}`)
  return envelope.value
}
try {
  page = await context.newPage()
  page.on('pageerror', error => {
    if (expectingRenderFailure && error.message.includes('home example: requested render failure')) expectedErrors.push({ kind: 'pageerror', message: error.message })
    else errors.push(error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' && expectingRenderFailure && message.text().includes('home example: requested render failure')) {
      expectedErrors.push({ kind: 'console', message: message.text() })
    }
  })
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  })
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
    await page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click()
  })
  const open = async () => {
    await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
    await page.locator('.dsh-home').waitFor()
    await page.getByRole('button', { name: text.edit }).waitFor()
    await page.waitForFunction(() => !document.querySelector('.dsh-home button[aria-pressed="false"]')?.disabled)
  }
  const reload = async () => { await page.reload(); await open() }
  const button = name => page.getByRole('button', { name, exact: true })
  const edit = async () => { await button(text.edit).click(); await page.locator('.dsh-home[data-editing=true]').waitFor() }
  const done = async () => { await button(text.done).click(); await page.locator('.dsh-home[data-editing=false]').waitFor() }
  const managerView = async name => { await page.locator('.dsh-tray').getByRole('button', { name, exact: true }).click() }
  const addView = async () => { await managerView(/^(Add widgets|添加小组件)$/); await page.locator('.dsh-widget-directory').waitFor() }
  const desktopView = async () => { await managerView(/^(On desktop|桌面组件)$/); await page.locator('.dsh-instance-list').waitFor() }
  const tray = async () => { await page.locator('.dsh-edit-bar').getByRole('button', { name: text.widgets }).click(); await page.locator('.dsh-tray').waitFor(); await desktopView() }
  const row = id => page.locator(`.dsh-instance-item[data-instance-id="${id}"]`)
  const card = id => page.locator(`[data-widget-id="${id}"]`)
  const settings = () => page.locator('.dsh-widget-settings')
  const settingsFor = async id => { await desktopView(); await row(id).getByRole('button', { name: text.settings }).click(); await settings().waitFor() }
  const fillSettings = async (label, start) => {
    await settings().getByRole('textbox', { name: text.label }).fill(label)
    await settings().getByRole('spinbutton', { name: text.start }).fill(String(start))
  }
  const save = async () => { await settings().getByRole('button', { name: text.save }).click(); await settings().waitFor({ state: 'hidden' }) }
  const instance = async id => (await api('workbench.get')).instances.find(item => item.instanceId === id)
  await page.goto(target.href)
  await open()
  backup = await api('workbench.get')
  assert(backup.storage.writable, 'The coordinated fixture must be writable')
  await writeFile(evidence('backup.json'), JSON.stringify(backup, null, 2))
  // Isolate visible geometry without deleting or changing any preexisting instance/config.
  await api('workbench.set', { instances: backup.instances, layout: {
    ...(backup.layout ?? { order: [], focusOrder: [], size: {}, hidden: [] }),
    hidden: backup.instances.map(item => item.instanceId),
  } })
  await reload()
  await edit(); await tray(); await addView()
  const directory = page.locator(`.dsh-directory-item[data-widget-type="${typeId}"]`)
  await directory.waitFor()
  await directory.getByRole('button', { name: text.add }).click()
  await page.waitForFunction(type => document.querySelectorAll(`[data-widget-type="${type}"].dsh-home-widget`).length === 1, typeId)
  await directory.getByRole('button', { name: text.add }).click()
  await page.waitForFunction(type => document.querySelectorAll(`[data-widget-type="${type}"].dsh-home-widget`).length === 2, typeId)
  assert.equal(await page.locator(`[data-widget-type="${typeId}"].dsh-home-widget`).count(), 2)
  await done()
  const existingIds = new Set(backup.instances.map(item => item.instanceId))
  const added = (await api('workbench.get')).instances.filter(item => item.typeId === typeId && !existingIds.has(item.instanceId))
  assert.equal(added.length, 2)
  const [first, second] = added
  assert.notEqual(first.instanceId, second.instanceId)
  assert.equal(first.configVersion, 2)
  checks.push('registered example discovered in directory; Add twice creates distinct durable v2 instances')

  await edit(); await tray(); await settingsFor(first.instanceId)
  await fillSettings('Alpha', 7); await save()
  await settingsFor(second.instanceId); await fillSettings('Beta', 21); await save()
  assert.equal((await instance(first.instanceId)).config.label, 'Alpha')
  assert.equal((await instance(first.instanceId)).config.start, 7)
  assert.equal((await instance(second.instanceId)).config.label, 'Beta')
  assert.equal((await instance(second.instanceId)).config.start, 21)
  checks.push('two instances independently configure label and starting value through public Settings UI')

  await settingsFor(first.instanceId)
  await fillSettings('Cancelled', 99)
  await settings().getByRole('button', { name: text.cancel }).click()
  assert.equal((await instance(first.instanceId)).config.label, 'Alpha')
  await settingsFor(first.instanceId)
  assert.equal(await settings().getByRole('textbox', { name: text.label }).inputValue(), 'Alpha')
  await fillSettings('Retried', 12)
  let intercepted = 0
  const rejectSave = async route => {
    const request = route.request()
    if (request.method() === 'POST' && request.postDataJSON()?.op === 'workbench.set') {
      intercepted++
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'fixture-write-failure', message: 'Deliberate regression failure' } }) })
    } else await route.continue()
  }
  await page.route('**/plugins/dsh-home/api', rejectSave)
  await settings().getByRole('button', { name: text.save }).click()
  await settings().getByRole('alert').waitFor()
  assert.equal(intercepted, 1)
  assert.equal(await settings().getByRole('textbox', { name: text.label }).inputValue(), 'Retried')
  assert.equal((await instance(first.instanceId)).config.label, 'Alpha')
  await page.screenshot({ path: evidence('failed-save-draft.png'), fullPage: true })
  await page.unroute('**/plugins/dsh-home/api', rejectSave)
  await save()
  assert.equal((await instance(first.instanceId)).config.label, 'Retried')
  checks.push('Cancel writes nothing; forced HTTP 500 retains draft and old durable config; retry succeeds')

  await row(first.instanceId).getByRole('button', { name: text.duplicate }).click()
  await done()
  const duplicate = (await api('workbench.get')).instances.find(item => item.typeId === typeId
    && !existingIds.has(item.instanceId) && item.instanceId !== first.instanceId && item.instanceId !== second.instanceId)
  assert(duplicate)
  assert.deepEqual(duplicate.config, (await instance(first.instanceId)).config)
  await edit(); await tray(); await settingsFor(duplicate.instanceId)
  await fillSettings('Copy only', 30); await save()
  assert.equal((await instance(first.instanceId)).config.label, 'Retried')
  assert.equal((await instance(duplicate.instanceId)).config.label, 'Copy only')
  await row(second.instanceId).getByRole('button', { name: text.hide }).click()
  await card(second.instanceId).waitFor({ state: 'hidden' })
  await row(second.instanceId).getByRole('button', { name: text.show }).click()
  await card(second.instanceId).waitFor()
  await done()
  checks.push('Duplicate clones but isolates config; show/hide restores the same instance')

  // The opt-in reference exception must damage only its own Content boundary.
  await edit(); await tray(); await settingsFor(first.instanceId)
  await settings().getByRole('checkbox', { name: text.fail }).check()
  expectingRenderFailure = true
  await save(); await done()
  await card(first.instanceId).getByRole('alert').waitFor()
  await card(second.instanceId).locator('[data-home-example-instance]').waitFor()
  const siblingCount = card(second.instanceId).locator('[data-home-example-count]')
  const beforeIncrement = Number(await siblingCount.innerText())
  await card(second.instanceId).getByRole('button', { name: text.increment }).click()
  await page.waitForFunction(({ id, expected }) => Number(document.querySelector(`[data-home-example-count="${id}"]`)?.textContent) === expected,
    { id: second.instanceId, expected: beforeIncrement + 1 })
  assert(expectedErrors.length > 0, 'Intentional extension render failure must be observable')
  await page.screenshot({ path: evidence('isolated-render-failure.png'), fullPage: true })
  await edit(); await tray(); await settingsFor(first.instanceId)
  await settings().getByRole('checkbox', { name: text.fail }).uncheck()
  await save(); await done()
  await card(first.instanceId).locator('[data-home-example-instance]').waitFor()
  expectingRenderFailure = false
  checks.push('intentional render exception is reported and isolated; sibling remains interactive; saving valid config recovers failed card')

  // Measure actual content viewport, not the shell including header/padding.
  const dimensions = await card(first.instanceId).locator('.dsh-widget-viewport').evaluate(node => ({ width: node.clientWidth, height: node.clientHeight }))
  const shell = await card(first.instanceId).boundingBox()
  assert(shell && dimensions.width < shell.width && dimensions.height < shell.height)
  await page.screenshot({ path: evidence('independent-instances.png'), fullPage: true })
  for (const [viewport, cols] of [[1440, 12], [920, 6], [540, 2]]) {
    await page.setViewportSize({ width: viewport, height: 1100 })
    await page.locator(`.dsh-spatial-container[data-cols="${cols}"]`).waitFor()
    await edit(); await done()
    const persisted = await api('workbench.get')
    assert(persisted.layout.positions[String(cols)]?.[first.instanceId], `Missing ${cols}-column geometry`)
    assert(!await page.locator('.dsh-home').evaluate(node => node.scrollWidth > node.clientWidth + 1))
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.locator('.dsh-spatial-container[data-cols="12"]').waitFor()
  await reload()
  const beforeDelete = await api('workbench.get')
  for (const cols of ['12', '6', '2']) assert(beforeDelete.layout.positions[cols]?.[first.instanceId])
  checks.push('body has a smaller measured content box; instance geometry persists independently at 12/6/2 columns and reload')

  await edit(); await tray()
  await row(duplicate.instanceId).getByRole('button', { name: text.delete }).click()
  assert.equal(await row(duplicate.instanceId).locator('.dsh-delete-confirm').count(), 1)
  assert(await instance(duplicate.instanceId), 'Delete requires a separate explicit confirmation')
  await row(duplicate.instanceId).getByRole('button', { name: text.confirmDelete }).click()
  await row(duplicate.instanceId).waitFor({ state: 'hidden' })
  await done()
  const afterDelete = await api('workbench.get')
  assert(!afterDelete.instances.some(item => item.instanceId === duplicate.instanceId))
  for (const positions of Object.values(afterDelete.layout.positions)) assert(!Object.hasOwn(positions, duplicate.instanceId))
  assert.equal((await instance(first.instanceId)).config.label, 'Retried')
  checks.push('explicit inline delete removes only that instance and every saved breakpoint coordinate')

  assert.deepEqual(errors, [], 'Unexpected uncaught browser errors')
} catch (error) {
  failure = error
  await page?.screenshot({ path: evidence('failure.png'), fullPage: true }).catch(() => {})
} finally {
  // Destroy the client first: no outstanding debounce can overwrite the restored full document.
  await page?.close().catch(() => {})
  if (backup) {
    try {
      await api('workbench.set', { layout: backup.layout, instances: backup.instances })
      const after = await api('workbench.get')
      assert.deepEqual(after.layout, backup.layout)
      assert.deepEqual(after.instances, backup.instances)
      restored = true
    } catch (error) { restoreError = String(error); failure ??= error }
  }
  await writeFile(evidence('report.json'), JSON.stringify({ url: target.origin, checks, errors, expectedErrors, restoredOriginalWorkbench: restored, restoreError, failure: failure ? String(failure) : undefined }, null, 2))
  await context.close()
  await browser.close()
}
for (const check of checks) console.log(`PASS ${check}`)
console.log(`Evidence prefix: widget-instances-${runId}`)
if (failure) { console.error(failure); process.exitCode = 1 }
