/** Registry-driven widget instances. The page owns layout, not widget business logic. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { IconTrashOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { Button, CardError, IconButton } from './ui/index.ts'
import type { Translate } from './format.ts'
import type { WidgetActions } from './widgets.tsx'
import type { SessionStatusMap } from './session-model.ts'
import { CardBoundary } from './boundary.tsx'
import { SpatialGrid } from './spatial-grid.tsx'
import { buildSpatialLayout, moveSpatialItem, sizeFromRect, SPATIAL_GAP, SPATIAL_ROW_HEIGHT, type SpatialItem } from './spatial-model.ts'
import type { HomeStore } from './store.ts'
import { homeData } from './home-data.ts'
import { BOARD_TITLE_MAX } from './api.ts'
import type { HomeWidgets, RegisteredWidgetDefinition, WidgetContentProps, WidgetInstance } from './widget-contract.ts'
import { widgetText } from './widget-settings.tsx'
import { validateWidgetConfig } from './widget-registry.ts'
import { WidgetGallery } from './widget-gallery.tsx'
import { cardContentSize, WidgetContentPreview } from './widget-preview.tsx'
import { WidgetCardBody, WidgetCardShell } from './widget-card-shell.tsx'
import { WidgetFrameHeader } from './widget-frame.tsx'
import { libraryItem, type LibraryDrag } from './library-drag-model.ts'
import { legacyInstanceProjection } from './widget-sizing.ts'
import { CanvasWidthHandle } from './canvas-grip.tsx'
import { boardColumnsFor, boardWidthForColumns, resolveCanvasWidth, widgetWidthForColumns } from './canvas-width.ts'
import { scatterDebris } from './debris-burst.ts'

/** 已下线的旧组件类型：仍照常渲染已有实例，只是不再出现在组件库里。
 *  「今天」不在其中——它是一张在用的卡（24h 轨），不是被并掉的旧类型。 */
const RETIRED_FROM_LIBRARY = new Set(['@vlln/dsh-home:rhythm'])

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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [managementError, setManagementError] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const seenRef = useRef(false)
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const writable = state.workbenchLoaded && state.storage.writable
  const boardTitle = state.prefs.boardTitle ?? t('panel.title')
  /** Rename commits on blur or Enter; an empty draft means "use the default heading". */
  const commitTitle = (): void => {
    if (!renamingTitle) return
    setRenamingTitle(false)
    const next = titleDraft.trim().slice(0, BOARD_TITLE_MAX)
    store.setBoardTitle(next === '' ? null : next)
  }
  const busy = saving || state.workbenchBusy
  const editable = editing && writable && !busy
  useEffect(() => { void store.refresh() }, [store])
  // 计划与计时是页面级共享数据：挂载读一次，回到可见时补一次（不轮询）。
  useEffect(() => {
    homeData.load()
    const onVisible = (): void => { if (document.visibilityState === 'visible') homeData.load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      homeData.reset()
    }
  }, [])
  useEffect(() => {
    if (seenRef.current || state.ledger === null || !state.prefsLoaded || !writable) return
    seenRef.current = true
    store.markSeen()
  }, [state.ledger, state.prefsLoaded, writable, store])
  // Re-registering the same type/version must recover a previous render error too.
  const definitionIds = useRef(new WeakMap<RegisteredWidgetDefinition, number>())
  const nextDefinitionId = useRef(0)
  for (const definition of definitions) if (!definitionIds.current.has(definition)) definitionIds.current.set(definition, ++nextDefinitionId.current)
  const renderKey = (instance: WidgetInstance, definition: RegisteredWidgetDefinition | undefined): string => `${boundaryKey(instance, definition)}:${definition === undefined ? 0 : definitionIds.current.get(definition)}`
  const byType = useMemo(() => new Map(definitions.map(definition => [definition.typeId, definition])), [definitions])
  const metas = useMemo(() => state.instances.map(instance => {
    const defaults = byType.get(instance.typeId)?.defaults
    return {
      id: instance.instanceId, sizing: byType.get(instance.typeId)?.sizing, declaredSizing: byType.get(instance.typeId)?.declaredSizing,
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
  // The board width is the user's, so its handle is always there — not only in edit
  // mode. Editing is for arranging cards; sizing the canvas is not an edit.
  const gripVisible = writable && !busy && !interacting
  const commitCanvasWidth = (next: number): void => { store.setCanvasWidth(next) }
  return (
    <div ref={homeRef} className="dsh-home" data-editing={editing ? 'true' : 'false'}>
      <div className="dsh-home-inner">
        <header className="dsh-home-head">
          <div className="dsh-home-title-block">
            {renamingTitle
              ? <input className="dsh-home-title-input" value={titleDraft} maxLength={BOARD_TITLE_MAX} autoFocus
                aria-label={t('panel.rename')} placeholder={t('panel.title')}
                onBlur={commitTitle}
                onChange={event => setTitleDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') { event.preventDefault(); commitTitle() }
                  else if (event.key === 'Escape') { event.preventDefault(); setRenamingTitle(false) }
                }} />
              : <h1 className="dsh-home-title">
                {/* In edit mode the heading is the rename affordance: one click, no dialog. */}
                {editing
                  ? <button type="button" className="dsh-home-title-edit" title={t('panel.rename')}
                    onClick={() => { setTitleDraft(state.prefs.boardTitle ?? t('panel.title')); setRenamingTitle(true) }}>
                    {boardTitle}<span className="dsh-home-title-pencil" aria-hidden="true">✎</span>
                  </button>
                  : boardTitle}
              </h1>}
            {editing && <div className="dsh-home-title-tools" inert={!editable || interacting || undefined}>
              <Button variant="secondary" size="small" disabled={!writable || busy} aria-expanded={trayOpen} onClick={() => { setTrayOpen(!trayOpen) }}>{t('action.widgets')}</Button>
              <Button variant="secondary" size="small" disabled={libraryDrag !== null || geometry.length === 0} title={t('action.compactHint')} onClick={() => manage(() => { store.compactSpatialLayout(geometry, cols) })}>{t('action.compact')}</Button>
            </div>}
          </div>
          <div className="dsh-home-actions" role="group" aria-label={t('aria.actions')}>
            {!editing && <IconButton aria-label={t('action.refresh')} title={t('action.refresh')} onClick={() => { void store.refresh() }}>↻</IconButton>}
            <Button variant={editing ? 'primary' : 'secondary'} size="small" disabled={!writable || busy || interacting} aria-pressed={editing}
              onClick={() => { if (editing) void finish(); else { setEditing(true); setSaveError(false) } }}>
              {t(saving ? 'edit.saving' : editing ? 'action.done' : 'action.edit')}
            </Button>
            {!editing && <Button variant="secondary" size="small" onClick={() => { actions.leave() }}>{t('action.back')}</Button>}
          </div>
        </header>
        {editable && interacting && libraryDrag === null && <div ref={deleteZoneRef} className="dsh-home-delete-zone border-border-button-default bg-background-primary-default text-text-secondary shadow-dropdown" aria-hidden="true">
          <IconTrashOutlineRegular size={16}/>
          <span className="dsh-home-delete-zone-idle">{t('edit.deleteZone')}</span>
          <span className="dsh-home-delete-zone-armed">{t('edit.deleteZoneArmed')}</span>
        </div>}
        {!state.workbenchLoaded && <p className="dsh-workbench-notice" role="status">{t('workbench.loading')}</p>}
        {state.workbenchLoaded && !state.storage.writable && <div className="dsh-workbench-notice" role="alert">{t('workbench.readOnly')}{state.storage.error !== null && <span>{state.storage.error.message}</span>}</div>}
        {state.storage.status === 'write-error' && <div className="dsh-error" role="alert">{t('workbench.writeError')}</div>}
        {saveError && <div className="dsh-error" role="alert">{t('edit.saveError')}</div>}
        {managementError && <div className="dsh-error" role="alert">{t('manager.error')}</div>}
        {state.error !== null && <div className="dsh-error" role="alert">
          <span>{t('error.load')}</span><Button variant="ghost" size="small" onClick={() => { void store.refresh() }}>{t('error.retry')}</Button>
        </div>}
        {editing && trayOpen && <WidgetGallery definitions={definitions.filter(definition => !RETIRED_FROM_LIBRARY.has(definition.typeId))} t={t} language={locale()} disabled={!writable || busy || interacting}
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
            libraryGhost={libraryDrag && <WidgetCardShell size={sizeFromRect({ w: libraryDrag.item.w, h: libraryDrag.item.h } as SpatialItem, cols)} editing
              style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}><WidgetFrameHeader title={widgetText(libraryDrag.definition.title,libraryDrag.definition.typeId)} t={t} editing/>
              <WidgetCardBody><CardBoundary fallback={<div className="dsh-empty">{t('error.card')}</div>}><WidgetContentPreview definition={libraryDrag.definition} t={t} language={locale()}
                size={sizeFromRect({ w: libraryDrag.item.w, h: libraryDrag.item.h } as SpatialItem, cols)}
                {...cardContentSize(libraryDrag.item.w, libraryDrag.item.h)}/></CardBoundary></WidgetCardBody></WidgetCardShell>}>
          {geometry.map((rect, cardIndex) => {
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
            return <WidgetCardShell key={instance.instanceId} className="dsh-enter" size={widgetProps.size} editing={editing}
              style={{ '--dsh-enter-index': cardIndex } as React.CSSProperties}
              data-widget-id={instance.instanceId} data-widget-type={instance.typeId} aria-label={t('aria.widget', { title })}>
              <WidgetFrameHeader title={title} t={t} editing={editing} disabled={!writable || busy || interacting} gripDisabled={!writable || busy}
                icon={definition?.icon !== undefined && <CardBoundary key={definitionIds.current.get(definition)} fallback={null}><WidgetIcon definition={definition}/></CardBoundary>}
                onKeyDelete={() => requestDelete(instance.instanceId)} onNudge={key => nudge(instance.instanceId,key)} />
              <WidgetCardBody editing={editing}>
                {definition === undefined ? <div className="dsh-empty" role="status">{t('widget.unavailable', { typeId: instance.typeId })}</div>
                  : <CardBoundary key={renderKey(instance, definition)} fallback={<CardError title={t('error.card')} />}>
                    <WidgetBody definition={definition} widgetProps={widgetProps} />
                  </CardBoundary>}
              </WidgetCardBody>
            </WidgetCardShell>
          })}
          </SpatialGrid>}
        </div>
        {state.workbenchLoaded && geometry.length === 0 && <div className="dsh-empty"><span>{t('empty.noWidgets')}</span><Button variant="secondary" size="small" disabled={!writable || busy} onClick={() => { setEditing(true); setTrayOpen(true) }}>{t('action.widgets')}</Button></div>}
        {editing && <p className="dsh-muted dsh-edit-footnote">{t('edit.keyboard')}</p>}
        {gripVisible && (['left', 'right'] as const).map(side => <CanvasWidthHandle key={side} side={side}
          value={boardWidth} onCommit={commitCanvasWidth}
          label={t(side === 'left' ? 'canvas.widthLeft' : 'canvas.widthRight')} hint={t('canvas.widthHint')} />)}
      </div>
    </div>
  )
}
