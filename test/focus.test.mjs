import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyFocusOp, completedToday, dayKey, DEFAULT_BREAK_MS, DEFAULT_FOCUS_MS, emptyFocus,
  MAX_SLOTS, normalizeFocus, pomodoroSnapshot, settlePomodoro, timerElapsed,
} from '../src/focus.mjs'

const NOW = new Date(2026, 10, 6, 9, 0, 0).getTime()
const apply = (doc, op, now = NOW) => applyFocusOp(doc, op, { now })

test('a timer starts from zero and accumulates wall-clock time', () => {
  const started = apply(emptyFocus(), { op: 'timer.start', instanceId: 'timer-1' })
  assert.equal(started.changed, true)
  const timer = started.doc.timers['timer-1']
  assert.equal(timer.running, true)
  assert.equal(timer.startedAt, NOW)
  assert.equal(timer.accumulatedMs, 0)
  assert.equal(timerElapsed(timer, NOW + 65_000), 65_000)

  const resting = apply(started.doc, { op: 'timer.pause', instanceId: 'timer-1' }, NOW + 65_000)
  const paused = resting.doc.timers['timer-1']
  assert.equal(paused.running, false)
  assert.equal(paused.startedAt, null)
  assert.equal(paused.accumulatedMs, 65_000)
  assert.equal(timerElapsed(paused, NOW + 10_000_000), 65_000, 'a paused timer does not move')

  const resumed = apply(resting.doc, { op: 'timer.start', instanceId: 'timer-1' }, NOW + 70_000)
  assert.equal(timerElapsed(resumed.doc.timers['timer-1'], NOW + 75_000), 70_000)

  const reset = apply(resumed.doc, { op: 'timer.reset', instanceId: 'timer-1' })
  assert.equal(timerElapsed(reset.doc.timers['timer-1'], NOW + 1_000_000), 0)
})

test('timer rename trims and caps, and starting twice is a no-op', () => {
  const started = apply(emptyFocus(), { op: 'timer.start', instanceId: 'timer-1' }).doc
  const renamed = apply(started, { op: 'timer.rename', instanceId: 'timer-1', label: `  ${'x'.repeat(200)}  ` }).doc
  assert.equal(renamed.timers['timer-1'].label.length, 80)
  assert.equal(renamed.timers['timer-1'].label, 'x'.repeat(80))
  const again = apply(renamed, { op: 'timer.start', instanceId: 'timer-1' }, NOW + 5_000)
  assert.equal(again.doc.timers['timer-1'].startedAt, NOW, 'a running timer keeps its start')
})

test('a pomodoro runs 25/5, counts one round per focus phase, and settles only once', () => {
  const started = apply(emptyFocus(), { op: 'pomodoro.start', instanceId: 'pomo-1' }).doc
  const pomodoro = started.pomodoros['pomo-1']
  assert.equal(pomodoro.phase, 'focus')
  assert.equal(pomodoro.focusMs, DEFAULT_FOCUS_MS)
  assert.equal(pomodoro.breakMs, DEFAULT_BREAK_MS)

  const halfway = pomodoroSnapshot(pomodoro, NOW + 10 * 60_000)
  assert.equal(halfway.phase, 'focus')
  assert.equal(halfway.remainingMs, 15 * 60_000)
  assert.equal(halfway.due, false)

  const due = pomodoroSnapshot(pomodoro, NOW + 26 * 60_000)
  assert.equal(due.due, true)
  assert.equal(due.remainingMs, 0)

  const settled = settlePomodoro(pomodoro, NOW + 26 * 60_000)
  assert.equal(settled.settled, true)
  assert.equal(settled.pomodoro.phase, 'break')
  assert.equal(settled.pomodoro.startedAt, null, 'settling pauses at the next phase start')
  assert.equal(settled.pomodoro.elapsedMs, 0)
  assert.equal(settled.pomodoro.completed[dayKey(NOW)] ?? 0, 1)

  const again = settlePomodoro(settled.pomodoro, NOW + 3 * 3600_000)
  assert.equal(again.settled, false, 'an idle settled pomodoro does not settle twice')
})

test('a break does not add a round, and the next focus phase does', () => {
  const started = apply(emptyFocus(), { op: 'pomodoro.start', instanceId: 'pomo-1' }).doc
  const settled = apply(started, { op: 'pomodoro.settle', instanceId: 'pomo-1' }, NOW + 26 * 60_000).doc
  assert.equal(settled.pomodoros['pomo-1'].phase, 'break')
  const restarted = apply(settled, { op: 'pomodoro.start', instanceId: 'pomo-1' }, NOW + 30 * 60_000).doc
  const afterBreak = apply(restarted, { op: 'pomodoro.settle', instanceId: 'pomo-1' }, NOW + 36 * 60_000).doc
  assert.equal(afterBreak.pomodoros['pomo-1'].phase, 'focus')
  assert.equal(completedToday(afterBreak.pomodoros['pomo-1'], NOW + 36 * 60_000), 1, 'the break did not count')

  const secondRound = apply(afterBreak, { op: 'pomodoro.start', instanceId: 'pomo-1' }, NOW + 40 * 60_000).doc
  const finished = apply(secondRound, { op: 'pomodoro.settle', instanceId: 'pomo-1' }, NOW + 70 * 60_000).doc
  assert.equal(completedToday(finished.pomodoros['pomo-1'], NOW + 70 * 60_000), 2)
})

test('pause freezes the remaining time; skip switches phase without counting', () => {
  const started = apply(emptyFocus(), { op: 'pomodoro.start', instanceId: 'pomo-1' }).doc
  const paused = apply(started, { op: 'pomodoro.pause', instanceId: 'pomo-1' }, NOW + 10 * 60_000).doc
  const pomodoro = paused.pomodoros['pomo-1']
  assert.equal(pomodoro.elapsedMs, 10 * 60_000)
  assert.equal(pomodoro.startedAt, null)
  assert.equal(pomodoroSnapshot(pomodoro, NOW + 3 * 3600_000).remainingMs, 15 * 60_000)

  const skipped = apply(paused, { op: 'pomodoro.skip', instanceId: 'pomo-1' }).doc
  assert.equal(skipped.pomodoros['pomo-1'].phase, 'break')
  assert.equal(completedToday(skipped.pomodoros['pomo-1'], NOW), 0, 'a skip is not a completed round')

  const reset = apply(skipped, { op: 'pomodoro.reset', instanceId: 'pomo-1' }).doc
  assert.equal(reset.pomodoros['pomo-1'].phase, 'focus')
  assert.equal(reset.pomodoros['pomo-1'].elapsedMs, 0)
  assert.equal(reset.pomodoros['pomo-1'].startedAt, null)
})

test('settling on a later day counts the round on the day it settled', () => {
  const started = apply(emptyFocus(), { op: 'pomodoro.start', instanceId: 'pomo-1' }).doc
  const nextDay = NOW + 86_400_000
  const settled = apply(started, { op: 'pomodoro.settle', instanceId: 'pomo-1' }, nextDay).doc
  assert.equal(settled.pomodoros['pomo-1'].completed[dayKey(nextDay)] ?? 0, 1)
  assert.equal(completedToday(settled.pomodoros['pomo-1'], NOW), 0)
})

test('unknown slots are typed errors, and clearing is idempotent', () => {
  const codeOf = fn => { try { fn() } catch (error) { return error.code } return 'none' }
  const doc = emptyFocus()
  assert.equal(codeOf(() => apply(doc, { op: 'timer.pause', instanceId: 'nope' })), 'missing-timer')
  assert.equal(codeOf(() => apply(doc, { op: 'pomodoro.pause', instanceId: 'nope' })), 'missing-pomodoro')
  assert.equal(codeOf(() => apply(doc, { op: 'timer.start' })), 'bad-slot')
  assert.equal(codeOf(() => apply(doc, { op: 'nope' })), 'unknown-op')
  assert.equal(apply(doc, { op: 'timer.clear', instanceId: 'nope' }).changed, false)
  assert.equal(apply(doc, { op: 'timer.reset', instanceId: 'nope' }).changed, false)
})

test('gc drops slots whose widget instance is gone', () => {
  let doc = apply(emptyFocus(), { op: 'timer.start', instanceId: 'keep' }).doc
  doc = apply(doc, { op: 'timer.start', instanceId: 'gone' }).doc
  doc = apply(doc, { op: 'pomodoro.start', instanceId: 'gone' }).doc
  const after = apply(doc, { op: 'focus.gc', instanceIds: ['keep'] }).doc
  assert.deepEqual(Object.keys(after.timers), ['keep'])
  assert.deepEqual(Object.keys(after.pomodoros), [])
  assert.equal(apply(after, { op: 'focus.gc', instanceIds: ['keep'] }).changed, false)
})

test('slots are capped', () => {
  let doc = emptyFocus()
  for (let index = 0; index < MAX_SLOTS; index++) doc = apply(doc, { op: 'timer.start', instanceId: `t${index}` }).doc
  assert.throws(() => apply(doc, { op: 'timer.start', instanceId: 'overflow' }), /at most 64 timers/u)
  assert.equal(apply(doc, { op: 'timer.start', instanceId: 't0' }).changed, false, 'a running slot is a no-op')
  assert.equal(apply(doc, { op: 'timer.pause', instanceId: 't0' }).changed, true, 'an existing slot still works')
})

test('stored focus documents round-trip and corrupt ones read as null', () => {
  let doc = apply(emptyFocus(), { op: 'timer.start', instanceId: 'timer-1' }).doc
  doc = apply(doc, { op: 'pomodoro.start', instanceId: 'pomo-1' }).doc
  doc = apply(doc, { op: 'pomodoro.settle', instanceId: 'pomo-1' }, NOW + 30 * 60_000).doc
  assert.deepEqual(normalizeFocus(JSON.parse(JSON.stringify(doc))), doc)

  assert.equal(normalizeFocus(null), null)
  assert.equal(normalizeFocus({ ...doc, version: 2 }), null)
  assert.equal(normalizeFocus({ ...doc, timers: [] }), null)
  assert.equal(normalizeFocus({ ...doc, timers: { a: { label: 3 } } }), null)
  assert.equal(normalizeFocus({ ...doc, timers: { a: { label: 'x', startedAt: -1, accumulatedMs: -5 } } }), null, 'negative facts are corrupt')
  assert.equal(normalizeFocus({ ...doc, pomodoros: { a: { phase: 'focus', completed: { '2026-11-06': -1 } } } }), null)
  assert.equal(normalizeFocus({ ...doc, pomodoros: { a: { phase: 'focus', completed: { bad: 1 } } } }), null)
})

test('apply never mutates the document it was given', () => {
  const started = apply(emptyFocus(), { op: 'timer.start', instanceId: 'timer-1' }).doc
  const frozen = JSON.parse(JSON.stringify(started))
  apply(started, { op: 'timer.pause', instanceId: 'timer-1' }, NOW + 1_000)
  apply(started, { op: 'pomodoro.start', instanceId: 'pomo-1' })
  apply(started, { op: 'focus.gc', instanceIds: [] })
  assert.deepEqual(started, frozen)
})

test('a timer target is a display-only setting stored in the same slot', () => {
  const started = apply(emptyFocus(), { op: 'timer.start', instanceId: 'timer-1' })
  const targeted = apply(started.doc, { op: 'timer.target', instanceId: 'timer-1', targetMs: 25 * 60_000 }, NOW + 60_000)
  assert.equal(targeted.changed, true)
  const timer = targeted.doc.timers['timer-1']
  assert.equal(timer.targetMs, 1_500_000)
  assert.equal(timer.startedAt, NOW, 'setting a target does not restart the timer')
  assert.equal(timer.running, true)
  assert.equal(timerElapsed(timer, NOW + 60_000), 60_000, 'elapsed time is untouched')
  const same = apply(targeted.doc, { op: 'timer.target', instanceId: 'timer-1', targetMs: 1_500_000 }, NOW + 90_000)
  assert.equal(same.changed, false, 'the same target is a no-op')
  const fresh = apply(emptyFocus(), { op: 'timer.target', instanceId: 'timer-9', targetMs: 5 * 60_000 }).doc.timers['timer-9']
  assert.deepEqual({ running: fresh.running, accumulatedMs: fresh.accumulatedMs, targetMs: fresh.targetMs },
    { running: false, accumulatedMs: 0, targetMs: 300_000 })
  for (const targetMs of [-1, 1.5, '300000', 13 * 3600_000, Number.NaN]) {
    assert.throws(() => apply(started.doc, { op: 'timer.target', instanceId: 'timer-1', targetMs }), /targetMs/u, String(targetMs))
  }
})

test('a stored timer without targetMs normalizes to zero', () => {
  const doc = emptyFocus()
  doc.timers['timer-1'] = { label: 'old', startedAt: null, accumulatedMs: 1000, running: false }
  const normalized = normalizeFocus({ ...doc, version: 1 })
  assert.equal(normalized.timers['timer-1'].targetMs, 0)
  assert.equal(normalizeFocus({ ...doc, version: 1, timers: { 'timer-1': { ...doc.timers['timer-1'], targetMs: -5 } } }), null, 'garbage target rejects the document')
})
