/** Pure per-widget finite shape contract. No React, store or global size catalog. */
import type { GridShape, RegisteredWidgetDefinition, WidgetDefaults, WidgetPreset, WidgetSizing, WidgetSizingInput } from './widget-contract.ts'

function fail(message: string): never { throw new Error(`homeWidgets: sizing ${message}`) }
function plainData(input: unknown, keys: readonly string[], field: string): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail(`${field} must be a plain object`)
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !keys.includes(key)) fail(`${field} supports only ${keys.join(' and ')}`)
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!
    if (!descriptor.enumerable || !('value' in descriptor)) fail(`${field} requires data properties`)
  }
  if (keys.some(key => !Object.hasOwn(input, key))) fail(`${field} requires ${keys.join(' and ')}`)
}
/** Compatibility strings are parsed as dimensions, never looked up in a catalog. */
/** The fixed size ladder: like a phone grid, only these shapes exist. 4 divides the
 * board unit so 4/8/12-wide cards always tile a row; heights step 112px. */
export const CANVAS_SIZE_WIDTHS = Object.freeze([4, 8, 12])
export const CANVAS_SIZE_HEIGHTS = Object.freeze([4, 6, 8, 10])
export function isLadderShape(shape: GridShape): boolean {
  return CANVAS_SIZE_WIDTHS.includes(shape.w) && CANVAS_SIZE_HEIGHTS.includes(shape.h)
}

function shapeFor(input: unknown): GridShape {
  let w: unknown, h: unknown
  if (typeof input === 'string') {
    const match = /^([1-9][0-9]*)x([1-9][0-9]*)$/.exec(input)
    if (!match) fail('shape must be { w, h } or a legacy integer WxH string')
    w = Number(match[1]); h = Number(match[2])
  } else {
    plainData(input, ['w', 'h'], 'shape')
    w = input.w; h = input.h
  }
  if (!Number.isInteger(w) || (w as number) < 1 || (w as number) > 12) fail('shape w must be an integer between 1 and 12')
  if (!Number.isInteger(h) || (h as number) < 3 || (h as number) > 30) fail('shape h must be an integer between 3 and 30')
  return Object.freeze({ w: w as number, h: h as number })
}
const sameShape = (a: GridShape, b: GridShape): boolean => a.w === b.w && a.h === b.h
/** Compare nominal declarations, independent of object identity or legacy string syntax. */
export function sameWidgetPreset(a: WidgetPreset, b: WidgetPreset): boolean {
  return sameShape(shapeFor(a), shapeFor(b))
}

export function normalizeWidgetSizing(input: WidgetSizing | WidgetSizingInput): Readonly<WidgetSizing> {
  return normalizeShapes(input)
}
/** Kept separate from the exported name so legacy `defaults` share one code path. */
function normalizeShapes(input: WidgetSizing | WidgetSizingInput): Readonly<WidgetSizing> {
  plainData(input, ['default', 'supported'], 'declaration')
  const values = input.supported
  if (!Array.isArray(values) || Object.getPrototypeOf(values) !== Array.prototype
    || values.length < 1 || values.length > 16) fail('supported must contain 1..16 shapes')
  // Inspect descriptors rather than invoking provider getters or accepting sparse/named arrays.
  for (const key of Reflect.ownKeys(values)) {
    if (key === 'length') continue
    if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= values.length) fail('supported requires an ordinary dense array')
    const descriptor = Object.getOwnPropertyDescriptor(values, key)!
    if (!descriptor.enumerable || !('value' in descriptor)) fail('supported requires data properties')
  }
  const supported: GridShape[] = []
  for (let index = 0; index < values.length; index++) {
    if (!Object.hasOwn(values, index)) fail('supported requires an ordinary dense array')
    const shape = shapeFor(values[index])
    if (supported.some(other => sameShape(other, shape))) fail('supported cannot contain duplicate shapes')
    supported.push(shape)
  }
  const requested = shapeFor(input.default)
  const defaultShape = supported.find(shape => sameShape(shape, requested))
  if (!defaultShape) fail('default must match a supported shape by w/h')
  return Object.freeze({ default: defaultShape, supported: Object.freeze(supported) })
}
/** Legacy hints become one fixed declaration; do not round the original height. */
export function legacyWidgetSizing(defaults: Readonly<WidgetDefaults>): Readonly<WidgetSizing> {
  const shape = { w: defaults.size === 's' ? 4 : defaults.size === 'm' ? 8 : 12, h: defaults.height }
  return normalizeShapes({ default: shape, supported: [shape] })
}
export function presetGeometry(preset: WidgetPreset, cols: number): GridShape {
  // Grid domain (kept local so this helper stays free of runtime imports): the
  // fixed-stride canvas 12..32 plus the legacy 2/6 breakpoints.
  if (!Number.isInteger(cols) || !(cols === 2 || cols === 6 || (cols >= 12 && cols <= 32))) throw new Error('Invalid grid breakpoint')
  const shape = shapeFor(preset)
  // The fixed-stride canvas keeps every declared width: same shape, only clamped to
  // the available columns. The old shrink rules survive for legacy 2/6.
  if (cols >= 12) return { w: Math.min(shape.w, cols), h: shape.h }
  return { w: cols === 6 ? shape.w <= 4 ? Math.min(shape.w, 3) : Math.min(shape.w, 6) : Math.min(shape.w, 2), h: shape.h }
}
/** Duplicate projected shapes are one option; prefer the default's declaration by w/h. */
export function projectedWidgetPresets(sizing: Readonly<WidgetSizing> | WidgetSizingInput, cols: number): { preset: WidgetPreset; w: number; h: number }[] {
  const result: { preset: WidgetPreset; w: number; h: number }[] = []
  const defaultShape = shapeFor(sizing.default)
  for (const preset of sizing.supported) {
    const shape = presetGeometry(preset, cols)
    const existing = result.find(item => sameShape(item, shape))
    if (!existing) result.push({ preset, ...shape })
    else if (sameShape(shapeFor(preset), defaultShape)) existing.preset = preset
  }
  return result
}
/** Pre-position builtins existed before explicit sizing; only generic legacy records
 * (no exact position in any breakpoint) use these immutable historical hints. */
export function legacyInstanceProjection(typeId: string, id: string, layout: { positions?: Record<string, Record<string, unknown>> }, definition?: RegisteredWidgetDefinition): { size: 's' | 'm' | 'l'; height: number } | undefined {
  if (Object.values(layout.positions ?? {}).some(rows => Object.hasOwn(rows, id))) return undefined
  const old: Record<string, { size: 's' | 'm'; height: number }> = {
    recent: { size: 'm', height: 7 }, tasks: { size: 's', height: 8 }, today: { size: 'm', height: 4 },
    running: { size: 's', height: 4 }, areas: { size: 's', height: 4 }, rhythm: { size: 'm', height: 4 },
    resume: { size: 'm', height: 4 }, queue: { size: 's', height: 4 }, quick: { size: 's', height: 4 },
    notes: { size: 's', height: 6 }, clock: { size: 's', height: 4 }, activity: { size: 'm', height: 6 },
  }
  const key = typeId.startsWith('@vlln/dsh-home:') ? typeId.slice('@vlln/dsh-home:'.length) : ''
  return old[key] ?? (definition ? { size: definition.defaults.size, height: definition.defaults.height } : undefined)
}

/** Compatibility bounds summarize this widget's declarations, not additional resize options. */
export function sizingDefaults(sizing: Readonly<WidgetSizing> | WidgetSizingInput): Readonly<WidgetDefaults> {
  const shape = shapeFor(sizing.default), shapes = sizing.supported.map(shapeFor)
  return Object.freeze({ size: shape.w <= 4 ? 's' : shape.w <= 8 ? 'm' : 'l', height: shape.h,
    minWidth: Math.min(...shapes.map(item => item.w)), maxWidth: Math.max(...shapes.map(item => item.w)),
    minHeight: Math.min(...shapes.map(item => item.h)), maxHeight: Math.max(...shapes.map(item => item.h)) })
}
