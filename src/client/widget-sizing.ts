/** Host-owned finite grid catalog. No React, store or provider-defined geometry. */
import type { RegisteredWidgetDefinition, WidgetDefaults, WidgetPreset, WidgetSizing } from './widget-contract.ts'

export const WIDGET_PRESETS: Readonly<Record<WidgetPreset, Readonly<{ w: number; h: number }>>> = Object.freeze(
  Object.fromEntries([4, 8, 12].flatMap(w => [4, 6, 8, 12].map(h => [`${w}x${h}`, Object.freeze({ w, h })]))) as Record<WidgetPreset, Readonly<{ w: number; h: number }>>,
)
const fail = (message: string): never => { throw new Error(`homeWidgets: sizing ${message}`) }
export function normalizeWidgetSizing(input: WidgetSizing): Readonly<WidgetSizing> {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail('must be a plain object')
  for (const key of Reflect.ownKeys(input)) {
    if (key !== 'default' && key !== 'supported') fail('supports only default and supported')
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!
    if (!descriptor.enumerable || !('value' in descriptor)) fail('requires data properties')
  }
  if (!Array.isArray(input.supported) || input.supported.length < 1 || input.supported.length > 12) fail('supported must contain 1..12 catalog names')
  const supported = [...input.supported]
  if (supported.some(key => typeof key !== 'string' || !Object.hasOwn(WIDGET_PRESETS, key))) fail('unknown catalog preset')
  if (new Set(supported).size !== supported.length) fail('supported cannot contain duplicates')
  if (!supported.includes(input.default)) fail('default must be supported')
  return Object.freeze({ default: input.default, supported: Object.freeze(supported) })
}
/** Legacy hints are not custom geometry: ceil to one finite preset and lock it.
 * Existing saved rectangles are deliberately handled by the spatial model, not here. */
export function legacyWidgetSizing(defaults: Readonly<WidgetDefaults>): Readonly<WidgetSizing> {
  const w = defaults.size === 's' ? 4 : defaults.size === 'm' ? 8 : 12
  const h = [4, 6, 8, 12].find(value => value >= defaults.height) ?? 12
  const preset = `${w}x${h}` as WidgetPreset
  return normalizeWidgetSizing({ default: preset, supported: [preset] })
}
export function presetGeometry(preset: WidgetPreset, cols: number): { w: number; h: number } {
  if (![2, 6, 12].includes(cols) || !Object.hasOwn(WIDGET_PRESETS, preset)) throw new Error('Invalid grid preset or breakpoint')
  const shape = WIDGET_PRESETS[preset]
  return { w: cols === 12 ? shape.w : cols === 6 ? shape.w === 4 ? 3 : 6 : 2, h: shape.h }
}
/** Duplicate projected shapes are one option; prefer the default's name. */
export function projectedWidgetPresets(sizing: Readonly<WidgetSizing>, cols: number): { preset: WidgetPreset; w: number; h: number }[] {
  const result: { preset: WidgetPreset; w: number; h: number }[] = []
  for (const preset of sizing.supported) {
    const shape = presetGeometry(preset, cols)
    const existing = result.find(item => item.w === shape.w && item.h === shape.h)
    if (!existing) result.push({ preset, ...shape })
    else if (preset === sizing.default) existing.preset = preset
  }
  return result
}
/** Pre-position builtins existed before grid presets; only generic legacy records
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

/** Compatibility output for old consumers, derived exclusively from the catalog. */
export function sizingDefaults(sizing: Readonly<WidgetSizing>): Readonly<WidgetDefaults> {
  const shape = WIDGET_PRESETS[sizing.default], shapes = sizing.supported.map(key => WIDGET_PRESETS[key])
  return Object.freeze({ size: shape.w === 4 ? 's' : shape.w === 8 ? 'm' : 'l', height: shape.h,
    minWidth: Math.min(...shapes.map(item => item.w)), maxWidth: Math.max(...shapes.map(item => item.w)),
    minHeight: Math.min(...shapes.map(item => item.h)), maxHeight: Math.max(...shapes.map(item => item.h)) })
}
