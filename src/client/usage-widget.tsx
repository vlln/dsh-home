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
import { ActivityRings } from './ui/index.ts'
import { useHoverTip } from './hover-tip.tsx'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'
import { IconUsage } from './widget-glyphs.tsx'

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
const PART_TONE = { input: 'chart-4', output: 'chart-5', cache: 'chart-2', cacheWrite: 'chart-2' } as const

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
  const [hover] = useState<string | null>(null)
  const tip = useHoverTip()
  // One card, one graphic: two rings, each a category split into its parts. The bars are
  // gone — a strip of per-day bars next to a ring made the same card answer two questions.
  const fresh = today.input + today.output
  const cache = today.cacheRead + today.cacheWrite
  // Reference layout: a headline, a row of tiles (one per part), then the ring. The ring
  // alone left the rest of the card empty, which is the fill-rate rule again.
  const parts = [
    { key: 'input', tone: PART_TONE.input, opacity: 1, value: today.input, label: t('usage.input') },
    { key: 'output', tone: PART_TONE.input, opacity: 0.55, value: today.output, label: t('usage.output') },
    { key: 'cacheRead', tone: PART_TONE.cache, opacity: 1, value: today.cacheRead, label: t('usage.cacheRead') },
    { key: 'cacheWrite', tone: PART_TONE.cache, opacity: 0.55, value: today.cacheWrite, label: t('usage.cacheWrite') },
  ]
  const share = (value: number) => total === 0 ? '—' : percent(value / total)
  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="dsh-metric flex items-baseline gap-2">
      <span className="dsh-metric-value" aria-label={t('usage.today')}>{compactCount(total)}</span>
      <span className="dsh-metric-unit">{t('usage.today')} · {t('usage.unit')}</span>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {parts.map(part => <div key={part.key} className="flex min-w-0 flex-col gap-0.5 rounded-[10px] bg-[var(--dsh-sunken)] px-2.5 py-2">
        <span className="flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
          <i className="size-2 rounded-[3px]" style={{ background: `var(--color-${part.tone})`, opacity: part.opacity }} aria-hidden="true" />
          <span className="truncate">{part.label}</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-body-medium tabular-nums text-text-primary">{compactCount(part.value)}</span>
          <span className="text-caption-1-medium tabular-nums text-text-tertiary">{share(part.value)}</span>
        </span>
      </div>)}
    </div>
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <ActivityRings size={compact ? 96 : 132} rings={[
        { key: 'fresh', segments: parts.slice(0, 2).map(part => ({ ...part, label: `${part.label} · ${compactCount(part.value)} ${t('usage.unit')} · ${share(part.value)}` })) },
        { key: 'cache', segments: parts.slice(2).map(part => ({ ...part, label: `${part.label} · ${compactCount(part.value)} ${t('usage.unit')} · ${share(part.value)}` })) },
      ]} />
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
