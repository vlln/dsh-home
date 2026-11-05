/** Searchable visual type library. Rendering the gallery never mounts a widget's live Content. */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardBoundary } from './boundary.tsx'
import type { Translate } from './format.ts'
import type { RegisteredWidgetDefinition } from './widget-contract.ts'
import { filterWidgetDefinitions, galleryText, type GallerySource } from './gallery-model.ts'
function PreviewFallback({ definition }: { definition: RegisteredWidgetDefinition }) {
  const Icon = definition.icon
  return <div className="dsh-preview-fallback">{Icon ? <Icon size={36} /> : <span aria-hidden="true">▦</span>}<strong>{galleryText(definition.title, definition.typeId)}</strong></div>
}
export function WidgetGallery({ definitions, t, disabled, onAdd }: {
  definitions: readonly RegisteredWidgetDefinition[]; t: Translate; disabled: boolean
  onAdd: (definition: RegisteredWidgetDefinition) => void
}): ReactNode {
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<GallerySource>('all')
  const filtered = filterWidgetDefinitions(definitions, search, source)
  return <div className="dsh-gallery">
    <div className="dsh-gallery-toolbar">
      <Input className="dsh-gallery-search" type="search" aria-label={t('gallery.search')} placeholder={t('gallery.search')} value={search} onChange={event => setSearch(event.target.value)} />
      <div className="dsh-gallery-filters" role="group" aria-label={t('gallery.filter')}>
        {(['all', 'builtin', 'extension'] as const).map(value => <Button key={value} size="sm" variant={source === value ? 'outline' : 'ghost'} aria-pressed={source === value} onClick={() => setSource(value)}>{t(`gallery.${value}`)}</Button>)}
      </div>
      <span className="dsh-muted" role="status">{t('gallery.count', { shown: filtered.length, total: definitions.length })}</span>
    </div>
    <div className="dsh-widget-directory">{filtered.map(definition => {
      const Preview = definition.Preview
      const title = galleryText(definition.title, definition.typeId)
      return <article className="dsh-directory-item" key={definition.typeId} data-widget-type={definition.typeId}>
        <div className="dsh-directory-preview" inert aria-hidden="true"><CardBoundary key={definition.typeId} fallback={<PreviewFallback definition={definition} />}>{Preview ? <Preview /> : <PreviewFallback definition={definition} />}</CardBoundary></div>
        <span className="dsh-gallery-sample">{t(Preview ? 'gallery.sample' : 'gallery.noPreview')}</span>
        <div className="dsh-gallery-card-footer"><div className="dsh-manager-info"><strong>{title}</strong><span className="dsh-manager-description">{galleryText(definition.description, t('gallery.defaultDescription'))}</span></div>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onAdd(definition)}>{t('manager.add')}</Button></div>
        <span className="dsh-gallery-source" title={definition.source ?? definition.typeId}>{definition.source ?? definition.typeId.split(':')[0]}</span>
      </article>
    })}</div>
    {filtered.length === 0 && <div className="dsh-gallery-empty" role="status"><strong>{t('gallery.noMatch')}</strong><span>{t('gallery.trySearch')}</span><Button variant="outline" size="sm" onClick={() => { setSearch(''); setSource('all') }}>{t('gallery.clear')}</Button></div>}
  </div>
}
