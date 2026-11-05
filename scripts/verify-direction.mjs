import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Opt-in only. Never visit the shared GUI or persist the URL/authentication state.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('direction-', base)))
const artifact = name => `${output}/${name}`
const report = { checks: [], cases: [], errors: [], screenshots: [], restoredOriginalLayout: false }
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const ROW = 56, GAP = 12, TOLERANCE = 2
const ACTIVE_POINTER_TOLERANCE = 8, STATIONARY_TOLERANCE = 2
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let context, page, original, modified = false
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
  const watch = window.__dshDirectionWatch
  if (!watch) return null
  watch.active = false; cancelAnimationFrame(watch.frame); watch.remove()
  const { active, arrivedAt, firstMotionAt, frame, remove, ...measurements } = watch
  return { ...measurements,
    firstMotionMs: firstMotionAt === null ? null : firstMotionAt - arrivedAt,
    observedMs: arrivedAt === null ? 0 : performance.now() - arrivedAt }
})
try {
  // Tall enough that the lower-chain pointer stays well away from auto-scroll edges.
  context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, reducedMotion: 'reduce' })
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(cleanError(error)))
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }),
    async () => { await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 2000 }).catch(() => {}) },
    { noWaitAfter: true })
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
    // Either handler can dismiss the overlay first; tolerate the detached trigger.
    await page.getByRole('button', { name: /^(Close|关闭)$/ }).last().click({ timeout: 2000 }).catch(async () => {
      if (await page.getByRole('heading', { name: /^(Get started|开始使用)$/ }).isVisible().catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => {})
      }
    })
  }, { noWaitAfter: true })
  await page.goto(supplied)
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
  const waitBoxes = async reference => {
    await page.waitForFunction(({ reference, tolerance }) => Object.entries(reference).every(([id, expected]) => {
      const rect = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
      return rect && ['x', 'y', 'width', 'height'].every(key => Math.abs(rect[key] - expected[key]) < tolerance)
    }), { reference, tolerance: TOLERANCE }, { polling: 'raf', timeout: 10_000 })
  }
  await open()
  original = structuredClone((await api('layout.get')).layout)
  // Exclusive backup in a fresh per-run directory, written before the first mutation.
  await writeFile(artifact('original-layout.json'), JSON.stringify(original, null, 2), { flag: 'wx' })
  const registered = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const allIds = new Set([...registered, ...original.order, ...original.hidden,
    ...Object.values(original.positions ?? {}).flatMap(positions => Object.keys(positions)),
    'recent', 'resume', 'queue', 'tasks', 'today', 'running', 'areas', 'rhythm', 'quick'])
  const fixture = {
    recent: { x: 8, y: 0, w: 4, h: 3 },
    resume: { x: 0, y: 6, w: 4, h: 4 },
    queue: { x: 0, y: 2, w: 4, h: 4 },
  }
  assert.equal(fixture.queue.y + fixture.queue.h, fixture.resume.y, 'Baseline peers must touch, not overlap')
  const seed = async (positions, ids) => {
    for (const [index, id] of ids.entries()) for (const other of ids.slice(index + 1)) {
      assert(!overlaps(positions[id], positions[other]), `Seed must not overlap: ${id}/${other}`)
    }
    const layout = { ...structuredClone(original),
      hidden: [...allIds].filter(id => !ids.includes(id)),
      positions: { ...original.positions, '12': structuredClone(positions) } }
    // A lost response may still have applied the mutation; finally must restore it.
    modified = true
    await api('layout.set', { layout })
    await page.reload(); await open(); await edit(); await frames()
    assert.deepEqual((await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))).sort(), [...ids].sort(),
      'Fixture must show only its source/target and optional chain peer')
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Fixture requires the 12-column desktop grid')
    const rendered = await boxes(ids)
    const step = (grid.width + GAP) / 12
    for (const id of ids) {
      const rect = positions[id], box = rendered[id]
      assert(Math.abs(box.x - grid.x - rect.x * step) < TOLERANCE, `Seed column mismatch: ${id}`)
      assert(Math.abs(box.y - grid.y - rect.y * ROW) < TOLERANCE, `Seed row mismatch: ${id}`)
      assert(Math.abs(box.width - (rect.w * step - GAP)) < TOLERANCE, `Seed width mismatch: ${id}`)
      assert(Math.abs(box.height - (rect.h * ROW - GAP)) < TOLERANCE, `Seed height mismatch: ${id}`)
    }
    return { grid, rendered }
  }
  const runCase = async (name, half, positions, ids) => {
    const { grid, rendered: before } = await seed(positions, ids)
    const saved = structuredClone((await api('layout.get')).layout)
    const entry = { name, half, fixture: structuredClone(positions), visible: ids, before }
    report.cases.push(entry)
    const horizontal = half === 'left' || half === 'right'
    const direction = { upper: 'down', lower: 'up', left: 'right', right: 'left' }[half]
    entry.direction = direction
    const step = (grid.width + GAP) / 12
    // The whole header is a real drag handle. Do not grab the rightmost button:
    // its x offset would accidentally select horizontal displacement in up/down cases.
    const grip = await widget('recent').locator('.dsh-w-head.dsh-widget-grip').boundingBox()
    assert(grip, 'Source drag header must exist')
    const grabColumn = half === 'left' ? 1 : half === 'right' ? 3 : 2
    const start = { x: before.recent.x + grabColumn * step, y: grip.y + grip.height / 2 }
    await page.mouse.move(start.x, start.y)
    // Measure on the real mousedown, before RGL activates: recalibrating after
    // activation would hide a threshold-sized jump or a lost original grab point.
    await page.evaluate(() => {
      document.addEventListener('mousedown', event => {
        const rect = document.querySelector('[data-widget-id="recent"]').getBoundingClientRect()
        window.__dshDirectionGrab = { x: event.clientX - rect.x, y: event.clientY - rect.y,
          pointer: { x: event.clientX, y: event.clientY }, box: { x: rect.x, y: rect.y } }
      }, { capture: true, once: true })
    })
    await page.mouse.down()
    const grab = await page.evaluate(() => window.__dshDirectionGrab)
    assert(grab, 'Must record the actual source mousedown grab offset')
    entry.grab = grab
    // Cross the real RGL threshold in the empty source row first, but retain the
    // mousedown offset for all subsequent pointer-to-active error measurements.
    const activated = { x: start.x - 8, y: start.y }
    await page.mouse.move(activated.x, activated.y)
    await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
    const candidate = { ...positions.recent, x: positions.resume.x,
      y: positions.resume.y + (horizontal ? 1 : half === 'lower' ? 2 : 0) }
    // Keep horizontal pointers exactly on the target's mid-height. A small raw
    // y fraction still snaps to row +2; assert the real placeholder below.
    const pointer = { x: grid.x + candidate.x * step + grab.x,
      y: horizontal ? grid.y + (positions.resume.y + positions.resume.h / 2) * ROW
        : grid.y + candidate.y * ROW + grab.y }
    assert(pointer.x > before.resume.x && pointer.x < before.resume.x + before.resume.width, 'Pointer must be inside target width')
    assert(pointer.y > before.resume.y && pointer.y < before.resume.y + before.resume.height, 'Pointer must be inside target height')
    const normalized = {
      dx: ((pointer.x - grid.x) / step - positions.resume.x - positions.resume.w / 2) / (positions.resume.w / 2),
      dy: ((pointer.y - grid.y) / ROW - positions.resume.y - positions.resume.h / 2) / (positions.resume.h / 2),
    }
    if (horizontal) {
      assert(Math.abs(normalized.dx) > Math.abs(normalized.dy), 'Left/right pointer must select the dominant horizontal axis')
      assert(half === 'left' ? normalized.dx < 0 : normalized.dx > 0, `Pointer must really be in resume ${half} half`)
    } else {
      assert(Math.abs(normalized.dy) > Math.abs(normalized.dx), 'Upper/lower pointer must select the dominant vertical axis')
      assert(half === 'upper' ? normalized.dy < 0 : normalized.dy > 0, `Pointer must really be in resume ${half} half`)
    }
    entry.pointer = { ...pointer, normalized }
    entry.candidate = candidate
    const expected = Object.fromEntries(ids.map(id => [id, { ...positions[id] }]))
    expected.recent = candidate
    if (horizontal) expected.resume.x = direction === 'right' ? candidate.x + candidate.w : candidate.x - positions.resume.w
    else expected.resume.y = direction === 'down' ? candidate.y + candidate.h : candidate.y - positions.resume.h
    if (ids.includes('queue')) expected.queue.y = Math.min(positions.queue.y, expected.resume.y - positions.queue.h)
    assert(expected.resume.x >= 0 && expected.resume.x + expected.resume.w <= 12, 'Horizontal direction must have space; never accept opposite fallback')
    assert(expected.resume.y >= 0 && (!expected.queue || expected.queue.y >= 0), 'Upward chain must have enough space; never accept downward fallback')
    entry.expected = expected
    const peers = ids.filter(id => id !== 'recent')
    const activeExpected = { x: pointer.x - grab.x, y: pointer.y - grab.y }
    const placeholderExpected = { x: grid.x + candidate.x * step, y: grid.y + candidate.y * ROW }
    entry.activeExpected = activeExpected
    assert(pointer.y > 64 && pointer.y < 1600 - 64, 'Destination must avoid viewport auto-scroll edges')
    // Arm before the destination event, then sample every rAF through pending,
    // confirmation, and settled peer movement. Use ranges, not adjacent deltas:
    // a slow creep or a jump that reverses itself must fail just like a big jump.
    await page.evaluate(({ pointer, before, peers, activeExpected, placeholderExpected }) => {
      const watch = { active: true, arrivedAt: null, firstMotionAt: null, pendingSeen: false,
        confirmedSeen: false, frames: 0, pendingFrames: 0, confirmedFrames: 0,
        activeMaxError: 0, activeMaxDrift: 0, placeholderMaxError: 0, placeholderMaxDrift: 0,
        pointerMaxDrift: 0, scrollMaxDrift: 0, missingActiveFrames: 0, missingPlaceholderFrames: 0 }
      window.__dshDirectionWatch = watch
      const range = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
      const activeRange = range(), placeholderRange = range()
      watch.activeRange = activeRange
      const scrollNodes = new Set([document.scrollingElement])
      for (let node = document.querySelector('[data-widget-id="recent"]'); node; node = node.parentElement) scrollNodes.add(node)
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
      watch.remove = () => document.removeEventListener('mousemove', arrival, true)
      const measure = (selector, expected, bounds, prefix) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect()
        if (!rect) { watch[`missing${prefix === 'active' ? 'Active' : 'Placeholder'}Frames`]++; return }
        watch[`${prefix}MaxError`] = Math.max(watch[`${prefix}MaxError`], Math.abs(rect.x - expected.x), Math.abs(rect.y - expected.y))
        bounds.minX = Math.min(bounds.minX, rect.x); bounds.maxX = Math.max(bounds.maxX, rect.x)
        bounds.minY = Math.min(bounds.minY, rect.y); bounds.maxY = Math.max(bounds.maxY, rect.y)
        watch[`${prefix}MaxDrift`] = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
      }
      const sample = () => {
        if (!watch.active) return
        if (watch.arrivedAt !== null) {
          watch.frames++
          const pending = document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending === 'true'
          watch.pendingSeen ||= pending
          if (pending) watch.pendingFrames++
          else if (watch.pendingSeen) { watch.confirmedSeen = true; watch.confirmedFrames++ }
          // Pointer event dispatch precedes React's commit; compare rendered frames after that commit,
          // not the previous frame. The placeholder has a deliberate 100ms landing transition.
          if (performance.now() - watch.arrivedAt >= 40) measure('[data-widget-id="recent"]', activeExpected, activeRange, 'active')
          if (performance.now() - watch.arrivedAt >= 150) measure('.react-grid-placeholder', placeholderExpected, placeholderRange, 'placeholder')
          for (const { node, x, y } of scroll) watch.scrollMaxDrift = Math.max(watch.scrollMaxDrift,
            Math.abs(node.scrollLeft - x), Math.abs(node.scrollTop - y))
          if (peers.some(id => {
            const box = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
            return !box || ['x', 'y', 'width', 'height'].some(key => Math.abs(box[key] - before[id][key]) >= 2)
          })) watch.firstMotionAt ??= performance.now()
        }
        watch.frame = requestAnimationFrame(sample)
      }
      watch.frame = requestAnimationFrame(sample)
    }, { pointer, before, peers, activeExpected, placeholderExpected })
    // One real mouse move: no intermediate collision candidate can consume dwell.
    await page.mouse.move(pointer.x, pointer.y)
    // Read immediately, before waiting for pending/placeholder/peers: later
    // settling must not conceal an initial grab-offset or activation error.
    await frames()
    entry.activeImmediately = await widget('recent').boundingBox()
    assert(entry.activeImmediately, 'Active card must exist immediately after destination move')
    entry.activeMaxError = Math.max(Math.abs(entry.activeImmediately.x - activeExpected.x),
      Math.abs(entry.activeImmediately.y - activeExpected.y))
    assert(entry.activeMaxError <= ACTIVE_POINTER_TOLERANCE,
      `${name}: immediate active pointer/grab error ${entry.activeMaxError}px exceeds 8px`)
    await page.locator('.dsh-spatial-grid[data-hover-pending=true]').waitFor()
    await page.waitForFunction(({ x, y }) => {
      const r = document.querySelector('.react-grid-placeholder')?.getBoundingClientRect()
      return r && Math.abs(r.x - x) < 2 && Math.abs(r.y - y) < 2
    }, { x: grid.x + candidate.x * step, y: grid.y + candidate.y * ROW }, { polling: 'raf', timeout: 2000 })
    await waitBoxes(Object.fromEntries(peers.map(id => [id, before[id]])))
    const expectedBoxes = Object.fromEntries(peers.map(id => [id, {
      ...before[id], x: grid.x + expected[id].x * step, y: grid.y + expected[id].y * ROW,
    }]))
    // Poll the actual stationary-pointer preview, waiting at least 0.5 seconds;
    // no extra move, mouseup, or synthetic layout call is allowed to trigger it.
    await page.waitForFunction(() => {
      const watch = window.__dshDirectionWatch
      return watch.arrivedAt !== null && performance.now() - watch.arrivedAt >= 500
        && document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending !== 'true'
    }, undefined, { polling: 'raf', timeout: 10_000 })
    await waitBoxes(expectedBoxes)
    await frames()
    entry.timing = await finishWatch()
    entry.activeMaxError = Math.max(entry.activeMaxError, entry.timing.activeMaxError)
    entry.frames = entry.timing.frames
    assert(entry.timing.pendingSeen && entry.timing.pendingFrames > 0, 'Must sample a pending hover before displacement')
    assert(entry.timing.confirmedSeen && entry.timing.confirmedFrames > 0, 'Must sample confirmed displacement with the same stationary pointer')
    assert.equal(entry.timing.missingActiveFrames, 0, 'Active card must exist on every dwell frame')
    assert.equal(entry.timing.missingPlaceholderFrames, 0, 'Placeholder must exist on every dwell frame')
    assert(entry.activeMaxError <= ACTIVE_POINTER_TOLERANCE,
      `${name}: active pointer/grab error ${entry.activeMaxError}px exceeds 8px`)
    entry.activeMaxDrift = Math.max(
      Math.max(entry.timing.activeRange.maxX, entry.activeImmediately.x) - Math.min(entry.timing.activeRange.minX, entry.activeImmediately.x),
      Math.max(entry.timing.activeRange.maxY, entry.activeImmediately.y) - Math.min(entry.timing.activeRange.minY, entry.activeImmediately.y))
    assert(entry.activeMaxDrift <= STATIONARY_TOLERANCE,
      `${name}: stationary active moved ${entry.activeMaxDrift}px during pending → confirmed`)
    assert(entry.timing.placeholderMaxError <= STATIONARY_TOLERANCE,
      `${name}: placeholder left the snapped candidate by ${entry.timing.placeholderMaxError}px`)
    assert(entry.timing.placeholderMaxDrift <= STATIONARY_TOLERANCE,
      `${name}: placeholder moved ${entry.timing.placeholderMaxDrift}px while peers yielded`)
    assert.equal(entry.timing.pointerMaxDrift, 0, 'Pointer must remain stationary throughout pending → confirmed')
    assert.equal(entry.timing.scrollMaxDrift, 0, 'No viewport or grid ancestor may auto-scroll during the dwell')
    // A frame-boundary allowance, not a shorter configured hover duration.
    assert(entry.timing.firstMotionMs !== null && entry.timing.firstMotionMs >= 480, 'Peers must not move before the 500ms hover (one-frame tolerance)')
    entry.live = await boxes(ids)
    const axis = horizontal ? 'x' : 'y'
    const delta = entry.live.resume[axis] - before.resume[axis]
    assert(direction === 'down' || direction === 'right' ? delta > 0 : delta < 0,
      `${half} pointer must move resume ${direction}`)
    for (const [index, id] of ids.entries()) for (const other of ids.slice(index + 1)) {
      assert(!overlaps(expected[id], expected[other]), `Preview must not overlap: ${id}/${other}`)
    }
    if (ids.includes('queue')) assert(entry.live.queue.y < before.queue.y, 'Lower hover must propagate upward to queue')
    await shot(`${name}.png`)
    await page.keyboard.press('Escape'); await page.mouse.up()
    await page.locator('.dsh-home[data-editing=true]').waitFor()
    await waitBoxes(before)
    assert.equal(await page.locator('.react-grid-placeholder').count(), 0, 'Escape must clear the candidate')
    assert.equal(await page.evaluate(() => document.body.classList.contains('dsh-home-dragging')), false)
    await done()
    assert.deepEqual((await api('layout.get')).layout, saved, 'Escape + Done must restore the whole fixture layout')
    entry.cancelRestored = true
    report.checks.push(`${name}: ${half} pointer waits 500ms, resume moves ${direction}${ids.includes('queue') ? ' and chains queue upward' : ''}; activeMaxError=${entry.activeMaxError.toFixed(2)}px, activeMaxDrift=${entry.activeMaxDrift.toFixed(2)}px, placeholderMaxDrift=${entry.timing.placeholderMaxDrift.toFixed(2)}px, frames=${entry.frames}; Escape + Done saves no preview`)
  }
  // First isolate direction: queue is hidden, so a chain cannot mask a wrong sign.
  await runCase('upper', 'upper', fixture, ['recent', 'resume'])
  await runCase('lower', 'lower', fixture, ['recent', 'resume'])
  // The three-card topology is still edge-touching. Translate both peers down
  // four rows to reserve generous upward chain headroom; source remains x8/y0.
  // This independent case must never pass by falling back to downward movement.
  await runCase('lower-chain', 'lower', {
    ...fixture, resume: { ...fixture.resume, y: 10 }, queue: { ...fixture.queue, y: 6 },
  }, ['recent', 'resume', 'queue'])
  // Independently prove both horizontal signs, with target centered so either
  // push fits. Its y6 mid-height pointer is far from the viewport scroll edges.
  const horizontalFixture = {
    recent: { x: 0, y: 0, w: 4, h: 3 },
    resume: { x: 4, y: 6, w: 4, h: 4 },
    queue: fixture.queue,
  }
  await runCase('left', 'left', horizontalFixture, ['recent', 'resume'])
  await runCase('right', 'right', horizontalFixture, ['recent', 'resume'])
  // Both horizontal routes are occupied, but vertical space must still permit the drop.
  const blocked = { recent: { x: 8, y: 0, w: 4, h: 3 }, resume: { x: 0, y: 8, w: 12, h: 4 } }
  const { grid: blockedGrid, rendered: blockedBefore } = await seed(blocked, ['recent', 'resume'])
  const blockedSaved = structuredClone((await api('layout.get')).layout)
  const sourceHead = await widget('recent').locator('.dsh-w-head').boundingBox(); assert(sourceHead)
  const sx = blockedBefore.recent.x + 40, sy = sourceHead.y + 14
  const dx = blockedGrid.x + 40, dy = blockedGrid.y + 10 * ROW
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx - 8, sy)
  await page.waitForFunction(() => document.body.classList.contains('dsh-home-dragging'))
  await page.mouse.move(dx, dy)
  await page.waitForFunction(() => document.querySelector('.dsh-spatial-grid')?.dataset.hoverPending !== 'true'
    && Math.abs(document.querySelector('[data-widget-id="resume"]').getBoundingClientRect().y - document.querySelector('[data-widget-id="recent"]').getBoundingClientRect().y) >= 150,
    undefined, { polling: 'raf' })
  assert.equal(await page.locator('.dsh-spatial-grid[data-drop-rejected=true]').count(), 0)
  const held = await widget('recent').boundingBox(); assert(held)
  assert(Math.abs(held.x - (dx - 40)) < 8 && Math.abs(held.y - (dy - (sy - blockedBefore.recent.y))) < 8)
  const displaced = await widget('resume').boundingBox(); assert(displaced)
  assert.notEqual(displaced.y, blockedBefore.resume.y)
  await page.keyboard.press('Escape'); await page.mouse.up()
  await waitBoxes(blockedBefore)
  await done()
  assert.deepEqual((await api('layout.get')).layout, blockedSaved)
  report.checks.push('Horizontally blocked target finds vertical space, keeps held card at pointer, and Escape restores the snapshot')
  assert.deepEqual(report.errors, [], 'No browser page errors')
} catch (error) {
  report.failure = cleanError(error)
  if (page && !page.isClosed()) {
    // Preserve partial frame evidence even when an immediate or dwell assertion
    // fails; stop the sampler before failure capture and mouseup restoration.
    const timing = await finishWatch().catch(() => null)
    const entry = report.cases.at(-1)
    if (entry && timing) {
      entry.timing = timing
      entry.activeMaxError = Math.max(entry.activeMaxError ?? 0, timing.activeMaxError)
      entry.frames = timing.frames
    }
    await page.screenshot({ path: artifact('failure.png') }).then(() => report.screenshots.push('failure.png')).catch(() => {})
  }
  process.exitCode = 1
} finally {
  // Close first: pending UI saves must not race the API restoration below.
  if (page && !page.isClosed()) {
    await page.mouse.up().catch(() => {})
    await page.close({ runBeforeUnload: false }).catch(() => {})
  }
  if (original !== undefined && modified) {
    try {
      await api('layout.set', { layout: original })
      assert.deepEqual((await api('layout.get')).layout, original, 'Restored API layout differs from exclusive recovery backup')
      report.restoredOriginalLayout = true
    } catch (error) {
      report.restoreFailure = cleanError(error)
      process.exitCode = 1
    }
  } else report.restoredOriginalLayout = original !== undefined
  try {
    await writeFile(artifact('report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  } finally {
    await browser.close()
  }
}
console.log(`Direction evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
