/** Design regressions for the session rows, the merged session-status card, the active
 * chart, the areas list, inline notes, the timer and the gallery previews.
 * Private station only; instances and preferences are restored in `finally`. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/session-rows-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const seeded = [
  { instanceId: 'active-demo', typeId: '@vlln/dsh-home:active', configVersion: 2, config: { range: '7d' }, rect: { x: 0, y: 0, w: 8, h: 4 } },
  { instanceId: 'status-demo', typeId: '@vlln/dsh-home:running', configVersion: 1, config: {}, rect: { x: 8, y: 0, w: 4, h: 6 } },
  { instanceId: 'areas-demo', typeId: '@vlln/dsh-home:areas', configVersion: 1, config: {}, rect: { x: 0, y: 4, w: 4, h: 4 } },
  { instanceId: 'notes-demo', typeId: '@vlln/dsh-home:notes', configVersion: 2, config: { text: '验证便笺\n\n第一行是标题，下面写正文。' }, rect: { x: 4, y: 4, w: 4, h: 6 } },
  { instanceId: 'timer-demo', typeId: '@vlln/dsh-home:timer', configVersion: 1, config: { label: '写文档' }, rect: { x: 8, y: 6, w: 4, h: 4 } },
]
const ids = seeded.map(item => item.instanceId)
// A synthetic ledger keeps the chart, the areas list and the tooltip deterministic: the
// station's real "today" empties out at midnight, which is not what this suite is about.
const source = await readFile(new URL('../src/client/builtin-registration.tsx', import.meta.url), 'utf8')
const producer = stripTypeScriptTypes(source.slice(source.indexOf('export function builtinPreviewData('), source.indexOf('/** An isolated runtime')).replace('export function', 'function'), { mode: 'strip' })
const ledger = new Function('PREVIEW_NOW', `${producer}; return builtinPreviewData`)(Date.now())(key => key).ledger
// Force one idle day inside the default 7-day window: its column must stay untinted.
ledger.days[10] = { ...ledger.days[10], activeMs: 0, runMs: 0, turns: 0, sessions: 0 }
const active = () => page.locator('[data-widget-id="active-demo"]')
const status = () => page.locator('[data-widget-id="status-demo"]')
const notes = () => page.locator('[data-widget-id="notes-demo"]')
const timer = () => page.locator('[data-widget-id="timer-demo"]')
const areas = () => page.locator('[data-widget-id="areas-demo"]')
const configOf = async instanceId => (await api('workbench.get')).instances.find(item => item.instanceId === instanceId)?.config ?? null
const waitCount = (selector, count) => page.waitForFunction(({ selector, count }) => document.querySelectorAll(selector).length === count, { selector, count }, { timeout: 5000 })
const openHome = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('[data-widget-id="active-demo"]').waitFor()
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('focus.apply', { operation: { op: 'timer.clear', instanceId: 'timer-demo' } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !ids.includes(item.instanceId)), ...seeded.map(({ rect, ...item }) => item)],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: [...backup.layout.order.filter(id => !ids.includes(id)), ...ids],
      positions: { ...backup.layout.positions, 12: { ...backup.layout.positions?.[12], ...Object.fromEntries(seeded.map(item => [item.instanceId, item.rect])) } } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  // The client prefers the fenced connection route; the legacy path stays as a fallback.
  for (const pattern of ['**/api/dsh-home/rpc', '**/plugins/dsh-home/api']) {
    await page.route(pattern, route => route.request().postDataJSON()?.op === 'snapshot'
      ? route.fulfill({ json: { ok: true, value: ledger } }) : route.continue())
  }
  await page.goto(url.href)
  await openHome()
  await active().locator('.dsh-active-range').first().waitFor({ timeout: 5000 })
  await status().locator('.dsh-status-chip').first().waitFor({ timeout: 5000 })
  await areas().locator('.dsh-area-rows .dsh-ws-pill').first().waitFor({ timeout: 5000 })

  // 1. Recent activity: three windows, no retired "today", no footer, no outer scroll.
  assert.equal(await active().locator('.dsh-active-range').count(), 3, 'three window chips')
  const rangeLabels = await active().locator('.dsh-active-range').allTextContents()
  assert.equal(rangeLabels.includes('Today') || rangeLabels.includes('今天'), false, 'the Today window is gone')
  assert.equal(await active().locator('.dsh-active-bar').count(), 7, 'the default window is 7 days')
  await active().getByRole('button', { name: /^(14 days|14 天)$/ }).click()
  for (let attempt = 0; attempt < 60 && (await configOf('active-demo'))?.range !== '14d'; attempt++) await page.waitForTimeout(50)
  assert.equal((await configOf('active-demo'))?.range, '14d', 'the chosen window is saved on the instance')
  await waitCount('[data-widget-id="active-demo"] .dsh-active-bar', 14)
  assert.equal(await active().locator('.dsh-active-foot').count(), 0, 'the footer with active days and peak is gone')
  const activeBox = await active().locator('.dsh-home-widget-content').evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight }))
  assert(activeBox.scroll <= activeBox.client + 1, `the chart fits its card: ${JSON.stringify(activeBox)}`)
  // Hovering a bar explains that day.
  const lastBar = active().locator('.dsh-active-col').last()
  await lastBar.hover()
  const bubble = page.locator('[role="tooltip"]:visible').last()
  await bubble.waitFor({ timeout: 3000 })
  const tip = (await bubble.innerText()).trim()
  assert.match(tip, /\d{2}-\d{2}/u, `the tooltip names the day: ${tip}`)
  assert.match(tip, /(\d+\s*(min|分钟|h|小时))|less than a minute|不到一分钟/u, `the tooltip shows the duration: ${tip}`)
  await page.screenshot({ path: new URL('active.png', out).pathname, animations: 'disabled' })
  checks.push('最近活跃：三个窗口、无今天、无页脚、悬停柱子给出当天日期与时长')

  // 2. Areas: a workspace capsule instead of a letter tile, and no horizontal scrollbar.
  const areasText = await areas().innerText()
  const areaPill = areas().locator('.dsh-ws-pill').first()
  assert.equal(await areaPill.count(), 1, 'the workspace is a capsule')
  assert.equal(await page.locator('.dsh-directory-badge').count(), 0, 'the oversized initial badge is gone everywhere')
  assert.equal(await areas().locator('.dsh-row-title').count(), 0, 'the name is not repeated next to the capsule')
  const pillLook = await areaPill.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, text: el.textContent }))
  assert.notEqual(pillLook.bg, 'rgba(0, 0, 0, 0)', `the capsule has a fill (${pillLook.bg})`)
  assert.equal(pillLook.color, 'rgb(255, 255, 255)', 'capsule text is white on the saturated fill')
  const areaBox = await areas().locator('.dsh-home-widget-content').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }))
  assert(areaBox.scroll <= areaBox.client + 1, `no horizontal overflow in the areas card: ${JSON.stringify(areaBox)} (${areasText})`)
  checks.push('今天按工作区：工作区胶囊，无首字母大字，卡片内无横向滚动条')

  // 3. Session status: three views, counts, saved choice, no loading state.
  const chips = status().locator('.dsh-status-chip')
  assert.equal(await chips.count(), 3, 'running / waiting / unread')
  for (const name of ['Running', 'Waiting', 'Unread']) {
    assert.equal(await status().locator('.dsh-status-chip', { hasText: name }).count(), 1, `chip ${name}`)
  }
  assert.equal(await status().locator('.dsh-planner-loading, [aria-busy="true"]').count(), 0, 'the card never sits on a loading line')
  await status().getByRole('button', { name: /(Waiting|在等你)/ }).click()
  for (let attempt = 0; attempt < 60 && (await configOf('status-demo'))?.status !== 'waiting'; attempt++) await page.waitForTimeout(50)
  assert.equal((await configOf('status-demo'))?.status, 'waiting', 'the chosen view is saved on the instance')
  // The saved config can land before React repaints; the selected chip is the visible truth.
  await page.waitForFunction(() => document.querySelector('[data-widget-id="status-demo"] .dsh-status-chip[data-active="true"]')
    ?.getAttribute('data-group') === 'waiting', undefined, { timeout: 5000 })
  assert.match(await status().locator('.dsh-status-empty').innerText(), /(Nothing is waiting|没有在等你)/u, 'an empty view says what is empty')
  await page.reload()
  await openHome()
  assert.equal(await status().locator('.dsh-status-chip[data-active="true"]').getAttribute('data-group'), 'waiting', 'the view survives a reload')
  checks.push('会话状态：三个视图带计数、切换即保存、刷新保留、空态明确')

  // 4. Session rows in the gallery: dot first, workspace capsule, plain title, time.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor()
  for (const retired of ['today', 'rhythm', 'tasks', 'resume', 'queue']) {
    assert.equal(await page.locator(`.dsh-directory-item[data-widget-type="@vlln/dsh-home:${retired}"]`).count(), 0, `${retired} is not offered`)
  }
  assert.equal(await page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:running"]').count(), 1, 'session status is offered')
  const recent = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:recent"]')
  await recent.scrollIntoViewIfNeeded()
  const rows = recent.locator('.dsh-session-row')
  assert((await rows.count()) >= 3, 'the sample shows session rows')
  const first = rows.first()
  assert.deepEqual(await first.evaluate(el => [...el.children].map(child => child.className)), [
    'dsh-session-status', 'dsh-ws-pill', 'dsh-session-title', 'dsh-session-trailing',
  ], 'reading order is dot, capsule, title, time')
  const rowLook = await rows.evaluateAll(nodes => nodes.map(node => {
    const pill = node.querySelector('.dsh-ws-pill')
    const title = node.querySelector('.dsh-session-title')
    return {
      pillBg: pill && getComputedStyle(pill).backgroundColor,
      pillColor: pill && getComputedStyle(pill).color,
      titleBg: title && getComputedStyle(title).backgroundColor,
      trailing: node.querySelector('.dsh-session-trailing')?.textContent ?? '',
      status: node.getAttribute('data-status'),
    }
  }))
  for (const row of rowLook) {
    assert.notEqual(row.pillBg, 'rgba(0, 0, 0, 0)', `every workspace capsule has a fill (${row.pillBg})`)
    assert.equal(row.pillColor, 'rgb(255, 255, 255)', 'capsule text is white')
    assert.equal(row.titleBg, 'rgba(0, 0, 0, 0)', 'the session title stays plain text')
    assert.match(row.trailing, /^(now|\d+(min|h|d|mo|y)|Activity time unknown)/u, `the trailing column is the time: ${row.trailing}`)
  }
  assert.equal(new Set(rowLook.map(row => row.pillBg)).size >= 2, true, 'different workspaces get different capsule colours')
  checks.push('会话行：状态点在最左、工作区胶囊、纯文字标题、时间在右')
  await recent.screenshot({ path: new URL('recent-rows.png', out).pathname, animations: 'disabled' })

  // A day with no activity draws no bar and no tinted column: no green sliver.
  const zeroBar = active().locator('.dsh-active-bar[data-zero="true"]').first()
  assert.equal(await zeroBar.count() >= 1, true, 'the fixture includes an idle day')
  assert.equal(await zeroBar.evaluate(el => getComputedStyle(el).opacity), '0', 'an idle day draws no bar')
  assert.equal(await zeroBar.evaluate(el => getComputedStyle(el.parentElement).backgroundColor), 'rgba(0, 0, 0, 0)', 'an idle day has no column tint')

  // 5. Gallery previews are the real card at its real size, not a pinned illustration.
  const previews = await page.locator('.dsh-directory-item').evaluateAll(tiles => tiles.map(tile => {
    const body = tile.querySelector('.dsh-card-preview-body')
    const frame = tile.querySelector('.dsh-card-preview-frame')
    return { type: tile.getAttribute('data-widget-type'), bodyWidth: body?.clientWidth, bodyHeight: body?.clientHeight,
      frameWidth: frame?.clientWidth, frameHeight: frame?.clientHeight, tile: tile.clientWidth,
      illustration: tile.querySelectorAll('.dsh-preview-bars,.dsh-preview-today,.dsh-preview-heatmap').length }
  }))
  const realWidths = new Set([340, 724, 1108])
  for (const preview of previews) {
    assert.equal(preview.illustration, 0, `no illustration fallback in ${preview.type}`)
    assert(realWidths.has(preview.bodyWidth), `${preview.type} lays out at a real card width (${preview.bodyWidth})`)
    assert(preview.frameWidth <= preview.tile + 1, `${preview.type} preview stays inside its tile`)
    assert(preview.frameHeight > 0 && preview.frameHeight <= preview.bodyHeight + 1, `${preview.type} preview is scaled, never cropped taller`)
  }
  const statusPreview = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:running"]')
  await statusPreview.scrollIntoViewIfNeeded()
  assert.equal(await statusPreview.locator('.dsh-status-chip').count(), 3, 'the preview renders the real filter chips')
  assert.equal(await statusPreview.locator('.dsh-session-row').count(), 1, 'the preview shows the synthetic running session')
  await statusPreview.screenshot({ path: new URL('preview-session-status.png', out).pathname, animations: 'disabled' })
  await page.locator('.dsh-library-panel').screenshot({ path: new URL('gallery.png', out).pathname, animations: 'disabled' })
  checks.push('组件库：预览是真实卡片按真实尺寸渲染后再缩放（无第二套插图）')
  await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
  await page.waitForTimeout(400)

  // 6. Notes: inline editing, no dialog, first line stays the title.
  assert.equal(await notes().locator('.dsh-widget-own-editor').count(), 0, 'notes have no editor trigger at all')
  const noteTitle = notes().locator('.dsh-note-title')
  assert.equal((await noteTitle.innerText()).trim(), '验证便笺', 'first line is the title')
  const titleWeight = await noteTitle.evaluate(el => Number(getComputedStyle(el).fontWeight))
  const bodyWeight = await notes().locator('.dsh-note-body').evaluate(el => Number(getComputedStyle(el).fontWeight))
  assert(titleWeight > bodyWeight, `the title is bolder than the body (${titleWeight} > ${bodyWeight})`)
  await notes().getByRole('button', { name: /^(Edit note|编辑便笺)$/ }).click()
  assert.equal(await page.locator('.dsh-widget-config-modal').count(), 0, 'clicking the note does not open a dialog')
  const editor = notes().locator('.dsh-note-input')
  await editor.waitFor({ timeout: 3000 })
  await editor.fill('改过的标题\n正文换了。')
  await notes().locator('.dsh-note-input').blur()
  for (let attempt = 0; attempt < 60 && (await configOf('notes-demo'))?.text !== '改过的标题\n正文换了。'; attempt++) await page.waitForTimeout(50)
  assert.equal((await configOf('notes-demo'))?.text, '改过的标题\n正文换了。', 'the note saves in place')
  assert.equal((await notes().locator('.dsh-note-title').innerText()).trim(), '改过的标题', 'the first line is the title again')
  checks.push('便笺：原地编辑、无对话框、首行加粗、失焦即保存')

  // 7. Timer never sits on a loading line.
  await timer().locator('.dsh-timer-clock').waitFor()
  assert.doesNotMatch(await timer().innerText(), /(Reading|正在读取|Loading)/u, 'the timer shows a clock, not a loading line')
  assert.match(await timer().locator('.dsh-timer-clock').innerText(), /^00:0\d$/u, 'the face starts at zero')
  for (let attempt = 0; attempt < 60 && await timer().getByRole('button', { name: /^(Start|开始)$/ }).isDisabled(); attempt++) await page.waitForTimeout(50)
  assert.equal(await timer().getByRole('button', { name: /^(Start|开始)$/ }).isEnabled(), true, 'start becomes available once the document is known')
  checks.push('计时器：不再停在 loading，控件的可用性随数据就绪切换')

  assert.deepEqual(errors, [])
} catch (error) {
  errors.push(error.stack ?? String(error))
  process.exitCode = 1
  await page?.screenshot({ path: new URL('failure.png', out).pathname }).catch(() => {})
} finally {
  await page?.close()
  await api('focus.apply', { operation: { op: 'timer.clear', instanceId: 'timer-demo' } }).catch(() => {})
  if (backup) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
  if (prefs) await api('prefs.set', { prefs: prefs.prefs })
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify({ checks, errors }, null, 2))
  console.log(out.pathname, JSON.stringify({ checks, errors }))
}
