/**
 * 动效原语。
 *
 * 只有两条规矩，但两条都很硬：
 * 1. **只动 opacity / filter / 颜色**，不动 `transform`。卡片的位置由 React Grid
 *    Layout 用 transform 写，任何在这里出现的 translate/scale 都会被下一帧覆盖，
 *    表现为“动画抽搐”。
 * 2. **能关掉**。`prefers-reduced-motion` 自动生效；测试里给 `<html>` 加
 *    `data-motion="off"` 也能一次性关掉，避免截图脚本和 Playwright 断言被动画时序
 *    拖累。
 *
 * @module @vlln/dsh-home/client/ui/motion
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from './lib/cx.ts'

/**
 * 入场：从略模糊淡入，按 `index` 错峰。
 *
 * 错峰只用 `animation-delay`，不用 JS 计时器；卡片再多也只有一条 CSS 规则。
 */
export function Reveal({ index = 0, children, className }: {
  index?: number
  children: ReactNode
  className?: string
}): ReactNode {
  return <div className={cx('dsh-enter h-full min-h-0', className)} style={{ '--dsh-enter-index': index } as React.CSSProperties}>
    {children}
  </div>
}

/**
 * 数字滚动。值变化时从上一值补到新值；首帧直接显示目标值，避免“从 0 涨上来”的
 * 假动效——卡片挂载时看到的应该就是真数据。
 *
 * 返回当前应显示的数字与是否仍在动（用于决定要不要加 tabular 类）。
 */
export function useCountUp(value: number, options: { duration?: number } = {}): { current: number; animating: boolean } {
  const duration = options.duration ?? 420
  const [current, setCurrent] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (!Number.isFinite(from) || from === value || typeof window === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
      || document.documentElement.dataset.motion === 'off') {
      fromRef.current = value
      setCurrent(value)
      return
    }
    const start = performance.now()
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic：先快后慢，读数落定得早。
      const eased = 1 - (1 - t) ** 3
      setCurrent(from + (value - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return { current, animating: current !== value }
}

/**
 * 测试与截图用的开关：`document.documentElement.dataset.motion = 'off'`。
 * 组件不需要知道它，CSS 里的一条规则会关掉全部动画与过渡。
 */
export function motionEnabled(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.dataset.motion === 'off') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true
}

/** 把 `useCountUp` 包成组件：值变化时滚到新值，格式化交给调用方。 */
export function CountUp({ value, format }: { value: number; format: (value: number) => string }): ReactNode {
  const { current } = useCountUp(value)
  return <>{format(current)}</>
}
