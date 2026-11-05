/** The gallery renders the registered Content, never an independent illustration or live instance. */
import { useMemo } from 'react'
import { BuiltinPreviewProvider } from './builtin-registration.tsx'
import type { Translate } from './format.ts'
import type { RegisteredWidgetDefinition, WidgetSize } from './widget-contract.ts'
import { createWidgetPreviewProps } from './widget-registry.ts'

export function WidgetPreview({ definition, t, size, width, height }: {
  definition: RegisteredWidgetDefinition; t: Translate; size: WidgetSize; width: number; height: number
}) {
  // Geometry changes must not rerun a provider's config factory or reset stateful Content.
  const sample = useMemo(() => createWidgetPreviewProps(definition, {
    size: definition.defaults.size, width: 0, height: 0,
  }), [definition])
  const Content = definition.Content
  return <BuiltinPreviewProvider t={t} data={sample.preview!.data}>
    <div inert aria-hidden="true" data-widget-content-preview={definition.typeId} style={{ width, height, pointerEvents: 'none' }}>
      <Content {...sample} size={size} width={width} height={height} />
    </div>
  </BuiltinPreviewProvider>
}
