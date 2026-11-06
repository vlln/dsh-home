/** 最近活跃：同一件事（最近一段时间里投入的时长）换窗口看。
 *
 * 今天 / 2 天 / 7 天 / 14 天是同一个量（每天的在場时长）在不同窗口上的表达，所以放在
 * 一个组件里用顶部的范围切换，而不是四个几乎相同的卡片。窗口选择属于该实例的配置，
 * 在阅读态切换并保存；编辑态正文 inert，与其它组件一致。
 */
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { formatDuration, hhmm, shortDay, type Translate } from './format.ts'
import { localDayWindow } from './widget-visual-model.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'
import { ACTIVE_DAY_COUNT as DAY_COUNT, ACTIVE_RANGES as RANGES, activePreviewData, validateActiveConfig, type ActiveConfig, type ActiveRange } from './active-model.ts' 

function Bars({ days, t }: { days: readonly DayBucket[]; t: Translate }): ReactNode {
  const peak = Math.max(1, ...days.map(day => day.activeMs))
  return <>
    <div className="dsh-rhythm dsh-active-bars" role="img" aria-label={t('active.chart')}>
      {days.map(day => (
        <span key={day.key} className="dsh-rhythm-col" title={`${shortDay(day.key)} · ${formatDuration(day.activeMs, t)}`}>
          <span className="dsh-rhythm-bar dsh-active-bar" data-today={day === days[days.length - 1] ? 'true' : 'false'}
            style={{ height: `${Math.max(day.activeMs > 0 ? 4 : 1, (day.activeMs / peak) * 100)}%` }} />
        </span>
      ))}
    </div>
    <div className="dsh-rhythm-days dsh-active-days" aria-hidden="true">
      {days.map(day => <span key={day.key}>{day.key.slice(8)}</span>)}
    </div>
  </>
}

/** 今天用 24 小时时间带：同一份账本里的活动簇，分辨率到小时。 */
function TodayBand({ data, now, t }: { data: LedgerSnapshot | null; now: number; t: Translate }): ReactNode {
  const { start, end } = localDayWindow(now)
  const span = end - start
  const segments: { left: number; width: number; live: boolean; label: string }[] = []
  for (const session of data?.sessions ?? []) {
    for (const [from, to] of session.clusters) {
      const begin = Math.max(from, start), finish = Math.min(to, end)
      if (!Number.isFinite(begin) || !Number.isFinite(finish) || finish <= begin) continue
      segments.push({
        left: ((begin - start) / span) * 100,
        width: ((finish - begin) / span) * 100,
        live: finish >= now - 10 * 60_000,
        label: `${hhmm(begin)}–${hhmm(finish)} · ${formatDuration(finish - begin, t)}`,
      })
    }
  }
  const nowFraction = Math.min(100, Math.max(0, ((now - start) / span) * 100))
  if (segments.length === 0) return <div className="dsh-active-band-empty" role="status">{t('active.emptyToday')}</div>
  return <>
    <div className="dsh-band-track dsh-active-band" role="img" aria-label={segments.map(segment => segment.label).join('; ')}>
      {segments.map((segment, index) => <span key={index} className="dsh-band-seg" data-now={segment.live ? 'true' : 'false'}
        style={{ left: `${segment.left}%`, width: `${segment.width}%` }} title={segment.label} />)}
      <span className="dsh-band-now" style={{ left: `${nowFraction}%` }} />
    </div>
    <div className="dsh-band-scale" aria-hidden="true">
      {[0, .5, 1].map(fraction => <span key={fraction}>{hhmm(start + span * fraction)}</span>)}
    </div>
  </>
}

function ActiveBody({ config, saveConfig, preview }: WidgetContentProps<ActiveConfig>): ReactNode {
  const { t, state } = useBuiltin()
  const data = (preview === undefined ? state.ledger : preview.data as unknown as LedgerSnapshot) as LedgerSnapshot | null
  const range = RANGES.includes(config.range) ? config.range : '7d'
  const days = data?.days ?? []
  const window = days.slice(-DAY_COUNT[range])
  const total = window.reduce((sum, day) => sum + day.activeMs, 0)
  const active = window.filter(day => day.activeMs > 0).length
  const peak = window.reduce<DayBucket | null>((best, day) => (best === null || day.activeMs > best.activeMs ? day : best), null)
  return <div className="dsh-active" data-range={range}>
    <div className="dsh-active-toolbar" role="group" aria-label={t('active.range')}>
      {RANGES.map(value => <button key={value} type="button" className="dsh-chip dsh-active-range"
        data-active={value === range} aria-pressed={value === range} disabled={saveConfig === undefined}
        onClick={() => { void saveConfig?.({ range: value }) }}>{t(`active.${value}`)}</button>)}
    </div>
    <div className="dsh-active-hero">
      <span className="dsh-number">{formatDuration(total, t)}</span>
      <span className="dsh-label">{t('active.total', { range: t(`active.${range}`) })}</span>
    </div>
    {range === 'today'
      ? <TodayBand data={data} now={state.now} t={t} />
      : <Bars days={window} t={t} />}
    <div className="dsh-active-foot">
      <span className="dsh-muted">{t('active.activeDays', { active, total: window.length })}</span>
      {peak !== null && peak.activeMs > 0 && <span className="dsh-muted">{t('active.peak', { dur: formatDuration(peak.activeMs, t), day: shortDay(peak.key) })}</span>}
    </div>
  </div>
}

export function registerActiveWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<ActiveConfig>({
    typeId: '@vlln/dsh-home:active', apiVersion: 1,
    title: () => t('widget.active.title'), description: () => t('gallery.description.active'), source: '@vlln/dsh-home',
    preview: { data: activePreviewData() }, sizing: { default: { w: 8, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 8, h: 4 }, { w: 12, h: 6 }] },
    configVersion: 1, defaultConfig: () => ({ range: '7d' }), validateConfig: (config): config is ActiveConfig => validateActiveConfig(config),
    Content: ActiveBody,
  })
}
