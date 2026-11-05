import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Opt-in, READY private instance only. Do not start/restart a server or import
// business code. The recording is a seed, never a solver-derived result oracle.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the ready private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
const recording = JSON.parse(await readFile(new URL('red-latest-layout.json', base), 'utf8'))
assert(recording.ok && recording.value?.layout, 'Recording must contain a successful layout API envelope')
const recordedLayout = recording.value.layout
const fixture = structuredClone(recordedLayout.positions?.['12'])
const ids = ['recent', 'resume', 'queue', 'quick', 'today', 'running', 'rhythm', 'tasks', 'areas']
const peers = ids.filter(id => id !== 'running')
assert.deepEqual(Object.keys(fixture).sort(), [...ids].sort(), 'Recording must retain the actual nine registered cards')
assert.deepEqual(fixture.running, { x: 8, y: 2, w: 4, h: 4 }, 'Recording running origin must be x8y2')
assert(ids.every(id => !(recordedLayout.hidden ?? []).includes(id)), 'All nine recorded cards must be visible; do not fake registration')
const CASES = [
  { name: 'x2-y2', x: 2, y: 2, grabCols: 3.5 },
  { name: 'x3-y2', x: 3, y: 2, grabCols: 0.5 },
  { name: 'x4-y5', x: 4, y: 5, grabCols: 0.5 },
  // y6 is exactly the queue/resume boundary in this recording, not overlap.
  // Use literal colliding targets instead of counting empty-space success.
  { name: 'x6-y2', x: 6, y: 2, grabCols: 0.5 },
  { name: 'x3-y7', x: 3, y: 7, grabCols: 3.5 },
  { name: 'x5-y5', x: 5, y: 5, grabCols: 0.5 },
].map(test => ({ ...test, candidate: { x: test.x, y: test.y, w: 4, h: 4 } }))
const ROW = 56, GAP = 12, COLS = 12, TOLERANCE = 2
const VIEWPORT = { width: 1440, height: 2400 }
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const geometry = (positions, label) => {
  for (const [index, id] of ids.entries()) {
    const r = positions[id]
    assert(r && ['x', 'y', 'w', 'h'].every(key => Number.isInteger(r[key])), `${label}: missing/inexact ${id}`)
    assert(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= COLS, `${label}: out of grid ${id}`)
    assert.equal(r.w, fixture[id].w, `${label}: changed width ${id}`)
    assert.equal(r.h, fixture[id].h, `${label}: changed height ${id}`)
    for (const other of ids.slice(index + 1)) assert(!overlaps(r, positions[other]), `${label}: overlap ${id}/${other}`)
  }
}
geometry(fixture, 'Recorded nine-card seed')
for (const test of CASES) assert(peers.some(id => overlaps(fixture[id], test.candidate)), `${test.name}: literal target must overlap a seed peer`)
const inferPeerAxis = (positions, label) => {
  const changed = ['x', 'y'].filter(axis => peers.some(id => positions[id][axis] !== fixture[id][axis]))
  assert.equal(changed.length, 1, `${label}: all moved peers must share one axis, not mixed-axis rearrangement`)
  const axis = changed[0], cross = axis === 'x' ? 'y' : 'x', crossSize = axis === 'x' ? 'h' : 'w'
  const pairs = []
  for (const id of peers) assert.equal(positions[id][cross], fixture[id][cross], `${label}: ${id} changed cross coordinate`)
  for (const [index, a] of peers.entries()) for (const b of peers.slice(index + 1)) {
    const ra = fixture[a], rb = fixture[b]
    if (!(ra[cross] < rb[cross] + rb[crossSize] && rb[cross] < ra[cross] + ra[crossSize])) continue
    assert.notEqual(ra[axis], rb[axis], 'Seed cross-overlapping peers require strict original axis order')
    const pair = ra[axis] < rb[axis] ? [a, b] : [b, a]
    assert(positions[pair[0]][axis] < positions[pair[1]][axis], `${label}: inverted original peer order ${pair.join('/')}`)
    pairs.push(pair)
  }
  return { axis, cross, pairs }
}
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('sweep-', base)))
const artifact = name => `${output}/${name}`
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const report = { cases: [], checks: [], errors: [], screenshots: [], restoredOriginalLayout: false,
  fixture, evidenceSource: 'Six real mouse cases; recorded nine-card API seed; rendered DOM, requestAnimationFrame, mutation observer and same-origin Home API. No business imports or API-position sweep presented as drag evidence.' }
let browser, context, page, original, originalInstances, modified = false
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, {
    data: { op, ...extra }, headers: { origin: target.origin }, timeout: 15_000,
  })
  assert(response.ok(), `Home API ${op}: HTTP ${response.status()}`)
  const body = await response.json()
  assert(body.ok, `Home API ${op} rejected the request`)
  return body.value
}
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const finishWatch = async () => page.evaluate(() => {
  const watch = window.__dshSweepWatch
  if (!watch) return null
  watch.active = false; cancelAnimationFrame(watch.frame); watch.remove()
  const { active, frame, remove, arrivedAt, firstMotionAt, ...measurements } = watch
  return { ...measurements, observedMs: arrivedAt === null ? 0 : performance.now() - arrivedAt,
    firstMotionMs: firstMotionAt === null ? null : firstMotionAt - arrivedAt }
})
const restoreOriginal = async () => {
  // Dispose the UI first: a delayed editor save must not race recovery.
  if (page && !page.isClosed()) {
    await finishWatch().catch(() => {})
    await page.mouse.up().catch(() => {})
    await frames().catch(() => {})
    await page.close({ runBeforeUnload: false })
  }
  if (original !== undefined && modified) {
    await api('layout.set', { layout: original })
    assert.deepEqual((await api('layout.get')).layout, original, 'Recovery differs from exclusive original-layout backup')
    assert.deepEqual((await api('workbench.get')).instances, originalInstances, 'Layout-only regression changed widget instances')
    report.instancesUnchanged = true
    modified = false
  }
  report.restoredOriginalLayout = original !== undefined && !modified
}
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' })
  const newPage = async () => {
    page = await context.newPage()
    page.on('pageerror', error => report.errors.push(cleanError(error)))
    await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), async () => {
      await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 2000 }).catch(() => {})
    }, { noWaitAfter: true })
    await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
      await page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click({ timeout: 2000 }).catch(async () => {
        if (await page.getByRole('heading', { name: /^(Get started|开始使用)$/ }).isVisible().catch(() => false)) {
          await page.keyboard.press('Escape').catch(() => {})
        }
      })
    }, { noWaitAfter: true })
    await page.goto(supplied)
  }
  const open = async () => {
    await page.getByRole('button', { name: /^(Home|首页)$/ }).first().click()
    await page.locator('.dsh-spatial-grid').waitFor()
  }
  const widget = id => page.locator(`[data-widget-id="${id}"]`)
  const cellFromBox = (r, grid) => ({ x: Math.round((r.x - grid.x) / ((grid.width + GAP) / COLS)),
    y: Math.round((r.y - grid.y) / ROW), w: Math.round((r.width + GAP) / ((grid.width + GAP) / COLS)),
    h: Math.round((r.height + GAP) / ROW) })
  const toBox = (r, grid) => ({ x: grid.x + r.x * (grid.width + GAP) / COLS, y: grid.y + r.y * ROW,
    width: r.w * (grid.width + GAP) / COLS - GAP, height: r.h * ROW - GAP })
  const readGrid = async selected => {
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Requires the real 12-column desktop grid')
    const rendered = Object.fromEntries(await Promise.all(selected.map(async id => {
      const box = await widget(id).boundingBox(); assert(box, `Missing ${id}`); return [id, box]
    })))
    const positions = Object.fromEntries(selected.map(id => {
      const cell = cellFromBox(rendered[id], grid), snapped = toBox(cell, grid)
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(rendered[id][key] - snapped[key]) <= TOLERANCE, `Unsnapped ${id}.${key}`)
      return [id, cell]
    }))
    return { grid, rendered, positions }
  }
  const shot = async name => {
    await frames(); await page.screenshot({ path: artifact(name) }); report.screenshots.push(name)
  }
  await newPage(); await open()
  const originalWorkbench = await api('workbench.get')
  original = structuredClone(originalWorkbench.layout)
  originalInstances = structuredClone(originalWorkbench.instances)
  await writeFile(artifact('original-workbench.json'), JSON.stringify(originalWorkbench, null, 2), { flag: 'wx' })
  await writeFile(artifact('original-layout.json'), JSON.stringify(original, null, 2), { flag: 'wx' })
  await writeFile(artifact('recorded-seed.json'), JSON.stringify(recordedLayout, null, 2), { flag: 'wx' })
  for (const test of CASES) {
    const entry = { ...test, restoredOriginalLayout: false }
    report.cases.push(entry)
    try {
      if (!page || page.isClosed()) await newPage()
      // Retain registration, all nine cards, all non-12 breakpoints and metadata.
      // Never substitute the six-card reduced fixture or inject fake widgets.
      const seed = { ...structuredClone(original), ...structuredClone(recordedLayout),
        positions: { ...structuredClone(original.positions), ...structuredClone(recordedLayout.positions), '12': structuredClone(fixture) } }
      modified = true; report.restoredOriginalLayout = false
      await api('layout.set', { layout: seed })
      await page.reload(); await open()
      await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
      await page.locator('.dsh-home[data-editing=true]').waitFor(); await frames()
      assert.equal(await page.locator('.dsh-spatial-container').getAttribute('data-cols'), '12')
      entry.renderedIds = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
      assert.deepEqual([...entry.renderedIds].sort(), [...ids].sort(), 'Every case must render all nine actual cards')
      const baseline = await readGrid(ids)
      assert.deepEqual(baseline.positions, fixture, 'Independently reseeded DOM must match the recording exactly')
      geometry(baseline.positions, 'Seed DOM')
      entry.before = baseline
      const { grid } = baseline, step = (grid.width + GAP) / COLS
      const grip = await widget('running').locator('.dsh-w-head.dsh-widget-grip').boundingBox()
      assert(grip, 'Running must expose the actual title handle')
      // A 3.5-column midpoint can sit on the right-hand hide button. Keep the
      // requested x offset and select a real, non-interactive pixel in the same
      // title header (including its top padding), never click a button or move x.
      const start = await page.evaluate(({ x, grip }) => {
        const ys = [grip.y + grip.height / 2, grip.y + 1, grip.y + grip.height - 1]
        for (const y of ys) {
          const node = document.elementFromPoint(x, y)
          if (node?.closest('[data-widget-id="running"] .dsh-w-head.dsh-widget-grip')
            && !node.closest('button, input, select, textarea, a')) return { x, y }
        }
        return null
      }, { x: baseline.rendered.running.x + test.grabCols * step, grip })
      assert(start, 'The 0.5/3.5-column grab must hit the actual title, never an interactive child')
      assert(start.x > grip.x && start.x < grip.x + grip.width && start.y > 72 && start.y < VIEWPORT.height - 72)
      await page.mouse.move(start.x, start.y)
      await page.evaluate(() => {
        const box = () => {
          const r = document.querySelector('[data-widget-id="running"]').getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }
        document.addEventListener('mousedown', event => {
          const r = box(); window.__dshSweepGrab = { x: event.clientX - r.x, y: event.clientY - r.y, box: r }
        }, { capture: true, once: true })
        document.addEventListener('mousemove', event => {
          const r = box(); window.__dshSweepActivation = { x: event.clientX - r.x, y: event.clientY - r.y, box: r }
        }, { capture: true, once: true })
      })
      await page.mouse.down()
      const grab = await page.evaluate(() => window.__dshSweepGrab)
      await page.mouse.move(start.x - 8, start.y)
      await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
      const activation = await page.evaluate(() => window.__dshSweepActivation)
      assert(grab && activation, 'Observe both original grab and real activation threshold offsets')
      const pointer = { x: grid.x + test.x * step + activation.x, y: grid.y + test.y * ROW + activation.y }
      assert(pointer.y > 160 && pointer.y < VIEWPORT.height - 72, 'Avoid edge scrolling')
      const activeExpected = { x: pointer.x - grab.x, y: pointer.y - grab.y }
      Object.assign(entry, { start, grip, grab, activation, pointer, activeExpected,
        rawCandidate: { x: (pointer.x - activation.x - grid.x) / step, y: (pointer.y - activation.y - grid.y) / ROW } })
      assert(Math.abs(entry.rawCandidate.x - test.x) < 1e-9 && Math.abs(entry.rawCandidate.y - test.y) < 1e-9)
      await page.evaluate(({ pointer, before, peers, activeExpected }) => {
        const grid = document.querySelector('.dsh-spatial-grid')
        const range = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
        const watch = { active: true, arrivedAt: null, firstMotionAt: null, pendingSeen: false, rejectedSeen: false,
          pendingFrames: 0, confirmedFrames: 0, activeMaxError: 0, activeRange: range(), placeholderRange: range(),
          placeholderMaxDrift: 0, pointerMaxDrift: 0, scrollMaxDrift: 0, missingActiveFrames: 0,
          missingPlaceholderFrames: 0, peerOverlapFrames: [], samples: [] }
        window.__dshSweepWatch = watch
        const rejection = records => {
          watch.rejectedSeen ||= grid.dataset.dropRejected === 'true'
            || (records ?? []).some(r => r.attributeName === 'data-drop-rejected' && r.oldValue === 'true')
        }
        const observer = new MutationObserver(rejection)
        observer.observe(grid, { attributes: true, attributeOldValue: true }); rejection()
        const scrollNodes = new Set([document.scrollingElement])
        for (let node = document.querySelector('[data-widget-id="running"]'); node; node = node.parentElement) scrollNodes.add(node)
        const scroll = [...scrollNodes].filter(Boolean).map(node => ({ node, x: node.scrollLeft, y: node.scrollTop }))
        const arrival = event => {
          if (watch.arrivedAt === null && Math.abs(event.clientX - pointer.x) <= 1 && Math.abs(event.clientY - pointer.y) <= 1) {
            watch.arrivedAt = performance.now(); watch.arrivedPointer = { x: event.clientX, y: event.clientY }
          }
          if (watch.arrivedAt !== null) watch.pointerMaxDrift = Math.max(watch.pointerMaxDrift,
            Math.abs(event.clientX - watch.arrivedPointer.x), Math.abs(event.clientY - watch.arrivedPointer.y))
        }
        document.addEventListener('mousemove', arrival, true)
        watch.remove = () => { rejection(observer.takeRecords()); observer.disconnect(); document.removeEventListener('mousemove', arrival, true) }
        const box = selector => {
          const r = document.querySelector(selector)?.getBoundingClientRect()
          return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
        }
        const measureRange = (r, bounds) => {
          bounds.minX = Math.min(bounds.minX, r.x); bounds.maxX = Math.max(bounds.maxX, r.x)
          bounds.minY = Math.min(bounds.minY, r.y); bounds.maxY = Math.max(bounds.maxY, r.y)
        }
        const sample = () => {
          if (!watch.active) return
          if (watch.arrivedAt !== null) {
            const ms = performance.now() - watch.arrivedAt, pending = grid.dataset.hoverPending === 'true'
            watch.pendingSeen ||= pending
            if (pending) watch.pendingFrames++; else if (watch.pendingSeen) watch.confirmedFrames++
            rejection()
            const active = box('[data-widget-id="running"]'), placeholder = box('.react-grid-placeholder')
            if (ms >= 40) {
              if (!active) watch.missingActiveFrames++
              else {
                measureRange(active, watch.activeRange)
                for (const key of ['x', 'y']) watch.activeMaxError = Math.max(watch.activeMaxError, Math.abs(active[key] - activeExpected[key]))
              }
            }
            // Ignore only the intentional initial placeholder landing transition.
            if (ms >= 150) {
              if (!placeholder) watch.missingPlaceholderFrames++
              else {
                watch.firstPlaceholder ??= placeholder
                measureRange(placeholder, watch.placeholderRange)
                watch.placeholderMaxDrift = Math.max(watch.placeholderRange.maxX - watch.placeholderRange.minX,
                  watch.placeholderRange.maxY - watch.placeholderRange.minY)
              }
            }
            for (const { node, x, y } of scroll) watch.scrollMaxDrift = Math.max(watch.scrollMaxDrift, Math.abs(node.scrollLeft - x), Math.abs(node.scrollTop - y))
            const rects = Object.fromEntries(peers.map(id => [id, box(`[data-widget-id="${id}"]`)]))
            for (const id of peers) if (rects[id] && ['x', 'y', 'width', 'height'].some(key => Math.abs(rects[id][key] - before[id][key]) >= 2)) watch.firstMotionAt ??= performance.now()
            for (const [index, a] of peers.entries()) for (const b of peers.slice(index + 1)) {
              const ra = rects[a], rb = rects[b]
              // Pixel interiors, with the same 2px observation tolerance as snap.
              if (!ra || !rb || (Math.min(ra.x + ra.width, rb.x + rb.width) - Math.max(ra.x, rb.x) > 2
                && Math.min(ra.y + ra.height, rb.y + rb.height) - Math.max(ra.y, rb.y) > 2)) watch.peerOverlapFrames.push({ ms, a, b })
            }
            watch.samples.push({ ms, pending, dataset: { ...grid.dataset }, active, placeholder, peers: rects })
          }
          watch.frame = requestAnimationFrame(sample)
        }
        watch.frame = requestAnimationFrame(sample)
      }, { pointer, before: baseline.rendered, peers, activeExpected })
      // Exactly one destination move; no synthetic event, model call or nudge.
      await page.mouse.move(pointer.x, pointer.y); await frames()
      entry.activeImmediately = await widget('running').boundingBox()
      assert(entry.activeImmediately, 'Immediate active box must exist')
      const immediateError = Math.max(Math.abs(entry.activeImmediately.x - activeExpected.x), Math.abs(entry.activeImmediately.y - activeExpected.y))
      assert(immediateError <= 8, 'Original grip must be preserved within the activation allowance')
      await page.waitForFunction(() => window.__dshSweepWatch.pendingSeen, undefined, { polling: 'raf', timeout: 2000 })
      await page.waitForFunction(() => {
        const watch = window.__dshSweepWatch
        return watch.arrivedAt !== null && performance.now() - watch.arrivedAt >= 500
          && document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending !== 'true'
      }, undefined, { polling: 'raf', timeout: 10_000 })
      entry.after500Dataset = await page.locator('.dsh-spatial-grid').evaluate(node => ({ ...node.dataset }))
      await page.waitForFunction(({ peers }) => peers.every(id => {
        const node = document.querySelector(`[data-widget-id="${id}"]`)
        return node && node.getAnimations().every(animation => animation.playState !== 'running')
      }), { peers }, { polling: 'raf', timeout: 5000 })
      await frames()
      entry.held = await readGrid(peers)
      const placeholder = await page.locator('.react-grid-placeholder').boundingBox()
      assert(placeholder, 'Held real placeholder must exist')
      const actual = cellFromBox(placeholder, entry.held.grid), snapped = toBox(actual, entry.held.grid)
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(placeholder[key] - snapped[key]) <= TOLERANCE, `Unsnapped placeholder.${key}`)
      entry.actualCandidate = actual
      entry.snapDelta = { x: actual.x - test.x, y: actual.y - test.y }
      entry.originalOverlapPeers = peers.filter(id => overlaps(fixture[id], actual))
      assert(Math.abs(entry.snapDelta.x) <= 1 && Math.abs(entry.snapDelta.y) <= 1, 'Observed snap may differ by at most one cell per axis')
      assert.equal(actual.w, 4); assert.equal(actual.h, 4)
      assert(entry.originalOverlapPeers.length > 0, 'Observed candidate must remain in the original overlap region; empty space is not a pass')
      entry.held.positions.running = actual
      geometry(entry.held.positions, 'Held DOM + observed placeholder')
      entry.inferredPeerAxis = inferPeerAxis(entry.held.positions, 'Held preview')
      await shot(`${test.name}-held.png`)
      entry.timing = await finishWatch()
      const timing = entry.timing
      assert(timing.pendingSeen && timing.pendingFrames > 0 && timing.confirmedFrames > 0, 'Observe both sides of the stationary 500ms dwell')
      assert.equal(timing.rejectedSeen, false, 'No transient red/dropRejected state')
      assert.notEqual(entry.after500Dataset.dropRejected, 'true', 'No red after confirmation')
      assert.equal(timing.missingActiveFrames, 0); assert.equal(timing.missingPlaceholderFrames, 0)
      assert(Math.max(immediateError, timing.activeMaxError) <= 8, 'Keep original grab offset within 8px')
      entry.activeMaxDrift = Math.max(
        Math.max(timing.activeRange.maxX, entry.activeImmediately.x) - Math.min(timing.activeRange.minX, entry.activeImmediately.x),
        Math.max(timing.activeRange.maxY, entry.activeImmediately.y) - Math.min(timing.activeRange.minY, entry.activeImmediately.y))
      assert(entry.activeMaxDrift <= TOLERANCE, 'Active must not drift through confirmation')
      assert(timing.placeholderMaxDrift <= TOLERANCE, 'Observed candidate must not drift through confirmation')
      assert.deepEqual(timing.peerOverlapFrames, [], 'All peer pairs must remain non-overlapping on every sampled frame')
      const { axis, cross, pairs } = entry.inferredPeerAxis
      entry.peerCrossMaxError = 0
      for (const sample of timing.samples) {
        for (const id of peers) {
          assert(sample.peers[id], `Missing sampled peer ${id}`)
          entry.peerCrossMaxError = Math.max(entry.peerCrossMaxError,
            Math.abs(sample.peers[id][cross] - baseline.rendered[id][cross]))
        }
        for (const [a, b] of pairs) assert(sample.peers[a][axis] < sample.peers[b][axis],
          `Peer order inverted during ${axis}-axis preview: ${a}/${b}`)
      }
      assert(entry.peerCrossMaxError <= TOLERANCE, 'Every peer must retain its original cross coordinate on every frame')
      assert.equal(timing.pointerMaxDrift, 0); assert.equal(timing.scrollMaxDrift, 0)
      assert(timing.firstMotionMs !== null && timing.firstMotionMs >= 480, 'No peer motion before the 500ms dwell (one-frame tolerance)')
      await page.mouse.up()
      await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging') && !document.querySelector('.react-grid-placeholder'))
      await frames()
      entry.released = await readGrid(ids)
      geometry(entry.released.positions, 'Release DOM')
      assert.deepEqual(entry.released.positions, entry.held.positions, 'Release must commit the observed held preview')
      await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
      await page.locator('.dsh-home[data-editing=false]').waitFor(); await frames()
      entry.done = await readGrid(ids)
      geometry(entry.done.positions, 'Done DOM')
      assert.deepEqual(entry.done.positions, entry.released.positions, 'Done DOM must preserve the release')
      const saved = structuredClone((await api('layout.get')).layout)
      entry.savedPositions = Object.fromEntries(ids.map(id => [id, saved.positions?.['12']?.[id]]))
      geometry(entry.savedPositions, 'Done API')
      assert.deepEqual(entry.savedPositions, entry.released.positions, 'Done API must preserve all nine cards')
      await shot(`${test.name}-done.png`)
      await page.reload(); await open(); await frames()
      entry.reloaded = await readGrid(ids)
      geometry(entry.reloaded.positions, 'Reload DOM')
      assert.deepEqual(entry.reloaded.positions, entry.savedPositions, 'Reload must preserve all nine positions')
      assert.deepEqual((await api('layout.get')).layout, saved, 'Reload may not silently rewrite the saved layout')
      await shot(`${test.name}-reload.png`)
      entry.passed = true
      report.checks.push(`${test.name}: actual x${actual.x}y${actual.y}, snap delta ${JSON.stringify(entry.snapDelta)}, stationary 500ms !red, active drift <=2px, all peers non-overlapping; held/release/Done/reload`)
    } catch (error) {
      entry.failure = cleanError(error); process.exitCode = 1
      if (page && !page.isClosed()) {
        entry.timing ??= await finishWatch().catch(() => null)
        await page.screenshot({ path: artifact(`${test.name}-failure.png`) }).then(() => report.screenshots.push(`${test.name}-failure.png`)).catch(() => {})
      }
      // A failure never skips the remaining independently seeded real mouse cases.
    } finally {
      try { await restoreOriginal(); entry.restoredOriginalLayout = report.restoredOriginalLayout }
      catch (error) { entry.restoreFailure = cleanError(error); throw error }
    }
  }
  assert.equal(report.cases.length, 6, 'All six real mouse cases must be attempted')
  assert.deepEqual(report.errors, [], 'No browser page errors')
} catch (error) {
  report.failure = cleanError(error); process.exitCode = 1
} finally {
  try { await restoreOriginal() } catch (error) { report.restoreFailure = cleanError(error); process.exitCode = 1 }
  try { await writeFile(artifact('report.json'), JSON.stringify(report, null, 2), { flag: 'wx' }) }
  finally { await browser?.close() }
}
console.log(`Nine-card mouse sweep evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
for (const entry of report.cases) if (entry.failure) console.error(`FAIL ${entry.name}: ${entry.failure}`)
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
