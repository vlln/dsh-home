/** 最近会话卡：五条、无搜索/目录控件、4 列宽、条目撑满高度。
 * 私有站 3186，结束恢复原布局。 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/recent-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
// `rc-old` mirrors the real board: an 8-wide rectangle saved by an older declaration.
const seeded = [
  { instanceId: 'rc-old', typeId: '@vlln/dsh-home:recent', configVersion: 1, config: {}, rect: { x: 0, y: 0, w: 8, h: 7 } },
  { instanceId: 'rc-tall', typeId: '@vlln/dsh-home:recent', configVersion: 1, config: {}, rect: { x: 4, y: 0, w: 4, h: 10 } },
]
const ids = seeded.map(item => item.instanceId)
const source = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
const producer = stripTypeScriptTypes(source.slice(source.indexOf('export function builtinPreviewData('), source.indexOf('/** An isolated runtime')).replace('export function', 'function'), { mode: 'strip' })
const ledger = new Function('PREVIEW_NOW', `${producer}; return builtinPreviewData`)(Date.now())(key => key).ledger
// Nine sessions across workspaces: the card must show five and state the real total.
const cwds = ['DshPlugins', 'Workbench', 'pdf-figures-skill', 'repro-decision', 'alpha', 'beta']
ledger.sessions = Array.from({ length: 9 }, (_, index) => ({
  ...ledger.sessions[index % ledger.sessions.length],
  id: `sample-${index}`, cwd: cwds[index % cwds.length],
  lastAt: Date.now() - index * 600_000,
}))
const card = () => page.locator('[data-widget-id="rc-old"]')
const tall = () => page.locator('[data-widget-id="rc-tall"]')
const openHome = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('[data-widget-id="rc-old"]').waitFor()
}
const box = async locator => locator.evaluate(el => ({
  width: el.clientWidth, height: el.clientHeight, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
}))
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !ids.includes(item.instanceId)), ...seeded.map(({ rect, ...item }) => item)],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: [...backup.layout.order.filter(id => !ids.includes(id)), ...ids],
      positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], ...Object.fromEntries(seeded.map(item => [item.instanceId, item.rect])) } } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  for (const pattern of ['**/api/dsh-home/rpc', '**/plugins/dsh-home/api']) {
    await page.route(pattern, route => route.request().postDataJSON()?.op === 'snapshot'
      ? route.fulfill({ json: { ok: true, value: ledger } }) : route.continue())
  }
  await page.goto(url.href)
  await openHome()
  await card().locator('.dsh-recent-item').first().waitFor({ timeout: 5000 })

  // 1. No search box, no directory select: the card is a digest, not a catalog.
  assert.equal(await card().locator('input, select, .dsh-recent-filters').count(), 0, 'recent has no search or directory controls')
  // 2. Exactly the five newest sessions; the footer still states the real total.
  const titles = await card().locator('.dsh-recent-title').allTextContents()
  assert.equal(titles.length, 5, `five entries: ${titles.join(' | ')}`)
  const footer = await card().locator('.dsh-recent-footer').innerText()
  const stated = Number(/5\s*(?:\/|of)\s*(\d+)/u.exec(footer)?.[1] ?? 0)
  assert(stated >= 9, `the footer states 5 of the real total: ${footer}`)
  // 3. The saved 8-wide rectangle renders as the declared 4-column card (372px).
  const width = await card().evaluate(el => el.getBoundingClientRect().width)
  assert(Math.abs(width - 372) <= 1, `the old wide card adopts the 4-column declaration: ${width}`)
  const savedRect = (await api('workbench.get')).layout.positions['12']['rc-old']
  assert.deepEqual(savedRect, { x: 0, y: 0, w: 8, h: 7 }, 'projection never rewrites the saved document')
  // 4. Entries are tall targets, not 28px strips: the five share the card height.
  const heights = await card().locator('.dsh-recent-item').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))
  assert(heights.every(height => height >= 55), `every entry is a tall target: ${heights.map(h => h.toFixed(1)).join(', ')}`)
  assert(new Set(heights.map(h => h.toFixed(0))).size === 1, `the five entries share one height: ${heights.join(', ')}`)
  const list = await card().locator('.dsh-recent-list').evaluate(el => ({ h: el.clientHeight, sh: el.scrollHeight }))
  assert(list.sh <= list.h + 1, `the list never overflows: ${JSON.stringify(list)}`)
  const content = await box(card().locator('.dsh-home-widget-content'))
  assert(content.scrollHeight <= content.height + 1 && content.scrollWidth <= content.width + 1, `no card scrollbar: ${JSON.stringify(content)}`)
  // Reading order: dot leads, title and time on line one, capsule on line two.
  assert.deepEqual(await card().locator('.dsh-recent-item').first().evaluate(el => [...el.children].map(child => child.className)),
    ['dsh-recent-top', 'dsh-recent-meta'], 'two lines: title/time, then capsule/state')
  assert.deepEqual(await card().locator('.dsh-recent-top').first().evaluate(el => [...el.children].map(child => child.className)),
    ['dsh-recent-dot', 'dsh-recent-title', 'dsh-recent-time'], 'line one: dot, title, time')
  assert.equal(await card().locator('.dsh-recent-meta .dsh-ws-pill').count(), 5, 'every entry names its workspace in a capsule')
  // Real type, not shrunken: the title is a 14px strong line.
  const titleStyle = await card().locator('.dsh-recent-title').first().evaluate(el => {
    const style = getComputedStyle(el)
    return { size: parseFloat(style.fontSize), weight: Number(style.fontWeight) }
  })
  assert.equal(titleStyle.size, 14, `the title is real 14px type: ${titleStyle.size}`)
  assert(titleStyle.weight >= 500, `the title is stronger than the metadata: ${titleStyle.weight}`)
  await card().screenshot({ path: new URL('recent-card.png', out).pathname, animations: 'disabled' })
  // 5. A taller declared card gives the entries air instead of a scrollbar.
  const tallHeights = await tall().locator('.dsh-recent-item').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))
  assert(tallHeights.length === 5 && tallHeights.every(height => height >= 55 && height <= 86), `the 10-row card caps entry height: ${tallHeights.join(', ')}`)
  await tall().screenshot({ path: new URL('recent-tall.png', out).pathname, animations: 'disabled' })
  checks.push('最近会话：无搜索/目录控件、五条、旧 8 列卡按声明收成 4 列、条目撑满高度且不滚动')

  // 6. Hover and focus are visible on the entry itself.
  await card().locator('.dsh-recent-item').first().hover()
  await page.waitForTimeout(250)
  const hoverPaint = await card().locator('.dsh-recent-item').first().evaluate(el => getComputedStyle(el).backgroundColor)
  assert.notEqual(hoverPaint, 'rgba(0, 0, 0, 0)', `a hovered entry has a surface: ${hoverPaint}`)
  // Focus must be reachable from the keyboard, so the ring is asserted after a Tab.
  await card().locator('.dsh-recent-item').first().focus()
  await page.keyboard.press('Tab')
  await page.waitForTimeout(150)
  const focused = await page.evaluate(() => {
    const el = document.activeElement
    return { cls: el?.className, outline: el === null ? '' : getComputedStyle(el).outlineStyle }
  })
  assert.equal(focused.cls, 'dsh-recent-item', `Tab moves between entries: ${focused.cls}`)
  assert.match(focused.outline, /solid|auto/u, `keyboard focus is visible: ${focused.outline}`)

  // 7. The gallery preview renders the same five-entry card, including a waiting state.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor()
  const tile = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:recent"]')
  await tile.scrollIntoViewIfNeeded()
  await tile.locator('.dsh-recent-item').first().waitFor({ timeout: 5000 })
  assert.equal(await tile.locator('.dsh-recent-item').count(), 3, 'the synthetic preview shows its three sessions')
  assert.equal(await tile.locator('.dsh-recent-state').count(), 1, 'a waiting session is named in place')
  assert.equal(await tile.locator('input, select').count(), 0, 'the preview has no controls either')
  await tile.screenshot({ path: new URL('recent-preview.png', out).pathname, animations: 'disabled' })
  await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
  checks.push('组件库预览：同一套两行条目，等待状态写成文字')

  // 8. Fewer sessions keep their height: two entries never balloon to fill the card, and
  // the footer still sits at the bottom instead of floating under the last row.
  for (const pattern of ['**/api/dsh-home/rpc', '**/plugins/dsh-home/api']) await page.unroute(pattern)
  await page.reload()
  await openHome()
  await card().locator('.dsh-recent-item').first().waitFor({ timeout: 5000 })
  const few = await card().locator('.dsh-recent-item').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))
  assert(few.length < 5, `the station has real sessions below the cap: ${few.length}`)
  assert(few.every(height => height <= 86), `a short list keeps its entries compact: ${few.join(', ')}`)
  const fewContent = await box(card().locator('.dsh-home-widget-content'))
  assert(fewContent.scrollHeight <= fewContent.height + 1, 'a short list does not overflow either')
  await card().screenshot({ path: new URL('recent-few.png', out).pathname, animations: 'disabled' })
  checks.push('只有两三条会话时条目不变形，卡片仍无滚动')

  assert.deepEqual(errors, [])
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
