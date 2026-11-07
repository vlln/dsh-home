/**
 * 打卡：今天该做的习惯，点一下打点，右侧是连续天数。
 *
 * 只显示今天该做的（`weekdays` 过滤）；连续天数从今天往回数，今天还没做时从昨天起算，
 * 早上打开不会看到「连续 0 天」。数据与待办同一份 planner 文档。
 *
 * @module @vlln/dsh-home/client/habit-widget
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { todayKey, useHomeData } from './home-data.ts'
import { habitDue, habitMarked, habitStreak } from './planner-model.ts'
import { plannerPreview } from './planner-preview.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { PlannerHabit } from './api.ts'

export type HabitConfig = { showAll: boolean }

function defaultHabitConfig(): HabitConfig {
  return { showAll: false }
}

function validateHabitConfig(value: unknown): value is HabitConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'showAll') && typeof config.showAll === 'boolean'
}

export interface HabitPreviewData { day: string; habits: PlannerHabit[] }

function weekdayLabel(habit: PlannerHabit, t: Translate): string {
  if (habit.weekdays === null) return t('habit.everyday')
  return t('habit.weekdays', { days: habit.weekdays.map(day => t(`calendar.weekday.${day}`)).join(' ') })
}

function HabitBody({ habits, today, t, readOnly, showAll, onMark, onDelete, onCreate }: {
  habits: PlannerHabit[]
  today: string
  t: Translate
  readOnly: boolean
  showAll: boolean
  onMark?: (habit: PlannerHabit, on: boolean) => void
  onDelete?: (habit: PlannerHabit) => void
  onCreate?: (title: string) => void
}): ReactNode {
  const [draft, setDraft] = useState('')
  const due = habits.filter(habit => habitDue(habit, today))
  const others = habits.filter(habit => !habitDue(habit, today))
  const visible = showAll ? [...due, ...others] : due
  const add = (): void => {
    const title = draft.trim()
    if (title === '' || onCreate === undefined) return
    onCreate(title)
    setDraft('')
  }
  return <div className="dsh-habit">
    <div className="dsh-habit-scroll">
      {visible.length === 0 && <p className="dsh-todo-empty">{t('habit.empty')}</p>}
      <ul className="dsh-habit-list">
        {visible.map(habit => {
          const marked = habitMarked(habit, today)
          const streak = habitStreak(habit, today)
          const isDue = habitDue(habit, today)
          return <li key={habit.id} className="dsh-habit-row" data-marked={marked ? 'true' : 'false'} data-due={isDue ? 'true' : 'false'}>
            <button type="button" className="dsh-habit-mark" role="checkbox" aria-checked={marked}
              aria-label={habit.title} disabled={readOnly} onClick={() => onMark?.(habit, !marked)}>
              <span className="dsh-todo-tick" aria-hidden="true" />
            </button>
            <span className="dsh-habit-text">
              <span className="dsh-habit-title">{habit.title}</span>
              <span className="dsh-habit-meta">{weekdayLabel(habit, t)}</span>
            </span>
            <span className="dsh-habit-streak" data-zero={streak === 0 ? 'true' : 'false'}>
              {streak === 0 ? t('habit.noStreak') : t('habit.streak', { count: streak })}
            </span>
            {!readOnly && <button type="button" className="dsh-habit-delete" aria-label={t('habit.delete')}
              onClick={() => onDelete?.(habit)}>×</button>}
          </li>
        })}
      </ul>
    </div>
    {!readOnly && <form className="dsh-todo-add" onSubmit={event => { event.preventDefault(); add() }}>
      <input type="text" value={draft} maxLength={200} placeholder={t('habit.addPlaceholder')}
        aria-label={t('habit.addPlaceholder')} onChange={event => setDraft(event.target.value)} />
      <button type="submit" className="dsh-todo-add-button" disabled={draft.trim() === ''} aria-label={t('planner.add')}>+</button>
    </form>}
  </div>
}

function ConnectedHabit(props: WidgetContentProps<HabitConfig>): ReactNode {
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
  return <HabitBody habits={data.planner.habits} today={today} t={t} readOnly={readOnly} showAll={config.showAll}
    onMark={(habit, on) => { void data.store.mutatePlanner({ op: 'habit.mark', id: habit.id, day: today, on }).catch(() => {}) }}
    onDelete={habit => { void data.store.mutatePlanner({ op: 'habit.delete', id: habit.id }).catch(() => {}) }}
    onCreate={title => { void data.store.mutatePlanner({ op: 'habit.create', habit: { title } }).catch(() => {}) }} />
}

export function HabitContent(props: WidgetContentProps<HabitConfig>): ReactNode {
  const { t } = useBuiltin()
  const preview = props.preview?.data as unknown as HabitPreviewData | undefined
  if (preview !== undefined) {
    return <HabitBody habits={preview.habits} today={preview.day} t={t} readOnly showAll={props.config.showAll} />
  }
  return <ConnectedHabit {...props} />
}

export function registerHabitWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  const preview = plannerPreview()
  return registry.register<HabitConfig>({
    typeId: '@vlln/dsh-home:habit', apiVersion: 1,
    title: () => t('widget.habit.title'), description: () => t('gallery.description.habit'), source: '@vlln/dsh-home',
    preview: { data: { day: preview.day, habits: preview.habits } as unknown as JsonValue },
    sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }, { w: 4, h: 8 }] },
    configVersion: 1, defaultConfig: defaultHabitConfig,
    validateConfig: (config): config is HabitConfig => validateHabitConfig(config),
    Content: HabitContent,
  })
}
