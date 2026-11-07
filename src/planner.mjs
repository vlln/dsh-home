/**
 * 计划数据：待办 / 日程 / 习惯，一份文档、多个视图共用。
 *
 * 纯函数，无 I/O——单测直接喂操作（见 test/planner.test.mjs）。口径：
 * - `item` 是「一条要做的事」：`kind: 'task'` 可以没有日期，`kind: 'event'` 必须有日期。
 * - 有 `start` 才有时间块；`end` 必须晚于 `start`，不跨天（跨天请建两条）。
 * - `habit` 是「每天/每周几要做的事」；打点按本地日键存在 `marks`，只保留最近 400 天。
 * - 写入是 **op 式** 的：客户端发操作，宿主在现有文档上应用，因此两个窗口不会互相盖。
 * - `revision` 每次实际变更 +1，客户端据此判断是否需要重新取整份文档。
 *
 * @module @vlln/dsh-home/planner
 */

/** 计划文档版本。 */
export const PLANNER_VERSION = 1

/** 条目上限（含 task 与 event）。 */
export const MAX_ITEMS = 500

/** 习惯上限。 */
export const MAX_HABITS = 30

/** 单条标题字数上限。 */
export const MAX_TITLE = 200

/** 单条备注字数上限。 */
export const MAX_NOTE = 2000

/** 每个习惯保留的打点天数。 */
export const MARK_WINDOW_DAYS = 400

/** 整份文档的字节上限（与前端预算一致）。 */
export const MAX_DOC_BYTES = 512 * 1024

/** 条目类别。 */
export const ITEM_KINDS = Object.freeze(['task', 'event'])

/** 带错误码的计划数据错误。 */
export function plannerError(message, code = 'bad-planner') {
  return Object.assign(new Error(message), { code })
}

/** 空文档。 */
export function emptyPlanner() {
  return { version: PLANNER_VERSION, revision: 0, items: [], habits: [] }
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** 本地日键 `YYYY-MM-DD`（与账本同源：按宿主本机时区）。 */
export function dayKey(time) {
  const d = new Date(time)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** 合法日键：格式对且是日历上真实存在的一天。 */
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const at = new Date(year, month - 1, day)
  return at.getFullYear() === year && at.getMonth() === month - 1 && at.getDate() === day
}

/** 合法时刻 `HH:mm`（24 小时制，不含秒）。 */
export function validTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value)
}

/** 从 now 往回推 `days` 天的日键，用于打点窗口裁剪。 */
export function windowDayKey(now, days = MARK_WINDOW_DAYS) {
  const at = new Date(now)
  at.setDate(at.getDate() - days)
  return dayKey(at.getTime())
}

function titleOf(value) {
  if (typeof value !== 'string') throw plannerError('title must be a string', 'bad-title')
  const text = value.trim()
  if (text === '') throw plannerError('title cannot be empty', 'bad-title')
  if (text.length > MAX_TITLE) throw plannerError(`title exceeds ${MAX_TITLE} characters`, 'bad-title')
  return text
}

function noteOf(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw plannerError('note must be a string', 'bad-note')
  if (value.length > MAX_NOTE) throw plannerError(`note exceeds ${MAX_NOTE} characters`, 'bad-note')
  return value
}

function priorityOf(value) {
  if (value === undefined || value === null) return 0
  if (value !== 0 && value !== 1 && value !== 2) throw plannerError('priority must be 0, 1 or 2', 'bad-priority')
  return value
}

function dayOf(value) {
  if (value === undefined || value === null) return null
  if (!validDay(value)) throw plannerError('day must be YYYY-MM-DD', 'bad-day')
  return value
}

function timeOf(value, field) {
  if (value === undefined || value === null) return null
  if (!validTime(value)) throw plannerError(`${field} must be HH:mm`, 'bad-time')
  return value
}

/** 条目字段集合：这是 update 的白名单，也是序列化的唯一来源。 */
export const ITEM_FIELDS = Object.freeze(['kind', 'title', 'day', 'start', 'end', 'priority', 'note'])

/**
 * 规范化一条条目（不含 id 与时间戳）。
 * @param raw 客户端提交的条目
 * @returns 规整后的条目字段
 */
export function normalizeItemFields(raw) {
  if (!isRecord(raw)) throw plannerError('item must be an object', 'bad-item')
  for (const key of Object.keys(raw)) {
    if (!ITEM_FIELDS.includes(key)) throw plannerError(`unknown item field ${JSON.stringify(key)}`, 'bad-item')
  }
  const kind = raw.kind ?? 'task'
  if (!ITEM_KINDS.includes(kind)) throw plannerError('kind must be task or event', 'bad-kind')
  const title = titleOf(raw.title)
  const day = dayOf(raw.day)
  const start = timeOf(raw.start, 'start')
  const end = timeOf(raw.end, 'end')
  const priority = priorityOf(raw.priority)
  const note = noteOf(raw.note)
  if (start !== null && day === null) throw plannerError('start requires a day', 'bad-time')
  if (end !== null && start === null) throw plannerError('end requires a start', 'bad-time')
  if (start !== null && end !== null && end <= start) throw plannerError('end must be after start', 'bad-time')
  if (kind === 'event' && day === null) throw plannerError('an event requires a day', 'bad-day')
  return { kind, title, day, start, end, priority, note }
}

/** 规范化一条习惯（不含 id 与时间戳）。 */
export function normalizeHabitFields(raw) {
  if (!isRecord(raw)) throw plannerError('habit must be an object', 'bad-habit')
  for (const key of Object.keys(raw)) {
    if (key !== 'title' && key !== 'weekdays') throw plannerError(`unknown habit field ${JSON.stringify(key)}`, 'bad-habit')
  }
  const title = titleOf(raw.title)
  const weekdays = normalizeWeekdays(raw.weekdays)
  return { title, weekdays }
}

/** 周几：null（每天）或 1..7 的升序去重数组。 */
export function normalizeWeekdays(value) {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value) || value.length === 0 || value.length > 7) throw plannerError('weekdays must list 1..7', 'bad-weekdays')
  const unique = [...new Set(value)]
  for (const day of unique) {
    if (!Number.isInteger(day) || day < 1 || day > 7) throw plannerError('weekdays must list 1..7', 'bad-weekdays')
  }
  return unique.sort((left, right) => left - right)
}

/** 打点表：键是日键，值恒为 true；非布尔值视为损坏。 */
function normalizeMarks(raw) {
  const marks = {}
  if (raw === undefined || raw === null) return marks
  if (!isRecord(raw)) throw plannerError('marks must be an object', 'bad-marks')
  for (const [key, value] of Object.entries(raw)) {
    if (!validDay(key) || value !== true) throw plannerError('marks must map day keys to true', 'bad-marks')
    marks[key] = true
  }
  return marks
}

function normalizeStoredItem(raw) {
  if (!isRecord(raw)) throw plannerError('stored item must be an object', 'bad-item')
  const fields = normalizeItemFields({
    kind: raw.kind,
    title: raw.title,
    day: raw.day,
    start: raw.start,
    end: raw.end,
    priority: raw.priority,
    note: raw.note,
  })
  if (typeof raw.id !== 'string' || raw.id === '') throw plannerError('item id is missing', 'bad-item')
  const done = raw.done === true
  return {
    id: raw.id,
    ...fields,
    done,
    doneAt: done && typeof raw.doneAt === 'number' ? raw.doneAt : null,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  }
}

function normalizeStoredHabit(raw) {
  if (!isRecord(raw)) throw plannerError('stored habit must be an object', 'bad-habit')
  const fields = normalizeHabitFields({ title: raw.title, weekdays: raw.weekdays })
  if (typeof raw.id !== 'string' || raw.id === '') throw plannerError('habit id is missing', 'bad-habit')
  return {
    id: raw.id,
    ...fields,
    marks: normalizeMarks(raw.marks),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
  }
}

/**
 * 校验并规整一份存档。
 * @param raw 磁盘上的文档
 * @returns 规整后的文档；结构不可信时返回 `null`（调用方保留原文件并显示错误）
 */
export function normalizePlanner(raw) {
  try {
    if (!isRecord(raw) || raw.version !== PLANNER_VERSION) return null
    if (!Array.isArray(raw.items) || !Array.isArray(raw.habits)) return null
    if (raw.items.length > MAX_ITEMS || raw.habits.length > MAX_HABITS) return null
    const items = raw.items.map(normalizeStoredItem)
    const habits = raw.habits.map(normalizeStoredHabit)
    const ids = new Set()
    for (const entry of [...items, ...habits]) {
      if (ids.has(entry.id)) return null
      ids.add(entry.id)
    }
    return {
      version: PLANNER_VERSION,
      revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
      items,
      habits,
    }
  } catch {
    return null
  }
}

/** 文档字节数（与落盘一致，含换行）。 */
export function plannerBytes(doc) {
  return Buffer.byteLength(JSON.stringify(doc)) + 1
}

function assertCapacity(doc) {
  if (plannerBytes(doc) > MAX_DOC_BYTES) throw plannerError('planner document exceeds 512 KiB', 'planner-too-large')
}

function newId(prefix, makeId) {
  return `${prefix}_${makeId()}`
}

/** 默认 id 生成器：调用方（宿主）可以替换，测试里用确定序列。 */
export function defaultIdMaker() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function findIndex(list, id, code) {
  const index = list.findIndex(entry => entry.id === id)
  if (index < 0) throw plannerError(`no such entry ${JSON.stringify(id)}`, code)
  return index
}

function pruneMarks(habit, now) {
  const floor = windowDayKey(now)
  let changed = false
  for (const key of Object.keys(habit.marks)) {
    if (key < floor) {
      delete habit.marks[key]
      changed = true
    }
  }
  return changed
}

/** 一次操作的结果：文档 + 是否真的改了。 */
function result(doc, changed) {
  return { doc: changed ? { ...doc, revision: doc.revision + 1 } : doc, changed }
}

/**
 * 在文档上应用一条操作。
 * @param doc 当前文档（不会被修改）
 * @param op `{ op, ... }`，见 README 的「计划数据」一节
 * @param options `{ now, makeId }`，便于测试注入
 * @returns `{ doc, changed }`；非法操作抛带 code 的错误
 */
export function applyPlannerOp(doc, op, { now = Date.now(), makeId = defaultIdMaker } = {}) {
  if (!isRecord(op) || typeof op.op !== 'string') throw plannerError('op must be an object with an op name', 'bad-op')
  const items = doc.items.map(item => ({ ...item }))
  const habits = doc.habits.map(habit => ({ ...habit, marks: { ...habit.marks } }))
  const base = { ...doc, items, habits }

  switch (op.op) {
    case 'item.create': {
      if (items.length >= MAX_ITEMS) throw plannerError(`at most ${MAX_ITEMS} items`, 'too-many-items')
      const fields = normalizeItemFields(op.item ?? {})
      const item = {
        id: newId('it', makeId),
        ...fields,
        done: false,
        doneAt: null,
        createdAt: now,
        updatedAt: now,
      }
      if (items.some(entry => entry.id === item.id)) throw plannerError('generated item id collides', 'bad-id')
      items.push(item)
      const next = { ...base, items }
      assertCapacity(next)
      return result(next, true)
    }
    case 'item.update': {
      const index = findIndex(items, op.id, 'missing-item')
      const current = items[index]
      if (!isRecord(op.patch)) throw plannerError('patch must be an object', 'bad-item')
      for (const key of Object.keys(op.patch)) {
        if (!ITEM_FIELDS.includes(key)) throw plannerError(`unknown item field ${JSON.stringify(key)}`, 'bad-item')
      }
      const merged = { ...current, ...op.patch }
      const fields = normalizeItemFields({
        kind: merged.kind,
        title: merged.title,
        day: merged.day,
        start: merged.start,
        end: merged.end,
        priority: merged.priority,
        note: merged.note,
      })
      items[index] = { ...current, ...fields, updatedAt: now }
      const next = { ...base, items }
      assertCapacity(next)
      return result(next, true)
    }
    case 'item.delete': {
      const index = items.findIndex(entry => entry.id === op.id)
      if (index < 0) return result(base, false)
      items.splice(index, 1)
      return result(base, true)
    }
    case 'item.toggle': {
      const index = findIndex(items, op.id, 'missing-item')
      const current = items[index]
      const done = typeof op.done === 'boolean' ? op.done : current.done !== true
      items[index] = { ...current, done, doneAt: done ? now : null, updatedAt: now }
      return result(base, true)
    }
    case 'habit.create': {
      if (habits.length >= MAX_HABITS) throw plannerError(`at most ${MAX_HABITS} habits`, 'too-many-habits')
      const fields = normalizeHabitFields(op.habit ?? {})
      const habit = { id: newId('hb', makeId), ...fields, marks: {}, createdAt: now }
      if (habits.some(entry => entry.id === habit.id)) throw plannerError('generated habit id collides', 'bad-id')
      habits.push(habit)
      const next = { ...base, habits }
      assertCapacity(next)
      return result(next, true)
    }
    case 'habit.update': {
      const index = findIndex(habits, op.id, 'missing-habit')
      const current = habits[index]
      if (!isRecord(op.patch)) throw plannerError('patch must be an object', 'bad-habit')
      for (const key of Object.keys(op.patch)) {
        if (key !== 'title' && key !== 'weekdays') throw plannerError(`unknown habit field ${JSON.stringify(key)}`, 'bad-habit')
      }
      const fields = normalizeHabitFields({ title: op.patch.title ?? current.title, weekdays: op.patch.weekdays ?? current.weekdays })
      habits[index] = { ...current, ...fields }
      return result(base, true)
    }
    case 'habit.delete': {
      const index = habits.findIndex(entry => entry.id === op.id)
      if (index < 0) return result(base, false)
      habits.splice(index, 1)
      return result(base, true)
    }
    case 'habit.mark': {
      const index = findIndex(habits, op.id, 'missing-habit')
      const habit = habits[index]
      if (!validDay(op.day)) throw plannerError('day must be YYYY-MM-DD', 'bad-day')
      const on = op.on !== false
      if (on) habit.marks[op.day] = true
      else delete habit.marks[op.day]
      pruneMarks(habit, now)
      const next = { ...base, habits }
      assertCapacity(next)
      return result(next, true)
    }
    default:
      throw plannerError(`unknown planner op ${JSON.stringify(op.op)}`, 'unknown-op')
  }
}

/**
 * 排序：未完成在前；有日期的按日期升序，无日期垫底；同一天按时间升序，无时间垫底；再按创建时间。
 * @param items 条目列表
 * @returns 排好序的新数组
 */
export function sortItems(items) {
  return [...items].sort((left, right) => {
    if (left.done !== right.done) return left.done ? 1 : -1
    const leftDay = left.day ?? '9999-12-31'
    const rightDay = right.day ?? '9999-12-31'
    if (leftDay !== rightDay) return leftDay < rightDay ? -1 : 1
    const leftStart = left.start ?? '99:99'
    const rightStart = right.start ?? '99:99'
    if (leftStart !== rightStart) return leftStart < rightStart ? -1 : 1
    return left.createdAt - right.createdAt
  })
}
