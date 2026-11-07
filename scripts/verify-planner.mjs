/** Planner regressions: the /api fence, the shared store, and the four linked views.
 * Private station only; created rows and the workbench are restored in `finally`. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/planner-${Date.now()}/`, import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, reducedMotion: 'reduce' })
let page, backup, prefs
const checks = [], errors = []
const createdItems = [], createdHabits = []
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', url).href, { headers: { Origin: url.origin }, data: { op, ...extra } })
  const envelope = await response.json()
  assert(envelope.ok, JSON.stringify(envelope))
  return envelope.value
}
const planData = async () => (await api('planner.get')).planner
const widget = id => page.locator(`[data-widget-id="${id}"]`)
const instances = [
  { instanceId: 'todo-demo', typeId: '@vlln/dsh-home:todo', configVersion: 1, config: { showDone: true } },
  { instanceId: 'plan-demo', typeId: '@vlln/dsh-home:plan', configVersion: 1, config: { showDone: false } },
  { instanceId: 'calendar-demo', typeId: '@vlln/dsh-home:calendar', configVersion: 1, config: { weekStart: 1 } },
  { instanceId: 'habit-demo', typeId: '@vlln/dsh-home:habit', configVersion: 1, config: { showAll: false } },
]
const positions = {
  'todo-demo': { x: 0, y: 0, w: 4, h: 6 },
  'plan-demo': { x: 4, y: 0, w: 8, h: 6 },
  'calendar-demo': { x: 0, y: 6, w: 8, h: 8 },
  'habit-demo': { x: 8, y: 6, w: 4, h: 6 },
}
const openHome = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('todo-demo').locator('.dsh-todo').waitFor({ timeout: 8000 })
  await widget('calendar-demo').locator('.dsh-calendar').waitFor({ timeout: 8000 })
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await writeFile(new URL('backup.json', out), JSON.stringify({ backup, prefs, planner: await planData() }, null, 2))
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !instances.some(demo => demo.instanceId === item.instanceId)), ...instances],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: instances.map(item => item.instanceId), positions: { ...backup.layout.positions, 12: positions } },
  })
  const clock = new Date()
  const today = `${clock.getFullYear()}-${String(clock.getMonth() + 1).padStart(2, '0')}-${String(clock.getDate()).padStart(2, '0')}`
  // Two timed rows for today, one before and one after "now", so the now line has a home.
  const morning = (await api('planner.apply', { operation: { op: 'item.create', item: { title: '回归：早上', day: today, start: '09:00', end: '09:45' } } })).planner.items
  const morningItem = morning.find(item => item.title === '回归：早上')
  const night = (await api('planner.apply', { operation: { op: 'item.create', item: { title: '回归：夜里', day: today, start: '23:00' } } })).planner.items
  const nightItem = night.find(item => item.title === '回归：夜里')
  createdItems.push(morningItem.id, nightItem.id)
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  const rpc = [], planOps = []
  page.on('request', request => {
    if (!request.url().includes('dsh-home')) return
    rpc.push(new URL(request.url()).pathname)
    try {
      const op = String(JSON.parse(request.postData() ?? '{}').op ?? '')
      if (op.startsWith('planner.') || op.startsWith('focus.')) planOps.push(op)
    } catch { /* not plan traffic */ }
  })
  await page.goto(url.href)
  await openHome()

  assert(rpc.includes('/api/dsh-home/rpc'), `plan traffic used ${JSON.stringify([...new Set(rpc)])}`)
  checks.push('the fenced /api route serves plan data')

  const cell = widget('calendar-demo').locator(`.dsh-calendar-cell[aria-label="${today}"]`)
  await cell.click()
  await widget('calendar-demo').locator('.dsh-plan-add').click()
  await widget('calendar-demo').locator('.dsh-item-editor input[type="text"]').fill('回归：日历新建')
  await widget('calendar-demo').locator('.dsh-item-save').click()
  await widget('calendar-demo').locator('.dsh-calendar-list .dsh-todo-title', { hasText: '回归：日历新建' }).waitFor({ timeout: 4000 })
  await widget('todo-demo').locator('.dsh-todo-title', { hasText: '回归：日历新建' }).waitFor({ timeout: 4000 })
  const created = (await planData()).items.find(item => item.title === '回归：日历新建')
  assert(created !== undefined && created.day === today, 'the host stored the day')
  createdItems.push(created.id)
  assert.equal(await widget('todo-demo').locator('.dsh-todo-group[data-group="today"] .dsh-todo-title').filter({ hasText: '回归：日历新建' }).count(), 1)
  checks.push('calendar → to-do: one store, no reload')

  assert.equal(await widget('calendar-demo').locator(`.dsh-calendar-cell[aria-label="${today}"] .dsh-calendar-dot`).count(), 1, 'today has an open dot')
  await widget('todo-demo').locator('.dsh-todo-item', { hasText: '回归：日历新建' }).locator('.dsh-todo-check').click()
  await page.waitForFunction(() => [...document.querySelectorAll('.dsh-calendar-list .dsh-todo-item')]
    .some(node => node.textContent?.includes('回归：日历新建') && node.getAttribute('data-done') === 'true'), undefined, { timeout: 4000 })
  assert.equal((await planData()).items.find(item => item.id === created.id)?.done, true)
  checks.push('to-do → calendar: finishing repaints the day list')

  await widget('plan-demo').locator('.dsh-plan-now').waitFor({ timeout: 4000 })
  const times = await widget('plan-demo').locator('.dsh-plan-time').allTextContents()
  const firsts = times.map(text => text.slice(0, 5))
  assert.deepEqual(firsts, [...firsts].sort(), `timeline not sorted: ${times.join(', ')}`)
  assert.equal(await widget('plan-demo').locator('.dsh-plan-block').count(), times.length)
  const order = await widget('plan-demo').locator('.dsh-plan-list > li').evaluateAll(nodes => nodes.map(node => (
    node.classList.contains('dsh-plan-now') ? 'now' : node.querySelector('.dsh-todo-title')?.textContent ?? '?')))
  assert.deepEqual(order, ['回归：早上', 'now', '回归：夜里'], `unexpected timeline: ${JSON.stringify(order)}`)
  checks.push('plan: blocks stay in time order with a now line between them')

  await widget('habit-demo').locator('.dsh-todo-add input').fill('回归：跑步')
  await widget('habit-demo').locator('.dsh-todo-add input').press('Enter')
  await widget('habit-demo').locator('.dsh-habit-title', { hasText: '回归：跑步' }).waitFor({ timeout: 4000 })
  const habit = (await planData()).habits.find(entry => entry.title === '回归：跑步')
  assert(habit !== undefined, 'the habit reached the host')
  createdHabits.push(habit.id)
  const row = widget('habit-demo').locator('.dsh-habit-row', { hasText: '回归：跑步' })
  assert.match(await row.locator('.dsh-habit-streak').textContent(), /(还没开始|Not started)/u)
  await row.locator('.dsh-habit-mark').click()
  await page.waitForFunction(() => {
    const node = [...document.querySelectorAll('.dsh-habit-row')].find(item => item.textContent?.includes('回归：跑步'))
    return node?.getAttribute('data-marked') === 'true'
  }, undefined, { timeout: 4000 })
  assert.match(await row.locator('.dsh-habit-streak').textContent(), /(连续 1 天|1-day streak)/u)
  assert.equal((await planData()).habits.find(entry => entry.id === habit.id)?.marks[today], true)
  await row.locator('.dsh-habit-mark').click()
  await page.waitForFunction(() => {
    const node = [...document.querySelectorAll('.dsh-habit-row')].find(item => item.textContent?.includes('回归：跑步'))
    return node?.getAttribute('data-marked') === 'false'
  }, undefined, { timeout: 4000 })
  checks.push('habit: mark → streak 1 → unmark')

  // Keyboard: Escape closes the inline editor without saving.
  await widget('todo-demo').locator('.dsh-todo-item', { hasText: '回归：日历新建' }).locator('.dsh-todo-main').click()
  await widget('todo-demo').locator('.dsh-item-editor').waitFor({ timeout: 4000 })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelectorAll('[data-widget-id="todo-demo"] .dsh-item-editor').length === 0, undefined, { timeout: 4000 })
  assert.equal((await planData()).items.find(item => item.id === created.id)?.title, '回归：日历新建', 'Escape kept the title')
  checks.push('keyboard: Escape closes the editor without saving')

  // No declared shape overflows horizontally.
  for (const id of ['todo-demo', 'plan-demo', 'calendar-demo', 'habit-demo']) {
    const overflow = await widget(id).evaluate(node => node.scrollWidth - node.clientWidth)
    assert(overflow <= 1, `${id} overflows by ${overflow}px`)
  }
  checks.push('layout: every card fits its declared column span')

  await page.reload()
  await openHome()
  await widget('todo-demo').locator('.dsh-todo-title', { hasText: '回归：日历新建' }).waitFor({ timeout: 8000 })
  checks.push('reload: rows come back after a page reload')

  await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
  await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click()
  await page.locator('.dsh-library-panel').waitFor({ timeout: 4000 })
  await page.waitForTimeout(500)
  const previewOps = planOps.length
  const card = page.locator('.dsh-directory-item[data-widget-type="@vlln/dsh-home:todo"]')
  assert.equal(await card.count(), 1, 'the gallery lists the to-do widget')
  await card.hover()
  await page.waitForTimeout(700)
  assert.equal(planOps.length, previewOps, 'rendering the preview issued no plan traffic')
  assert((await card.locator('.dsh-todo-title').first().textContent())?.length > 0)
  checks.push('preview: synthetic rows, zero plan traffic')

  await page.screenshot({ path: new URL('planner.png', out).pathname, animations: 'disabled' })
  await writeFile(new URL('summary.json', out), JSON.stringify({ checks, errors }, null, 2))
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  for (const check of checks) console.log(`ok - ${check}`)
  console.log(`${checks.length} checks passed`)
} finally {
  try {
    if (page !== undefined) {
      for (const id of createdItems) await api('planner.apply', { operation: { op: 'item.delete', id } })
      for (const id of createdHabits) await api('planner.apply', { operation: { op: 'habit.delete', id } })
      if (backup !== undefined) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
      if (prefs !== undefined) await api('prefs.set', { prefs: prefs.prefs })
    }
  } finally {
    await browser.close()
  }
}
