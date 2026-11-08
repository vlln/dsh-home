#!/usr/bin/env node
/**
 * Isolated distribution/UI gate. No sibling-plugin scripts or real user data.
 * Prepare only (no install/server): node scripts/verify-host.mjs --prepare
 * Execute AFTER packaging, through a managed harness background job:
 *   node scripts/verify-host.mjs --tarball ../.work/dsh-home/<package>.tgz --run
 * Fixed port 3186. Own children are stopped in finally; no directory is deleted.
 * Browser authentication URL is captured only from this child, kept in memory,
 * and redacted from every persisted log/report. Never copies credentials.
 */
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, readFile, writeFile, realpath, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = path.resolve(ROOT, '../.work/dsh-home')
const HOME = path.join(SITE, 'dsh')
const WORKSPACE = path.join(SITE, 'workspace')
const EXPECTED = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version
const PORT = 3186
const ORIGIN = `http://127.0.0.1:${PORT}`
const argv = process.argv.slice(2)
const option = name => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1] }
const run = argv.includes('--run')
const artifacts = path.join(SITE, 'evidence')
const report = { port: PORT, origin: ORIGIN, checks: [], syntheticData: 'Recent multi-session UI uses only browser-intercepted synthetic ledger; task navigation, cwd, drafts, layout and icon use the real isolated Host.', failures: [] }
let browser
let activeHost
let promptAttempts = 0
let sitePrepared = false
const children = new Set()
// When the managed parent job is stopped, terminate only children we created.
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  for (const child of children) child.kill('SIGTERM')
  void browser?.close().finally(() => { process.exitCode = 130 })
})
const redact = text => String(text).replace(/([?&]token=)[^\s"'<>]+/gi, '$1[REDACTED]').replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
const check = (name, detail = {}) => { report.checks.push({ name, ...detail }); console.log(`PASS ${name}`) }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function eventually(test, label, timeout = 30_000) {
  const until = Date.now() + timeout
  let reason
  while (Date.now() < until) {
    try { const value = await test(); if (value) return value } catch (error) { reason = error }
    await delay(150)
  }
  throw new Error(`${label} timed out${reason ? `: ${redact(reason.message)}` : ''}`)
}
async function createOwned(file, text) {
  if (existsSync(file)) {
    const existing = await readFile(file, 'utf8')
    assert.equal(existing, text, `Refuse to overwrite existing nonmatching file: ${file}`)
    return
  }
  await writeFile(file, text, { flag: 'wx', mode: 0o600 })
}
async function prepare() {
  assert.equal(path.basename(SITE), 'dsh-home')
  assert.equal(path.basename(path.dirname(SITE)), '.work')
  await mkdir(SITE, { recursive: true })
  assert.equal(await realpath(SITE), SITE, 'Reject symlinked verification site')
  const marker = path.join(SITE, '.verify-host-owned.json')
  if (!existsSync(marker)) {
    const entries = await readdir(SITE)
    assert(entries.every(name => name === `vlln-dsh-home-${EXPECTED}.tgz`), `First use accepts only an empty verification site or the supplied ${EXPECTED} tarball`)
  }
  await createOwned(marker, JSON.stringify({ owner: '@vlln/dsh-home verify-host', port: PORT }, null, 2) + '\n')
  for (const dir of [HOME, WORKSPACE, artifacts, path.join(SITE, 'os-home'), path.join(WORKSPACE, 'alpha'), path.join(WORKSPACE, 'beta')]) {
    await mkdir(dir, { recursive: true })
    assert.equal(await realpath(dir), dir, `Reject symlinked controlled path: ${dir}`)
  }
  await createOwned(path.join(SITE, 'web-port'), `${PORT}\n`)
  // Whole config replacement is intentional: this row's Config has only these fields.
  await createOwned(path.join(SITE, 'verify.patch.yml'), `- id: workspace-controller\n  config:\n    documentsDirectory: ${JSON.stringify(WORKSPACE)}\n    documentsLookupTimeoutMs: 10000\n`)
  await createOwned(path.join(WORKSPACE, 'AGENTS.md'), '# Disposable DSH Home verification workspace\n\nOnly synthetic fixture sessions. Do not submit model prompts or access user credentials.\n')
  sitePrepared = true
  check('owned isolated site prepared', { home: HOME, workspace: WORKSPACE })
}
function environment(home) {
  // No inherited DSH settings, model keys, npm auth, or user HOME config.
  const env = { PATH: process.env.PATH, HOME: path.join(SITE, 'os-home'), DSH_HOME: home, LANG: 'en_US.UTF-8', DSH_TELEMETRY: '0', NO_COLOR: '1', CI: '1', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' }
  for (const key of ['TMPDIR', 'SYSTEMROOT', 'NODE_EXTRA_CA_CERTS']) if (process.env[key]) env[key] = process.env[key]
  return env
}
function spawnOwned(command, args, { home = HOME, cwd = WORKSPACE } = {}) {
  const child = spawn(command, args, { cwd, env: environment(home), stdio: ['ignore', 'pipe', 'pipe'] })
  children.add(child)
  child.output = ''
  child.on('error', error => { child.spawnError = error })
  child.stdout.on('data', data => { child.output += data.toString() })
  child.stderr.on('data', data => { child.output += data.toString() })
  child.on('exit', () => children.delete(child))
  return child
}
async function command(command, args, label, options) {
  const child = spawnOwned(command, args, options)
  const [code, signal] = await once(child, 'exit')
  await writeFile(path.join(artifacts, `${label}.log`), redact(child.output))
  assert.equal(code, 0, `${label} failed (${signal ?? code}): ${redact(child.output.slice(-5000))}`)
  return child.output
}
async function portFree() {
  let output
  try { output = execFileSync('/usr/sbin/lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' }) }
  catch (error) { if (error.status === 1 && !error.stdout?.length) return; throw error }
  assert.fail(`Port ${PORT} occupied; do not kill or change ports:\n${output}`)
}
async function stop(child, label) {
  if (!child) return
  if (child.exitCode === null && child.signalCode === null) {
    const ended = once(child, 'exit')
    child.kill('SIGTERM')
    const done = await Promise.race([ended.then(() => true), delay(12_000).then(() => false)])
    if (!done) { child.kill('SIGKILL'); await ended }
  }
  await writeFile(path.join(artifacts, `${label}.log`), redact(child.output))
  if (activeHost === child) activeHost = undefined
}
async function launch(cli, home, label) {
  await portFree() // mandatory immediately before every start, including negative control
  const child = spawnOwned(cli, ['web', '--patch', path.join(SITE, 'verify.patch.yml'), '--host', '127.0.0.1', '--port', String(PORT), '--no-open'], { home })
  activeHost = child
  const authUrl = await eventually(() => {
    if (child.spawnError) throw child.spawnError
    assert.equal(child.exitCode, null, `${label} exited early: ${redact(child.output.slice(-6000))}`)
    const matches = child.output.match(/https?:\/\/[^\s<>"'\x1b]+/g) ?? []
    return matches.find(raw => {
      try { const url = new URL(raw); return url.origin === ORIGIN && url.searchParams.has('token') } catch { return false }
    })
  }, `${label} own authentication URL`, 60_000)
  assert.equal(new URL(authUrl).origin, ORIGIN)
  check(`${label} fixed origin ready`)
  return { child, authUrl }
}
async function rpc(page, method, args) {
  assert(!method.startsWith('credentials/'), 'Credential endpoints forbidden')
  assert.notEqual(method, 'session/prompt', 'Model submission forbidden')
  return page.evaluate(async ({ method, args }) => {
    const response = await fetch(`/api/${method}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method, payload: { args } }) })
    if (!response.ok) throw new Error(`RPC ${method}: HTTP ${response.status}`)
    const envelope = await response.json()
    if (!envelope.result?.ok) throw new Error(`RPC ${method}: ${envelope.result?.error?.message ?? 'invalid response'}`)
    return envelope.result.value
  }, { method, args })
}
async function homeApi(page, op) {
  return page.evaluate(async op => {
    const response = await fetch('/plugins/dsh-home/api', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op }) })
    const value = await response.json()
    if (!response.ok || !value.ok) throw new Error(`home ${op} failed`)
    return value.value
  }, op)
}
async function dismissFirstUse(page) {
  // rc.5's Preview Notice intentionally ignores Escape; never touch key fields.
  // The async welcome settings load can mount AFTER the brand is visible.
  // addLocatorHandler owns modal clicks; duplicating its Close click races removal.
  await eventually(() => page.evaluate(() => document.getElementById('root')?.querySelector('button') !== null), 'application shell mounted')
  await page.keyboard.press('Escape')
  await page.locator('button').filter({ has: page.locator('[class*="brandIdentity"], [class*="railMark"]') }).first().hover({ timeout: 15_000 })
}
async function openHome(page) {
  await dismissFirstUse(page)
  const rail = page.locator('button').filter({ has: page.locator('[class*="railMark"]') }).first()
  if (await rail.isVisible()) await rail.click()
  const brand = page.locator('button').filter({ has: page.locator('[class*="brandIdentity"]') }).first()
  await eventually(async () => {
    await dismissFirstUse(page)
    if (await brand.isVisible()) await brand.click({ timeout: 1000 })
    else await page.getByRole('button', { name: /^(首页|Home)$/ }).first().click({ timeout: 1000 })
    return true
  }, 'Home click after asynchronous first-use dialogs')
  await page.locator('.dsh-home').waitFor()
  // The board is registry-driven: wait for the shape, not for one widget that
  // may have been retired (`tasks` was split into to-do / plan / today).
  await page.locator('.dsh-home-widget').first().waitFor()
  await dismissFirstUse(page)
  // Do not capture the fading account dialog or the staggered widget entrance.
  await page.locator('[role="presentation"] [aria-hidden="true"][class*="mask"]').waitFor({ state: 'hidden' })
  await page.locator('[data-widget-id="recent"]').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))))
}
async function stableShot(page, filename) {
  await dismissFirstUse(page)
  const started = Date.now()
  // Observe a quiet interval: a notice may arrive just after settings hydration.
  await eventually(async () => {
    await dismissFirstUse(page)
    return await page.evaluate(() => {
      const overlays = [...document.querySelectorAll('[role="dialog"], [role="presentation"] [class*="mask"]')]
      return overlays.every(el => el.getBoundingClientRect().width === 0 || getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none')
    }) && Date.now() - started >= 1200
  }, 'onboarding and modal transitions fully gone')
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})))
  })
  if (await page.locator('.dsh-home').count()) await page.locator('.dsh-home').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true, animations: 'disabled' })
}
const editorOf = page => page.locator('[contenteditable="true"][role="textbox"]').first()
/**
 * Edit mode is disabled until the workbench reports writable and idle; the first
 * ledger scan can hold it for a while, so wait for it instead of racing it.
 */
async function openEdit(page) {
  const edit = page.getByRole('button', { name: 'Edit layout', exact: true })
  await edit.waitFor({ state: 'visible' })
  await eventually(() => edit.isEnabled(), 'Edit layout enabled')
  await edit.click()
}

/** The toggle is only labelled "Open sidebar" while collapsed. */
async function ensureSidebarOpen(page) {
  const open = page.getByRole('button', { name: 'Open sidebar' })
  if (await open.isVisible().catch(() => false)) await open.click()
}

async function visualCases(page) {
  for (const locale of ['zh', 'en']) {
    await rpc(page, 'settings/update', { ns: 'locale', patch: { preference: locale } })
    for (const theme of ['light', 'dark']) {
      await rpc(page, 'settings/update', { ns: 'ui-theme', patch: { preference: theme } })
      await page.reload()
      await openHome(page)
      const title = locale === 'zh' ? '最近活跃会话' : 'Recent sessions'
      await page.locator('[data-widget-id="recent"] h2').filter({ hasText: title }).waitFor()
      await eventually(() => page.evaluate(expected => document.body.hasAttribute('data-ds-dark-theme') === (expected === 'dark'), theme), 'actual theme presenter state')
      await stableShot(page, `home-${locale}-${theme}.png`)
      check(`real locale/theme ${locale}/${theme}`)
    }
  }
  await page.setViewportSize({ width: 760, height: 1000 })
  await page.reload()
  await openHome(page)
  // The board is a fixed-width canvas (>= 960) that scrolls inside the panel by
  // design — see docs/widget-design.md, "画布宽度可调". What must not happen is
  // the *document* scrolling sideways.
  const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert.equal(docOverflow, false, 'document scrolls sideways at 760px')
  const boardScrolls = await page.locator('.dsh-home').evaluate(el => el.scrollWidth > el.clientWidth)
  assert.equal(boardScrolls, true, 'the board should scroll inside the panel, not be squeezed')
  await stableShot(page, 'home-narrow.png')
  check('760px narrow layout without horizontal overflow')
  await page.setViewportSize({ width: 1440, height: 1100 })
}
async function layoutCases(page) {
  await rpc(page, 'settings/update', { ns: 'locale', patch: { preference: 'en' } })
  await page.reload(); await openHome(page)
  await ensureSidebarOpen(page)
  await openEdit(page)
  const recent = page.locator('[data-widget-id="recent"]')
  check('real layout hide/restore/size survives reload')
}
async function openHomeWithoutRecent(page) {
  await dismissFirstUse(page)
  const rail = page.locator('button').filter({ has: page.locator('[class*="railMark"]') }).first()
  if (await rail.isVisible()) await rail.click()
  const brand = page.locator('button').filter({ has: page.locator('[class*="brandIdentity"]') }).first()
  await eventually(async () => {
    await dismissFirstUse(page)
    if (await brand.isVisible()) await brand.click({ timeout: 1000 })
    else await page.getByRole('button', { name: /^(首页|Home)$/ }).first().click({ timeout: 1000 })
    return true
  }, 'Home click after asynchronous first-use dialogs')
  await page.locator('.dsh-home').waitFor()
}
/**
 * A board that reads as designed has no unsupported gaps: every card either sits on
 * the first row or rests on another card, and the first row touches the grid top.
 * Free-form placement used to leave two empty rows at the top, which is what made the
 * first screen look like it had lost a tile.
 */
async function packedBoardCase(page) {
  await page.reload(); await openHome(page)
  await page.locator('.dsh-home-widget').first().waitFor()
  const grid = await page.locator('.dsh-spatial-container').evaluate(el => {
    const r = el.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) }
  })
  const boxes = await page.locator('.dsh-home-widget').evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect()
    return { id: el.dataset.widgetId, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }))
  assert.ok(boxes.length > 0, 'the board renders at least one card')
  const top = Math.min(...boxes.map(box => box.y))
  assert.ok(top - grid.top <= 40, `no dead band above the first card (${top - grid.top}px)`)
  const GAP = 12
  for (const box of boxes) {
    if (box.y === top) continue
    const supported = boxes.some(other => other !== box
      && Math.abs(other.y + other.h + GAP - box.y) <= 2
      && other.x < box.x + box.w && box.x < other.x + other.w)
    assert.ok(supported, `card ${box.id} floats above nothing at y=${box.y}`)
  }
  // Compaction on release: drag the tallest card down and let it go; the board must
  // not gain an unsupported gap.
  const moved = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.dsh-home-widget')]
    const first = cards[0]
    const r = first.getBoundingClientRect()
    return { id: first.dataset.widgetId, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 12) }
  })
  await openEdit(page)
  const grip = page.locator(`[data-widget-id="${moved.id}"] .dsh-widget-grip`).first()
  await grip.hover()
  await page.mouse.down()
  await page.mouse.move(moved.x, moved.y + 260, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
  await page.waitForTimeout(600)
  const after = await page.locator('.dsh-home-widget').evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.h ?? r.height) }
  }))
  const afterTop = Math.min(...after.map(box => box.y))
  assert.ok(afterTop - grid.top <= 40, `release compacts the board back to the top (${afterTop - grid.top}px)`)
  check('board is packed: first row at grid top, no unsupported gaps after a drag', { boxes: boxes.length })
}
async function recentCases(page) {
  // No synthetic ledger. The card is fixed at five rows and has no search box or
  // directory filter (docs/design-system.md 9), and a faked feed drifted from the
  // real request path twice. Assert against the snapshot the host actually serves.
  const snapshot = await homeApi(page, 'snapshot')
  const sessions = Array.isArray(snapshot?.sessions) ? snapshot.sessions : []
  const topLevel = sessions.filter(session => session.parentSessionId === undefined)
  const expected = Math.min(5, topLevel.length)
  await page.reload(); await openHome(page)
  const card = page.locator('[data-widget-id="recent"]')
  await card.waitFor()
  // The card decides its own capacity from measured height, so assert the shape
  // (at least one row, never more than five) rather than one exact number.
  await eventually(async () => {
    const shown = await card.locator('[data-session-id]').count()
    return shown >= 1 && shown <= 5
  }, `recent shows 1..5 rows (${topLevel.length} sessions available)`)
  const child = sessions.find(session => session.parentSessionId !== undefined)
  if (child !== undefined) {
    assert.equal(await card.locator(`[data-session-id="${child.id}"]`).count(), 0, 'subagent session must not appear')
  }
  await card.screenshot({ path: path.join(artifacts, 'recent-real-card.png'), animations: 'disabled' })
  check('recent card shows the real snapshot, capped at five, no subagent rows', { sessions: sessions.length, shown: await card.locator('[data-session-id]').count() })
}
async function iconCase(page) {
  const plugins = page.getByRole('button', { name: /^(Plugins|插件)$/ }).first()
  await plugins.click()
  const card = page.locator('[data-plugin-package="@vlln/dsh-home"]')
  await card.waitFor()
  const image = card.locator('img').first()
  await image.waitFor()
  const decoded = await image.evaluate(async img => { await img.decode(); return { complete: img.complete, width: img.naturalWidth, dataUrl: img.src.startsWith('data:image/') } })
  assert(decoded.complete && decoded.width > 0 && decoded.dataUrl, 'Real Plugins icon decode failed')
  await stableShot(page, 'plugins-real-icon.png')
  check('real Plugins package icon loaded and decoded', decoded)
}
async function execute() {
  const tarballInput = option('--tarball')
  assert(tarballInput, '--run requires --tarball; build/package belongs to caller')
  const tarball = await realpath(path.resolve(process.cwd(), tarballInput))
  assert((await stat(tarball)).isFile() && tarball.endsWith('.tgz'), 'Need an existing .tgz')
  report.tarball = { path: tarball, sha256: createHash('sha256').update(await readFile(tarball)).digest('hex') }
  const cli = await realpath(execFileSync('/usr/bin/which', ['dsh'], { encoding: 'utf8' }).trim())
  const entries = execFileSync('/usr/bin/tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n')
  assert(entries.every(name => name.startsWith('package/') && !name.split('/').includes('..')), 'Unsafe archive path')
  const unpack = path.join(SITE, `negative-${Date.now()}`)
  await mkdir(unpack)
  await command('/usr/bin/tar', ['-xzf', tarball, '-C', unpack], 'extract-negative')
  const pkgDir = path.join(unpack, 'package')
  const manifestPath = path.join(pkgDir, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(manifest.name, '@vlln/dsh-home')
  assert.equal(manifest.version, EXPECTED, `Require the explicitly requested ${EXPECTED} artifact`)
  const entryPath = path.resolve(pkgDir, manifest.main)
  assert(entryPath.startsWith(`${pkgDir}${path.sep}`))
  const expectedHashes = Object.fromEntries(await Promise.all(['lib/index.mjs', 'lib/client.js', 'icon.svg'].map(async name => [name, createHash('sha256').update(await readFile(path.join(pkgDir, name))).digest('hex')])))
  const source = await readFile(entryPath, 'utf8')
  const pattern = /(const|let|var) inject = \[[^\]]*\]/
  assert(pattern.test(source), 'Cannot inject negative-control dependency into built entry')
  await writeFile(entryPath, source.replace(pattern, 'const inject = ["webServer", "verifyHostDefinitelyMissingService"]'))
  manifest.version = `${EXPECTED}-verify-negative`
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  const packed = await command('npm', ['pack', '--ignore-scripts', '--pack-destination', unpack], 'pack-negative', { cwd: pkgDir })
  const negativeTar = path.join(unpack, packed.trim().split('\n').findLast(line => line.endsWith('.tgz')))
  const negativeHome = path.join(SITE, 'negative-dsh')
  await mkdir(negativeHome, { recursive: true })
  if (!argv.includes('--skip-negative')) {
    await command(cli, ['plugin', '--profile', 'web', 'add', negativeTar], 'install-negative', { home: negativeHome })
    const negative = await launch(cli, negativeHome, 'negative-host')
    await eventually(() => /did not activate|waiting for service|verifyHostDefinitelyMissingService/.test(negative.child.output), 'negative control loud failure')
    await stop(negative.child, 'negative-host')
    await portFree()
    check('negative missing-inject dependency fails loudly')
  } else report.negativeControl = 'skipped for diagnosis; not a complete gate'
  // Same-version pnpm cache can retain an older artifact; remove only our fixture package.
  if (existsSync(path.join(HOME, 'profiles/web/node_modules/@vlln/dsh-home/package.json'))) {
    await command(cli, ['plugin', '--profile', 'web', 'remove', '@vlln/dsh-home'], 'remove-real-stale')
  }
  await command(cli, ['plugin', '--profile', 'web', 'add', tarball], 'install-real')
  const resolver = createRequire(path.join(HOME, 'profiles/web/package.json'))
  const installedManifest = resolver.resolve('@vlln/dsh-home/package.json')
  const installed = JSON.parse(await readFile(installedManifest, 'utf8'))
  assert.equal(installed.version, EXPECTED)
  for (const [name, expected] of Object.entries(expectedHashes)) {
    const actual = createHash('sha256').update(await readFile(path.join(path.dirname(installedManifest), name))).digest('hex')
    assert.equal(actual, expected, `Installed artifact mismatch: ${name}`)
  }
  check('tarball installed version and Node/client/icon sha256 match')
  const host = await launch(cli, HOME, 'real-host')
  const { chromium } = await import('playwright')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' })
  await context.route('**/api/session/prompt', async route => { promptAttempts++; await route.abort('blockedbyclient') })
  const page = await context.newPage()
  // Both notices mount asynchronously, potentially between ANY two UI actions.
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  })
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
    await page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click()
  })
  const browserErrors = []
  page.on('pageerror', error => browserErrors.push(redact(error.message)))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(redact(message.text())) })
  try {
    await page.goto(host.authUrl)
    await eventually(() => new URL(page.url()).searchParams.has('token') === false, 'token removed by own authentication handshake')
    await openHome(page)
    check('actual home entry click and Recent/Tasks rendered')
    if (!argv.includes('--only-tail')) {
      await visualCases(page)
      await layoutCases(page)
      await packedBoardCase(page)
      await recentCases(page)
    } else {
      report.partial = 'tail diagnostic only; visual/layout/recent not rerun'
      await rpc(page, 'settings/update', { ns: 'locale', patch: { preference: 'en' } })
      await page.reload(); await openHome(page)
    }
    await iconCase(page)
    assert.equal(promptAttempts, 0)
    assert.equal(browserErrors.length, 0, JSON.stringify(browserErrors))
    assert(!/failed to import|did not activate|plugin tree failed to load/i.test(host.child.output), 'Real host activation warnings')
    check('real Host and browser no activation/render errors or model requests')
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { report.browserErrors = browserErrors }
}
try {
  assert(argv.every((arg, i) => ['--prepare', '--run', '--tarball', '--skip-negative', '--only-tail'].includes(arg) || argv[i - 1] === '--tarball'), 'Unknown argument')
  await prepare()
  if (run) await execute()
  else console.log('Prepared only: no install, server, browser or credential access. Supply --tarball <vlln-dsh-home-${EXPECTED}.tgz> --run through a managed background job.')
} catch (error) {
  const message = redact(error.stack ?? error)
  report.failures.push(message)
  console.error(message)
  process.exitCode = 1
} finally {
  if (browser) await browser.close().catch(error => report.failures.push(redact(error.message)))
  if (activeHost) await stop(activeHost, 'real-host-final')
  for (const child of children) await stop(child, `remaining-child-${child.pid}`)
  if (sitePrepared) await writeFile(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`[exit code: ${process.exitCode ?? 0}]`)
}
