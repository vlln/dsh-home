/** Width handles for the whole board, mirroring the host Conversation tab: one 10px
 * col-resize strip on each side, a 2px glow that tracks the captured pointer, and a
 * direct CSS-variable write during the gesture so the edge never lags the cursor. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import {
  CANVAS_DEFAULT_WIDTH, CANVAS_MIN_WIDTH,
  canvasMaxFor, canvasWidthFromEdgeDrag, canvasWidthFromKey, clampCanvasWidth,
} from './canvas-width.ts'

function board(handle: HTMLElement): HTMLElement | null {
  return handle.closest<HTMLElement>('.dsh-home')
}

/** Room the board may occupy: the scroll container's content box, i.e. what is left
 * after its own gutters, before the reserved edge is taken off. */
function availableBoardWidth(handle: HTMLElement): number {
  const home = board(handle)
  if (home === null) return Number.NaN
  const style = getComputedStyle(home)
  return home.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0)
}

/** Width the layout is currently rendered at, which may be narrower than the saved
 * preference when the window (or the reserved edge) offers less room. */
function renderedWidth(handle: HTMLElement, fallback: number): number {
  const column = handle.closest('.dsh-home-inner')?.getBoundingClientRect().width
  return column !== undefined && Number.isFinite(column) && column > 0 ? Math.round(column) : fallback
}

function applyWidth(handle: HTMLElement, width: number): void {
  board(handle)?.style.setProperty('--dsh-home-max-width', `${width}px`)
}

export function CanvasWidthHandle({ side, label, hint, value, onCommit }: {
  side: 'left' | 'right'
  label: string
  hint: string
  /** Committed preference; also the value keyboard steps start from. */
  value: number
  onCommit: (width: number) => void
}): ReactNode {
  const gesture = useRef({ dragging: false, base: 0, origin: 0 })
  const [max, setMax] = useState(value)
  const handleRef = useRef<HTMLDivElement>(null)
  // The practical maximum depends on the window, so it is measured rather than fixed.
  useEffect(() => {
    const node = handleRef.current
    if (node === null) return
    const measure = (): void => {
      const next = canvasMaxFor(availableBoardWidth(node))
      setMax(previous => previous === next ? previous : next)
    }
    measure()
    const home = board(node)
    if (home === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(home)
    return () => { observer.disconnect() }
  }, [])
  const finish = useCallback((handle: HTMLElement, persist: boolean): void => {
    const state = gesture.current
    if (!state.dragging) return
    state.dragging = false
    handle.toggleAttribute('data-dragging', false)
    delete board(handle)?.dataset.resizing
    // A cancelled or lost gesture falls back to the committed preference.
    if (!persist) applyWidth(handle, value)
  }, [value])
  return <div
    ref={handleRef}
    className="dsh-canvas-grip" data-side={side} data-canvas-grip={side}
    role="separator" aria-orientation="vertical" tabIndex={0}
    aria-label={label} aria-valuemin={CANVAS_MIN_WIDTH} aria-valuemax={max} aria-valuenow={value}
    title={hint}
    onDoubleClick={() => onCommit(CANVAS_DEFAULT_WIDTH)}
    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
      const limit = canvasMaxFor(availableBoardWidth(event.currentTarget))
      const next = canvasWidthFromKey(value, event.key, 40, limit)
      if (next === value) return
      event.preventDefault(); event.stopPropagation()
      onCommit(next)
    }}
    onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !event.isPrimary) return
      event.preventDefault(); event.stopPropagation()
      const handle = event.currentTarget
      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = { dragging: true, base: renderedWidth(handle, value), origin: event.clientX }
      handle.toggleAttribute('data-dragging', true)
      const home = board(handle)
      // Suppress grid easing for the gesture: the edge must track the pointer.
      if (home !== null) home.dataset.resizing = 'true'
    }}
    onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (!state.dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return
      const box = event.currentTarget.getBoundingClientRect()
      const limit = canvasMaxFor(availableBoardWidth(event.currentTarget))
      event.currentTarget.style.setProperty('--dsh-canvas-grip-y', `${event.clientY - box.top}px`)
      // Written straight to the board: a React round trip would trail the pointer.
      applyWidth(event.currentTarget, canvasWidthFromEdgeDrag(state.base, state.origin, event.clientX, side, limit))
    }}
    onPointerUp={(event: ReactPointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (!state.dragging) return
      const handle = event.currentTarget
      const moved = event.clientX !== state.origin
      // Mark the gesture closed before releasing, so the resulting lostpointercapture
      // does not undo the width we are about to persist.
      finish(handle, moved)
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
      // Persist what is actually on screen: past the limit the edge stops moving, and
      // storing the pointer's wish would silently record an unreachable width.
      const applied = clampCanvasWidth(renderedWidth(handle, value), canvasMaxFor(availableBoardWidth(handle)))
      if (moved && applied !== value) onCommit(applied)
      else if (!moved) applyWidth(handle, value)
    }}
    onPointerCancel={(event: ReactPointerEvent<HTMLDivElement>) => { finish(event.currentTarget, false) }}
    onLostPointerCapture={(event: ReactPointerEvent<HTMLDivElement>) => { finish(event.currentTarget, false) }}
  />
}
