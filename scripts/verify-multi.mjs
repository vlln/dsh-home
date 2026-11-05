import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Opt-in only: this script never starts a server, visits the shared GUI, imports
// business functions, or persists the supplied URL/authentication state.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('multi-', base)))
const artifact = name => `${output}/${name}`
const report = { checks: [], cases: [], errors: [], screenshots: [], restoredOriginalLayout: false,
  evidenceSource: 'Real mouse events, rendered DOM rectangles/datasets and same-origin Home API only' }
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const ROW = 56, GAP = 12, TOLERANCE = 2, POINTER_TOLERANCE = 8
const VIEWPORT = { width: 1440, height: 1900 }
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const assertNoOverlap = (positions, label) => {
  const ids = Object.keys(positions)
  for (const [index, id] of ids.entries()) for (const other of ids.slice(index + 1)) {
    assert(!overlaps(positions[id], positions[other]), `${label}: ${id}/${other} overlap`)
  }
}
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
  const watch = window.__dshMultiWatch
  if (!watch) return null
  watch.active = false
  cancelAnimationFrame(watch.frame)
  watch.remove()
  const { active, frame, remove, arrivedAt, firstMotionAt, ...measurements } = watch
  return { ...measurements, observedMs: arrivedAt === null ? 0 : performance.now() - arrivedAt,
    firstMotionMs: firstMotionAt === null ? null : firstMotionAt - arrivedAt }
})
// Close the UI before restoring: a delayed layout save must not race recovery.
const restoreOriginal = async () => {
  if (page && !page.isClosed()) {
    await finishWatch().catch(() => {})
    await page.mouse.up().catch(() => {})
    // Flush pending interaction/layout responses before disposing the UI.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))).catch(() => {})
    await page.close({ runBeforeUnload: false })
  }
  if (original !== undefined && modified) {
    await api('layout.set', { layout: original })
    assert.deepEqual((await api('layout.get')).layout, original, 'Restored API layout differs from recovery backup')
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
    await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }),
      async () => { await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 2000 }).catch(() => {}) },
      { noWaitAfter: true })
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
  const edit = async () => {
    await page.getByRole('button', { name: /^(Edit layout|编辑布局)$/ }).click()
    await page.locator('.dsh-home[data-editing=true]').waitFor()
  }
  const done = async () => {
    await page.getByRole('button', { name: /^(Done|完成)$/ }).click()
    await page.locator('.dsh-home[data-editing=false]').waitFor()
  }
  const widget = id => page.locator(`[data-widget-id="${id}"]`)
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const boxes = async ids => Object.fromEntries(await Promise.all(ids.map(async id => {
    const rect = await widget(id).boundingBox()
    assert(rect, `Missing ${id}`)
    return [id, rect]
  })))
  const shot = async name => {
    await frames()
    await page.screenshot({ path: artifact(name) })
    report.screenshots.push(name)
  }
  // Decode only real DOM geometry, not React internals or exported layout code.
  const readGrid = async ids => {
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Requires the 12-column desktop grid')
    const rendered = await boxes(ids), step = (grid.width + GAP) / 12
    const positions = Object.fromEntries(ids.map(id => {
      const box = rendered[id]
      const cell = { x: Math.round((box.x - grid.x) / step), y: Math.round((box.y - grid.y) / ROW),
        w: Math.round((box.width + GAP) / step), h: Math.round((box.height + GAP) / ROW) }
      assert(cell.x >= 0 && cell.x + cell.w <= 12 && cell.y >= 0, `Out-of-grid DOM card: ${id}`)
      assert(Math.abs(box.x - grid.x - cell.x * step) < TOLERANCE, `Unsnapped DOM column: ${id}`)
      assert(Math.abs(box.y - grid.y - cell.y * ROW) < TOLERANCE, `Unsnapped DOM row: ${id}`)
      assert(Math.abs(box.width - (cell.w * step - GAP)) < TOLERANCE, `Unsnapped DOM width: ${id}`)
      assert(Math.abs(box.height - (cell.h * ROW - GAP)) < TOLERANCE, `Unsnapped DOM height: ${id}`)
      return [id, cell]
    }))
    return { grid, rendered, positions }
  }
  await newPage(); await open()
  original = structuredClone((await api('layout.get')).layout)
  // Exclusive backup before the first mutation; every fixture restores this copy.
  await writeFile(artifact('original-layout.json'), JSON.stringify(original, null, 2), { flag: 'wx' })
  const registered = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const allIds = new Set([...registered, ...(original.order ?? []), ...(original.hidden ?? []),
    ...Object.values(original.positions ?? {}).flatMap(positions => Object.keys(positions)),
    'recent', 'resume', 'queue', 'tasks', 'today', 'running', 'areas', 'rhythm', 'quick'])
  const wide = {
    today: { x: 0, y: 0, w: 8, h: 4 },
    resume: { x: 0, y: 8, w: 4, h: 4 },
    quick: { x: 4, y: 8, w: 4, h: 4 },
    running: { x: 8, y: 8, w: 4, h: 4 },
    queue: { x: 4, y: 12, w: 4, h: 4 },
    tasks: { x: 8, y: 12, w: 4, h: 8 },
    rhythm: { x: 0, y: 16, w: 8, h: 4 },
  }
  const middle = {
    today: { x: 2, y: 0, w: 8, h: 4 },
    resume: { x: 0, y: 8, w: 6, h: 4 },
    quick: { x: 6, y: 8, w: 6, h: 4 },
    queue: { x: 0, y: 12, w: 6, h: 4 },
    tasks: { x: 6, y: 12, w: 6, h: 4 },
  }
  const runCase = async (name, fixture, candidateY, grabSide) => {
    const ids = Object.keys(fixture), peers = ids.filter(id => id !== 'today')
    const candidate = { ...fixture.today, y: candidateY }
    const hitPeers = peers.filter(id => overlaps(candidate, fixture[id]))
    assert(hitPeers.length >= 2, 'Fixture must exercise multiple simultaneous overlaps')
    if (name.startsWith('middle')) assert.equal(hitPeers.length, 4, 'Middle candidate must cross both upper and both lower cards')
    const entry = { name, grabSide, fixture: structuredClone(fixture), candidate, hitPeers,
      restoredOriginalLayout: false, optionalMultipleDirections: { required: false, observed: false } }
    report.cases.push(entry)
    try {
      if (!page || page.isClosed()) await newPage()
      assertNoOverlap(fixture, 'Seed')
      const layout = { ...structuredClone(original), hidden: [...allIds].filter(id => !ids.includes(id)),
        positions: { ...original.positions, '12': structuredClone(fixture) } }
      modified = true; report.restoredOriginalLayout = false
      await api('layout.set', { layout })
      await page.reload(); await open(); await edit(); await frames()
      assert.deepEqual((await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))).sort(), [...ids].sort(),
        'All widgets outside the fixture must be hidden')
      const baseline = await readGrid(ids)
      assert.deepEqual(baseline.positions, fixture, 'Fixture must actually render the requested API geometry')
      entry.before = baseline.rendered
      const { grid } = baseline, step = (grid.width + GAP) / 12
      const grip = await widget('today').locator('.dsh-widget-grip').first().boundingBox()
      assert(grip, 'Today must expose a real DOM drag header')
      // x+5 (middle-right of the wide header) and x+6.5 (right) place the
      // pointer far enough right that even y7 selects the old horizontal axis.
      // Exact x+4 would accidentally favor vertical movement at candidate y7.
      const start = { x: baseline.rendered.today.x + (grabSide === 'right' ? 6.5 : 5) * step,
        y: grip.y + grip.height / 2 }
      assert(start.x > grip.x && start.x < grip.x + grip.width, 'Grab must remain inside the real header')
      await page.mouse.move(start.x, start.y)
      await page.evaluate(() => {
        document.addEventListener('mousedown', event => {
          const r = document.querySelector('[data-widget-id="today"]').getBoundingClientRect()
          window.__dshMultiGrab = { x: event.clientX - r.x, y: event.clientY - r.y }
        }, { capture: true, once: true })
      })
      await page.mouse.down()
      const grab = await page.evaluate(() => window.__dshMultiGrab)
      assert(grab, 'Record actual mousedown offset, never recalibrate after activation')
      entry.grab = grab
      await page.mouse.move(start.x - 8, start.y)
      await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
      const pointer = { x: grid.x + candidate.x * step + grab.x, y: grid.y + candidate.y * ROW + grab.y }
      assert(pointer.y > 64 && pointer.y < VIEWPORT.height - 64, 'Stationary pointer must avoid auto-scroll edges')
      const activeExpected = { x: pointer.x - grab.x, y: pointer.y - grab.y }
      const placeholderExpected = { x: grid.x + candidate.x * step, y: grid.y + candidate.y * ROW,
        width: candidate.w * step - GAP, height: candidate.h * ROW - GAP }
      entry.pointer = pointer; entry.activeExpected = activeExpected
      // Diagnostic arithmetic only: it does not call or mirror a business function.
      // Record why an attempted horizontal shift of the first hit cannot clear
      // the whole wide candidate inside the 12-column grid.
      const firstHit = fixture[hitPeers[0]]
      entry.firstHitPointerNormalized = {
        dx: ((pointer.x - grid.x) / step - firstHit.x - firstHit.w / 2) / (firstHit.w / 2),
        dy: ((pointer.y - grid.y) / ROW - firstHit.y - firstHit.h / 2) / (firstHit.h / 2),
      }
      assert(Math.abs(entry.firstHitPointerNormalized.dx) > Math.abs(entry.firstHitPointerNormalized.dy),
        'Grab must really exercise the former first-hit horizontal choice, not an easy vertical path')
      const leftAttempt = { ...firstHit, x: candidate.x - firstHit.w }
      const rightAttempt = { ...firstHit, x: candidate.x + candidate.w }
      const escape = attempt => ({ x: attempt.x, outside: attempt.x < 0 || attempt.x + attempt.w > 12,
        blockedBy: peers.filter(id => id !== hitPeers[0] && overlaps(attempt, fixture[id])) })
      entry.horizontalEscapeOfFirstHit = { left: escape(leftAttempt), right: escape(rightAttempt) }
      assert(Object.values(entry.horizontalEscapeOfFirstHit).every(side => side.outside || side.blockedBy.length > 0),
        'Fixture must block both immediate horizontal escapes of the first hit')
      await page.evaluate(({ pointer, before, peers, activeExpected, placeholderExpected }) => {
        const range = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
        const watch = { active: true, arrivedAt: null, firstMotionAt: null, frames: 0,
          pendingSeen: false, pendingFrames: 0, confirmedFrames: 0, rejectedSeen: false,
          activeMaxError: 0, placeholderMaxError: 0, activeMaxDrift: 0, placeholderMaxDrift: 0,
          missingActiveFrames: 0, missingPlaceholderFrames: 0, pointerMaxDrift: 0, scrollMaxDrift: 0,
          activeRange: range(), placeholderRange: range(), samples: [] }
        window.__dshMultiWatch = watch
        const grid = document.querySelector('.dsh-spatial-grid')
        const observeRejection = records => {
          watch.rejectedSeen ||= grid.dataset.dropRejected === 'true'
            || (records ?? []).some(record => record.attributeName === 'data-drop-rejected' && record.oldValue === 'true')
        }
        const observer = new MutationObserver(observeRejection)
        observer.observe(grid, { attributes: true, attributeOldValue: true })
        observeRejection()
        const scrollNodes = new Set([document.scrollingElement])
        for (let node = document.querySelector('[data-widget-id="today"]'); node; node = node.parentElement) scrollNodes.add(node)
        const scroll = [...scrollNodes].filter(Boolean).map(node => ({ node, x: node.scrollLeft, y: node.scrollTop }))
        const arrival = event => {
          if (watch.arrivedAt === null && Math.abs(event.clientX - pointer.x) <= 1 && Math.abs(event.clientY - pointer.y) <= 1) {
            watch.arrivedAt = performance.now()
            watch.arrivedPointer = { x: event.clientX, y: event.clientY }
          }
          if (watch.arrivedAt !== null) watch.pointerMaxDrift = Math.max(watch.pointerMaxDrift,
            Math.abs(event.clientX - watch.arrivedPointer.x), Math.abs(event.clientY - watch.arrivedPointer.y))
        }
        document.addEventListener('mousemove', arrival, true)
        watch.remove = () => {
          observeRejection(observer.takeRecords()); observer.disconnect()
          document.removeEventListener('mousemove', arrival, true)
        }
        const measure = (selector, expected, bounds, prefix) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect()
          if (!rect) { watch[`missing${prefix === 'active' ? 'Active' : 'Placeholder'}Frames`]++; return }
          for (const key of Object.keys(expected)) watch[`${prefix}MaxError`] = Math.max(watch[`${prefix}MaxError`], Math.abs(rect[key] - expected[key]))
          bounds.minX = Math.min(bounds.minX, rect.x); bounds.maxX = Math.max(bounds.maxX, rect.x)
          bounds.minY = Math.min(bounds.minY, rect.y); bounds.maxY = Math.max(bounds.maxY, rect.y)
          watch[`${prefix}MaxDrift`] = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
        }
        const sample = () => {
          if (!watch.active) return
          if (watch.arrivedAt !== null) {
            watch.frames++
            const elapsed = performance.now() - watch.arrivedAt
            const pending = grid.dataset.hoverPending === 'true'
            watch.pendingSeen ||= pending
            if (pending) watch.pendingFrames++
            else if (watch.pendingSeen) watch.confirmedFrames++
            observeRejection()
            // React commit and the placeholder's intentional landing transition
            // are excluded, but pending -> confirmed displacement is all sampled.
            if (elapsed >= 40) measure('[data-widget-id="today"]', activeExpected, watch.activeRange, 'active')
            if (elapsed >= 150) measure('.react-grid-placeholder', placeholderExpected, watch.placeholderRange, 'placeholder')
            for (const { node, x, y } of scroll) watch.scrollMaxDrift = Math.max(watch.scrollMaxDrift,
              Math.abs(node.scrollLeft - x), Math.abs(node.scrollTop - y))
            const rects = Object.fromEntries(peers.map(id => {
              const r = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
              return [id, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null]
            }))
            if (peers.some(id => !rects[id] || ['x', 'y', 'width', 'height'].some(key => Math.abs(rects[id][key] - before[id][key]) >= 2))) {
              watch.firstMotionAt ??= performance.now()
            }
            // Keep full mouse-stop frame evidence, not just final bounding boxes.
            watch.samples.push({ ms: elapsed, pending, dataset: { ...grid.dataset }, peers: rects })
          }
          watch.frame = requestAnimationFrame(sample)
        }
        watch.frame = requestAnimationFrame(sample)
      }, { pointer, before: baseline.rendered, peers, activeExpected, placeholderExpected })
      // Exactly one destination move. No mouse movement may trigger confirmation.
      await page.mouse.move(pointer.x, pointer.y)
      await frames()
      entry.activeImmediately = await widget('today').boundingBox()
      assert(entry.activeImmediately, 'Held today must exist immediately after destination')
      const immediateError = Math.max(Math.abs(entry.activeImmediately.x - activeExpected.x), Math.abs(entry.activeImmediately.y - activeExpected.y))
      assert(immediateError <= POINTER_TOLERANCE, `Immediate original-grab error ${immediateError}px exceeds 8px`)
      await page.waitForFunction(() => window.__dshMultiWatch.pendingSeen, undefined, { polling: 'raf', timeout: 2000 })
      await page.waitForFunction(({ placeholderExpected }) => {
        const r = document.querySelector('.react-grid-placeholder')?.getBoundingClientRect()
        return r && Object.keys(placeholderExpected).every(key => Math.abs(r[key] - placeholderExpected[key]) < 2)
      }, { placeholderExpected }, { polling: 'raf', timeout: 2000 })
      entry.mouseStopPending = { boxes: await boxes(ids), dataset: await page.locator('.dsh-spatial-grid').evaluate(node => ({ ...node.dataset })) }
      // Wait at least 500ms on rAF, then require all initially intersecting peers
      // (not only the first peer) to clear the candidate and all peers each other.
      await page.waitForFunction(({ candidateBox, peers, hitPeers }) => {
        const watch = window.__dshMultiWatch
        if (!watch || watch.arrivedAt === null || performance.now() - watch.arrivedAt < 700) return false
        if (watch.rejectedSeen) throw new Error('dropRejected appeared during a valid multi-target hover')
        if (document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending === 'true') return false
        const rects = Object.fromEntries(peers.map(id => {
          const r = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
          return [id, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null]
        }))
        if (peers.some(id => !rects[id])) return false
        const hit = (a, b) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1
          && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1
        if (hitPeers.some(id => hit(candidateBox, rects[id]))) return false
        if (peers.some(id => hit(candidateBox, rects[id]))) return false
        return peers.every((id, i) => peers.slice(i + 1).every(other => !hit(rects[id], rects[other])))
      }, { candidateBox: placeholderExpected, peers, hitPeers }, { polling: 'raf', timeout: 10_000 })
      await frames()
      // Screenshot and DOM snapshot are captured with the mouse STILL down and
      // stationary, before release, Done, reload, or any API layout mutation.
      entry.mouseStopConfirmed = await readGrid(peers)
      entry.mouseStopConfirmed.positions.today = candidate
      assertNoOverlap(entry.mouseStopConfirmed.positions, 'Stationary confirmed preview')
      for (const id of hitPeers) assert.notDeepEqual(entry.mouseStopConfirmed.positions[id], fixture[id], `Every overlapping peer must yield: ${id}`)
      entry.mouseStopConfirmed.dataset = await page.locator('.dsh-spatial-grid').evaluate(node => ({ ...node.dataset }))
      await shot(`${name}-mouse-stop.png`)
      entry.timing = await finishWatch()
      const timing = entry.timing
      assert(timing.pendingSeen && timing.pendingFrames > 0 && timing.confirmedFrames > 0, 'Sample pending and confirmed frames with the same stationary pointer')
      assert.equal(timing.rejectedSeen, false, 'dropRejected must never appear, including transient mutations')
      assert.equal(timing.missingActiveFrames, 0); assert.equal(timing.missingPlaceholderFrames, 0)
      assert(Math.max(immediateError, timing.activeMaxError) <= POINTER_TOLERANCE, 'Held active must preserve its original pointer grab')
      const drift = Math.max(timing.activeRange.maxX, entry.activeImmediately.x) - Math.min(timing.activeRange.minX, entry.activeImmediately.x)
      const driftY = Math.max(timing.activeRange.maxY, entry.activeImmediately.y) - Math.min(timing.activeRange.minY, entry.activeImmediately.y)
      entry.activeMaxDrift = Math.max(drift, driftY)
      assert(entry.activeMaxDrift <= TOLERANCE, 'Held active must not drift while stationary peers yield')
      assert(timing.placeholderMaxError <= TOLERANCE && timing.placeholderMaxDrift <= TOLERANCE, 'Placeholder must remain fixed at the whole wide candidate')
      assert.equal(timing.pointerMaxDrift, 0); assert.equal(timing.scrollMaxDrift, 0)
      assert(timing.firstMotionMs !== null && timing.firstMotionMs >= 480, 'Peers must wait 500ms before movement (one-frame allowance)')
      const directions = new Set()
      entry.peerMovement = Object.fromEntries(peers.map(id => {
        const before = fixture[id], after = entry.mouseStopConfirmed.positions[id]
        const delta = { dx: after.x - before.x, dy: after.y - before.y }
        if (delta.dx) directions.add(delta.dx > 0 ? 'right' : 'left')
        if (delta.dy) directions.add(delta.dy > 0 ? 'down' : 'up')
        return [id, delta]
      }))
      entry.optionalMultipleDirections = { required: false, observed: directions.size > 1, directions: [...directions].sort(),
        domDataset: entry.mouseStopConfirmed.dataset }
      await page.mouse.up()
      await page.waitForFunction(() => !document.body.classList.contains('dsh-home-dragging') && !document.querySelector('.react-grid-placeholder'))
      await frames()
      entry.released = await readGrid(ids)
      assert.notEqual(await page.locator('.dsh-spatial-grid').getAttribute('data-drop-rejected'), 'true', 'Release must not mark a rejected drop')
      assertNoOverlap(entry.released.positions, 'Released DOM')
      assert.deepEqual(entry.released.positions, entry.mouseStopConfirmed.positions, 'Release must commit the actual confirmed preview')
      await done()
      const saved = structuredClone((await api('layout.get')).layout)
      entry.savedPositions = Object.fromEntries(ids.map(id => [id, saved.positions?.['12']?.[id]]))
      assert.deepEqual(entry.savedPositions, entry.released.positions, 'Done API must persist every real DOM card position')
      assertNoOverlap(entry.savedPositions, 'Done API')
      await page.reload(); await open(); await frames()
      entry.reloaded = await readGrid(ids)
      assertNoOverlap(entry.reloaded.positions, 'Reloaded DOM')
      assert.deepEqual(entry.reloaded.positions, entry.savedPositions, 'Reload must match Done API for every fixture card')
      assert.deepEqual((await api('layout.get')).layout, saved, 'Reload must not mutate the saved layout')
      await shot(`${name}-reload.png`)
      entry.passed = true
      report.checks.push(`${name}: all ${hitPeers.length} overlapping peers cleared; stationary active/placeholder; Done + reload no overlap; multipleDirections=${entry.optionalMultipleDirections.observed} (optional)`)
    } catch (error) {
      entry.failure = cleanError(error)
      if (page && !page.isClosed()) {
        entry.timing ??= await finishWatch().catch(() => null)
        await page.screenshot({ path: artifact(`${name}-failure.png`) }).then(() => report.screenshots.push(`${name}-failure.png`)).catch(() => {})
      }
      throw error
    } finally {
      // Required per fixture, even on an assertion timeout/lost mutation response.
      try {
        await restoreOriginal()
        entry.restoredOriginalLayout = report.restoredOriginalLayout
      } catch (error) {
        entry.restoreFailure = cleanError(error)
        throw error
      }
    }
  }
  // Independent fixtures prevent an earlier successful preview from masking a
  // later y7/y8/y9 failure; both real middle and right grabs are exercised.
  for (const grabSide of ['middle', 'right']) for (const y of [7, 8, 9]) {
    await runCase(`wide-${grabSide}-y${y}`, wide, y, grabSide)
  }
  // x2/w8/y10/h4 straddles all four cards, two above and two below.
  // Multiple directions are reported, never used as a mandatory passing oracle.
  for (const grabSide of ['middle', 'right']) await runCase(`middle-${grabSide}-y10`, middle, 10, grabSide)
  assert.deepEqual(report.errors, [], 'No browser page errors')
} catch (error) {
  report.failure = cleanError(error)
  process.exitCode = 1
} finally {
  try {
    await restoreOriginal()
  } catch (error) {
    report.restoreFailure = cleanError(error)
    process.exitCode = 1
  }
  try {
    await writeFile(artifact('report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  } finally {
    await browser?.close()
  }
}
console.log(`Multi-target evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
