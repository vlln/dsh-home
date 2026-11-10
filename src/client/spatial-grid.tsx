/** RGL supplies pixel dragging/resize; a snapshot-based compactor previews local displacement. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { observeDragRelease } from './drag-release.ts'
import type { ReactNode, RefObject } from 'react'
import { insideDropZone } from './drop-zone.ts'
import { createPortal } from 'react-dom'
import type { LibraryDrag } from './library-drag-model.ts'
import { libraryPointerInside } from './library-drag-model.ts'
import { widgetWidthForColumns } from './canvas-width.ts'
import { SPATIAL_GAP, SPATIAL_ROW_HEIGHT } from './spatial-model.ts'
import GridLayout, { setTransform, type Layout as EngineLayout, type LayoutItem, type Position } from 'react-grid-layout'
import { snapCandidate } from './collision-preview.ts'
import { multiPreviewPlacement, placementAxis } from './multi-preview.ts'
import type { GridRect } from './api.ts'
import { canPlace, type SpatialItem } from './spatial-model.ts'
import { advanceHover, type HoverIntent } from './hover-intent.ts'
import { pinDraggedItem, placementAccepted } from './drag-visual.ts'
import { canvasContentHeight, clampCanvasLeft, clampCanvasScroll, EDIT_CANVAS_MIN_HEIGHT, extendCanvasHeight } from './canvas-extent.ts'

export interface SpatialGridProps {
  width: number
  cols: number
  layout: SpatialItem[]
  editing: boolean
  onCommit: (layout: SpatialItem[]) => void
  onActive: (active: boolean) => void
  children: ReactNode
  libraryDrag?: LibraryDrag | null
  libraryGhost?: ReactNode
  onLibraryDrop?: (drag: LibraryDrag, layout: SpatialItem[]) => void
  onLibraryEnd?: () => void
  /** Viewport-anchored delete target; dropping a card inside it never moves it. */
  deleteZone?: RefObject<HTMLElement | null>
  /** The dragged card element is handed over so the page can shatter what the user saw. */
  onDeleteRequest?: (instanceId: string, node: HTMLElement | null) => void
}
interface Gesture {
  id: string
  kind: 'drag' | 'resize'
  snapshot: SpatialItem[]
  candidate: GridRect
  preview: SpatialItem[]
  node: HTMLElement | null
  grab?: { x: number; y: number }
  intent: HoverIntent | null
  pending: boolean
  direction: 'x' | 'y'
  rejected: boolean
}
const items = (value: EngineLayout, cols: number): SpatialItem[] => value.map(item => ({
  ...item, minW: item.minW ?? Math.min(3, cols), minH: item.minH ?? 3, maxW: Math.min(item.maxW ?? cols, cols),
}))
export function SpatialGrid({ width, cols, layout, editing, onCommit, onActive, children, libraryDrag, libraryGhost, onLibraryDrop, onLibraryEnd, deleteZone, onDeleteRequest }: SpatialGridProps): ReactNode {
  const [libraryVisual, setLibraryVisual] = useState<{x:number;y:number;w:number;h:number;inside:boolean} | null>(null)
  const [libraryOutline,setLibraryOutline]=useState<{x:number;y:number;w:number;h:number;pending:boolean}|null>(null)
  const libraryRef = useRef(libraryDrag)
  const zoneRef = useRef(deleteZone)
  zoneRef.current = deleteZone
  const deleteRequest = useRef(onDeleteRequest)
  deleteRequest.current = onDeleteRequest
  /** Visual armed state of the delete target while a card hovers it. */
  const armed = useRef(false)
  const latestLayout = useRef(layout)
  latestLayout.current = layout
  libraryRef.current = libraryDrag
  const libraryHandlers = useRef({ onLibraryDrop, onLibraryEnd })
  libraryHandlers.current = { onLibraryDrop, onLibraryEnd }
  const [epoch, setEpoch] = useState(0)
  const [current, setCurrent] = useState<EngineLayout>(layout)
  const [dragHeight, setDragHeight] = useState(0)
  const extent = useRef(0)
  const scrollOrigin = useRef<{ container: HTMLElement; top: number } | null>(null)
  const settleScroll = useRef<{ container: HTMLElement; top: number } | null>(null)
  const active = useRef(false)
  const original = useRef<EngineLayout>(layout)
  const cancelled = useRef(false)
  const gesture = useRef<Gesture | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number; touch: boolean } | null>(null)
  const lastTouch = useRef<TouchEvent | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshStationary = useRef<() => void>(() => {})
  const refreshLibrary = useRef<() => void>(() => {})
  const desktopRelease = useRef<(() => void) | null>(null)
  const desktopFinish = useRef<() => void>(() => {})
  const cancelGesture = useRef<() => void>(() => {})
  const updateLibraryTransaction = useRef<() => void>(() => {})
  const retainCanvas = (contentBottom = 0, pixelBottom = 0): void => {
    const grid = root.current
    if (!grid) return
    const container = grid.closest<HTMLElement>('.dsh-home')
    const viewport = container?.getBoundingClientRect()
    const next = extendCanvasHeight(extent.current, contentBottom, pixelBottom,
      viewport ? viewport.bottom - grid.getBoundingClientRect().top : 0, container?.clientHeight ?? 0)
    extent.current = next
    // rAF scroll and RGL callbacks can run before React commits. Supply the scroll
    // range synchronously, then mirror it in props so RGL cannot overwrite it.
    grid.style.minHeight = `${next}px`
    setDragHeight(next)
  }
  const beginCanvas = (): void => {
    const container = root.current?.closest<HTMLElement>('.dsh-home')
    scrollOrigin.current = container ? { container, top: container.scrollTop } : null
    settleScroll.current = null
    extent.current = root.current?.getBoundingClientRect().height ?? 0
    retainCanvas(extent.current)
  }
  const releaseCanvas = (restore: boolean, result: EngineLayout): void => {
    const container = scrollOrigin.current?.container ?? root.current?.closest<HTMLElement>('.dsh-home')
    settleScroll.current = container ? { container, top: restore ? scrollOrigin.current?.top ?? container.scrollTop : container.scrollTop } : null
    scrollOrigin.current = null
    extent.current = 0
    // Remove temporary runway only after retaining the committed content. Pending
    // and rejected drops instead restore the original geometry and starting view.
    if (root.current) root.current.style.minHeight = `${Math.max(EDIT_CANVAS_MIN_HEIGHT, canvasContentHeight(result))}px`
    setDragHeight(0)
  }
  useLayoutEffect(() => {
    const settled = settleScroll.current
    if (!settled || active.current) return
    settleScroll.current = null
    settled.container.scrollTop = clampCanvasScroll(settled.top, settled.container.scrollHeight, settled.container.clientHeight)
  })
  const clearHover = (): void => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    if (root.current) { delete root.current.dataset.hoverPending; delete root.current.dataset.dropRejected }
  }
  /** True while the live pointer sits on the page's delete target; a drop there aborts. */
  const overDeleteZone = (): boolean => {
    const zone = zoneRef.current?.current
    if (zone === null || zone === undefined || libraryRef.current) return false
    return insideDropZone(pointer.current, zone.getBoundingClientRect())
  }
  /** Mirror the pointer state onto the target so the affordance follows the gesture. */
  const armDeleteZone = (next: boolean): void => {
    armed.current = next
    const zone = zoneRef.current?.current
    if (zone === null || zone === undefined) return
    if (next) zone.dataset.armed = 'true'
    else delete zone.dataset.armed
  }
  useEffect(() => { if (!active.current) setCurrent(layout) }, [layout])
  useEffect(() => {
    clearHover()
    desktopRelease.current?.()
    active.current = false
    cancelled.current = true
    gesture.current = null
    pointer.current = null
    releaseCanvas(true, layout)
    setCurrent(layout)
    setDragHeight(0)
    document.body.classList.remove('dsh-home-dragging')
    onActive(false)
    return () => {
      clearHover()
      desktopRelease.current?.()
      active.current = false
      cancelled.current = true
      gesture.current = null
      document.body.classList.remove('dsh-home-dragging')
      onActive(false)
    }
    // A breakpoint change owns a new transaction; normal geometry updates sync above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, onActive])
  cancelGesture.current = () => {
    if (!active.current) return
    clearHover()
    armDeleteZone(false)
    desktopRelease.current?.()
    cancelled.current = true
    active.current = false
    gesture.current = null
    pointer.current = null
    releaseCanvas(true, original.current)
    setCurrent(original.current)
    setDragHeight(0)
    setEpoch(i => i + 1)
    setLibraryVisual(null)
    setLibraryOutline(null)
    document.body.classList.remove('dsh-home-dragging')
    onActive(false)
    if (libraryRef.current) libraryHandlers.current.onLibraryEnd?.()
  }
  useEffect(() => {
    const cancel = (event: Event): void => {
      if (!active.current || (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape')) return
      if (event.type === 'keydown') { event.preventDefault(); event.stopImmediatePropagation() }
      cancelGesture.current()
    }
    window.addEventListener('keydown', cancel, true)
    window.addEventListener('touchcancel', cancel, true)
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('keydown', cancel, true)
      window.removeEventListener('touchcancel', cancel, true)
      window.removeEventListener('blur', cancel)
      document.body.classList.remove('dsh-home-dragging')
    }
  }, [onActive])
  useEffect(() => {
    if (!editing) return
    let frame = 0
    const track = (event: MouseEvent | TouchEvent): void => {
      const touch = 'touches' in event ? event.touches[0] : undefined
      if ('touches' in event && touch === undefined) return
      pointer.current = { x: touch?.clientX ?? (event as MouseEvent).clientX, y: touch?.clientY ?? (event as MouseEvent).clientY, touch: touch !== undefined }
      if ('touches' in event) lastTouch.current = event
    }
    // The release point is authoritative: a fast drop can arrive without a final move.
    const release = (event: PointerEvent): void => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return
      pointer.current = { x: event.clientX, y: event.clientY, touch: event.pointerType !== 'mouse' }
    }
    const scroll = (): void => {
      const p = pointer.current
      armDeleteZone(active.current && gesture.current?.kind === 'drag' && !libraryRef.current && overDeleteZone())
      const container = root.current?.closest('.dsh-home') as HTMLElement | null
      if (active.current && gesture.current?.kind === 'drag' && p && !p.touch && container) {
        const bounds = container.getBoundingClientRect()
        const edge = 72
        let dy = 0
        if (p.y > bounds.bottom - edge) dy = Math.min(16, Math.ceil((p.y - bounds.bottom + edge) / 5))
        else if (p.y < bounds.top + edge + 80) dy = -Math.min(16, Math.ceil((bounds.top + edge + 80 - p.y) / 5))
        if (dy !== 0) {
          // Retain one viewport ahead *before* changing scrollTop; the old board
          // bottom is not a boundary and the surface never shrinks mid-gesture.
          if (dy > 0) retainCanvas()
          const before = container.scrollTop
          container.scrollTop += dy
          if (container.scrollTop !== before && !p.touch) {
            // react-draggable measures offsetParent.scrollTop on mousemove, even when the mouse is still.
            if (libraryRef.current) refreshLibrary.current()
            else document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, buttons: 1 }))
          }
        }
      }
      frame = requestAnimationFrame(scroll)
    }
    document.addEventListener('mousemove', track, true)
    document.addEventListener('touchmove', track, { capture: true, passive: true })
    document.addEventListener('pointerup', release, true)
    frame = requestAnimationFrame(scroll)
    return () => {
      document.removeEventListener('mousemove', track, true)
      document.removeEventListener('touchmove', track, true)
      document.removeEventListener('pointerup', release, true)
      cancelAnimationFrame(frame)
    }
  }, [editing])
  const start = (value: EngineLayout, item: LayoutItem | null, kind: 'drag' | 'resize', event: Event, node: HTMLElement | null): void => {
    if (!item) return
    const snapshot = items(value, cols)
    original.current = snapshot
    cancelled.current = false
    active.current = true
    const touch = 'touches' in event ? (event as TouchEvent).touches[0] : undefined
    const mouse = touch ?? event as MouseEvent
    const box = node?.getBoundingClientRect()
    clearHover()
    armDeleteZone(false)
    gesture.current = { id: item.i, kind, snapshot, candidate: { x: item.x, y: item.y, w: item.w, h: item.h }, preview: snapshot, intent: null, pending: false, direction: 'y', rejected: false, node,
      grab: box && Number.isFinite(mouse.clientX) ? { x: mouse.clientX - box.left, y: mouse.clientY - box.top } : undefined }
    if (Number.isFinite(mouse.clientX)) pointer.current = { x: mouse.clientX, y: mouse.clientY, touch: touch !== undefined }
    beginCanvas()
    document.body.classList.add('dsh-home-dragging')
    const session = gesture.current
    desktopRelease.current?.()
    desktopRelease.current = observeDragRelease({ window, document, documentElement: document.documentElement }, {
      transport: touch ? 'touch' : 'mouse',
      onRelease: () => {
        // RGL/react-draggable normally stops at document capture. Let it run first;
        // if a downstream listener swallowed release, settle our existing preview and
        // remount the engine to remove its document listeners and pixel-drag state.
        setTimeout(() => {
          if (active.current && gesture.current === session) desktopFinish.current()
        }, 0)
      },
      onCancel: () => cancelGesture.current(),
    })
    onActive(true)
  }
  const update = (_value: EngineLayout, _old: LayoutItem | null, item: LayoutItem | null, placeholder: LayoutItem | null, _event: Event, node: HTMLElement | null): void => {
    const session = gesture.current
    if (!session || !item || cancelled.current) return
    if (session.kind === 'drag') {
      const gridBox = root.current?.getBoundingClientRect()
      const box = node?.getBoundingClientRect()
      const p = pointer.current
      const raw = gridBox && p && session.grab
        ? { x: (p.x - session.grab.x - gridBox.left) / ((width + 12) / cols), y: (p.y - session.grab.y - gridBox.top) / 56 }
        : gridBox && box ? { x: (box.left - gridBox.left) / ((width + 12) / cols), y: (box.top - gridBox.top) / 56 }
        : { x: item.x, y: item.y }
      session.candidate = snapCandidate(raw, session.id, session.snapshot, cols, session.candidate)
    } else session.candidate = { x: item.x, y: item.y, w: item.w, h: item.h }
    clearHover()
    const grid = root.current?.getBoundingClientRect()
    const p = pointer.current
    const aim = grid && p ? { x: (p.x - grid.left) / ((width + 12) / cols), y: (p.y - grid.top) / 56 } : undefined
    const direction = session.kind === 'drag' ? placementAxis(session.snapshot, session.id, session.candidate, aim) : 'y'
    if (direction !== session.direction) session.intent = null
    session.direction = direction
    const colliding = !canPlace(session.snapshot, session.id, session.candidate, cols)
    const intent = session.kind === 'drag'
      ? advanceHover(session.intent, session.candidate, colliding, performance.now())
      : { intent: null, ready: true, remaining: 0 }
    session.intent = intent.intent
    session.pending = !intent.ready
    session.preview = intent.ready
      ? multiPreviewPlacement(session.snapshot, session.id, session.candidate, cols, session.kind === 'drag' ? aim : undefined)
      : session.snapshot.map(entry => ({ ...entry }))
    if (session.pending) {
      if (root.current) root.current.dataset.hoverPending = 'true'
      const pendingKey = session.intent?.key
      hoverTimer.current = setTimeout(() => {
        hoverTimer.current = null
        if (!active.current || gesture.current !== session || session.intent?.key !== pendingKey) return
        refreshStationary.current()
      }, Math.max(1, Math.ceil(intent.remaining)))
    }
    session.rejected = !session.pending && !placementAccepted(session.preview, session.id, session.candidate)
    if (root.current) {
      if (session.rejected) root.current.dataset.dropRejected = 'true'
      else delete root.current.dataset.dropRejected
    }
    const visualBottom = Math.max(canvasContentHeight([session.candidate]), canvasContentHeight(session.preview))
    const gridBox = root.current?.getBoundingClientRect()
    const point = pointer.current
    const pixelBottom = gridBox && point && session.grab
      ? point.y - session.grab.y - gridBox.top + session.candidate.h * 56 - 12 : 0
    retainCanvas(visualBottom, pixelBottom)
    if (placeholder) {
      // RGL 2.2.3 reuses this callback object as its drop preview; pin and regression-test this integration.
      placeholder.x = session.candidate.x
      placeholder.y = session.candidate.y
      placeholder.w = session.candidate.w
      placeholder.h = session.candidate.h
    }
  }
  refreshStationary.current = () => {
    const p = pointer.current
    if (!active.current || !p) return
    if (libraryRef.current) {
      refreshLibrary.current()
    } else if (!p.touch) {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, buttons: 1 }))
    } else if (lastTouch.current) {
      const event = lastTouch.current
      ;(event.target ?? document).dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true,
        touches: Array.from(event.touches), targetTouches: Array.from(event.targetTouches), changedTouches: Array.from(event.changedTouches) }))
    }
  }
  const compactor = useMemo(() => ({
    type: null,
    allowOverlap: true,
    preventCollision: false,
    compact(value: EngineLayout): EngineLayout {
      const session = gesture.current
      return active.current && session && !cancelled.current
        ? pinDraggedItem(session.preview, session.id, session.candidate)
        : value.map(item => ({ ...item }))
    },
  }), [])
  const stop = (value: EngineLayout): void => {
    if (cancelled.current || !active.current || !gesture.current) return
    const session = gesture.current
    // Dropping on the delete target is an abort, never a move: restore the card where it
    // was grabbed and let the page confirm the deletion.
    if (!libraryRef.current && overDeleteZone()) {
      const id = session.id, node = session.node
      desktopRelease.current?.()
      cancelGesture.current()
      deleteRequest.current?.(id, node)
      return
    }
    desktopRelease.current?.()
    // Free placement, deliberately: a card stays where it was dropped. Packing on
    // release made the board un-arrangeable — you could not leave a gap or put a card
    // beside a tall one, because it snapped back to the top on the next frame. Packing
    // is an explicit action ("Tidy layout"), never a side effect of letting go.
    const result = session?.preview ?? items(value, cols)
    const restoreEngine = session?.pending || session?.rejected
    clearHover()
    active.current = false
    gesture.current = null
    pointer.current = null
    releaseCanvas(Boolean(restoreEngine), result)
    setCurrent(result)
    setDragHeight(0)
    if (restoreEngine) setEpoch(i => i + 1)
    onActive(false)
    document.body.classList.remove('dsh-home-dragging')
    onCommit(result)
  }
  desktopFinish.current = () => {
    stop(original.current)
    setEpoch(i => i + 1)
  }
  updateLibraryTransaction.current = () => {
    const drag = libraryRef.current, session = gesture.current, p = pointer.current, grid = root.current?.getBoundingClientRect()
    if (!drag || !session || !p || !grid) return
    const inside = libraryPointerInside(p, grid) && !document.elementFromPoint(p.x,p.y)?.closest('.dsh-library-panel')
    // Same numbers the card itself will have: a card's width depends only on its column
    // span, so the ghost must not derive it from the viewport. Two formulas here is what
    // made the ghost wider than the card it previewed.
    const w = widgetWidthForColumns(drag.item.w)
    const h = drag.item.h * SPATIAL_ROW_HEIGHT + (drag.item.h - 1) * SPATIAL_GAP
    setLibraryVisual({ x:p.x-drag.grab.x, y:p.y-drag.grab.y, w,h,inside })
    if (!inside) {
      clearHover(); session.intent=null; session.pending=true; session.rejected=false
      session.preview=session.snapshot.map(entry=>({...entry})); setCurrent(layout);setLibraryOutline(null); return
    }
    const item = {...drag.item}
    update([],null,item,null,new Event('library-drag'),null)
    setCurrent(session.preview.filter(entry=>entry.i!==drag.id))
    setLibraryOutline({x:grid.left+session.candidate.x*((width+12)/cols),y:grid.top+session.candidate.y*56,w,h,pending:session.pending||session.rejected})
  }
  refreshLibrary.current = () => updateLibraryTransaction.current()
  useLayoutEffect(() => {
    if (!libraryDrag || !editing) return
    const drag = libraryDrag
    const snapshot = [...layout.map(item=>({...item})), {...drag.item}]
    original.current = layout
    cancelled.current=false; active.current=true
    pointer.current={...drag.start,touch:drag.touch}
    gesture.current={id:drag.id,kind:'drag',snapshot,candidate:{...drag.item},preview:snapshot,node:null,grab:drag.grab,intent:null,pending:true,direction:'y',rejected:false}
    beginCanvas()
    document.body.classList.add('dsh-home-dragging'); onActive(true)
    updateLibraryTransaction.current()
    const move=(event:PointerEvent) => {
      if (!active.current || cancelled.current || event.pointerId !== drag.pointerId) return
      event.preventDefault()
      pointer.current={x:event.clientX,y:event.clientY,touch:event.pointerType==='touch'}
      updateLibraryTransaction.current()
    }
    const finish=(event:MouseEvent | PointerEvent) => {
      if(!active.current || cancelled.current || ('pointerId' in event && event.pointerId !== drag.pointerId))return
      pointer.current={x:event.clientX,y:event.clientY,touch:'pointerType' in event&&event.pointerType==='touch'}
      updateLibraryTransaction.current()
      const s=gesture.current,grid=root.current?.getBoundingClientRect()
      const inside=grid&&libraryPointerInside(pointer.current,grid)&&!document.elementFromPoint(event.clientX,event.clientY)?.closest('.dsh-library-panel')
      const accepted=inside&&s&&!s.pending&&!s.rejected&&placementAccepted(s.preview,drag.id,s.candidate)
      clearHover(); active.current=false; gesture.current=null; pointer.current=null
      releaseCanvas(!accepted, accepted && s ? s.preview : latestLayout.current)
      setCurrent(accepted && s ? s.preview : latestLayout.current);setLibraryVisual(null);setLibraryOutline(null);setDragHeight(0);document.body.classList.remove('dsh-home-dragging');onActive(false)
      if(accepted&&s)libraryHandlers.current.onLibraryDrop?.(drag,s.preview)
      libraryHandlers.current.onLibraryEnd?.()
    }
    const release=observeDragRelease({window,document,documentElement:document.documentElement},{transport:'pointer',pointerId:drag.pointerId,touch:drag.touch,
      onRelease:event=>finish(event as MouseEvent | PointerEvent),onCancel:()=>cancelGesture.current()})
    window.addEventListener('pointermove',move,{capture:true,passive:false})
    return()=>{release();window.removeEventListener('pointermove',move,true);clearHover();if(active.current)releaseCanvas(true,latestLayout.current);active.current=false;gesture.current=null;pointer.current=null;setLibraryVisual(null);setLibraryOutline(null);setCurrent(latestLayout.current);setDragHeight(0);document.body.classList.remove('dsh-home-dragging');onActive(false)}
    // A library gesture captures one immutable peer snapshot and uses the ordinary update() solver.
  },[libraryDrag?.id,cols,editing])
  // RGL bounds:false is essential for downward growth. Its grid constraints bound
  // only the snapped candidate, not live pixels: keep x on our fixed-width canvas
  // through the public positioning strategy, without bounding y or replacing drag.
  const positionStrategy = useMemo(() => ({
    type: 'transform' as const, scale: 1,
    calcStyle: (position: Position) => setTransform({ ...position, left: clampCanvasLeft(position.left, width, position.width) }),
  }), [width])
  const constrained = useMemo(() => current.map(item => ({ ...item, maxH: item.maxH ?? 30 })), [current])
  return <><GridLayout key={`${cols}-${epoch}`} width={width} layout={constrained} innerRef={root}
    className="dsh-spatial-grid" compactor={compactor} positionStrategy={positionStrategy}
    gridConfig={{ cols, rowHeight: 44, margin: [12, 12], containerPadding: [0, 0], maxRows: 10003 }}
    dragConfig={{ enabled: editing, handle: '.dsh-widget-grip', cancel: 'button:not(.dsh-widget-grip), input, select, textarea, a', threshold: 5 }}
    resizeConfig={{ enabled: false, handles: [] }}
    style={{ minHeight: editing ? Math.max(EDIT_CANVAS_MIN_HEIGHT, dragHeight, canvasContentHeight(current)) : undefined }}
    onDragStart={(value, _old, item, _placeholder, event, node) => { start(value, item, 'drag', event, node) }}
    onResizeStart={(value, _old, item, _placeholder, event, node) => { start(value, item, 'resize', event, node) }}
    onDrag={update} onResize={update}
    onDragStop={value => { stop(value) }} onResizeStop={value => { stop(value) }}>
    {children}
  </GridLayout>
    {libraryVisual && libraryOutline && createPortal(<div className="dsh-library-outline" data-pending={libraryOutline.pending} style={{left:libraryOutline.x,top:libraryOutline.y,width:libraryOutline.w,height:libraryOutline.h}} aria-hidden="true"/>,document.body)}
    {libraryVisual && createPortal(<div className="dsh-library-ghost dsh-w" data-inside={libraryVisual.inside} style={{left:libraryVisual.x,top:libraryVisual.y,width:libraryVisual.w,height:libraryVisual.h}} inert aria-hidden="true">{libraryGhost}</div>,document.body)}
  </>
}
