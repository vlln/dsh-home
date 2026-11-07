import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPlannerOp, emptyPlanner, MARK_WINDOW_DAYS, MAX_DOC_BYTES, MAX_HABITS, MAX_ITEMS,
  normalizePlanner, plannerBytes, sortItems, validDay, validTime, dayKey, windowDayKey,
} from '../src/planner.mjs'

const NOW = new Date(2026, 10, 6, 9, 0, 0).getTime()
const idMaker = (() => { let n = 0; return () => `id${++n}` })()
const apply = (doc, op, options = {}) => applyPlannerOp(doc, op, { now: NOW, makeId: idMaker, ...options })

test('a minimal task gets the quiet defaults', () => {
  const { doc, changed } = apply(emptyPlanner(), { op: 'item.create', item: { title: '  写周报  ' } })
  assert.equal(changed, true)
  assert.equal(doc.revision, 1)
  assert.equal(doc.items.length, 1)
  const item = doc.items[0]
  assert.equal(item.title, '写周报', 'titles are trimmed')
  assert.equal(item.kind, 'task')
  assert.equal(item.day, null)
  assert.equal(item.start, null)
  assert.equal(item.end, null)
  assert.equal(item.done, false)
  assert.equal(item.doneAt, null)
  assert.equal(item.priority, 0)
  assert.equal(item.note, '')
  assert.equal(item.createdAt, NOW)
  assert.match(item.id, /^it_/u)
})

test('an event needs a day, and times stay inside one day', () => {
  const base = emptyPlanner()
  assert.throws(() => apply(base, { op: 'item.create', item: { title: '评审', kind: 'event' } }), /requires a day/u)
  assert.throws(() => apply(base, { op: 'item.create', item: { title: '评审', start: '09:00' } }), /start requires a day/u)
  assert.throws(() => apply(base, { op: 'item.create', item: { title: '评审', day: '2026-11-06', end: '10:00' } }), /end requires a start/u)
  assert.throws(() => apply(base, { op: 'item.create', item: { title: '评审', day: '2026-11-06', start: '10:00', end: '10:00' } }), /after start/u)
  assert.throws(() => apply(base, { op: 'item.create', item: { title: '评审', day: '2026-11-06', start: '11:00', end: '10:00' } }), /after start/u)
  const { doc } = apply(base, { op: 'item.create', item: { title: '评审', kind: 'event', day: '2026-11-06', start: '09:30', end: '10:30' } })
  assert.equal(doc.items[0].kind, 'event')
  assert.equal(doc.items[0].start, '09:30')
})

test('invalid text, days, times and unknown fields are rejected with a code', () => {
  const base = emptyPlanner()
  const codeOf = fn => { try { fn() } catch (error) { return error.code } return 'none' }
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: '   ' } })), 'bad-title')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x'.repeat(201) } })), 'bad-title')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', day: '2026-02-30' } })), 'bad-day')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', day: '2026-11-06', start: '24:00' } })), 'bad-time')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', kind: 'meeting' } })), 'bad-kind')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', colour: 'red' } })), 'bad-item')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', priority: 3 } })), 'bad-priority')
  assert.equal(codeOf(() => apply(base, { op: 'item.create', item: { title: 'x', note: 'n'.repeat(2001) } })), 'bad-note')
  assert.equal(codeOf(() => apply(base, { op: 'nope' })), 'unknown-op')
})

test('update only touches whitelisted fields and keeps identity', () => {
  const { doc } = apply(emptyPlanner(), { op: 'item.create', item: { title: '写周报' } })
  const id = doc.items[0].id
  const moved = apply(doc, { op: 'item.update', id, patch: { day: '2026-11-07', start: '14:00' } }).doc
  assert.deepEqual(moved.items[0], { ...doc.items[0], day: '2026-11-07', start: '14:00', updatedAt: NOW })
  assert.throws(() => apply(moved, { op: 'item.update', id, patch: { id: 'x' } }), /unknown item field/u)
  assert.throws(() => apply(moved, { op: 'item.update', id, patch: { done: true } }), /unknown item field/u)
  const noDay = apply(moved, { op: 'item.create', item: { title: '评审', kind: 'event', day: '2026-11-06' } }).doc
  const eventId = noDay.items[1].id
  assert.throws(() => apply(noDay, { op: 'item.update', id: eventId, patch: { day: null } }), /requires a day/u)
})

test('toggle flips completion and stamps doneAt both ways', () => {
  const { doc } = apply(emptyPlanner(), { op: 'item.create', item: { title: '写周报' } })
  const id = doc.items[0].id
  const done = apply(doc, { op: 'item.toggle', id }).doc
  assert.equal(done.items[0].done, true)
  assert.equal(done.items[0].doneAt, NOW)
  const undone = apply(done, { op: 'item.toggle', id }).doc
  assert.equal(undone.items[0].done, false)
  assert.equal(undone.items[0].doneAt, null)
  const explicit = apply(doc, { op: 'item.toggle', id, done: false }).doc
  assert.equal(explicit.items[0].done, false)
  assert.throws(() => apply(doc, { op: 'item.toggle', id: 'it_missing' }), /no such entry/u)
})

test('delete is idempotent: a missing id is not an error and does not bump revision', () => {
  const { doc } = apply(emptyPlanner(), { op: 'item.create', item: { title: '写周报' } })
  const same = apply(doc, { op: 'item.delete', id: 'it_nope' })
  assert.equal(same.changed, false)
  assert.equal(same.doc.revision, doc.revision)
  const removed = apply(doc, { op: 'item.delete', id: doc.items[0].id })
  assert.equal(removed.changed, true)
  assert.equal(removed.doc.items.length, 0)
  assert.equal(removed.doc.revision, doc.revision + 1)
})

test('habits keep sorted weekdays and prune marks outside the window', () => {
  const { doc } = apply(emptyPlanner(), { op: 'habit.create', habit: { title: '跑步', weekdays: [5, 1, 5] } })
  const habit = doc.habits[0]
  assert.deepEqual(habit.weekdays, [1, 5])
  assert.deepEqual(habit.marks, {})
  assert.match(habit.id, /^hb_/u)

  const today = dayKey(NOW)
  const old = windowDayKey(NOW, MARK_WINDOW_DAYS + 1)
  const marked = apply(doc, { op: 'habit.mark', id: habit.id, day: today }).doc
  assert.equal(marked.habits[0].marks[today], true, 'today can be marked')
  const later = apply(marked, { op: 'habit.mark', id: habit.id, day: dayKey(NOW + 3 * 86_400_000) }, { now: NOW + 3 * 86_400_000 }).doc
  assert.equal(later.habits[0].marks[today], true, 'a recent mark survives')
  const muchLater = apply(later, { op: 'habit.mark', id: habit.id, day: dayKey(NOW + (MARK_WINDOW_DAYS + 5) * 86_400_000) },
    { now: NOW + (MARK_WINDOW_DAYS + 5) * 86_400_000 }).doc
  assert.equal(muchLater.habits[0].marks[today], undefined, 'a write beyond the window prunes the old mark')
  assert.equal(muchLater.habits[0].marks[dayKey(NOW + (MARK_WINDOW_DAYS + 5) * 86_400_000)], true)
  assert.ok(old < today)

  const cleared = apply(marked, { op: 'habit.mark', id: habit.id, day: today, on: false }).doc
  assert.equal(cleared.habits[0].marks[today], undefined)
  assert.throws(() => apply(cleared, { op: 'habit.mark', id: habit.id, day: '2026-13-01' }), /day must be/u)
})

test('a daily habit is weekdays null', () => {
  const { doc } = apply(emptyPlanner(), { op: 'habit.create', habit: { title: '喝水' } })
  assert.equal(doc.habits[0].weekdays, null)
  assert.throws(() => apply(doc, { op: 'habit.create', habit: { title: 'x', weekdays: [] } }), /weekdays/u)
  assert.throws(() => apply(doc, { op: 'habit.create', habit: { title: 'x', weekdays: [8] } }), /weekdays/u)
})

test('the document enforces its item and habit ceilings', () => {
  let doc = emptyPlanner()
  for (let index = 0; index < MAX_ITEMS; index++) doc = apply(doc, { op: 'item.create', item: { title: `任务 ${index}` } }).doc
  assert.equal(doc.items.length, MAX_ITEMS)
  assert.throws(() => apply(doc, { op: 'item.create', item: { title: 'overflow' } }), /at most 500 items/u)

  let habits = emptyPlanner()
  for (let index = 0; index < MAX_HABITS; index++) habits = apply(habits, { op: 'habit.create', habit: { title: `习惯 ${index}` } }).doc
  assert.throws(() => apply(habits, { op: 'habit.create', habit: { title: 'overflow' } }), /at most 30 habits/u)
})

test('the document refuses to grow past 512 KiB', () => {
  let doc = emptyPlanner()
  let created = 0
  assert.throws(() => {
    for (let index = 0; index < MAX_ITEMS; index++) {
      doc = apply(doc, { op: 'item.create', item: { title: `任务 ${index}`, note: 'n'.repeat(2000) } }).doc
      created++
    }
  }, error => error.code === 'planner-too-large')
  assert.ok(created > 0 && created < MAX_ITEMS, `stopped at ${created} items`)
  assert.ok(plannerBytes(doc) <= MAX_DOC_BYTES)
})

test('stored documents round-trip and corrupt ones read as null', () => {
  const { doc } = apply(emptyPlanner(), { op: 'item.create', item: { title: '写周报', day: '2026-11-06', start: '09:00', end: '10:00' } })
  const withHabit = apply(doc, { op: 'habit.create', habit: { title: '跑步', weekdays: [2] } }).doc
  const roundTrip = normalizePlanner(JSON.parse(JSON.stringify(withHabit)))
  assert.deepEqual(roundTrip, withHabit)

  assert.equal(normalizePlanner(null), null)
  assert.equal(normalizePlanner({ ...withHabit, version: 99 }), null)
  assert.equal(normalizePlanner({ ...withHabit, items: 'nope' }), null)
  assert.equal(normalizePlanner({ ...withHabit, items: [...withHabit.items, { ...withHabit.items[0] }] }), null, 'duplicate ids are corrupt')
  assert.equal(normalizePlanner({ ...withHabit, habits: [{ ...withHabit.habits[0], marks: { '2026-11-06': false } }] }), null)
  assert.equal(normalizePlanner({ ...withHabit, habits: [{ ...withHabit.habits[0], weekdays: [0] }] }), null)
  assert.equal(normalizePlanner({ ...withHabit, items: [{ ...withHabit.items[0], kind: 'event', day: null }] }), null)
})

test('apply never mutates the document it was given', () => {
  const { doc } = apply(emptyPlanner(), { op: 'item.create', item: { title: '写周报' } })
  const frozen = JSON.parse(JSON.stringify(doc))
  apply(doc, { op: 'item.create', item: { title: '评审' } })
  apply(doc, { op: 'item.delete', id: doc.items[0].id })
  apply(doc, { op: 'item.toggle', id: doc.items[0].id })
  assert.deepEqual(doc, frozen)
})

test('day and time validators reject impossible values', () => {
  assert.equal(validDay('2026-11-06'), true)
  assert.equal(validDay('2028-02-29'), true, 'leap day')
  assert.equal(validDay('2026-02-29'), false)
  assert.equal(validDay('2026-13-01'), false)
  assert.equal(validDay('2026-1-1'), false)
  assert.equal(validTime('00:00'), true)
  assert.equal(validTime('23:59'), true)
  assert.equal(validTime('24:00'), false)
  assert.equal(validTime('9:00'), false)
})

test('sorting puts open work first, undated last, then by time', () => {
  const stamp = { done: false, doneAt: null, createdAt: 0, updatedAt: 0, kind: 'task', priority: 0, note: '' }
  const items = [
    { ...stamp, id: 'a', title: 'undated', day: null, start: null },
    { ...stamp, id: 'b', title: 'tomorrow', day: '2026-11-07', start: '09:00' },
    { ...stamp, id: 'c', title: 'today-late', day: '2026-11-06', start: '15:00' },
    { ...stamp, id: 'd', title: 'today-early', day: '2026-11-06', start: '09:00' },
    { ...stamp, id: 'e', title: 'done', day: '2026-11-06', start: '08:00', done: true, doneAt: 1 },
  ]
  assert.deepEqual(sortItems(items).map(item => item.id), ['d', 'c', 'b', 'a', 'e'])
})
