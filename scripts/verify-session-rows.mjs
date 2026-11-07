/** Design regressions for the session rows and the merged activity widget.
 * Private station only; instances and preferences are restored in `finally`. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

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
const instance = { instanceId: 'active-demo', typeId: '@vlln/dsh-home:active', configVersion: 1, config: { range: '7d' } }
const active = () => page.locator('[data-widget-id="active-demo"]')
const configOf = async () => (await api('workbench.get')).instances.find(item => item.instanceId === 'active-demo')?.config ?? null
const waitCount = (selector, count) => page.waitForFunction(({ selector, count }) => document.querySelectorAll(selector).length === count, { selector, count }, { timeout: 4000 })
const openHome = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('[data-widget-id="active-demo"]').waitFor()
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => item.instanceId !== 'active-demo'), instance],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: ['active-demo'], positions: { ...backup.layout.positions, 12: { 'active-demo': { x: 0, y: 0, w: 8, h: 4 } } } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await openHome()

  // One widget, four windows of the same quantity.
  assert.equal(await active().locator('.dsh-active-range').count(), 4, 'four window chips')
  assert.equal(await active().locator('.dsh-active-bar').count(), 7, 'the default window is 7 days')
  await active().getByRole('button', { name: /^(14 days|14 天)$/ }).click()
  for (let attempt = 0; attempt < 60 && (await configOf())?.range !== '14d'; attempt++) await page.waitForTimeout(50)
  assert.equal((await configOf())?.range, '14d', 'the chosen window is saved on the instance')
  await waitCount('[data-widget-id="active-demo"] .dsh-active-bar', 14)
  assert.equal(await active().locator('.dsh-active-bar').count(), 14, '14 bars for the 14-day window')
  await active().getByRole('button', { name: /^(2 days|2 天)$/ }).click()
  for (let attempt = 0; attempt < 60 && (await configOf())?.range !== '2d'; attempt++) await page.waitForTimeout(50)
  await waitCount('[data-widget-id="active-demo"] .dsh-active-bar', 2)
  await active().getByRole('button', { name: /^(Today|今天)$/ }).click()
  for (let attempt = 0; attempt < 60 && (await configOf())?.range !== 'today'; attempt++) await page.waitForTimeout(50)
  await waitCount('[data-widget-id="active-demo"] .dsh-active-bar', 0)
  assert.equal(await active().locator('.dsh-active-bar').count(), 0, 'today is not a bar chart')
  assert(await active().locator('.dsh-active-band, .dsh-active-band-empty').count() > 0, 'today shows the 24-hour band')
  await page.screenshot({ path: new URL('active-today.png', out).pathname, animations: 'disabled' })
  checks.push('最近活跃：一个组件四个窗口，切换即保存，今天用 24 小时时间带')

  // The window survives a reload: it is instance config, not view state.
  await page.reload()
  await openHome()
  await active().locator('.dsh-active-band, .dsh-active-band-empty').first().waitFor({ timeout: 5000 })
  assert.equal(await active().locator('.dsh-active-band, .dsh-active-band-empty').count() > 0, true, 'reload keeps the Today window')

  // The library no longer offers the widgets this one replaces.
  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor()
  for (const retired of ['today', 'rhythm']) {
    assert.equal(await page.locator(`.dsh-directory-item[data-widget-type="@vlln/dsh-home:${retired}"]`).count(), 0, `${retired} is retired from the library`)
  }
  assert.equal(await page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:active"]').count(), 1, 'the merged widget is offered')
  checks.push('组件库不再出现「今天」「近两周」，只提供合并后的「最近活跃」')

  // The recent preview renders the new row: no paths, no short ids, native dots and time.
  const recent = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:recent"]')
  await recent.scrollIntoViewIfNeeded()
  const rows = recent.locator('.dsh-session-row')
  assert((await rows.count()) >= 3, 'the sample shows session rows')
  assert.equal(await recent.locator('.dsh-recent-id, .dsh-recent-path').count(), 0, 'no short id or path line any more')
  const first = rows.first()
  assert.equal(await first.locator('.dsh-directory-badge').count(), 1, 'the workspace keeps its colored directory mark')
  assert.equal(await first.locator('.dsh-session-workspace').count(), 1)
  assert.equal(await first.locator('.dsh-session-title').count(), 1)
  assert.equal(await first.locator('.dsh-session-status svg, .dsh-session-status [class*="dot"]').count(), 1, 'a native state dot')
  const palette = await rows.evaluateAll(nodes => nodes.map(node => {
    const badge = node.querySelector('.dsh-directory-badge'), title = node.querySelector('.dsh-session-title')
    return {
      badge: badge === null ? null : getComputedStyle(badge).backgroundColor,
      title: title === null ? null : getComputedStyle(title).backgroundColor,
      trailing: node.querySelector('.dsh-session-trailing')?.textContent ?? '',
      status: node.getAttribute('data-status'),
    }
  }))
  for (const row of palette) {
    // The old visual language: the workspace keeps its tinted directory tile, the
    // session name stays plain card text — no extra plate or new hue.
    assert.notEqual(row.badge, 'rgba(0, 0, 0, 0)', `the directory mark is tinted (${row.badge})`)
    assert.equal(row.title, 'rgba(0, 0, 0, 0)', 'the session name is plain text')
    assert.match(row.trailing, /^(now|\d+(min|h|d|mo|y)|\d+(分钟|小时|天|个月|年)|Activity time unknown|活动时间未知)$/u, `the trailing column is always the time: ${row.trailing}`)
  }
  const pendingRow = palette.find(row => row.status === 'approval')
  assert(pendingRow !== undefined, 'the sample includes a pending interaction')
  assert.doesNotMatch(pendingRow.trailing, /Approval|Plan review|Answer|待审批|计划待审|待回答/u, 'a pending row shows its time, not the status word')
  assert.match(pendingRow.trailing, /^(now|\d+(min|h|d|mo|y))/u, 'the pending row still dates itself')
  checks.push('会话行：沿用目录色块与纯文字（旧配色），原生状态点，原生紧凑时间，不再显示 ID/路径')
  await recent.screenshot({ path: new URL('recent-rows.png', out).pathname, animations: 'disabled' })
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
