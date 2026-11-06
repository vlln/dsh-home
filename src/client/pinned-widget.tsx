/** Read-only native pins. All rows are mounted; the fixed card scrolls locally. */
import { useBuiltin } from './builtin-registration.tsx'
import { pinnedSessionRows } from './pinned-model.ts'
import { cwdLabels, recentSessionStatus } from './session-model.ts'
import { SessionRow } from './session-row.tsx'
export function PinnedBody() {
  const { state, t, actions, statuses, statusSource } = useBuiltin()
  const pins = state.nativePins
  const rows = pinnedSessionRows(pins, state.sessions)
  const labels = cwdLabels(rows.map(row => row.cwd))
  const stateKey = !pins || pins.status === 'unavailable' ? 'pinned.unavailable'
    : pins.status === 'pending' ? 'pinned.loading' : pins.status === 'error' ? 'pinned.error' : 'pinned.empty'
  return <div className="dsh-pinned" data-status-source={statusSource}>
    <div className="dsh-pinned-summary"><strong>{t('pinned.count', { count: rows.length })}</strong><span>{t('pinned.order')}</span></div>
    {pins?.status === 'error' && rows.length > 0 && <p className="dsh-muted" role="alert">{t('pinned.error')}</p>}
    {rows.length === 0 ? <div className="dsh-empty" role="status"><span>{t(stateKey)}</span>{pins?.status === 'ready' && <span className="dsh-muted">{t('pinned.hint')}</span>}</div>
      : <div className="dsh-rows dsh-pinned-rows">{rows.map(session => <SessionRow
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
