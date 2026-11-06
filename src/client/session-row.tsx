/** One session row shared by the recent and pinned lists.
 *
 * The name reads as a two-tone plate: the workspace on a tinted segment, the session
 * title on the card surface. Status follows the native sidebar: a `StateDot` with the
 * same precedence (pending interaction → amber, running → ongoing, completed → done)
 * and the native compact trailing label instead of the verbosity we used to print
 * (paths, short IDs, "Last active …").
 */
import type { ReactNode } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import { compactAgo, type Translate } from './format.ts'
import type { RecentSession, RecentStatus } from './session-model.ts'

const DOT: Record<RecentStatus, StateDotState> = {
  approval: 'warning', plan: 'warning', question: 'warning',
  running: 'ongoing', unread: 'done', idle: 'idle', unknown: 'idle',
}

const PENDING = new Set<RecentStatus>(['approval', 'plan', 'question'])

export interface SessionRowProps {
  session: Pick<RecentSession, 'id' | 'lastAt'>
  title: string
  /** Short workspace label (unique trailing path segment), never the full path. */
  workspace: string
  workspaceTitle?: string
  status: RecentStatus
  now: number
  t: Translate
  onOpen: () => void
}

export function SessionRow({ session, title, workspace, workspaceTitle, status, now, t, onOpen }: SessionRowProps): ReactNode {
  // Native precedence: a pending interaction replaces the timestamp with its compact
  // label; everything else keeps the relative time.
  const trailing = PENDING.has(status) ? t(`recent.compact.${status}`)
    : session.lastAt === null ? t('recent.unknownActivity') : compactAgo(session.lastAt, now, t)
  const statusLabel = t(`recent.status.${status}`)
  return <button
    type="button"
    className="dsh-row dsh-session-row"
    data-session-id={session.id}
    data-status={status}
    aria-label={`${title} · ${workspace} · ${statusLabel}`}
    onClick={onOpen}
  >
    <span className="dsh-session-plate">
      <span className="dsh-session-workspace" title={workspaceTitle ?? workspace}>{workspace}</span>
      <span className="dsh-session-title" title={title}>{title}</span>
    </span>
    <span className="dsh-session-status" role="img" aria-label={statusLabel} title={statusLabel}>
      <StateDot state={DOT[status]} />
    </span>
    <span className="dsh-session-trailing" aria-hidden="true">{trailing}</span>
  </button>
}
