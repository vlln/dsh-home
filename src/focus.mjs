/**
 * 计时数据：计时器与番茄钟。
 *
 * 纯函数，无 I/O——单测直接喂操作（见 test/focus.test.mjs）。口径：
 * - 只存**时间戳**，不存「剩余毫秒」：`startedAt` + `accumulatedMs` 是唯一事实，
 *   刷新、关页面、重启宿主都按墙钟继续，前端不需要后台定时器。
 * - 番茄钟按**一轮一个阶段**结算：关着页面到点时，下次打开记这一轮完成并停在
 *   下一阶段的起点，不追补、不连跳（否则离开三小时会凭空多出好几轮）。
 * - 一切按 `instanceId` 分槽：同一类型可以有多张卡，各计各的。
 *
 * @module @vlln/dsh-home/focus
 */

/** 计时文档版本。 */
export const FOCUS_VERSION = 1

/** 最多保留多少个实例槽（防脏数据）。 */
export const MAX_SLOTS = 64

/** 计时器名称字数上限。 */
export const MAX_LABEL = 80

/** 番茄钟默认时长。 */
export const DEFAULT_FOCUS_MS = 25 * 60_000
export const DEFAULT_BREAK_MS = 5 * 60_000

/** 带错误码的计时错误。 */
export function focusError(message, code = 'bad-focus') {
  return Object.assign(new Error(message), { code })
}

/** 空文档。 */
export function emptyFocus() {
  return { version: FOCUS_VERSION, revision: 0, timers: {}, pomodoros: {} }
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** 本地日键；与 planner/ledger 同源。 */
export function dayKey(time) {
  const d = new Date(time)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function duration(value, fallback) {
  return Number.isFinite(value) && value > 0 && value <= 24 * 3600_000 ? value : fallback
}

function strictKeys(raw, keys) {
  for (const key of Object.keys(raw)) {
    if (!keys.includes(key)) throw focusError(`unknown field ${JSON.stringify(key)}`, 'bad-focus')
  }
}

function normalizeTimer(raw) {
  if (!isRecord(raw)) throw focusError('timer must be an object', 'bad-timer')
  strictKeys(raw, ['label', 'startedAt', 'accumulatedMs', 'running'])
  const label = raw.label === undefined ? '' : typeof raw.label === 'string' ? raw.label.slice(0, MAX_LABEL) : (() => {
    throw focusError('timer label must be a string', 'bad-timer')
  })()
  const startedAt = raw.startedAt === undefined || raw.startedAt === null
    ? null
    : typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt) && raw.startedAt >= 0
      ? raw.startedAt
      : (() => { throw focusError('timer startedAt must be a non-negative timestamp', 'bad-timer') })()
  const accumulatedMs = raw.accumulatedMs === undefined
    ? 0
    : typeof raw.accumulatedMs === 'number' && Number.isSafeInteger(raw.accumulatedMs) && raw.accumulatedMs >= 0
      ? raw.accumulatedMs
      : (() => { throw focusError('timer accumulatedMs must be a non-negative integer', 'bad-timer') })()
  if (raw.running !== undefined && typeof raw.running !== 'boolean') throw focusError('timer running must be a boolean', 'bad-timer')
  const running = startedAt !== null && raw.running !== false
  return { label, startedAt: running ? startedAt : null, accumulatedMs, running }
}

function normalizeCompleted(raw) {
  const completed = {}
  if (raw === undefined || raw === null) return completed
  if (!isRecord(raw)) throw focusError('completed must be an object', 'bad-pomodoro')
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(key) || !Number.isSafeInteger(value) || value < 0) {
      throw focusError('completed must map day keys to counts', 'bad-pomodoro')
    }
    completed[key] = value
  }
  return completed
}

function normalizePomodoro(raw) {
  if (!isRecord(raw)) throw focusError('pomodoro must be an object', 'bad-pomodoro')
  strictKeys(raw, ['phase', 'startedAt', 'elapsedMs', 'focusMs', 'breakMs', 'completed'])
  if (raw.phase !== undefined && raw.phase !== 'focus' && raw.phase !== 'break') throw focusError('pomodoro phase is invalid', 'bad-pomodoro')
  const phase = raw.phase === 'break' ? 'break' : 'focus'
  const startedAt = raw.startedAt === undefined || raw.startedAt === null
    ? null
    : typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt) && raw.startedAt >= 0
      ? raw.startedAt
      : (() => { throw focusError('pomodoro startedAt must be a non-negative timestamp', 'bad-pomodoro') })()
  const elapsedMs = raw.elapsedMs === undefined
    ? 0
    : typeof raw.elapsedMs === 'number' && Number.isSafeInteger(raw.elapsedMs) && raw.elapsedMs >= 0
      ? raw.elapsedMs
      : (() => { throw focusError('pomodoro elapsedMs must be a non-negative integer', 'bad-pomodoro') })()
  return {
    phase,
    startedAt,
    elapsedMs,
    focusMs: duration(raw.focusMs, DEFAULT_FOCUS_MS),
    breakMs: duration(raw.breakMs, DEFAULT_BREAK_MS),
    completed: normalizeCompleted(raw.completed),
  }
}

/**
 * 校验并规整一份存档。
 * @param raw 磁盘上的文档
 * @returns 规整后的文档；结构不可信时返回 `null`
 */
export function normalizeFocus(raw) {
  try {
    if (!isRecord(raw) || raw.version !== FOCUS_VERSION) return null
    if (!isRecord(raw.timers) || !isRecord(raw.pomodoros)) return null
    const timers = {}
    const pomodoros = {}
    if (Object.keys(raw.timers).length > MAX_SLOTS || Object.keys(raw.pomodoros).length > MAX_SLOTS) return null
    for (const [key, value] of Object.entries(raw.timers)) {
      if (key === '' || key.length > 120) return null
      timers[key] = normalizeTimer(value)
    }
    for (const [key, value] of Object.entries(raw.pomodoros)) {
      if (key === '' || key.length > 120) return null
      pomodoros[key] = normalizePomodoro(value)
    }
    return {
      version: FOCUS_VERSION,
      revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
      timers,
      pomodoros,
    }
  } catch {
    return null
  }
}

/** 计时器已经走了多久（毫秒）。 */
export function timerElapsed(timer, now = Date.now()) {
  const base = timer.accumulatedMs + (timer.running && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0)
  return Math.max(0, base)
}

/** 番茄钟当前阶段的快照：还剩多久、到点没有。 */
export function pomodoroSnapshot(pomodoro, now = Date.now()) {
  const durationMs = pomodoro.phase === 'break' ? pomodoro.breakMs : pomodoro.focusMs
  const elapsed = pomodoro.elapsedMs + (pomodoro.startedAt !== null ? Math.max(0, now - pomodoro.startedAt) : 0)
  const remainingMs = Math.max(0, durationMs - elapsed)
  return { phase: pomodoro.phase, durationMs, elapsedMs: Math.min(durationMs, elapsed), remainingMs, due: elapsed >= durationMs }
}

/** 今日完成轮数。 */
export function completedToday(pomodoro, now = Date.now()) {
  return pomodoro.completed[dayKey(now)] ?? 0
}

/**
 * 到点结算：只结算一轮，然后停在下一阶段起点（`startedAt = null`）。
 * @param pomodoro 当前状态
 * @param now 结算时刻
 * @returns `{ pomodoro, settled }`，未到点原样返回
 */
export function settlePomodoro(pomodoro, now = Date.now()) {
  const snapshot = pomodoroSnapshot(pomodoro, now)
  if (!snapshot.due) return { pomodoro, settled: false }
  const completed = { ...pomodoro.completed }
  if (pomodoro.phase === 'focus') completed[dayKey(now)] = (completed[dayKey(now)] ?? 0) + 1
  return {
    pomodoro: {
      ...pomodoro,
      phase: pomodoro.phase === 'focus' ? 'break' : 'focus',
      elapsedMs: 0,
      startedAt: null,
      completed,
    },
    settled: true,
  }
}

/** 一次操作的结果：文档 + 是否真的改了。 */
function result(doc, changed) {
  return { doc: changed ? { ...doc, revision: doc.revision + 1 } : doc, changed }
}

function slotId(value) {
  if (typeof value !== 'string' || value === '' || value.length > 120) throw focusError('instanceId is required', 'bad-slot')
  return value
}

function needTimer(doc, id) {
  const timer = doc.timers[id]
  if (timer === undefined) throw focusError('no such timer', 'missing-timer')
  return timer
}

function needPomodoro(doc, id) {
  const pomodoro = doc.pomodoros[id]
  if (pomodoro === undefined) throw focusError('no such pomodoro', 'missing-pomodoro')
  return pomodoro
}

/**
 * 在文档上应用一条操作。
 * @param doc 当前文档（不会被修改）
 * @param op `{ op, instanceId, ... }`
 * @param options `{ now }`，便于测试注入
 * @returns `{ doc, changed }`
 */
export function applyFocusOp(doc, op, { now = Date.now() } = {}) {
  if (!isRecord(op) || typeof op.op !== 'string') throw focusError('op must be an object with an op name', 'bad-op')
  const timers = { ...doc.timers }
  const pomodoros = { ...doc.pomodoros }
  const base = { ...doc, timers, pomodoros }

  switch (op.op) {
    case 'timer.start': {
      const id = slotId(op.instanceId)
      const current = timers[id]
      if (Object.keys(timers).length >= MAX_SLOTS && current === undefined) throw focusError(`at most ${MAX_SLOTS} timers`, 'too-many-slots')
      if (current !== undefined && current.running) return result(base, false)
      const slot = current ?? { label: '', startedAt: null, accumulatedMs: 0, running: false }
      timers[id] = { ...slot, startedAt: now, running: true }
      return result(base, true)
    }
    case 'timer.pause': {
      const id = slotId(op.instanceId)
      const current = needTimer(base, id)
      if (!current.running) return result(base, false)
      timers[id] = { ...current, accumulatedMs: timerElapsed(current, now), startedAt: null, running: false }
      return result(base, true)
    }
    case 'timer.reset': {
      const id = slotId(op.instanceId)
      const current = timers[id]
      if (current === undefined) return result(base, false)
      timers[id] = { ...current, accumulatedMs: 0, startedAt: null, running: false }
      return result(base, true)
    }
    case 'timer.rename': {
      const id = slotId(op.instanceId)
      const label = typeof op.label === 'string' ? op.label.trim().slice(0, MAX_LABEL) : ''
      const current = timers[id] ?? { label: '', startedAt: null, accumulatedMs: 0, running: false }
      timers[id] = { ...current, label }
      return result(base, true)
    }
    case 'timer.clear': {
      const id = slotId(op.instanceId)
      if (timers[id] === undefined) return result(base, false)
      delete timers[id]
      return result(base, true)
    }
    case 'pomodoro.start': {
      const id = slotId(op.instanceId)
      const current = pomodoros[id] ?? { phase: 'focus', startedAt: null, elapsedMs: 0, focusMs: DEFAULT_FOCUS_MS, breakMs: DEFAULT_BREAK_MS, completed: {} }
      if (Object.keys(pomodoros).length >= MAX_SLOTS && pomodoros[id] === undefined) throw focusError(`at most ${MAX_SLOTS} pomodoros`, 'too-many-slots')
      const settled = settlePomodoro(current, now)
      if (settled.settled) {
        pomodoros[id] = settled.pomodoro
        return result({ ...base, pomodoros }, true)
      }
      if (current.startedAt !== null) return result(base, false)
      pomodoros[id] = { ...current, startedAt: now }
      return result(base, true)
    }
    case 'pomodoro.pause': {
      const id = slotId(op.instanceId)
      const current = needPomodoro(base, id)
      if (current.startedAt === null) return result(base, false)
      const settled = settlePomodoro(current, now)
      if (settled.settled) {
        pomodoros[id] = settled.pomodoro
        return result(base, true)
      }
      const snapshot = pomodoroSnapshot(current, now)
      pomodoros[id] = { ...current, elapsedMs: snapshot.elapsedMs, startedAt: null }
      return result(base, true)
    }
    case 'pomodoro.settle': {
      const id = slotId(op.instanceId)
      const current = needPomodoro(base, id)
      const settled = settlePomodoro(current, now)
      if (!settled.settled) return result(base, false)
      pomodoros[id] = settled.pomodoro
      return result(base, true)
    }
    case 'pomodoro.skip': {
      const id = slotId(op.instanceId)
      const current = needPomodoro(base, id)
      const settled = settlePomodoro(current, now)
      const next = settled.settled
        ? settled.pomodoro
        : { ...current, phase: current.phase === 'focus' ? 'break' : 'focus', elapsedMs: 0, startedAt: null }
      pomodoros[id] = next
      return result(base, true)
    }
    case 'pomodoro.reset': {
      const id = slotId(op.instanceId)
      const current = pomodoros[id]
      if (current === undefined) return result(base, false)
      pomodoros[id] = { ...current, phase: 'focus', elapsedMs: 0, startedAt: null }
      return result(base, true)
    }
    case 'pomodoro.clear': {
      const id = slotId(op.instanceId)
      if (pomodoros[id] === undefined) return result(base, false)
      delete pomodoros[id]
      return result(base, true)
    }
    case 'focus.gc': {
      if (!Array.isArray(op.instanceIds)) throw focusError('instanceIds must be an array', 'bad-gc')
      const live = new Set(op.instanceIds.filter(id => typeof id === 'string'))
      let changed = false
      for (const id of Object.keys(timers)) {
        if (!live.has(id)) {
          delete timers[id]
          changed = true
        }
      }
      for (const id of Object.keys(pomodoros)) {
        if (!live.has(id)) {
          delete pomodoros[id]
          changed = true
        }
      }
      return result(base, changed)
    }
    default:
      throw focusError(`unknown focus op ${JSON.stringify(op.op)}`, 'unknown-op')
  }
}
