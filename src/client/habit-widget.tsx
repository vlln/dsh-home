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
import { CardEmpty, cx, RowButton } from './ui/index.ts'
import { todayKey, useHomeData } from './home-data.ts'
import { habitDue, habitMarked, habitStreak } from './planner-model.ts'
import { plannerPreview } from './planner-preview.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps } from './widget-contract.ts'
import type { PlannerHabit } from './api.ts'
import { IconHabit } from './widget-glyphs.tsx'

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

/** 稳定的色相槽：同一个习惯总是同一个颜色。 */
export function habitHue(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return hash % 6
}

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
      {visible.length === 0 && <CardEmpty title={t('habit.empty')} />}
      <ul className="dsh-habit-list flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visible.map(habit => {
          const marked = habitMarked(habit, today)
          const streak = habitStreak(habit, today)
          const isDue = habitDue(habit, today)
          // One row, one tap: the whole line toggles, so the target is the row and not a
          // 16px checkbox. Streak and delete ride on the right like every other row.
          return <li key={habit.id} data-marked={marked ? 'true' : 'false'} data-due={isDue ? 'true' : 'false'}>
            <RowButton role="checkbox" aria-checked={marked} disabled={readOnly}
              aria-label={habit.title} onClick={() => onMark?.(habit, !marked)}
              data-hue={habitHue(habit.id)}
              trailing={<>
                <span className={cx('tabular-nums', marked && 'text-status-lime-text')}>
                  {streak === 0 ? t('habit.noStreak') : t('habit.streak', { count: streak })}
                </span>
                {!readOnly && <span role="button" tabIndex={-1} aria-label={t('habit.delete')} className="text-text-tertiary hover:text-text-primary"
                  onClick={event => { event.stopPropagation(); onDelete?.(habit) }}>×</span>}
              </>}>
              <span className="flex w-full min-w-0 items-center justify-start gap-2">
                <span className="dsh-habit-box flex size-4 flex-none items-center justify-center rounded-[4px] border border-border-button-default text-text-primary" aria-hidden="true">
                  <span className="dsh-todo-tick" />
                </span>
                <span className="truncate">{habit.title}</span>
                <span className="shrink-0 text-caption-1-medium text-text-tertiary">{weekdayLabel(habit, t)}</span>
              </span>
            </RowButton>
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
    title: () => t('widget.habit.title'), description: () => t('gallery.description.habit'), source: '@vlln/dsh-home', icon: IconHabit,
    preview: { data: { day: preview.day, habits: preview.habits } as unknown as JsonValue },
    sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }, { w: 4, h: 8 }] },
    configVersion: 1, defaultConfig: defaultHabitConfig,
    validateConfig: (config): config is HabitConfig => validateHabitConfig(config),
    Content: HabitContent,
  })
}
