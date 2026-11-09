/**
 * The one card shell. Every place that shows a widget card — the board, the "Add widgets"
 * list, and the card you drag out of it — renders through this, so there is a single answer
 * to "what is a card": same padding, radius, radius scale (`data-size`), header slot and body.
 *
 * Three hand-written shells is what made the drag preview look like a different product:
 * the tray used `dsh-directory-item`, the ghost used a bare `dsh-w`, and only the board used
 * the real card classes.
 */
import { forwardRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cx } from './ui/index.ts'

export type WidgetCardShellProps = {
  size: string
  editing?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
  [key: `data-${string}`]: unknown
}

/** The ref matters: the board's drag library attaches its listeners and measuring node to
 *  this element. Without forwarding it, cards stop being draggable at all — which is what
 *  happened when this shell was introduced. */
export const WidgetCardShell = forwardRef<HTMLElement, WidgetCardShellProps>(function WidgetCardShell(
  { size, editing = false, className, children, ...rest }, ref,
) {
  return <section
    ref={ref}
    className={cx('dsh-card dsh-home-widget', className)}
    data-size={size}
    data-editing={String(editing)}
    {...rest}>{children}</section>
})

/** The body slot. `inert` while editing: the card is being arranged, not used. */
export function WidgetCardBody({ editing = false, children }: { editing?: boolean; children: ReactNode }) {
  return <div className="dsh-card-body dsh-home-widget-content" inert={editing || undefined}>{children}</div>
}
