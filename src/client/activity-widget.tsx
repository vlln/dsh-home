import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { post } from './api.ts'
import { useBuiltin } from './builtin-registration.tsx'
import { activityLevel, activityWeeks, shiftCalendarDay, validateActivityConfig, type ActivityConfig, type ActivitySnapshot } from './activity-model.ts'
import type { WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { Translate } from './format.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'

function browserZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
function useActivity(cwd: string, date?: string, preview?: WidgetContentProps['preview']) {
  const { state } = useBuiltin()
  const [loaded, setLoaded] = useState<{ value: ActivitySnapshot; cwd: string; zone: string; date?: string } | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const zone = browserZone()
  useEffect(() => {
    if (preview) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let deadline: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    setError(false)
    const load = async () => {
      controller = new AbortController()
      const request = controller
      setLoading(true)
      deadline = setTimeout(() => { request.abort() }, 15_000)
      try {
        const value = await post<ActivitySnapshot>('activity', { cwd, timeZone: zone, ...(date ? { date } : {}) }, request.signal)
        if (!active) return
        setLoaded({ value, cwd, zone, date }); setError(false)
        if (value.scanning) timer = setTimeout(() => { void load() }, 3000)
      } catch { if (active) setError(true) }
      finally { clearTimeout(deadline); if (active) setLoading(false) }
    }
    void load()
    return () => { active = false; clearTimeout(timer); clearTimeout(deadline); controller?.abort() }
  }, [cwd, zone, date, retry, state.lastLoadedAt, preview])
  if (preview) {
    const sample = preview.data
    const valid = sample !== null && typeof sample === 'object' && !Array.isArray(sample)
      && typeof sample.today === 'string' && Array.isArray(sample.days) && Array.isArray(sample.sessions)
    const result: ActivitySnapshot = valid ? sample as unknown as ActivitySnapshot : {
      generatedAt: 0, timeZone: 'UTC', today: '2026-10-20', days: [], workspaces: [], available: true,
      complete: true, failed: 0, scanError: false, scanning: false, progress: { done: 0, total: 0 }, sessions: [], matchedSessions: 0,
    }
    return { result, error: false, loading: false, detailReady: true, retry: () => {} }
  }
  // Keep the calendar mounted during same-workspace refreshes and day selection. Never
  // show another workspace/zone's data or a previous selected day's session results.
  const result = loaded?.cwd === cwd && loaded.zone === zone ? loaded.value : null
  const detailReady = result !== null && loaded?.date === date
  return { result, error, loading, detailReady, retry: () => setRetry(n => n + 1) }
}
function ActivityContent(props: WidgetContentProps<ActivityConfig>) {
  const { t } = useBuiltin()
  return <ActivityBody {...props} editor={<WidgetConfigEditor t={t} widgetProps={props} title={t('activity.title')} label={t('activity.edit')}
    Fields={ActivitySettings} validate={validateActivityConfig} />} />
}
function ActivityBody({ config, width, preview, editor }: WidgetContentProps<ActivityConfig> & { editor?: ReactNode }) {
  const { t, state, actions } = useBuiltin()
  const [date, setDate] = useState<string>()
  const { result, error, loading, detailReady, retry } = useActivity(config.cwd, date, preview)
  const calendar = useRef<HTMLDivElement>(null)
  const ready = result !== null && result.available
  useEffect(() => {
    if (preview) return
    // An explicitly selected year may scroll inside a narrow card. Start at the latest
    // days rather than hiding all recent activity; ordinary data refreshes keep position.
    const node = calendar.current
    if (ready && node) node.scrollLeft = node.scrollWidth
  }, [ready, config.cwd, config.range, preview])
  if (!result && error) return <><div className="dsh-empty" role="alert">{t('activity.error')}<Button size="sm" variant="outline" onClick={retry}>{t('activity.retry')}</Button></div>{editor}</>
  if (!result) return <><div className="dsh-empty" role="status">{t('activity.loading')}</div>{editor}</>
  if (!result.available) return <><div className="dsh-empty">{t('activity.unavailable')}</div>{editor}</>
  const { weeks, count, first } = activityWeeks(result.days, result.today, width, config.range)
  const days = result.days.filter(day => day.key >= first)
  const active = days.filter(day => day.messages > 0).length
  const messages = days.reduce((n, day) => n + day.messages, 0)
  const dayLabel = (day: {key: string; messages: number; sessions: number}) => t(result.complete ? 'activity.day' : 'activity.partialDay', { date: day.key, messages: day.messages, sessions: day.sessions })
  return <div className="dsh-activity" data-activity-complete={result.complete} data-activity-range={count === 365 ? 'year' : 'quarter'}>
    <div className="dsh-activity-summary" aria-label={t('activity.summary', { days: count, active, messages })}>
      <div className="dsh-activity-primary"><strong className="dsh-activity-number">{active}</strong><span>{t('activity.activeDays')}</span></div>
      <div className="dsh-activity-secondary"><span>{t('activity.period', { days: count })}</span><span>{t('activity.messages', { count: messages })}</span></div>
    </div>
    {error && <div className="dsh-muted" role="alert">{t('activity.error')}<Button size="sm" variant="outline" onClick={retry}>{t('activity.retry')}</Button></div>}
    <div ref={calendar} className="dsh-activity-scroll" tabIndex={0} aria-label={t('activity.metric')}>
      <div className="dsh-activity-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--dsh-activity-cell-size))` }}>
        {weeks.map((week, i) => <div className="dsh-activity-week" key={i}>
          <span className="dsh-activity-month" aria-hidden="true">{week.find(day => day?.key.endsWith('-01'))?.key.slice(5, 7) ?? ''}</span>
          {week.map((day, j) => day ? <button type="button" className="dsh-activity-cell" key={day.key}
            data-date={day.key} data-level={activityLevel(day.messages)} data-selected={date === day.key} data-unknown={!result.complete && day.messages === 0}
            aria-label={dayLabel(day)} aria-pressed={date === day.key} title={dayLabel(day)} onClick={() => setDate(day.key)} />
            : <span className="dsh-activity-cell dsh-activity-spacer" key={`pad${j}`} />)}
        </div>)}
      </div>
    </div>
    <div className="dsh-activity-legend"><span>{t('activity.less')}</span>{[0,1,2,3,4].map(level => <span key={level} className="dsh-activity-cell" data-level={level} />)}<span>{t('activity.more')}</span></div>
    {!result.complete && <p className="dsh-muted" role="status">{t(result.scanning ? 'activity.partial' : 'activity.incomplete', result.progress)}</p>}
    {result.complete && messages === 0 && <p className="dsh-muted">{t('activity.empty')}</p>}
    <div className="dsh-activity-footer"><span className="dsh-muted">{t('activity.zone', { zone: result.timeZone })}</span>{editor}</div>
    {date && <section className="dsh-activity-detail" aria-label={t('activity.detail', { date })} aria-busy={loading || (!detailReady && !error)}>
      <strong>{t('activity.detail', { date })}</strong>
      {!detailReady ? <p className="dsh-muted" role="status">{t(error ? 'activity.error' : 'activity.loading')}</p>
        : result.sessions.length === 0 ? <p className="dsh-muted">{t(result.complete ? 'activity.dateEmpty' : 'activity.dateUnknown')}</p>
        : result.sessions.map(session => <button type="button" key={session.id} className="dsh-row" onClick={() => actions.openSession(session.id)}>
          <span className="dsh-row-title">{state.sessions[session.id]?.title?.trim() || session.cwd?.split('/').filter(Boolean).pop() || session.id}</span>
          <span className="dsh-row-meta">{t('activity.messages', { count: session.messages })}</span>
        </button>)}
      {detailReady && result.matchedSessions > 100 && <span className="dsh-muted">{t('activity.detailCount', { count: result.matchedSessions })}</span>}
    </section>}
  </div>
}
function ActivitySettings({ config, onConfigChange }: WidgetSettingsProps<ActivityConfig>) {
  const { t } = useBuiltin()
  const { result, error, retry } = useActivity('')
  return <>
    {error && <div className="dsh-muted" role="alert">{t('activity.error')}<Button size="sm" variant="outline" onClick={retry}>{t('activity.retry')}</Button></div>}
    <label className="dsh-settings-field">{t('activity.cwd')}<select value={config.cwd} onChange={event => onConfigChange({ ...config, cwd: event.target.value })}>
      <option value="">{t('activity.all')}</option>
      {config.cwd && !result?.workspaces.includes(config.cwd) && <option value={config.cwd}>{config.cwd}</option>}
      {result?.workspaces.map(cwd => <option value={cwd} key={cwd}>{cwd}</option>)}
    </select></label>
    <label className="dsh-settings-field">{t('activity.range')}<select value={config.range} onChange={event => onConfigChange({ ...config, range: event.target.value as ActivityConfig['range'] })}>
      {(['auto', 'quarter', 'year'] as const).map(value => <option value={value} key={value}>{t(`activity.${value}`)}</option>)}
    </select></label>
  </>
}
export function registerActivityWidget(registry: HomeWidgetRegistry, t: Translate) {
  return registry.register<ActivityConfig>({ typeId: '@vlln/dsh-home:activity', apiVersion: 1,
    title: () => t('activity.title'), description: () => t('activity.description'), source: '@vlln/dsh-home',
    preview: { data: {
      generatedAt: Date.UTC(2026, 9, 20, 10, 24), timeZone: 'UTC', today: '2026-10-20',
      days: Array.from({ length: 84 }, (_, i) => ({ key: shiftCalendarDay('2026-10-20', i - 83), messages: (i * 7 + Math.floor(i / 9)) % 15, sessions: i % 3 })),
      workspaces: [], available: true, complete: true, failed: 0, scanError: false, scanning: false,
      progress: { done: 3, total: 3 }, sessions: [], matchedSessions: 0,
    } }, sizing: { default: '8x6', supported: ['4x8', '8x6', '8x8', '8x12', '12x6', '12x8'] }, configVersion: 1,
    defaultConfig: () => ({ cwd: '', range: 'auto' }), validateConfig: validateActivityConfig,
    Content: ActivityContent })
}
