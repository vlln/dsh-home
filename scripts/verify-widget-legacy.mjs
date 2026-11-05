#!/usr/bin/env node
/** Standalone legacy-slot + v2/future acceptance. Owns only .work/dsh-home/widget-legacy. */
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = path.resolve(ROOT, '../.work/dsh-home/widget-legacy', `run-${Date.now()}`)
const HOME = path.join(SITE, 'dsh')
const EVIDENCE = path.join(SITE, 'evidence')
const WORKSPACE = path.join(SITE, 'workspace')
const FIXTURE = path.join(SITE, 'fixture')
const ORIGIN = 'http://127.0.0.1:3188'
const cli = await realpath(execFileSync('/usr/bin/which', ['dsh'], { encoding: 'utf8' }).trim())
const tarballInput = process.argv[2] ?? process.env.DSH_HOME_TARBALL
assert(tarballInput, 'Supply a package tarball positional argument or DSH_HOME_TARBALL explicitly')
const tarball = await realpath(path.resolve(tarballInput))
const report = { origin: ORIGIN, tarball, site: SITE, checks: [], errors: [], expectedErrors: [], failure: null }
let expectReadonlyFailure = false
const children = new Set()
let host, browser, page
const redact = value => String(value).replace(/([?&]token=)[^\s"'<>]+/gi, '$1[REDACTED]').replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = name => { report.checks.push(name); console.log(`PASS ${name}`) }
const env = { PATH: process.env.PATH, HOME: path.join(SITE, 'os-home'), DSH_HOME: HOME, LANG: 'en_US.UTF-8', DSH_TELEMETRY: '0', NO_COLOR: '1', CI: '1', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' }
for (const key of ['TMPDIR', 'SYSTEMROOT', 'NODE_EXTRA_CA_CERTS']) if (process.env[key]) env[key] = process.env[key]
function freePort() {
  try { assert.fail(execFileSync('/usr/sbin/lsof', ['-nP', '-iTCP:3188', '-sTCP:LISTEN'], { encoding: 'utf8' })) }
  catch (error) { if (error.status === 1 && !error.stdout?.length) return; throw error }
}
async function owned(file, content) {
  if (existsSync(file)) { assert.equal(await readFile(file, 'utf8'), content, `Existing fixture mismatch: ${file}`); return }
  await writeFile(file, content, { flag: 'wx', mode: 0o600 })
}
function spawnOwn(command, args, cwd = WORKSPACE) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.add(child); child.output = ''
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { child.output += data.toString() })
  child.on('exit', () => children.delete(child))
  return child
}
async function command(command, args, label, cwd) {
  const child = spawnOwn(command, args, cwd)
  const [code] = await once(child, 'exit')
  await writeFile(path.join(EVIDENCE, `${label}.log`), redact(child.output))
  assert.equal(code, 0, `${label}: ${redact(child.output.slice(-5000))}`)
  return child.output
}
async function eventually(fn, label, timeout = 45_000) {
  const until = Date.now() + timeout; let reason
  while (Date.now() < until) {
    try { const result = await fn(); if (result) return result } catch (error) { reason = error }
    await delay(150)
  }
  throw new Error(`${label} timed out: ${reason ? redact(reason.message) : ''}`)
}
async function stop(label) {
  if (!host) return
  if (host.exitCode === null && host.signalCode === null) {
    const exited = once(host, 'exit'); host.kill('SIGTERM')
    if (!await Promise.race([exited.then(() => true), delay(12000).then(() => false)])) { host.kill('SIGKILL'); await exited }
  }
  await writeFile(path.join(EVIDENCE, `${label}.log`), redact(host.output)); host = null
  freePort()
}
async function launch(label) {
  freePort()
  host = spawnOwn(cli, ['web', '--patch', path.join(SITE, 'verify.patch.yml'), '--host', '127.0.0.1', '--port', '3188', '--no-open'])
  const authUrl = await eventually(() => {
    assert.equal(host.exitCode, null, redact(host.output.slice(-5000)))
    return (host.output.match(/https?:\/\/[^\s<>"'\x1b]+/g) ?? []).find(raw => { try { const url = new URL(raw); return url.origin === ORIGIN && url.searchParams.has('token') } catch { return false } })
  }, `${label} ready`, 60000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US', reducedMotion: 'reduce' })
  await context.route('**/api/session/prompt', route => { report.errors.push('Forbidden model request'); return route.abort() })
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(redact(error.message)))
  page.on('console', msg => {
    if (msg.type() !== 'error') return
    const text = redact(msg.text())
    if (text.includes('[dsh-home] legacy widget registration failed invalid whitespace')
      || (expectReadonlyFailure && text.includes('409 (Conflict)'))) report.expectedErrors.push(text)
    else report.errors.push(text)
  })
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), () => page.getByRole('button', { name: 'Continue', exact: true }).click())
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), () => page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click())
  await page.goto(authUrl)
  await open()
  return context
}
async function open() {
  await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
  await page.locator('.dsh-home').waitFor()
  await page.locator('[data-widget-id="recent"]').waitFor()
}
async function api(op, extra = {}, allowFailure = false) {
  const result = await page.evaluate(async ({ op, extra }) => {
    const response = await fetch('/plugins/dsh-home/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op, ...extra }) })
    return { status: response.status, ...(await response.json()) }
  }, { op, extra })
  if (!allowFailure) assert(result.ok, JSON.stringify(result))
  return allowFailure ? result : result.value
}
const button = name => page.getByRole('button', { name, exact: true })
const edit = async () => { await button(/^(Edit layout|编辑布局)$/).click(); await page.locator('.dsh-home[data-editing=true]').waitFor() }
const tray = async () => { await page.locator('.dsh-edit-bar').getByRole('button', { name: /^(Widgets|小组件)$/ }).click(); await page.locator('.dsh-tray').waitFor() }
const done = async () => { await button(/^(Done|完成)$/).click(); await page.locator('.dsh-home[data-editing=false]').waitFor() }
const row = id => page.locator(`.dsh-instance-item[data-instance-id="${id}"]`)
const card = id => page.locator(`[data-widget-id="${id}"]`)
const rectangle = (x, y, w, h = 4) => ({ x, y, w, h })
const statePath = path.join(HOME, 'data/dsh-home/state.json')
try {
  freePort()
  for (const dir of [SITE, HOME, EVIDENCE, WORKSPACE, FIXTURE, env.HOME]) { await mkdir(dir, { recursive: true }); assert.equal(await realpath(dir), dir) }
  await owned(path.join(SITE, '.owned.json'), JSON.stringify({ owner: 'verify-widget-legacy', port: 3188 }) + '\n')
  await owned(path.join(SITE, 'verify.patch.yml'), `- id: workspace-controller\n  config:\n    documentsDirectory: ${JSON.stringify(WORKSPACE)}\n    documentsLookupTimeoutMs: 10000\n`)
  await owned(path.join(FIXTURE, 'package.json'), JSON.stringify({ name: '@vlln/dsh-home-legacy-probe', version: '0.0.1', type: 'module', main: './index.mjs', files: ['index.mjs', 'client.js', 'cordis.patch.yml'], exports: { '.': './index.mjs', './client': './client.js', './package.json': './package.json', './cordis.patch.yml': './cordis.patch.yml' }, dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', external: ['@vlln/dsh-home'] } } }, null, 2) + '\n')
  await owned(path.join(FIXTURE, 'index.mjs'), 'export const name = "legacy-probe"; export function apply() {}\n')
  await owned(path.join(FIXTURE, 'cordis.patch.yml'), '- insert:\n    - id: legacy-probe\n      name: "@vlln/dsh-home-legacy-probe"\n')
  await owned(path.join(FIXTURE, 'client.js'), `window.__ModuleLoader__.load({id:"@vlln/dsh-home-legacy-probe",factory:(require)=>{var React=require("react"); return {name:"legacy-probe",inject:["slots","homeWidgets"],apply(ctx){ctx.effect(()=>ctx.homeWidgets.register({typeId:"@fixture/widgets:bounded",apiVersion:1,title:"Bounded fixture",configVersion:1,defaultConfig:()=>({}),validateConfig:()=>true,defaults:{size:"s",height:4,minWidth:3,maxWidth:4,minHeight:3,maxHeight:5},Content:()=>React.createElement("div",{"data-bounded-fixture":""},"Bounded fixture content")}));ctx.slots.inject("home.widget",()=>{const disposers=[]; for(const id of ["legacy-probe","recent","invalid whitespace","unreferenced-probe"]){function Content(props){const [count,setCount]=React.useState(0);return React.createElement("div",{"data-legacy-probe":id,"data-size-received":props.size,"data-prop-keys":Object.keys(props).sort().join(",")},React.createElement("span",{"data-legacy-count":""},String(count)),React.createElement("button",{onClick:()=>setCount(v=>v+1)},"Legacy increment"))} disposers.push(ctx.slots.register({name:"home.widget",id,label:id},Content));} return ()=>disposers.reverse().forEach(off=>off());});}};}});\n`)
  await command('npm', ['pack', '--ignore-scripts', '--pack-destination', SITE], 'pack-probe', FIXTURE)
  await command(cli, ['plugin', '--profile', 'web', 'add', tarball], 'install-home')
  await command(cli, ['plugin', '--profile', 'web', 'add', path.join(SITE, 'vlln-dsh-home-legacy-probe-0.0.1.tgz')], 'install-probe')
  const v2 = { version: 2, layout: { order: ['legacy-probe', 'recent'], focusOrder: ['today', 'queue', 'resume'], hidden: [], size: { 'legacy-probe': 's' }, positions: { 12: { 'legacy-probe': rectangle(8, 0, 4) }, 6: { 'legacy-probe': rectangle(3, 40, 3) }, 2: { 'legacy-probe': rectangle(0, 90, 2) } } }, prefs: { lastSeenAt: 100, dismissed: { untouched: 99 } } }
  await mkdir(path.dirname(statePath), { recursive: true })
  assert(!existsSync(statePath), 'Use a fresh fixture site; never overwrite existing state')
  const v2Bytes = JSON.stringify(v2, null, 2) + '\n'
  await writeFile(statePath, v2Bytes)
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  let context = await launch('legacy')
  await card('legacy-probe').locator('[data-legacy-probe="legacy-probe"]').waitFor()
  let document = await api('workbench.get')
  const migrated = document.instances.find(item => item.instanceId === 'legacy-probe')
  assert.deepEqual(migrated, { instanceId: 'legacy-probe', typeId: 'legacy:legacy-probe', configVersion: 1, config: {} })
  for (const cols of ['12', '6', '2']) assert.deepEqual(document.layout.positions[cols]['legacy-probe'], v2.layout.positions[cols]['legacy-probe'])
  assert.equal(await card('legacy-probe').locator('[data-legacy-probe]').getAttribute('data-size-received'), 's')
  assert.equal(await card('recent').locator('[data-legacy-probe="recent"]').count(), 0)
  assert.equal(document.instances.filter(item => item.instanceId === 'recent').length, 1)
  assert(!document.instances.some(item => item.typeId === 'legacy:unreferenced-probe'))
  check('real v2 migration retains legacy identity, exact 12/6/2 geometry, builtin collision wins, no unreferenced auto-install')
  await page.screenshot({ path: path.join(EVIDENCE, 'migrated.png'), fullPage: true })
  await edit(); await tray()
  assert.equal(await page.locator('[data-widget-type="legacy:invalid whitespace"].dsh-directory-item').count(), 0)
  await row('legacy-probe').getByRole('button', { name: /^(Hide|隐藏)$/ }).click()
  await card('legacy-probe').waitFor({ state: 'hidden' })
  await row('legacy-probe').getByRole('button', { name: /^(Show|显示)$/ }).click()
  await card('legacy-probe').waitFor()
  await row('legacy-probe').getByRole('button', { name: /^(Duplicate|复制)$/ }).click()
  await done()
  document = await api('workbench.get')
  const copy = document.instances.find(item => item.typeId === 'legacy:legacy-probe' && item.instanceId !== 'legacy-probe')
  assert(copy)
  await card('legacy-probe').getByRole('button', { name: 'Legacy increment' }).click()
  assert.equal(await card('legacy-probe').locator('[data-legacy-count]').innerText(), '1')
  assert.equal(await card(copy.instanceId).locator('[data-legacy-count]').innerText(), '0')
  check('legacy size prop, hide/show, duplicate and independent React state work through real slot renderer')
  await edit(); await tray()
  await row('legacy-probe').getByRole('button', { name: /^(Delete|删除)$/ }).click()
  await row('legacy-probe').getByRole('button', { name: /^(Confirm delete|确认删除)$/ }).click()
  await done(); await page.reload(); await open()
  document = await api('workbench.get')
  assert(!document.instances.some(item => item.instanceId === 'legacy-probe'))
  assert(document.instances.some(item => item.instanceId === copy.instanceId))
  check('deleted migrated legacy instance does not resurrect on browser reload')
  // Add unreferenced legacy definition explicitly through the directory.
  await edit(); await tray()
  await page.locator('[data-widget-type="legacy:unreferenced-probe"].dsh-directory-item').getByRole('button', { name: /^(Add|添加)$/ }).click()
  await done()
  document = await api('workbench.get')
  assert(document.instances.some(item => item.typeId === 'legacy:unreferenced-probe'))
  const boundedType = '@fixture/widgets:bounded'
  await edit(); await tray()
  await page.locator(`[data-widget-type="${boundedType}"].dsh-directory-item`).getByRole('button', { name: /^(Add|添加)$/ }).click()
  await done()
  document = await api('workbench.get')
  const bounded = document.instances.find(item => item.typeId === boundedType)
  assert(bounded)
  assert.equal(document.layout.positions['12'][bounded.instanceId].w, 4)
  assert.equal(document.layout.positions['12'][bounded.instanceId].h, 4)
  const beforeResize = await card(bounded.instanceId).boundingBox()
  await edit()
  const handle = card(bounded.instanceId).locator('.react-resizable-handle-se')
  await handle.scrollIntoViewIfNeeded()
  const handleBox = await handle.boundingBox(); assert(handleBox)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down(); await page.mouse.move(handleBox.x + 350, handleBox.y + 350, { steps: 15 }); await page.mouse.up()
  await done()
  document = await api('workbench.get')
  const resized = document.layout.positions['12'][bounded.instanceId]
  assert(resized.w <= 4 && resized.h <= 5, `Constrained resize escaped limits: ${JSON.stringify(resized)}`)
  check('new bounded definition defaults to4x4 and real mouse resize respects maxWidth4/maxHeight5')
  // A provider tightening defaults must not rewrite previously saved geometry on mount.
  const seeded = structuredClone(document)
  seeded.layout.positions['12'][bounded.instanceId] = rectangle(0, 500, 8, 8)
  await api('workbench.set', { layout: seeded.layout, instances: seeded.instances })
  await page.reload(); await open()
  const savedShell = await card(bounded.instanceId).boundingBox(); assert(savedShell && beforeResize)
  const surfaceWidth = await page.locator('.dsh-spatial-container').evaluate(node => node.clientWidth)
  const expectedWidth = (surfaceWidth - 12 * 11) / 12 * 8 + 12 * 7
  const actual = { width: savedShell.width, height: savedShell.height, expectedWidth, expectedHeight: 8 * 44 + 7 * 12 }
  await writeFile(path.join(EVIDENCE, 'bounded-geometry.json'), JSON.stringify(actual, null, 2))
  assert(Math.abs(savedShell.width - expectedWidth) <= 2 && Math.abs(savedShell.height - actual.expectedHeight) <= 2,
    `Saved8x8 clamped on mount: ${JSON.stringify(actual)}`)
  document = await api('workbench.get')
  assert.deepEqual(document.layout.positions['12'][bounded.instanceId], rectangle(0, 500, 8, 8))
  check('saved8x8 geometry is retained on real RGL mount despite new provider max4x5')
  const preserved = structuredClone(document)
  await page.screenshot({ path: path.join(EVIDENCE, 'legacy-duplicate.png'), fullPage: true })
  await context.close(); await stop('legacy-host')
  await command(cli, ['plugin', '--profile', 'web', 'remove', '@vlln/dsh-home-legacy-probe'], 'remove-probe')
  context = await launch('missing')
  await card(copy.instanceId).getByRole('status').waitFor()
  document = await api('workbench.get')
  assert.deepEqual(document.instances, preserved.instances)
  assert.deepEqual(document.layout, preserved.layout)
  await page.screenshot({ path: path.join(EVIDENCE, 'missing-placeholder.png'), fullPage: true })
  check('uninstalled legacy provider leaves durable placeholders, configs and every coordinate unchanged')
  await context.close(); await stop('missing-host')
  const future = JSON.stringify({ version: 999, future: { untouched: true }, layout: { custom: true }, prefs: { lastSeenAt: 55 } }, null, 2) + '\n'
  // Known owned state, after the fixture server is fully stopped.
  await readFile(statePath, 'utf8'); await writeFile(statePath, future)
  context = await launch('future')
  await page.locator('.dsh-workbench-notice[role="alert"]').waitFor()
  assert.equal(await button(/^(Edit layout|编辑布局)$/).isDisabled(), true)
  document = await api('workbench.get'); assert.equal(document.storage.writable, false)
  expectReadonlyFailure = true
  const failed = await api('prefs.set', { prefs: { lastSeenAt: Date.now(), dismissed: {} } }, true)
  assert.equal(failed.status, 409)
  assert.equal(await readFile(statePath, 'utf8'), future)
  await page.screenshot({ path: path.join(EVIDENCE, 'future-readonly.png'), fullPage: true })
  await page.reload(); await open()
  assert.equal(await readFile(statePath, 'utf8'), future)
  check('future document readonly is visible in real Chrome; markSeen and explicit prefs writes preserve exact bytes')
  await context.close(); await stop('future-host')
  assert.deepEqual(report.errors, [])
} catch (error) {
  report.failure = redact(error.stack ?? error)
  console.error(report.failure)
  await page?.screenshot({ path: path.join(EVIDENCE, 'failure.png'), fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  await stop('final-host').catch(error => { report.errors.push(redact(error)); process.exitCode = 1 })
  for (const child of children) child.kill('SIGTERM')
  await mkdir(EVIDENCE, { recursive: true })
  await writeFile(path.join(EVIDENCE, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`[exit code: ${process.exitCode ?? 0}]`)
}
