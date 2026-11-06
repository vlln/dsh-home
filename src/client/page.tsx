/** Registry-driven widget instances. The page owns layout, not widget business logic. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Button, IconTrashOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { formatAgo, formatDay, type Translate } from './format.ts'
import type { WidgetActions } from './widgets.tsx'
import type { SessionStatusMap } from './focus.tsx'
import { CardBoundary } from './boundary.tsx'
import { SpatialGrid } from './spatial-grid.tsx'
import { buildSpatialLayout, moveSpatialItem, sizeFromRect, SPATIAL_GAP, SPATIAL_ROW_HEIGHT, type SpatialItem } from './spatial-model.ts'
import type { HomeStore } from './store.ts'
import type { HomeWidgets, RegisteredWidgetDefinition, WidgetContentProps, WidgetInstance } from './widget-contract.ts'
import { widgetText } from './widget-settings.tsx'
import { validateWidgetConfig } from './widget-registry.ts'
import { WidgetGallery } from './widget-gallery.tsx'
import { WidgetPreview } from './widget-preview.tsx'
import { WidgetFrameHeader } from './widget-frame.tsx'
import { libraryItem, type LibraryDrag } from './library-drag-model.ts'
import { legacyInstanceProjection } from './widget-sizing.ts'
import { CanvasWidthHandle } from './canvas-grip.tsx'
import { boardColumnsFor, boardWidthForColumns, resolveCanvasWidth, widgetWidthForColumns } from './canvas-width.ts'
import { scatterDebris } from './debris-burst.ts'

export interface HomePageProps {
  t: Translate
  store: HomeStore
  registry: HomeWidgets
  actions: WidgetActions
  locale: () => string
  rescan?: () => void
  /** Consumed by the private builtin context wrapper, never by the generic page. */
  useSessionStatus?: (selector: (snapshot: SessionStatusMap) => unknown) => unknown
}

function WidgetBody({ definition, widgetProps }: { definition: RegisteredWidgetDefinition; widgetProps: WidgetContentProps }): ReactNode {
  const viewport = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const node = viewport.current
    if (node === null) return
    const measure = (): void => {
      const style = getComputedStyle(node)
      const width = Math.max(0, node.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight))
      const height = Math.max(0, node.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom))
      setDimensions(previous => previous.width === width && previous.height === height ? previous : { width, height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [widgetProps.instance.instanceId])
  // Validation/migration errors stay inside this instance's boundary, not the page render.
  if (widgetProps.instance.configVersion !== definition.configVersion) throw new Error('Widget config version unavailable')
  const config = validateWidgetConfig(definition, widgetProps.config)
  const Content = definition.Content
  return <div ref={viewport} className="dsh-widget-viewport">
    {dimensions.width > 0 && <Content {...widgetProps} {...dimensions} instance={{ ...widgetProps.instance, config }} config={config} />}
  </div>
}
function WidgetIcon({ definition }: { definition: RegisteredWidgetDefinition }): ReactNode {
  const Icon = definition.icon
  return Icon === undefined ? null : <Icon size={14} />
}
function boundaryKey(instance: WidgetInstance, definition: RegisteredWidgetDefinition | undefined): string {
  return `${instance.instanceId}:${instance.typeId}:${instance.configVersion}:${definition?.configVersion ?? 'missing'}:${JSON.stringify(instance.config)}`
}
function contentProps(instance: WidgetInstance, rect: SpatialItem | undefined, boardWidth: number, cols: number, editing: boolean, visible: boolean): WidgetContentProps {
  return {
    instance, config: instance.config, size: rect === undefined ? 'm' : sizeFromRect(rect, cols),
    // Fixed pixel width: a card's width depends only on its column span, never on the
    // window or the board width.
    width: rect === undefined ? boardWidth : widgetWidthForColumns(rect.w),
    height: rect === undefined ? 4 * SPATIAL_ROW_HEIGHT + 3 * SPATIAL_GAP : rect.h * SPATIAL_ROW_HEIGHT + (rect.h - 1) * SPATIAL_GAP,
    editing, visible,
  }
}

export function HomePage(props: HomePageProps): ReactNode {
  const { t, store, registry, actions, locale } = props
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const definitions = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
  const [editing, setEditing] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [libraryDrag, setLibraryDrag] = useState<LibraryDrag | null>(null)
  /** Cards already dropped on the delete target: hidden immediately, persisted after. */
  const [deleting, setDeleting] = useState<ReadonlySet<string>>(() => new Set())
  const [sinceCount, setSinceCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [managementError, setManagementError] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const seenRef = useRef(false)
  const writable = state.workbenchLoaded && state.storage.writable
  const busy = saving || state.workbenchBusy
  const editable = editing && writable && !busy
  useEffect(() => { void store.refresh() }, [store])
  useEffect(() => {
    if (seenRef.current || state.ledger === null || !state.prefsLoaded || !writable) return
    const previous = state.prefs.lastSeenAt
    if (previous !== null) setSinceCount(state.ledger.sessions.filter(session => (
      session.parentSessionId === undefined && session.turns > 0 && session.lastAt > previous
    )).length)
    seenRef.current = true
    store.markSeen()
  }, [state.ledger, state.prefs.lastSeenAt, state.prefsLoaded, writable, store])
  // Re-registering the same type/version must recover a previous render error too.
  const definitionIds = useRef(new WeakMap<RegisteredWidgetDefinition, number>())
  const nextDefinitionId = useRef(0)
  for (const definition of definitions) if (!definitionIds.current.has(definition)) definitionIds.current.set(definition, ++nextDefinitionId.current)
  const renderKey = (instance: WidgetInstance, definition: RegisteredWidgetDefinition | undefined): string => `${boundaryKey(instance, definition)}:${definition === undefined ? 0 : definitionIds.current.get(definition)}`
  const byType = useMemo(() => new Map(definitions.map(definition => [definition.typeId, definition])), [definitions])
  const metas = useMemo(() => state.instances.map(instance => {
    const defaults = byType.get(instance.typeId)?.defaults
    return {
      id: instance.instanceId, sizing: byType.get(instance.typeId)?.sizing,
      legacyProjection: legacyInstanceProjection(instance.typeId, instance.instanceId, state.layout, byType.get(instance.typeId)), defaultSize: defaults?.size ?? 'm' as const,
      defaultHeight: defaults?.height ?? 4,
      ...(defaults === undefined ? {} : { minWidth: defaults.minWidth, maxWidth: defaults.maxWidth, minHeight: defaults.minHeight, maxHeight: defaults.maxHeight }),
    }
  }), [state.instances, state.layout, byType])
  // The board's column count comes from the user's width preference, never from the
  // window: a narrow window scrolls horizontally instead of re-projecting the layout.
  const canvasWidth = resolveCanvasWidth(state.prefs.canvasWidth)
  const cols = boardColumnsFor(canvasWidth)
  const boardWidth = boardWidthForColumns(cols)
  useEffect(() => { setLibraryDrag(null) }, [cols])
  useEffect(() => { if(!editing || !writable || busy) setLibraryDrag(null) },[editing,writable,busy])
  const geometry = useMemo(() => state.workbenchLoaded
    ? buildSpatialLayout(state.layout, metas, cols).filter(item => !deleting.has(item.i))
    : [], [state.workbenchLoaded, state.layout, metas, cols, deleting])
  const instancesById = useMemo(() => new Map(state.instances.map(instance => [instance.instanceId, instance])), [state.instances])
  const activeChanged = useCallback((value: boolean) => { setInteracting(value) }, [])
  const commit = useCallback((value: typeof geometry) => {
    if (editable) store.setSpatialLayout(value, cols)
  }, [editable, store, cols])
  const finish = useCallback(async () => {
    if (interacting || busy || !writable) return
    setSaving(true)
    setSaveError(false)
    try {
      store.setSpatialLayout(geometry, cols)
      await store.flushLayout()
      setEditing(false)
      setTrayOpen(false)
    } catch { setSaveError(true) }
    finally { setSaving(false) }
  }, [geometry, cols, interacting, busy, writable, store])
  useEffect(() => {
    const keydown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.key !== 'Escape' || interacting || busy) return
      if (trayOpen) { event.preventDefault(); setTrayOpen(false); return }
      if (editing) { event.preventDefault(); void finish() }
    }
    window.addEventListener('keydown', keydown)
    return () => { window.removeEventListener('keydown', keydown) }
  }, [editing, finish, busy, trayOpen, interacting])
  const nudge = (id: string, key: string): void => {
    if (!editable || interacting) return
    const dx = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
    const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0
    const next = moveSpatialItem(geometry, id, dx, dy, cols)
    if (next !== geometry) commit(next)
  }
  const manage = (change: () => void): void => {
    if (!editable || interacting) return
    setManagementError(false)
    try { change() } catch { setManagementError(true) }
  }
  // One board width the user may drag in edit mode. It is a preference, not widget geometry:
  // saved rectangles and breakpoints are untouched, and the grid is sized from `cols`.
  const homeRef = useRef<HTMLDivElement>(null)
  // Deletion is a gesture: drag a card onto this viewport-anchored target. The target
  // only exists during a card drag, so it can never be mistaken for a button.
  const deleteZoneRef = useRef<HTMLDivElement | null>(null)
  /**
   * Deletion is immediate: the card is hidden in the same frame (so the drag's restore
   * pass never flashes it back), shattered where the user let go, then persisted.
   */
  const requestDelete = useCallback((instanceId: string, source?: HTMLElement | null) => {
    if (!editable) return
    setManagementError(false)
    const node = source ?? document.querySelector<HTMLElement>(`.dsh-home-widget[data-widget-id="${CSS.escape(instanceId)}"]`)
    if (node !== null) scatterDebris(node)
    setDeleting(previous => { const next = new Set(previous); next.add(instanceId); return next })
    store.removeInstanceDurably(instanceId).catch(() => {
      setManagementError(true)
      setDeleting(previous => { const next = new Set(previous); next.delete(instanceId); return next })
    })
  }, [editable, store])
  // Written imperatively rather than through the style prop: the handle owns this variable
  // during a gesture, so React must not restore a stale value mid-drag.
  useLayoutEffect(() => {
    homeRef.current?.style.setProperty('--dsh-home-board-width', `${boardWidth}px`)
  }, [boardWidth])
  const gripVisible = editable && !interacting
  const commitCanvasWidth = (next: number): void => { store.setCanvasWidth(next) }
  return (
    <div ref={homeRef} className="dsh-home" data-editing={editing ? 'true' : 'false'}>
      <div className="dsh-home-inner">
        <header className="dsh-home-head">
          <div>
            <div className="dsh-home-title-row">
              <h1 className="dsh-home-title">{t('panel.title')}</h1>
              {!editing && <Button variant="ghost" size="sm" aria-label={t('action.refresh')} onClick={() => { void store.refresh() }}>↻</Button>}
              <span className="dsh-home-updated">{editing ? t('edit.mode') : state.lastLoadedAt === null ? t('summary.scanning') : t('summary.updated', { time: formatAgo(state.lastLoadedAt, state.now, t) })}</span>
            </div>
            <div className="dsh-home-sub">
              <span>{formatDay(state.now, locale())}</span>
              {!editing && sinceCount !== null && sinceCount > 0 && <span>{t('panel.since', { count: sinceCount })}</span>}
            </div>
          </div>
          <div className="dsh-home-actions" role="group" aria-label={t('aria.actions')}>
            <Button variant={editing ? 'primary' : 'outline'} size="sm" disabled={!writable || busy || interacting} aria-pressed={editing}
              onClick={() => { if (editing) void finish(); else { setEditing(true); setSaveError(false) } }}>
              {t(saving ? 'edit.saving' : editing ? 'action.done' : 'action.edit')}
            </Button>
            {!editing && <>
              <Button variant="primary" size="sm" onClick={() => { actions.startSession() }}>{t('action.newSession')}</Button>
              <Button variant="ghost" size="sm" onClick={() => { actions.leave() }}>{t('action.back')}</Button>
            </>}
          </div>
        </header>
        {editable && interacting && libraryDrag === null && <div ref={deleteZoneRef} className="dsh-home-delete-zone" aria-hidden="true">
          <IconTrashOutlineRegular size={16}/>
          <span className="dsh-home-delete-zone-idle">{t('edit.deleteZone')}</span>
          <span className="dsh-home-delete-zone-armed">{t('edit.deleteZoneArmed')}</span>
        </div>}
        {!state.workbenchLoaded && <p className="dsh-workbench-notice" role="status">{t('workbench.loading')}</p>}
        {state.workbenchLoaded && !state.storage.writable && <div className="dsh-workbench-notice" role="alert">{t('workbench.readOnly')}{state.storage.error !== null && <span>{state.storage.error.message}</span>}</div>}
        {state.storage.status === 'write-error' && <div className="dsh-error" role="alert">{t('workbench.writeError')}</div>}
        {editing && <div className="dsh-edit-bar" inert={!editable || interacting || undefined} role="region" aria-label={t('edit.mode')}>
          <span className="dsh-edit-hint">{t('edit.hint')}</span>
          <div className="dsh-edit-actions">
            <Button variant="outline" size="sm" aria-expanded={trayOpen} onClick={() => { setTrayOpen(!trayOpen) }}>{t('action.widgets')}</Button>
            <Button variant="ghost" size="sm" disabled={libraryDrag !== null || geometry.length === 0} title={t('action.compactHint')} onClick={() => manage(() => { store.compactSpatialLayout(geometry, cols) })}>{t('action.compact')}</Button>
          </div>
        </div>}
        {saveError && <div className="dsh-error" role="alert">{t('edit.saveError')}</div>}
        {managementError && <div className="dsh-error" role="alert">{t('manager.error')}</div>}
        {state.error !== null && <div className="dsh-error" role="alert">
          <span>{t('error.load')}</span><Button variant="ghost" size="sm" onClick={() => { void store.refresh() }}>{t('error.retry')}</Button>
        </div>}
        {editing && trayOpen && <WidgetGallery definitions={definitions} t={t} disabled={!writable || busy || interacting}
          position={state.prefs.libraryPosition} onPositionChange={position => { store.setLibraryPosition(position) }}
          onClose={() => setTrayOpen(false)} onDrag={(definition,point,grab) => {
            if(!editable || interacting)return
            try {
              const id=crypto.randomUUID(),item=libraryItem(definition,id,cols,geometry)
              setLibraryDrag({id,definition,item,start:{x:point.x,y:point.y},grab:{x:grab.x*widgetWidthForColumns(item.w),y:grab.y},touch:point.touch,pointerId:point.pointerId,baseLayout:JSON.stringify(state.layout)})
            } catch {setManagementError(true)}
          }} />}
        <div className="dsh-spatial-container" data-layout-surface="spatial" data-cols={cols}>
          {state.workbenchLoaded && <SpatialGrid width={boardWidth} cols={cols} layout={geometry} editing={editable} onCommit={commit} onActive={activeChanged}
            deleteZone={deleteZoneRef} onDeleteRequest={requestDelete}
            libraryDrag={libraryDrag} onLibraryEnd={() => setLibraryDrag(null)}
            onLibraryDrop={(drag,accepted) => {try {if(registry.get(drag.definition.typeId)!==drag.definition||JSON.stringify(store.getSnapshot().layout)!==drag.baseLayout)throw new Error('Widget or layout changed');store.dropInstance(drag.definition,drag.id,accepted,cols)}catch{setManagementError(true)}}}
            libraryGhost={libraryDrag && <><WidgetFrameHeader title={widgetText(libraryDrag.definition.title,libraryDrag.definition.typeId)} t={t} editing/>
              <CardBoundary fallback={<div className="dsh-empty">{t('error.card')}</div>}><WidgetPreview definition={libraryDrag.definition} t={t} size={libraryDrag.definition.defaults.size} width={Math.max(0,widgetWidthForColumns(libraryDrag.item.w)-32)} height={Math.max(0,libraryDrag.item.h*56-80)}/></CardBoundary></>}>
          {geometry.map(rect => {
            const instance = instancesById.get(rect.i)
            if (instance === undefined) return null
            const definition = byType.get(instance.typeId)
            const title = widgetText(definition?.title, instance.typeId)
            const widgetProps: WidgetContentProps = { ...contentProps(instance, rect, boardWidth, cols, editing, true),
              ...(!editing && writable && !busy && definition ? { saveConfig: async config => {
                if (registry.get(instance.typeId) !== definition) throw new Error('Widget provider changed')
                await store.saveInstanceConfig(instance.instanceId, definition, config)
              } } : {}),
            }
            return <section key={instance.instanceId} className="dsh-w dsh-home-widget" data-widget-id={instance.instanceId} data-widget-type={instance.typeId} data-size={widgetProps.size}
              data-editing={String(editing)} aria-label={t('aria.widget', { title })}>
              <WidgetFrameHeader title={title} t={t} editing={editing} disabled={!writable || busy || interacting} gripDisabled={!writable || busy}
                icon={definition?.icon !== undefined && <CardBoundary key={definitionIds.current.get(definition)} fallback={null}><WidgetIcon definition={definition}/></CardBoundary>}
                onKeyDelete={() => requestDelete(instance.instanceId)} onNudge={key => nudge(instance.instanceId,key)} />
              <div className="dsh-w-body dsh-home-widget-content" inert={editing || undefined}>
                {definition === undefined ? <div className="dsh-empty" role="status">{t('widget.unavailable', { typeId: instance.typeId })}</div>
                  : <CardBoundary key={renderKey(instance, definition)} fallback={<div className="dsh-error" role="alert">{t('error.card')}</div>}>
                    <WidgetBody definition={definition} widgetProps={widgetProps} />
                  </CardBoundary>}
              </div>
            </section>
          })}
          </SpatialGrid>}
        </div>
        {state.workbenchLoaded && geometry.length === 0 && <div className="dsh-empty"><span>{t('empty.noWidgets')}</span><Button variant="outline" size="sm" disabled={!writable || busy} onClick={() => { setEditing(true); setTrayOpen(true) }}>{t('action.widgets')}</Button></div>}
        {editing && <p className="dsh-muted dsh-edit-footnote">{t('edit.keyboard')}</p>}
        {gripVisible && (['left', 'right'] as const).map(side => <CanvasWidthHandle key={side} side={side}
          value={boardWidth} onCommit={commitCanvasWidth}
          label={t(side === 'left' ? 'canvas.widthLeft' : 'canvas.widthRight')} hint={t('canvas.widthHint')} />)}
      </div>
    </div>
  )
}
