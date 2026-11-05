/**
 * 可排序列表的拖拽逻辑（网格与"三件事"共用）。
 *
 * 三条经验都写在这里：
 * 1. **不用 pointer capture**：手柄会被重渲染、指针也会离开元素，capture 一丢就没有
 *    pointermove。改用 window 级监听。
 * 2. **指针在空白处时保留上一个有效落点**：否则在两张卡之间的缝里松手等于什么都没发生。
 * 3. **拖动期间禁掉文本选择**（`body.dsh-home-dragging`），否则鼠标一拖就选中的是标题文字
 *    ——用户会以为"拖不动"。
 *
 * @module @vlln/dsh-home/client/reorder
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { dropSideAt } from './drop-model.ts'
import type { DropSide } from './drop-model.ts'

/** 落点在目标的哪一侧。 */
export type { DropSide } from './drop-model.ts'

interface DragSession {
  id: string
  container: HTMLElement
  pointerId: number
  x: number
  y: number
}

// Multiple home instances/controllers must not clear another active drag's body state.
const bodyDrags = new Set<object>()
function clearBodyDrag(owner: object): void {
  if (bodyDrags.delete(owner) && bodyDrags.size === 0) document.body.classList.remove('dsh-home-dragging')
}

/** 一个排序列表的拖拽控制器。 */
export interface ReorderController {
  dragging: string | null
  dropTarget: string | null
  dropSide: DropSide | null
  /** 在 pointerdown 回调中开始拖动（调用方负责 preventDefault）。 */
  begin: (id: string) => void
  /** 取消当前拖动。 */
  cancel: () => void
}

/**
 * 把一组 `[attribute=<id>]` 元素变成可拖拽排序的列表。
 * @param attribute 元素上的 id 属性名（`data-widget-id` / `data-focus-id`）
 * @param commit 落点确定后调用（id、目标、前/后）
 * @param enabled 是否允许拖动；关闭时取消，不提交。
 */
export function useReorder(
  attribute: string,
  commit: (id: string, target: string, side: DropSide) => void,
  enabled = true,
): ReorderController {
  const [session, setSession] = useState<DragSession | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropSide, setDropSide] = useState<DropSide | null>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const pointerDown = useRef<PointerEvent | null>(null)
  const enabledRef = useRef(enabled)
  const commitRef = useRef(commit)
  const bodyOwner = useRef({})
  const dropRef = useRef<{ target: string | null; side: DropSide | null }>({ target: null, side: null })
  enabledRef.current = enabled
  commitRef.current = commit

  const cancel = useCallback(() => {
    sessionRef.current = null
    dropRef.current = { target: null, side: null }
    clearBodyDrag(bodyOwner.current)
    setSession(null)
    setDropTarget(null)
    setDropSide(null)
  }, [])

  // Capture the native event before React calls begin(id), without changing existing callers.
  useEffect(() => {
    const remember = (event: PointerEvent): void => {
      pointerDown.current = event
    }
    const forget = (event: PointerEvent): void => {
      if (pointerDown.current?.pointerId === event.pointerId) pointerDown.current = null
    }
    window.addEventListener('pointerdown', remember, true)
    window.addEventListener('pointerup', forget, true)
    window.addEventListener('pointercancel', forget, true)
    return () => {
      window.removeEventListener('pointerdown', remember, true)
      window.removeEventListener('pointerup', forget, true)
      window.removeEventListener('pointercancel', forget, true)
      pointerDown.current = null
      sessionRef.current = null
      dropRef.current = { target: null, side: null }
      clearBodyDrag(bodyOwner.current)
    }
  }, [])

  const begin = useCallback((id: string) => {
    if (!enabledRef.current) return
    const event = pointerDown.current
    const origin = event?.target
    const item = origin instanceof Element ? origin.closest<HTMLElement>(`[${attribute}]`) : null
    const container = item?.closest<HTMLElement>('.dsh-home') ?? null
    if (event === null || event.button !== 0 || item?.getAttribute(attribute) !== id || container === null) return
    pointerDown.current = null
    cancel()
    const next = { id, container, pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    sessionRef.current = next
    setSession(next)
  }, [attribute, cancel])

  useEffect(() => {
    if (!enabled) cancel()
  }, [cancel, enabled])

  useEffect(() => {
    if (session === null || !enabled) return
    const { container, pointerId, id: dragging } = session
    let lastX = session.x
    let lastY = session.y
    let frame = 0
    const active = (): boolean => enabledRef.current && sessionRef.current === session
    bodyDrags.add(bodyOwner.current)
    document.body.classList.add('dsh-home-dragging')

    const hit = (): void => {
      if (!active()) return
      const element = document.elementFromPoint(lastX, lastY)
      const item = element?.closest<HTMLElement>(`[${attribute}]`) ?? null
      const id = item?.getAttribute(attribute) ?? null
      if (item === null || item.closest('.dsh-home') !== container || id === null || id === dragging) return
      // The immediate layout parent describes a row, not the outer scrolling panel.
      const row = item.parentElement ?? container
      const side = dropSideAt(item.getBoundingClientRect(), row.getBoundingClientRect(), { x: lastX, y: lastY })
      dropRef.current = { target: id, side }
      setDropTarget(id)
      setDropSide(side)
    }

    const onMove = (event: PointerEvent): void => {
      if (!active() || event.pointerId !== pointerId) return
      lastX = event.clientX
      lastY = event.clientY
      hit()
    }

    // 边缘自动滚动按帧跑：指针停在边缘不动时也要继续滚。
    const tick = (): void => {
      if (!active()) return
      const rect = container.getBoundingClientRect()
      const edge = 80
      let delta = 0
      if (lastY < rect.top + edge) delta = -Math.min(18, Math.ceil((rect.top + edge - lastY) / 5))
      else if (lastY > rect.bottom - edge) delta = Math.min(18, Math.ceil((lastY - (rect.bottom - edge)) / 5))
      if (delta !== 0) {
        container.scrollTop += delta
        hit()
      }
      frame = requestAnimationFrame(tick)
    }

    const onUp = (event: PointerEvent): void => {
      if (!active() || event.pointerId !== pointerId) return
      const { target, side } = dropRef.current
      cancel()
      if (target !== null && side !== null) commitRef.current(dragging, target, side)
    }
    const onCancel = (event: PointerEvent): void => {
      if (active() && event.pointerId === pointerId) cancel()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      cancelAnimationFrame(frame)
      clearBodyDrag(bodyOwner.current)
    }
  }, [attribute, cancel, enabled, session])

  return { dragging: enabled ? session?.id ?? null : null, dropTarget: enabled ? dropTarget : null, dropSide: enabled ? dropSide : null, begin, cancel }
}

/** 统一的拖拽把手（28px 命中区 + `⠿` + 键盘可聚焦）。 */
export function DragHandle({ label, onPointerDown, onKeyDown }: {
  label: string
  onPointerDown: (event: { button: number; preventDefault: () => void }) => void
  onKeyDown: (event: { key: string; preventDefault: () => void }) => void
}): ReactNode {
  return (
    <button
      type="button"
      className="dsh-tool dsh-drag"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      ⠿
    </button>
  )
}
