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
  ['recent', {}, 0, 0, 8, 6], ['clock', { label: 'Local time', timeZone: '', hour12: false }, 8, 0, 4, 6],
  ['activity', { cwd: '', range: 'quarter' }, 0, 6, 8, 6], ['notes', { title: 'Pick up from here', text: 'Keep the interface calm and useful.\n\nFinish the release regressions, then review the compact widget hierarchy. No automatic task submission.' }, 8, 6, 4, 6],
  ['quick', { links: [{ kind: 'url', label: 'Design references', target: 'https://www.boardui.com/zh-hans' }, { kind: 'session', label: 'Review changes', target: 'sample-1' }] }, 0, 12, 4, 5], ['queue', {}, 4, 12, 4, 5], ['today', {}, 8, 12, 4, 5],
  ['tasks', {}, 0, 17, 4, 8], ['resume', {}, 4, 17, 8, 5], ['running', {}, 4, 22, 4, 4], ['areas', {}, 8, 22, 4, 4], ['rhythm', {}, 0, 22, 4, 4],
]
try {
  await context.request.get(url.href); backup = await api('workbench.get'); prefs = await api('prefs.get'); await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  const instances = specs.map(([name, config]) => ({ instanceId: `visual-${name}`, typeId: `@vlln/dsh-home:${name}`, configVersion: name === 'quick' ? 2 : 1, config }))
  const positions = Object.fromEntries(specs.map(([name, , x, y, w, h]) => [`visual-${name}`, { x, y, w, h }]))
  await api('workbench.set', { instances: [...backup.instances, ...instances], layout: { ...backup.layout, instanceLayout: true, order: [...backup.layout.order, ...instances.map(i => i.instanceId)], hidden: backup.instances.map(i => i.instanceId), positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], ...positions } } } })
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  await page.route('**/plugins/dsh-home/api', async route => { const op = route.request().postDataJSON()?.op; if (op === 'snapshot') return route.fulfill({ json: { ok: true, value: fixture.ledger } }); if (op === 'activity') return route.fulfill({ json: { ok: true, value: activity } }); return route.continue() })
  await page.goto(url.href); await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('.dsh-activity-cell[data-date]').first().waitFor()
  for (const width of [1600, 900, 540]) {
    await page.setViewportSize({ width, height: 1700 }); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
    await page.waitForFunction(() => { const el = document.querySelector('.dsh-home'); const surface = document.querySelector('.dsh-spatial-container'); const w = surface?.clientWidth ?? 0; return el && el.scrollWidth <= el.clientWidth + 1 && surface?.dataset.cols === String(w >= 950 ? 12 : w >= 580 ? 6 : 2) })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const cell = await page.locator('[data-widget-id="visual-activity"] .dsh-activity-cell[data-date]').first().boundingBox()
    assert(Math.abs(cell.width - cell.height) < .2, `square heatmap cells at ${width}: ${cell.width}x${cell.height}`)
    assert(cell.width >= 12 && cell.width <= 16)
    const headings = await page.locator('.dsh-home-widget .dsh-w-title').evaluateAll(nodes => nodes.map(el => ({ size: Number.parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color })))
    assert(headings.every(h => h.size >= 14))
    const geometry = await page.locator('.dsh-home-widget').evaluateAll(nodes => nodes.map(el => ({
      id: el.dataset.widgetId, width: el.clientWidth, height: el.clientHeight,
      content: [...el.querySelectorAll('.dsh-home-widget-content,.dsh-widget-viewport,.dsh-personal-clock,.dsh-recent')].map(n => ({ cls: n.className, height: n.clientHeight, scroll: n.scrollHeight })),
    })))
    await writeFile(new URL(`geometry-${width}.json`, out), JSON.stringify(geometry, null, 2))
    for (const id of ['visual-today', 'visual-clock', 'visual-activity', 'visual-rhythm']) {
      const widget = geometry.find(g => g.id === id)
      assert(widget.content[0].scroll <= widget.content[0].height + 2, `${id} unnecessary outer scroll at ${width}: ${JSON.stringify(widget.content)}`)
    }
    await page.screenshot({ path: new URL(`widgets-${width}-light.png`, out).pathname, fullPage: true, animations: 'disabled' })
    checks.push(`${width}px: no horizontal page overflow; readable headings and square heatmap cells`)
    if (width === 1600) {
      await page.locator('[data-widget-id="visual-notes"]').getByRole('button', { name: /^(Edit note|编辑便笺)$/ }).click(); await page.locator('.dsh-widget-config-modal').waitFor(); await page.keyboard.press('Escape')
      const clockButton = page.locator('[data-widget-id="visual-clock"]').getByRole('button', { name: /^(Time options|时间选项)$/ }); await clockButton.click(); await page.locator('.dsh-widget-config-modal').waitFor(); await page.keyboard.press('Escape')
      const footprintButton = page.locator('[data-widget-id="visual-activity"]').getByRole('button', { name: /^(Filter range|筛选范围)$/ }); await footprintButton.click(); await page.locator('.dsh-widget-config-modal').waitFor(); await page.keyboard.press('Escape')
      const recentViewport = page.locator('[data-widget-id="visual-recent"] .dsh-widget-viewport')
      const initialRows = await page.locator('[data-widget-id="visual-recent"] .dsh-recent-row').count()
      await recentViewport.evaluate(el => { el.style.height = '500px'; el.style.flex = 'none' })
      await page.waitForFunction(n => document.querySelectorAll('[data-widget-id="visual-recent"] .dsh-recent-row').length > n, initialRows)
      await recentViewport.evaluate(el => { el.style.removeProperty('height'); el.style.removeProperty('flex') })
      await page.waitForFunction(n => document.querySelectorAll('[data-widget-id="visual-recent"] .dsh-recent-row').length === n, initialRows)
      checks.push('Notes, Clock and Activity editors reachable; measured height increases recent session capacity')
      for (const [name] of specs) {
        const widget = page.locator(`[data-widget-id="visual-${name}"]`)
        await widget.scrollIntoViewIfNeeded()
        await widget.screenshot({ path: new URL(`detail-${name}-light.png`, out).pathname, animations: 'disabled' })
      }
    }
  }
  await page.setViewportSize({ width: 1600, height: 1700 }); await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.waitForFunction(() => { const surface = document.querySelector('.dsh-spatial-container'); const grid = document.querySelector('.dsh-spatial-grid'); return surface?.dataset.cols === '12' && Math.abs((grid?.getBoundingClientRect().width ?? 0) - (surface?.clientWidth ?? 0)) < 2 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  // DOM-only theme switch exercises real host dark aliases; it does not persist user settings.
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await page.screenshot({ path: new URL('widgets-1600-dark-dom.png', out).pathname, fullPage: true, animations: 'disabled' })
  checks.push('dark host-token aliases rendered by temporary DOM theme simulation, no settings writes')
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
  assert.deepEqual(errors, [])
} catch (error) { errors.push(error.stack ?? String(error)); process.exitCode = 1; await page?.screenshot({ path: new URL('failure.png', out).pathname, fullPage: true }).catch(() => {}) }
finally { await page?.close(); if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances }); if (prefs) await api('prefs.set', { prefs: prefs.prefs }); await browser.close(); await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors, data: 'Synthetic snapshot and activity route fixtures, no model traffic; installed UI and real layout persistence', theme: 'English with DOM-only dark simulation' }, null, 2)); console.log(out.pathname, JSON.stringify({ checks, errors })) }
