/** Widget-declared discrete resize. The grid engine never sees arbitrary sizes. */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { observeDragRelease } from './drag-release.ts'
import type { Translate } from './format.ts'
import type { WidgetPreset, WidgetSizing } from './widget-contract.ts'
import { projectedWidgetPresets } from './widget-sizing.ts'
import { canPlace, type SpatialItem } from './spatial-model.ts'

import { nearestResizeChoice } from './resize-model.ts'

export function WidgetResizeHandle({ t, title, rect, sizing, cols, gridWidth, geometry, disabled, cancelRequested, onActive, onPreview, onCommit }: {
  t: Translate; title: string; rect: SpatialItem; sizing: Readonly<WidgetSizing>; cols: number; gridWidth: number
  geometry: readonly SpatialItem[]; disabled: boolean; cancelRequested: boolean
  onActive: (value: boolean) => void; onPreview: (value: SpatialItem | null) => void
  onCommit: (preset: WidgetPreset, snapshot: readonly SpatialItem[]) => void
}) {
  const cancel = useRef<(() => void) | null>(null)
  const [active, setActive] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const callbacks = useRef({ onActive, onPreview, onCommit })
  callbacks.current = { onActive, onPreview, onCommit }
  useEffect(() => () => { cancel.current?.() }, [geometry, sizing, cols, gridWidth])
  useEffect(() => { if (cancelRequested) cancel.current?.() }, [cancelRequested])
  const options = projectedWidgetPresets(sizing, cols)
  // Single-choice widgets have nothing to resize unless a historical size differs.
  if (options.length === 1 && options[0]!.w === rect.w && options[0]!.h === rect.h) return null
  const begin = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || active || event.button !== 0 || !event.isPrimary) return
    event.preventDefault(); event.stopPropagation()
    const start = { x: event.clientX, y: event.clientY }, id = event.pointerId, step = (gridWidth + 12) / cols
    const snapshot = geometry, source = { ...rect }
    let choice: typeof options[number] | undefined, rejected = false, moved = false, finished = false
    let release = () => {}
    const update = (x: number, y: number) => {
      if (!moved && Math.hypot(x - start.x, y - start.y) < 5) return
      moved = true
      choice = nearestResizeChoice(options, source.w + (x - start.x) / step, source.h + (y - start.y) / 56, step, choice ?? source)
      if (!choice) return
      const candidate = { ...source, w: choice.w, h: choice.h }
      rejected = !canPlace(snapshot, source.i, candidate, cols)
      setBlocked(rejected)
      callbacks.current.onPreview(rejected ? source : candidate)
    }
    const move = (e: PointerEvent) => { if (e.pointerId !== id || finished) return; e.preventDefault(); update(e.clientX, e.clientY) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(false) } }
    const end = (commit: boolean) => {
      if (finished) return
      finished = true; release(); window.removeEventListener('pointermove', move, true); window.removeEventListener('keydown', key, true)
      cancel.current = null; document.body.classList.remove('dsh-home-resizing');setActive(false);setBlocked(false)
      callbacks.current.onPreview(null);callbacks.current.onActive(false)
      if (commit && moved && choice && !rejected) callbacks.current.onCommit(choice.preset, snapshot)
    }
    cancel.current = () => end(false)
    release = observeDragRelease({ window, document, documentElement: document.documentElement }, { transport:'pointer',pointerId:id,touch:event.pointerType==='touch',
      onRelease:e => { if ('clientX' in e) update((e as PointerEvent).clientX,(e as PointerEvent).clientY); end(true) }, onCancel:()=>end(false) })
    window.addEventListener('pointermove', move, { capture:true,passive:false });window.addEventListener('keydown', key, true)
    document.body.classList.add('dsh-home-resizing');setActive(true);callbacks.current.onActive(true)
  }
  return <button type="button" className="dsh-widget-resize-handle" data-resizing={active || undefined} data-blocked={blocked || undefined}
    disabled={disabled && !active} aria-label={t('edit.resize', { title })} title={t('edit.resizeHint')}
    onPointerDown={begin} onKeyDown={event => {
      if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key) || disabled || active) return
      event.preventDefault();event.stopPropagation()
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      const sorted = [...options].sort((a,b)=>a.w*a.h-b.w*b.h||a.w-b.w||a.h-b.h)
      const index = sorted.findIndex(item=>item.w===rect.w&&item.h===rect.h)
      const next = sorted[index < 0 ? 0 : index + (forward ? 1 : -1)]
      if (next) callbacks.current.onCommit(next.preset, geometry)
    }} />
}
