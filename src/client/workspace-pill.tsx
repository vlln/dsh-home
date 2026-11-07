/** A workspace name as a colored capsule: one glance tells it apart from the session title.
 * The colour comes from the path only (never from status), so the same directory keeps
 * the same capsule everywhere on the board. */
import { workspaceHue } from './session-model.ts'

export function WorkspacePill({ label, cwd, title, unknown = false }: {
  label: string
  cwd?: string
  /** Full path for the native tooltip; the visible label stays the short suffix. */
  title?: string
  /** Neutral capsule for "unknown directory"; never a fabricated colour identity. */
  unknown?: boolean
}) {
  return <span className="dsh-ws-pill" data-unknown={unknown ? 'true' : undefined}
    data-hue={unknown ? undefined : workspaceHue(cwd ?? label)} title={title ?? cwd}>{label}</span>
}
