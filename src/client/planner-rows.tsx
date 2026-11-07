/**
 * 一条计划条目在列表里的样子：勾选框 + 标题 + 时间/日期徽标，点标题进编辑。
 *
 * 待办、计划表、日程表共用这一行，保证同一件事在三个地方长得一样、行为一样。
 *
 * @module @vlln/dsh-home/client/planner-rows
 */

import type { ReactNode } from 'react'
import { ItemEditor, type ItemFields } from './item-editor.tsx'
import { itemDayLabel, itemTime } from './planner-model.ts'
import type { Translate } from './format.ts'
import type { PlannerItem } from './api.ts'

export interface PlannerRowProps {
  item: PlannerItem
  today: string
  t: Translate
  readOnly: boolean
  editing: boolean
  /** 是否显示日期徽标（今天视图里通常不显示）。 */
  showDay?: boolean
  onToggle: () => void
  onEdit: () => void
  onSave: (fields: ItemFields) => void
  onDelete?: () => void
  onCancel: () => void
}

export function PlannerRow({ item, today, t, readOnly, editing, showDay = true, onToggle, onEdit, onSave, onDelete, onCancel }: PlannerRowProps): ReactNode {
  if (editing) {
    return <li className="dsh-todo-item" data-editing="true">
      <ItemEditor t={t} compact autoFocus
        initial={{ title: item.title, day: item.day, start: item.start, end: item.end, note: item.note }}
        onSave={onSave} onDelete={onDelete} onCancel={onCancel} />
    </li>
  }
  const time = itemTime(item)
  const dayLabel = showDay && item.day !== today ? itemDayLabel(item, today, t) : ''
  return <li className="dsh-todo-item" data-done={item.done ? 'true' : 'false'}>
    <button type="button" className="dsh-todo-check" role="checkbox" aria-checked={item.done}
      aria-label={item.title} disabled={readOnly} onClick={onToggle}>
      <span className="dsh-todo-tick" aria-hidden="true" />
    </button>
    <button type="button" className="dsh-todo-main" disabled={readOnly} onClick={onEdit}
      title={item.note === '' ? undefined : item.note}>
      <span className="dsh-todo-title">{item.title}</span>
      {(time !== '' || dayLabel !== '') && <span className="dsh-todo-meta">
        {time !== '' && <span className="dsh-todo-time">{time}</span>}
        {dayLabel !== '' && <span className="dsh-todo-day">{dayLabel}</span>}
      </span>}
    </button>
  </li>
}
