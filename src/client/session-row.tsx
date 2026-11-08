/** One session row shared by recent, pinned and the session-status views.
 *
 * Reading order is the one the eye needs first: state dot → workspace capsule →
 * session title → time. The dot moved to the far left so a column of rows can be
 * scanned by state without reading any text; the capsule gives the workspace a
 * surface of its own, so it no longer competes with the title.
 */
import type { ReactNode } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import { compactAgo, type Translate } from './format.ts'
import type { RecentSession, RecentStatus } from './session-model.ts'
import { RowButton } from './ui/index.ts'
import { Button, Chip } from './ui/index.ts'

const DOT: Record<RecentStatus, StateDotState> = {
  approval: 'warning', plan: 'warning', question: 'warning',
  running: 'ongoing', unread: 'done', idle: 'idle', unknown: 'idle',
}

/** 状态 → 宿主圆点。等待类是琥珀、在跑是绿、未读是蓝，颜色只表示语义。 */
export function sessionDotState(status: RecentStatus): StateDotState {
  return DOT[status]
}

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
  /** Waiting rows explain *why* in place of the plain time. */
  reason?: string
  /** Waiting rows can be muted until the session has new activity. */
  onDismiss?: () => void
}

export function SessionRow({
  session, title, workspace, workspaceTitle, status, now, t, onOpen, reason, onDismiss,
}: SessionRowProps): ReactNode {
  const trailing = session.lastAt === null ? t('recent.unknownActivity') : compactAgo(session.lastAt, now, t)
  const statusLabel = t(`recent.status.${status}`)
  return <div className="group/row relative flex items-center" data-dismissible={onDismiss === undefined ? undefined : 'true'}>
    <RowButton
      data-session-id={session.id}
      data-status={status}
      aria-label={`${title} · ${workspace} · ${statusLabel}`}
      onClick={onOpen}
      trailing={trailing}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="dsh-session-status flex-none" role="img" aria-label={statusLabel} title={statusLabel}>
          <StateDot state={DOT[status]} />
        </span>
        <span className="dsh-session-title truncate text-text-primary" title={title}>{title}</span>
        <span className="dsh-session-workspace shrink-0 truncate text-caption-1-medium text-text-tertiary" title={workspaceTitle ?? workspace}>{workspace}</span>
        {reason !== undefined && <Chip variant="caption" color="yellow">{reason}</Chip>}
      </span>
    </RowButton>
    {onDismiss !== undefined && <Button variant="ghost" size="xs" className="dsh-session-dismiss ml-1 flex-none opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
      aria-label={t('queue.dismiss')} title={t('queue.dismiss')} onClick={onDismiss}>×</Button>}
  </div>
}
