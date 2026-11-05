/** RGL supplies pixel dragging/resize; a snapshot-based compactor previews local displacement. */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import GridLayout, { type Layout as EngineLayout, type LayoutItem } from 'react-grid-layout'
import { snapCandidate } from './collision-preview.ts'
import { multiPreviewPlacement, placementAxis } from './multi-preview.ts'
import type { GridRect } from './api.ts'
import { canPlace, type SpatialItem } from './spatial-model.ts'
import { advanceHover, type HoverIntent } from './hover-intent.ts'
import { pinDraggedItem, placementAccepted } from './drag-visual.ts'

export interface SpatialGridProps {
  width: number
  cols: number
  layout: SpatialItem[]
  editing: boolean
  onCommit: (layout: SpatialItem[]) => void
  onActive: (active: boolean) => void
  children: ReactNode
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
export function SpatialGrid({ width, cols, layout, editing, onCommit, onActive, children }: SpatialGridProps): ReactNode {
  const [epoch, setEpoch] = useState(0)
  const [current, setCurrent] = useState<EngineLayout>(layout)
  const [dragHeight, setDragHeight] = useState(0)
  const active = useRef(false)
  const original = useRef<EngineLayout>(layout)
  const cancelled = useRef(false)
  const gesture = useRef<Gesture | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number; touch: boolean } | null>(null)
  const lastTouch = useRef<TouchEvent | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshStationary = useRef<() => void>(() => {})
  const clearHover = (): void => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    if (root.current) { delete root.current.dataset.hoverPending; delete root.current.dataset.dropRejected }
  }
  useEffect(() => { if (!active.current) setCurrent(layout) }, [layout])
  useEffect(() => {
    clearHover()
    active.current = false
    cancelled.current = true
    gesture.current = null
    pointer.current = null
    if (root.current) root.current.style.paddingBottom = ''
    setCurrent(layout)
    setDragHeight(0)
    document.body.classList.remove('dsh-home-dragging')
    onActive(false)
    return () => {
      clearHover()
      active.current = false
      cancelled.current = true
      gesture.current = null
      document.body.classList.remove('dsh-home-dragging')
      onActive(false)
    }
    // A breakpoint change owns a new transaction; normal geometry updates sync above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, onActive])
  useEffect(() => {
    const cancel = (event: Event): void => {
      if (!active.current || (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      clearHover()
      cancelled.current = true
      active.current = false
      gesture.current = null
      pointer.current = null
      if (root.current) root.current.style.paddingBottom = ''
      setCurrent(original.current)
      setDragHeight(0)
      setEpoch(i => i + 1)
      document.body.classList.remove('dsh-home-dragging')
      onActive(false)
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
    const scroll = (): void => {
      const p = pointer.current
      const container = root.current?.closest('.dsh-home') as HTMLElement | null
      if (active.current && gesture.current?.kind === 'drag' && p && !p.touch && container) {
        const bounds = container.getBoundingClientRect()
        const edge = 72
        let dy = 0
        if (p.y > bounds.bottom - edge) dy = Math.min(16, Math.ceil((p.y - bounds.bottom + edge) / 5))
        else if (p.y < bounds.top + edge + 80) dy = -Math.min(16, Math.ceil((bounds.top + edge + 80 - p.y) / 5))
        if (dy !== 0) {
          // Extend only while moving downward at the viewport edge; never globally compact.
          if (dy > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 24 && root.current) {
            root.current.style.paddingBottom = `${Math.min(2000, Number.parseFloat(root.current.style.paddingBottom || '0') + 56)}px`
          }
          const before = container.scrollTop
          container.scrollTop += dy
          if (container.scrollTop !== before && !p.touch) {
            // react-draggable measures offsetParent.scrollTop on mousemove, even when the mouse is still.
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, buttons: 1 }))
          }
        }
      }
      frame = requestAnimationFrame(scroll)
    }
    document.addEventListener('mousemove', track, true)
    document.addEventListener('touchmove', track, { capture: true, passive: true })
    frame = requestAnimationFrame(scroll)
    return () => {
      document.removeEventListener('mousemove', track, true)
      document.removeEventListener('touchmove', track, true)
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
    gesture.current = { id: item.i, kind, snapshot, candidate: { x: item.x, y: item.y, w: item.w, h: item.h }, preview: snapshot, intent: null, pending: false, direction: 'y', rejected: false, node,
      grab: box && Number.isFinite(mouse.clientX) ? { x: mouse.clientX - box.left, y: mouse.clientY - box.top } : undefined }
    if (Number.isFinite(mouse.clientX)) pointer.current = { x: mouse.clientX, y: mouse.clientY, touch: touch !== undefined }
    setDragHeight(root.current?.getBoundingClientRect().height ?? 0)
    document.body.classList.add('dsh-home-dragging')
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
    const visualBottom = Math.max(session.candidate.y + session.candidate.h,
      ...session.preview.map(entry => entry.y + entry.h)) * 56 - 12
    setDragHeight(previous => Math.max(previous, visualBottom))
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
    if (!p.touch) {
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
    if (cancelled.current) return
    const session = gesture.current
    const result = session?.preview ?? items(value, cols)
    const restoreEngine = session?.pending || session?.rejected
    clearHover()
    active.current = false
    gesture.current = null
    pointer.current = null
    if (root.current) root.current.style.paddingBottom = ''
    setCurrent(result)
    setDragHeight(0)
    if (restoreEngine) setEpoch(i => i + 1)
    onActive(false)
    document.body.classList.remove('dsh-home-dragging')
    onCommit(result)
  }
  const constrained = useMemo(() => current.map(item => ({ ...item, maxH: item.maxH ?? 30 })), [current])
  return <GridLayout key={`${cols}-${epoch}`} width={width} layout={constrained} innerRef={root}
    className="dsh-spatial-grid" compactor={compactor}
    gridConfig={{ cols, rowHeight: 44, margin: [12, 12], containerPadding: [0, 0], maxRows: 10003 }}
    dragConfig={{ enabled: editing, handle: '.dsh-widget-grip', cancel: 'button:not(.dsh-widget-grip), input, select, textarea, a', threshold: 5 }}
    resizeConfig={{ enabled: editing, handles: ['se'] }}
    style={{ minHeight: editing ? Math.max(900, dragHeight) : undefined }}
    onDragStart={(value, _old, item, _placeholder, event, node) => { start(value, item, 'drag', event, node) }}
    onResizeStart={(value, _old, item, _placeholder, event, node) => { start(value, item, 'resize', event, node) }}
    onDrag={update} onResize={update}
    onDragStop={value => { stop(value) }} onResizeStop={value => { stop(value) }}>
    {children}
  </GridLayout>
}
