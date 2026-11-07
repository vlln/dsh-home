/**
 * Token 用量：今天用了多少、最近七天怎么走、缓存命中率与输出速率。
 *
 * 数据来自账本的天桶（宿主在折叠会话日志时按天累计 provider 上报的 usage）。
 * 不联网、不读余额；余额是另一个组件的事。
 *
 * @module @vlln/dsh-home/client/usage-widget
 */

import type { CSSProperties, ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { bucketsOf, cacheHitRate, compactCount, sumDays, tokensPerSecond, totalTokens, type TokenBuckets } from './usage-model.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'

export type UsageConfig = { week: boolean }

function defaultUsageConfig(): UsageConfig {
  return { week: true }
}

function validateUsageConfig(value: unknown): value is UsageConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'week') && typeof config.week === 'boolean'
}

export interface UsagePreviewData { today: { tokens: TokenBuckets; runMs: number }; days: DayBucket[] }

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function donutGradient(buckets: TokenBuckets): string {
  // One hue, four weights: the split stays readable without adding a second palette.
  const parts = [
    { value: buckets.input, color: 'var(--dsh-ramp-4)' },
    { value: buckets.cacheRead, color: 'var(--dsh-ramp-2)' },
    { value: buckets.output, color: 'var(--dsh-ramp-3)' },
    { value: buckets.cacheWrite, color: 'var(--dsh-ramp-1)' },
  ].filter(part => part.value > 0)
  const sum = parts.reduce((total, part) => total + part.value, 0)
  if (sum === 0) return 'conic-gradient(var(--dsh-accent-soft) 0 100%)'
  let cursor = 0
  const stops = parts.map(part => {
    const from = cursor
    cursor += (part.value / sum) * 100
    return `${part.color} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`
  })
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

function UsageBody({ data, t, compact, week }: { data: UsagePreviewData; t: Translate; compact: boolean; week: boolean }): ReactNode {
  const today = bucketsOf(data.today)
  const total = totalTokens(today)
  const rate = tokensPerSecond(today, data.today.runMs)
  const hit = cacheHitRate(today)
  const days = week ? data.days.slice(-7) : []
  const peak = Math.max(1, ...days.map(day => totalTokens(bucketsOf(day))))
  // 甜甜圈画的是「窗口构成」：默认最近七天（今天可能有 0 用量，七天则有真实数据）。
  const windowBuckets = week ? sumDays(days) : today
  const windowHit = cacheHitRate(windowBuckets)
  return <div className="dsh-usage" data-compact={compact ? 'true' : 'false'}>
    <div className="dsh-usage-hero">
      <div className="dsh-usage-figure">
        <span className="dsh-usage-total" aria-label={t('usage.today')}>{compactCount(total)}</span>
        <span className="dsh-usage-unit">{t('usage.today')} · {t('usage.unit')}</span>
      </div>
      <div className="dsh-usage-donut" style={{ background: donutGradient(windowBuckets) }} role="img" aria-label={t('usage.split')}>
        <span className="dsh-usage-donut-hole">
          <b>{windowHit === null ? '—' : percent(windowHit)}</b>
          <i>{t(week ? 'usage.sevenDays' : 'usage.hit')}</i>
        </span>
      </div>
    </div>
    <div className="dsh-usage-chips">
      <span className="dsh-chip"><i className="dsh-chip-dot" style={{ '--dsh-part': 'var(--dsh-ramp-4)' } as CSSProperties} aria-hidden="true" />{t('usage.input')} <b>{compactCount(today.input)}</b></span>
      <span className="dsh-chip"><i className="dsh-chip-dot" style={{ '--dsh-part': 'var(--dsh-ramp-2)' } as CSSProperties} aria-hidden="true" />{t('usage.cache')} <b>{compactCount(today.cacheRead)}</b></span>
      <span className="dsh-chip"><i className="dsh-chip-dot" style={{ '--dsh-part': 'var(--dsh-ramp-3)' } as CSSProperties} aria-hidden="true" />{t('usage.output')} <b>{compactCount(today.output)}</b></span>
    </div>
    {week && <div className="dsh-usage-bars" role="img" aria-label={t('usage.week')}>
      {days.map(day => {
        const value = totalTokens(bucketsOf(day))
        return <span key={day.key} className="dsh-usage-col" title={`${day.key.slice(5)} · ${compactCount(value)}`}>
          <span className="dsh-usage-bar" style={{ height: `${Math.max(value > 0 ? 6 : 1, (value / peak) * 100)}%` }} />
        </span>
      })}
    </div>}
    <div className="dsh-usage-foot">
      <span className="dsh-muted">{t('usage.rate')} <b>{rate === null ? '—' : rate.toFixed(1)}</b> {t('usage.perSecond')}</span>
      {week && <span className="dsh-muted">{t('usage.weekTotal')} <b>{compactCount(totalTokens(sumDays(days)))}</b></span>}
    </div>
  </div>
}

function ConnectedUsage(props: WidgetContentProps<UsageConfig>): ReactNode {
  const { t, state } = useBuiltin()
  const snapshot = state.ledger as LedgerSnapshot | null
  if (snapshot === null) return <p className="dsh-planner-loading" role="status">{t('usage.loading')}</p>
  const today = snapshot.today
  return <UsageBody t={t} compact={props.width < 480} week={props.config.week}
    data={{ today: { tokens: today.tokens, runMs: today.runMs }, days: snapshot.days }} />
}

export function UsageContent(props: WidgetContentProps<UsageConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as UsagePreviewData | undefined
  if (preview !== undefined) return <UsageBody data={preview} t={t} compact={props.width < 480} week={props.config.week} />
  return <ConnectedUsage {...props} />
}

function previewData(): JsonValue {
  const days: DayBucket[] = Array.from({ length: 14 }, (_, index) => {
    const activeMs = [42, 0, 96, 61, 130, 0, 18, 74, 155, 88, 0, 210, 133, 64][index]! * 60_000
    return {
      key: `2026-11-${String(index + 1).padStart(2, '0')}`,
      activeMs, runMs: Math.round(activeMs * 0.4), turns: 3, sessions: activeMs > 0 ? 1 : 0,
      tokens: { input: Math.round(activeMs / 900), output: Math.round(activeMs / 3_600), cacheRead: Math.round(activeMs / 260), cacheWrite: 0 },
    }
  })
  const last = days[13]!
  return { today: { tokens: last.tokens, runMs: last.runMs }, days } as unknown as JsonValue
}

export function registerUsageWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<UsageConfig>({
    typeId: '@vlln/dsh-home:usage', apiVersion: 1,
    title: () => t('widget.usage.title'), description: () => t('gallery.description.usage'), source: '@vlln/dsh-home',
    preview: { data: previewData() },
    sizing: { default: { w: 8, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 8, h: 4 }, { w: 8, h: 6 }] },
    configVersion: 1, defaultConfig: defaultUsageConfig, validateConfig: (config): config is UsageConfig => validateUsageConfig(config),
    Content: UsageContent,
  })
}
