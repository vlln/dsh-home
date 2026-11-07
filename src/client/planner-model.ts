/**
 * 计划相关的纯计算：分组、排序、月网格、连续天数。
 *
 * 与宿主 `planner.mjs` 的校验口径保持一致，但只做展示与分桶——写入口径只有一份，
 * 在宿主侧。这里全部是纯函数，单测直接喂数据（见 test/planner-model.test.mjs）。
 *
 * @module @vlln/dsh-home/client/planner-model
 */

import type { PlannerHabit, PlannerItem } from './api.ts'
import { dayDiff, shiftDay, weekdayOf } from './home-data.ts'

export interface PlannerGroups {
  /** 今天（含逾期未完成的也算今天要处理）。 */
  today: PlannerItem[]
  /** 今天之后的七天内。 */
  week: PlannerItem[]
  /** 更远。 */
  later: PlannerItem[]
  /** 没有日期的待办。 */
  undated: PlannerItem[]
  /** 已完成（按完成时间倒序）。 */
  done: PlannerItem[]
}

/** 未完成在前；有日期在前；同一天按时间；再按创建时间。 */
export function sortItems(items: readonly PlannerItem[]): PlannerItem[] {
  return [...items].sort((left, right) => {
    if (left.done !== right.done) return left.done ? 1 : -1
    const leftDay = left.day ?? '9999-12-31'
    const rightDay = right.day ?? '9999-12-31'
    if (leftDay !== rightDay) return leftDay < rightDay ? -1 : 1
    const leftStart = left.start ?? '99:99'
    const rightStart = right.start ?? '99:99'
    if (leftStart !== rightStart) return leftStart < rightStart ? -1 : 1
    if (left.done && right.done) return (right.doneAt ?? 0) - (left.doneAt ?? 0)
    return left.createdAt - right.createdAt
  })
}

/**
 * 把条目分到「今天 / 本周 / 更远 / 无日期 / 已完成」。
 * 逾期未完成归入今天（日历里那一格也会亮），不让它消失在旧日期里。
 */
export function groupItems(items: readonly PlannerItem[], today: string): PlannerGroups {
  const groups: PlannerGroups = { today: [], week: [], later: [], undated: [], done: [] }
  for (const item of sortItems(items)) {
    if (item.done) { groups.done.push(item); continue }
    if (item.day === null) { groups.undated.push(item); continue }
    const diff = dayDiff(today, item.day)
    if (diff <= 0) groups.today.push(item)
    else if (diff <= 7) groups.week.push(item)
    else groups.later.push(item)
  }
  return groups
}

/** 某一天的条目（含已完成的），按时间排序。 */
export function itemsOnDay(items: readonly PlannerItem[], day: string): PlannerItem[] {
  return sortItems(items.filter(item => item.day === day))
}

/** 某一天是否还有没做完的事——月视图的圆点只表示这个。 */
export function hasOpenWork(items: readonly PlannerItem[], day: string): boolean {
  return items.some(item => item.day === day && !item.done)
}

/**
 * 月网格（周一开头，6 行 × 7 列），首尾填上相邻月份的日期。
 * @param anchor 任意一天（用它的年月）
 */
export function monthGrid(anchor: string): string[][] {
  const [year, month] = anchor.split('-').map(Number)
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const offset = weekdayOf(first) - 1
  let cursor = shiftDay(first, -offset)
  const weeks: string[][] = []
  for (let row = 0; row < 6; row++) {
    const week: string[] = []
    for (let column = 0; column < 7; column++) {
      week.push(cursor)
      cursor = shiftDay(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** 月网格里是否属于锚点月份。 */
export function inMonth(day: string, anchor: string): boolean {
  return day.slice(0, 7) === anchor.slice(0, 7)
}

/** 同一个月前后翻页。 */
export function shiftMonth(anchor: string, delta: number): string {
  const [year, month] = anchor.split('-').map(Number)
  const at = new Date(year, month - 1 + delta, 1)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-01`
}

/** 习惯今天该不该做。 */
export function habitDue(habit: PlannerHabit, today: string): boolean {
  if (habit.weekdays === null) return true
  return habit.weekdays.includes(weekdayOf(today))
}

/** 习惯今天做过没有。 */
export function habitMarked(habit: PlannerHabit, today: string): boolean {
  return habit.marks[today] === true
}

/**
 * 连续天数：从今天往回数，遇到没做的就停；今天还没做但昨天做了，仍然算昨天的连续。
 * 这样早上打开不会看到「连续 0 天」。
 */
export function habitStreak(habit: PlannerHabit, today: string): number {
  let cursor = today
  if (!habitMarked(habit, cursor)) cursor = shiftDay(cursor, -1)
  let streak = 0
  // 上限一年，防止脏数据把循环拖长。
  for (let guard = 0; guard < 400; guard++) {
    if (!habitMarked(habit, cursor)) break
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

/** 一条条目的时间标签：`09:30` 或 `09:30–10:30`，没时间就是空串。 */
export function itemTime(item: PlannerItem): string {
  if (item.start === null) return ''
  return item.end === null ? item.start : `${item.start}–${item.end}`
}

/** 条目的简短日期标签：今天 / 明天 / 11-08。 */
export function itemDayLabel(item: PlannerItem, today: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (item.day === null) return ''
  const diff = dayDiff(today, item.day)
  if (diff === 0) return t('plan.today')
  if (diff === 1) return t('plan.tomorrow')
  if (diff === -1) return t('plan.yesterday')
  return item.day.slice(5)
}
