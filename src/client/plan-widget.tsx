/**
 * 今日计划：今天的时间轴。
 *
 * 有开始时间的条目按时间排成块，没时间的（以及逾期未完成的）挂在「待安排」。
 * 一条「现在」线按当前时刻插在正确的位置——它每分钟重算一次，纯本地计算。
 *
 * @module @vlln/dsh-home/client/plan-widget
 */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, todayKey, useNow } from './home-data.ts'
import { ItemEditor, emptyDraft, type ItemFields } from './item-editor.tsx'
import { itemsOnDay } from './planner-model.ts'
import { PlannerRow } from './planner-rows.tsx'
import { plannerPreview } from './planner-preview.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { PlannerItem } from './api.ts'
import { IconPlan } from './widget-glyphs.tsx'

export type PlanConfig = { showDone: boolean }

function defaultPlanConfig(): PlanConfig {
  return { showDone: false }
}

function validatePlanConfig(value: unknown): value is PlanConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'showDone') && typeof config.showDone === 'boolean'
}

export interface PlanPreviewData { day: string; now: number; items: PlannerItem[] }

function clockOf(time: string): string {
  return time
}

function PlanBody({ data, today, now, t, readOnly, showDone, onToggle, onUpdate, onDelete, onCreate }: {
  data: PlanPreviewData
  today: string
  now: number
  t: Translate
  readOnly: boolean
  showDone: boolean
  onToggle?: (item: PlannerItem) => void
  onUpdate?: (item: PlannerItem, fields: ItemFields) => void
  onDelete?: (item: PlannerItem) => void
  onCreate?: (fields: ItemFields) => void
}): ReactNode {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const items = useMemo(() => data.items.filter(item => item.day !== null && item.day <= today), [data.items, today])
  const todayItems = itemsOnDay(items, today)
  const timed = todayItems.filter(item => item.start !== null && (showDone || !item.done))
  const free = items.filter(item => item.day !== today || item.start === null)
    .filter(item => showDone || !item.done)
    .sort((left, right) => (left.day ?? '9999').localeCompare(right.day ?? '9999') || left.createdAt - right.createdAt)
  const nowClock = `${String(new Date(now).getHours()).padStart(2, '0')}:${String(new Date(now).getMinutes()).padStart(2, '0')}`
  const nowLabel = nowClock

  const rowFor = (item: PlannerItem, showDay = false, showTime = false): ReactNode => <PlannerRow key={item.id} item={item} today={today} t={t}
    readOnly={readOnly} editing={editingId === item.id} showDay={showDay} showTime={showTime}
    onToggle={() => onToggle?.(item)}
    onEdit={() => setEditingId(item.id)}
    onSave={fields => { onUpdate?.(item, fields); setEditingId(null) }}
    onDelete={readOnly ? undefined : () => { onDelete?.(item); setEditingId(null) }}
    onCancel={() => setEditingId(null)} />

  let nowPlaced = false
  const timeline: ReactNode[] = []
  for (const item of timed) {
    if (!nowPlaced && (item.start ?? '') > nowClock) {
      nowPlaced = true
      timeline.push(<li key="now" className="dsh-plan-now" aria-label={t('plan.now')}>
        <span className="dsh-plan-now-time">{nowLabel}</span>
        <span className="dsh-plan-now-rule" aria-hidden="true" />
      </li>)
    }
    timeline.push(<li key={item.id} className="dsh-plan-block" data-done={item.done ? 'true' : 'false'}>
      <span className="dsh-plan-time">{clockOf(item.start ?? '')}{item.end !== null ? `–${item.end}` : ''}</span>
      <ul className="dsh-todo-list">{rowFor(item)}</ul>
      <span className="dsh-plan-rule" aria-hidden="true" />
    </li>)
  }
  if (!nowPlaced) {
    timeline.push(<li key="now" className="dsh-plan-now" aria-label={t('plan.now')}>
      <span className="dsh-plan-now-time">{nowLabel}</span>
      <span className="dsh-plan-now-rule" aria-hidden="true" />
    </li>)
  }

  return <div className="dsh-plan">
    <div className="dsh-plan-scroll">
      {timed.length === 0
        ? <p className="dsh-todo-empty">{t('plan.empty')}</p>
        : <ul className="dsh-plan-list">{timeline}</ul>}
      {free.length > 0 && <section className="dsh-todo-group" data-group="free">
        <h4 className="dsh-todo-heading">{t('plan.unscheduled')}<span className="dsh-todo-count">{free.length}</span></h4>
        <ul className="dsh-todo-list">{free.map(item => rowFor(item, true, true))}</ul>
      </section>}
      {timed.length === 0 && free.length === 0 && <p className="dsh-plan-hint">{t('plan.emptyHint')}</p>}
      {adding && <ItemEditor t={t} initial={emptyDraft(today)} autoFocus
        onSave={fields => { onCreate?.(fields); setAdding(false) }} onCancel={() => setAdding(false)} />}
    </div>
    {!readOnly && !adding && <button type="button" className="dsh-plan-add" onClick={() => setAdding(true)}>+ {t('planner.add')}</button>}
  </div>
}

function ConnectedPlan(props: WidgetContentProps<PlanConfig>): ReactNode {
  const { t } = useBuiltin()
  const { config, editing } = props
  const data = useHomeData()
  const today = todayKey()
  const now = useNow(30_000)
  if (data.plannerError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshPlanner()}>{t('planner.retry')}</button>
    </div>
  }
  if (data.planner === null) return <p className="dsh-planner-loading" role="status">{t('planner.loading')}</p>
  const readOnly = editing || !data.plannerStorage.writable
  return <PlanBody data={{ day: today, now, items: data.planner.items }} today={today} now={now} t={t}
    readOnly={readOnly} showDone={config.showDone}
    onCreate={fields => { void data.store.mutatePlanner({ op: 'item.create', item: fields }).catch(() => {}) }}
    onToggle={item => { void data.store.mutatePlanner({ op: 'item.toggle', id: item.id }).catch(() => {}) }}
    onUpdate={(item, fields) => { void data.store.mutatePlanner({ op: 'item.update', id: item.id, patch: fields }).catch(() => {}) }}
    onDelete={item => { void data.store.mutatePlanner({ op: 'item.delete', id: item.id }).catch(() => {}) }} />
}

export function PlanContent(props: WidgetContentProps<PlanConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as PlanPreviewData | undefined
  if (preview !== undefined) {
    return <PlanBody data={preview} today={preview.day} now={preview.now} t={t} readOnly showDone={props.config.showDone} />
  }
  return <ConnectedPlan {...props} />
}

export function registerPlanWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  const preview = plannerPreview()
  return registry.register<PlanConfig>({
    typeId: '@vlln/dsh-home:plan', apiVersion: 1,
    title: () => t('widget.plan.title'), description: () => t('gallery.description.plan'), source: '@vlln/dsh-home', icon: IconPlan,
    preview: { data: { day: preview.day, now: preview.now, items: preview.items } as unknown as JsonValue },
    sizing: { default: { w: 8, h: 6 }, supported: [{ w: 8, h: 4 }, { w: 8, h: 6 }, { w: 8, h: 8 }, { w: 12, h: 6 }] },
    configVersion: 1, defaultConfig: defaultPlanConfig, validateConfig: (config): config is PlanConfig => validatePlanConfig(config),
    Content: PlanContent,
  })
}
