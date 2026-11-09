/**
 * 卡片内部的四段结构：主值、说明、空态、骨架。
 *
 * 小组件不该自己决定字号、颜色、间距——那是外壳的事。这里把「一张卡长什么样」
 * 收敛成四个可组合的部件，新卡只要往里面填数据。
 *
 * 约定：
 * - 只在 `ui/index.ts` 之后使用，不直接引 Tailwind 类。
 * - 颜色只用语义 token（`text-text-primary` / `text-text-tertiary` / `--dsh-viz-*`）。
 * - 空态与骨架是**部件**，不是每张卡各写一遍的分支。
 *
 * @module @vlln/dsh-home/client/ui/parts
 */

import type { ReactNode } from 'react'
import { cx } from './lib/cx.ts'

/** 卡片正文：占满剩余高度，纵向排列。 */
export function CardBody({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={cx('flex h-full min-h-0 flex-col gap-2', className)}>{children}</div>
}

/**
 * 一个主值。整张卡的视线落点。
 *
 * `tone` 只表达状态，不表达装饰：默认墨色，`muted` 用于“没有数据”，
 * `positive`/`warning`/`danger` 分别对应做成 / 需要注意 / 出错。
 */
export function CardHero({ value, unit, tone = 'default', className }: {
  value: ReactNode
  unit?: ReactNode
  tone?: 'default' | 'muted' | 'positive' | 'warning' | 'danger'
  className?: string
}): ReactNode {
  const color = {
    default: 'text-text-primary',
    muted: 'text-text-tertiary',
    positive: 'text-status-lime-text',
    warning: 'text-status-yellow-text',
    danger: 'text-text-error-primary',
  }[tone]
  // 24/500 with tabular numerals, unit on the same baseline — the same recipe as
  // `.dsh-metric-value` in theme.css. It used to be 32/600, which made one card's
  // number twice the size of its neighbour's for no reason.
  return <div className={cx('flex min-w-0 items-baseline gap-1.5', className)}>
    <span className={cx('animate-number-fade text-title-1-medium tabular-nums tracking-tight', color)}>{value}</span>
    {unit !== undefined && <span className="text-caption-1-medium text-text-tertiary">{unit}</span>}
  </div>
}

/** 主值下面的一行说明：分项、口径、时间范围。 */
export function CardMeta({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={cx('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption-1-medium text-text-tertiary', className)}>{children}</div>
}

/** 卡片脚注：口径说明或次要动作，贴底对齐。 */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={cx('mt-auto flex items-center gap-2 pt-1', className)}>{children}</div>
}

/**
 * 一排小读数格（2–4 个）。
 *
 * BoardUI 的卡里，主图之外总有一排这样的小格子——一个数字一个标签，格子比卡面暗
 * 一级、没有边框。它的作用是让一张卡在任何数据量下都有结构：没有这一排时，数据一
 * 稀疏卡片就只剩一大块底色。
 */
export function StatGrid({ stats, className }: {
  stats: readonly { key: string; label: ReactNode; value: ReactNode; tone?: 'default' | 'positive' | 'warning' | 'accent' }[]
  className?: string
}): ReactNode {
  return <div className={cx('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${Math.max(1, stats.length)}, minmax(0, 1fr))` }}>
    {stats.map(stat => <div key={stat.key} className="flex min-w-0 flex-col gap-1 rounded-xl bg-[var(--dsh-sunken)] p-4">
      <span className="truncate text-body-medium text-text-tertiary">{stat.label}</span>
      <span className={cx('truncate text-title-2-medium tabular-nums', {
        default: 'text-text-primary',
        positive: 'text-status-lime-text',
        warning: 'text-status-yellow-text',
        accent: 'text-chart-4',
      }[stat.tone ?? 'default'])}>{stat.value}</span>
    </div>)}
  </div>
}

/**
 * 空态：一句"为什么是空的"，必要时给一个动作。
 *
 * 空态要安静，也要**贴左上**。居中一块大字加一个按钮是最容易写、也最难看的一种：
 * 卡片正文被压成一条水平线，上下各留一大块什么都没有的深色，三张空卡并排就像
 * 页面画了三个洞。这里改成正文左对齐、行高按内容走，剩余空间留给卡片自己的图形
 * （空轨道、空列表），而不是留给空白。
 */
export function CardEmpty({ title, detail, action, className }: {
  title: ReactNode
  detail?: ReactNode
  action?: ReactNode
  className?: string
}): ReactNode {
  return <div className={cx('flex min-w-0 flex-col items-start gap-1 text-left', className)}>
    <span className="text-body-medium text-text-secondary">{title}</span>
    {detail !== undefined && <span className="text-caption-1-medium text-text-tertiary">{detail}</span>}
    {action !== undefined && <div className="pt-1.5">{action}</div>}
  </div>
}

/**
 * 骨架：按内容的形状占位，而不是一句“加载中”。
 *
 * 传 `rows` 就按等宽行铺；不传就按整块图形铺。
 */
export function CardSkeleton({ rows, height = 12, className }: { rows?: number; height?: number; className?: string }): ReactNode {
  if (rows === undefined) return <div className={cx('flex h-full min-h-24 flex-col justify-center gap-2', className)}>
    <SkeletonBar width="60%" height={28} />
    <SkeletonBar width="40%" height={12} />
  </div>
  return <div className={cx('flex h-full flex-col justify-center gap-2', className)}>
    {Array.from({ length: rows }, (_, index) => <SkeletonBar key={index} width={index === 0 ? '80%' : '100%'} height={height} />)}
  </div>
}

function SkeletonBar({ width, height }: { width: string; height: number }): ReactNode {
  return <span className="block animate-pulse rounded-md bg-background-secondary-default" style={{ width, height }} aria-hidden="true" />
}

/**
 * 错误态：一张卡坏了只有这张卡坏。
 *
 * 和空态同一套几何，只是语气不同：说清楚"哪里没读到"，给一个重试，不要把异常
 * 直接摊在卡面上。
 */
export function CardError({ title, detail, action, className }: {
  title: ReactNode
  detail?: ReactNode
  action?: ReactNode
  className?: string
}): ReactNode {
  return <div className={cx('flex h-full min-h-24 flex-col items-center justify-center gap-1.5 text-center', className)} role="alert">
    <span className="text-body-medium text-text-error-primary">{title}</span>
    {detail !== undefined && <span className="max-w-[42ch] text-caption-1-medium text-text-tertiary">{detail}</span>}
    {action !== undefined && <div className="pt-1">{action}</div>}
  </div>
}
