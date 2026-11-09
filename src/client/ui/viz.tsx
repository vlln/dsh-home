/**
 * 图形原语：一张卡只讲一件事，图形只负责那件事的形状。
 *
 * 所有原语只吃 `--dsh-viz-*` 与语义 token，不自己挑颜色；悬停读数由调用方用
 * `Tooltip` 包住列，原语只产出可聚焦的元素与 `aria-label`。
 *
 * @module @vlln/dsh-home/client/ui/viz
 */

import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { cx } from './lib/cx.ts'
import { segmentAtPoint } from './ring.ts'

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
 * 柱状序列。每列是一条完整高度的**轨道**，值从底部填进去——这是 BoardUI 的柱子做法，
 * 也是它看起来“被设计过”的主要原因：轨道给出刻度，填充给出读数。只有填充没有轨道时，
 * 矮柱子就是几块悬空的色块，空值那几天则完全消失。
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
  return <div className={cx('flex min-h-0 items-stretch justify-center gap-1.5', className)} role="group">
    {items.map(item => {
      const height = item.empty === true ? 0 : Math.max(minHeight, Math.round(item.ratio * 100))
      const bar = <span
        className="relative mx-auto flex h-full min-h-0 w-full max-w-9 items-end justify-center rounded-md bg-chart-track"
        data-empty={item.empty === true ? 'true' : undefined}
      >
        {item.empty === true
          ? <span className="h-px w-full bg-chart-neutral" />
          : <span
            // Solid, not 75%-over-the-track: an alpha fill let the track show through the
            // bar and read as a second, lighter block inside it.
            className={cx(
              'w-full rounded-[4px] transition-[height] duration-300 ease-out',
              'bg-chart-4 hover:bg-chart-4-active',
              item.emphasis === true ? 'opacity-100' : 'opacity-85 hover:opacity-100',
            )}
            style={{ height: `${height}%` }}
            data-emphasis={item.emphasis === true ? 'true' : undefined}
          />}
      </span>
      // A button, not a span: react-aria's TooltipTrigger only binds to an element that
      // can take focus and pointer handlers, and a bare span silently never opens the
      // tooltip. A bar column is interactive (hover/focus reads it out), so a button is
      // also the honest element.
      const column: ReactElement = <button type="button" className="flex h-full min-h-0 w-full flex-col justify-end border-0 bg-transparent p-0" aria-label={item.label}>
        {bar}
      </button>
      return <div key={item.key} className="flex h-full min-h-0 flex-1 items-stretch justify-center">{wrap === undefined ? column : wrap(item, column)}</div>
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

/** 热力格的浓淡档：0 是空槽，4 是最深。颜色由数据色派生，不在这里选色相。 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4

const HEAT_TONE: Record<HeatLevel, string> = {
  0: 'bg-chart-track',
  1: 'bg-chart-4/25',
  2: 'bg-chart-4/50',
  3: 'bg-chart-4/75',
  4: 'bg-chart-4',
}

/**
 * 一个热力格。给 `onClick` 就是可点的按钮（键盘可达、aria-pressed），不给就是装饰。
 * 尺寸用 `size` 传像素——热图要按容器实测宽度算格子，不能交给 CSS。
 */
export function HeatCell({ level, size, label, selected, unknown, onClick, className }: {
  level: HeatLevel
  size: number
  label?: string
  selected?: boolean
  unknown?: boolean
  onClick?: () => void
  className?: string
}): ReactNode {
  const tone = unknown === true ? 'bg-transparent ring-1 ring-inset ring-border-button-default' : HEAT_TONE[level]
  const classes = cx(
    'block flex-none rounded-[4px] transition-colors duration-150',
    tone,
    selected === true && 'ring-2 ring-text-primary',
    onClick !== undefined && 'cursor-pointer hover:ring-1 hover:ring-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
    className,
  )
  const style = { width: size, height: size }
  return onClick === undefined
    ? <span className={classes} style={style} aria-hidden="true" />
    : <button type="button" className={classes} style={style} aria-label={label} aria-pressed={selected} onClick={onClick} />
}

/**
 * 多段环：一个总量被拆成几份时用它，而不是几个并排的条。
 *
 * `segments` 的顺序就是绘制顺序；`tone` 是槽位名（`chart-1`…`chart-5`），
 * 组件不认识色相，只认识槽位——换配色只改 theme.css。
 * 悬停/聚焦由调用方决定（传 `activeKey`），这里只负责把非选中段淡出。
 */
export function Donut({ segments, size = 108, thickness = 12, activeKey, center, label }: {
  segments: readonly { key: string; value: number; tone: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' }[]
  size?: number
  thickness?: number
  activeKey?: string | null
  center?: ReactNode
  label?: string
}): ReactNode {
  // Hover feedback belongs to the primitive: the caller may pin a segment
  // (`activeKey`) but should not have to re-implement angle math to get it.
  const [hovered, setHovered] = useState<string | null>(null)
  // `null` and `undefined` both mean "not controlled": the primitive owns the hover.
  const effective = activeKey === undefined || activeKey === null ? hovered : activeKey
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  // A visible break between segments plus a round cap is what makes a ring read as
  // composed parts rather than as one striped band. The gap is a fixed 2px of arc,
  // so it stays proportionate at any diameter.
  const gap = segments.filter(segment => segment.value > 0).length > 1 ? 2 : 0
  let cursor = 0
  // Hit-testing by angle rather than by the arc element: an SVG stroke is only
  // hittable on the ring itself, and pointers mostly land inside the hole.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHovered(segmentAtPoint(segments, event.clientX - rect.left - size / 2, event.clientY - rect.top - size / 2))
  }
  return <div className={cx('relative flex-none')} style={{ width: size, height: size }} role="img" aria-label={label}
    onPointerMove={onPointerMove} onPointerLeave={() => setHovered(null)}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-chart-track" />
      {total > 0 && segments.map(segment => {
        const share = Math.max(0, segment.value) / total
        const arc = Math.max(0.5, share * circumference - gap)
        const dash = `${arc.toFixed(2)} ${(circumference - arc).toFixed(2)}`
        const offset = -cursor * circumference
        cursor += share
        const tone = TONE[segment.tone]
        return <circle key={segment.key} cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round"
          className={cx('transition-opacity duration-200', tone, effective !== null && effective !== segment.key && 'opacity-25')}

          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      })}
    </svg>
    {center !== undefined && <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>}
  </div>
}

const TONE = {
  'chart-1': 'stroke-chart-1',
  'chart-2': 'stroke-chart-2',
  'chart-3': 'stroke-chart-3',
  'chart-4': 'stroke-chart-4',
  'chart-5': 'stroke-chart-5',
} as const
