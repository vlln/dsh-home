#!/usr/bin/env node
/** Real distributed-bundle acceptance; owns a fresh isolated site and its children, never shared user data. */
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2]
assert(input && !input.startsWith('--'), 'Supply the final .tgz as the required positional argument')
const tarball = await realpath(path.resolve(input))
assert(tarball.endsWith('.tgz'), 'Expected a .tgz distribution artifact')
const SITE = path.resolve(ROOT, '../.work/dsh-home/builtin-widgets', `run-${Date.now()}`)
const HOME = path.join(SITE, 'dsh'), WORKSPACE = path.join(SITE, 'workspace'), EVIDENCE = path.join(SITE, 'evidence'), FIXTURE = path.join(SITE, 'fixture')
const PORT = 3188, ORIGIN = `http://127.0.0.1:${PORT}`
const cli = await realpath(execFileSync('/usr/bin/which', ['dsh'], { encoding: 'utf8' }).trim())
const report = { origin: ORIGIN, site: SITE, tarball, sha256: createHash('sha256').update(await readFile(tarball)).digest('hex'), checks: [], errors: [], failure: null,
  data: 'Synthetic user/message events created ONLY through isolated host sessionPersistence.create/append/flush. Browser/API/layout/settings use the installed package; no activity response mocking.' }
const children = new Set()
let host, browser, page, context, promptAttempts = 0, stopping = false
const redact = value => String(value).replace(/([?&]token=)[^\s"'<>]+/gi, '$1[REDACTED]').replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, detail) => { report.checks.push({ name, ...detail }); console.log(`PASS ${name}`) }
const env = { PATH: process.env.PATH, HOME: path.join(SITE, 'os-home'), DSH_HOME: HOME, LANG: 'en_US.UTF-8', DSH_TELEMETRY: '0', NO_COLOR: '1', CI: '1', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' }
for (const key of ['TMPDIR', 'SYSTEMROOT', 'NODE_EXTRA_CA_CERTS']) if (process.env[key]) env[key] = process.env[key]
function freePort() {
  try { assert.fail(execFileSync('/usr/sbin/lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' })) }
  catch (error) { if (error.status === 1 && !error.stdout?.length) return; throw error }
}
async function owned(file, text) { assert(!existsSync(file), `Refuse to overwrite ${file}`); await writeFile(file, text, { flag: 'wx', mode: 0o600 }) }
function spawnOwn(command, args, cwd = WORKSPACE) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.add(child); child.output = ''
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { child.output += chunk.toString() })
  child.on('exit', () => children.delete(child))
  return child
}
async function command(command, args, label, cwd) {
  const child = spawnOwn(command, args, cwd)
  const [code] = await once(child, 'exit')
  await writeFile(path.join(EVIDENCE, `${label}.log`), redact(child.output))
  assert.equal(code, 0, `${label}: ${redact(child.output.slice(-6000))}`)
}
async function eventually(fn, label, timeout = 45_000) {
  const until = Date.now() + timeout; let reason
  while (Date.now() < until) {
    try { const result = await fn(); if (result) return result } catch (error) { reason = error }
    await delay(150)
  }
  throw new Error(`${label} timed out${reason ? ': ' + redact(reason.message) : ''}`)
}
async function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit'); child.kill('SIGTERM')
  if (!await Promise.race([exited.then(() => true), delay(12000).then(() => false)])) { child.kill('SIGKILL'); await exited }
}
async function cleanup() {
  if (stopping) return
  stopping = true
  await browser?.close().catch(() => {})
  await Promise.all([...children].map(terminate))
  if (host) await writeFile(path.join(EVIDENCE, 'host.log'), redact(host.output))
  freePort()
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { process.exitCode = 130; void cleanup() })
async function api(op, extra = {}, allowFailure = false) {
  const result = await page.evaluate(async ({ op, extra }) => {
    const response = await fetch('/plugins/dsh-home/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op, ...extra }) })
    return { status: response.status, ...await response.json() }
  }, { op, extra })
  if (!allowFailure) assert(result.ok, JSON.stringify(result))
  return allowFailure ? result : result.value
}
async function rpc(method, args) {
  assert(!method.startsWith('credentials/') && method !== 'session/prompt')
  return page.evaluate(async ({ method, args }) => {
    const response = await fetch(`/api/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method, payload: { args } }) })
    const result = await response.json()
    if (!response.ok || !result.result?.ok) throw new Error(`RPC ${method} failed`)
    return result.result.value
  }, { method, args })
}
const button = name => page.getByRole('button', { name, exact: true })
const card = id => page.locator(`[data-widget-id="${id}"]`)
const panel = () => page.locator('.dsh-widget-settings')
async function open() { await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click(); await page.locator('.dsh-home').waitFor(); await card('quick').waitFor() }
async function edit() { await button(/^(Edit layout|编辑布局)$/).click(); await page.locator('.dsh-home[data-editing=true]').waitFor(); await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click(); await page.locator('.dsh-tray').waitFor() }
async function done() { await button(/^(Done|完成)$/).click(); await page.locator('.dsh-home[data-editing=false]').waitFor() }
async function managerView(name) { await page.locator('.dsh-tray').getByRole('button', { name, exact: true }).click() }
async function add(type) {
  await managerView(/^(Add widgets|添加小组件)$/)
  const before = new Set((await api('workbench.get')).instances.map(item => item.instanceId))
  await page.locator(`.dsh-directory-item[data-widget-type="@vlln/dsh-home:${type}"]`).getByRole('button', { name: /^(Add|添加)$/ }).click()
  const added = await eventually(async () => (await api('workbench.get')).instances.find(item => !before.has(item.instanceId) && item.typeId === `@vlln/dsh-home:${type}`), `New ${type} instance persisted`)
  assert(added, `New ${type} instance missing`)
  return added.instanceId
}
async function settings(id) { await managerView(/^(On desktop|桌面组件)$/); await page.locator(`.dsh-instance-item[data-instance-id="${id}"]`).getByRole('button', { name: /^(Settings|设置)$/ }).click(); await panel().waitFor() }
async function save() { await panel().getByRole('button', { name: /^(Save|保存)$/ }).click(); await panel().waitFor({ state: 'hidden' }) }
async function cancel() { await panel().getByRole('button', { name: /^(Cancel|取消)$/ }).click(); await panel().waitFor({ state: 'hidden' }) }
const instance = async id => (await api('workbench.get')).instances.find(item => item.instanceId === id)
async function screenshot(name) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))) })
  await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: true, animations: 'disabled' })
}
try {
  freePort()
  for (const directory of [SITE, HOME, WORKSPACE, EVIDENCE, FIXTURE, env.HOME]) { await mkdir(directory, { recursive: true }); assert.equal(await realpath(directory), directory) }
  await owned(path.join(SITE, '.owned.json'), JSON.stringify({ owner: 'verify-builtin-widgets', port: PORT }) + '\n')
  await owned(path.join(WORKSPACE, 'AGENTS.md'), '# Disposable builtin-widget acceptance workspace\nSynthetic data only. Never submit model prompts.\n')
  await owned(path.join(SITE, 'verify.patch.yml'), `- id: workspace-controller\n  config:\n    documentsDirectory: ${JSON.stringify(WORKSPACE)}\n    documentsLookupTimeoutMs: 10000\n`)
  await owned(path.join(FIXTURE, 'package.json'), JSON.stringify({ name: '@vlln/dsh-home-builtin-fixture', version: '0.0.1', type: 'module', main: './index.mjs', files: ['index.mjs', 'cordis.patch.yml'], exports: { '.': './index.mjs', './cordis.patch.yml': './cordis.patch.yml', './package.json': './package.json' }, dsh: { bundle: { patch: './cordis.patch.yml' } } }, null, 2) + '\n')
  await owned(path.join(FIXTURE, 'cordis.patch.yml'), '- insert:\n    - id: builtin-fixture\n      name: "@vlln/dsh-home-builtin-fixture"\n')
  // Real persistence, not hand-written log formats: use the header version and event shape from official SDK contracts.
  await owned(path.join(FIXTURE, 'index.mjs'), `export const name='builtin-fixture'; export const inject=['sessionPersistence']; export async function apply(ctx){
    const persistence=ctx.get('sessionPersistence'); const now=Date.now();
    for(const [id,offset,cwd,count] of [['builtin-history-alpha',0,${JSON.stringify(WORKSPACE)},3],['builtin-history-beta',1,${JSON.stringify(WORKSPACE + '/beta')},2]]){
      if(await persistence.stat(id)) continue;
      const time=now-offset*86400000-60000; const handle=await persistence.create({version:4,id,createdAt:time-1000,cwd,isSeeded:false});
      try { await handle.append(Array.from({length:count},(_,seq)=>({type:'user/message',seq,time:time+seq,surfaceOp:'append',data:{id:id+'-message-'+seq,role:'user',source:{kind:'user'},content:[{type:'text',text:'Synthetic acceptance history '+seq}]}}))); await handle.flush(); }
      finally { await handle.close(); }
    }
    console.log('BUILTIN_HISTORY_FIXTURE_READY');
  }\n`)
  await command('npm', ['pack', '--ignore-scripts', '--pack-destination', SITE], 'pack-fixture', FIXTURE)
  await command(cli, ['plugin', '--profile', 'web', 'add', tarball], 'install-home')
  const installedClient = await readFile(path.join(HOME, 'profiles/web/node_modules/@vlln/dsh-home/lib/client.js'))
  const rootClient = await readFile(path.join(ROOT, 'lib/client.js'))
  const packedClient = execFileSync('/usr/bin/tar', ['-xOf', tarball, 'package/lib/client.js'])
  const digest = bytes => createHash('sha256').update(bytes).digest('hex')
  assert.equal(digest(installedClient), digest(rootClient), 'Installed client must match root built client')
  assert.equal(digest(installedClient), digest(packedClient), 'Installed client must match supplied tarball client')
  check('distribution installed client SHA256 matches both final tarball and root build', { clientSha256: digest(installedClient) })
  await command(cli, ['plugin', '--profile', 'web', 'add', path.join(SITE, 'vlln-dsh-home-builtin-fixture-0.0.1.tgz')], 'install-fixture')
  // Start from a real legacy quick document: migration must preserve these exact coordinates.
  const quickRect = { x: 0, y: 0, w: 4, h: 4 }
  const v2 = { version: 2, layout: { order: ['quick'], focusOrder: [], hidden: [], size: { quick: 's' }, positions: { 12: { quick: quickRect }, 6: { quick: { x: 0, y: 0, w: 3, h: 4 } }, 2: { quick: { x: 0, y: 0, w: 2, h: 4 } } } }, prefs: { lastSeenAt: null, dismissed: {} } }
  await mkdir(path.join(HOME, 'data/dsh-home'), { recursive: true })
  await owned(path.join(HOME, 'data/dsh-home/state.json'), JSON.stringify(v2, null, 2) + '\n')
  freePort()
  host = spawnOwn(cli, ['web', '--patch', path.join(SITE, 'verify.patch.yml'), '--host', '127.0.0.1', '--port', String(PORT), '--no-open'])
  const authUrl = await eventually(() => {
    assert.equal(host.exitCode, null, redact(host.output.slice(-6000)))
    return (host.output.match(/https?:\/\/[^\s<>"'\x1b]+/g) ?? []).find(raw => { try { const url = new URL(raw); return url.origin === ORIGIN && url.searchParams.has('token') } catch { return false } })
  }, 'isolated host authentication URL', 60000)
  await eventually(() => host.output.includes('BUILTIN_HISTORY_FIXTURE_READY'), 'real persistence fixture')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: 'en-US', timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' })
  await context.route('**/api/session/prompt', route => { promptAttempts++; return route.abort() })
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(redact(error.message)))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(redact(message.text())) })
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), () => page.getByRole('button', { name: 'Continue', exact: true }).click())
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), () => page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click())
  await page.goto(authUrl); await open()
  await rpc('settings/update', { ns: 'locale', patch: { preference: 'en' } }); await rpc('settings/update', { ns: 'ui-theme', patch: { preference: 'light' } })
  await page.reload(); await open()
  await eventually(async () => (await instance('quick')).configVersion === 2, 'quick migration')
  assert.deepEqual((await instance('quick')).config, { links: [] })
  assert.deepEqual((await api('workbench.get')).layout.positions['12'].quick, quickRect)
  check('legacy quick empty v1 migrates to v2 defaults with identity and saved geometry retained')
  await api('rescan')
  const activity = await eventually(async () => { const value = await api('activity', { timeZone: 'America/Los_Angeles' }); return value.complete && value.days.reduce((sum, day) => sum + day.messages, 0) === 5 ? value : false }, 'real activity scan of synthetic persisted user messages')
  assert.equal(activity.days.length, 365)
  const activeDay = activity.days.find(day => day.messages === 3)
  assert(activeDay)
  const clicked = await api('activity', { timeZone: 'America/Los_Angeles', date: activeDay.key })
  assert(clicked.sessions.some(session => session.id === 'builtin-history-alpha' && session.messages === 3))
  const filtered = await api('activity', { timeZone: 'America/Los_Angeles', cwd: WORKSPACE })
  assert.equal(filtered.days.reduce((sum, day) => sum + day.messages, 0), 3)
  check('real activity API aggregates five synthetic persisted messages, date lookup and exact workspace filter', { activeDay: activeDay.key })

  await edit()
  const notesA = await add('notes'), notesB = await add('notes'), clockA = await add('clock'), clockB = await add('clock'), activityId = await add('activity')
  await settings(notesA)
  await panel().getByRole('textbox', { name: 'Title (optional)', exact: true }).fill('Alpha note')
  await panel().getByRole('textbox', { name: 'Text', exact: true }).fill('Saved plain text <b>not HTML</b>')
  await save()
  await settings(notesB)
  await panel().getByRole('textbox', { name: 'Title (optional)', exact: true }).fill('Beta note')
  await panel().getByRole('textbox', { name: 'Text', exact: true }).fill('Independent second instance')
  await save()
  await settings(notesA); await panel().getByRole('textbox', { name: 'Text', exact: true }).fill('Canceled text'); await cancel()
  assert.equal((await instance(notesA)).config.text, 'Saved plain text <b>not HTML</b>')
  assert.equal((await instance(notesB)).config.text, 'Independent second instance')
  check('two notes add independently; settings Save persists and Cancel discards')
  for (const [id, zone, label] of [[clockA, 'Asia/Shanghai', 'Shanghai'], [clockB, 'America/Los_Angeles', 'Los Angeles']]) {
    await settings(id)
    await panel().getByRole('textbox', { name: 'Label (optional)', exact: true }).fill(label)
    await panel().getByRole('textbox', { name: 'Time zone', exact: true }).fill(zone)
    await save()
  }
  await settings(clockA); await panel().getByRole('textbox', { name: 'Time zone', exact: true }).fill('Invalid/Zone')
  await panel().getByRole('button', { name: 'Save', exact: true }).click()
  await panel().getByRole('alert').waitFor()
  assert.equal((await instance(clockA)).config.timeZone, 'Asia/Shanghai')
  await cancel()
  check('two clock zones save independently; invalid timezone Save rejected without altering persisted config')
  await settings('quick'); await panel().getByRole('button', { name: 'Add shortcut', exact: true }).click()
  await panel().getByRole('textbox', { name: 'Label', exact: true }).fill('Safe website')
  await panel().getByRole('textbox', { name: 'HTTP(S) address', exact: true }).fill('javascript:alert(1)')
  await panel().getByRole('button', { name: 'Save', exact: true }).click(); await panel().getByRole('alert').waitFor()
  assert.deepEqual((await instance('quick')).config, { links: [] })
  await panel().getByRole('textbox', { name: 'HTTP(S) address', exact: true }).fill('https://example.com/acceptance')
  await save()
  const draftCwd = path.join(WORKSPACE, 'quick-draft')
  await mkdir(draftCwd)
  await settings('quick'); await panel().getByRole('button', { name: 'Add shortcut', exact: true }).click()
  const draftRow = panel().locator('fieldset').nth(1)
  await draftRow.locator('select').selectOption('workdir')
  await draftRow.getByRole('textbox', { name: 'Label', exact: true }).fill('Blank workdir')
  await draftRow.getByRole('textbox', { name: 'Directory path', exact: true }).fill(draftCwd)
  await save()
  await settings(activityId); await panel().locator('select').nth(1).selectOption('quarter'); await save()
  await done()
  assert.equal(await card(notesA).locator('b').count(), 0)
  assert((await card(notesA).innerText()).includes('<b>not HTML</b>'))
  const safeLink = card('quick').getByRole('link', { name: 'Safe website' })
  assert.equal(await safeLink.getAttribute('href'), 'https://example.com/acceptance')
  assert.equal(await safeLink.getAttribute('target'), '_blank')
  assert.match(await safeLink.getAttribute('rel'), /noopener/); assert.match(await safeLink.getAttribute('rel'), /noreferrer/)
  check('quick unsafe URL Save rejected; HTTP(S) shortcut saved as native noopener/noreferrer anchor')
  await card('quick').getByRole('button', { name: /^Blank workdir/ }).click()
  const editor = () => page.locator('[contenteditable="true"][role="textbox"]').first()
  await editor().waitFor()
  assert.equal((await editor().innerText()).trim(), '')
  await editor().fill('Keep this unsent draft verbatim.')
  await open(); await card('quick').getByRole('button', { name: /^Blank workdir/ }).click()
  await editor().waitFor()
  assert.equal((await editor().innerText()).trim(), 'Keep this unsent draft verbatim.')
  const sessions = await rpc('session/list', { _request: {} })
  assert(sessions.items.some(row => row.cwd === draftCwd && row.blank && row.running === false))
  assert.equal(promptAttempts, 0)
  await open()
  check('real quick workdir opens blank unsent draft, retains existing text, leaves session blank/nonrunning')
  await eventually(async () => await card(activityId).locator('button[data-date]').count() === 84, 'quarter activity cells')
  await card(activityId).locator(`button[data-date="${activeDay.key}"]`).click()
  await card(activityId).locator('.dsh-activity-detail').waitFor()
  await card(activityId).locator('.dsh-activity-detail .dsh-row').filter({ hasText: path.basename(WORKSPACE) }).waitFor()
  check('activity quarter shows 84 date cells; clicking a real active date returns session detail')
  const keyboardDay = activity.days.find(day => day.messages > 0 && day.key !== activeDay.key)
  assert(keyboardDay)
  const activeCell = card(activityId).locator(`button[data-date="${keyboardDay.key}"]`)
  await activeCell.focus(); await activeCell.press('Enter')
  await card(activityId).locator('.dsh-activity-detail .dsh-row').filter({ hasText: 'beta' }).waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-date')), keyboardDay.key)
  check('activity date keyboard Enter retains focused grid cell while detail loads')
  await edit(); await settings(activityId); await panel().locator('select').nth(1).selectOption('year'); await save(); await done()
  await eventually(async () => await card(activityId).locator('button[data-date]').count() === 365, 'year activity cells')
  check('explicit year activity shows 365 selectable date cells')
  await page.reload(); await open()
  assert.equal((await instance(notesA)).config.text, 'Saved plain text <b>not HTML</b>')
  assert.equal((await instance(notesB)).config.text, 'Independent second instance')
  assert.equal((await instance(clockA)).config.timeZone, 'Asia/Shanghai')
  assert.equal((await instance(clockB)).config.timeZone, 'America/Los_Angeles')
  await card(clockA).getByText('Asia/Shanghai', { exact: true }).waitFor(); await card(clockB).getByText('America/Los_Angeles', { exact: true }).waitFor()
  check('notes, quick and two clock instance configs survive browser reload')
  // Only this owned synthetic desktop: make evidence readable without changing any default instances.
  const desktop = await api('workbench.get')
  const displayed = [activityId, 'quick', notesA, notesB, clockA, clockB]
  const rectangles = {
    [activityId]: { x: 0, y: 0, w: 8, h: 6 }, quick: { x: 8, y: 0, w: 4, h: 6 },
    [notesA]: { x: 0, y: 6, w: 3, h: 5 }, [notesB]: { x: 3, y: 6, w: 3, h: 5 },
    [clockA]: { x: 6, y: 6, w: 3, h: 5 }, [clockB]: { x: 9, y: 6, w: 3, h: 5 },
  }
  const layout = { ...desktop.layout, instanceLayout: true, order: displayed, focusOrder: [],
    hidden: desktop.instances.filter(item => !displayed.includes(item.instanceId)).map(item => item.instanceId),
    positions: { ...desktop.layout.positions, 12: rectangles } }
  await api('workbench.set', { layout, instances: desktop.instances })
  await page.reload(); await open()
  await card(activityId).locator('.dsh-activity-grid').waitFor()
  await eventually(() => card(activityId).locator('.dsh-activity-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1 || el.scrollLeft > 0), 'production year initially scrolls to latest activity')
  check('production overflowing year calendar opens at latest dates without test scrolling')
  await screenshot('builtin-en-light.png')
  await rpc('settings/update', { ns: 'locale', patch: { preference: 'zh' } }); await rpc('settings/update', { ns: 'ui-theme', patch: { preference: 'dark' } })
  await page.reload(); await open()
  await eventually(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme')), 'real dark theme applied')
  await card(notesA).getByRole('heading', { name: '便笺', exact: true }).waitFor()
  await screenshot('builtin-zh-dark.png')
  check('real isolated-host locale/theme settings render English/light and Chinese/dark screenshots')
  await page.setViewportSize({ width: 600, height: 1000 })
  await eventually(async () => {
    const state = await page.evaluate(() => {
      const home = document.querySelector('.dsh-home'), surface = document.querySelector('.dsh-spatial-container')
      return { cols: Number(surface.dataset.cols), boardScrolls: home.scrollWidth > home.clientWidth + 1,
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
    })
    return state.cols >= 12 && state.boardScrolls && !state.documentOverflow
  }, 'narrow window scrolls the fixed board without document overflow')
  await eventually(async () => await card(activityId).locator('button[data-date]').count() === 365, 'explicit year retained narrow')
  await eventually(async () => await card(activityId).evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'narrow activity card settled without internal overflow')
  await screenshot('builtin-narrow.png')
  check('600px viewport keeps the fixed 12+ column board, scrolls it horizontally and never overflows the document; year retained')
  assert.equal(promptAttempts, 0)
  assert.deepEqual(report.errors, [])
  assert(!/did not activate|plugin tree failed|BUILTIN.*Error/.test(host.output), 'Host contains activation failure')
  check('no model requests, browser console errors, or plugin activation errors')
} catch (error) {
  report.failure = redact(error.stack ?? error); console.error(report.failure); process.exitCode = 1
  await page?.screenshot({ path: path.join(EVIDENCE, 'failure.png'), fullPage: true }).catch(() => {})
} finally {
  await cleanup().catch(error => { report.errors.push(redact(error)); process.exitCode = 1 })
  await mkdir(EVIDENCE, { recursive: true })
  await writeFile(path.join(EVIDENCE, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`Evidence: ${EVIDENCE}`)
  console.log(`[exit code: ${process.exitCode ?? 0}]`)
}
