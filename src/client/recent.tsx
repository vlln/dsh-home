/**
 * 最近会话：最近五条，每条一行——状态点、标题、工作区、时间。
 *
 * 没有搜索框、没有工作目录下拉：4 列宽的摘要卡里这两个控件要占掉一整行 36px，把每条
 * 会话压成 28px 的单行，而这张卡本来就不是会话目录（要搜索去侧栏）。五条、每条更高，
 * 正好把固定高度的卡填满；剩下的总数写在页脚，卡片不滚动也不分页。
 */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { compactAgo } from './format.ts'
import type { RecentStatus, SessionStatusMap } from './session-model.ts'
import {
  cwdLabels, mergeRecentSessions, recentEmptyState, recentSessionStatus, RECENT_ROW_LIMIT,
} from './session-model.ts'
import { sessionDotState } from './session-row.tsx'
import { RowButton } from './ui/index.ts'
import type { WidgetProps } from './widgets.tsx'

export interface RecentProps extends WidgetProps {
  statuses?: SessionStatusMap
  statusSource?: 'runtime' | 'none'
}

/** 只有「在等你」的状态值得写成文字：其余状态由圆点承担，第二行保持安静。 */
function isWaiting(status: RecentStatus): boolean {
  return status === 'approval' || status === 'plan' || status === 'question'
}

/** Body only: registry/page supplies the standard widget shell and heading. */
export function RecentBody({ t, data, sessions, now, actions, statuses, statusSource, loading, loadError }: RecentProps): ReactNode {
  const all = useMemo(() => mergeRecentSessions(sessions, data?.sessions), [sessions, data?.sessions])
  const labels = useMemo(() => cwdLabels(all.map(session => session.cwd)), [all])
  const shown = all.slice(0, RECENT_ROW_LIMIT)
  const indexing = !loadError && (data === null ? loading !== false : data.scanning || data.scannedAt === null)
  const empty = recentEmptyState(all.length, indexing)
  // Omitted statusSource may accompany a supplied map; explicit 'none' means do not use it.
  const source = statusSource ?? (statuses === undefined ? 'none' : 'runtime')

  return (
    <div className="dsh-recent" data-status-source={source}>
      {empty === null ? (
        <ol className="dsh-recent-list flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
          {shown.map(session => {
            const title = session.title ?? t('recent.untitled')
            const workspace = session.cwd === undefined ? t('recent.unknownCwd') : labels.get(session.cwd) ?? session.cwd
            const status = recentSessionStatus(session, source === 'runtime' ? statuses?.get(session.id) : undefined)
            const statusLabel = t(`recent.status.${status}`)
            const trailing = session.lastAt === null ? t('recent.unknownActivity') : compactAgo(session.lastAt, now, t)
            return (
              <li key={session.id}>
                {/* One line per session: state dot, title, workspace, time. The workspace
                    used to be a 10px capsule on a second line, which cost 20px of height
                    per row and read as a tag rather than as context. */}
                <RowButton onClick={() => { actions.openSession(session.id) }} trailing={trailing}
                  data-session-id={session.id} data-status={status}
                  aria-label={`${title} · ${workspace} · ${statusLabel} · ${trailing}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="dsh-recent-dot flex-none" role="img" aria-label={statusLabel} title={statusLabel}>
                      <StateDot state={sessionDotState(status)} />
                    </span>
                    <span className="dsh-recent-title truncate">{title}</span>
                    <span className="dsh-recent-workspace shrink-0 truncate text-caption-1-medium text-text-tertiary">{workspace}</span>
                    {isWaiting(status) && <span className="dsh-recent-state shrink-0 text-caption-1-medium text-status-yellow-text">{statusLabel}</span>}
                  </span>
                </RowButton>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="dsh-empty" role="status">{t(loadError && all.length === 0 ? 'error.load' : `recent.${empty}`)}</div>
      )}

      <div className="dsh-recent-footer mt-1 flex items-center gap-2 border-t-0 pt-1 text-caption-1-medium text-text-tertiary">
        <span className="dsh-muted" role="status">{shown.length === all.length
          ? t('recent.countAll', { n: all.length })
          : t('recent.count', { shown: shown.length, total: all.length })}</span>
        {indexing && shown.length > 0 && <span className="dsh-muted" role="status">{t('recent.indexing')}</span>}
      </div>
    </div>
  )
}
