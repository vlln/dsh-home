import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Never use the shared GUI; do not persist the supplied URL or authentication state.
const supplied = process.env.DSH_VERIFY_URL
assert(supplied, 'DSH_VERIFY_URL must name the private verification instance')
const target = new URL(supplied)
assert(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
  && target.port === '3186' && !target.username && !target.password,
'Only the explicitly supplied loopback HTTP private 3186 instance is allowed')
const base = new URL('../../.work/dsh-home/evidence/', import.meta.url)
await mkdir(base, { recursive: true })
const output = await mkdtemp(fileURLToPath(new URL('collision-', base)))
const artifact = name => `${output}/${name}`
const report = { checks: [], errors: [], restoredOriginalLayout: false, screenshots: [], scroll: null }
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let context, page, original, modified = false
const cleanError = error => String(error?.message ?? error).replaceAll(supplied, '[verification URL]')
const api = async (op, extra = {}) => {
  const response = await context.request.post(new URL('/plugins/dsh-home/api', target).href, {
    data: { op, ...extra }, headers: { origin: target.origin }, timeout: 15_000,
  })
  assert(response.ok(), `Home API ${op}: HTTP ${response.status()}`)
  const body = await response.json()
  assert(body.ok, `Home API ${op} rejected the request`)
  return body.value
}
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(cleanError(error)))
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }),
    async () => { await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 2000 }).catch(() => {}) },
    { noWaitAfter: true })
  await page.addLocatorHandler(page.getByRole('heading', { name: /^(Get started|开始使用)$/ }), async () => {
    // Continue can dismiss onboarding while this handler is already in flight.
    // Consume detached-element races rather than leave an unhandled task at teardown.
    // Both handlers may dismiss the same overlay: do not make an unrelated card
    // action wait for the stale trigger's visibility after this callback returns.
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
  // Poll real rendered boxes on animation frames, never fixed sleeps.
  const waitBoxes = async (mode, reference) => {
    await page.waitForFunction(({ mode, reference }) => {
      const ids = ['recent', 'resume', 'queue']
      const boxes = Object.fromEntries(ids.map(id => {
        const node = document.querySelector(`[data-widget-id="${id}"]`)
        const r = node?.getBoundingClientRect()
        return [id, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null]
      }))
      if (ids.some(id => !boxes[id])) return false
      if (mode === 'displaced') return ['resume', 'queue'].every(id => boxes[id].y >= reference[id].y + 4 * 56 - 2)
      return ids.every(id => ['x', 'y', 'width', 'height'].every(k => Math.abs(boxes[id][k] - reference[id][k]) < 2))
    }, { mode, reference }, { polling: 'raf', timeout: 12_000 })
  }
  const pending = async () => {
    await page.locator('.dsh-spatial-grid[data-hover-pending=true]').waitFor()
    return page.evaluate(() => performance.now())
  }
  const pendingTime = () => page.evaluate(() => {
    if (document.querySelector('.dsh-spatial-grid')?.getAttribute('data-hover-pending') !== 'true') {
      throw new Error('Collision candidate must still be pending before early release')
    }
    return performance.now()
  })
  // Observe every animation frame, including mouse transit: a final equal box alone
  // would miss a peer that moved early and then returned before the assertion.
  const watchPeers = async reference => {
    await page.evaluate(reference => {
      const watch = { active: true, failure: null, frames: 0, startedAt: performance.now() }
      window.__dshCollisionPeerWatch = watch
      const sample = () => {
        if (!watch.active) return
        watch.frames++
        for (const id of ['resume', 'queue']) {
          const rect = document.querySelector(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
          for (const key of ['x', 'y', 'width', 'height']) {
            if (!rect || Math.abs(rect[key] - reference[id][key]) >= 2) {
              watch.failure ??= `${id}.${key} moved while collision was unconfirmed`
            }
          }
        }
        watch.frame = requestAnimationFrame(sample)
      }
      sample()
    }, reference)
    return {
      wait: async (minMs = 100) => {
        const since = await page.evaluate(() => performance.now())
        await page.waitForFunction(({ since, minMs }) => {
          const watch = window.__dshCollisionPeerWatch
          if (!watch) throw new Error('Missing continuous peer observation')
          if (watch.failure) throw new Error(watch.failure)
          return watch.frames >= 2 && performance.now() - since >= minMs
        }, { since, minMs }, { polling: 'raf', timeout: Math.max(3000, minMs + 1500) })
        return page.evaluate(() => ({
          frames: window.__dshCollisionPeerWatch.frames,
          elapsed: performance.now() - window.__dshCollisionPeerWatch.startedAt,
        }))
      },
      stop: async () => {
        await page.evaluate(() => {
          const watch = window.__dshCollisionPeerWatch
          watch.active = false
          cancelAnimationFrame(watch.frame)
          if (watch.failure) throw new Error(watch.failure)
        })
      },
    }
  }
  const boxes = async () => Object.fromEntries(await Promise.all(['recent', 'resume', 'queue'].map(async id => {
    const box = await widget(id).boundingBox(); assert(box, `Missing ${id}`); return [id, box]
  })))
  const shot = async name => {
    await frames()
    await page.screenshot({ path: artifact(name) })
    report.screenshots.push(name)
  }
  await open()
  original = structuredClone((await api('layout.get')).layout)
  // Unique directory + exclusive write: never replace a previous run's recovery copy.
  await writeFile(artifact('original-layout.json'), JSON.stringify(original, null, 2), { flag: 'wx' })
  const registered = await page.locator('[data-widget-id]').evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const allIds = new Set([...registered, ...original.order, ...original.hidden,
    'recent', 'resume', 'queue', 'tasks', 'today', 'running', 'areas', 'rhythm', 'quick'])
  const fixture = {
    recent: { x: 0, y: 6, w: 8, h: 4 },
    resume: { x: 0, y: 0, w: 4, h: 4 },
    queue: { x: 4, y: 0, w: 4, h: 4 },
  }
  const seed = async positions => {
    const layout = { ...structuredClone(original),
      hidden: [...allIds].filter(id => !['recent', 'resume', 'queue'].includes(id)),
      positions: { ...original.positions, '12': positions } }
    // Mark before request: a response can be lost after the server has applied it.
    modified = true
    await api('layout.set', { layout })
    await page.reload(); await open()
    assert.equal(await page.locator('[data-widget-id]').count(), 3, 'Fixture must render exactly three cards')
    const rendered = await boxes()
    const grid = await page.locator('.dsh-spatial-grid').boundingBox()
    assert(grid && grid.width >= 950, 'Fixture requires the 12-column desktop grid')
    for (const [id, rect] of Object.entries(positions)) {
      assert(Math.abs(rendered[id].y - grid.y - rect.y * 56) < 2, `Fixture row mismatch: ${id}`)
      const step = (grid.width + 12) / 12
      assert(Math.abs(rendered[id].x - grid.x - rect.x * step) < 2, `Fixture column mismatch: ${id}`)
      assert(Math.abs(rendered[id].width - (rect.w * step - 12)) < 2, `Fixture width mismatch: ${id}`)
      assert(Math.abs(rendered[id].height - (rect.h * 56 - 12)) < 2, `Fixture height mismatch: ${id}`)
    }
  }
  const begin = async () => {
    const grip = await widget('recent').locator('button.dsh-widget-grip').boundingBox()
    assert(grip)
    const point = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
    await page.mouse.move(point.x, point.y); await page.mouse.down()
    return point
  }
  // Independent early-release run: total collision time exceeds the hover delay,
  // but changing from row 0 to row 1 must start a fresh candidate deadline.
  await seed(fixture)
  await edit(); await frames()
  const restartBefore = await boxes()
  const restartLayout = structuredClone((await api('layout.get')).layout)
  const restartStart = await begin()
  const restartWatch = await watchPeers(restartBefore)
  await page.mouse.move(restartStart.x, restartStart.y - 6 * 56, { steps: 24 })
  const firstPendingAt = await pending()
  await restartWatch.wait(250)
  await pendingTime()
  const firstCandidate = await page.locator('.react-grid-placeholder').boundingBox(); assert(firstCandidate)
  const candidateChangedAt = await page.evaluate(() => performance.now())
  await page.mouse.move(restartStart.x, restartStart.y - 5 * 56, { steps: 4 })
  await pending()
  await page.waitForFunction(firstY => {
    const box = document.querySelector('.react-grid-placeholder')?.getBoundingClientRect()
    return box && Math.abs(box.y - firstY - 56) < 2
  }, firstCandidate.y, { polling: 'raf', timeout: 1000 })
  const secondCandidate = await page.locator('.react-grid-placeholder').boundingBox(); assert(secondCandidate)
  assert(Math.abs(secondCandidate.y - firstCandidate.y - 56) < 2, 'Must enter a distinct row-1 collision candidate')
  report.candidateRestart = await restartWatch.wait(200)
  const earlyReleaseAt = await pendingTime()
  assert(earlyReleaseAt - firstPendingAt >= 500, 'Restart test must outlast the original candidate deadline')
  assert(earlyReleaseAt - candidateChangedAt < 500, 'New candidate must be released before its own hover deadline')
  Object.assign(report.candidateRestart, {
    totalPendingMs: earlyReleaseAt - firstPendingAt, newCandidateMs: earlyReleaseAt - candidateChangedAt,
  })
  await page.mouse.up()
  await waitBoxes('restored', restartBefore)
  await restartWatch.stop()
  await done()
  assert.deepEqual((await api('layout.get')).layout, restartLayout, 'Early mouseup + Done must persist the entire original layout')
  report.checks.push('Changing collision candidate restarts hover: peers stay still across >500ms total and early mouseup + Done save no change')

  // A top card crosses two peers without hovering and reaches a free row behind
  // them. The observer spans the entire path, not only its empty destination.
  // Keep this path away from the scroll edge; auto-scroll is tested separately.
  await page.setViewportSize({ width: 1440, height: 1600 })
  await seed({
    recent: { x: 0, y: 0, w: 8, h: 3 },
    resume: { x: 0, y: 5, w: 4, h: 3 },
    queue: { x: 4, y: 10, w: 4, h: 3 },
  })
  await edit(); await frames()
  const transitBefore = await boxes()
  const transitLayout = structuredClone((await api('layout.get')).layout)
  const transitStart = await begin()
  const transitWatch = await watchPeers(transitBefore)
  await page.mouse.move(transitStart.x, transitStart.y + 14 * 56, { steps: 42 })
  report.transit = await transitWatch.wait()
  const transitAfter = await boxes()
  assert(Math.abs(transitAfter.recent.y - transitBefore.recent.y - 14 * 56) < 2, 'Top card must reach the free row behind both peers')
  for (const id of ['resume', 'queue']) assert(!overlaps({
    x: transitAfter.recent.x, y: transitAfter.recent.y, w: transitAfter.recent.width, h: transitAfter.recent.height,
  }, { x: transitAfter[id].x, y: transitAfter[id].y, w: transitAfter[id].width, h: transitAfter[id].height }), `Transit destination must clear ${id}`)
  await page.keyboard.press('Escape'); await page.mouse.up()
  await waitBoxes('restored', transitBefore)
  await transitWatch.stop()
  await done()
  assert.deepEqual((await api('layout.get')).layout, transitLayout, 'Transit cancellation must leave its independent fixture unchanged')
  report.checks.push('Top card crosses two middle peers to empty space without hovering; neither peer moves on any observed frame')
  await page.setViewportSize({ width: 1440, height: 1100 })

  await seed(fixture)
  await edit()
  await frames()
  const baseline = await boxes()
  const start = await begin()
  const pendingWatch = await watchPeers(baseline)
  await page.mouse.move(start.x, start.y - 6 * 56, { steps: 24 })
  const pendingAt = await pending()
  report.pending = await pendingWatch.wait()
  report.pending.pendingMs = await pendingTime() - pendingAt
  assert.equal(await page.locator('.react-grid-placeholder').count(), 1)
  await shot('pending.png')
  await page.mouse.move(start.x, start.y, { steps: 24 })
  await waitBoxes('restored', baseline)
  // Stay at origin past the abandoned candidate's deadline to catch stale timers.
  await pendingWatch.wait(650)
  await pendingWatch.stop()
  assert.notEqual(await page.locator('.dsh-spatial-grid').getAttribute('data-hover-pending'), 'true', 'Returning to origin must clear the pending candidate')
  report.checks.push('First collision leaves both peers still for at least 100ms; leaving for origin cancels the pending hover without stale displacement')
  const reentryWatch = await watchPeers(baseline)
  await page.mouse.move(start.x, start.y - 6 * 56, { steps: 24 })
  const reentryAt = await pending()
  report.reentry = await reentryWatch.wait()
  await pendingTime()
  await reentryWatch.stop()
  await waitBoxes('displaced', baseline)
  report.reentry.confirmedMs = await page.evaluate(() => performance.now()) - reentryAt
  assert.notEqual(await page.locator('.dsh-spatial-grid').getAttribute('data-hover-pending'), 'true', 'Stable hover must confirm the collision')
  assert.equal(await page.locator('.react-grid-placeholder').count(), 1)
  report.live = await boxes()
  await shot('drag-live.png')
  report.checks.push('Before mouseup, wide recent simultaneously displaces both peers by at least four rows')
  await page.mouse.move(start.x, start.y, { steps: 24 })
  await waitBoxes('restored', baseline)
  report.checks.push('Without releasing the mouse, returning to origin restores all three visual rectangles')
  await page.mouse.move(start.x, start.y - 6 * 56, { steps: 24 })
  await waitBoxes('displaced', baseline)
  await page.mouse.up()
  await done()
  const finalPositions = (await api('layout.get')).layout.positions['12']
  assert.equal(finalPositions.recent.y, 0, 'Recent must land in the top row')
  assert(finalPositions.resume.y >= 4 && finalPositions.queue.y >= 4, 'Both displaced peers must persist below recent')
  for (const [a, b] of [['recent', 'resume'], ['recent', 'queue'], ['resume', 'queue']]) {
    assert(!overlaps(finalPositions[a], finalPositions[b]), `${a}/${b} must not overlap`)
  }
  report.finalPositions = finalPositions
  await page.reload(); await open()
  assert.deepEqual((await api('layout.get')).layout.positions['12'], finalPositions)
  await frames()
  const readingBoxes = await boxes()
  const readingGrid = await page.locator('.dsh-spatial-grid').boundingBox(); assert(readingGrid)
  for (const id of ['recent', 'resume', 'queue']) assert(Math.abs(readingBoxes[id].y - readingGrid.y - finalPositions[id].y * 56) < 2)
  await shot('reading.png')
  report.checks.push('Mouseup, real Done click and reload retain non-overlapping preview in reading mode')

  await seed(fixture)
  await edit(); await frames()
  const cancelBefore = await boxes()
  const cancelLayout = structuredClone((await api('layout.get')).layout)
  const cancelStart = await begin()
  await page.mouse.move(cancelStart.x, cancelStart.y - 6 * 56, { steps: 24 })
  await waitBoxes('displaced', cancelBefore)
  await page.keyboard.press('Escape'); await page.mouse.up()
  await page.locator('.dsh-home[data-editing=true]').waitFor()
  await waitBoxes('restored', cancelBefore)
  assert.equal(await page.locator('.react-grid-placeholder').count(), 0)
  assert.equal(await page.evaluate(() => document.body.classList.contains('dsh-home-dragging')), false)
  await done()
  assert.deepEqual((await api('layout.get')).layout, cancelLayout, 'Esc must restore the entire desktop layout, not just active card')
  report.checks.push('Esc during live two-peer displacement restores the whole desktop and persists no preview')

  // Independent tall fixture makes the actual scroll edge reachable without user data.
  await seed({ ...fixture, recent: { ...fixture.recent, y: 20 } })
  await edit()
  const home = page.locator('.dsh-home')
  const scrollable = await home.evaluate(el => el.scrollHeight > el.clientHeight + 120)
  if (scrollable) {
    await widget('recent').locator('button.dsh-widget-grip').scrollIntoViewIfNeeded()
    await frames()
    const scrollStart = await home.evaluate(el => el.scrollTop)
    const grip = await widget('recent').locator('button.dsh-widget-grip').boundingBox()
    const homeBox = await home.boundingBox(); assert(grip && homeBox)
    const pointerX = grip.x + grip.width / 2
    const pointerY = grip.y + grip.height / 2
    const edgeY = Math.min(1080, homeBox.y + homeBox.height - 24)
    const cardBefore = await widget('recent').boundingBox(); assert(cardBefore)
    const grabY = pointerY - cardBefore.y
    await page.mouse.move(pointerX, pointerY); await page.mouse.down()
    await page.mouse.move(pointerX, edgeY, { steps: 16 })
    await page.waitForFunction(({ scrollStart }) => {
      const el = document.querySelector('.dsh-home')
      return el && el.scrollTop >= scrollStart + 112
    }, { scrollStart }, { polling: 'raf', timeout: 10_000 })
    await frames()
    const scrollAfter = await home.evaluate(el => el.scrollTop)
    const dragged = await widget('recent').boundingBox(); assert(dragged)
    assert(Math.abs(dragged.y - (edgeY - grabY)) < 12, 'Stationary pointer must retain the card while auto-scroll advances')
    report.scroll = { status: 'passed', scrollStart, scrollAfter, visualError: dragged.y - (edgeY - grabY) }
    await shot('scroll-live.png')
    await page.keyboard.press('Escape'); await page.mouse.up()
    await done()
    report.checks.push('Stationary-pointer edge drag scrolls at least two rows and compensates the rendered card position')
  } else report.scroll = { status: 'skipped', reason: 'Tall synthetic fixture did not produce a scrollable Home container' }
  assert.deepEqual(report.errors, [], 'No browser page errors')
} catch (error) {
  report.failure = cleanError(error)
  if (page && !page.isClosed()) await page.screenshot({ path: artifact('failure.png') }).catch(() => {})
  process.exitCode = 1
} finally {
  // Close the document first so pending UI saves cannot race the API restoration.
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
  await writeFile(artifact('report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  await browser.close()
}
console.log(`Collision evidence: ${output}`)
for (const check of report.checks) console.log(`PASS ${check}`)
if (report.failure) console.error(report.failure)
if (report.restoreFailure) console.error(`RESTORE FAILED: ${report.restoreFailure}; recovery backup: ${artifact('original-layout.json')}`)
