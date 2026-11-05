/** node --experimental-strip-types --test test/multi-preview.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { multiPreviewPlacement, multiPreviewOnAxis, placementAxis } from '../src/client/multi-preview.ts'
import { canPlace, SPATIAL_MAX_Y } from '../src/client/spatial-model.ts'

const rect = (x, y, w = 4, h = 4) => ({ x, y, w, h })
const item = (i, x, y, w = 4, h = 4, cols = 12) => ({
  i, ...rect(x, y, w, h), minW: Math.min(3, cols), minH: 3, maxW: cols,
})
const frozen = entries => Object.freeze(entries.map(entry => Object.freeze(entry)))
const geometry = entries => entries.map(({ x, y, w, h }) => rect(x, y, w, h))
function valid(entries, cols = 12) {
  for (const entry of entries) assert.ok(canPlace(entries, entry.i, entry, cols), `${entry.i} is bounded and collision-free`)
}
function accepted(entries, id, candidate, cols = 12) {
  valid(entries, cols)
  assert.deepEqual(geometry([entries.find(entry => entry.i === id)])[0], candidate, 'active remains at the exact candidate')
}
const isAccepted = (entries, id, candidate) => {
  const active = entries.find(entry => entry.i === id)
  return active && ['x', 'y', 'w', 'h'].every(key => active[key] === candidate[key])
}
function resolvedAxis(snapshot, id, candidate, cols, pointer, next) {
  const preferred = placementAxis(snapshot, id, candidate, pointer)
  const preferredNext = multiPreviewOnAxis(snapshot, id, candidate, cols, preferred, pointer)
  if (isAccepted(preferredNext, id, candidate)) {
    assert.deepEqual(next, preferredNext, 'successful preferred-axis result is returned unchanged')
    return preferred
  }
  const alternate = preferred === 'x' ? 'y' : 'x'
  assert.deepEqual(next, multiPreviewOnAxis(snapshot, id, candidate, cols, alternate, pointer))
  return alternate
}

test('width-eight candidate covering two width-four peers succeeds despite both horizontal directions being blocked', () => {
  const snapshot = frozen([item('active', 0, 30, 8), item('left', 0, 8), item('right', 4, 8)])
  const candidate = rect(0, 8, 8)
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 8)
  accepted(next, 'active', candidate, 8)
  assert.deepEqual(geometry(next), [candidate, rect(0, 4), rect(4, 4)])
})

test('all direct peers share one axis rather than independently using four directions', () => {
  const snapshot = frozen([
    item('active', 0, 40, 6, 12), item('above', 4, 6), item('below', 4, 20),
    item('left', 1, 13, 3), item('right', 8, 13, 3), item('unrelated', 8, 70),
  ])
  const candidate = rect(3, 9, 6, 12)
  assert.equal(placementAxis(snapshot, 'active', candidate), 'x')
  // Exhaust the entire horizontal solve before retrying vertically; each solve
  // still uses just one shared axis, rather than a separate axis for each peer.
  assert.deepEqual(multiPreviewOnAxis(snapshot, 'active', candidate, 12, 'x'), snapshot)
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 12)
  accepted(next, 'active', candidate)
  assert.deepEqual(next, multiPreviewOnAxis(snapshot, 'active', candidate, 12, 'y'))
  assert.deepEqual(next.slice(1).map(peer => peer.x), snapshot.slice(1).map(peer => peer.x))
})

test('wide card moves both same-row peers up by the minimal amount, regardless of pointer card', () => {
  const snapshot = frozen([item('active', 0, 30, 8), item('left', 0, 4), item('right', 4, 4)])
  const candidate = rect(0, 7, 8)
  for (const pointer of [undefined, { x: 2, y: 7.5 }, { x: 6, y: 7.5 }]) {
    assert.equal(placementAxis(snapshot, 'active', candidate, pointer), 'y')
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 8, pointer)
    accepted(next, 'active', candidate, 8)
    assert.deepEqual(geometry(next), [candidate, rect(0, 3), rect(4, 3)])
  }
})

test('a vertical gap splits the upper row up and lower peer down, with identical cross coordinates', () => {
  const snapshot = frozen([
    item('active', 0, 30, 8), item('upper-left', 0, 4), item('upper-right', 4, 4), item('lower', 0, 10, 8),
  ])
  const candidate = rect(0, 7, 8)
  for (const pointer of [undefined, { x: 2, y: 7.5 }, { x: 6, y: 7.5 }, { x: 2, y: 10.5 }]) {
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 8, pointer)
    accepted(next, 'active', candidate, 8)
    assert.deepEqual(geometry(next), [candidate, rect(0, 3), rect(4, 3), rect(0, 11, 8)])
  }
})

test('horizontal transpose splits left and right without changing any y coordinate', () => {
  const snapshot = frozen([
    item('active', 0, 30, 3, 8), item('left-upper', 0, 0, 3), item('left-lower', 0, 4, 3), item('right', 6, 0, 3, 8),
  ])
  const candidate = rect(2, 0, 5, 8)
  assert.equal(placementAxis(snapshot, 'active', candidate), 'x')
  // Not enough left-hand space on x: forced x rejects, but entry retries y.
  assert.deepEqual(multiPreviewOnAxis(snapshot, 'active', candidate, 12, 'x'), snapshot)
  const vertical = multiPreviewPlacement(snapshot, 'active', candidate, 12)
  accepted(vertical, 'active', candidate)
  assert.deepEqual(vertical, multiPreviewOnAxis(snapshot, 'active', candidate, 12, 'y'))
  const shifted = frozen(snapshot.map(peer => peer.i === 'active' ? peer : { ...peer, x: peer.x + 2 }))
  const movedCandidate = rect(3, 0, 5, 8)
  const next = multiPreviewPlacement(shifted, 'active', movedCandidate, 12)
  accepted(next, 'active', movedCandidate)
  assert.deepEqual(geometry(next), [movedCandidate, rect(0, 0, 3), rect(0, 4, 3), rect(8, 0, 3, 8)])
})

test('horizontal transpose moves aligned peers left by only one cell', () => {
  const snapshot = frozen([item('active', 0, 30, 4, 8), item('upper', 4, 0), item('lower', 4, 4)])
  const candidate = rect(7, 0, 4, 8)
  for (const pointer of [undefined, { x: 7.5, y: 2 }, { x: 7.5, y: 6 }]) {
    assert.equal(placementAxis(snapshot, 'active', candidate, pointer), 'x')
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, pointer)
    accepted(next, 'active', candidate)
    assert.deepEqual(geometry(next), [candidate, rect(3, 0), rect(3, 4)])
  }
})

test('axis uses normalized single-peer offset, candidate center outside peer, and y on summed ties', () => {
  const snapshot = frozen([item('active', 0, 30), item('peer', 2, 8, 8)])
  const candidate = rect(6, 8)
  assert.equal(placementAxis(snapshot, 'active', candidate, { x: 6.9, y: 10.8 }), 'y')
  assert.equal(placementAxis(snapshot, 'active', candidate, { x: 900, y: 900 }), 'x')
  assert.equal(placementAxis(snapshot, 'active', candidate), 'x')
  const tie = frozen([item('active', 0, 30), item('left', 2, 4), item('right', 6, 4)])
  assert.equal(placementAxis(tie, 'active', rect(4, 4)), 'x')
  assert.equal(placementAxis(tie, 'active', rect(4, 6)), 'y')
})

test('exact-center without an inside pointer follows the candidate travel direction', () => {
  for (const [originY, targetY] of [[0, 14], [30, 6], [10, 14]]) {
    const snapshot = frozen([item('active', 8, originY), item('peer', 0, 10)])
    const candidate = rect(0, 10)
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12)
    accepted(next, 'active', candidate)
    assert.deepEqual(geometry(next)[1], rect(0, targetY))
  }
})

test('equal-center aligned rows and columns use one group pointer tie-breaker', () => {
  const snapshot = frozen([item('active', 0, 30, 8), item('left', 0, 8), item('right', 4, 8)])
  const candidate = rect(0, 8, 8)
  for (const [y, targetY] of [[8.5, 12], [11.5, 4]]) {
    for (const x of [2, 6]) {
      const next = multiPreviewPlacement(snapshot, 'active', candidate, 8, { x, y })
      accepted(next, 'active', candidate, 8)
      assert.deepEqual(geometry(next), [candidate, rect(0, targetY), rect(4, targetY)])
    }
  }
})

test('different peers can split left and right instead of sharing a global direction', () => {
  const snapshot = frozen([item('active', 0, 30, 4, 8), item('left', 2, 10), item('right', 6, 10)])
  const candidate = rect(4, 8, 4, 8)
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 12)
  accepted(next, 'active', candidate)
  assert.deepEqual(geometry(next), [candidate, rect(0, 10), rect(8, 10)])
})

test('pointer upper/lower/left/right halves retain independent directional priority', () => {
  const snapshot = frozen([item('active', 8, 30), item('peer', 4, 12)])
  const candidate = rect(4, 12)
  for (const [pointer, expected] of [
    [{ x: 6, y: 12.5 }, rect(4, 16)], [{ x: 6, y: 15.5 }, rect(4, 8)],
    [{ x: 4.5, y: 14 }, rect(8, 12)], [{ x: 7.5, y: 14 }, rect(0, 12)],
    [{ x: 6, y: 14 }, rect(4, 16)],
  ]) {
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, pointer)
    accepted(next, 'active', candidate)
    assert.deepEqual(geometry(next)[1], expected)
  }
})

test('a pointer outside a particular peer uses the candidate center for that peer', () => {
  const snapshot = frozen([item('active', 8, 30), item('peer', 4, 12)])
  const candidate = rect(4, 12)
  assert.deepEqual(
    multiPreviewPlacement(snapshot, 'active', candidate, 12, { x: 0, y: 900 }),
    multiPreviewPlacement(snapshot, 'active', candidate, 12),
  )
})

test('up and down chains prefer pushing untouched peers and restore from the drag-start snapshot', () => {
  for (const up of [false, true]) {
    const snapshot = frozen([
      { ...item('active', 8, 40), custom: 'keep' }, item('a', 0, 16),
      item('b', 0, up ? 12 : 20), item('c', 0, up ? 8 : 24),
      item('side', 4, 20), item('distant', 0, 90),
    ])
    const candidate = rect(0, 16)
    const pointer = { x: 2, y: up ? 19 : 17 }
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, pointer)
    const delta = up ? -4 : 4
    assert.deepEqual(geometry(next), [candidate, rect(0, 16 + delta), rect(0, snapshot[2].y + delta),
      rect(0, snapshot[3].y + delta), rect(4, 20), rect(0, 90)])
    accepted(next, 'active', candidate)
    assert.equal(next[0].custom, 'keep')
    assert.deepEqual(multiPreviewPlacement(snapshot, 'active', snapshot[0], 12, pointer), snapshot)
    assert.deepEqual(next, multiPreviewPlacement(snapshot, 'active', candidate, 12, pointer))
  }
})

test('whitespace and touching edges leave all unrelated peers and holes alone', () => {
  const snapshot = frozen([item('active', 8, 40), item('a', 0, 8), item('b', 4, 24), item('far', 0, 90)])
  for (const candidate of [rect(4, 12), rect(8, 70)]) {
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12)
    accepted(next, 'active', candidate)
    assert.deepEqual(next.slice(1), snapshot.slice(1))
  }
})

test('bounds exhaust the chosen axis before trying the other axis, while keeping feasible same-axis retries', () => {
  const snapshot = frozen([item('active', 0, 30), item('peer', 0, 0, 8)])
  const candidate = rect(0, 0, 8)
  assert.equal(placementAxis(snapshot, 'active', candidate, { x: 7, y: 2 }), 'x')
  assert.deepEqual(multiPreviewOnAxis(snapshot, 'active', candidate, 8, 'x', { x: 7, y: 2 }), snapshot)
  const fallback = multiPreviewPlacement(snapshot, 'active', candidate, 8, { x: 7, y: 2 })
  accepted(fallback, 'active', candidate, 8)
  assert.deepEqual(geometry(fallback), [candidate, rect(0, 4, 8)])
  const bottom = frozen([item('active', 4, 0), item('peer', 0, SPATIAL_MAX_Y)])
  const bottomCandidate = rect(0, SPATIAL_MAX_Y)
  const next = multiPreviewPlacement(bottom, 'active', bottomCandidate, 12)
  accepted(next, 'active', bottomCandidate)
  assert.deepEqual(geometry(next), [bottomCandidate, rect(0, SPATIAL_MAX_Y - 4)])
})

test('an exhausted upper chain retries the direct peer below without reordering or switching columns', () => {
  const snapshot = frozen([
    item('active', 8, 40), item('top', 0, 0), item('middle', 0, 4), item('direct', 0, 8), item('side', 4, 0),
  ])
  const candidate = rect(0, 8)
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, { x: 2, y: 11.5 })
  accepted(next, 'active', candidate)
  assert.deepEqual(geometry(next), [candidate, rect(0, 0), rect(0, 4), rect(0, 12), rect(4, 0)])
  assert.notEqual(next, snapshot)
})

test('a large push cannot leapfrog an untouched same-side neighbor', () => {
  const snapshot = frozen([item('active', 8, 50), item('direct', 0, 8), item('outer', 0, 12)])
  const candidate = rect(0, 0, 4, 12)
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, { x: 2, y: 8.5 })
  accepted(next, 'active', candidate)
  assert.deepEqual(geometry(next), [candidate, rect(0, 12), rect(0, 16)])
})

test('two-column full-width previews recursively displace and restore', () => {
  const snapshot = frozen([item('active', 0, 20, 2, 4, 2), item('a', 0, 0, 2, 4, 2), item('b', 0, 4, 2, 4, 2)])
  const candidate = rect(0, 0, 2)
  // Explicit upper-half pointer pushes down. With no pointer, preferred up is
  // infeasible at y=0, so the same-axis partition retries the chain below.
  const next = multiPreviewPlacement(snapshot, 'active', candidate, 2, { x: 1, y: 0.5 })
  assert.deepEqual(multiPreviewPlacement(snapshot, 'active', candidate, 2), next)
  accepted(next, 'active', candidate, 2)
  assert.deepEqual(geometry(next), [candidate, rect(0, 4, 2), rect(0, 8, 2)])
  assert.deepEqual(multiPreviewPlacement(snapshot, 'active', snapshot[0], 2), snapshot)
})

test('exhausted bounded space returns a complete snapshot clone without partial moves', { timeout: 15_000 }, () => {
  const snapshot = frozen(Array.from({ length: 334 }, (_, index) => item(index ? `p${index}` : 'active', 0, index * 30, 2, 30, 2)))
  const before = structuredClone(snapshot)
  const next = multiPreviewPlacement(snapshot, 'active', rect(0, 15, 2, 30), 2)
  assert.deepEqual(next, snapshot)
  assert.notEqual(next, snapshot)
  assert.deepEqual(snapshot, before)
})

test('invalid candidate, columns, pointer, missing id or corrupt snapshot returns a clone', () => {
  const snapshot = frozen([item('active', 0, 0), item('peer', 4, 10)])
  for (const bad of [null, [], {}, rect(-1, 0), rect(0, -1), rect(9, 0), rect(0, 10001),
    rect(NaN, 0), rect(0.5, 0), rect(0, 0, 1), rect(0, 0, 4, 2), rect(0, 0, 4, 31)]) {
    assert.deepEqual(multiPreviewPlacement(snapshot, 'active', bad, 12), snapshot)
  }
  for (const cols of [0, 13, 2.5, NaN, Infinity]) {
    assert.deepEqual(multiPreviewPlacement(snapshot, 'active', rect(0, 8), cols), snapshot)
  }
  for (const pointer of [null, { x: NaN, y: 1 }, { x: 1, y: Infinity }]) {
    assert.deepEqual(multiPreviewPlacement(snapshot, 'active', rect(0, 8), 12, pointer), snapshot)
  }
  assert.deepEqual(multiPreviewPlacement(snapshot, 'missing', rect(0, 8), 12), snapshot)
  for (const corrupt of [
    [item('active', 0, 0), item('peer', 0, 0)],
    [item('active', 0, 0), item('active', 4, 8)],
    [item('active', 0, 0), item('peer', -1, 8)],
  ]) assert.deepEqual(multiPreviewPlacement(frozen(corrupt), 'active', rect(8, 30), 12), corrupt)
})

test('actual workbench fixture retries y=7 below but preserves successful y=8/9 preferred sweeps', () => {
  const snapshot = frozen([
    item('running', 4, 2), item('quick', 0, 2), item('resume', 0, 6),
    item('queue', 4, 6), item('areas', 0, 12), item('today', 4, 12, 8),
  ])
  for (const [y, quickY, resumeY, areasY] of [[7, 2, 11, 15], [8, 0, 4, 12], [9, 1, 5, 13]]) {
    const candidate = rect(0, y)
    const pointer = { x: 2, y: y + 0.5 }
    assert.equal(placementAxis(snapshot, 'running', candidate, pointer), 'y')
    const next = multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer)
    accepted(next, 'running', candidate)
    assert.deepEqual(geometry(next), [candidate, rect(0, quickY), rect(0, resumeY),
      rect(4, 6), rect(0, areasY), rect(4, 12, 8)])
    assert.deepEqual(next, multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer))
  }
  const candidate = rect(1, 2)
  const pointer = { x: 3.8, y: 4 }
  assert.equal(placementAxis(snapshot, 'running', candidate, pointer), 'x')
  const next = multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer)
  accepted(next, 'running', candidate)
  assert.deepEqual(geometry(next), [candidate, rect(5, 2), rect(0, 6), rect(4, 6), rect(0, 12), rect(4, 12, 8)])
})

test('144 seeded actual-fixture candidates remain accepted-or-rejected with bounded axial peer order', () => {
  const snapshot = frozen([
    item('running', 4, 2), item('quick', 0, 2), item('resume', 0, 6),
    item('queue', 4, 6), item('areas', 0, 12), item('today', 4, 12, 8),
  ])
  let seed = 0x771144
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
  for (let run = 0; run < 144; run++) {
    const candidate = rect(random(9), random(22))
    const pointer = { x: candidate.x + random(40) / 10, y: candidate.y + random(40) / 10 }
    const next = multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer)
    if (JSON.stringify(geometry(next)[0]) !== JSON.stringify(candidate)) {
      assert.deepEqual(next, snapshot, 'rejection has no partial moves')
      continue
    }
    accepted(next, 'running', candidate)
    const axis = resolvedAxis(snapshot, 'running', candidate, 12, pointer, next)
    const cross = axis === 'x' ? 'y' : 'x'
    const size = axis === 'x' ? 'w' : 'h'
    const crossSize = axis === 'x' ? 'h' : 'w'
    for (let a = 1; a < snapshot.length; a++) {
      assert.equal(next[a][cross], snapshot[a][cross])
      for (let b = a + 1; b < snapshot.length; b++) {
        const first = snapshot[a]
        const second = snapshot[b]
        if (first[cross] >= second[cross] + second[crossSize]
          || second[cross] >= first[cross] + first[crossSize]) continue
        if (first[axis] < second[axis]) assert.ok(next[a][axis] + next[a][size] <= next[b][axis])
        else assert.ok(next[b][axis] + next[b][size] <= next[a][axis])
      }
    }
    assert.deepEqual(next, multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer))
  }
})

test('horizontal same-axis fallback moves an aligned group together and propagates in original order', () => {
  // Three-cell widths keep the transposed bounded chain inside twelve columns.
  const snapshot = frozen([
    item('active', 9, 12, 3, 8), item('quick', 0, 0, 3, 8),
    item('resume-upper', 3, 0, 3), item('resume-lower', 3, 4, 3), item('outer', 8, 0, 3, 8),
  ])
  const candidate = rect(3, 0, 3, 8)
  for (const y of [2, 6]) {
    const pointer = { x: 5.8, y }
    assert.equal(placementAxis(snapshot, 'active', candidate, pointer), 'x')
    const next = multiPreviewPlacement(snapshot, 'active', candidate, 12, pointer)
    accepted(next, 'active', candidate)
    assert.deepEqual(geometry(next), [candidate, rect(0, 0, 3, 8), rect(6, 0, 3), rect(6, 4, 3), rect(9, 0, 3, 8)])
    assert.deepEqual(next.slice(1).map(peer => peer.y), snapshot.slice(1).map(peer => peer.y))
  }
})

/** Independent constructive oracle, not a call to either production solver.
 * Put every original aligned row below active, preserving x and original y DAG.
 * With legal columns and sufficient bottom space this proves a solution exists.
 */
function verticalBelowOracle(snapshot, id, candidate, cols) {
  const next = snapshot.map(peer => peer.i === id ? { ...peer, ...candidate } : { ...peer })
  const rows = []
  for (const peer of next.filter(peer => peer.i !== id).sort((a, b) => a.y - b.y || a.h - b.h)) {
    const row = rows.at(-1)
    if (row && row[0].y === peer.y && row[0].h === peer.h) row.push(peer)
    else rows.push([peer])
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    let y = Math.max(candidate.y + candidate.h, row[0].y)
    for (let earlier = 0; earlier < index; earlier++) {
      if (row.some(a => rows[earlier].some(b => a.x < b.x + b.w && b.x < a.x + a.w))) {
        y = Math.max(y, rows[earlier][0].y + rows[earlier][0].h)
      }
    }
    for (const peer of row) peer.y = y
  }
  accepted(next, id, candidate, cols)
  return next
}

// Geometry captured from ../.work/dsh-home/evidence/red-latest-layout.json.
// Embed the read evidence so the regression does not depend on a private file.
const latestLayout = () => frozen([
  item('recent', 0, 23, 8), item('resume', 0, 6), item('queue', 4, 2), item('quick', 0, 2),
  item('today', 4, 12, 8), item('running', 8, 2), item('rhythm', 0, 19, 8),
  item('tasks', 4, 27, 4, 8), item('areas', 0, 15),
])

function axialContract(snapshot, next, id, axis) {
  const peers = snapshot.map((peer, index) => peer.i === id ? -1 : index).filter(index => index >= 0)
  const cross = axis === 'x' ? 'y' : 'x'
  const size = axis === 'x' ? 'w' : 'h'
  const crossSize = axis === 'x' ? 'h' : 'w'
  for (const a of peers) {
    assert.equal(next[a][cross], snapshot[a][cross], 'one shared axis: cross coordinate never changes')
    assert.equal(next[a].w, snapshot[a].w)
    assert.equal(next[a].h, snapshot[a].h)
    for (const b of peers) {
      if (snapshot[a][axis] >= snapshot[b][axis]
        || snapshot[a][cross] >= snapshot[b][cross] + snapshot[b][crossSize]
        || snapshot[b][cross] >= snapshot[a][cross] + snapshot[a][crossSize]) continue
      assert.ok(next[a][axis] + next[a][size] <= next[b][axis], 'all original peer-order edges survive')
    }
  }
}

test('latest nine-widget layout: all 1134 candidates accept whenever either forced axis or vertical oracle succeeds', t => {
  const snapshot = latestLayout()
  const before = structuredClone(snapshot)
  let preferredRejects = 0
  let rejects = 0
  let total = 0
  for (let x = 0; x <= 8; x++) for (let y = 0; y <= 20; y++) {
    const candidate = rect(x, y)
    verticalBelowOracle(snapshot, 'running', candidate, 12)
    for (const grabX of [0.5, 2, 3.5]) for (const grabY of [0.5, 2]) {
      total++
      const pointer = { x: x + grabX, y: y + grabY }
      const preferred = placementAxis(snapshot, 'running', candidate, pointer)
      const forced = Object.fromEntries(['x', 'y'].map(axis => [axis,
        multiPreviewOnAxis(snapshot, 'running', candidate, 12, axis, pointer)]))
      const label = JSON.stringify({ candidate, pointer, preferred })
      for (const axis of ['x', 'y']) {
        if (isAccepted(forced[axis], 'running', candidate)) {
          accepted(forced[axis], 'running', candidate)
          axialContract(snapshot, forced[axis], 'running', axis)
        } else assert.deepEqual(forced[axis], snapshot, `forced ${axis} rejection is transactional: ${label}`)
      }
      assert.ok(isAccepted(forced.y, 'running', candidate), `independent vertical oracle proves forced y exists: ${label}`)
      const next = multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer)
      if (!isAccepted(forced[preferred], 'running', candidate)) preferredRejects++
      if (!isAccepted(next, 'running', candidate)) rejects++
      assert.ok(isAccepted(next, 'running', candidate), `either forced axis succeeds => entry accepts: ${label}`)
      accepted(next, 'running', candidate)
      const actualAxis = resolvedAxis(snapshot, 'running', candidate, 12, pointer, next)
      axialContract(snapshot, next, 'running', actualAxis)
      assert.deepEqual(next, multiPreviewPlacement(snapshot, 'running', candidate, 12, pointer), label)
    }
  }
  assert.deepEqual(snapshot, before)
  assert.equal(total, 1134)
  assert.equal(preferredRejects, 298, 'captured preferred-only baseline remains stable')
  assert.equal(rejects, 0)
  t.diagnostic(`current layout: ${total} candidates; preferred-only false rejects ${preferredRejects}; entry false rejects ${rejects}`)
})

test('seeded random candidates are transactional accepted-or-reject; accepted peers retain axis and order', () => {
  let seed = 0x4d595df4
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
  let acceptedCount = 0
  for (let run = 0; run < 250; run++) {
    const cols = [2, 6, 8, 12][random(4)]
    const entries = []
    for (let index = 0; index < 9; index++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const width = Math.min(cols, 3) + random(cols - Math.min(cols, 3) + 1)
        const candidate = item(index ? `peer-${index}` : 'active', random(cols - width + 1), random(55), width, 3 + random(8), cols)
        if (canPlace(entries, candidate.i, candidate, cols)) { entries.push(candidate); break }
      }
    }
    entries.push(item('far', 0, 900, Math.min(cols, 4), 4, cols))
    const snapshot = frozen(entries)
    const active = snapshot[0]
    const candidate = rect(random(cols - active.w + 1), random(55), active.w, active.h)
    const pointer = { x: candidate.x + random(candidate.w * 10) / 10, y: candidate.y + random(candidate.h * 10) / 10 }
    const before = structuredClone(snapshot)
    const next = multiPreviewPlacement(snapshot, 'active', candidate, cols, pointer)
    const actual = geometry(next)[0]
    if (JSON.stringify(actual) === JSON.stringify(candidate)) {
      acceptedCount++
      accepted(next, 'active', candidate, cols)
      const axis = resolvedAxis(snapshot, 'active', candidate, cols, pointer, next)
      const cross = axis === 'x' ? 'y' : 'x'
      const size = axis === 'x' ? 'w' : 'h'
      const crossSize = axis === 'x' ? 'h' : 'w'
      for (let a = 1; a < snapshot.length; a++) {
        assert.equal(next[a][cross], snapshot[a][cross], 'accepted peers never change cross coordinate')
        assert.equal(next[a].w, snapshot[a].w)
        assert.equal(next[a].h, snapshot[a].h)
        for (let b = a + 1; b < snapshot.length; b++) {
          const first = snapshot[a]
          const second = snapshot[b]
          if (first[cross] >= second[cross] + second[crossSize]
            || second[cross] >= first[cross] + first[crossSize]) continue
          // Same-side lanes keep the complete original order, including peers
          // jumped over by a wide/tall candidate rather than just final overlaps.
          if (first[axis] < second[axis]) assert.ok(next[a][axis] + next[a][size] <= next[b][axis])
          else assert.ok(next[b][axis] + next[b][size] <= next[a][axis])
        }
      }
    } else assert.deepEqual(next, snapshot, 'rejections are transactional')
    assert.deepEqual(next, multiPreviewPlacement(snapshot, 'active', candidate, cols, pointer))
    assert.deepEqual(next.at(-1), snapshot.at(-1), 'distant unconnected peers stay put')
    assert.deepEqual(next.map(entry => entry.i), snapshot.map(entry => entry.i))
    assert.deepEqual(snapshot, before)
    assert.deepEqual(multiPreviewPlacement(snapshot, 'active', active, cols), snapshot)
  }
  assert.ok(acceptedCount > 0, 'the transaction contract also exercises accepted candidates')
  assert.ok(acceptedCount <= 250, 'both bounded axes are tried without a free-placement search')
})
