/**
 * Previews are the real card, not an illustration.
 *
 * The gallery renders the registered `Content` in the same `.dsh-w-body` the board uses,
 * at the definition's own grid size in pixels, and only then scales it down to fit the
 * tray. Layout therefore sees exactly the width/height a real card would, so container
 * queries, row counts and charts cannot drift from the board.
 *
 * @module @vlln/dsh-home/client/widget-preview
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BuiltinPreviewProvider } from './builtin-registration.tsx'
import type { Translate } from './format.ts'
import { cardContentSize, cardSizeForShape } from './preview-geometry.ts'
import type { RegisteredWidgetDefinition, WidgetSize } from './widget-contract.ts'
import { createWidgetPreviewProps } from './widget-registry.ts'

/** Kept as a re-export so callers do not need to know the geometry module. */
export { cardContentSize } from './preview-geometry.ts'

/** The registered Content in an inert box. Used by the drag ghost, which draws its own shell. */
export function WidgetContentPreview({ definition, t, language = 'en', width, height, size }: {
  definition: RegisteredWidgetDefinition; t: Translate; language?: string
  width: number; height: number; size: WidgetSize
}) {
  // Geometry changes must not rerun a provider's config factory or reset stateful Content.
  const sample = useMemo(() => createWidgetPreviewProps(definition, {
    size: definition.defaults.size, width: 0, height: 0,
  }), [definition])
  const Content = definition.Content
  return <div inert aria-hidden="true" data-widget-content-preview={definition.typeId} style={{ width, height }}>
    <BuiltinPreviewProvider t={t} data={sample.preview!.data} language={language}>
      <Content {...sample} size={size} width={width} height={height} />
    </BuiltinPreviewProvider>
  </div>
}

/** The real body at its default card size, scaled to fit the tray column it is measured in.
 * The gallery draws the same `WidgetFrameHeader` the board uses, so the tile *is* a card:
 * header at 1×, body at the card's own width/height and then a visual scale. */
export function WidgetPreview({ definition, t, language = 'en' }: {
  definition: RegisteredWidgetDefinition; t: Translate; language?: string
}) {
  const { width: cardWidth, height: cardHeight } = cardSizeForShape(definition.sizing.default)
  const { width: contentWidth, height: contentHeight } = cardContentSize(definition.sizing.default.w, definition.sizing.default.h)
  const host = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const node = host.current
    if (node === null) return
    const measure = (): void => {
      const available = node.clientWidth
      if (available > 0) setScale(Math.min(1, available / contentWidth))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [contentWidth])
  // Same provider and same Content as the board; only the transform is preview-specific.
  const sample = useMemo(() => createWidgetPreviewProps(definition, {
    size: definition.defaults.size, width: 0, height: 0,
  }), [definition])
  const Content = definition.Content
  return <div ref={host} className="dsh-card-preview">
    <div className="dsh-card-preview-frame" style={{ width: contentWidth * scale, height: contentHeight * scale }}>
      <BuiltinPreviewProvider t={t} data={sample.preview!.data} language={language}>
        <div className="dsh-w-body dsh-home-widget-content dsh-card-preview-body" inert aria-hidden="true"
          data-widget-content-preview={definition.typeId}
          style={{ width: contentWidth, height: contentHeight, transform: scale === 1 ? undefined : `scale(${scale})` }}>
          <Content {...sample} size={definition.defaults.size} width={cardWidth} height={cardHeight} />
        </div>
      </BuiltinPreviewProvider>
    </div>
  </div>
}
