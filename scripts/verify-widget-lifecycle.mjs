/** Private-site real Plugins-switch lifecycle gate. Explicit coordination required before running. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { setTimeout as delay } from 'node:timers/promises'

const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'Set DSH_VERIFY_URL explicitly after coordinating the private fixture site')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password, 'Only the explicit private loopback port 3186 is permitted')
const output = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(output, { recursive: true })
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${crypto.randomUUID().slice(0, 8)}`
const evidence = name => new URL(`widget-lifecycle-${runId}-${name}`, output).pathname
const typeId = '@vlln/dsh-home-example:counter'
const packageName = '@vlln/dsh-home-example-counter'
const ids = ['alpha', 'beta', 'migration', 'missing', 'future'].map(name => `lifecycle-${runId}-${name}`)
const [alpha, beta, migration, missing, future] = ids
const checks = []
const requests = []
const errors = []
const expectedErrors = []
let allowVersionError = false
let backup, page, controller, restored = false, restoreError, failure
let needsEnable = false
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
context.on('request', request => {
  if (!request.url().endsWith('/plugins/dsh-home/api') || request.method() !== 'POST') return
  const body = request.postDataJSON()
  if (body?.op === 'workbench.set') requests.push({ channel: 'browser', time: Date.now(), op: body.op, versions: body.instances?.map(item => ({ id: item.instanceId, version: item.configVersion })) })
})
context.on('response', async response => {
  if (!response.url().endsWith('/plugins/dsh-home/api') || response.request().method() !== 'POST') return
  const body = response.request().postDataJSON()
  if (!['workbench.get', 'workbench.set'].includes(body?.op)) return
  try {
    const envelope = await response.json()
    requests.push({ channel: 'browser-response', time: Date.now(), op: body.op, status: response.status(), versions: envelope.value?.instances?.map(item => ({ id: item.instanceId, version: item.configVersion })) })
  } catch {}
})
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, { headers: { Origin: target.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(response.ok() && envelope.ok, `${op} failed: ${JSON.stringify(envelope.error)}`)
  if (op === 'workbench.get' || op === 'workbench.set') requests.push({ channel: 'api', time: Date.now(), op, versions: envelope.value.instances?.map(item => ({ id: item.instanceId, version: item.configVersion })) })
  return envelope.value
}
const ready = async p => {
  await p.addLocatorHandler(p.getByRole('button', { name: 'Continue', exact: true }), () => p.getByRole('button', { name: 'Continue', exact: true }).click())
  await p.addLocatorHandler(p.getByRole('heading', { name: /^(Get started|开始使用)$/ }), () => p.getByRole('button', { name: /^(Close|关闭)$/ }).last().click())
  await p.goto(target.href)
}
const openHome = async p => {
  await p.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await p.locator('.dsh-home').waitFor()
}
const card = id => page.locator(`[data-widget-id="${id}"]`)
const counter = id => card(id).locator('[data-home-example-count]')
const stats = () => page.evaluate(() => structuredClone(window.__homeExampleStats))
const pluginCard = () => controller.locator(`[data-plugin-package="${packageName}"]`)
const toggle = async enabled => {
  const control = pluginCard().getByRole('switch')
  await control.waitFor()
  if ((await control.getAttribute('aria-checked')) !== String(enabled)) await control.click()
  await controller.waitForFunction(({ name, enabled }) => {
    const card = document.querySelector(`[data-plugin-package="${name}"]`)
    const control = card?.querySelector('[role="switch"]')
    return control?.getAttribute('aria-checked') === String(enabled) && !control.hasAttribute('disabled')
  }, { name: packageName, enabled })
}
const exactState = async baseline => {
  const current = await api('workbench.get')
  assert.deepEqual(current.instances, baseline.instances, 'Type disable/enable must not rewrite any durable instance/config')
  assert.deepEqual(current.layout, baseline.layout, 'Type disable/enable must not move/reset saved geometry')
}
try {
  page = await context.newPage()
  page.on('pageerror', error => {
    if (allowVersionError && /config version|migration|unsupported example/i.test(error.message)) expectedErrors.push(error.message)
    else errors.push(error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' && allowVersionError && /config version|migration|unsupported example/i.test(message.text())) expectedErrors.push(message.text())
  })
  await ready(page); await openHome(page)
  backup = await api('workbench.get')
  assert(backup.storage.writable)
  await writeFile(evidence('backup.json'), JSON.stringify(backup, null, 2))
  const fixture = [
    { instanceId: alpha, typeId, configVersion: 2, config: { label: 'Lifecycle Alpha', start: 7 } },
    { instanceId: beta, typeId, configVersion: 2, config: { label: 'Lifecycle Beta', start: 21 } },
    { instanceId: migration, typeId, configVersion: 1, config: { start: 5 } },
    { instanceId: missing, typeId: '@vlln/missing-fixture:counter', configVersion: 1, config: { untouched: true } },
    { instanceId: future, typeId, configVersion: 3, config: { label: 'Future config retained', start: 99 } },
  ]
  const layout = { ...(backup.layout ?? { order: [], focusOrder: [], size: {}, hidden: [] }), instanceLayout: true,
    order: [...ids, ...(backup.layout?.order ?? [])], hidden: backup.instances.map(item => item.instanceId),
    positions: { ...backup.layout?.positions, '12': { ...backup.layout?.positions?.['12'], ...Object.fromEntries(ids.map((id, i) => [id, { x: (i % 3) * 4, y: Math.floor(i / 3) * 4, w: 4, h: 4 }])) } } }
  allowVersionError = true
  // Dispose the old client before replacing the document: an old pending save must not race the fixture.
  await page.goto('about:blank')
  await api('workbench.set', { layout, instances: [...backup.instances, ...fixture] })
  await page.goto(target.href); await openHome(page)
  await counter(alpha).waitFor(); await counter(beta).waitFor(); await counter(migration).waitFor()
  await card(missing).getByRole('status').waitFor()
  await card(future).getByRole('alert').waitFor()
  // Playwright's waitForFunction tests returned Promise truthiness before awaiting it;
  // use bounded explicit API reads, never an async predicate that may resolve false once.
  let migrated
  for (let attempt = 0; attempt < 60; attempt++) {
    migrated = (await api('workbench.get')).instances.find(item => item.instanceId === migration)
    if (migrated?.configVersion === 2) break
    await delay(100)
  }
  assert.equal(migrated.configVersion, 2)
  assert.equal(migrated.config.start, 5)
  assert.equal(typeof migrated.config.label, 'string')
  const futureRaw = (await api('workbench.get')).instances.find(item => item.instanceId === future)
  assert.deepEqual(futureRaw, fixture.at(-1), 'Unsupported future config must remain intact')
  assert.equal(await counter(alpha).textContent(), '7')
  assert.equal(await counter(beta).textContent(), '21')
  await card(alpha).getByRole('button', { name: /^(Increment|加一)$/ }).click()
  await page.waitForFunction(id => document.querySelector(`[data-home-example-count="${id}"]`)?.textContent === '8', alpha)
  assert.equal(await counter(alpha).textContent(), '8')
  assert.equal(await counter(beta).textContent(), '21')
  checks.push({ name: 'v1 migration, missing type, future version boundary and independent counters', passed: true })
  await page.screenshot({ path: evidence('migration-and-placeholder.png'), fullPage: true })
  // Keep the future-version error out of repeated HMR cycles, without disturbing any preexisting records.
  const stable = await api('workbench.get')
  await api('workbench.set', { layout: { ...stable.layout, hidden: [...stable.layout.hidden, future] }, instances: stable.instances })
  await page.reload(); await openHome(page)
  await counter(alpha).waitFor(); await counter(beta).waitFor()
  allowVersionError = false
  const baseline = await api('workbench.get')
  const marker = crypto.randomUUID()
  await page.evaluate(marker => { window.__homeLifecycleDocument = marker; window.__homeExampleStats.lifecycleMarker = marker }, marker)
  const initial = await stats()
  controller = await context.newPage(); await ready(controller)
  await controller.getByRole('button', { name: /^(Plugins|插件)$/ }).first().click()
  await pluginCard().waitFor()
  assert.equal(await pluginCard().getByRole('switch').getAttribute('aria-checked'), 'true', 'Example must initially be enabled')
  for (const name of ['@vlln/dsh-home', packageName]) {
    const icon = controller.locator(`[data-plugin-package="${name}"] img`).first()
    await icon.waitFor()
    const decoded = await icon.evaluate(async image => {
      await image.decode()
      return { complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, dataUrl: image.src.startsWith('data:image/') }
    })
    assert(decoded.complete && decoded.width > 0 && decoded.height > 0 && decoded.dataUrl)
    checks.push({ name: `actual Plugins icon ${name}`, ...decoded, passed: true })
  }
  await controller.screenshot({ path: evidence('actual-plugins-icons.png'), fullPage: true })
  for (let round = 1; round <= 3; round++) {
    needsEnable = true
    await toggle(false)
    await card(alpha).getByRole('status').waitFor(); await card(beta).getByRole('status').waitFor()
    await page.waitForFunction(ids => ids.every(id => !(window.__homeExampleStats?.instances[id] > 0)) && window.__homeExampleStats?.activeTimers === 0, [alpha, beta, migration])
    const off = await stats()
    assert.equal(await page.evaluate(() => window.__homeLifecycleDocument), marker, 'Host navigated; cannot claim same-document cleanup')
    assert.equal(off.lifecycleMarker, marker, 'Stats object replaced; cannot claim accumulated cleanup')
    assert(off.unmounts >= initial.unmounts + round * 3)
    await exactState(baseline)
    checks.push({ name: `official GUI disable ${round}`, activeTimers: off.activeTimers, unmounts: off.unmounts, passed: true })
    await toggle(true)
    await counter(alpha).waitFor(); await counter(beta).waitFor(); await counter(migration).waitFor()
    assert.equal(await page.evaluate(() => window.__homeLifecycleDocument), marker)
    const on = await stats()
    assert.equal(on.lifecycleMarker, marker)
    assert.equal(on.instances[alpha], 1); assert.equal(on.instances[beta], 1); assert.equal(on.instances[migration], 1)
    assert.equal(await counter(alpha).textContent(), '7'); assert.equal(await counter(beta).textContent(), '21')
    await exactState(baseline)
    checks.push({ name: `official GUI enable ${round}`, mounts: on.mounts, passed: true })
    needsEnable = false
  }
  await card(missing).getByRole('status').waitFor()
  await page.screenshot({ path: evidence('three-cycles.png'), fullPage: true })
  assert.deepEqual(errors, [])
} catch (error) {
  failure = error
  await page?.screenshot({ path: evidence('failure.png'), fullPage: true }).catch(() => {})
} finally {
  // Close content page FIRST: no stale debounce/migration may overwrite full-document restoration.
  await page?.close().catch(() => {})
  if (needsEnable && controller) { try { await toggle(true) } catch (error) { restoreError = `enable restoration: ${error}`; failure ??= error } }
  await controller?.close().catch(() => {})
  if (backup) {
    try {
      await api('workbench.set', { layout: backup.layout, instances: backup.instances })
      const restoredState = await api('workbench.get')
      assert.deepEqual(restoredState.layout, backup.layout); assert.deepEqual(restoredState.instances, backup.instances)
      restored = true
    } catch (error) { restoreError = String(error); failure ??= error }
  }
  await writeFile(evidence('report.json'), JSON.stringify({ status: failure ? 'failed' : 'passed', origin: target.origin, checks, requests, errors, expectedErrors, restored, restoreError, failure: failure ? String(failure) : undefined }, null, 2))
  await browser.close()
}
if (failure) throw failure
console.log(JSON.stringify({ status: 'passed', cycles: 3, restored }))
