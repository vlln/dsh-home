import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Opt-in only: never start a server, visit the shared GUI, import business code,
// or persist the supplied URL/authentication state. Run only after private ready.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the ready private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('axis-', base)))
const artifact = name => `${output}/${name}`
const report = { checks: [], cases: [], errors: [], screenshots: [], restoredOriginalLayout: false,
  evidenceSource: 'Real mouse events, rendered DOM rectangles/datasets and same-origin Home API only' }
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const ROW = 56, GAP = 12, COLS = 12, TOLERANCE = 2, POINTER_TOLERANCE = 8
const VIEWPORT = { width: 1440, height: 2400 }
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const assertGeometry = (positions, label) => {
  const ids = Object.keys(positions)
  for (const [index, id] of ids.entries()) {
    const r = positions[id]
    assert(r && Object.values(r).every(Number.isInteger), `${label}: missing/inexact ${id}`)
    assert(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= COLS, `${label}: out of grid ${id}`)
    for (const other of ids.slice(index + 1)) assert(!overlaps(r, positions[other]), `${label}: ${id}/${other} overlap`)
  }
}
// Independent literal oracles: no imported solver and no deriving expected peer
// positions from the candidate. The horizontal fixtures reserve room on BOTH sides.
const CASES = [
  {
    name: 'vertical-upper-pair', axis: 'y',
    fixture: {
      today: { x: 0, y: 0, w: 8, h: 4 },
      resume: { x: 0, y: 4, w: 4, h: 4 },
      quick: { x: 4, y: 4, w: 4, h: 4 },
    },
    candidate: { x: 0, y: 7, w: 8, h: 4 },
    expected: {
      today: { x: 0, y: 7, w: 8, h: 4 },
      resume: { x: 0, y: 3, w: 4, h: 4 },
      quick: { x: 4, y: 3, w: 4, h: 4 },
    },
  },
  {
    name: 'vertical-split', axis: 'y',
    fixture: {
      today: { x: 0, y: 0, w: 8, h: 4 },
      resume: { x: 0, y: 4, w: 4, h: 4 },
      quick: { x: 4, y: 4, w: 4, h: 4 },
      queue: { x: 0, y: 10, w: 8, h: 4 },
    },
    candidate: { x: 0, y: 7, w: 8, h: 4 },
    expected: {
      today: { x: 0, y: 7, w: 8, h: 4 },
      resume: { x: 0, y: 3, w: 4, h: 4 },
      quick: { x: 4, y: 3, w: 4, h: 4 },
      queue: { x: 0, y: 11, w: 8, h: 4 },
    },
  },
  {
    name: 'horizontal-left-pair', axis: 'x',
    fixture: {
      today: { x: 0, y: 24, w: 4, h: 8 },
      resume: { x: 1, y: 6, w: 4, h: 4 },
      quick: { x: 1, y: 10, w: 4, h: 4 },
    },
    candidate: { x: 4, y: 6, w: 4, h: 8 },
    expected: {
      today: { x: 4, y: 6, w: 4, h: 8 },
      resume: { x: 0, y: 6, w: 4, h: 4 },
      quick: { x: 0, y: 10, w: 4, h: 4 },
    },
  },
  {
    name: 'horizontal-split', axis: 'x',
    fixture: {
      today: { x: 0, y: 24, w: 4, h: 8 },
      resume: { x: 1, y: 6, w: 4, h: 4 },
      quick: { x: 1, y: 10, w: 4, h: 4 },
      queue: { x: 7, y: 6, w: 4, h: 8 },
    },
    candidate: { x: 4, y: 6, w: 4, h: 8 },
    expected: {
      today: { x: 4, y: 6, w: 4, h: 8 },
      resume: { x: 0, y: 6, w: 4, h: 4 },
      quick: { x: 0, y: 10, w: 4, h: 4 },
      queue: { x: 8, y: 6, w: 4, h: 8 },
    },
  },
]
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
const finishWatch = async () => page.evaluate(() => {
  const watch = window.__dshAxisWatch
  if (!watch) return null
  watch.active = false; cancelAnimationFrame(watch.frame); watch.remove()
  const { active, frame, remove, arrivedAt, firstMotionAt, ...measurements } = watch
  return { ...measurements, observedMs: arrivedAt === null ? 0 : performance.now() - arrivedAt,
    firstMotionMs: firstMotionAt === null ? null : firstMotionAt - arrivedAt }
})
const restoreOriginal = async () => {
  // Dispose the UI first so delayed layout saves cannot race API recovery.
  if (page && !page.isClosed()) {
    await finishWatch().catch(() => {})
    await page.mouse.up().catch(() => {})
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))).catch(() => {})
    await page.close({ runBeforeUnload: false })
  }
  if (original !== undefined && modified) {
    await api('workbench.set', { layout: original, instances: originalInstances })
    assert.deepEqual((await api('layout.get')).layout, original, 'Restored layout differs from exclusive recovery backup')
    assert.deepEqual((await api('workbench.get')).instances, originalInstances, 'Layout-only regression changed widget instances')
    report.instancesUnchanged = true
    modified = false
  }
  report.restoredOriginalLayout = original !== undefined && !modified
}
try {
  for (const test of CASES) {
    assertGeometry(test.fixture, `${test.name} seed`)
    assertGeometry(test.expected, `${test.name} expected`)
    assert.deepEqual(test.expected.today, test.candidate)
    const peers = Object.keys(test.fixture).filter(id => id !== 'today')
    assert(peers.every(id => overlaps(test.candidate, test.fixture[id])), 'Every fixture peer must initially intersect the candidate')
    for (const id of peers) {
      const cross = test.axis === 'x' ? 'y' : 'x'
      assert.equal(test.expected[id][cross], test.fixture[id][cross], 'Literal oracle must preserve the cross coordinate')
    }
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' })
  const newPage = async () => {
    page = await context.newPage()
    page.on('pageerror', error => report.errors.push(cleanError(error)))
    // Known onboarding handlers only; never blanket-dismiss unknown dialogs.
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
  const boxes = async ids => Object.fromEntries(await Promise.all(ids.map(async id => {
    const box = await widget(id).boundingBox(); assert(box, `Missing ${id}`)
    return [id, box]
  })))
  const toBox = (r, grid) => ({ x: grid.x + r.x * (grid.width + GAP) / COLS, y: grid.y + r.y * ROW,
    width: r.w * (grid.width + GAP) / COLS - GAP, height: r.h * ROW - GAP })
  const readGrid = async ids => {
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Requires the actual 12-column desktop grid')
    const rendered = await boxes(ids), step = (grid.width + GAP) / COLS
    const positions = Object.fromEntries(ids.map(id => {
      const r = rendered[id]
      const cell = { x: Math.round((r.x - grid.x) / step), y: Math.round((r.y - grid.y) / ROW),
        w: Math.round((r.width + GAP) / step), h: Math.round((r.height + GAP) / ROW) }
      const snapped = toBox(cell, grid)
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(r[key] - snapped[key]) <= TOLERANCE, `Unsnapped DOM ${id}.${key}`)
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
  const registered = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const allIds = new Set([...registered, ...(original.order ?? []), ...(original.hidden ?? []),
    ...Object.values(original.positions ?? {}).flatMap(positions => Object.keys(positions)),
    'recent', 'resume', 'queue', 'tasks', 'today', 'running', 'areas', 'rhythm', 'quick'])
  for (const test of CASES) {
    const { name, fixture, candidate, expected, axis } = test
    const ids = Object.keys(fixture), peers = ids.filter(id => id !== 'today'), cross = axis === 'x' ? 'y' : 'x'
    const entry = { ...structuredClone(test), restoredOriginalLayout: false }
    report.cases.push(entry)
    try {
      if (!page || page.isClosed()) await newPage()
      const layout = { ...structuredClone(original), hidden: [...allIds].filter(id => !ids.includes(id)),
        positions: { ...original.positions, '12': structuredClone(fixture) } }
      modified = true; report.restoredOriginalLayout = false
      // Disposable explicit instances: never rely on legacy layout.set materializing builtin ids.
      const fixtures = [...allIds].filter(id => !originalInstances.some(instance => instance.instanceId === id)).map(id => ({
        instanceId: id, typeId: `@vlln/dsh-home:${id}`, configVersion: id === 'quick' ? 2 : 1,
        config: id === 'quick' ? { links: [] } : {},
      }))
      await api('workbench.set', { layout, instances: [...originalInstances, ...fixtures] })
      await page.reload(); await open()
      await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
      await page.locator('.dsh-home[data-editing=true]').waitFor(); await frames()
      assert.equal(await page.locator('.dsh-spatial-container').getAttribute('data-cols'), '12', 'Fixture scope must really use 12 columns')
      assert.deepEqual((await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))).sort(), [...ids].sort(),
        'Only fixture cards may be visible')
      const baseline = await readGrid(ids)
      assert.deepEqual(baseline.positions, fixture, 'Real seeded DOM must equal the literal fixture')
      assertGeometry(baseline.positions, 'Seed DOM')
      entry.before = baseline.rendered
      const { grid } = baseline, step = (grid.width + GAP) / COLS
      const grip = await widget('today').locator('.dsh-tools .dsh-widget-grip').boundingBox()
      assert(grip, 'Today must expose a real drag header')
      const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
      assert(start.y > 72 && start.y < VIEWPORT.height - 72, 'Source title midpoint must be visible without edge scrolling')
      await page.mouse.move(start.x, start.y)
      await page.evaluate(() => {
        const box = () => {
          const r = document.querySelector('[data-widget-id="today"]').getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }
        document.addEventListener('mousedown', event => {
          const r = box()
          window.__dshAxisGrab = { x: event.clientX - r.x, y: event.clientY - r.y, box: r }
        }, { capture: true, once: true })
        // Observe the threshold event BEFORE React moves the source. This is a
        // candidate-only offset, never a replacement for the original grab oracle.
        document.addEventListener('mousemove', event => {
          const r = box()
          window.__dshAxisActivation = { x: event.clientX - r.x, y: event.clientY - r.y,
            pointer: { x: event.clientX, y: event.clientY }, box: r }
        }, { capture: true, once: true })
      })
      await page.mouse.down()
      const grab = await page.evaluate(() => window.__dshAxisGrab)
      assert(grab, 'Record original mousedown before crossing activation threshold')
      await page.mouse.move(start.x - 8, start.y)
      await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
      const activation = await page.evaluate(() => window.__dshAxisActivation)
      assert(activation, 'Record the real threshold event')
      // Correct the activation threshold offset explicitly so the computed raw
      // candidate is EXACT, not merely near a rounding boundary. Active-follow
      // error still uses the original mousedown offset and a separate 8px bound.
      const pointer = { x: grid.x + candidate.x * step + activation.x, y: grid.y + candidate.y * ROW + activation.y }
      const computedCandidate = { x: (pointer.x - activation.x - grid.x) / step,
        y: (pointer.y - activation.y - grid.y) / ROW, w: candidate.w, h: candidate.h }
      assert(Math.abs(computedCandidate.x - candidate.x) < 1e-9 && Math.abs(computedCandidate.y - candidate.y) < 1e-9,
        'Threshold-adjusted computed candidate must equal the literal candidate exactly')
      assert(pointer.y > 160 && pointer.y < VIEWPORT.height - 72, 'Destination pointer must avoid auto-scroll edges')
      const activeExpected = { x: pointer.x - grab.x, y: pointer.y - grab.y }
      const placeholderExpected = toBox(candidate, grid)
      const expectedBoxes = Object.fromEntries(peers.map(id => [id, toBox(expected[id], grid)]))
      Object.assign(entry, { start, grab, activation, pointer, computedCandidate, activeExpected, expectedBoxes })
      await page.evaluate(({ pointer, before, peers, cross, activeExpected, placeholderExpected }) => {
        const grid = document.querySelector('.dsh-spatial-grid')
        const range = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
        const watch = { active: true, arrivedAt: null, firstMotionAt: null, frames: 0, pendingFrames: 0, confirmedFrames: 0,
          pendingSeen: false, rejectedSeen: false, activeMaxError: 0, placeholderMaxError: 0, placeholderMaxDrift: 0,
          crossMaxError: 0, pointerMaxDrift: 0, scrollMaxDrift: 0, missingActiveFrames: 0, missingPlaceholderFrames: 0,
          activeRange: range(), placeholderRange: range(), samples: [] }
        window.__dshAxisWatch = watch
        const rejection = records => {
          watch.rejectedSeen ||= grid.dataset.dropRejected === 'true'
            || (records ?? []).some(r => r.attributeName === 'data-drop-rejected' && r.oldValue === 'true')
        }
        const observer = new MutationObserver(rejection)
        observer.observe(grid, { attributes: true, attributeOldValue: true }); rejection()
        const scrollNodes = new Set([document.scrollingElement])
        for (let node = document.querySelector('[data-widget-id="today"]'); node; node = node.parentElement) scrollNodes.add(node)
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
            watch.frames++; watch.pendingSeen ||= pending
            if (pending) watch.pendingFrames++
            else if (watch.pendingSeen) watch.confirmedFrames++
            rejection()
            // Exclude destination-event React commit / intentional placeholder
            // landing transition, but sample the entire 500ms confirmation edge.
            if (ms >= 40) measure('[data-widget-id="today"]', activeExpected, watch.activeRange, 'active')
            if (ms >= 150) measure('.react-grid-placeholder', placeholderExpected, watch.placeholderRange, 'placeholder')
            for (const { node, x, y } of scroll) watch.scrollMaxDrift = Math.max(watch.scrollMaxDrift,
              Math.abs(node.scrollLeft - x), Math.abs(node.scrollTop - y))
            const rects = Object.fromEntries(peers.map(id => {
              const r = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
              return [id, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null]
            }))
            for (const id of peers) {
              if (!rects[id]) { watch.crossMaxError = Infinity; continue }
              watch.crossMaxError = Math.max(watch.crossMaxError, Math.abs(rects[id][cross] - before[id][cross]))
              if (['x', 'y', 'width', 'height'].some(key => Math.abs(rects[id][key] - before[id][key]) >= 2)) watch.firstMotionAt ??= performance.now()
            }
            watch.samples.push({ ms, pending, dataset: { ...grid.dataset }, peers: rects })
          }
          watch.frame = requestAnimationFrame(sample)
        }
        watch.frame = requestAnimationFrame(sample)
      }, { pointer, before: baseline.rendered, peers, cross, activeExpected, placeholderExpected })
      // One destination move only. Confirmation cannot rely on another mousemove.
      await page.mouse.move(pointer.x, pointer.y); await frames()
      entry.activeImmediately = await widget('today').boundingBox()
      assert(entry.activeImmediately, 'Held active must exist immediately')
      const immediateError = Math.max(Math.abs(entry.activeImmediately.x - activeExpected.x), Math.abs(entry.activeImmediately.y - activeExpected.y))
      assert(immediateError <= POINTER_TOLERANCE, `Original-grab error ${immediateError}px exceeds 8px`)
      await page.waitForFunction(() => window.__dshAxisWatch.pendingSeen, undefined, { polling: 'raf', timeout: 2000 })
      await page.waitForFunction(({ expectedBoxes, placeholderExpected }) => {
        const watch = window.__dshAxisWatch
        if (!watch || watch.arrivedAt === null || performance.now() - watch.arrivedAt < 500) return false
        if (watch.rejectedSeen) throw new Error('Valid same-axis preview was rejected')
        if (document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending === 'true') return false
        const exact = (r, expected) => r && Object.keys(expected).every(key => Math.abs(r[key] - expected[key]) <= 2)
        return exact(document.querySelector('.react-grid-placeholder')?.getBoundingClientRect(), placeholderExpected)
          && Object.entries(expectedBoxes).every(([id, expected]) => exact(document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect(), expected))
      }, { expectedBoxes, placeholderExpected }, { polling: 'raf', timeout: 10_000 })
      await frames()
      entry.held = await readGrid(peers)
      entry.held.positions.today = structuredClone(candidate)
      assert.deepEqual(entry.held.positions, expected, 'Held peer boxes must exactly match same-axis oracle, not a column-reordered solution')
      assertGeometry(entry.held.positions, 'Held preview')
      entry.held.dataset = await page.locator('.dsh-spatial-grid').evaluate(node => ({ ...node.dataset }))
      await shot(`${name}-held.png`)
      entry.timing = await finishWatch()
      const timing = entry.timing
      assert(timing.pendingSeen && timing.pendingFrames > 0 && timing.confirmedFrames > 0, 'Observe pending and confirmed frames with the same stationary mouse')
      assert.equal(timing.rejectedSeen, false, 'No transient drop rejection')
      assert.equal(timing.missingActiveFrames, 0); assert.equal(timing.missingPlaceholderFrames, 0)
      assert(Math.max(immediateError, timing.activeMaxError) <= POINTER_TOLERANCE, 'Keep original mousedown grab within 8px')
      entry.activeMaxDrift = Math.max(
        Math.max(timing.activeRange.maxX, entry.activeImmediately.x) - Math.min(timing.activeRange.minX, entry.activeImmediately.x),
        Math.max(timing.activeRange.maxY, entry.activeImmediately.y) - Math.min(timing.activeRange.minY, entry.activeImmediately.y))
      assert(entry.activeMaxDrift <= TOLERANCE, 'Stationary active viewport drift must be <=2px through confirmation')
      assert(timing.placeholderMaxError <= TOLERANCE && timing.placeholderMaxDrift <= TOLERANCE, 'Exact candidate placeholder must not drift')
      assert(timing.crossMaxError <= TOLERANCE, `Peer cross coordinate ${cross} must never change`)
      assert.equal(timing.pointerMaxDrift, 0); assert.equal(timing.scrollMaxDrift, 0)
      assert(timing.firstMotionMs !== null && timing.firstMotionMs >= 480, 'Wait 500ms before peer motion (one-frame tolerance)')
      await page.mouse.up()
      await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging') && !document.querySelector('.react-grid-placeholder'))
      await frames()
      entry.released = await readGrid(ids)
      assert.deepEqual(entry.released.positions, expected, 'Release must commit exactly the literal oracle')
      assertGeometry(entry.released.positions, 'Release DOM')
      await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
      await page.locator('.dsh-home[data-editing=false]').waitFor()
      const saved = structuredClone((await api('layout.get')).layout)
      entry.savedPositions = Object.fromEntries(ids.map(id => [id, saved.positions?.['12']?.[id]]))
      assert.deepEqual(entry.savedPositions, expected, 'Done API must equal the literal expected positions')
      assertGeometry(entry.savedPositions, 'Done API')
      await shot(`${name}-done.png`)
      await page.reload(); await open(); await frames()
      entry.reloaded = await readGrid(ids)
      assert.deepEqual(entry.reloaded.positions, expected, 'Reload DOM must equal the literal expected positions')
      assertGeometry(entry.reloaded.positions, 'Reload DOM')
      assert.deepEqual((await api('layout.get')).layout, saved, 'Reload may not silently rewrite the saved layout')
      await shot(`${name}-reload.png`)
      entry.passed = true
      report.checks.push(`${name}: exact same-axis peers, unchanged ${cross}, 500ms dwell, active drift <=2px, held + Done + reload no overlap`)
    } catch (error) {
      entry.failure = cleanError(error)
      if (page && !page.isClosed()) {
        entry.timing ??= await finishWatch().catch(() => null)
        await page.screenshot({ path: artifact(`${name}-failure.png`) }).then(() => report.screenshots.push(`${name}-failure.png`)).catch(() => {})
      }
      throw error
    } finally {
      try {
        await restoreOriginal(); entry.restoredOriginalLayout = report.restoredOriginalLayout
      } catch (error) { entry.restoreFailure = cleanError(error); throw error }
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
console.log(`Same-axis evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
