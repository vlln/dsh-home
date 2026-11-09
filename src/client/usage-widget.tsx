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
import { bucketsOf, compactCount, type TokenBuckets } from './usage-model.ts'
import { Donut } from './ui/index.ts'
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
const PART_TONE = { input: 'chart-4', output: 'chart-5', cacheRead: 'chart-2', cacheWrite: 'chart-3' } as const

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * 用量卡：今天的输入与输出 token，一个环，中心是合计。
 *
 * 结构取自参考卡（睡眠评分）：一个大环按成分切段、中心放总数、下方是成分行列表。
 * 缓存 token 不在这张卡上——那是服务商省下的钱，不是用户花掉的。
 */
function UsageBody({ data, t, compact, week }: { data: UsagePreviewData; t: Translate; compact: boolean; week: boolean }): ReactNode {
  const today = bucketsOf(data.today)
  // The total is what the card is about: tokens read and written today. Cache traffic is
  // the provider's saving, not the user's spending, so it is not on this card at all.
  const total = today.input + today.output
  const tip = useHoverTip()
  const [hover, setHover] = useState<string | null>(null)
  // The reference card: one ring split into its parts, the total in the middle, and the
  // parts as a row list underneath. No bars, no tiles, no concentric gauges.
  const parts = [
    { key: 'input', tone: PART_TONE.input, value: today.input, label: t('usage.input') },
    { key: 'output', tone: PART_TONE.output, value: today.output, label: t('usage.output') },
  ]
  const share = (value: number) => total === 0 ? '—' : percent(value / total)
  // A 1% arc is invisible, so a two-part ring could show one colour. Every non-zero part
  // keeps a minimum arc; the largest part gives up the difference.
  const MIN_ARC = 0.07
  const arcs = (() => {
    const raw = parts.map(part => (total === 0 ? 0 : part.value / total))
    const tightened = raw.map(value => (value >= 0.005 ? Math.max(value, MIN_ARC) : 0))
    const surplus = tightened.reduce((sum, value, index) => sum + (value - raw[index]), 0)
    const biggest = raw.indexOf(Math.max(...raw))
    if (biggest >= 0 && surplus > 0) tightened[biggest] = Math.max(0, tightened[biggest] - surplus)
    return tightened
  })()
  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <Donut size={compact ? 124 : 156} thickness={compact ? 13 : 17}
        segments={parts.map((part, index) => ({ key: part.key, value: arcs[index], tone: part.tone }))}
        activeKey={hover}
        center={<span className="flex flex-col items-center">
          <span className="text-display-4-semibold leading-none tabular-nums text-text-primary">{compactCount(total)}</span>
          <span className="text-caption-1-medium text-text-tertiary">{t('usage.unit')}</span>
        </span>} />
    </div>
    <ul className="flex min-h-0 flex-col gap-1.5">
      {parts.map(part => <li key={part.key}
        className="flex items-center gap-2 text-caption-1-medium"
        onMouseEnter={() => { setHover(part.key) }}
        onMouseLeave={() => { setHover(null) }}>
        <i className="size-2 flex-none rounded-[3px]" style={{ background: `var(--color-${part.tone})` }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-text-secondary">{part.label}</span>
        <span className="tabular-nums text-text-primary">{compactCount(part.value)}</span>
        <span className="w-10 text-right tabular-nums text-text-tertiary">{share(part.value)}</span>
      </li>)}
    </ul>
    {tip.node}
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
