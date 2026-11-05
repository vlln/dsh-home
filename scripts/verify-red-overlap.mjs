import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Opt-in, ready private instance only. Never start a service, use the shared GUI,
// import a layout model, or save the supplied URL/authentication state.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the ready private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('red-overlap-', base)))
const artifact = name => `${output}/${name}`
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const ROW = 56, GAP = 12, COLS = 12, TOLERANCE = 2
const VIEWPORT = { width: 1440, height: 2400 }
const FIXTURE = {
  running: { x: 4, y: 2, w: 4, h: 4 },
  quick: { x: 0, y: 2, w: 4, h: 4 },
  resume: { x: 0, y: 6, w: 4, h: 4 },
  queue: { x: 4, y: 6, w: 4, h: 4 },
  areas: { x: 0, y: 12, w: 4, h: 4 },
  today: { x: 4, y: 12, w: 8, h: 4 },
}
const CASES = [
  { name: 'x0-y7', axis: 'y', candidate: { x: 0, y: 7, w: 4, h: 4 } },
  { name: 'x0-y8', axis: 'y', candidate: { x: 0, y: 8, w: 4, h: 4 } },
  { name: 'x0-y9', axis: 'y', candidate: { x: 0, y: 9, w: 4, h: 4 } },
  { name: 'x1-y2', axis: 'x', candidate: { x: 1, y: 2, w: 4, h: 4 } },
]
const ids = Object.keys(FIXTURE), peers = ids.filter(id => id !== 'running')
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const geometry = (positions, label) => {
  for (const [index, id] of ids.entries()) {
    const r = positions[id]
    assert(r && ['x', 'y', 'w', 'h'].every(key => Number.isInteger(r[key])), `${label}: invalid ${id}`)
    assert(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= COLS, `${label}: out of grid ${id}`)
    for (const other of ids.slice(index + 1)) assert(!overlaps(r, positions[other]), `${label}: overlap ${id}/${other}`)
  }
}
const orderPairs = axis => {
  const cross = axis === 'x' ? 'y' : 'x', size = axis === 'x' ? 'h' : 'w'
  const pairs = []
  for (const [index, a] of peers.entries()) for (const b of peers.slice(index + 1)) {
    const ra = FIXTURE[a], rb = FIXTURE[b]
    if (!(ra[cross] < rb[cross] + rb[size] && rb[cross] < ra[cross] + ra[size])) continue
    assert.notEqual(ra[axis], rb[axis], 'Cross-overlapping seed peers must have a strict original axis order')
    pairs.push(ra[axis] < rb[axis] ? [a, b] : [b, a])
  }
  return pairs
}
const report = { cases: [], checks: [], errors: [], screenshots: [], restoredOriginalLayout: false,
  fixture: FIXTURE, evidenceSource: 'Real mouse events, actual threshold grab offsets, rendered DOM rectangles/datasets and same-origin Home API only' }
let browser, context, page, original, modified = false
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, {
    data: { op, ...extra }, headers: { origin: target.origin }, timeout: 15_000,
  })
  assert(response.ok(), `Home API ${op}: HTTP ${response.status()}`)
  const body = await response.json()
  assert(body.ok, `Home API ${op} rejected the request`)
  return body.value
}
const finishWatch = async () => page.evaluate(() => {
  const watch = window.__dshRedWatch
  if (!watch) return null
  watch.active = false; cancelAnimationFrame(watch.frame); watch.remove()
  const { active, frame, remove, arrivedAt, firstMotionAt, ...measurements } = watch
  return { ...measurements, observedMs: arrivedAt === null ? 0 : performance.now() - arrivedAt,
    firstMotionMs: firstMotionAt === null ? null : firstMotionAt - arrivedAt }
})
const restoreOriginal = async () => {
  // Close first, so delayed editor saves cannot race restoration.
  if (page && !page.isClosed()) {
    await finishWatch().catch(() => {})
    await page.mouse.up().catch(() => {})
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))).catch(() => {})
    await page.close({ runBeforeUnload: false })
  }
  if (original !== undefined && modified) {
    await api('layout.set', { layout: original })
    assert.deepEqual((await api('layout.get')).layout, original, 'Restoration differs from exclusive recovery backup')
    modified = false
  }
  report.restoredOriginalLayout = original !== undefined && !modified
}
try {
  geometry(FIXTURE, 'Literal seed')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' })
  const newPage = async () => {
    page = await context.newPage()
    page.on('pageerror', error => report.errors.push(cleanError(error)))
    // Known onboarding handlers only; no blanket dialog dismissal.
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
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const widget = id => page.locator(`[data-widget-id="${id}"]`)
  const toBox = (r, grid) => ({ x: grid.x + r.x * (grid.width + GAP) / COLS, y: grid.y + r.y * ROW,
    width: r.w * (grid.width + GAP) / COLS - GAP, height: r.h * ROW - GAP })
  const readGrid = async selected => {
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Requires the actual 12-column desktop grid')
    const rendered = Object.fromEntries(await Promise.all(selected.map(async id => {
      const r = await widget(id).boundingBox(); assert(r, `Missing ${id}`); return [id, r]
    })))
    const step = (grid.width + GAP) / COLS
    const positions = Object.fromEntries(selected.map(id => {
      const r = rendered[id]
      const cell = { x: Math.round((r.x - grid.x) / step), y: Math.round((r.y - grid.y) / ROW),
        w: Math.round((r.width + GAP) / step), h: Math.round((r.height + GAP) / ROW) }
      const snapped = toBox(cell, grid)
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(r[key] - snapped[key]) <= TOLERANCE, `Unsnapped ${id}.${key}`)
      return [id, cell]
    }))
    return { grid, rendered, positions }
  }
  const shot = async name => {
    await frames(); await page.screenshot({ path: artifact(name) }); report.screenshots.push(name)
  }
  const checkPlacement = (positions, test, label) => {
    geometry(positions, label)
    assert.deepEqual(positions.running, test.candidate, `${label}: running must stay at the exact candidate`)
    const cross = test.axis === 'x' ? 'y' : 'x'
    for (const id of peers) {
      assert.equal(positions[id][cross], FIXTURE[id][cross], `${label}: ${id} changed cross coordinate ${cross}`)
      assert.equal(positions[id].w, FIXTURE[id].w); assert.equal(positions[id].h, FIXTURE[id].h)
      if (overlaps(FIXTURE[id], test.candidate)) assert(!overlaps(positions[id], test.candidate), `${label}: original overlap peer ${id} did not exit candidate`)
    }
    for (const [a, b] of orderPairs(test.axis)) {
      assert(positions[a][test.axis] < positions[b][test.axis], `${label}: original cross-overlap order inverted: ${a}/${b}`)
    }
  }
  // Literal regression oracles. Any unexpected direction is retained as explicit
  // evidence, never silently accepted as a new expected result.
  const checkExpected = (positions, test, entry) => {
    if (test.name === 'x0-y7') {
      entry.direction = positions.resume.y > FIXTURE.resume.y ? 'down' : 'up'
      if (entry.direction !== 'down') entry.directionFallback = { expected: 'down', actual: entry.direction, positions }
      assert.equal(positions.resume.y, 11, 'x0y7: resume must move down to 11')
      assert.equal(positions.quick.y, 2, 'x0y7: quick must remain at 2')
      assert(positions.areas.y >= 15, 'x0y7: areas must yield to at least 15')
    } else if (test.name === 'x0-y8') {
      entry.direction = positions.resume.y < FIXTURE.resume.y ? 'up' : 'down'
      if (entry.direction !== 'up') entry.directionFallback = { expected: 'up', actual: entry.direction, positions }
      assert.equal(positions.resume.y, 4, 'x0y8: resume must move up to 4 (direction changes must be reported)')
      assert.equal(positions.quick.y, 0, 'x0y8: quick must chain up to 0')
    } else if (test.name === 'x1-y2') {
      entry.direction = positions.quick.x > FIXTURE.quick.x ? 'right' : 'left'
      if (entry.direction !== 'right') entry.directionFallback = { expected: 'right', actual: entry.direction, positions }
      assert.equal(positions.quick.x, 5, 'x1y2: quick must move right to 5')
    }
  }
  await newPage(); await open()
  original = structuredClone((await api('layout.get')).layout)
  await writeFile(artifact('original-layout.json'), JSON.stringify(original, null, 2), { flag: 'wx' })
  const registered = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const allIds = new Set([...registered, ...(original.order ?? []), ...(original.hidden ?? []),
    ...Object.values(original.positions ?? {}).flatMap(positions => Object.keys(positions)),
    'recent', 'resume', 'queue', 'tasks', 'today', 'running', 'areas', 'rhythm', 'quick'])
  for (const test of CASES) {
    const entry = { ...structuredClone(test), fixture: structuredClone(FIXTURE), originalOverlapPeers: peers.filter(id => overlaps(FIXTURE[id], test.candidate)),
      orderPairs: orderPairs(test.axis), restoredOriginalLayout: false }
    report.cases.push(entry)
    try {
      if (!page || page.isClosed()) await newPage()
      const layout = { ...structuredClone(original), hidden: [...allIds].filter(id => !ids.includes(id)),
        positions: { ...original.positions, '12': structuredClone(FIXTURE) } }
      modified = true; report.restoredOriginalLayout = false
      await api('layout.set', { layout })
      await page.reload(); await open()
      await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
      await page.locator('.dsh-home[data-editing=true]').waitFor(); await frames()
      assert.equal(await page.locator('.dsh-spatial-container').getAttribute('data-cols'), '12')
      assert.deepEqual((await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))).sort(), [...ids].sort(), 'Hide every non-fixture card')
      const baseline = await readGrid(ids)
      assert.deepEqual(baseline.positions, FIXTURE, 'Every independent case must begin with the actual literal seed')
      const { grid } = baseline, step = (grid.width + GAP) / COLS
      const grip = await widget('running').locator('.dsh-w-head.dsh-widget-grip').boundingBox()
      assert(grip, 'Running must expose a real title drag handle')
      // Vertical cases use title center. For x1y2 choose its right-center title
      // region, not the tool button: pointer must be nearer quick's right edge
      // than top edge while keeping the exact candidate y2.
      const start = { x: test.axis === 'x' ? baseline.rendered.running.x + 2.95 * step : grip.x + grip.width / 2,
        y: grip.y + grip.height / 2 }
      assert(start.x > grip.x && start.x < grip.x + grip.width && start.y > 72 && start.y < VIEWPORT.height - 72)
      assert(await page.evaluate(({ x, y }) => {
        const node = document.elementFromPoint(x, y)
        return !!node?.closest('[data-widget-id="running"] .dsh-w-head.dsh-widget-grip')
          && !node.closest('button, input, select, textarea, a')
      }, start), 'Start must hit the real title handle, not an interactive child')
      await page.mouse.move(start.x, start.y)
      await page.evaluate(() => {
        const box = () => {
          const r = document.querySelector('[data-widget-id="running"]').getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }
        document.addEventListener('mousedown', event => {
          const r = box(); window.__dshRedGrab = { x: event.clientX - r.x, y: event.clientY - r.y, box: r }
        }, { capture: true, once: true })
        document.addEventListener('mousemove', event => {
          const r = box(); window.__dshRedActivation = { x: event.clientX - r.x, y: event.clientY - r.y,
            pointer: { x: event.clientX, y: event.clientY }, box: r }
        }, { capture: true, once: true })
      })
      await page.mouse.down()
      const grab = await page.evaluate(() => window.__dshRedGrab)
      assert(grab, 'Capture original mousedown offset')
      await page.mouse.move(start.x - 8, start.y)
      await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
      const activation = await page.evaluate(() => window.__dshRedActivation)
      assert(activation, 'Capture actual activation-threshold grip offset')
      const pointer = { x: grid.x + test.candidate.x * step + activation.x, y: grid.y + test.candidate.y * ROW + activation.y }
      const computedCandidate = { x: (pointer.x - activation.x - grid.x) / step, y: (pointer.y - activation.y - grid.y) / ROW }
      assert(Math.abs(computedCandidate.x - test.candidate.x) < 1e-9 && Math.abs(computedCandidate.y - test.candidate.y) < 1e-9)
      assert(pointer.y > 160 && pointer.y < VIEWPORT.height - 72, 'Avoid edge scrolling')
      if (test.axis === 'x') {
        const normalized = { dx: ((pointer.x - grid.x) / step - 2) / 4, dy: ((pointer.y - grid.y) / ROW - 4) / 4 }
        entry.horizontalAim = normalized
        assert(normalized.dx > 0 && Math.abs(normalized.dx) > Math.abs(normalized.dy), 'Exact x1y2 pointer must select quick right edge, not top edge')
      }
      const placeholderExpected = toBox(test.candidate, grid), activeExpected = { x: pointer.x - grab.x, y: pointer.y - grab.y }
      const cross = test.axis === 'x' ? 'y' : 'x'
      Object.assign(entry, { before: baseline, start, grip, grab, activation, pointer, computedCandidate, activeExpected, placeholderExpected })
      await page.evaluate(({ pointer, before, peers, cross, axis, pairs, activeExpected, placeholderExpected }) => {
        const grid = document.querySelector('.dsh-spatial-grid')
        const range = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
        const watch = { active: true, arrivedAt: null, firstMotionAt: null, pendingSeen: false, rejectedSeen: false,
          pendingFrames: 0, confirmedFrames: 0, activeRange: range(), placeholderRange: range(), activeMaxError: 0,
          placeholderMaxError: 0, placeholderMaxDrift: 0, crossMaxError: 0, pointerMaxDrift: 0, scrollMaxDrift: 0,
          orderInversions: [], missingActiveFrames: 0, missingPlaceholderFrames: 0, samples: [] }
        window.__dshRedWatch = watch
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
        const measure = (selector, expected, bounds, prefix) => {
          const r = document.querySelector(selector)?.getBoundingClientRect()
          if (!r) { watch[`missing${prefix === 'active' ? 'Active' : 'Placeholder'}Frames`]++; return }
          for (const key of Object.keys(expected)) watch[`${prefix}MaxError`] = Math.max(watch[`${prefix}MaxError`], Math.abs(r[key] - expected[key]))
          bounds.minX = Math.min(bounds.minX, r.x); bounds.maxX = Math.max(bounds.maxX, r.x)
          bounds.minY = Math.min(bounds.minY, r.y); bounds.maxY = Math.max(bounds.maxY, r.y)
          if (prefix === 'placeholder') watch.placeholderMaxDrift = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
        }
        const sample = () => {
          if (!watch.active) return
          if (watch.arrivedAt !== null) {
            const ms = performance.now() - watch.arrivedAt, pending = grid.dataset.hoverPending === 'true'
            watch.pendingSeen ||= pending
            if (pending) watch.pendingFrames++; else if (watch.pendingSeen) watch.confirmedFrames++
            rejection()
            if (ms >= 40) measure('[data-widget-id="running"]', activeExpected, watch.activeRange, 'active')
            // The placeholder has an intentional landing transition; confirmation does not.
            if (ms >= 150) measure('.react-grid-placeholder', placeholderExpected, watch.placeholderRange, 'placeholder')
            for (const { node, x, y } of scroll) watch.scrollMaxDrift = Math.max(watch.scrollMaxDrift, Math.abs(node.scrollLeft - x), Math.abs(node.scrollTop - y))
            const rects = Object.fromEntries(peers.map(id => {
              const r = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
              return [id, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null]
            }))
            for (const id of peers) {
              if (!rects[id]) { watch.crossMaxError = Infinity; continue }
              watch.crossMaxError = Math.max(watch.crossMaxError, Math.abs(rects[id][cross] - before[id][cross]))
              if (['x', 'y', 'width', 'height'].some(key => Math.abs(rects[id][key] - before[id][key]) >= 2)) watch.firstMotionAt ??= performance.now()
            }
            for (const [a, b] of pairs) if (!rects[a] || !rects[b] || rects[a][axis] >= rects[b][axis]) watch.orderInversions.push({ ms, a, b })
            watch.samples.push({ ms, pending, dataset: { ...grid.dataset }, peers: rects })
          }
          watch.frame = requestAnimationFrame(sample)
        }
        watch.frame = requestAnimationFrame(sample)
      }, { pointer, before: baseline.rendered, peers, cross, axis: test.axis, pairs: entry.orderPairs, activeExpected, placeholderExpected })
      // Exactly one destination move, then a stationary real mouse through 500ms.
      await page.mouse.move(pointer.x, pointer.y); await frames()
      entry.activeImmediately = await widget('running').boundingBox()
      assert(entry.activeImmediately)
      const immediateError = Math.max(Math.abs(entry.activeImmediately.x - activeExpected.x), Math.abs(entry.activeImmediately.y - activeExpected.y))
      assert(immediateError <= 8, 'Original mousedown grip error exceeds activation allowance of 8px')
      await page.waitForFunction(() => window.__dshRedWatch.pendingSeen, undefined, { polling: 'raf', timeout: 2000 })
      await page.waitForFunction(() => {
        const watch = window.__dshRedWatch
        return watch.arrivedAt !== null && performance.now() - watch.arrivedAt >= 500
          && document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending !== 'true'
      }, undefined, { polling: 'raf', timeout: 10_000 })
      entry.after500Dataset = await page.locator('.dsh-spatial-grid').evaluate(node => ({ ...node.dataset }))
      assert.notEqual(entry.after500Dataset.hoverPending, 'true', 'No pending state after 500ms confirmation')
      // Preserve rejected geometry too, so a red-overlap failure is diagnosable.
      // Wait only for visual transitions to settle, not a model-derived oracle.
      await page.waitForFunction(({ ids }) => ids.every(id => {
        const node = document.querySelector(`[data-widget-id="${id}"]`)
        return node && node.getAnimations().every(animation => animation.playState !== 'running')
      }), { ids: peers }, { polling: 'raf', timeout: 5000 })
      await frames()
      entry.held = await readGrid(peers)
      entry.held.positions.running = structuredClone(test.candidate)
      entry.observedResumeDirection = Math.sign(entry.held.positions.resume[test.axis] - FIXTURE.resume[test.axis])
      if ((test.name === 'x0-y7' && entry.observedResumeDirection < 0)
        || (test.name === 'x0-y8' && entry.observedResumeDirection > 0)) {
        entry.directionFallback = { expected: test.name === 'x0-y7' ? 'down' : 'up',
          actual: entry.observedResumeDirection < 0 ? 'up' : 'down', positions: structuredClone(entry.held.positions) }
      }
      assert.notEqual(entry.after500Dataset.dropRejected, 'true', 'Valid red-overlap candidate must not be rejected')
      const heldPlaceholder = await page.locator('.react-grid-placeholder').boundingBox()
      assert(heldPlaceholder, 'Held candidate placeholder must exist')
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(heldPlaceholder[key] - placeholderExpected[key]) <= TOLERANCE, 'Active candidate placeholder must be exact')
      checkPlacement(entry.held.positions, test, 'Held preview')
      checkExpected(entry.held.positions, test, entry)
      await shot(`${test.name}-held.png`)
      entry.timing = await finishWatch()
      const timing = entry.timing
      assert(timing.pendingSeen && timing.pendingFrames > 0 && timing.confirmedFrames > 0, 'Observe both pending and confirmed stationary-pointer frames')
      assert.equal(timing.rejectedSeen, false, 'No transient dropRejected state')
      assert.equal(timing.missingActiveFrames, 0); assert.equal(timing.missingPlaceholderFrames, 0)
      assert(Math.max(immediateError, timing.activeMaxError) <= 8, 'Preserve original grab point within threshold allowance')
      entry.activeMaxDrift = Math.max(
        Math.max(timing.activeRange.maxX, entry.activeImmediately.x) - Math.min(timing.activeRange.minX, entry.activeImmediately.x),
        Math.max(timing.activeRange.maxY, entry.activeImmediately.y) - Math.min(timing.activeRange.minY, entry.activeImmediately.y))
      assert(entry.activeMaxDrift <= TOLERANCE, 'Active pixel drift must be <=2px through confirmation')
      assert(timing.placeholderMaxError <= TOLERANCE && timing.placeholderMaxDrift <= TOLERANCE, 'Candidate must not drift while peers exit it')
      assert(timing.crossMaxError <= TOLERANCE, 'Every peer cross-axis coordinate must remain unchanged')
      assert.deepEqual(timing.orderInversions, [], 'All cross-overlapping peer pairs must preserve original axis order on every frame')
      assert.equal(timing.pointerMaxDrift, 0); assert.equal(timing.scrollMaxDrift, 0)
      assert(timing.firstMotionMs !== null && timing.firstMotionMs >= 480, 'No peer motion before 500ms dwell (one-frame tolerance)')
      await page.mouse.up()
      await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging') && !document.querySelector('.react-grid-placeholder'))
      await frames()
      entry.released = await readGrid(ids)
      assert.deepEqual(entry.released.positions, entry.held.positions, 'Release must commit exactly the held candidate and peer preview')
      checkPlacement(entry.released.positions, test, 'Release')
      await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
      await page.locator('.dsh-home[data-editing=false]').waitFor()
      const saved = structuredClone((await api('layout.get')).layout)
      entry.savedPositions = Object.fromEntries(ids.map(id => [id, saved.positions?.['12']?.[id]]))
      assert.deepEqual(entry.savedPositions, entry.released.positions, 'Done API must preserve the release')
      checkPlacement(entry.savedPositions, test, 'Done API')
      await page.reload(); await open(); await frames()
      entry.reloaded = await readGrid(ids)
      assert.deepEqual(entry.reloaded.positions, entry.savedPositions, 'Reload must preserve all positions')
      assert.deepEqual((await api('layout.get')).layout, saved, 'Reload may not rewrite the saved layout')
      checkPlacement(entry.reloaded.positions, test, 'Reload')
      await shot(`${test.name}-reload.png`)
      entry.passed = true
      report.checks.push(`${test.name}: 500ms stationary pointer, !dropRejected, all original overlap peers exit, no overlap, exact candidate, active drift <=2px, unchanged cross axis and original peer order; release + Done + reload`)
    } catch (error) {
      entry.failure = cleanError(error); process.exitCode = 1
      if (page && !page.isClosed()) {
        entry.timing ??= await finishWatch().catch(() => null)
        await page.screenshot({ path: artifact(`${test.name}-failure.png`) }).then(() => report.screenshots.push(`${test.name}-failure.png`)).catch(() => {})
      }
      // Other candidates still need their own seed/evidence even if this one fails.
    } finally {
      try { await restoreOriginal(); entry.restoredOriginalLayout = report.restoredOriginalLayout }
      catch (error) { entry.restoreFailure = cleanError(error); throw error }
    }
  }
  assert.deepEqual(report.errors, [], 'No browser page errors')
} catch (error) {
  report.failure = cleanError(error); process.exitCode = 1
} finally {
  try { await restoreOriginal() } catch (error) { report.restoreFailure = cleanError(error); process.exitCode = 1 }
  try { await writeFile(artifact('report.json'), JSON.stringify(report, null, 2), { flag: 'wx' }) }
  finally { await browser?.close() }
}
console.log(`Red-overlap evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
for (const entry of report.cases) {
  if (entry.directionFallback) console.error(`DIRECTION FALLBACK ${entry.name}: ${JSON.stringify(entry.directionFallback)}`)
  if (entry.failure) console.error(`FAIL ${entry.name}: ${entry.failure}`)
}
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
