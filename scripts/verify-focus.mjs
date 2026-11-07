/** Timer, pomodoro and countdown regressions on the private station.
 * Created rows are removed through the workbench restore in `finally`. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const url = new URL(process.env.DSH_VERIFY_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '3186', 'Only the explicit private station; never main 3080')
const out = new URL(`../../.work/dsh-home/evidence/focus-${Date.now()}/`, import.meta.url)
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
const focusDoc = async () => (await api('focus.get')).focus
const widget = id => page.locator(`[data-widget-id="${id}"]`)
const instances = [
  { instanceId: 'timer-demo', typeId: '@vlln/dsh-home:timer', configVersion: 1, config: { label: '回归计时' } },
  { instanceId: 'pomodoro-demo', typeId: '@vlln/dsh-home:pomodoro', configVersion: 1, config: { rounds: 0 } },
  { instanceId: 'countdown-demo', typeId: '@vlln/dsh-home:countdown', configVersion: 1, config: { targets: [] } },
]
const positions = {
  'timer-demo': { x: 0, y: 0, w: 4, h: 4 },
  'pomodoro-demo': { x: 4, y: 0, w: 4, h: 6 },
  'countdown-demo': { x: 8, y: 0, w: 4, h: 4 },
}
const clockOf = async locator => (await locator.textContent())?.trim() ?? ''
const openHome = async () => {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await widget('timer-demo').locator('.dsh-timer').waitFor({ timeout: 8000 })
}
try {
  await context.request.get(url.href)
  backup = await api('workbench.get'); prefs = await api('prefs.get')
  await api('prefs.set', { prefs: { ...prefs.prefs, canvasWidth: null, libraryPosition: null } })
  // The timer slot is per instance id and survives workbench restores; start it clean.
  await api('focus.apply', { operation: { op: 'timer.clear', instanceId: 'timer-demo' } })
  await api('workbench.set', {
    instances: [...backup.instances.filter(item => !instances.some(demo => demo.instanceId === item.instanceId)), ...instances],
    layout: { ...backup.layout, instanceLayout: true, hidden: backup.instances.map(item => item.instanceId),
      order: instances.map(item => item.instanceId), positions: { ...backup.layout.positions, 12: positions } },
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url.href)
  await openHome()

  // Timer: starts at 00:00, ticks, pauses and survives a reload.
  const timerClock = widget('timer-demo').locator('.dsh-timer-clock')
  assert.equal(await clockOf(timerClock), '00:00')
  assert.equal(await widget('timer-demo').locator('.dsh-timer-name').textContent(), '回归计时')
  assert.match(await widget('timer-demo').locator('.dsh-timer-wheel [data-current="true"]').textContent(), /^(None|不限)$/u, 'the wheel starts at no target')
  await widget('timer-demo').getByRole('button', { name: /^(开始|Start)$/ }).click()
  await page.waitForTimeout(1600)
  const ticking = await clockOf(timerClock)
  assert.notEqual(ticking, '00:00', 'the clock advanced')
  assert.equal((await focusDoc()).timers['timer-demo'].running, true)
  await widget('timer-demo').getByRole('button', { name: /^(暂停|Pause)$/ }).click()
  await page.waitForTimeout(200)
  const paused = await clockOf(timerClock)
  await page.waitForTimeout(1200)
  assert.equal(await clockOf(timerClock), paused, 'a paused timer does not move')
  await page.reload()
  await openHome()
  await page.waitForTimeout(400)
  assert.equal(await clockOf(widget('timer-demo').locator('.dsh-timer-clock')), paused, 'the value survives a reload')
  assert.equal((await focusDoc()).timers['timer-demo'].running, false)
  await widget('timer-demo').getByRole('button', { name: /^(归零|Reset)$/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-clock')?.textContent?.trim() === '00:00', undefined, { timeout: 4000 })
  checks.push('timer: start → tick → pause → reload keeps the value → reset')

  // The wheel is the only target control: drag/keys, no dialog, no modal.
  assert.equal(await widget('timer-demo').locator('.dsh-widget-config-modal').count(), 0, 'no settings dialog')
  const wheel = widget('timer-demo').locator('.dsh-timer-wheel')
  await wheel.focus()
  await wheel.press('ArrowUp')
  await page.waitForFunction(() => (document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-wheel')?.getAttribute('aria-valuenow') ?? '0') === '5', undefined, { timeout: 4000 })
  await page.waitForFunction(() => document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-clock')?.textContent?.trim() === '05:00', undefined, { timeout: 4000 })
  assert.equal((await focusDoc()).timers['timer-demo'].targetMs, 5 * 60_000, 'the target is stored in the timer slot')
  // Dragging the wheel (the gesture the card is designed around) moves two steps.
  await wheel.press('Home')
  await page.waitForFunction(() => document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-wheel')?.getAttribute('aria-valuenow') === '0', undefined, { timeout: 4000 })
  const wheelBox = await wheel.boundingBox()
  assert(wheelBox !== null)
  await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y + 40)
  await page.mouse.down()
  await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y, { steps: 6 })
  await page.mouse.up()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-wheel')?.getAttribute('aria-valuenow') === '10', undefined, { timeout: 4000 })
  assert.equal((await focusDoc()).timers['timer-demo'].targetMs, 10 * 60_000, 'a 40px drag moves two steps')
  await wheel.press('Home')
  await page.waitForFunction(() => document.querySelector('[data-widget-id="timer-demo"] .dsh-timer-clock')?.textContent?.trim() === '00:00', undefined, { timeout: 4000 })
  assert.equal((await focusDoc()).timers['timer-demo'].targetMs, 0, 'Home clears the target')
  // Rename in place: click the name, type, Enter.
  await widget('timer-demo').locator('.dsh-timer-name').click()
  const nameInput = widget('timer-demo').locator('.dsh-timer-name-input')
  await nameInput.waitFor()
  await nameInput.fill('改过的名字')
  await nameInput.press('Enter')
  for (let attempt = 0; attempt < 60 && (await api('workbench.get')).instances.find(item => item.instanceId === 'timer-demo')?.config?.label !== '改过的名字'; attempt++) await page.waitForTimeout(50)
  assert.equal((await api('workbench.get')).instances.find(item => item.instanceId === 'timer-demo')?.config?.label, '改过的名字')
  await widget('timer-demo').locator('.dsh-timer-name', { hasText: '改过的名字' }).waitFor()
  checks.push('timer: 目标时长滚轮（方向键/拖动）、改名就地完成，全程无弹窗')

  // Pomodoro: 25:00, starts down, skip flips to the break phase.
  const pomodoro = widget('pomodoro-demo').locator('.dsh-pomodoro')
  const pomodoroClock = pomodoro.locator('.dsh-ring-value')
  assert.equal(await clockOf(pomodoroClock), '25:00')
  await pomodoro.getByRole('button', { name: /^(开始专注|Start focus)$/ }).click()
  await page.waitForTimeout(1500)
  assert.notEqual(await clockOf(pomodoroClock), '25:00', 'the countdown moved')
  await pomodoro.getByRole('button', { name: /^(跳过|Skip)$/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="pomodoro-demo"] .dsh-pomodoro')?.getAttribute('data-phase') === 'break', undefined, { timeout: 4000 })
  assert.equal(await clockOf(pomodoroClock), '05:00', 'the break starts from five minutes')
  assert.equal((await focusDoc()).pomodoros['pomodoro-demo'].phase, 'break')
  assert.equal((await focusDoc()).pomodoros['pomodoro-demo'].completed['1970-01-01'] ?? 0, 0, 'a skip is not a round')
  await pomodoro.getByRole('button', { name: /^(归零|Reset)$/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="pomodoro-demo"] .dsh-pomodoro')?.getAttribute('data-phase') === 'focus', undefined, { timeout: 4000 })
  checks.push('pomodoro: 25:00 → ticking → skip to break → reset')

  // Countdown: add a target through the shared settings editor.
  const countdown = widget('countdown-demo').locator('.dsh-countdown-wrap')
  assert.match(await countdown.textContent(), /(还没有倒计时目标|No countdown yet)/u)
  await countdown.getByRole('button', { name: /^(倒计时选项|Countdown options)$/ }).click()
  const tomorrow = await page.evaluate(() => {
    const at = new Date(Date.now() + 86_400_000)
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
  })
  await page.getByRole('button', { name: /(添加目标|Add target)/ }).click()
  await page.locator('.dsh-widget-config-modal input[type="text"]').last().fill('回归：明天')
  await page.locator('.dsh-widget-config-modal input[type="date"]').last().fill(tomorrow)
  await page.locator('.dsh-widget-config-modal').getByRole('button', { name: /^(保存|Save)$/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-widget-id="countdown-demo"] .dsh-countdown') !== null, undefined, { timeout: 4000 })
  assert.match(await countdown.textContent(), /(回归：明天)/u)
  assert.match(await countdown.textContent(), /(天|days)/u)
  const stored = (await api('workbench.get')).instances.find(item => item.instanceId === 'countdown-demo')?.config
  assert.equal(stored?.targets?.[0]?.title, '回归：明天')
  checks.push('countdown: add a target through settings; the card shows days left')

  await page.screenshot({ path: new URL('focus.png', out).pathname, animations: 'disabled' })
  await writeFile(new URL('summary.json', out), JSON.stringify({ checks, errors }, null, 2))
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  for (const check of checks) console.log(`ok - ${check}`)
  console.log(`${checks.length} checks passed`)
} finally {
  try {
    if (page !== undefined) {
      await api('focus.apply', { operation: { op: 'timer.reset', instanceId: 'timer-demo' } })
      await api('focus.apply', { operation: { op: 'pomodoro.reset', instanceId: 'pomodoro-demo' } })
      if (backup !== undefined) await api('workbench.set', { layout: backup.layout, instances: backup.instances })
      if (prefs !== undefined) await api('prefs.set', { prefs: prefs.prefs })
    }
  } finally {
    await browser.close()
  }
}
