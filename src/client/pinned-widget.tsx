/** Read-only native pins. All rows are mounted; the fixed card scrolls locally. */
import { useBuiltin } from './builtin-registration.tsx'
import { pinnedSessionRows } from './pinned-model.ts'
import { cwdLabels, recentSessionStatus, shortSessionId } from './session-model.ts'
import { formatAgo } from './format.ts'
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
      : <div className="dsh-rows dsh-pinned-rows">{rows.map(session => {
        const status = recentSessionStatus(session, statusSource === 'runtime' ? statuses.get(session.id) : undefined)
        const title = session.title ?? session.id
        return <button type="button" key={session.id} className="dsh-row dsh-recent-row" data-session-id={session.id} data-status={status}
          onClick={() => actions.openSession(session.id)}>
          <span className="dsh-row-top"><span className="dsh-row-title" title={title}>{title}</span>
            <span className="dsh-chip" data-tone={['approval','plan','question'].includes(status) ? 'warn' : 'info'}>{t(`recent.status.${status}`)}</span></span>
          <span className="dsh-row-meta dsh-recent-meta"><span className="dsh-recent-path" title={session.cwd}>{session.cwd ? labels.get(session.cwd) : t('recent.unknownCwd')}</span>
            <span className="dsh-recent-id" title={session.id}>{shortSessionId(session.id)}</span>
            <span>{session.lastAt === null ? t('recent.unknownActivity') : formatAgo(session.lastAt, state.now, t)}</span></span>
        </button>
      })}</div>}
  </div>
}
