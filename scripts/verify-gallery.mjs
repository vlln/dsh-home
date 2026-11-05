/** Gallery acceptance on the coordinated private station; never use the main/shared GUI.
 * DSH_VERIFY_URL=<explicit private URL> DSH_VERIFY_COORDINATED=1 node scripts/verify-gallery.mjs
 * Obtain exclusive station ownership before running. No fixture/plugin/model installation.
 * Back up BEFORE opening Home (markSeen may persist preferences), close all browser pages
 * before finally restoring and asserting the exact original instances, layout and home prefs.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

assert(process.env.DSH_VERIFY_URL, 'Supply DSH_VERIFY_URL explicitly; no default URL is allowed')
const target = new URL(process.env.DSH_VERIFY_URL)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied private loopback port 3186 station is permitted')
assert.equal(process.env.DSH_VERIFY_COORDINATED, '1', 'Wait for parent readiness/exclusive station ownership, then set DSH_VERIFY_COORDINATED=1')
const output = new URL('../../.work/dsh-home/evidence/gallery/', import.meta.url)
await mkdir(output, { recursive: true })
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${crypto.randomUUID().slice(0, 8)}`
const evidence = name => new URL(`gallery-${runId}-${name}`, output).pathname
const redact = value => {
  let text = String(value).replaceAll(target.href, `${target.origin}/[private]`)
  for (const value of target.searchParams.values()) if (value) text = text.replaceAll(value, '[redacted]')
  return text
}
const text = {
  edit: /^(Edit layout|编辑布局)$/, done: /^(Done|完成)$/, widgets: /^(Widgets|小组件)$/,
  addTab: /^(Add widgets|添加小组件)$/, desktopTab: /^(On desktop|桌面组件)(?: · \d+)?$/,
  search: /^(Search widgets|搜索小组件)$/, all: /^(All|全部)$/,
  builtIn: /^(Built-in|内置)$/, extensions: /^(Extensions|扩展)$/,
  add: /^(Add|添加)$/, settings: /^(Settings|设置)$/, save: /^(Save|保存)$/,
  duplicate: /^(Duplicate|复制)$/, hide: /^(Hide|隐藏)$/, show: /^(Show|显示)$/,
  delete: /^(Delete|删除)$/, confirmDelete: /^(Confirm delete|确认删除)$/,
}
const notesType = '@vlln/dsh-home:notes'
const counterType = '@vlln/dsh-home-example:counter'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 2560, height: 1440 }, reducedMotion: 'reduce' })
const checks = [], errors = [], widths = []
let page, backup, failure, restoreError, theme
let restoredWorkbench = false, restoredPrefs = false
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, {
    headers: { Origin: target.origin }, data: { op, ...extra },
  })
  const envelope = await response.json()
  assert(response.ok() && envelope.ok, `${op} failed: ${JSON.stringify(envelope.error)}`)
  return envelope.value
}
// Poll durable server state (not fixed sleeps), including debounced writes.
const durable = async (predicate, description) => {
  let latest
  await assert.doesNotReject(async () => {
    for (let attempt = 0; attempt < 80; attempt++) {
      latest = await api('workbench.get')
      if (predicate(latest)) return
      await new Promise(resolve => setTimeout(resolve, 75))
    }
    throw new Error(description)
  }, description)
  return latest
}
const document = value => ({ instances: value.instances, layout: value.layout })
try {
  // Authenticate using the supplied URL without mounting Home or executing client effects.
  const auth = await context.request.get(target.href)
  assert(auth.ok(), `Private station authentication failed (${auth.status()})`)
  backup = { workbench: await api('workbench.get'), preferences: await api('prefs.get') }
  assert(backup.workbench.storage.writable && backup.preferences.storage.writable, 'Private station must be writable')
  await writeFile(evidence('backup.json'), JSON.stringify(backup, null, 2), { mode: 0o600 })
  page = await context.newPage()
  page.on('pageerror', error => errors.push({ kind: 'pageerror', message: redact(error.message) }))
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ kind: 'console', message: redact(message.text()) })
  })
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  })
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
    await page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click()
  })
  const home = () => page.locator('.dsh-home')
  const button = name => home().getByRole('button', { name, exact: true })
  const tray = () => page.locator('.dsh-tray')
  const tab = name => tray().getByRole('button', { name, exact: true })
  const search = () => tray().getByRole('searchbox', { name: text.search, exact: true })
  const directory = () => tray().locator('.dsh-widget-directory')
  const tiles = () => directory().locator('.dsh-directory-item')
  const tile = type => directory().locator(`.dsh-directory-item[data-widget-type="${type}"]`)
  const row = id => tray().locator(`.dsh-instance-item[data-instance-id="${id}"]`)
  const card = id => home().locator(`.dsh-home-widget[data-widget-id="${id}"]`)
  const openHome = async () => {
    await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
    await home().waitFor()
    await page.waitForFunction(() => {
      const button = document.querySelector('.dsh-home-actions button[aria-pressed="false"]')
      return button && !button.disabled
    })
  }
  const edit = async () => { await button(text.edit).click(); await page.locator('.dsh-home[data-editing="true"]').waitFor() }
  const done = async () => { await button(text.done).click(); await page.locator('.dsh-home[data-editing="false"]').waitFor() }
  const toggleTray = async () => { await page.locator('.dsh-edit-bar').getByRole('button', { name: text.widgets }).click() }
  const openTray = async () => { await toggleTray(); await tray().waitFor() }
  const desktop = async () => { await tab(text.desktopTab).click(); await tray().locator('.dsh-instance-list').waitFor() }
  const addTab = async () => { await tab(text.addTab).click(); await directory().waitFor() }
  const reload = async () => { await page.reload(); await openHome() }
  const stats = () => page.evaluate(() => {
    const value = window.__homeExampleStats
    return value ? { mounts: value.mounts, unmounts: value.unmounts, activeTimers: value.activeTimers, instances: { ...value.instances } } : null
  })
  const layoutUnchanged = async expected => assert.deepEqual(document(await api('workbench.get')), expected, 'Gallery-only interaction changed durable instances/layout')
  const tileTypes = () => tiles().evaluateAll(nodes => nodes.map(node => node.getAttribute('data-widget-type')))
  const renderedGeometry = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    return page.locator('.dsh-spatial-container').evaluate(grid => {
      const origin = grid.getBoundingClientRect()
      // Relative coordinates ignore the manager pushing the whole desktop down, not its grid.
      const pixel = value => Math.round(value * 100) / 100
      return [...grid.querySelectorAll('.dsh-home-widget')].map(node => {
        const rect = node.getBoundingClientRect()
        return { id: node.getAttribute('data-widget-id'), x: pixel(rect.x - origin.x), y: pixel(rect.y - origin.y), width: pixel(rect.width), height: pixel(rect.height) }
      })
    })
  }
  const measure = async viewport => {
    await page.setViewportSize({ width: viewport, height: viewport === 2560 ? 1440 : 1100 })
    await page.waitForFunction(() => {
      const home = document.querySelector('.dsh-home'), inner = document.querySelector('.dsh-home-inner')
      if (!home || !inner) return false
      const style = getComputedStyle(home)
      // ResizeObserver/RGL updates follow the immediate CSS width change; wait for them too.
      return Math.abs(inner.clientWidth - (home.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))) <= 2
        && home.scrollWidth <= home.clientWidth + 1
    }, undefined, { timeout: 10000 })
    await renderedGeometry()
    const geometry = await page.evaluate(() => {
      const home = document.querySelector('.dsh-home'), inner = document.querySelector('.dsh-home-inner')
      const grid = document.querySelector('.dsh-spatial-container'), style = getComputedStyle(home)
      const gallery = document.querySelector('.dsh-widget-directory')
      return { home: home.clientWidth, inner: inner.clientWidth, padding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
        scrollWidth: home.scrollWidth, innerRect: inner.getBoundingClientRect().toJSON(),
        gridRect: grid.getBoundingClientRect().toJSON(), galleryDisplay: gallery && getComputedStyle(gallery).display,
        columns: gallery && getComputedStyle(gallery).gridTemplateColumns, cols: grid.getAttribute('data-cols') }
    })
    assert(geometry.inner >= geometry.home - geometry.padding - 2, `Unused width at ${viewport}`)
    assert(geometry.inner <= geometry.home - geometry.padding + 2, `Inner overflow at ${viewport}`)
    assert(geometry.scrollWidth <= geometry.home + 1, `Horizontal overflow at ${viewport}`)
    assert.equal(geometry.galleryDisplay, 'grid')
    const previews = await tiles().evaluateAll(nodes => nodes.map(tile => {
      const preview = tile.querySelector('.dsh-directory-preview')
      const rect = preview.getBoundingClientRect()
      return { type: tile.getAttribute('data-widget-type'), tile: tile.clientWidth, width: rect.width, height: rect.height,
        bars: [...preview.querySelectorAll('.dsh-preview-bars > i')].map(bar => ({ width: bar.getBoundingClientRect().width, height: bar.getBoundingClientRect().height })) }
    }))
    for (const preview of previews) {
      assert(preview.width >= preview.tile - 40, `Shrink-wrapped preview ${preview.type} at ${viewport}`)
      assert(preview.height >= 100, `Collapsed preview ${preview.type} at ${viewport}`)
      for (const bar of preview.bars) assert(bar.width > 0 && bar.height > 0, `Invisible sample bar ${preview.type} at ${viewport}`)
    }
    if (viewport >= 1440) assert(geometry.columns.split(' ').length >= 2, 'Wide gallery must have multiple tile columns')
    widths.push({ viewport, ...geometry })
    await page.screenshot({ path: evidence(`viewport-${viewport}-current-theme.png`), fullPage: true })
  }
  await page.goto(target.href)
  await openHome()
  // Entering edit mode is not a geometry commit. Do not click Done in the no-write phase.
  await edit()
  const before = document(await api('workbench.get'))
  assert.deepEqual(before, document(backup.workbench), 'Opening Home/edit changed saved geometry')
  const pixelsBefore = await renderedGeometry()
  const exampleBefore = await stats()
  assert(exampleBefore, 'Install/activate the example counter fixture before this coordinated test; script never installs fixtures')
  await openTray()
  assert.equal(await tab(text.addTab).getAttribute('aria-pressed'), 'true', 'Gallery must be the default manager view')
  assert.equal(await tray().locator('.dsh-instance-list').count(), 0, 'Instances belong only to On desktop')
  await tile(notesType).waitFor()
  await tile(counterType).waitFor()
  assert.equal(await directory().evaluate(node => getComputedStyle(node).display), 'grid')
  const types = await tileTypes()
  assert(types.length >= 2)
  assert.equal(new Set(types).size, types.length, 'One directory tile per registered type')
  assert.equal(await tiles().locator('.dsh-directory-preview').count(), types.length, 'Every directory tile needs a preview')
  assert.equal(await directory().locator('.dsh-widget-viewport, [data-home-example-instance], .dsh-personal-notes, .dsh-personal-clock').count(), 0, 'Directory mounted live Content rather than a static preview')
  assert.equal(await directory().locator('.dsh-directory-preview').evaluateAll(nodes => nodes.reduce((sum, node) => sum + [...node.querySelectorAll('button,input,textarea,select,a[href],[contenteditable="true"],[tabindex]')].filter(child => child.tabIndex >= 0).length, 0)), 0, 'Previews must contain no focusable controls')
  assert.deepEqual(await stats(), exampleBefore, 'Opening gallery mounted extra example Content or timers')
  checks.push('default Add widgets view is a multi-tile CSS grid with static noninteractive previews and no desktop instance list')

  const title = (await tile(notesType).locator('.dsh-manager-info strong').innerText()).trim()
  for (const query of [title, notesType, '@vlln/dsh-home-example-counter']) {
    await search().fill(query)
    const expected = query === '@vlln/dsh-home-example-counter' ? counterType : notesType
    await tile(expected).waitFor()
    assert((await tileTypes()).includes(expected), `Search must match ${query}`)
  }
  await search().fill(`gallery-no-match-${runId}`)
  await page.waitForFunction(() => document.querySelectorAll('.dsh-widget-directory .dsh-directory-item').length === 0)
  assert.equal(await tiles().count(), 0)
  await search().fill('')
  await tile(notesType).waitFor()
  await tab(text.builtIn).click()
  assert((await tileTypes()).every(type => type.startsWith('@vlln/dsh-home:')))
  assert((await tileTypes()).includes(notesType))
  await tab(text.extensions).click()
  assert((await tileTypes()).includes(counterType))
  assert(!(await tileTypes()).includes(notesType))
  await tab(text.all).click()
  assert.deepEqual(await tileTypes(), types)
  await desktop()
  assert.equal(await directory().count(), 0, 'Directory belongs only to Add widgets')
  assert.equal(await tray().locator('.dsh-instance-item').count(), backup.workbench.instances.length)
  await addTab()
  for (const width of [2560, 1440, 920, 540]) await measure(width)
  await page.setViewportSize({ width: 2560, height: 1440 })
  await toggleTray(); await tray().waitFor({ state: 'hidden' })
  assert.deepEqual(await renderedGeometry(), pixelsBefore, 'Gallery/search/filter/resize changed desktop pixel geometry at the original viewport')
  await openTray()
  assert.deepEqual(await stats(), exampleBefore, 'Search/filter/tabs/resize mounted extra counter Content or timers')
  await layoutUnchanged(before)
  checks.push('localized search matches title/type ID/source and empty result; filters/tabs/resizes leave exact durable instance/layout JSON and counter mount/timer stats unchanged')
  checks.push('2560/1440/920/540 viewports use all padded Home width without horizontal overflow')
  theme = await page.evaluate(() => ({ bodyClass: document.body.className, colorScheme: getComputedStyle(document.body).colorScheme, homeBackground: getComputedStyle(document.querySelector('.dsh-home')).backgroundColor }))

  // From here onward use public UI for persistent lifecycle mutations. Every path restores.
  await tile(notesType).getByRole('button', { name: text.add, exact: true }).click()
  const oldIds = new Set(backup.workbench.instances.map(instance => instance.instanceId))
  const addedState = await durable(state => state.instances.some(instance => instance.typeId === notesType && !oldIds.has(instance.instanceId)), 'Directory Add must create a durable notes instance')
  const added = addedState.instances.find(instance => instance.typeId === notesType && !oldIds.has(instance.instanceId))
  assert(added)
  assert.deepEqual(addedState.instances.filter(instance => oldIds.has(instance.instanceId)), backup.workbench.instances, 'Add changed an original instance/config')
  for (const [cols, positions] of Object.entries(backup.workbench.layout?.positions ?? {})) {
    for (const [id, rect] of Object.entries(positions)) assert.deepEqual(addedState.layout.positions?.[cols]?.[id], rect, `Add moved original ${id} at ${cols} columns`)
  }
  assert.equal(await tray().locator('.dsh-instance-list').count(), 0, 'Adding must not merge the desktop list into the gallery')
  await done(); await reload()
  assert((await api('workbench.get')).instances.some(instance => instance.instanceId === added.instanceId))
  await edit(); await openTray(); await desktop()
  await row(added.instanceId).getByRole('button', { name: text.settings }).click()
  const settings = page.locator('.dsh-widget-settings')
  await settings.waitFor()
  const noteBody = `Gallery acceptance ${runId}`
  await settings.locator('textarea').fill(noteBody)
  await settings.getByRole('button', { name: text.save, exact: true }).click()
  await settings.waitFor({ state: 'hidden' })
  await durable(state => state.instances.find(instance => instance.instanceId === added.instanceId)?.config.text === noteBody, 'Notes settings must save durably')
  await row(added.instanceId).getByRole('button', { name: text.duplicate }).click()
  const withCopy = await durable(state => state.instances.filter(instance => instance.typeId === notesType && !oldIds.has(instance.instanceId)).length === 2, 'Duplicate must create a second notes instance')
  const copy = withCopy.instances.find(instance => instance.typeId === notesType && !oldIds.has(instance.instanceId) && instance.instanceId !== added.instanceId)
  assert(copy)
  assert.deepEqual(copy.config, withCopy.instances.find(instance => instance.instanceId === added.instanceId).config)
  await row(added.instanceId).getByRole('button', { name: text.hide }).click()
  await card(added.instanceId).waitFor({ state: 'hidden' })
  await durable(state => state.layout.hidden.includes(added.instanceId), 'Hide must persist')
  await row(added.instanceId).getByRole('button', { name: text.show }).click()
  await card(added.instanceId).waitFor()
  await durable(state => !state.layout.hidden.includes(added.instanceId), 'Show must persist')
  await row(copy.instanceId).getByRole('button', { name: text.delete }).click()
  await row(copy.instanceId).locator('.dsh-delete-confirm').waitFor()
  assert((await api('workbench.get')).instances.some(instance => instance.instanceId === copy.instanceId), 'Delete must require confirmation')
  await row(copy.instanceId).getByRole('button', { name: text.confirmDelete }).click()
  await row(copy.instanceId).waitFor({ state: 'hidden' })
  const afterDelete = await durable(state => !state.instances.some(instance => instance.instanceId === copy.instanceId), 'Confirmed delete must persist')
  for (const positions of Object.values(afterDelete.layout.positions ?? {})) assert(!Object.hasOwn(positions, copy.instanceId))
  await done(); await reload()
  await card(added.instanceId).getByText(noteBody, { exact: true }).waitFor()
  assert.equal((await api('workbench.get')).instances.find(instance => instance.instanceId === added.instanceId).config.text, noteBody)
  checks.push(`directory Add notes preserves all ${backup.workbench.instances.length} original instances/configs and saved positions; reload, On desktop settings, duplicate, hide/show and explicitly confirmed delete remain durable and functional`)
  assert.deepEqual(errors, [], 'Unexpected browser errors')
} catch (error) {
  failure = error
  await page?.screenshot({ path: evidence('failure.png'), fullPage: true }).catch(() => {})
} finally {
  // Kill client effects and pending debounce before restoring. Do not reopen Home afterward.
  await Promise.all(context.pages().map(page => page.close().catch(() => {})))
  if (backup) {
    try {
      await api('workbench.set', { layout: backup.workbench.layout, instances: backup.workbench.instances })
      assert.deepEqual(document(await api('workbench.get')), document(backup.workbench))
      restoredWorkbench = true
    } catch (error) { restoreError = redact(error); failure ??= error }
    try {
      await api('prefs.set', { prefs: backup.preferences.prefs })
      assert.deepEqual((await api('prefs.get')).prefs, backup.preferences.prefs)
      restoredPrefs = true
    } catch (error) { restoreError = [restoreError, redact(error)].filter(Boolean).join('; '); failure ??= error }
  }
  await writeFile(evidence('report.json'), JSON.stringify({ origin: target.origin, checks, widths, errors, theme,
    themeCoverage: 'Screenshots show existing station theme only; no dark-theme claim or host preference mutation.',
    restoredOriginalWorkbench: restoredWorkbench, restoredOriginalPreferences: restoredPrefs,
    restoreError, failure: failure ? redact(failure) : undefined }, null, 2), { mode: 0o600 })
  await context.close()
  await browser.close()
}
for (const check of checks) console.log(`PASS ${check}`)
console.log(`RESTORE workbench=${restoredWorkbench} preferences=${restoredPrefs}`)
console.log(`Evidence prefix: gallery-${runId}`)
if (failure) { console.error(redact(failure)); process.exitCode = 1 }
