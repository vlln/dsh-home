/** Width handles for the whole board, mirroring the host Conversation tab: one 10px
 * col-resize strip on each side. Dragging rewrites the board's CSS width directly so
 * the preview follows the pointer frame by frame; only the commit snaps to a whole
 * column (`cols*96 - 12`). Widget pixel sizes never depend on this value. */
import { useCallback, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import {
  CANVAS_DEFAULT_WIDTH, CANVAS_MAX_WIDTH, CANVAS_MIN_WIDTH,
  canvasWidthFromEdgeDrag, canvasWidthFromKey, snapCanvasWidth,
} from './canvas-width.ts'

function board(handle: HTMLElement): HTMLElement | null {
  return handle.closest<HTMLElement>('.dsh-home')
}

function applyWidth(handle: HTMLElement, width: number): void {
  board(handle)?.style.setProperty('--dsh-home-board-width', `${width}px`)
}

/** While the board is wider than the scroll port its edges are off screen; centre the
 * overflow so both margins stay balanced. Fitting boards centre through CSS instead. */
function centreOverflow(handle: HTMLElement): void {
  const home = board(handle)
  if (home === null || home.scrollWidth <= home.clientWidth + 1) return
  home.scrollLeft = Math.max(0, (home.scrollWidth - home.clientWidth) / 2)
}

export function CanvasWidthHandle({ side, label, hint, value, onCommit }: {
  side: 'left' | 'right'
  label: string
  hint: string
  /** Committed board width (already snapped); keyboard steps start from it. */
  value: number
  onCommit: (width: number) => void
}): ReactNode {
  const gesture = useRef({ dragging: false, base: 0, origin: 0, raw: 0, scroll: 0 })
  const finish = useCallback((handle: HTMLElement, persist: boolean): void => {
    const state = gesture.current
    if (!state.dragging) return
    state.dragging = false
    handle.toggleAttribute('data-dragging', false)
    delete board(handle)?.dataset.resizing
    if (persist) return
    // A cancelled or lost gesture falls back to the committed preference and view.
    applyWidth(handle, value)
    const home = board(handle)
    if (home !== null) home.scrollLeft = state.scroll
  }, [value])
  return <div
    className="dsh-canvas-grip" data-side={side} data-canvas-grip={side}
    role="separator" aria-orientation="vertical" tabIndex={0}
    aria-label={label} aria-valuemin={CANVAS_MIN_WIDTH} aria-valuemax={CANVAS_MAX_WIDTH} aria-valuenow={value}
    title={hint}
    onDoubleClick={() => onCommit(CANVAS_DEFAULT_WIDTH)}
    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
      const next = canvasWidthFromKey(value, event.key)
      if (next === value) return
      event.preventDefault(); event.stopPropagation()
      onCommit(next)
    }}
    onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !event.isPrimary) return
      event.preventDefault(); event.stopPropagation()
      const handle = event.currentTarget
      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = {
        dragging: true, base: value, origin: event.clientX, raw: value,
        scroll: board(handle)?.scrollLeft ?? 0,
      }
      handle.toggleAttribute('data-dragging', true)
      const home = board(handle)
      // Suppress grid easing for the gesture: the edge must track the pointer.
      if (home !== null) home.dataset.resizing = 'true'
    }}
    onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (!state.dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return
      const box = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--dsh-canvas-grip-y', `${event.clientY - box.top}px`)
      // The board moves in whole grid units only: a free-pixel width could never be
      // filled by widget spans, so the edge snaps as the pointer travels.
      state.raw = snapCanvasWidth(canvasWidthFromEdgeDrag(state.base, state.origin, event.clientX, side))
      applyWidth(event.currentTarget, state.raw)
      centreOverflow(event.currentTarget)
    }}
    onPointerUp={(event: ReactPointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (!state.dragging) return
      const handle = event.currentTarget
      const moved = event.clientX !== state.origin
      // Commit a whole column; an unmoved press restores the committed width.
      const committed = moved ? snapCanvasWidth(state.raw) : value
      // Close the gesture before releasing, so the resulting lostpointercapture
      // does not undo the width we are about to persist.
      finish(handle, true)
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
      applyWidth(handle, committed)
      centreOverflow(handle)
      if (moved && committed !== value) onCommit(committed)
    }}
    onPointerCancel={(event: ReactPointerEvent<HTMLDivElement>) => { finish(event.currentTarget, false) }}
    onLostPointerCapture={(event: ReactPointerEvent<HTMLDivElement>) => { finish(event.currentTarget, false) }}
  />
}
