/** Native release ownership, tested without a browser, React scheduling, or persistence. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { observeDragRelease } from '../src/client/drag-release.ts'

class Target {
  listeners = []
  addEventListener(type, listener, capture) { this.listeners.push({ type, listener, capture: capture === true }) }
  removeEventListener(type, listener, capture) { this.listeners = this.listeners.filter(l => l.type !== type || l.listener !== listener || l.capture !== (capture === true)) }
}
function fixture() {
  const window = new Target(), document = new Target(), documentElement = new Target(), button = new Target(), title = new Target()
  const targets = { window, document, documentElement }
  const emit = (target, type, props = {}) => {
    let stopped = false, immediate = false
    const event = { type, target, button: 0, buttons: 1, pointerId: 7, pointerType: 'mouse', ...props,
      stopPropagation() { stopped = true }, stopImmediatePropagation() { stopped = immediate = true } }
    const path = [window, document, documentElement, target]
    for (const capture of [true, false]) {
      for (const current of capture ? path : [...path].reverse()) {
        for (const l of [...current.listeners]) {
          if (l.type === type && l.capture === capture) l.listener(event)
          if (immediate) break
        }
        if (stopped) return
      }
    }
  }
  return { ...targets, targets, button, title, emit, count: () => [window, document, documentElement].reduce((n, t) => n + t.listeners.length, 0) }
}
function transaction(f, options = {}) {
  const state = { ghost: true, outline: true, active: true, commits: 0, cancels: 0 }
  const end = () => { state.ghost = state.outline = state.active = false }
  const clear = observeDragRelease(f.targets, { transport: 'pointer', pointerId: 7, ...options,
    onRelease: event => { end(); if (event.inside !== false && event.pending !== true && event.rejected !== true) state.commits++ },
    onCancel: () => { end(); state.cancels++ } })
  return { state, clear }
}
for (const source of ['button', 'title']) {
  test(`${source}: synchronous move-to-up and downstream propagation stop still settle once`, () => {
    const f = fixture(), { state } = transaction(f)
    f.document.addEventListener('pointerup', e => e.stopImmediatePropagation(), true)
    f[source].addEventListener('pointerup', e => e.stopPropagation(), false)
    f.emit(f[source], 'pointermove', { buttons: 1 })
    f.emit(f[source], 'pointerup')
    f.emit(f[source], 'mouseup', { pointerId: undefined })
    assert.deepEqual(state, { ghost: false, outline: false, active: false, commits: 1, cancels: 0 })
  })
}
test('compatible mouseup releases when an earlier window listener swallowed pointerup', () => {
  const f = fixture()
  f.window.addEventListener('pointerup', e => e.stopImmediatePropagation(), true)
  const { state } = transaction(f)
  f.emit(f.button, 'pointerup')
  assert.equal(state.active, true)
  f.emit(f.button, 'mouseup', { pointerId: undefined })
  assert.equal(state.commits, 1)
  assert.equal(state.ghost, false)
})
for (const [type, props, target] of [
  ['pointercancel', {}, 'button'], ['blur', { pointerId: undefined }, 'window'],
  ['mouseleave', { pointerId: undefined, relatedTarget: null }, 'documentElement'],
  ['pointermove', { buttons: 0 }, 'title'],
]) {
  test(`${type}: cancellation clears ghost/outline and never creates from a stale accepted candidate`, () => {
    const f = fixture(), { state } = transaction(f)
    f.emit(f[target], type, props)
    f.emit(f.button, 'pointerup')
    assert.deepEqual(state, { ghost: false, outline: false, active: false, commits: 0, cancels: 1 })
    assert.equal(f.count(), 0)
  })
}
test('unrelated pointer, secondary release, and descendant mouseleave do not end a gesture', () => {
  const f = fixture(), { state } = transaction(f)
  f.emit(f.title, 'pointercancel', { pointerId: 8 })
  f.emit(f.title, 'pointerup', { pointerId: 8 })
  f.emit(f.title, 'pointerup', { button: 2 })
  f.emit(f.title, 'mouseleave', { relatedTarget: null })
  assert.equal(state.active, true)
  f.emit(f.title, 'pointerup')
  assert.equal(state.commits, 1)
})
for (const props of [{ inside: false }, { pending: true }, { rejected: true }]) {
  test(`release clears but does not create for ${JSON.stringify(props)}`, () => {
    const f = fixture(), { state } = transaction(f)
    f.emit(f.button, 'pointerup', props)
    assert.equal(state.commits, 0)
    assert.equal(state.ghost, false)
    assert.equal(state.outline, false)
    assert.equal(f.count(), 0)
  })
}
test('touch does not fall back to an unrelated compatibility mouseup', () => {
  const f = fixture(), { state } = transaction(f, { touch: true })
  f.emit(f.title, 'mouseup', { pointerId: undefined })
  assert.equal(state.active, true)
  f.emit(f.title, 'pointermove', { pointerType: 'touch', buttons: 0 })
  assert.equal(state.active, true)
  f.emit(f.title, 'pointerup', { pointerType: 'touch' })
  assert.equal(state.commits, 1)
})
test('dispose of a pending source gesture removes every listener without creating or cancelling', () => {
  const f = fixture(), { state, clear } = transaction(f)
  clear(); clear()
  assert.equal(f.count(), 0)
  f.emit(f.button, 'pointerup')
  assert.equal(state.commits, 0)
  assert.equal(state.cancels, 0)
})
for (const transport of ['mouse', 'touch']) {
  test(`ordinary desktop ${transport}: release is captured before document-level blockers`, () => {
    const f = fixture(), { state } = transaction(f, { transport })
    const type = transport === 'mouse' ? 'mouseup' : 'touchend'
    f.document.addEventListener(type, e => e.stopImmediatePropagation(), true)
    f.emit(f.title, type, { pointerId: undefined })
    assert.equal(state.commits, 1)
    assert.equal(state.active, false)
  })
}
test('React wiring closes the threshold handoff and protects the origin button, with an idempotent RGL fallback', async () => {
  const gallery = await readFile(new URL('../src/client/widget-gallery.tsx', import.meta.url), 'utf8')
  const grid = await readFile(new URL('../src/client/spatial-grid.tsx', import.meta.url), 'utf8')
  assert.match(gallery, /flushSync\(\(\)=>\{setDragSource\(definition.typeId\);onDrag/)
  assert.match(gallery, /disabled=\{disabled&&dragSource!==definition.typeId\}/)
  assert.match(grid, /useLayoutEffect\(\(\) => \{\s*if \(!libraryDrag \|\| !editing\) return/)
  assert.match(grid, /cancelled.current \|\| !active.current \|\| !gesture.current/)
  assert.match(grid, /setTimeout\(\(\) => \{\s*if \(active.current && gesture.current === session\) desktopFinish.current\(\)/)
})
