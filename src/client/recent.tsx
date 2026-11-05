/** Recent sessions: catalog + activity ledger, independent of focus/dismiss preferences. */
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FocusProps, SessionStatusMap } from './focus.tsx'
import { formatAgo } from './format.ts'
import type { WidgetProps } from './widgets.tsx'
import {
  cwdFilterValue, cwdLabels, filterRecentSessions, mergeRecentSessions, recentEmptyState,
  recentViewportPageSize, recentSessionStatus, shortSessionId,
} from './session-model.ts'

export interface RecentProps extends WidgetProps {
  statuses?: SessionStatusMap
  statusSource?: FocusProps['statusSource']
}

/** Body only: registry/page supplies the standard widget shell and heading. */
export function RecentBody({ t, data, sessions, now, actions, size, width, height, statuses, statusSource, loading, loadError }: RecentProps): ReactNode {
  const [query, setQuery] = useState('')
  const [directory, setDirectory] = useState('')
  const [extraPages, setExtraPages] = useState(0)
  const all = useMemo(() => mergeRecentSessions(sessions, data?.sessions), [sessions, data?.sessions])
  const labels = useMemo(() => cwdLabels(all.map(session => session.cwd)), [all])
  const directories = useMemo(() => [...labels].sort(([leftPath, left], [rightPath, right]) => (
    left < right ? -1 : left > right ? 1 : leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0
  )), [labels])
  const hasUnknownCwd = all.some(session => session.cwd === undefined)
  const matched = useMemo(() => filterRecentSessions(all, query, directory), [all, query, directory])
  const pageSize = recentViewportPageSize(size, width, height)
  const shown = matched.slice(0, pageSize * (1 + extraPages))
  const remaining = matched.length - shown.length
  const indexing = !loadError && (data === null ? loading !== false : data.scanning || data.scannedAt === null)
  const empty = recentEmptyState(all.length, matched.length, indexing)
  // Omitted statusSource may accompany a supplied map; explicit 'none' means do not use it.
  const source = statusSource ?? (statuses === undefined ? 'none' : 'runtime')

  return (
    <div className="dsh-recent" data-status-source={source}>
      <div className="dsh-recent-filters">
        <Input
          type="search"
          className="dsh-recent-search"
          aria-label={t('recent.search')}
          placeholder={t('recent.search')}
          value={query}
          onChange={event => { setQuery(event.currentTarget.value); setExtraPages(0) }}
        />
        {/* Native select supplies the keyboard interaction without a custom popup contract. */}
        <select
          className="dsh-recent-cwd"
          aria-label={t('recent.cwd')}
          value={directory}
          title={directory.startsWith(':') ? directory.slice(1) : t('recent.cwd')}
          onChange={event => { setDirectory(event.currentTarget.value); setExtraPages(0) }}
        >
          <option value="">{t('recent.allCwds')}</option>
          {hasUnknownCwd && <option value="?">{t('recent.unknownCwd')}</option>}
          {directories.map(([path, label]) => (
            <option key={path} value={cwdFilterValue(path)} title={path}>{label}</option>
          ))}
          {directory !== '' && !all.some(session => cwdFilterValue(session.cwd) === directory) && (
            <option value={directory}>{directory === '?' ? t('recent.unknownCwd') : directory.slice(1)}</option>
          )}
        </select>
      </div>

      {empty !== null ? (
        <div className="dsh-empty" role="status">{t(loadError && all.length === 0 ? 'error.load' : `recent.${empty}`)}</div>
      ) : (
        <div className="dsh-rows">
          {shown.map(session => {
            const status = recentSessionStatus(session, source === 'runtime' ? statuses?.get(session.id) : undefined)
            const title = session.title ?? t('recent.untitled')
            const cwd = session.cwd === undefined ? t('recent.unknownCwd') : labels.get(session.cwd) ?? session.cwd
            const activity = session.lastAt === null ? t('recent.unknownActivity')
              : t('recent.activity', { time: formatAgo(session.lastAt, now, t) })
            return (
              <button
                key={session.id}
                type="button"
                className="dsh-row dsh-recent-row"
                data-session-id={session.id}
                data-status={status}
                onClick={() => { actions.openSession(session.id) }}
              >
                <span className="dsh-row-top">
                  <span className="dsh-row-title" title={title}>{title}</span>
                  <span className="dsh-chip" data-tone={status === 'approval' || status === 'plan' || status === 'question' ? 'warn' : 'info'}>
                    {t(`recent.status.${status}`)}
                  </span>
                </span>
                <span className="dsh-row-meta dsh-recent-meta">
                  <span className="dsh-recent-path" title={session.cwd ?? t('recent.unknownCwd')}>{cwd}</span>
                  <span className="dsh-recent-id" title={session.id}>{shortSessionId(session.id)}</span>
                  <span title={session.lastAt === null ? undefined : new Date(session.lastAt).toISOString()}>{activity}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="dsh-recent-footer">
        <span className="dsh-muted" role="status">{t('recent.count', { shown: shown.length, total: matched.length })}</span>
        {remaining > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setExtraPages(pages => pages + 1) }}>
            {t('recent.more', { count: Math.min(pageSize, remaining) })}
          </Button>
        )}
        {indexing && shown.length > 0 && <span className="dsh-muted" role="status">{t('recent.indexing')}</span>}
      </div>
    </div>
  )
}
