/** A workspace name as a capsule: the shape alone separates it from the session title.
 * Every capsule uses the same neutral fill — the colour does not encode which directory
 * this is, so a board never turns into a rainbow of unrelated accents. */
export function WorkspacePill({ label, cwd, title, unknown = false }: {
  label: string
  cwd?: string
  /** Full path for the native tooltip; the visible label stays the short suffix. */
  title?: string
  /** Neutral outline for "unknown directory"; never a fabricated identity. */
  unknown?: boolean
}) {
  return <span className="dsh-ws-pill" data-unknown={unknown ? 'true' : undefined}
    title={title ?? cwd}>{label}</span>
}
