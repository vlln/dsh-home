/**
 * 待办：按「今天 / 本周 / 更远 / 无日期 / 已完成」分组的清单。
 *
 * 与计划表、日程表、打卡共用一份 `planner.json`：这里勾掉一条，计划表和日历同一帧就变。
 * 新建默认落在今天；点标题进编辑；`preview` 分支只渲染合成数据。
 *
 * @module @vlln/dsh-home/client/todo-widget
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { useHomeData, todayKey } from './home-data.ts'
import type { ItemFields } from './item-editor.tsx'
import { PlannerRow } from './planner-rows.tsx'
import { groupItems, type PlannerGroups } from './planner-model.ts'
import { plannerPreview } from './planner-preview.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { PlannerItem } from './api.ts'

export type TodoConfig = { showDone: boolean }

export function defaultTodoConfig(): TodoConfig {
  return { showDone: true }
}

export function validateTodoConfig(value: unknown): value is TodoConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'showDone') && typeof config.showDone === 'boolean'
}

export interface TodoPreviewData {
  day: string
  items: PlannerItem[]
}

const GROUP_ORDER: { key: keyof PlannerGroups; label: string }[] = [
  { key: 'today', label: 'todo.group.today' },
  { key: 'week', label: 'todo.group.week' },
  { key: 'later', label: 'todo.group.later' },
  { key: 'undated', label: 'todo.group.undated' },
]

interface BodyProps {
  data: TodoPreviewData
  today: string
  t: Translate
  readOnly: boolean
  showDone: boolean
  onCreate?: (title: string) => void
  onToggle?: (item: PlannerItem) => void
  onUpdate?: (item: PlannerItem, fields: ItemFields) => void
  onDelete?: (item: PlannerItem) => void
}

function TodoBody({ data, today, t, readOnly, showDone, onCreate, onToggle, onUpdate, onDelete }: BodyProps): ReactNode {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const groups = groupItems(data.items, today)
  const total = groups.today.length + groups.week.length + groups.later.length + groups.undated.length
  const visibleDone = showDone ? groups.done.slice(0, 6) : []
  const add = (): void => {
    const title = draft.trim()
    if (title === '' || onCreate === undefined) return
    onCreate(title)
    setDraft('')
  }
  return <div className="dsh-todo">
    <div className="dsh-todo-scroll">
      {total === 0 && groups.done.length === 0 && <p className="dsh-todo-empty">{t('todo.empty')}</p>}
      {GROUP_ORDER.map(group => {
        const items = groups[group.key]
        if (items.length === 0) return null
        return <section key={group.key} className="dsh-todo-group" data-group={group.key}>
          <h4 className="dsh-todo-heading">{t(group.label)}<span className="dsh-todo-count">{items.length}</span></h4>
          <ul className="dsh-todo-list">
            {items.map(item => <PlannerRow key={item.id} item={item} today={today} t={t} readOnly={readOnly}
              editing={editingId === item.id}
              onToggle={() => onToggle?.(item)}
              onEdit={() => setEditingId(item.id)}
              onSave={fields => { onUpdate?.(item, fields); setEditingId(null) }}
              onDelete={readOnly ? undefined : () => { onDelete?.(item); setEditingId(null) }}
              onCancel={() => setEditingId(null)} />)}
          </ul>
        </section>
      })}
      {visibleDone.length > 0 && <section className="dsh-todo-group" data-group="done">
        <h4 className="dsh-todo-heading">{t('todo.group.done')}<span className="dsh-todo-count">{groups.done.length}</span></h4>
        <ul className="dsh-todo-list">
          {visibleDone.map(item => <PlannerRow key={item.id} item={item} today={today} t={t} readOnly={readOnly}
            editing={editingId === item.id}
            onToggle={() => onToggle?.(item)}
            onEdit={() => setEditingId(item.id)}
            onSave={fields => { onUpdate?.(item, fields); setEditingId(null) }}
            onDelete={readOnly ? undefined : () => { onDelete?.(item); setEditingId(null) }}
            onCancel={() => setEditingId(null)} />)}
        </ul>
      </section>}
    </div>
    {!readOnly && <form className="dsh-todo-add" onSubmit={event => { event.preventDefault(); add() }}>
      <input type="text" value={draft} maxLength={200} placeholder={t('todo.addPlaceholder')}
        onChange={event => setDraft(event.target.value)} aria-label={t('todo.addPlaceholder')} />
      <button type="submit" className="dsh-todo-add-button" disabled={draft.trim() === ''} aria-label={t('planner.add')}>+</button>
    </form>}
  </div>
}

function ConnectedTodo({ config, editing }: WidgetContentProps<TodoConfig>): ReactNode {
  const { t } = useBuiltin()
  const data = useHomeData()
  const today = todayKey()
  if (data.plannerError !== null) {
    return <div className="dsh-planner-fallback" role="status">
      <p>{t('planner.unavailable')}</p>
      <p className="dsh-planner-detail">{data.plannerError}</p>
      <button type="button" className="dsh-planner-retry" onClick={() => void data.store.refreshPlanner()}>{t('planner.retry')}</button>
    </div>
  }
  if (data.planner === null) return <p className="dsh-planner-loading" role="status">{t('planner.loading')}</p>
  const readOnly = editing || !data.plannerStorage.writable
  return <TodoBody data={{ day: today, items: data.planner.items }} today={today} t={t} readOnly={readOnly}
    showDone={config.showDone}
    onCreate={title => { void data.store.mutatePlanner({ op: 'item.create', item: { title, day: today } }).catch(() => {}) }}
    onToggle={item => { void data.store.mutatePlanner({ op: 'item.toggle', id: item.id }).catch(() => {}) }}
    onUpdate={(item, fields) => { void data.store.mutatePlanner({ op: 'item.update', id: item.id, patch: fields }).catch(() => {}) }}
    onDelete={item => { void data.store.mutatePlanner({ op: 'item.delete', id: item.id }).catch(() => {}) }} />
}

export function TodoContent(props: WidgetContentProps<TodoConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as TodoPreviewData | undefined
  if (preview !== undefined) {
    return <TodoBody data={preview} today={preview.day} t={t} readOnly showDone={props.config.showDone} />
  }
  return <ConnectedTodo {...props} />
}

export function registerTodoWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  const preview = plannerPreview()
  return registry.register<TodoConfig>({
    typeId: '@vlln/dsh-home:todo', apiVersion: 1,
    title: () => t('widget.todo.title'), description: () => t('gallery.description.todo'), source: '@vlln/dsh-home',
    preview: { data: { day: preview.day, items: preview.items } as unknown as JsonValue },
    sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }, { w: 4, h: 8 }, { w: 8, h: 6 }] },
    configVersion: 1, defaultConfig: defaultTodoConfig, validateConfig: (config): config is TodoConfig => validateTodoConfig(config),
    Content: TodoContent,
  })
}
