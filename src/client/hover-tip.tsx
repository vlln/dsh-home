/** 图表上的悬停信息：一个跟随指针的小气泡，Portal 到 body，不被卡片裁剪。
 *
 * 同一个交互在所有小组件里复用，避免每张卡各写一套坐标与关闭逻辑。
 *
 * @module @vlln/dsh-home/client/hover-tip
 */
import { useState } from 'react'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Tip { x: number; y: number; text: string }

export interface HoverTipShowEvent {
  currentTarget: Element
  clientX: number
  clientY: number
}

export interface HoverTipBinding {
  onMouseEnter: (event: MouseEvent<HTMLElement | SVGElement>) => void
  onMouseMove: (event: MouseEvent<HTMLElement | SVGElement>) => void
  onMouseLeave: () => void
  onFocus: (event: FocusEvent<HTMLElement | SVGElement>) => void
  onBlur: () => void
}

/** 返回气泡节点与「把这段文字挂到某个元素上」的绑定函数。 */
export function useHoverTip(): {
  node: ReactNode
  bind: (text: string) => HoverTipBinding
  show: (event: HoverTipShowEvent, text: string) => void
  hide: () => void
} {
  const [tip, setTip] = useState<Tip | null>(null)
  const place = (element: Element, x: number, y: number, text: string): void => {
    const rect = element.getBoundingClientRect()
    setTip({ x: x || rect.left + rect.width / 2, y: y || rect.top, text })
  }
  const node = tip === null ? null : createPortal(
    <div className="dsh-hover-tip" role="tooltip"
      style={{ left: Math.min(tip.x + 12, window.innerWidth - 260), top: Math.max(8, tip.y - 34) }}>{tip.text}</div>,
    document.body,
  )
  return {
    node,
    show: (event, text) => place(event.currentTarget, event.clientX, event.clientY, text),
    hide: () => setTip(null),
    bind: (text: string) => ({
      onMouseEnter: event => place(event.currentTarget, event.clientX, event.clientY, text),
      onMouseMove: event => place(event.currentTarget, event.clientX, event.clientY, text),
      onMouseLeave: () => setTip(null),
      onFocus: event => place(event.currentTarget, 0, 0, text),
      onBlur: () => setTip(null),
    }),
  }
}
