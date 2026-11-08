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
  return <div className={cx('flex min-w-0 items-baseline gap-1', className)}>
    <span className={cx('animate-number-fade text-display-4-semibold tabular-nums tracking-tight', color)}>{value}</span>
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
 * 空态：一句“为什么是空的”，必要时给一个动作。
 *
 * 空态要安静——不摆零、不放插图，只解释原因；`action` 只给真正能改变结果的那一个操作。
 */
export function CardEmpty({ title, detail, action, className }: {
  title: ReactNode
  detail?: ReactNode
  action?: ReactNode
  className?: string
}): ReactNode {
  return <div className={cx('flex h-full min-h-24 flex-col items-center justify-center gap-1.5 text-center', className)}>
    <span className="text-body-medium text-text-secondary">{title}</span>
    {detail !== undefined && <span className="max-w-[42ch] text-caption-1-medium text-text-tertiary">{detail}</span>}
    {action !== undefined && <div className="pt-1">{action}</div>}
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
