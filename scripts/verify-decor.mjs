/** Picture and quote widgets: the host image route, the deterministic quote, inert previews. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/decor-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
// A real 1x1 PNG so the host route serves actual bytes.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const imagePath = path.join(tmpdir(), `dsh-home-decor-${Date.now()}.png`)
await writeFile(imagePath, png)

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
  { instanceId: 'picture-demo', typeId: '@vlln/dsh-home:picture', configVersion: 1, config: { src: imagePath, title: '回归图片', fit: 'cover' } },
  { instanceId: 'quote-demo', typeId: '@vlln/dsh-home:quote', configVersion: 1, config: { lines: [] } },
]
const positions = {
  'picture-demo': { x: 0, y: 0, w: 8, h: 6 },
  'quote-demo': { x: 8, y: 0, w: 4, h: 4 },
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
  const imageRequests = []
  page.on('request', request => { if (request.url().includes('/api/dsh-home/image')) imageRequests.push(new URL(request.url()).searchParams.get('path')) })
  await page.goto(url.href)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('picture-demo').locator('.dsh-picture').waitFor({ timeout: 8000 })

  // The local image is served by the host route and actually decoded.
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-widget-id="picture-demo"] .dsh-picture img')
    return img !== null && img.complete && img.naturalWidth > 0
  }, undefined, { timeout: 6000 })
  assert.equal(imageRequests[0], imagePath, 'the card asked the host for the configured path')
  assert.equal(await widget('picture-demo').locator('.dsh-picture-caption').textContent(), '回归图片')
  checks.push('picture: a local file is served by the host route and decoded')

  // A missing file falls back to the placeholder instead of a broken image.
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !instances.some(demo => demo.instanceId === item.instanceId)),
      { ...instances[0], config: { src: path.join(tmpdir(), 'dsh-home-missing.png'), title: '', fit: 'cover' } }, instances[1]],
    layout: { instanceLayout: true, hidden: backup.instances.map(item => item.instanceId), order: instances.map(item => item.instanceId),
      positions: { ...backup.layout.positions, 12: positions } },
  })
  await page.reload()
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('picture-demo').locator('.dsh-picture-empty').waitFor({ timeout: 8000 })
  assert.match(await widget('picture-demo').textContent(), /(图片加载失败|failed to load)/u)
  checks.push('picture: a missing file becomes a placeholder')

  // The quote is stable for the day and survives a reload.
  const first = (await widget('quote-demo').locator('.dsh-quote-text').textContent())?.trim()
  assert((first ?? '').length > 0, 'the quote has text')
  await page.reload()
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('quote-demo').locator('.dsh-quote-text').waitFor({ timeout: 8000 })
  assert.equal((await widget('quote-demo').locator('.dsh-quote-text').textContent())?.trim(), first, 'same day, same line')
  checks.push('quote: same day, same line, across a reload')

  // A custom list takes over after saving.
  await widget('quote-demo').getByRole('button', { name: /^(语录选项|Quote options)$/ }).click()
  await page.locator('.dsh-widget-config-modal textarea').fill('回归：自定义一句')
  await page.locator('.dsh-widget-config-modal').getByRole('button', { name: /^(保存|Save)$/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="quote-demo"] .dsh-quote-text')?.textContent?.includes('回归：自定义一句'), undefined, { timeout: 4000 })
  checks.push('quote: a custom list replaces the built-ins')

  // Preview stays offline: no image request while the gallery renders.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor({ timeout: 4000 })
  await page.waitForTimeout(400)
  const before = imageRequests.length
  const card = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:picture"]')
  await card.hover()
  await page.waitForTimeout(700)
  assert.equal(imageRequests.length, before, 'the picture preview issued no image request')
  assert.match(await card.textContent(), /(Picture|图片)/u)
  checks.push('preview: no image request from the gallery')

  await page.screenshot({ path: new URL('decor.png', out).pathname, animations: 'disabled' })
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
