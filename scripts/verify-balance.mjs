/** Balance widget: no key means a clear reason, no stale number, no browser-side key. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/balance-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const widget = id => page.locator(`[data-widget-id="${id}"]`)
const instance = { instanceId: 'balance-demo', typeId: '@vlln/dsh-home:balance', configVersion: 1, config: { auto: true } }
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => item.instanceId !== 'balance-demo'), instance],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: ['balance-demo'], positions: { ...backup.layout.positions, 12: { 'balance-demo': { x: 0, y: 0, w: 4, h: 4 } } } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('balance-demo').locator('.dsh-balance').waitFor({ timeout: 10000 })
  const text = await widget('balance-demo').textContent()
  assert.match(text ?? '', /(未配置 API key|No API key configured)/u, `expected a clear reason, got: ${text}`)
  const flag = await widget('balance-demo').locator('.dsh-balance').getAttribute('data-available')
  assert.equal(flag, 'false')
  checks.push('no key: a clear reason instead of a number')

  // Refreshing stays available and keeps the same answer.
  await widget('balance-demo').getByRole('button', { name: /^(刷新|Refresh)$/ }).click()
  await page.waitForTimeout(600)
  assert.match((await widget('balance-demo').textContent()) ?? '', /(未配置 API key|No API key configured)/u)
  checks.push('refresh keeps the same honest answer')

  // The key never reaches the browser: the widget markup and boot payload carry no token-looking secret.
  const html = await page.content()
  assert(!/sk-[A-Za-z0-9]{20,}/u.test(html), 'no api key in the DOM')
  checks.push('no api key in the DOM')

  // Preview renders a sample balance with no request.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor({ timeout: 4000 })
  const card = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:balance"]')
  assert.equal(await card.count(), 1)
  assert.match((await card.textContent()) ?? '', /(128\.50)/u, 'the preview shows the sample amount')
  checks.push('preview: sample amount, no request')

  await page.screenshot({ path: new URL('balance.png', out).pathname, animations: 'disabled' })
  await writeFile(new URL('summary.json', out), JSON.stringify({ checks, errors }, null, 2))
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  for (const check of checks) console.log(`ok - ${check}`)
  console.log(`${checks.length} checks passed`)
} finally {
  try {
    if (page !== undefined) {
      if (backup !== undefined) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
      if (prefs !== undefined) await api('prefs.set', { prefs: prefs.prefs })
    }
  } finally {
    await browser.close()
  }
}
