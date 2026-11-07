/** Recent sessions: catalog + activity ledger, independent of focus/dismiss preferences. */
import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { useVisibleRows } from './fit-rows.ts'
import type { SessionStatusMap } from './session-model.ts'
import { SessionRow } from './session-row.tsx'
import type { WidgetProps } from './widgets.tsx'
import {
  cwdFilterValue, cwdLabels, filterRecentSessions, mergeRecentSessions, recentEmptyState,
  recentViewportPageSize, recentSessionStatus,
} from './session-model.ts'

export interface RecentProps extends WidgetProps {
  statuses?: SessionStatusMap
  statusSource?: 'runtime' | 'none'
}

/** Body only: registry/page supplies the standard widget shell and heading. */
export function RecentBody({ t, data, sessions, now, actions, size, width, height, statuses, statusSource, loading, loadError }: RecentProps): ReactNode {
  const [query, setQuery] = useState('')
  const [directory, setDirectory] = useState('')
  const rowsRef = useRef<HTMLDivElement>(null)
  const all = useMemo(() => mergeRecentSessions(sessions, data?.sessions), [sessions, data?.sessions])
  const labels = useMemo(() => cwdLabels(all.map(session => session.cwd)), [all])
  const directories = useMemo(() => [...labels].sort(([leftPath, left], [rightPath, right]) => (
    left < right ? -1 : left > right ? 1 : leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0
  )), [labels])
  const hasUnknownCwd = all.some(session => session.cwd === undefined)
  const matched = useMemo(() => filterRecentSessions(all, query, directory), [all, query, directory])
  // A first estimate paints immediately; the measured capacity then decides the real cut.
  const estimate = recentViewportPageSize(size, width, height)
  const capacity = useVisibleRows(rowsRef, '.dsh-session-line')
  const shown = matched.slice(0, capacity ?? estimate)
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
          onChange={event => { setQuery(event.currentTarget.value) }}
        />
        {/* Native select supplies the keyboard interaction without a custom popup contract. */}
        <select
          className="dsh-recent-cwd"
          aria-label={t('recent.cwd')}
          value={directory}
          title={directory.startsWith(':') ? directory.slice(1) : t('recent.cwd')}
          onChange={event => { setDirectory(event.currentTarget.value) }}
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
        <div className="dsh-rows" ref={rowsRef}>
          {shown.map(session => <SessionRow
            key={session.id}
            session={session}
            title={session.title ?? t('recent.untitled')}
            workspace={session.cwd === undefined ? t('recent.unknownCwd') : labels.get(session.cwd) ?? session.cwd}
            workspaceTitle={session.cwd}
            status={recentSessionStatus(session, source === 'runtime' ? statuses?.get(session.id) : undefined)}
            now={now}
            t={t}
            onOpen={() => { actions.openSession(session.id) }}
          />)}
        </div>
      )}

      <div className="dsh-recent-footer">
        <span className="dsh-muted" role="status">{t('recent.count', { shown: shown.length, total: matched.length })}</span>
        {indexing && shown.length > 0 && <span className="dsh-muted" role="status">{t('recent.indexing')}</span>}
      </div>
    </div>
  )
}
