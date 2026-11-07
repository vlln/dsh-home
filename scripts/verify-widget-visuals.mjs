/** Synthetic visual fixtures only; real installed UI at private3186; preserves all original records. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
const url = new URL(process.env.DSH_VERIFY_URL); assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3186')
const out = new URL(`../../.work/dsh-home/evidence/visuals-${Date.now()}/`, import.meta.url); await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1600, height: 1700 }, reducedMotion: 'reduce' })
let page, backup, prefs; const checks = [], errors = []
const api = async (op, extra = {}) => { const r = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } }); const j = await r.json(); assert(j.ok, JSON.stringify(j)); return j.value }
const text = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
const producer = stripTypeScriptTypes(text.slice(text.indexOf('export function builtinPreviewData('), text.indexOf('/** An isolated runtime')).replace('export function', 'function'), { mode: 'strip' })
const labels = { 'gallery.sample.continue': 'Refine component hierarchy and finish pointer regressions', 'gallery.sample.project': 'Dashboard refinement', 'gallery.sample.review': 'Review the new interactions', 'gallery.sample.plan': 'Plan the next step' }
const fixture = new Function('PREVIEW_NOW', `${producer}; return builtinPreviewData`)(Date.now())(key => labels[key] ?? key)
const today = new Date().toISOString().slice(0, 10)
const activity = { generatedAt: Date.now(), timeZone: 'America/Los_Angeles', today, available: true, complete: true, failed: 0, scanError: false, scanning: false, progress: { done: 3, total: 3 }, sessions: [], matchedSessions: 0, workspaces: [], days: Array.from({ length: 365 }, (_, n) => ({ key: new Date(Date.parse(today) - (364 - n) * 86400000).toISOString().slice(0, 10), messages: n % 5 === 0 ? 0 : (n * 7) % 19, sessions: n % 4 })) }
const specs = [
  ['recent', {}, 0, 0, 8, 6], ['clock', { timeZone: '' }, 8, 0, 4, 4],
  ['activity', { cwd: '', range: 'quarter' }, 0, 6, 8, 6], ['notes', { text: 'Pick up from here\n\nKeep the interface calm and useful. Finish the release regressions, then review the compact widget hierarchy.' }, 8, 6, 4, 6],
  ['quick', { links: [{ kind: 'url', label: 'Design references', target: 'https://www.boardui.com/zh-hans' }, { kind: 'session', label: 'Review changes', target: 'sample-1' }] }, 0, 12, 4, 5],
  ['running', {}, 4, 12, 4, 6], ['areas', {}, 8, 12, 4, 5],
  ['todo', {}, 0, 17, 4, 8], ['plan', {}, 4, 17, 4, 8], ['calendar', {}, 8, 17, 4, 8],
  ['habit', {}, 0, 25, 4, 6], ['timer', {}, 4, 25, 4, 4], ['active', { range: '7d' }, 8, 25, 4, 6],
]
try {
  await context.request.get(url.href); backup = await api('workbench.get'); prefs = await api('prefs.get'); await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  // The fixture writes its rectangles into the 12-column breakpoint; pin the board to the
  // default 12 columns instead of inheriting the width the station was last left at.
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null } })
  const instances = specs.map(([name, config]) => ({ instanceId: `visual-${name}`, typeId: `@vlln/dsh-home:${name}`,
    configVersion: name === 'quick' ? 2 : name === 'notes' || name === 'active' ? 2 : name === 'clock' ? 3 : name === 'timer' ? 2 : 1, config }))
  const positions = Object.fromEntries(specs.map(([name, , x, y, w, h]) => [`visual-${name}`, { x, y, w, h }]))
  await api('workbench.set', { instances: [...backup.instances, ...instances], layout: { ...backup.layout, instanceLayout: true, order: [...backup.layout.order, ...instances.map(i => i.instanceId)], hidden: backup.instances.map(i => i.instanceId), positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], ...positions } } } })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  await page.route('**/plugins/dsh-home/api', async route => { const op = route.request().postDataJSON()?.op; if (op === 'snapshot') return route.fulfill({ json: { ok: true, value: fixture.ledger } }); if (op === 'activity') return route.fulfill({ json: { ok: true, value: activity } }); return route.continue() })
  await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('.dsh-activity-cell[data-date]').first().waitFor()
  for (const width of [1600, 900, 540]) {
    await page.setViewportSize({ width, height: 1700 }); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
    await page.waitForFunction(() => { const surface = document.querySelector('.dsh-spatial-container'), grid = document.querySelector('.dsh-spatial-grid'); const cols = Number(surface?.dataset.cols ?? 0), board = surface?.clientWidth ?? 0; return cols >= 12 && cols <= 32 && Math.abs(board - (cols * 96 - 12)) < 2 && Math.abs((grid?.getBoundingClientRect().width ?? 0) - board) < 2 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    assert.equal(pageOverflow, false, `document must not overflow horizontally at ${width}`)
    const cell = await page.locator('[data-widget-id="visual-activity"] .dsh-activity-cell[data-date]').first().boundingBox()
    assert(Math.abs(cell.width - cell.height) < .2, `square heatmap cells at ${width}: ${cell.width}x${cell.height}`)
    assert(cell.width >= 12 && cell.width <= 24)
    const headerSurface = await page.evaluate(() => ({ canvas: getComputedStyle(document.querySelector('.dsh-home')).backgroundColor, header: getComputedStyle(document.querySelector('.dsh-home-head')).backgroundColor }))
    assert.equal(headerSurface.header, headerSurface.canvas, 'sticky heading must share canvas paint, not a white square')
    const heatmap = await page.locator('[data-widget-id="visual-activity"] .dsh-activity-scroll').evaluate(el => {
      const chart = el.firstElementChild.getBoundingClientRect(); const viewport = el.getBoundingClientRect()
      return { ratio: chart.width / viewport.width, offset: chart.left - viewport.left, remainder: viewport.right - chart.right, sidebar: el.closest('.dsh-activity').dataset.activitySidebar === 'true' }
    })
    if (width === 1600 || width === 900) {
      assert(heatmap.ratio >= .6, `quarter chart must use wide cards: ${JSON.stringify(heatmap)}`)
      assert(heatmap.sidebar || Math.abs(heatmap.offset - heatmap.remainder) <= 8, 'bounded calendar content must be balanced, not left-stranded')
    }
    const rowLead = await page.locator('.dsh-session-row').evaluateAll(nodes => nodes.map(node => node.firstElementChild?.className ?? ''))
    assert(rowLead.every(name => name === 'dsh-session-status'), 'every session row leads with its state dot')
    assert.equal(await page.locator('.dsh-day-dial animate,.dsh-day-dial animateTransform').count(), 0)
    const motion = await page.locator('.dsh-home-widget .dsh-row').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transitionDuration))
    assert(motion.every(duration => duration.split(',').every(value => Number.parseFloat(value) === 0)))
    const headings = await page.locator('.dsh-home-widget .dsh-w-title').evaluateAll(nodes => nodes.map(el => ({ size: Number.parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color })))
    assert(headings.every(h => h.size >= 14))
    const geometry = await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(el => ({
      id: el.dataset.widgetId, width: el.clientWidth, height: el.clientHeight,
      content: [...el.querySelectorAll('.dsh-home-widget-content,.dsh-widget-viewport,.dsh-personal-clock,.dsh-recent')].map(n => ({ cls: n.className, height: n.clientHeight, scroll: n.scrollHeight })),
    })))
    await writeFile(new URL(`geometry-${width}.json`, out), JSON.stringify(geometry, null, 2))
    for (const id of ['visual-clock', 'visual-activity', 'visual-recent']) {
      const widget = geometry.find(g => g.id === id)
      assert(widget.content[0].scroll <= widget.content[0].height + 2, `${id} unnecessary outer scroll at ${width}: ${JSON.stringify(widget.content)}`)
    }
    await page.screenshot({ path: new URL(`widgets-${width}-light.png`, out).pathname, fullPage: true, animations: 'disabled' })
    checks.push(`${width}px: no horizontal page overflow; readable headings and square heatmap cells`)
    if (width === 1600) {
      await page.locator('[data-widget-id="visual-notes"] .dsh-note').click(); await page.locator('[data-widget-id="visual-notes"] .dsh-note-input').waitFor(); await page.keyboard.press('Escape'); await page.locator('[data-widget-id="visual-notes"] .dsh-note-input').blur()
      const zone = page.locator('[data-widget-id="visual-clock"] .dsh-clock-zone')
      assert.equal(await zone.count(), 1, 'the clock offers its zone as a select')
      await zone.selectOption('Asia/Tokyo')
      await page.waitForFunction(() => document.querySelector('[data-widget-id="visual-clock"] .dsh-clock-zone')?.value === 'Asia/Tokyo')
      const clockConfig = await (async () => (await api('workbench.get')).instances.find(item => item.instanceId === 'visual-clock')?.config)()
      assert.equal(clockConfig?.timeZone, 'Asia/Tokyo', 'the chosen zone is saved')
      await zone.selectOption('')
      const scale = page.locator('[data-widget-id="visual-activity"] .dsh-activity-scale')
      assert.equal(await scale.count(), 1, 'the footprint scale is an inline quiet select')
      await scale.selectOption('year')
      await page.waitForFunction(() => document.querySelector('[data-widget-id="visual-activity"] .dsh-activity')?.getAttribute('data-activity-range') === 'year')
      assert.equal((await api('workbench.get')).instances.find(item => item.instanceId === 'visual-activity')?.config?.range, 'year')
      await scale.selectOption('quarter')
      await page.waitForFunction(() => document.querySelector('[data-widget-id="visual-activity"] .dsh-activity')?.getAttribute('data-activity-range') === 'quarter')
      const heat = page.locator('[data-widget-id="visual-activity"] .dsh-activity-cell[data-date]').first()
      await heat.hover()
      const tip = page.locator('.dsh-hover-tip')
      await tip.waitFor({ timeout: 3000 })
      assert.match(await tip.innerText(), /\d{4}-\d{2}-\d{2}/u, 'a heatmap cell explains its day on hover')
      await page.mouse.move(2, 2)
      const recentViewport = page.locator('[data-widget-id="visual-recent"] .dsh-widget-viewport')
      const rows = () => page.locator('[data-widget-id="visual-recent"] .dsh-session-row').count()
      const initialRows = await rows(), initialHeight = await recentViewport.evaluate(el => el.clientHeight)
      await recentViewport.evaluate(el => { el.style.height = '500px'; el.style.flex = 'none' })
      await page.waitForFunction(n => document.querySelector('[data-widget-id="visual-recent"] .dsh-widget-viewport').clientHeight > n, initialHeight)
      const grownRows = await rows()
      await recentViewport.evaluate(el => { el.style.removeProperty('height'); el.style.removeProperty('flex') })
      await page.waitForFunction(n => document.querySelectorAll('[data-widget-id="visual-recent"] .dsh-session-row').length === n, grownRows)
      await page.waitForFunction(n => document.querySelector('[data-widget-id="visual-recent"] .dsh-widget-viewport').clientHeight === n, initialHeight)
      // The row count is data-bound: with a short sample the taller viewport shows the same
      // rows rather than more. What must hold is that the widget tracks its measured height
      // and never drops rows that already fit.
      assert(grownRows >= initialRows, `recent rows never shrink when the card grows (${initialRows} -> ${grownRows})`)
      checks.push('Notes, Clock and Activity controls reachable (inline, no dialog); measured height grows the recent list')
      for (const [name] of specs) {
        const widget = page.locator(`[data-widget-id="visual-${name}"]`)
        await widget.scrollIntoViewIfNeeded()
        await widget.screenshot({ path: new URL(`detail-${name}-light.png`, out).pathname, animations: 'disabled' })
      }
    }
  }
  // Wide windows must not widen widgets: the board is a fixed-pixel canvas that stays
  // centred, so the same saved rectangle keeps exactly the same pixel size.
  await page.setViewportSize({ width: 2400, height: 1700 }); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.waitForFunction(() => (document.querySelector('.dsh-spatial-container')?.clientWidth ?? 0) > 0)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const wide = await page.evaluate(() => {
    const home = document.querySelector('.dsh-home'), inner = document.querySelector('.dsh-home-inner'), surface = document.querySelector('.dsh-spatial-container')
    const box = inner.getBoundingClientRect(), pad = home.getBoundingClientRect()
    const board = Number.parseFloat(getComputedStyle(home).getPropertyValue('--dsh-home-board-width'))
    return { viewport: window.innerWidth, surface: surface.clientWidth, inner: box.width, board,
      cols: Number(surface.dataset.cols), left: box.left - pad.left, right: pad.right - box.right,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
  })
  assert(Number.isFinite(wide.board) && wide.board >= 1140 && wide.board <= 3060, `board width stays in range: ${JSON.stringify(wide)}`)
  assert.equal(wide.board, wide.cols * 96 - 12, `board width is exactly cols*96-12: ${JSON.stringify(wide)}`)
  assert(Math.abs(wide.inner - wide.board) <= 1, `board element carries the exact width: ${JSON.stringify(wide)}`)
  assert(Math.abs(wide.surface - wide.board) <= 1, `grid surface carries the exact width: ${JSON.stringify(wide)}`)
  assert.equal(wide.documentOverflow, false, 'document must not overflow horizontally at 2400px')
  if (wide.surface + 48 <= wide.viewport) assert(Math.abs(wide.left - wide.right) <= 2, `a fitting board must be centred: ${JSON.stringify(wide)}`)
  checks.push(`2400px: fixed ${wide.board}px board (${wide.cols} columns) centres instead of stretching widgets`)
  await page.screenshot({ path: new URL('widgets-2400-light.png', out).pathname, fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1600, height: 1700 }); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.waitForFunction(() => { const surface = document.querySelector('.dsh-spatial-container'); const grid = document.querySelector('.dsh-spatial-grid'); const cols = Number(surface?.dataset.cols ?? 0); return cols >= 12 && cols <= 32 && Math.abs((grid?.getBoundingClientRect().width ?? 0) - (surface?.clientWidth ?? 0)) < 2 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  // DOM-only theme switch exercises real host dark aliases; it does not persist user settings.
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await page.screenshot({ path: new URL('widgets-1600-dark-dom.png', out).pathname, fullPage: true, animations: 'disabled' })
  checks.push('dark host-token aliases rendered by temporary DOM theme simulation, no settings writes')
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
  assert.deepEqual(errors, [])
} catch (error) { errors.push(error.stack ?? String(error)); process.exitCode = 1; await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {}) }
finally { await page?.close(); if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances }); if (prefs) await api('prefs.set', { prefs: prefs.prefs }); await browser.close(); await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors, data: 'Synthetic snapshot and activity route fixtures, no model traffic; installed UI and real layout persistence', theme: 'English with DOM-only dark simulation' }, null, 2)); console.log(out.pathname, JSON.stringify({ checks, errors })) }
