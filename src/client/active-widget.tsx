/** 最近活跃：同一件事（最近一段时间里投入的时长）换窗口看。
 *
 * 今天 / 2 天 / 7 天 / 14 天是同一个量（每天的在場时长）在不同窗口上的表达，所以放在
 * 一个组件里用顶部的范围切换，而不是几个几乎相同的卡片。窗口选择属于该实例的配置，
 * 在阅读态切换并保存；编辑态正文 inert，与其它组件一致。
 *
 * 柱子只在悬停/聚焦时给细节（日期 + 时长）；卡片本身不再用一行页脚复述这些数字，
 * 免得把一个四行的组件撑高。
 */
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { formatDuration, shortDay, type Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { DayBucket, LedgerSnapshot } from './api.ts'
import { ACTIVE_DAY_COUNT as DAY_COUNT, ACTIVE_RANGES as RANGES, activePreviewData, migrateActiveConfig, validateActiveConfig, type ActiveConfig } from './active-model.ts'
import { IconBars } from './widget-glyphs.tsx'
import { CardBody, CardHero, CardMeta, SegmentedControl, SegmentedControlItem, SparkBars, Tooltip, TooltipTrigger, type VizItem } from './ui/index.ts'

function barLabel(day: DayBucket, t: Translate): string {
  return `${shortDay(day.key)} · ${formatDuration(day.activeMs, t)}`
}

function Bars({ days, t, todayKey }: { days: readonly DayBucket[]; t: Translate; todayKey: string }): ReactNode {
  const peak = Math.max(1, ...days.map(day => day.activeMs))
  const items: VizItem[] = days.map(day => ({
    key: day.key,
    ratio: day.activeMs / peak,
    label: barLabel(day, t),
    emphasis: day.key === todayKey,
    empty: day.activeMs === 0,
  }))
  return <div className="flex min-h-0 flex-1 flex-col gap-1.5">
    <SparkBars items={items} wrap={(item, bar) => (
      <TooltipTrigger delay={60}>{bar}<Tooltip>{item.label}</Tooltip></TooltipTrigger>
    )} className="h-20" />
    {/* 30 天不再逐日写 30 个数字：每 5 天一个刻度，最后一天始终保留。 */}
    <div className="flex gap-1 text-center text-caption-1-medium text-text-tertiary" aria-hidden="true">
      {days.map((day, index) => <span key={day.key} className="flex-1 truncate">{
        days.length > 14 && (index % 5 !== 0) && index !== days.length - 1 ? '' : day.key.slice(8)
      }</span>)}
    </div>
  </div>
}

function ActiveBody({ config, saveConfig, preview }: WidgetContentProps<ActiveConfig>): ReactNode {
  const { t, state } = useBuiltin()
  const data = (preview === undefined ? state.ledger : preview.data as unknown as LedgerSnapshot) as LedgerSnapshot | null
  const range = RANGES.includes(config.range) ? config.range : '7d'
  const days = data?.days ?? []
  const window = days.slice(-DAY_COUNT[range])
  const total = window.reduce((sum, day) => sum + day.activeMs, 0)
  const todayKey = window[window.length - 1]?.key ?? ''
  return <CardBody>
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <CardHero value={formatDuration(total, t)} />
        <CardMeta>{t('active.total', { range: t(`active.${range}`) })}</CardMeta>
      </div>
      <SegmentedControl
        aria-label={t('active.range')}
        selectedKeys={[range]}
        onSelectionChange={keys => {
          const next = [...keys][0]
          if (saveConfig !== undefined && next !== undefined && next !== range) void saveConfig({ range: next as ActiveConfig['range'] })
        }}
        isDisabled={saveConfig === undefined}
        className="flex-none"
      >
        {RANGES.map(value => <SegmentedControlItem key={value} id={value}>{t(`active.${value}`)}</SegmentedControlItem>)}
      </SegmentedControl>
    </div>
    <Bars days={window} t={t} todayKey={todayKey} />
  </CardBody>
}

export function registerActiveWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<ActiveConfig>({
    typeId: '@vlln/dsh-home:active', apiVersion: 1,
    title: () => t('widget.active.title'), description: () => t('gallery.description.active'), source: '@vlln/dsh-home', icon: IconBars,
    preview: { data: activePreviewData() }, sizing: { default: { w: 8, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 8, h: 4 }, { w: 12, h: 6 }] },
    configVersion: 3, defaultConfig: () => ({ range: '7d' }), validateConfig: (config): config is ActiveConfig => validateActiveConfig(config),
    migrateConfig: migrateActiveConfig,
    Content: ActiveBody,
  })
}
