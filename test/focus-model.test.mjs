import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countdownLeft, formatClock, nextTarget, pomodoroSnapshot, timerElapsed } from '../src/client/focus-model.ts'

const NOW = new Date(2026, 10, 6, 10, 0, 0).getTime()

test('a timer reports accumulated time only while running', () => {
  assert.equal(timerElapsed(undefined, NOW), 0)
  assert.equal(timerElapsed({ label: '', startedAt: null, accumulatedMs: 65_000, running: false }, NOW), 65_000)
  assert.equal(timerElapsed({ label: '', startedAt: NOW - 30_000, accumulatedMs: 65_000, running: true }, NOW), 95_000)
  assert.equal(timerElapsed({ label: '', startedAt: NOW, accumulatedMs: 0, running: true }, NOW - 10_000), 0, 'never negative')
})

test('a pomodoro shrinks toward zero and reports due at the boundary', () => {
  const pomodoro = { phase: 'focus', startedAt: NOW, elapsedMs: 0, focusMs: 25 * 60_000, breakMs: 5 * 60_000, completed: {} }
  assert.equal(pomodoroSnapshot(pomodoro, NOW + 10 * 60_000).remainingMs, 15 * 60_000)
  assert.equal(pomodoroSnapshot(pomodoro, NOW + 24 * 60_000).due, false)
  assert.equal(pomodoroSnapshot(pomodoro, NOW + 25 * 60_000).due, true)
  assert.equal(pomodoroSnapshot(pomodoro, NOW + 99 * 60_000).remainingMs, 0)
  const rest = { ...pomodoro, phase: 'break', focusMs: 25 * 60_000, breakMs: 5 * 60_000 }
  assert.equal(pomodoroSnapshot(rest, NOW).durationMs, 5 * 60_000)
  assert.deepEqual(pomodoroSnapshot(undefined, NOW), { phase: 'focus', durationMs: 25 * 60_000, remainingMs: 25 * 60_000, due: false })
})

test('clocks render as mm:ss and h:mm:ss', () => {
  assert.equal(formatClock(0), '00:00')
  assert.equal(formatClock(59_000), '00:59')
  assert.equal(formatClock(61_000), '01:01')
  assert.equal(formatClock(3_600_000), '1:00:00')
  assert.equal(formatClock(3_661_000), '1:01:01')
  assert.equal(formatClock(-5), '00:00')
})

test('a countdown runs to the start of the target day', () => {
  assert.deepEqual(countdownLeft('2026-11-06', NOW), { days: 0, hours: 0, minutes: 0, expired: true }, 'today has already begun')
  assert.deepEqual(countdownLeft('2026-11-07', NOW), { days: 0, hours: 14, minutes: 0, expired: false }, 'tomorrow is 14 hours away')
  assert.deepEqual(countdownLeft('2026-11-20', NOW), { days: 13, hours: 14, minutes: 0, expired: false })
  assert.equal(countdownLeft('2020-01-01', NOW).expired, true)
})

test('the nearest unexpired target wins, and an all-expired list keeps the last one', () => {
  const items = [
    { id: 'a', title: 'late', date: '2026-01-01' },
    { id: 'b', title: 'soon', date: '2026-11-08' },
    { id: 'c', title: 'later', date: '2027-01-01' },
  ]
  assert.equal(nextTarget(items, NOW)?.id, 'b')
  assert.equal(nextTarget([{ id: 'a', title: 'late', date: '2026-01-01' }], NOW)?.id, 'a', 'an expired target stays visible')
  assert.equal(nextTarget([], NOW), null)
  const today = { id: 'today', title: 'today', date: '2026-11-06' }
  const tomorrow = { id: 'tomorrow', title: 'tomorrow', date: '2026-11-07' }
  assert.equal(nextTarget([today, tomorrow], NOW)?.id, 'tomorrow', 'a target day that has started is no longer upcoming')
  assert.equal(nextTarget([today, tomorrow], new Date(2026, 10, 5, 23, 59).getTime())?.id, 'today')
  assert.equal(nextTarget([today], new Date(2026, 10, 6, 0, 5).getTime())?.id, 'today', 'an expired target stays visible as the fallback')
})
