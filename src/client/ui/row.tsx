/**
 * 列表行。
 *
 * 卡片里的“一行一条”是最常见的形状：最近会话、工作区、快捷入口、待办。它不该每张卡
 * 各写一遍 hover / focus / 截断——那正是上一版里三张卡三套行样式、高度各差 2px 的原因。
 *
 * 一行只允许三段：主标签（可截断）、可选副标签、右端读数。整行可点，不是“标签里再套
 * 一个小按钮”；整行没有边框，hover 时才浮出一层表面。
 *
 * @module @vlln/dsh-home/client/ui/row
 */

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './lib/cx.ts'

const ROW = [
  'group flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left',
  'text-body-medium text-text-secondary transition-colors duration-150',
  'hover:bg-background-primary-hover hover:text-text-primary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
  'disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent',
].join(' ')

export interface RowProps {
  children: ReactNode
  /** 右端读数：时长、计数、时间。永远单行、tabular。 */
  trailing?: ReactNode
  className?: string
}

function Body({ children, trailing }: Pick<RowProps, 'children' | 'trailing'>): ReactNode {
  return <>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {trailing !== undefined && <span className="flex shrink-0 items-center gap-2 text-caption-1-medium tabular-nums text-text-tertiary">{trailing}</span>}
  </>
}

/** 可点的行：按钮语义。 */
export function RowButton({ children, trailing, className, ...props }: RowProps & ButtonHTMLAttributes<HTMLButtonElement>): ReactNode {
  return <button type="button" className={cx(ROW, className)} {...props}><Body trailing={trailing}>{children}</Body></button>
}

/** 可点的行：链接语义（打开外部地址时才用，不要拿按钮冒充导航）。 */
export function RowLink({ children, trailing, className, ...props }: RowProps & AnchorHTMLAttributes<HTMLAnchorElement>): ReactNode {
  return <a className={cx(ROW, className)} {...props}><Body trailing={trailing}>{children}</Body></a>
}

/** 不可点的行：纯展示。 */
export function Row({ children, trailing, className }: RowProps): ReactNode {
  return <div className={cx(ROW, 'hover:bg-transparent hover:text-text-secondary', className)}><Body trailing={trailing}>{children}</Body></div>
}
