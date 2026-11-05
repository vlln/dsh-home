/** Decorative real-directory initial, never a fabricated avatar or status. */
import { directoryMark } from './widget-visual-model.ts'
export function DirectoryBadge({ cwd }: { cwd?: string }) {
  const { label, tone } = directoryMark(cwd)
  return <span className="dsh-directory-badge" data-tone={tone} aria-hidden="true">{label}</span>
}
