/** Pure home geometry; normal edits never compact. No React or grid runtime dependency. */
import type { GridRect, Layout, WidgetSize } from './api.ts'
import { isGridColumns } from './canvas-width.ts'
import { homeOrder, legacySpatialHeight } from './layout-model.ts'
import type { WidgetSizing } from './widget-contract.ts'
import { presetGeometry, projectedWidgetPresets, sameWidgetPreset } from './widget-sizing.ts'

export interface SpatialMeta {
  id: string
  defaultSize: WidgetSize
  defaultHeight?: number
  sizing?: Readonly<WidgetSizing>
  /** Compatibility hints only for an existing pre-position instance. */
  legacyProjection?: { size: WidgetSize; height: number }
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
}

export interface SpatialItem extends GridRect {
  i: string
  minW: number
  minH: number
  maxW?: number
  maxH?: number
  /** Actual breakpoint when a widget-specific maxW is narrower than the viewport. */
  viewportCols?: number
}

/** A row is 44px of content plus the grid's 12px gap. */
export const SPATIAL_ROW_HEIGHT = 44
export const SPATIAL_GAP = 12
export const SPATIAL_MAX_Y = 10_000
export const SPATIAL_MAX_H = 30
export const SPATIAL_MIN_H = 3

function columns(cols: number): number {
  // The canvas breakpoint is 12..32; legacy 6/2 data stays readable.
  return isGridColumns(cols) ? cols : 12
}

/** Legacy width buckets are defined on 12 columns; wider canvases keep those widths,
 * they do not make a saved `l` card span the whole new board. */
function legacyBucket(cols: number): number {
  return Math.min(columns(cols), 12)
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isRect(value: unknown, cols: number): value is GridRect {
  if (!record(value)) return false
  const { x, y, w, h } = value
  return typeof x === 'number' && Number.isInteger(x) && x >= 0
    && typeof y === 'number' && Number.isInteger(y) && y >= 0 && y <= SPATIAL_MAX_Y
    && typeof w === 'number' && Number.isInteger(w) && w >= 1 && w <= cols
    && typeof h === 'number' && Number.isInteger(h) && h >= SPATIAL_MIN_H && h <= SPATIAL_MAX_H
    && x + w <= cols
}

function overlaps(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback
}

/** Legacy width buckets: 12 (and any wider canvas) -> 4/8/12, 6 -> 3/6/6, 2 -> 2/2/2. */
export function widthFromSize(size: WidgetSize, cols: number): number {
  const bucket = legacyBucket(cols)
  if (bucket <= 2) return bucket
  if (bucket <= 6) return size === 's' ? Math.min(3, bucket) : bucket
  return size === 's' ? 4 : size === 'l' ? bucket : Math.min(8, bucket)
}

/** Width-only compatibility bucket (6-column m/l and all 2-column sizes coincide). */
export function sizeFromRect(rect: Pick<GridRect, 'w'>, cols: number): WidgetSize {
  const bucket = legacyBucket(cols)
  if (bucket <= 2 || rect.w <= widthFromSize('s', bucket)) return 's'
  return rect.w <= widthFromSize('m', bucket) ? 'm' : 'l'
}

export function defaultSpatialHeight(id: string): number {
  return legacySpatialHeight(id)
}

/**
 * Test an exact rectangle, excluding id itself. Edges may touch. Invalid, out of
 * bounds or overlapping proposals fail; no item is pushed or compacted.
 */
export function canPlace(
  geometry: readonly SpatialItem[], id: string, rect: GridRect, cols = 12,
): boolean {
  cols = columns(cols)
  return isRect(rect, cols) && geometry.every(item => item.i === id || !overlaps(rect, item))
}

/**
 * Find the first row-major empty slot for the requested width/height. Its x/y
 * are deliberately ignored. Returns null only if the bounded grid is full.
 */
export function findSpatialSpace(
  geometry: readonly SpatialItem[], rect: GridRect, cols: number,
): GridRect | null {
  cols = columns(cols)
  const shape = { x: 0, y: 0, w: rect.w, h: rect.h }
  if (!isRect(shape, cols)) return null
  for (let y = 0; y <= SPATIAL_MAX_Y; y++) {
    for (let x = 0; x <= cols - shape.w; x++) {
      const candidate = { ...shape, x, y }
      if (geometry.every(item => !overlaps(candidate, item))) return candidate
    }
  }
  return null
}

/**
 * Explicit user-requested packing only; never used by projection or normal moves.
 * Place cards by their original visual order (top to bottom, then left to right;
 * input order breaks exact ties). Each card takes the first free row-major slot,
 * so a later narrow card may fill a hole before an earlier wide card. This is
 * deterministic first-fit, not an optimal/minimum-height bin-packing solver.
 * An already locally tight surface is preserved, making repeated clicks a no-op;
 * shape-constrained holes may remain and no global packing optimum is promised.
 *
 * Preserve w/h, metadata and input array order. Invalid/overlapping input or an
 * unsupported breakpoint throws before producing a result; never repair sizes,
 * drop a card, or silently reinterpret another breakpoint. No-op returns the
 * original array; changed cards alone are copied. Frozen inputs are supported.
 */
export function compactSpatialLayout<T extends SpatialItem>(geometry: T[], cols: number): T[]
export function compactSpatialLayout<T extends SpatialItem>(geometry: readonly T[], cols: number): readonly T[]
export function compactSpatialLayout<T extends SpatialItem>(geometry: readonly T[], cols: number): readonly T[] {
  if (!isGridColumns(cols)) throw new Error('Invalid grid columns')
  if (!Array.isArray(geometry) || geometry.length > 64) throw new Error('Invalid compact layout')
  const ids = new Set<string>()
  for (const item of geometry) {
    if (!record(item) || typeof item.i !== 'string' || item.i.length === 0 || ids.has(item.i)
      || !isRect(item, cols)) {
      throw new Error('Invalid compact geometry')
    }
    ids.add(item.i)
  }
  if (geometry.some(item => !canPlace(geometry, item.i, item, cols))) throw new Error('Overlapping compact geometry')
  // A first-fit result is locally tight: with peers held still no card has an
  // earlier row-major slot. Keep it exactly, even if hole-filling changed visual
  // order, so repeated clicks cannot unexpectedly reshuffle a packed surface.
  const locallyTight = geometry.every(item => {
    const first = findSpatialSpace(geometry.filter(peer => peer !== item), item, cols)
    return first !== null && first.x === item.x && first.y === item.y
  })
  if (locallyTight) return geometry
  const visual = geometry.map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.index - b.index)
  const occupied: SpatialItem[] = []
  const packed = new Map<string, T>()
  let changed = false
  for (const { item } of visual) {
    const rect = findSpatialSpace(occupied, item, cols)
    if (rect === null) throw new Error('No space available to compact layout')
    const next = item.x === rect.x && item.y === rect.y ? item : { ...item, x: rect.x, y: rect.y }
    changed ||= next !== item
    occupied.push(next)
    packed.set(item.i, next)
  }
  return changed ? geometry.map(item => packed.get(item.i)!) : geometry
}

/** The canvas column count is a user preference, so the active key can change at any
 * time. When that exact count has no saved rows yet, read the nearest stored
 * breakpoint verbatim: largest key <= cols, else smallest key >= cols. Rectangles are
 * never scaled or re-projected; one that no longer fits falls through to first-fit.
 * The legacy 6/2 projections keep their independent first-fit behaviour. Writes always
 * target String(cols) (see mergeSpatialPositions). */
function savedBreakpointFor(layout: Layout, cols: number): Record<string, unknown> {
  const positions = layout.positions
  if (!record(positions)) return {}
  // Legacy 6/2 projections stay independent first-fit surfaces; the nearest-key read
  // belongs to the fixed-stride canvas (12..32), which the window can never change.
  if (cols < 12) return record(positions[String(cols)]) ? positions[String(cols)]! : {}
  const rowsAt = (key: string): Record<string, unknown> | null => {
    const rows = positions[key]
    return record(rows) && Object.keys(rows).length > 0 ? rows : null
  }
  const exact = rowsAt(String(cols))
  if (exact !== null) return exact
  const keys = Object.keys(positions)
    .filter(key => /^(?:[1-9]|[12]\d|3[0-2])$/u.test(key) && rowsAt(key) !== null)
    .map(Number)
    .sort((a, b) => a - b)
  const below = keys.filter(key => key < cols).at(-1)
  const above = keys.find(key => key > cols)
  const fallback = below ?? above
  return fallback === undefined ? {} : rowsAt(String(fallback))!
}

/**
 * Project registered, visible cards in homeOrder order, without mutating layout.
 * All legal saved rectangles are reserved before missing/invalid cards are
 * first-fit placed, so migration cannot steal a later card's saved position.
 * For conflicting saved data, the earlier ordered card wins; only the loser is
 * relocated. Hidden/unregistered cards never collide and their data is untouched.
 * Each breakpoint is independent: when the active column count has no data, the
 * nearest stored breakpoint is read verbatim; a missing one uses legacy first-fit.
 * Neither path writes or compacts another breakpoint. viewportCols distinguishes
 * widget resize bounds from the actual viewport for implicit keyboard movement.
 */
export function buildSpatialLayout(
  layout: Layout, metas: readonly SpatialMeta[], cols: number,
): SpatialItem[] {
  cols = columns(cols)
  const byId = new Map<string, SpatialMeta>()
  for (const meta of metas) if (!byId.has(meta.id)) byId.set(meta.id, meta)
  const hidden = new Set(layout.hidden)
  const available = [...byId.keys()]
  const order = (layout.instanceLayout
    ? [...new Set([...layout.order, ...available])].filter(id => byId.has(id))
    : homeOrder(layout, available)).filter(id => !hidden.has(id))
  const saved = savedBreakpointFor(layout, cols)
  const occupied: SpatialItem[] = []
  const items = new Map<string, SpatialItem>()
  const itemFrom = (id: string, rect: GridRect): SpatialItem => {
    const meta = byId.get(id)!
    // Resize is disabled; bounds must include grandfathered rectangles so RGL
    // cannot silently clamp a saved custom size during an ordinary move.
    const options = meta.sizing ? projectedWidgetPresets(meta.sizing, cols) : null
    const minW = options ? Math.min(rect.w, ...options.map(item => item.w)) : Math.min(meta.minWidth ?? 3, cols)
    const maxW = options ? Math.max(rect.w, ...options.map(item => item.w)) : Math.min(meta.maxWidth ?? cols, cols)
    return {
      i: id, x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      minW, minH: options ? Math.min(rect.h, ...options.map(item => item.h)) : meta.minHeight ?? SPATIAL_MIN_H,
      maxW, viewportCols: cols,
      ...(options ? { maxH: Math.max(rect.h, ...options.map(item => item.h)) } : meta.maxHeight === undefined ? {} : { maxH: meta.maxHeight }),
    }
  }

  for (const id of order) {
    const rect = Object.hasOwn(saved, id) ? saved[id] : undefined
    if (isRect(rect, cols) && canPlace(occupied, id, rect, cols)) {
      const item = itemFrom(id, rect)
      occupied.push(item)
      items.set(id, item)
    }
  }
  for (const id of order) {
    if (items.has(id)) continue
    const override = Object.hasOwn(layout.size, id) ? layout.size[id] : undefined
    const size = override === 's' || override === 'm' || override === 'l'
      ? override : byId.get(id)!.defaultSize
    const raw = Object.hasOwn(saved, id) && record(saved[id]) ? saved[id] : {}
    const meta = byId.get(id)!
    const minW = Math.min(meta.minWidth ?? 3, cols)
    const maxW = Math.min(meta.maxWidth ?? cols, cols)
    const minH = meta.minHeight ?? SPATIAL_MIN_H
    const maxH = meta.maxHeight ?? SPATIAL_MAX_H
    const preset = meta.sizing ? presetGeometry(meta.sizing.default, cols) : null
    const shape = {
      x: 0, y: 0,
      // Existing legacy width choices are grandfathered too. New library drafts
      // use emptyLayout(), so only genuinely new instances take the host default.
      w: preset ? (override === 's' || override === 'm' || override === 'l' ? widthFromSize(override, cols) : meta.legacyProjection ? widthFromSize(meta.legacyProjection.size, cols) : preset.w)
        : bounded(raw.w, Math.max(minW, Math.min(maxW, widthFromSize(size, cols))), minW, maxW),
      h: preset ? meta.legacyProjection?.height ?? preset.h : bounded(raw.h, meta.defaultHeight ?? legacySpatialHeight(id), minH, maxH),
    }
    const rect = findSpatialSpace(occupied, shape, cols)
    // Finite grid capacity is intentionally bounded; never emit an overlap.
    if (rect === null) continue
    const item = itemFrom(id, rect)
    occupied.push(item)
    items.set(id, item)
  }
  return order.flatMap(id => {
    const item = items.get(id)
    return item ? [item] : []
  })
}

/**
 * Move just one card by integral grid deltas. Blocked/invalid/missing/no-op moves
 * return the original array (identity is a useful no-change signal). Success
 * returns a new array with only the moved card copied. Pass cols for hand-built
 * geometry; buildSpatialLayout carries it in viewportCols or the default maxW.
 */
export function moveSpatialItem<T extends SpatialItem>(
  geometry: T[], id: string, dx: number, dy: number, cols?: number,
): T[]
export function moveSpatialItem<T extends SpatialItem>(
  geometry: readonly T[], id: string, dx: number, dy: number, cols?: number,
): readonly T[]
export function moveSpatialItem<T extends SpatialItem>(
  geometry: readonly T[], id: string, dx: number, dy: number, cols?: number,
): readonly T[] {
  const item = geometry.find(entry => entry.i === id)
  if (!item || !Number.isInteger(dx) || !Number.isInteger(dy) || (dx === 0 && dy === 0)) return geometry
  const count = columns(cols ?? item.viewportCols ?? item.maxW ?? 12)
  const moved = { ...item, x: item.x + dx, y: item.y + dy }
  if (!canPlace(geometry, id, moved, count)) return geometry
  return geometry.map(entry => entry === item ? moved : entry)
}

/** Explicit size choice: keep x/y and every peer; no solver or automatic reflow. */
export function applyWidgetPreset(
  geometry: readonly SpatialItem[], id: string, sizing: Readonly<WidgetSizing>, preset: import('./widget-contract.ts').WidgetPreset, cols: number,
): readonly SpatialItem[] {
  const declared = sizing.supported.find(item => sameWidgetPreset(item, preset))
  if (!declared) throw new Error('Unsupported widget size')
  const option = { preset: declared, ...presetGeometry(declared, cols) }
  const target = geometry.find(item => item.i === id)
  if (!target || !option) throw new Error('Unknown widget or preset')
  const next = { ...target, w: option.w, h: option.h }
  if (!canPlace(geometry, id, next, cols)) throw new Error('Widget preset is blocked')
  if (target.w === next.w && target.h === next.h) return geometry
  return geometry.map(item => item === target ? next : item)
}

/**
 * Merge visible geometry into only the current breakpoint. Never replace the
 * whole positions map: hidden cards, absent external plugins and every other
 * breakpoint keep their saved data. Invalid proposals are ignored; callers
 * should validate resize proposals with canPlace before merging.
 */
export function mergeSpatialPositions(
  layout: Layout, geometry: readonly SpatialItem[], cols: number,
): Layout {
  cols = columns(cols)
  const key = String(cols)
  const current = layout.positions?.[key]
  const next: Record<string, GridRect> = record(current) ? { ...current } : {}
  const hidden = new Set(layout.hidden)
  for (const item of geometry) {
    if (!hidden.has(item.i) && isRect(item, cols)) {
      Object.defineProperty(next, item.i, {
        value: { x: item.x, y: item.y, w: item.w, h: item.h },
        enumerable: true, configurable: true, writable: true,
      })
    }
  }
  return { ...layout, positions: { ...layout.positions, [key]: next } }
}
