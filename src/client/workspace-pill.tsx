/** A workspace name as a capsule: the shape alone separates it from the session title.
 * Every capsule uses the same neutral fill — the colour does not encode which directory
 * this is, so a board never turns into a rainbow of unrelated accents. */
import type { ReactNode } from 'react'
import { cx } from './ui/index.ts'

export function WorkspacePill({ label, cwd, title, unknown = false }: {
  label: string
  cwd?: string
  /** Full path for the native tooltip; the visible label stays the short suffix. */
  title?: string
  /** Neutral outline for "unknown directory"; never a fabricated identity. */
  unknown?: boolean
}): ReactNode {
  return <span
    className={cx(
      'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10px] leading-none',
      unknown === true
        ? 'border border-border-button-default text-text-tertiary'
        : 'bg-background-tertiary-default text-text-secondary',
    )}
    data-unknown={unknown ? 'true' : undefined}
    title={title ?? cwd}>{label}</span>
}
