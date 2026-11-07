import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { post } from './api.ts'
import { useBuiltin } from './builtin-registration.tsx'
import { activityLevel, activityPreviewSnapshot, activityWeeks, migrateActivityConfig, validateActivityConfig, type ActivityConfig, type ActivitySnapshot } from './activity-model.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { Translate } from './format.ts'
import { useVisibleRows } from './fit-rows.ts'
import { IconActivity } from './widget-glyphs.tsx'

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
  return <ActivityBody {...props} />
}
function ActivityBody({ config, width, height, preview, saveConfig }: WidgetContentProps<ActivityConfig>) {
  const { t, state, actions } = useBuiltin()
  const [date, setDate] = useState<string>()
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const { result, error, loading, detailReady, retry } = useActivity('', date, preview)
  const calendar = useRef<HTMLDivElement>(null)
  // The chart box is measured, not guessed: cell size is derived from the height the
  // card actually has left, so a wrapped caption can never push the grid out of the card.
  const [chart, setChart] = useState<{ w: number; h: number } | null>(null)
  const ready = result !== null && result.available
  useLayoutEffect(() => {
    const node = calendar.current
    if (node === null) return
    const measure = (): void => {
      const w = node.clientWidth
      const h = node.clientHeight
      setChart(previous => previous !== null && previous.w === w && previous.h === h ? previous : { w, h })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [result])
  useEffect(() => {
    if (preview) return
    // An explicitly selected year may scroll inside a narrow card. Start at the latest
    // days rather than hiding all recent activity; ordinary data refreshes keep position.
    const node = calendar.current
    if (ready && node) node.scrollLeft = node.scrollWidth
  }, [ready, config.range, preview])
  if (!result && error) return <div className="dsh-empty" role="alert">{t('activity.error')}<Button size="sm" variant="outline" onClick={retry}>{t('activity.retry')}</Button></div>
  if (!result) return <div className="dsh-empty" role="status">{t('activity.loading')}</div>
  if (!result.available) return <div className="dsh-empty">{t('activity.unavailable')}</div>
  const { weeks, count, first, cellSize, chartWidth, blocks, gap } = activityWeeks(result.days, result.today,
    chart?.w ?? width, config.range, chart?.h ?? Math.max(0, height - 96))
  const days = result.days.filter(day => day.key >= first && day.key <= result.today)
  const active = days.filter(day => day.messages > 0).length
  const messages = days.reduce((n, day) => n + day.messages, 0)
  const dayLabel = (day: {key: string; messages: number; sessions: number}) => t(result.complete ? 'activity.day' : 'activity.partialDay', { date: day.key, messages: day.messages, sessions: day.sessions })
  const showTip = (event: ReactMouseEvent<HTMLElement>, text: string): void => {
    setTip({ x: event.clientX, y: event.clientY, text })
  }
  const cell = (day: (typeof weeks)[number][number], index: number) => day ? <button type="button" className="dsh-activity-cell" key={day.key}
    data-date={day.key} data-level={activityLevel(day.messages)} data-selected={date === day.key} data-unknown={!result.complete && day.messages === 0}
    aria-label={dayLabel(day)} aria-pressed={date === day.key}
    onMouseEnter={event => { showTip(event, dayLabel(day)) }} onMouseLeave={() => { setTip(null) }}
    onFocus={event => setTip({ x: event.currentTarget.getBoundingClientRect().left + 8, y: event.currentTarget.getBoundingClientRect().top, text: dayLabel(day) })}
    onBlur={() => { setTip(null) }}
    onClick={() => { if (!preview) setDate(previous => previous === day.key ? undefined : day.key) }} />
    : <span className="dsh-activity-cell dsh-activity-spacer" key={`pad${index}`} />
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const detail = date !== undefined ? <ActivityDayDetail date={date} t={t} state={state} actions={actions}
    sessions={result.sessions} ready={detailReady} complete={result.complete} loading={loading} error={error}
    matched={result.matchedSessions} onBack={() => { setDate(undefined) }} /> : null
  return <div className="dsh-activity" data-activity-complete={result.complete} data-activity-range={config.range} data-activity-layout={blocks.length ? 'blocks' : 'weeks'}
    style={{ '--dsh-activity-cell-size': `${cellSize}px`, '--dsh-activity-chart-width': `${chartWidth}px`, '--dsh-activity-gap': `${gap}px` } as CSSProperties}>
    <div className="dsh-activity-summary" aria-label={t('activity.summary', { days: count, active, messages })}>
      <div className="dsh-activity-primary"><strong className="dsh-activity-number">{active}</strong><span>{t('activity.activeDays')}</span></div>
      <div className="dsh-activity-secondary">
        <span>{t('activity.period', { days: count })}</span>
        <span>{t('activity.messages', { count: messages })}</span>
        {result.scanning && <span>{t('activity.indexing', result.progress)}</span>}
      </div>
    </div>
    {error && <div className="dsh-muted" role="alert">{t('activity.error')}<Button size="sm" variant="outline" onClick={retry}>{t('activity.retry')}</Button></div>}
    <div ref={calendar} className="dsh-activity-scroll" tabIndex={detail === null ? 0 : -1} aria-label={t('activity.metric')}
      data-detail={detail === null ? undefined : 'true'}>
      {detail ?? (blocks.length ? <div className="dsh-activity-blocks">{blocks.map(block => <section className="dsh-activity-block" key={block.first} aria-label={t('activity.block', { first: block.first, last: block.last })}>
        <div className="dsh-activity-block-label" title={`${block.first} – ${block.last}`}>{block.first.slice(5)} – {block.last.slice(5)}</div>
        <div className="dsh-activity-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{t(`activity.${day}`)}</span>)}</div>
        <div className="dsh-activity-block-days">{block.weeks.flat().map(cell)}</div>
      </section>)}</div> : <div className="dsh-activity-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--dsh-activity-cell-size))` }}>
        {weeks.map((week, i) => <div className="dsh-activity-week" key={i}>
          <span className="dsh-activity-month" aria-hidden="true">{week.find(day => day?.key.endsWith('-01'))?.key.slice(5, 7) ?? ''}</span>
          {week.map(cell)}
        </div>)}
      </div>)}
    </div>
    {/* One quiet footer row: the exact range, the legend and the two filters. The time
        zone and the "empty cells are not inactivity" paragraph were noise for the reader. */}
    <div className="dsh-activity-caption">
      <span className="dsh-activity-range">{first} – {result.today}</span>
      <div className="dsh-activity-legend"><span>{t('activity.less')}</span>{[0,1,2,3,4].map(level => <span key={level} className="dsh-activity-cell" data-level={level} />)}<span>{t('activity.more')}</span></div>
      <div className="dsh-activity-filters">
        <select className="dsh-quiet-select dsh-activity-scale" aria-label={t('activity.range')} title={t('activity.range')}
          value={config.range} disabled={saveConfig === undefined}
          onChange={event => { void saveConfig?.({ ...config, range: event.target.value as ActivityConfig['range'] }) }}>
          {(['auto', 'quarter', 'year'] as const).map(value => <option key={value} value={value}>{t(`activity.${value}`)}</option>)}
        </select>
      </div>
    </div>
    {tip !== null && createPortal(<div className="dsh-hover-tip" role="tooltip"
      style={{ left: Math.min(tip.x + 12, window.innerWidth - 250), top: Math.max(8, tip.y - 34) }}>{tip.text}</div>, document.body)}
  </div>
}
/** 选中某一天后就地把日历换成当天明细：读数不把卡片撑高，返回即回到热力图。 */
function ActivityDayDetail({ date, t, state, actions, sessions, ready, complete, loading, error, matched, onBack }: {
  date: string; t: Translate; state: ReturnType<typeof useBuiltin>['state']
  actions: ReturnType<typeof useBuiltin>['actions']
  sessions: { id: string; cwd?: string; messages: number }[]
  ready: boolean; complete: boolean; loading: boolean; error: boolean; matched: number
  onBack: () => void
}) {
  const rowsRef = useRef<HTMLDivElement>(null)
  const capacity = useVisibleRows(rowsRef, '.dsh-row')
  const shown = capacity === null ? sessions : sessions.slice(0, capacity)
  return <section className="dsh-activity-detail" aria-label={t('activity.detail', { date })} aria-busy={loading || (!ready && !error)}>
    <div className="dsh-activity-detail-head">
      <strong>{t('activity.detail', { date })}</strong>
      <button type="button" className="dsh-quiet-select dsh-activity-back" onClick={onBack}>{t('activity.back')}</button>
    </div>
    {!ready ? <p className="dsh-muted" role="status">{t(error ? 'activity.error' : 'activity.loading')}</p>
      : sessions.length === 0 ? <p className="dsh-muted">{t(complete ? 'activity.dateEmpty' : 'activity.dateUnknown')}</p>
      : <div className="dsh-rows dsh-activity-days" ref={rowsRef}>{shown.map(session => <button type="button" key={session.id} className="dsh-row" onClick={() => actions.openSession(session.id)}>
        <span className="dsh-row-title">{state.sessions[session.id]?.title?.trim() || session.cwd?.split('/').filter(Boolean).pop() || session.id}</span>
        <span className="dsh-row-meta">{t('activity.messages', { count: session.messages })}</span>
      </button>)}</div>}
    {ready && matched > 100 && <span className="dsh-muted">{t('activity.detailCount', { count: matched })}</span>}
  </section>
}
export function registerActivityWidget(registry: HomeWidgetRegistry, t: Translate) {
  return registry.register<ActivityConfig>({ typeId: '@vlln/dsh-home:activity', apiVersion: 1,
    title: () => t('activity.title'), description: () => t('activity.description'), source: '@vlln/dsh-home', icon: IconActivity,
    preview: { data: activityPreviewSnapshot() as unknown as JsonValue }, sizing: { default: {w:8,h:6}, supported: [{w:4,h:8},{w:8,h:6},{w:8,h:8},{w:12,h:6}] }, configVersion: 2,
    defaultConfig: () => ({ range: 'auto' }), validateConfig: validateActivityConfig, migrateConfig: migrateActivityConfig,
    Content: ActivityContent })
}
