/**
 * 单卡的错误边界：一个 widget（尤其是第三方经 `home.widget` 贡献的）抛错时，
 * 只让那一张卡变成一句提示，而不是把整页（乃至宿主的整块 UI）带走。
 *
 * 类组件是 React 里唯一能做错误边界的形式；这里刻意不依赖任何宿主服务。
 *
 * @module @vlln/dsh-home/client/boundary
 */

import { Component } from 'react'
import type { ReactNode } from 'react'

interface CardBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface CardBoundaryState {
  failed: boolean
}

/** 捕获子树渲染错误，渲染 fallback。 */
export class CardBoundary extends Component<CardBoundaryProps, CardBoundaryState> {
  state: CardBoundaryState = { failed: false }

  static getDerivedStateFromError(): CardBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    // 控制台留一条可定位的日志；页面上只显示一句人话。
    console.error('[dsh-home] widget failed:', error)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
