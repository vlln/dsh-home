/**
 * 条目编辑器：待办、计划表、日程表共用的一张表单。
 *
 * 只做「编辑一条」：标题、日期、起止时间、备注；保存由调用方发 op。
 * 校验与宿主同口径（标题非空、end 晚于 start、有 start 必须有 day），
 * 但宿主仍是权威——这里只负责让按钮在明显不合法时不可点。
 *
 * @module @vlln/dsh-home/client/item-editor
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Translate } from './format.ts'

export interface ItemDraft {
  title: string
  day: string | null
  start: string | null
  end: string | null
  note: string
}

/** 空草稿；新建时把日期预填成「今天」或点中的那天。 */
export function emptyDraft(day: string | null = null): ItemDraft {
  return { title: '', day, start: null, end: null, note: '' }
}

/** 本地校验；返回错误键或 null。 */
export function draftError(draft: ItemDraft): string | null {
  if (draft.title.trim() === '') return 'planner.error.title'
  if (draft.start !== null && draft.day === null) return 'planner.error.dayRequired'
  if (draft.end !== null && draft.start === null) return 'planner.error.startRequired'
  if (draft.start !== null && draft.end !== null && draft.end <= draft.start) return 'planner.error.endAfterStart'
  return null
}

/** 表单提交的字段（与宿主 `ITEM_FIELDS` 同形）。 */
export interface ItemFields {
  title: string
  day: string | null
  start: string | null
  end: string | null
  note: string
}

export interface ItemEditorProps {
  initial: ItemDraft
  t: Translate
  onSave: (fields: ItemFields) => void
  onCancel: () => void
  onDelete?: () => void
  /** 新建时自动聚焦标题。 */
  autoFocus?: boolean
  /** 紧凑模式：只给一行标题 + 日期时间的窄卡用。 */
  compact?: boolean
}

export function ItemEditor({ initial, t, onSave, onCancel, onDelete, autoFocus = true, compact = false }: ItemEditorProps): ReactNode {
  const id = useId()
  const [draft, setDraft] = useState<ItemDraft>(initial)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const error = draftError(draft)

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus()
  }, [autoFocus])

  const submit = (): void => {
    if (error !== null) return
    onSave({
      title: draft.title.trim(),
      day: draft.day,
      start: draft.start,
      end: draft.end,
      note: draft.note,
    })
  }

  return <form className="dsh-item-editor" data-compact={compact ? 'true' : 'false'}
    onSubmit={event => { event.preventDefault(); submit() }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onCancel() }
    }}>
    <label className="dsh-item-field dsh-item-title" htmlFor={`${id}-title`}>
      <span className="dsh-item-label">{t('planner.field.title')}</span>
      <input id={`${id}-title`} ref={titleRef} type="text" maxLength={200} value={draft.title}
        placeholder={t('planner.field.titlePlaceholder')}
        onChange={event => setDraft({ ...draft, title: event.target.value })} />
    </label>
    <div className="dsh-item-row">
      <label className="dsh-item-field" htmlFor={`${id}-day`}>
        <span className="dsh-item-label">{t('planner.field.day')}</span>
        <input id={`${id}-day`} type="date" value={draft.day ?? ''}
          onChange={event => setDraft({ ...draft, day: event.target.value === '' ? null : event.target.value })} />
      </label>
      <label className="dsh-item-field" htmlFor={`${id}-start`}>
        <span className="dsh-item-label">{t('planner.field.start')}</span>
        <input id={`${id}-start`} type="time" value={draft.start ?? ''}
          onChange={event => setDraft({ ...draft, start: event.target.value === '' ? null : event.target.value })} />
      </label>
      <label className="dsh-item-field" htmlFor={`${id}-end`}>
        <span className="dsh-item-label">{t('planner.field.end')}</span>
        <input id={`${id}-end`} type="time" value={draft.end ?? ''}
          onChange={event => setDraft({ ...draft, end: event.target.value === '' ? null : event.target.value })} />
      </label>
    </div>
    {!compact && <label className="dsh-item-field" htmlFor={`${id}-note`}>
      <span className="dsh-item-label">{t('planner.field.note')}</span>
      <textarea id={`${id}-note`} rows={2} maxLength={2000} value={draft.note}
        onChange={event => setDraft({ ...draft, note: event.target.value })} />
    </label>}
    <div className="dsh-item-actions">
      {error === null ? <span className="dsh-item-hint" /> : <span className="dsh-item-hint" role="alert">{t(error)}</span>}
      {onDelete !== undefined && <button type="button" className="dsh-item-button dsh-item-delete" onClick={onDelete}>{t('planner.action.delete')}</button>}
      <button type="button" className="dsh-item-button" onClick={onCancel}>{t('planner.action.cancel')}</button>
      <button type="submit" className="dsh-item-button dsh-item-save" disabled={error !== null}>{t('planner.action.save')}</button>
    </div>
  </form>
}
