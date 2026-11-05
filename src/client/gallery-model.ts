/** Gallery search is metadata-only: never instantiate Content or config factories while browsing. */
import type { RegisteredWidgetDefinition, WidgetTitle } from './widget-contract.ts'
export type GallerySource = 'all' | 'builtin' | 'extension'
export function galleryText(value: WidgetTitle | undefined, fallback = ''): string {
  try {
    const text: unknown = typeof value === 'function' ? value() : value
    if (text instanceof Promise) { void text.catch(() => {}); return fallback }
    return typeof text === 'string' && text.trim() ? text : fallback
  }
  catch { return fallback }
}
export function isBuiltinDefinition(definition: Pick<RegisteredWidgetDefinition, 'typeId'>): boolean {
  return definition.typeId.startsWith('@vlln/dsh-home:')
}
export function filterWidgetDefinitions(definitions: readonly RegisteredWidgetDefinition[], search: string, source: GallerySource) {
  const words = search.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean)
  return definitions.filter(definition => {
    const builtin = isBuiltinDefinition(definition)
    if (source === 'builtin' && !builtin || source === 'extension' && builtin) return false
    const haystack = [galleryText(definition.title), galleryText(definition.description), definition.source ?? '', definition.typeId].join(' ').toLocaleLowerCase()
    return words.every(word => haystack.includes(word))
  })
}
