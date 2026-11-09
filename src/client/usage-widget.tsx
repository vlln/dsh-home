/**
 * Token 用量：今天用了多少、最近七天怎么走、缓存命中率与输出速率。
 *
 * 数据来自账本的天桶（宿主在折叠会话日志时按天累计 provider 上报的 usage）。
 * 不联网、不读余额；余额是另一个组件的事。
 *
 * @module @vlln/dsh-home/client/usage-widget
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { bucketsOf, cacheHitRate, compactCount, sumDays, tokensPerSecond, totalTokens, type TokenBuckets } from './usage-model.ts'
import { Donut, SparkBars } from './ui/index.ts'
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

/** Token 卡的三段配色，与环形、图例共用一处定义——两处写颜色迟早会漂。 */
const PART_TONE = { input: 'chart-4', cache: 'chart-2', output: 'chart-5' } as const
const PART_COLOR = {
  input: 'var(--color-chart-4)',
  cache: 'var(--color-chart-2)',
  output: 'var(--color-chart-5)',
} as const

/** 周几：柱状图下方只放单个字母，日期留给 tooltip。 */
function weekday(key: string): string {
  const date = new Date(`${key}T00:00:00`)
  return Number.isNaN(date.getTime()) ? key.slice(8) : 'SMTWTFS'[date.getDay()]!
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * 用量卡：一个主值 + 一条七天轨道柱 + 一枚构成环。
 *
 * 上一版把「主值 / 单位 / 环形 / 三个 chip / 七根柱 / 两行脚注」全塞进一张卡，
 * 结果六种字号互相打架、柱子没有轨道、空值那天直接消失。这里按 BoardUI 的卡片
 * 顺序重排：指标和单位同一行，环形只说「缓存命中」，柱状只说「这七天」，其余
 * 降级成一行图例；脚注删掉，因为它重复了柱状已经说过的话。
 */
function UsageBody({ data, t, compact, week }: { data: UsagePreviewData; t: Translate; compact: boolean; week: boolean }): ReactNode {
  const today = bucketsOf(data.today)
  const total = totalTokens(today)
  const hit = cacheHitRate(today)
  const days = week ? data.days.slice(-7) : []
  const peak = Math.max(1, ...days.map(day => totalTokens(bucketsOf(day))))
  const windowBuckets = week ? sumDays(days) : today
  const windowTotal = totalTokens(windowBuckets)
  const [hover, setHover] = useState<string | null>(null)
  const tip = useHoverTip()
  const legend = [
    { key: 'input' as const, label: t('usage.input'), value: today.input },
    { key: 'cache' as const, label: t('usage.cache'), value: today.cacheRead },
    { key: 'output' as const, label: t('usage.output'), value: today.output },
  ]
  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="dsh-metric">
          <span className="dsh-metric-value" aria-label={t('usage.today')}>{compactCount(total)}</span>
          <span className="dsh-metric-unit">{t('usage.today')} · {t('usage.unit')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legend.map(part => <span key={part.key} className="flex items-center gap-1.5 text-caption-1-medium text-text-tertiary"
            onPointerEnter={() => setHover(part.key)} onPointerLeave={() => setHover(null)}>
            <i className="block size-2 flex-none rounded-full" style={{ background: PART_COLOR[part.key] }} aria-hidden="true" />
            {part.label}
            <b className="font-medium tabular-nums text-text-secondary">{compactCount(part.value)}</b>
          </span>)}
        </div>
      </div>
      <Donut size={compact ? 56 : 72} thickness={8} label={t('usage.split')} activeKey={hover}
        segments={[
          { key: 'input', value: today.input, tone: PART_TONE.input },
          { key: 'cache', value: today.cacheRead, tone: PART_TONE.cache },
          { key: 'output', value: today.output, tone: PART_TONE.output },
        ]}
        center={<span className="text-caption-1-semibold tabular-nums text-text-primary" title={t('usage.hit')}>{total === 0 || hit === null ? '—' : percent(hit)}</span>} />
    </div>
    {week && <div className="mt-auto flex min-h-0 flex-1 flex-col gap-1.5">
      <SparkBars items={days.map(day => {
      const buckets = bucketsOf(day)
      const value = totalTokens(buckets)
      const label = [`${day.key.slice(5)} · ${compactCount(value)} ${t('usage.unit')}`,
        `${t('usage.input')} ${compactCount(buckets.input)} · ${t('usage.cache')} ${compactCount(buckets.cacheRead)} · ${t('usage.output')} ${compactCount(buckets.output)}`].join('\n')
      return { key: day.key, ratio: value / peak, label, empty: value === 0, emphasis: value === peak }
      }).reverse()} className="min-h-6 flex-1" wrap={(item, bar) => <span className="flex w-full justify-center" {...tip.bind(item.label)}>{bar}</span>} />
      <div className="flex gap-1.5" aria-hidden="true">
        {[...days].reverse().map(day => <span key={day.key} className="min-w-0 flex-1 text-center text-caption-1-medium tabular-nums text-text-tertiary">{weekday(day.key)}</span>)}
      </div>
    </div>}
    {tip.node}
    {partitionNote(t, windowTotal, days)}
  </div>
}

/** 柱状下方的口径说明：一句话说清“这七天”，不重复柱子的数。 */
function partitionNote(t: Translate, windowTotal: number, days: readonly DayBucket[]): ReactNode {
  if (days.length === 0) return null
  return <div className="mt-auto flex items-center justify-between gap-2 text-caption-1-medium text-text-tertiary">
    <span>{t('usage.week')}</span>
    <span className="tabular-nums">{compactCount(windowTotal)} {t('usage.unit')}</span>
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
