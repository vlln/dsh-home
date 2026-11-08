/**
 * Token 用量：今天用了多少、最近七天怎么走、缓存命中率与输出速率。
 *
 * 数据来自账本的天桶（宿主在折叠会话日志时按天累计 provider 上报的 usage）。
 * 不联网、不读余额；余额是另一个组件的事。
 *
 * @module @vlln/dsh-home/client/usage-widget
 */

import { useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { bucketsOf, cacheHitRate, compactCount, sumDays, tokensPerSecond, totalTokens, type TokenBuckets } from './usage-model.ts'
import { Chip, Donut } from './ui/index.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'
import { IconUsage } from './widget-glyphs.tsx'
import { useHoverTip } from './hover-tip.tsx'

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

interface SplitPart { key: string; value: number; color: string; label: string }

/** 同一个量的四段：颜色只是同一色相的浓淡，名字与数值由 tooltip 说明。 */
function splitParts(buckets: TokenBuckets, t: Translate): SplitPart[] {
  return [
    { key: 'input', value: buckets.input, color: 'var(--color-chart-4)', label: t('usage.input') },
    { key: 'cacheRead', value: buckets.cacheRead, color: 'color-mix(in srgb, var(--color-chart-4) 44%, var(--color-background-primary-default))', label: t('usage.cache') },
    { key: 'output', value: buckets.output, color: 'color-mix(in srgb, var(--color-chart-4) 72%, var(--color-background-primary-default))', label: t('usage.output') },
    { key: 'cacheWrite', value: buckets.cacheWrite, color: 'color-mix(in srgb, var(--color-chart-4) 18%, var(--color-background-primary-default))', label: t('usage.cacheWrite') },
  ].filter(part => part.value > 0)
}

function donutGradient(parts: readonly SplitPart[], total: number, hover: string | null): string {
  if (total === 0) return 'conic-gradient(color-mix(in srgb, var(--color-chart-4) 12%, transparent) 0 100%)'
  let cursor = 0
  const stops = parts.map(part => {
    const from = cursor
    cursor += (part.value / total) * 100
    // 悬停的那一段保持原色，其余淡出：一眼看出这一块占多少。
    const color = hover === null || hover === part.key ? part.color : `color-mix(in srgb, ${part.color} 20%, transparent)`
    return `${color} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`
  })
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

/** 指针落点在圆环的哪一段：12 点方向为 0，顺时针累加。 */
function partAt(event: ReactMouseEvent<HTMLElement>, parts: readonly SplitPart[], total: number): SplitPart | null {
  if (total === 0) return null
  const rect = event.currentTarget.getBoundingClientRect()
  const angle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2))
  const fraction = ((angle + Math.PI / 2) / (Math.PI * 2) % 1 + 1) % 1
  let cursor = 0
  for (const part of parts) {
    cursor += part.value / total
    if (fraction < cursor) return part
  }
  return parts[parts.length - 1] ?? null
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
  const parts = splitParts(windowBuckets, t)
  const windowTotal = parts.reduce((sum, part) => sum + part.value, 0)
  const [hover, setHover] = useState<string | null>(null)
  const tip = useHoverTip()
  const share = (part: SplitPart): string => windowTotal === 0 ? '0%' : percent(part.value / windowTotal)
  return <div className="dsh-usage flex h-full min-h-0 flex-col gap-2" data-compact={compact ? 'true' : 'false'}>
    <div className="dsh-usage-hero flex items-start justify-between gap-3">
      <div className="dsh-usage-figure flex min-w-0 flex-col gap-0.5">
        <span className="dsh-usage-total text-display-4-semibold leading-none tabular-nums tracking-tight text-text-primary" aria-label={t('usage.today')}>{compactCount(total)}</span>
        <span className="dsh-usage-unit text-caption-1-medium text-text-tertiary">{t('usage.today')} · {t('usage.unit')}</span>
      </div>
      <Donut size={96} thickness={12} label={t('usage.split')}
        activeKey={hover}
        segments={[
          { key: 'input', value: today.input, tone: 'chart-4' },
          { key: 'cache', value: today.cacheRead, tone: 'chart-2' },
          { key: 'output', value: today.output, tone: 'chart-5' },
        ]}
        center={<span className="text-caption-1-semibold tabular-nums text-text-secondary">{windowTotal === 0 ? '—' : percent(1)}</span>} />
    </div>
    <div className="dsh-usage-chips flex flex-wrap items-center gap-1">
      <Chip variant="caption" color="neutral" {...tip.bind(`${t('usage.input')} · ${today.input.toLocaleString()} ${t('usage.unit')}`)}><i className="dsh-chip-dot" style={{ '--dsh-part': 'var(--color-chart-4)' } as CSSProperties} aria-hidden="true" />{t('usage.input')} <b>{compactCount(today.input)}</b></Chip>
      <Chip variant="caption" color="neutral" {...tip.bind(`${t('usage.cache')} · ${today.cacheRead.toLocaleString()} ${t('usage.unit')}`)}><i className="dsh-chip-dot" style={{ '--dsh-part': 'color-mix(in srgb, var(--color-chart-4) 44%, var(--color-background-primary-default))' } as CSSProperties} aria-hidden="true" />{t('usage.cache')} <b>{compactCount(today.cacheRead)}</b></Chip>
      <Chip variant="caption" color="neutral" {...tip.bind(`${t('usage.output')} · ${today.output.toLocaleString()} ${t('usage.unit')}`)}><i className="dsh-chip-dot" style={{ '--dsh-part': 'color-mix(in srgb, var(--color-chart-4) 72%, var(--color-background-primary-default))' } as CSSProperties} aria-hidden="true" />{t('usage.output')} <b>{compactCount(today.output)}</b></Chip>
    </div>
    {week && <div className="dsh-usage-bars" role="img" aria-label={t('usage.week')}>
      {days.map(day => {
        const buckets = bucketsOf(day)
        const value = totalTokens(buckets)
        const label = [`${day.key.slice(5)} · ${compactCount(value)} ${t('usage.unit')}`,
          `${t('usage.input')} ${compactCount(buckets.input)} · ${t('usage.cache')} ${compactCount(buckets.cacheRead)} · ${t('usage.output')} ${compactCount(buckets.output)}`].join('\n')
        return <span key={day.key} className="dsh-usage-col" role="img" tabIndex={0} aria-label={label} {...tip.bind(label)}>
          <span className="dsh-usage-bar" style={{ height: `${Math.max(value > 0 ? 6 : 1, (value / peak) * 100)}%` }} />
        </span>
      })}
    </div>}
    {tip.node}
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
  return <UsageBody t={t} compact={(props.width ?? 999) < 480 || (props.height ?? 999) < 210} week={props.config.week}
    data={{ today: { tokens: today.tokens, runMs: today.runMs }, days: snapshot.days }} />
}

export function UsageContent(props: WidgetContentProps<UsageConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as UsagePreviewData | undefined
  if (preview !== undefined) return <UsageBody data={preview} t={t} compact={(props.width ?? 999) < 480 || (props.height ?? 999) < 210} week={props.config.week} />
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
    title: () => t('widget.usage.title'), description: () => t('gallery.description.usage'), source: '@vlln/dsh-home', icon: IconUsage,
    preview: { data: previewData() },
    sizing: { default: { w: 8, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 8, h: 4 }, { w: 8, h: 6 }] },
    configVersion: 1, defaultConfig: defaultUsageConfig, validateConfig: (config): config is UsageConfig => validateUsageConfig(config),
    Content: UsageContent,
  })
}
