/** Pure unified home layout projection; usable with Node's type stripping. */
import type { Layout } from './api.ts'

/** Compatibility-only defaults for pre-instance state; new types supply geometry metadata. */
export function legacySpatialHeight(id: string): number {
  return id === 'tasks' ? 8 : id === 'recent' ? 7 : 4
}

const PRIMARY_IDS = new Set(['recent', 'tasks'])
const FOCUS_IDS = ['resume', 'queue', 'today']
const FOCUS_SET = new Set(FOCUS_IDS)

/** Keep the first occurrence of currently registered ids, then append missing defaults. */
function completeOrder(order: string[], fallback: string[]): string[] {
  const known = new Set(fallback)
  return [...new Set([...order, ...fallback].filter(id => known.has(id)))]
}

/**
 * Project persisted overrides onto all currently available home cards (fallback).
 *
 * An order containing resume or queue is already unified: keep its known ids,
 * appending missing fallback ids. Otherwise migrate the legacy split layout:
 * recent/tasks first (their old grid-relative order), then focusOrder completed
 * with resume/queue/today, then the remaining grid cards and newly registered ids.
 * Every result id occurs once and belongs to fallback. Hidden cards stay in this
 * full order so hiding does not move them. Neither argument nor any persisted
 * field (including hidden, size and focusOrder) is modified or written back.
 */
export function homeOrder(layout: Layout, fallback: string[]): string[] {
  const grid = completeOrder(layout.order, fallback)
  if (layout.order.includes('resume') || layout.order.includes('queue')) return grid

  const known = new Set(fallback)
  const focus = completeOrder(layout.focusOrder ?? [], FOCUS_IDS).filter(id => known.has(id))
  return [
    ...grid.filter(id => PRIMARY_IDS.has(id)),
    ...focus,
    ...grid.filter(id => !PRIMARY_IDS.has(id) && !FOCUS_SET.has(id)),
  ]
}

/** The same complete/migrated order with layout.hidden removed, without mutation. */
export function visibleHomeOrder(layout: Layout, fallback: string[]): string[] {
  const hidden = new Set(layout.hidden)
  return homeOrder(layout, fallback).filter(id => !hidden.has(id))
}
