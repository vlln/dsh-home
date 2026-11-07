/**
 * 计时器的前端推导：与宿主 `focus.mjs` 同口径，只负责「现在剩多少」。
 *
 * 宿主只存 `startedAt + accumulatedMs`（唯一事实），这里按墙钟算出已走时长；
 * 不落盘、不轮询，组件用 `useNow` 每秒重算一次。
 *
 * @module @vlln/dsh-home/client/focus-model
 */

import type { FocusPomodoro, FocusTimer, PlannerItem } from './api.ts'

/** 计时器已经走了多久（毫秒）。 */
export function timerElapsed(timer: FocusTimer | undefined, now: number): number {
  if (timer === undefined) return 0
  const base = timer.accumulatedMs + (timer.running && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0)
  return Math.max(0, base)
}

/** 番茄钟当前阶段：还剩多久、到点没有。 */
export function pomodoroSnapshot(pomodoro: FocusPomodoro | undefined, now: number): { phase: 'focus' | 'break'; durationMs: number; remainingMs: number; due: boolean } {
  if (pomodoro === undefined) {
    return { phase: 'focus', durationMs: 25 * 60_000, remainingMs: 25 * 60_000, due: false }
  }
  const durationMs = pomodoro.phase === 'break' ? pomodoro.breakMs : pomodoro.focusMs
  const elapsed = pomodoro.elapsedMs + (pomodoro.startedAt !== null ? Math.max(0, now - pomodoro.startedAt) : 0)
  return { phase: pomodoro.phase, durationMs, remainingMs: Math.max(0, durationMs - elapsed), due: elapsed >= durationMs }
}

/** 今日完成轮数。 */
export function completedToday(pomodoro: FocusPomodoro | undefined, day: string): number {
  return pomodoro?.completed[day] ?? 0
}

/** `mm:ss` / `h:mm:ss`。 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** 倒计时剩余：按日历日算天数，再给时分。 */
export function countdownLeft(date: string, now: number): { days: number; hours: number; minutes: number; expired: boolean } {
  const [year, month, day] = date.split('-').map(Number)
  const at = new Date(year, month - 1, day).getTime()
  const diff = at - now
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes, expired: false }
}

/** `YYYY-MM-DD` 的本地解析（不经过 UTC，避免时区漂移）。 */
export function parseDayKey(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

/** 倒计时列表里最近的一个未到期项；都过期时取最后一个。 */
export function nextTarget(items: readonly { id: string; title: string; date: string }[], now: number): { id: string; title: string; date: string } | null {
  if (items.length === 0) return null
  const sorted = [...items].sort((left, right) => left.date.localeCompare(right.date))
  return sorted.find(item => parseDayKey(item.date) > now) ?? sorted[sorted.length - 1] ?? null
}

/** 计划条目里今天有时间的那些（预览与测试共用）。 */
export function timedItems(items: readonly PlannerItem[], day: string): PlannerItem[] {
  return items.filter(item => item.day === day && item.start !== null)
}
