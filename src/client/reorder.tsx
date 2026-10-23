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

/** 落点在目标的哪一侧。 */
export type DropSide = 'before' | 'after'

/** 一个排序列表的拖拽控制器。 */
export interface ReorderController {
  dragging: string | null
  dropTarget: string | null
  dropSide: DropSide | null
  /** 开始拖动（调用方负责 preventDefault）。 */
  begin: (id: string) => void
  /** 取消当前拖动。 */
  cancel: () => void
}

/**
 * 把一组 `[attribute=<id>]` 元素变成可拖拽排序的列表。
 * @param attribute 元素上的 id 属性名（`data-widget-id` / `data-focus-id`）
 * @param commit 落点确定后调用（id、目标、前/后）
 */
export function useReorder(attribute: string, commit: (id: string, target: string, side: DropSide) => void): ReorderController {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropSide, setDropSide] = useState<DropSide | null>(null)
  const dropRef = useRef<{ target: string | null; side: DropSide | null }>({ target: null, side: null })

  const cancel = useCallback(() => {
    dropRef.current = { target: null, side: null }
    setDragging(null)
    setDropTarget(null)
    setDropSide(null)
  }, [])

  const begin = useCallback((id: string) => {
    dropRef.current = { target: null, side: null }
    setDragging(id)
    setDropTarget(null)
    setDropSide(null)
  }, [])

  useEffect(() => {
    if (dragging === null) return
    const container = document.querySelector('.dsh-home') as HTMLElement | null
    let lastX = 0
    let lastY = 0
    let frame = 0
    document.body.classList.add('dsh-home-dragging')

    const hit = (): void => {
      if (container === null) return
      const element = document.elementFromPoint(lastX, lastY)
      const item = element?.closest(`[${attribute}]`) as HTMLElement | null
      const id = item?.getAttribute(attribute) ?? null
      if (item === null || id === null || id === dragging) return
      const rect = item.getBoundingClientRect()
      const side: DropSide = lastX > rect.left + rect.width / 2 ? 'after' : 'before'
      dropRef.current = { target: id, side }
      setDropTarget(id)
      setDropSide(side)
    }

    const onMove = (event: PointerEvent): void => {
      lastX = event.clientX
      lastY = event.clientY
      hit()
    }

    // 边缘自动滚动按帧跑：指针停在边缘不动时也要继续滚。
    const tick = (): void => {
      if (container !== null && (lastX !== 0 || lastY !== 0)) {
        const rect = container.getBoundingClientRect()
        const edge = 80
        let delta = 0
        if (lastY < rect.top + edge) delta = -Math.min(18, Math.ceil((rect.top + edge - lastY) / 5))
        else if (lastY > rect.bottom - edge) delta = Math.min(18, Math.ceil((lastY - (rect.bottom - edge)) / 5))
        if (delta !== 0) {
          container.scrollTop += delta
          hit()
        }
      }
      frame = requestAnimationFrame(tick)
    }

    const onUp = (): void => {
      const { target, side } = dropRef.current
      if (target !== null && side !== null) commit(dragging, target, side)
      cancel()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      cancelAnimationFrame(frame)
      document.body.classList.remove('dsh-home-dragging')
    }
  }, [attribute, cancel, commit, dragging])

  return { dragging, dropTarget, dropSide, begin, cancel }
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
