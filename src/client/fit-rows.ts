/**
 * 摘要卡不滚动：按容器实际高度决定能放几行，而不是拍一个常量。
 *
 * 小组件的高度由网格声明（固定尺寸，用户不改），但字体缩放、断点与标题换行都会
 * 改变可用空间。这里量一次「一行占多高」和「容器有多高」，算出正好放得下的行数；
 * 只截取最近的 N 行，剩下的用文字说明总数——卡片里永远不出现滚动条。
 *
 * @module @vlln/dsh-home/client/fit-rows
 */
import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

/** 行间距与 `.dsh-rows` 的 gap 一致。 */
const ROW_GAP = 2

/**
 * @param ref 行列表容器（高度由 flex 决定，不随行数增长）
 * @param selector 单个行的选择器，用来量真实行高
 * @returns 能完整放下的行数；首次测量前为 null
 */
export function useVisibleRows(ref: RefObject<HTMLElement | null>, selector: string): number | null {
  const [count, setCount] = useState<number | null>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (node === null) return
    const measure = (): void => {
      const row = node.querySelector<HTMLElement>(selector)
      if (row === null) return
      const pitch = row.getBoundingClientRect().height + ROW_GAP
      if (!(pitch > 0)) return
      const next = Math.max(1, Math.floor((node.clientHeight + ROW_GAP) / pitch))
      setCount(previous => previous === next ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [ref, selector])
  return count
}
