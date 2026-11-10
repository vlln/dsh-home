/**
 * 日程：月视图 + 所选日期的条目。
 *
 * 月格里的圆点只表示「这天还有没做完的事」；点某天在下方看当天条目，也能直接在那天新建。
 * 与待办、计划表共用一份数据，任何一处改动这里立刻反映。
 *
 * @module @vlln/dsh-home/client/calendar-widget
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, todayKey } from './home-data.ts'
import { ItemEditor, emptyDraft, type ItemFields } from './item-editor.tsx'
import { inMonth, itemsOnDay, monthGrid, shiftMonth } from './planner-model.ts'
import { PlannerRow } from './planner-rows.tsx'
import { plannerPreview } from './planner-preview.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { PlannerItem } from './api.ts'
import { IconCalendar } from './widget-glyphs.tsx'

export type CalendarConfig = { weekStart: 1 | 7 }

function defaultCalendarConfig(): CalendarConfig {
  return { weekStart: 1 }
}

function validateCalendarConfig(value: unknown): value is CalendarConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'weekStart') && (config.weekStart === 1 || config.weekStart === 7)
}

export interface CalendarPreviewData { day: string; items: PlannerItem[] }

// 月份跟着界面语言走，不跟浏览器走：中文界面里出现 "November 2026" 是这一张卡最刺眼的一行。
function monthTitle(anchor: string, locale: string): string {
  const [year, month] = anchor.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(year, month - 1, 1))
}

function CalendarBody({ data, today, t, readOnly, onToggle, onUpdate, onDelete, onCreate, weekStart }: {
  data: CalendarPreviewData
  today: string
  t: Translate
  readOnly: boolean
  weekStart: 1 | 7
  onToggle?: (item: PlannerItem) => void
  onUpdate?: (item: PlannerItem, fields: ItemFields) => void
  onDelete?: (item: PlannerItem) => void
  onCreate?: (fields: ItemFields) => void
}): ReactNode {
  const [anchor, setAnchor] = useState(() => `${today.slice(0, 7)}-01`)
  const [selected, setSelected] = useState(today)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const grid = monthGrid(anchor)
  const weeks = weekStart === 1 ? grid : grid.map(week => [...week.slice(6), ...week.slice(0, 6)])
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const day = weekStart === 1 ? index + 1 : (index + 6) % 7 + 1
    return t(`calendar.weekday.${day}`)
  })
  const selectedItems = itemsOnDay(data.items, selected)
  const locale = t('ui.dateLocale')
  // 月份在左、操作在右：两个箭头挨在一起（它们是同一件事的两半），"回到今天" 退成文字动作。
  // 原来是 ‹ 在最左、› 在最右，两者之间隔着一个 flex:1 的月份标题，横向拉出 700px。
  return <div className="dsh-calendar">
    <div className="dsh-calendar-head">
      <span className="dsh-calendar-title">{monthTitle(anchor, locale)}</span>
      <div className="dsh-calendar-navs">
        <button type="button" className="dsh-calendar-today" onClick={() => { setAnchor(`${today.slice(0, 7)}-01`); setSelected(today) }}>{t('calendar.today')}</button>
        <button type="button" className="dsh-calendar-nav" aria-label={t('calendar.prev')} onClick={() => setAnchor(shiftMonth(anchor, -1))}>‹</button>
        <button type="button" className="dsh-calendar-nav" aria-label={t('calendar.next')} onClick={() => setAnchor(shiftMonth(anchor, 1))}>›</button>
      </div>
    </div>
    <div className="dsh-calendar-weekdays" aria-hidden="true">
      {weekdayLabels.map((label, index) => <span key={index}>{label}</span>)}
    </div>
    <div className="dsh-calendar-grid" role="grid" aria-label={monthTitle(anchor, locale)}>
      {weeks.map((week, row) => week.map(day => {
        const date = Number(day.slice(8))
        const outside = !inMonth(day, anchor)
        const open = data.items.filter(item => item.day === day && !item.done).length
        return <button key={`${row}-${day}`} type="button" role="gridcell"
          className="dsh-calendar-cell" data-outside={outside ? 'true' : 'false'}
          data-today={day === today ? 'true' : 'false'} data-selected={day === selected ? 'true' : 'false'}
          aria-pressed={day === selected} aria-label={day}
          onClick={() => { setSelected(day); if (outside) setAnchor(`${day.slice(0, 7)}-01`) }}>
          <span className="dsh-calendar-date">{date}</span>
          {open > 0 && <span className="dsh-calendar-dot" data-density={Math.min(3, open)} aria-hidden="true" />}
        </button>
      }))}
    </div>
    <div className="dsh-calendar-day">
      {/* 所选日期的条目是一个分组，用和「待办 n」同一个分组标题：14/500 + 计数。 */}
      <h4 className="dsh-todo-heading">
        {selected === today ? t('plan.today') : selected}
        <span className="dsh-todo-count">{selectedItems.filter(item => !item.done).length}</span>
      </h4>
      <div className="dsh-calendar-list">
        {selectedItems.length === 0 && <p className="dsh-todo-empty">{t('calendar.empty')}</p>}
        {selectedItems.length > 0 && <ul className="dsh-todo-list">
          {selectedItems.map(item => <PlannerRow key={item.id} item={item} today={today} t={t} readOnly={readOnly}
            editing={editingId === item.id} showDay={false}
            onToggle={() => onToggle?.(item)}
            onEdit={() => setEditingId(item.id)}
            onSave={fields => { onUpdate?.(item, fields); setEditingId(null) }}
            onDelete={readOnly ? undefined : () => { onDelete?.(item); setEditingId(null) }}
            onCancel={() => setEditingId(null)} />)}
        </ul>}
        {adding && <ItemEditor t={t} initial={emptyDraft(selected)} autoFocus
          onSave={fields => { onCreate?.(fields); setAdding(false) }} onCancel={() => setAdding(false)} />}
        {/* 新增是列表的最后一行，不是卡底的一个浮标；列表短的时候空白落在它下面。 */}
        {!readOnly && !adding && <button type="button" className="dsh-plan-add" onClick={() => setAdding(true)}>
          + {t('calendar.addOn', { day: selected === today ? t('plan.today') : selected.slice(5) })}
        </button>}
      </div>
    </div>
  </div>
}

function ConnectedCalendar(props: WidgetContentProps<CalendarConfig>): ReactNode {
  const { t } = useBuiltin()
  const { config, editing } = props
  const data = useHomeData()
  const today = todayKey()
  if (data.plannerError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshPlanner()}>{t('planner.retry')}</button>
    </div>
  }
  if (data.planner === null) return <p className="dsh-planner-loading" role="status">{t('planner.loading')}</p>
  const readOnly = editing || !data.plannerStorage.writable
  return <CalendarBody data={{ day: today, items: data.planner.items }} today={today} t={t} readOnly={readOnly}
    weekStart={config.weekStart}
    onCreate={fields => { void data.store.mutatePlanner({ op: 'item.create', item: fields }).catch(() => {}) }}
    onToggle={item => { void data.store.mutatePlanner({ op: 'item.toggle', id: item.id }).catch(() => {}) }}
    onUpdate={(item, fields) => { void data.store.mutatePlanner({ op: 'item.update', id: item.id, patch: fields }).catch(() => {}) }}
    onDelete={item => { void data.store.mutatePlanner({ op: 'item.delete', id: item.id }).catch(() => {}) }} />
}

export function CalendarContent(props: WidgetContentProps<CalendarConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as CalendarPreviewData | undefined
  if (preview !== undefined) {
    return <CalendarBody data={preview} today={preview.day} t={t} readOnly weekStart={props.config.weekStart} />
  }
  return <ConnectedCalendar {...props} />
}

export function registerCalendarWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  const preview = plannerPreview()
  return registry.register<CalendarConfig>({
    typeId: '@vlln/dsh-home:calendar', apiVersion: 1,
    title: () => t('widget.calendar.title'), description: () => t('gallery.description.calendar'), source: '@vlln/dsh-home', icon: IconCalendar,
    preview: { data: { day: preview.day, items: preview.items } as unknown as JsonValue },
    sizing: { default: { w: 4, h: 8 }, supported: [{ w: 4, h: 6 }, { w: 4, h: 8 }] },
    configVersion: 1, defaultConfig: defaultCalendarConfig,
    validateConfig: (config): config is CalendarConfig => validateCalendarConfig(config),
    Content: CalendarContent,
  })
}
