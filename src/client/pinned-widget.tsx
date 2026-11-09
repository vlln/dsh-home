/** Read-only native pins: the card shows as many rows as fit, never a scrollbar. */
import { useRef } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useVisibleRows } from './fit-rows.ts'
import { pinnedSessionRows } from './pinned-model.ts'
import { cwdLabels, recentSessionStatus } from './session-model.ts'
import { SessionRow } from './session-row.tsx'
import { CardEmpty } from './ui/index.ts'
export function PinnedBody() {
  const { state, t, actions, statuses, statusSource } = useBuiltin()
  const pins = state.nativePins
  const rows = pinnedSessionRows(pins, state.sessions)
  const rowsRef = useRef<HTMLDivElement>(null)
  const capacity = useVisibleRows(rowsRef, '.dsh-session-line')
  const shown = capacity === null ? rows : rows.slice(0, capacity)
  const labels = cwdLabels(rows.map(row => row.cwd))
  const stateKey = !pins || pins.status === 'unavailable' ? 'pinned.unavailable'
    : pins.status === 'pending' ? 'pinned.loading' : pins.status === 'error' ? 'pinned.error' : 'pinned.empty'
  return <div className="dsh-pinned" data-status-source={statusSource}>
    <div className="dsh-pinned-summary"><strong>{t('pinned.count', { count: rows.length })}</strong>
      {shown.length < rows.length && <span>{t('pinned.visible', { shown: shown.length, total: rows.length })}</span>}</div>
    {pins?.status === 'error' && rows.length > 0 && <p className="dsh-muted" role="alert">{t('pinned.error')}</p>}
    {rows.length === 0 ? <CardEmpty title={t(stateKey)} detail={pins?.status === 'ready' ? t('pinned.hint') : undefined} />
      : <div className="dsh-rows dsh-pinned-rows" ref={rowsRef}>{shown.map(session => <SessionRow
        key={session.id}
        session={session}
        title={session.title ?? t('recent.untitled')}
        workspace={session.cwd === undefined ? t('recent.unknownCwd') : labels.get(session.cwd) ?? session.cwd}
        workspaceTitle={session.cwd}
        status={recentSessionStatus(session, statusSource === 'runtime' ? statuses.get(session.id) : undefined)}
        now={state.now}
        t={t}
        onOpen={() => { actions.openSession(session.id) }}
      />)}</div>}
  </div>
}
