/** node --experimental-strip-types --test test/drop-model.test.mjs */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { dropSideAt } from '../src/client/drop-model.ts'

const rect = (left, top, width, height) => ({ left, top, width, height })

test('full-row cards use upper/lower half regardless of horizontal position', () => {
  const card = rect(20, 100, 760, 200)
  assert.equal(dropSideAt(card, { width: 800 }, { x: 770, y: 110 }), 'before')
  assert.equal(dropSideAt(card, { width: 800 }, { x: 25, y: 290 }), 'after')
  assert.equal(dropSideAt(card, { width: 800 }, { x: 770, y: 200 }), 'before')
})

test('single-column narrow layout uses upper/lower half', () => {
  const card = rect(16, 80, 288, 160)
  assert.equal(dropSideAt(card, { width: 320 }, { x: 300, y: 90 }), 'before')
  assert.equal(dropSideAt(card, { width: 320 }, { x: 20, y: 230 }), 'after')
})

test('same-row two-column cards use left/right half regardless of height', () => {
  for (const left of [0, 420]) {
    const card = rect(left, 100, 380, 200)
    assert.equal(dropSideAt(card, { width: 800 }, { x: left + 5, y: 290 }), 'before')
    assert.equal(dropSideAt(card, { width: 800 }, { x: left + 375, y: 110 }), 'after')
    assert.equal(dropSideAt(card, { width: 800 }, { x: left + 190, y: 290 }), 'before')
  }
})

test('row-width tolerance does not confuse half-width cards; zero-width parent is safe', () => {
  assert.equal(dropSideAt(rect(0, 0, 80, 100), { width: 100 }, { x: 1, y: 99 }), 'after')
  assert.equal(dropSideAt(rect(0, 0, 79, 100), { width: 100 }, { x: 1, y: 99 }), 'before')
  assert.equal(dropSideAt(rect(0, 0, 50, 100), { width: 0 }, { x: 49, y: 1 }), 'after')
})

// Exercise the real hook with a tiny deterministic hooks/DOM host, without starting DSH or a browser.
const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const reactURL = dataModule(`
  export const host = {};
  export const useState = (...args) => host.useState(...args);
  export const useRef = (...args) => host.useRef(...args);
  export const useCallback = (...args) => host.useCallback(...args);
  export const useEffect = (...args) => host.useEffect(...args);
`)
const { host } = await import(reactURL)
const modelURL = new URL('../src/client/drop-model.ts', import.meta.url).href
const source = await readFile(new URL('../src/client/reorder.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replaceAll("'react'", JSON.stringify(reactURL)).replaceAll("'./drop-model.ts'", JSON.stringify(modelURL))
const { useReorder } = await import(dataModule(compiled))

function fixture() {
  const originals = Object.fromEntries(['window', 'document', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]))
  class Item {
    constructor(parent, attrs, bounds) { this.parentElement = parent; this.attrs = attrs; this.bounds = bounds; this.scrollTop = 0 }
    closest(selector) {
      if (selector === '.dsh-home' ? this.attrs.home : Object.hasOwn(this.attrs, selector.slice(1, -1))) return this
      return this.parentElement?.closest(selector) ?? null
    }
    getAttribute(name) { return this.attrs[name] ?? null }
    getBoundingClientRect() { return { ...this.bounds, right: this.bounds.left + this.bounds.width, bottom: this.bounds.top + this.bounds.height } }
  }
  const home = new Item(null, { home: true }, rect(0, 0, 800, 600))
  const row = new Item(home, {}, rect(20, 20, 760, 800))
  const a = new Item(row, { 'data-widget-id': 'a' }, rect(20, 30, 370, 200))
  const b = new Item(row, { 'data-widget-id': 'b' }, rect(410, 30, 370, 200))
  const otherHome = new Item(null, { home: true }, rect(0, 0, 800, 600))
  const outsider = new Item(otherHome, { 'data-widget-id': 'outside' }, rect(20, 30, 760, 200))
  const classes = new Set()
  const listeners = new Map()
  let hit = b
  let frameId = 0
  const frames = new Map()
  globalThis.Element = Item
  globalThis.window = {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn) },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn) },
  }
  globalThis.document = {
    body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
    elementFromPoint: () => hit,
    querySelector() { throw new Error('Must not query a global home container') },
  }
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId }
  globalThis.cancelAnimationFrame = id => frames.delete(id)
  const slots = []
  const commits = []
  let index = 0
  let dirty = true
  let pending = []
  let enabled = true
  let controller
  const same = (left, right) => left?.length === right?.length && left.every((value, i) => Object.is(value, right[i]))
  host.useState = initial => {
    const i = index++
    slots[i] ??= { value: initial }
    return [slots[i].value, value => { if (!Object.is(slots[i].value, value)) { slots[i].value = value; dirty = true } }]
  }
  host.useRef = value => { const i = index++; slots[i] ??= { current: value }; return slots[i] }
  host.useCallback = (value, deps) => {
    const i = index++
    if (!same(slots[i]?.deps, deps)) slots[i] = { value, deps }
    return slots[i].value
  }
  host.useEffect = (effect, deps) => {
    const i = index++
    if (!same(slots[i]?.deps, deps)) pending.push(() => {
      slots[i]?.cleanup?.()
      slots[i] = { deps, cleanup: effect() }
    })
  }
  const flush = () => {
    while (dirty) {
      dirty = false
      index = 0
      controller = useReorder('data-widget-id', (...args) => commits.push(args), enabled)
      const effects = pending
      pending = []
      for (const effect of effects) effect()
    }
  }
  const emit = (name, values = {}) => {
    const event = { target: a, pointerId: 7, button: 0, clientX: 775, clientY: 100, ...values }
    for (const fn of [...listeners.get(name) ?? []]) fn(event)
  }
  const unmount = () => { for (const slot of slots) slot?.cleanup?.() }
  flush()
  return {
    a, b, home, outsider, commits, classes, frames, listeners,
    get controller() { return controller },
    begin() { emit('pointerdown'); controller.begin('a'); flush() },
    emit, flush,
    setHit(value) { hit = value },
    setEnabled(value) { enabled = value; dirty = true; flush() },
    tick() { const callbacks = [...frames.values()]; frames.clear(); for (const fn of callbacks) fn(); flush() },
    unmount,
    dispose() { unmount(); for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value } },
  }
}

for (const end of ['pointercancel', 'cancel', 'disable', 'unmount']) {
  test(`${end} clears dragging/body/listeners without committing a valid target`, () => {
    const f = fixture()
    try {
      f.begin()
      f.emit('pointermove')
      f.flush()
      assert.equal(f.controller.dropTarget, 'b')
      assert.ok(f.classes.has('dsh-home-dragging'))
      if (end === 'pointercancel') f.emit('pointercancel')
      else if (end === 'cancel') f.controller.cancel()
      else if (end === 'disable') f.setEnabled(false)
      else f.unmount()
      if (end !== 'unmount') f.flush()
      f.emit('pointerup')
      assert.deepEqual(f.commits, [])
      assert.equal(f.classes.has('dsh-home-dragging'), false)
      assert.equal(f.frames.size, 0)
      assert.equal(f.listeners.get('pointermove')?.size ?? 0, 0)
      for (const name of ['pointerup', 'pointercancel']) assert.equal(f.listeners.get(name)?.size ?? 0, end === 'unmount' ? 0 : 1)
      if (end === 'unmount') assert.equal(f.listeners.get('pointerdown')?.size ?? 0, 0)
    } finally { f.dispose() }
  })
}

test('disabled begin is inert, then re-enabling allows a new drag', () => {
  const f = fixture()
  try {
    f.setEnabled(false)
    f.begin()
    assert.equal(f.controller.dragging, null)
    assert.equal(f.frames.size, 0)
    assert.equal(f.classes.size, 0)
    f.setEnabled(true)
    f.begin()
    assert.equal(f.controller.dragging, 'a')
  } finally { f.dispose() }
})

test('native pointerId filters unrelated move/up/cancel; release commits once using last valid scoped target', () => {
  const f = fixture()
  try {
    f.begin()
    f.emit('pointermove', { pointerId: 99 })
    f.emit('pointercancel', { pointerId: 99 })
    f.emit('pointerup', { pointerId: 99 })
    f.flush()
    assert.equal(f.controller.dragging, 'a')
    assert.equal(f.controller.dropTarget, null)
    f.emit('pointermove')
    f.flush()
    assert.equal(f.controller.dropTarget, 'b')
    f.setHit(f.outsider)
    f.emit('pointermove')
    f.setHit(null)
    f.emit('pointermove')
    f.emit('pointerup')
    f.emit('pointerup') // The ref is invalidated synchronously, before effect cleanup.
    f.flush()
    assert.deepEqual(f.commits, [['a', 'b', 'after']])
  } finally { f.dispose() }
})

test('edge scrolling continues on animation frames and recalculates the last valid target', () => {
  const f = fixture()
  try {
    f.begin()
    f.emit('pointermove', { clientY: 590 })
    f.tick()
    const first = f.home.scrollTop
    assert.ok(first > 0)
    f.tick()
    assert.ok(f.home.scrollTop > first)
    assert.equal(f.controller.dropTarget, 'b')
    f.controller.cancel()
    f.flush()
    assert.equal(f.frames.size, 0)
  } finally { f.dispose() }
})
