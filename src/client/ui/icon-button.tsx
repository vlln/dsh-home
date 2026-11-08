/**
 * 无底色的图标按钮。
 *
 * BoardUI 的 `ghost` 变体并不是"透明"，而是一块 accent-100 / accent-900 的**着色面**：
 * 放进标题行就变成一枚蓝色小方块，读起来像一个角标而不是按钮。（上一版首页的 "Home"
 * 旁边那颗蓝方块就是这么来的。）凡是"标题旁边那个小图标"，都用这个：无底色、次级墨、
 * hover 才浮出表面。
 *
 * @module @vlln/dsh-home/client/ui/icon-button
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './lib/cx.ts'

export function IconButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>): ReactNode {
  return <button type="button" className={cx(
    'inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-caption-1-medium text-text-tertiary',
    'hover:bg-background-primary-hover hover:text-text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
    'disabled:cursor-not-allowed disabled:text-text-disabled',
    className,
  )} {...props}>{children}</button>
}
