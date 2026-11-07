/** 视觉标准的浏览器验收：真实安装 UI + 合成数据，专门盯「卡片里不该有的滚动条」与配色统一。
 * 私有站 3186，结束后恢复原布局。 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
const url = new URL(process.env.DSH_VERIFY_URL); assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3186')
const out = new URL(`../../.work/dsh-home/evidence/design-${Date.now()}/`, import.meta.url); await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, reducedMotion: 'reduce' })
let page, backup, prefs; const checks = [], errors = []
const api = async (op, extra = {}) => { const r = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } }); const j = await r.json(); assert(j.ok, JSON.stringify(j)); return j.value }
const text = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
const producer = stripTypeScriptTypes(text.slice(text.indexOf('export function builtinPreviewData('), text.indexOf('/** An isolated runtime')).replace('export function', 'function'), { mode: 'strip' })
const labels = { 'gallery.sample.continue': 'Refine the palette standard', 'gallery.sample.project': 'Home redesign', 'gallery.sample.review': 'Review the widgets', 'gallery.sample.plan': 'Plan the next step' }
const fixture = new Function('PREVIEW_NOW', `${producer}; return builtinPreviewData`)(Date.now())(key => labels[key] ?? key)
// Twelve sessions across six workspaces: enough capsules to see whether they stay one colour.
const cwds = ['DshPlugins', 'Workbench', 'Skills', 'pdf-figures-skill', 'repro-decision', 'alpha']
const base = Date.parse(fixture.ledger.days.at(-1).key)
fixture.ledger.days = Array.from({ length: 30 }, (_, i) => ({
  ...fixture.ledger.days[i % fixture.ledger.days.length],
  key: new Date(base - (29 - i) * 86_400_000).toISOString().slice(0, 10),
  activeMs: ((i * 37) % 9) * 900_000, sessions: i % 3,
}))
fixture.ledger.sessions = Array.from({ length: 12 }, (_, i) => ({
  ...fixture.ledger.sessions[i % fixture.ledger.sessions.length], id: `sample-${i}`, cwd: cwds[i % cwds.length],
  lastAt: Date.now() - i * 600_000, title: `${labels['gallery.sample.project']} ${i + 1}`,
}))
if (process.env.DSH_DEBUG) console.log('fixture sessions', fixture.ledger.sessions.length, fixture.ledger.sessions.slice(0, 3).map(s => s.id))
const today = new Date().toISOString().slice(0, 10)
const activity = { generatedAt: Date.now(), timeZone: 'America/Los_Angeles', today, available: true, complete: true, failed: 0, scanError: false, scanning: false, progress: { done: 3, total: 3 }, sessions: [], matchedSessions: 0, workspaces: [], days: Array.from({ length: 365 }, (_, n) => ({ key: new Date(Date.parse(today) - (364 - n) * 86400000).toISOString().slice(0, 10), messages: n % 5 === 0 ? 0 : (n * 7) % 19, sessions: n % 4 })) }
// The sizes the real board uses: a 4-column column of digest cards, plus notes and timer.
const specs = [
  ['recent', {}, 0, 0, 4, 6], ['pinned', {}, 0, 6, 4, 8], ['running', { status: null }, 0, 14, 4, 6],
  ['activity', { range: 'auto' }, 4, 0, 4, 6], ['notes', { text: 'Palette standard\n\nOne accent, one capsule.' }, 4, 6, 4, 6],
  ['timer', {}, 4, 12, 4, 5], ['clock', { timeZone: '' }, 4, 17, 4, 4],
  ['areas', {}, 8, 0, 4, 5], ['rhythm', {}, 8, 5, 4, 4], ['usage', { week: true }, 8, 9, 4, 6],
  ['active', { range: '7d' }, 8, 15, 4, 4], ['today', {}, 0, 19, 8, 4], ['habit', { showAll: false }, 8, 19, 4, 4],
]
try {
  await context.request.get(url.href); backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null } })
  const versions = { active: 3, activity: 2 }
  const instances = specs.map(([name, config]) => ({ instanceId: `std-${name}`, typeId: `@vlln/dsh-home:${name}`, configVersion: versions[name] ?? 1, config }))
  const positions = Object.fromEntries(specs.map(([name, , x, y, w, h]) => [`std-${name}`, { x, y, w, h }]))
  await api('workbench.set', { instances: [...backup.instances, ...instances], layout: { ...backup.layout, instanceLayout: true, order: [...backup.layout.order, ...instances.map(i => i.instanceId)], hidden: backup.instances.map(i => i.instanceId), positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], ...positions } } } })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/dsh-home/rpc', async route => { const op = route.request().postDataJSON()?.op; if (op === 'snapshot') return route.fulfill({ json: { ok: true, value: fixture.ledger } }); if (op === 'activity') return route.fulfill({ json: { ok: true, value: activity } }); return route.continue() })
  await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('[data-widget-id="std-activity"] .dsh-activity-cell[data-date]').first().waitFor()
  await page.waitForTimeout(600)
  for (const width of [1600, 1200, 900]) {
    await page.setViewportSize({ width, height: 1400 })
    await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
    await page.waitForFunction(() => { const s = document.querySelector('.dsh-spatial-container'); const cols = Number(s?.dataset.cols ?? 0); return cols >= 12 && cols <= 32 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `no page overflow at ${width}`)
    // Every card: content, list and chart must fit without a scrollbar.
    const boxes = await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(el => {
      const pick = sel => { const n = el.querySelector(sel); return n === null ? null : { h: n.clientHeight, sh: n.scrollHeight, w: n.clientWidth, sw: n.scrollWidth } }
      return { id: el.dataset.widgetId, content: pick('.dsh-home-widget-content'), rows: pick('.dsh-rows'), chart: pick('.dsh-activity-scroll') }
    }))
    for (const box of boxes) {
      for (const [part, size] of Object.entries({ content: box.content, rows: box.rows, chart: box.chart })) {
        if (size === null) continue
        assert(size.sh <= size.h + 1, `${box.id} ${part} shows a vertical scrollbar: ${JSON.stringify(size)}`)
        assert(size.sw <= size.w + 1, `${box.id} ${part} shows a horizontal scrollbar: ${JSON.stringify(size)}`)
      }
    }
    const rowCount = await page.locator('[data-widget-id="std-recent"] .dsh-session-row').count()
    assert(rowCount >= 3, `recent shows a useful number of rows: ${rowCount}`)
    assert.equal(await page.locator('[data-widget-id="std-recent"] .dsh-recent-footer button').count(), 0, 'recent has no pager button')
    const footer = await page.locator('[data-widget-id="std-recent"] .dsh-recent-footer').innerText()
    assert.match(footer, /\d+\s*(\/|of)\s*\d+/u, `recent states the real total: ${footer}`)
    // Every card carries its glyph: a missing icon made headings look truncated.
    const cards = await page.locator('.dsh-home-widget').count()
    assert.equal(await page.locator('.dsh-home-widget .dsh-widget-symbol').count(), cards, 'every card has a heading icon')
    // The wide day dial and the token ring must be readable, and the bars must not be dots.
    const dial = await page.locator('[data-widget-id="std-today"] .dsh-day-dial').boundingBox()
    assert(dial !== null && dial.width >= 80, `the day dial grows with a wide card: ${dial?.width}`)
    const donut = await page.locator('[data-widget-id="std-usage"] .dsh-usage-donut').boundingBox()
    assert(donut !== null && donut.width >= 48, `the token ring is readable: ${donut?.width}`)
    const barRatio = await page.locator('[data-widget-id="std-usage"] .dsh-usage-col').first().evaluate(el => {
      const bar = el.querySelector('.dsh-usage-bar').getBoundingClientRect(), col = el.getBoundingClientRect()
      return bar.width / col.width
    })
    assert(barRatio >= 0.5, `usage bars fill their column instead of leaving a chasm: ${barRatio}`)
    // Every usage bar and the token ring explain themselves on hover.
    const usageCol = page.locator('[data-widget-id="std-usage"] .dsh-usage-col').nth(2)
    await usageCol.hover()
    const hoverTip = page.locator('.dsh-hover-tip')
    await hoverTip.waitFor({ timeout: 3000 })
    assert.match(await hoverTip.innerText(), /\d{2}-\d{2}/u, 'a usage bar names its day')
    // The ring is keyboard reachable too: focus lists every part.
    await page.locator('[data-widget-id="std-usage"] .dsh-usage-donut').focus()
    await page.waitForTimeout(200)
    assert.match(await hoverTip.innerText(), /(输入|缓存|输出|in|cache|out|write)/iu, 'the token ring names the hovered segment')
    await page.mouse.move(2, 2)
    const pills = await page.locator('.dsh-ws-pill').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor))
    assert(pills.length >= 6, `capsules are present: ${pills.length}`)
    assert.equal(new Set(pills).size, 1, `every capsule shares one fill: ${[...new Set(pills)].join(', ')}`)
    const activityText = await page.locator('[data-widget-id="std-activity"]').innerText()
    assert.doesNotMatch(activityText, /时区|Time zone|空格不代表|not confirmed inactivity/u, 'the activity card carries no zone or legend prose')
    // A single accent: bars in three different cards resolve to the same paint.
    const bars = await page.evaluate(() => ['std-areas', 'std-rhythm', 'std-usage'].map(id => {
      const node = document.querySelector(`[data-widget-id="${id}"] .dsh-area-track > span, [data-widget-id="${id}"] .dsh-rhythm-bar, [data-widget-id="${id}"] .dsh-usage-bar`)
      return node === null ? null : getComputedStyle(node).backgroundColor
    }))
    const accent = await page.evaluate(() => getComputedStyle(document.querySelector('.dsh-home')).getPropertyValue('--dsh-accent').trim())
    assert(bars.filter(Boolean).length >= 2, `bar charts render: ${bars}`)
    for (const paint of bars.filter(Boolean)) assert.match(paint, /^rgba?\(65, 118, 230/, `bars use the one accent (${accent}): ${paint}`)
    const primary = await page.evaluate(() => getComputedStyle(document.querySelector('.dsh-home')).getPropertyValue('--dsw-alias-button-primary-fill').trim())
    const start = await page.locator('[data-widget-id="std-timer"] .dsh-timer-primary').evaluate(el => getComputedStyle(el).backgroundColor)
    assert.equal(start, 'rgb(15, 17, 21)', `Start shares the host primary action paint (${primary}): ${start}`)
    await page.screenshot({ path: new URL(`board-${width}.png`, out).pathname, fullPage: true, animations: 'disabled' })
    checks.push(`${width}px: no card scrollbar, one capsule fill, one accent, host-primary actions`)
  }
  // A year on a 4-column card must shrink to dots instead of scrolling sideways.
  const scale = page.locator('[data-widget-id="std-activity"] .dsh-activity-scale')
  await scale.selectOption('year')
  await page.waitForFunction(() => document.querySelector('[data-widget-id="std-activity"] .dsh-activity')?.getAttribute('data-activity-range') === 'year')
  await page.waitForTimeout(300)
  const yearBox = await page.locator('[data-widget-id="std-activity"] .dsh-activity-scroll').evaluate(el => ({ w: el.clientWidth, sw: el.scrollWidth, h: el.clientHeight, sh: el.scrollHeight }))
  assert(yearBox.sw <= yearBox.w + 1 && yearBox.sh <= yearBox.h + 1, `a year fits the card without scrollbars: ${JSON.stringify(yearBox)}`)
  const yearCell = await page.locator('[data-widget-id="std-activity"] .dsh-activity-cell[data-date]').first().boundingBox()
  assert(yearCell.width <= 8 && Math.abs(yearCell.width - yearCell.height) < 0.6, `year cells shrink to dots: ${yearCell.width}`)
  await page.screenshot({ path: new URL('board-activity-year.png', out).pathname, fullPage: true, animations: 'disabled' })
  await scale.selectOption('auto')
  // Recent activity: three windows, no 2-day, 30 days keeps the card intact.
  const activeCard = page.locator('[data-widget-id="std-active"]')
  assert.equal(await activeCard.locator('.dsh-active-range').count(), 3, 'three windows')
  assert.equal(await activeCard.getByRole('button', { name: /2 (days|天)/u }).count(), 0, 'the 2-day window is gone')
  await activeCard.getByRole('button', { name: /30 (days|天)/u }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="std-active"] .dsh-active')?.getAttribute('data-range') === '30d')
  assert.equal(await activeCard.locator('.dsh-active-col').count(), 30, 'thirty bars')
  const activeBox = await activeCard.locator('.dsh-home-widget-content').evaluate(el => ({ h: el.clientHeight, sh: el.scrollHeight, w: el.clientWidth, sw: el.scrollWidth }))
  assert(activeBox.sh <= activeBox.h + 1 && activeBox.sw <= activeBox.w + 1, `30 days fit the card: ${JSON.stringify(activeBox)}`)
  checks.push('a year of footprints and 30 days of activity fit without scrollbars')
  // Leaving the panel and coming back must reload the shared planner/focus documents.
  await page.getByRole('button', { name: /^(Back to conversation|返回会话)$/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('[data-widget-id="std-activity"] .dsh-activity-cell[data-date]').first().waitFor()
  await page.waitForTimeout(800)
  const habitText = await page.locator('[data-widget-id="std-habit"]').innerText()
  assert.doesNotMatch(habitText, /加载中|Loading/u, `the habit card reloads after returning: ${habitText}`)
  assert.equal(await page.locator('[data-widget-id="std-timer"] .dsh-timer-primary').isDisabled(), false, 'the timer is writable again after returning')
  checks.push('leaving the panel and returning reloads planner and focus data')
  // Clicking a day keeps the card the same height and returns to the calendar.
  const card = page.locator('[data-widget-id="std-activity"]')
  const before = await card.evaluate(el => el.clientHeight)
  await card.locator('.dsh-activity-cell[data-date]').last().click()
  await card.locator('.dsh-activity-detail').waitFor()
  assert.equal(await card.evaluate(el => el.clientHeight), before, 'opening a day does not grow the card')
  await card.locator('.dsh-activity-back').click()
  await card.locator('.dsh-activity-cell[data-date]').first().waitFor()
  checks.push('day detail replaces the calendar in place and returns to it')
  assert.deepEqual(errors, [])
} catch (error) { errors.push(error.stack ?? String(error)); process.exitCode = 1; await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {}) }
finally { await page?.close(); if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances }); if (prefs) await api('prefs.set', { prefs: prefs.prefs }); await browser.close(); await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors, data: 'Synthetic snapshot and activity fixtures', theme: 'installed UI, English' }, null, 2)); console.log(out.pathname, JSON.stringify({ checks, errors })) }
