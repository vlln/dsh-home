/** Token-usage widget: the numbers on the card must equal the ledger's own buckets. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { compactCount, totalTokens, tokensPerSecond } from '../src/client/usage-model.ts'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/usage-${Date.now()}/`, import.meta.url)
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
const instances = [
  { instanceId: 'usage-demo', typeId: '@vlln/dsh-home:usage', configVersion: 1, config: { week: true } },
  { instanceId: 'usage-small', typeId: '@vlln/dsh-home:usage', configVersion: 1, config: { week: false } },
]
const positions = {
  'usage-demo': { x: 0, y: 0, w: 8, h: 4 },
  'usage-small': { x: 8, y: 0, w: 4, h: 4 },
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !instances.some(demo => demo.instanceId === item.instanceId)), ...instances],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: instances.map(item => item.instanceId), positions: { ...backup.layout.positions, 12: positions } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('usage-demo').locator('.dsh-usage').waitFor({ timeout: 10000 })

  const snapshot = await api('snapshot')
  const today = snapshot.today.tokens
  const expectedTotal = compactCount(totalTokens(today))
  const big = widget('usage-demo')
  assert.equal((await big.locator('.dsh-usage-total').textContent())?.trim(), expectedTotal, 'the hero number matches the ledger bucket')
  const chips = await big.locator('.dsh-usage-chips .dsh-chip').allTextContents()
  assert.equal(chips.length, 3, 'three bucket chips')
  assert.ok(chips.some(text => /(输入|in)/u.test(text) && text.includes(compactCount(today.input))), `input chip: ${chips.join(' | ')}`)
  assert.ok(chips.some(text => /(输出|out)/u.test(text) && text.includes(compactCount(today.output))), `output chip: ${chips.join(' | ')}`)
  assert.ok(chips.some(text => /(缓存|cached)/u.test(text) && text.includes(compactCount(today.cacheRead))), `cache chip: ${chips.join(' | ')}`)
  assert.equal(await big.locator('.dsh-usage-bar').count(), 7, 'seven day bars')
  const rate = tokensPerSecond(today, snapshot.today.runMs)
  const foot = await big.locator('.dsh-usage-foot').textContent()
  assert.match(foot ?? '', new RegExp(rate === null ? '—' : rate.toFixed(1).replace('.', '\\.'), 'u'), `rate missing from ${foot}`)
  checks.push('the card matches the ledger buckets and the computed rate')

  const small = widget('usage-small')
  assert.equal(await small.locator('.dsh-usage').getAttribute('data-compact'), 'true', 'a four-column card is compact')
  assert.equal(await small.locator('.dsh-usage-bar').count(), 0, 'the compact card drops the week bars')
  assert.equal((await small.locator('.dsh-usage-total').textContent())?.trim(), expectedTotal)
  checks.push('the compact card keeps the number and drops the chart')

  // The gallery preview is synthetic and issues no ledger traffic.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor({ timeout: 4000 })
  const card = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:usage"]')
  assert.equal(await card.count(), 1)
  assert((await card.locator('.dsh-usage-total').textContent())?.trim() !== '0', 'the preview shows sample tokens')
  checks.push('preview: sample tokens, no live ledger')

  await page.screenshot({ path: new URL('usage.png', out).pathname, animations: 'disabled' })
  await writeFile(new URL('summary.json', out), JSON.stringify({ checks, errors, today }, null, 2))
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
