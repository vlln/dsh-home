/**
 * 图形原语：一张卡只讲一件事，图形只负责那件事的形状。
 *
 * 所有原语只吃 `--dsh-viz-*` 与语义 token，不自己挑颜色；悬停读数由调用方用
 * `Tooltip` 包住列，原语只产出可聚焦的元素与 `aria-label`。
 *
 * @module @vlln/dsh-home/client/ui/viz
 */

import type { ReactElement, ReactNode } from 'react'
import { cx } from './lib/cx.ts'

export interface VizItem {
  key: string
  /** 0..1 的相对高度，调用方按自己的峰值算好。 */
  ratio: number
  label: string
  /** 今天 / 当前区间：用同一色相的最深一档。 */
  emphasis?: boolean
  /** 无数据：画一条基线，不画零高柱子。 */
  empty?: boolean
}

/**
 * 柱状序列。等宽列、贴底对齐；列自己可聚焦，读数交给调用方的 Tooltip。
 *
 * `wrap` 用来给每列套一层读数触发器（Portal 气泡、键盘可达），
 * 这样图形原语不需要知道 Tooltip 的存在。
 */
export function SparkBars({ items, wrap, className, minHeight = 4 }: {
  items: readonly VizItem[]
  wrap?: (item: VizItem, bar: ReactElement) => ReactNode
  className?: string
  minHeight?: number
}): ReactNode {
  return <div className={cx('flex min-h-0 flex-1 items-end justify-center gap-1.5', className)} role="group">
    {items.map(item => {
      const height = item.empty === true ? 0 : Math.max(minHeight, Math.round(item.ratio * 100))
      const bar = <span
        className={cx(
          'w-full max-w-10 rounded-sm transition-[height,background-color] duration-300 ease-out',
          item.empty === true
            ? 'bg-background-tertiary-default'
            : item.emphasis === true ? 'bg-chart-4' : 'bg-chart-4/70 hover:bg-chart-4',
        )}
        // Inline cap: a bar never stretches past a readable width, however wide the card is.
        style={item.empty === true ? { height: 2, width: 24 } : { height: `${height}%`, maxWidth: 40 }}
        data-empty={item.empty === true ? 'true' : undefined}
        data-emphasis={item.emphasis === true ? 'true' : undefined}
      />
      const column: ReactElement = <span className="flex h-full min-h-0 flex-1 flex-col justify-end" tabIndex={0} role="img" aria-label={item.label}>
        {bar}
      </span>
      return <div key={item.key} className="flex h-full min-h-0 flex-1 items-end justify-center">{wrap === undefined ? column : wrap(item, column)}</div>
    })}
  </div>
}

/**
 * 一条进度轨道：中性底 + 强调色填充。用于“按工作区”“token 用量”这类占比。
 * 传 `tone` 换填充色（默认强调色）。
 */
export function Meter({ ratio, label, tone = 'accent', className }: {
  ratio: number
  label: string
  tone?: 'accent' | 'positive' | 'warning' | 'danger'
  className?: string
}): ReactNode {
  const fill = {
    accent: 'bg-chart-4',
    positive: 'bg-status-lime-text',
    warning: 'bg-status-yellow-text',
    danger: 'bg-status-rose-text',
  }[tone]
  return <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-chart-track', className)} role="img" aria-label={label}>
    <div className={cx('h-full rounded-full transition-[width] duration-500 ease-out', fill)} style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
  </div>
}
