/**
 * The one card shell. Every place that shows a widget card — the board, the "Add widgets"
 * list, and the card you drag out of it — renders through this, so there is a single answer
 * to "what is a card": same padding, radius, radius scale (`data-size`), header slot and body.
 *
 * Three hand-written shells is what made the drag preview look like a different product:
 * the tray used `dsh-directory-item`, the ghost used a bare `dsh-w`, and only the board used
 * the real card classes.
 */
import type { CSSProperties, ReactNode } from 'react'
import { cx } from './ui/index.ts'

export function WidgetCardShell({ size, editing = false, className, children, ...rest }: {
  size: string
  editing?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
  [key: `data-${string}`]: unknown
}) {
  return <section
    className={cx('dsh-card dsh-home-widget', className)}
    data-size={size}
    data-editing={String(editing)}
    {...rest}>{children}</section>
}

/** The body slot. `inert` while editing: the card is being arranged, not used. */
export function WidgetCardBody({ editing = false, children }: { editing?: boolean; children: ReactNode }) {
  return <div className="dsh-card-body dsh-home-widget-content" inert={editing || undefined}>{children}</div>
}
