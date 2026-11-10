/**
 * 插件落盘：拆成两份文档，各写各的。
 *
 * - `state.json` —— 小、写得勤：布局覆盖、首页偏好（上次看到、dismissed 会话）。
 * - `ledger.json` —— 大、写得少：会话聚合（900+ 条会话时约几百 KB）。
 *
 * 拆开的原因：布局每次拖动/隐藏都写一次；把整份账本一起重写在旧磁盘上是纯浪费，
 * 也让"布局写一半崩了"有机会弄坏账本。两份都用同目录 `.tmp` + `rename` 原子替换。
 *
 * @module @vlln/dsh-home/state
 */

import { emptyPlanner, MAX_DOC_BYTES, normalizePlanner } from './planner.mjs'
import { emptyFocus, normalizeFocus } from './focus.mjs'
import { constants, copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { initialInstances, retireWidgetTypes, validBreakpoint, validateWorkbench, validateWorkbenchLayout, widgetStateError } from './widget-state.mjs'
import { homedir } from 'node:os'
import path from 'node:path'

/** v3 adds durable instances; v2 is migrated in memory until the next normal commit. */
export const STATE_VERSION = 3

/** Bounds for the one user-chosen board width; must match client canvas-width.ts.
 * 12 columns (1140px) .. 32 columns (3060px); a hand-edited file is clamped here. */
export const CANVAS_MIN_WIDTH = 1140
export const CANVAS_MAX_WIDTH = 3060

// Diagnostics are not document fields and cannot accidentally be persisted.
const storageMetadata = new WeakMap()
export function stateStorage(state) {
  return storageMetadata.get(state) ?? { writable: true, status: 'ready', error: null }
}
function withStorage(state, storage) {
  storageMetadata.set(state, storage)
  return state
}
export function readOnlyState(error) {
  return withStorage(emptyState(), { writable: false, status: 'read-only', error: {
    code: error?.code ?? 'state-read-error', message: error?.message ?? 'Cannot read saved workbench',
  } })
}

/** 账本文档版本。 */
export const LEDGER_VERSION = 1

/** 控件尺寸档（与前端 CSS 的 `data-size` 同源）。 */
export const WIDGET_SIZES = ['s', 'm', 'l']

/** 布局里允许的最大条目数（防脏数据把页面撑爆）。 */
const MAX_ENTRIES = 64

/** 单个 widget id 的长度上限。 */
const MAX_ID_LENGTH = 120

/** 宿主 home 目录：DSH_HOME 优先，缺省 `~/.dsh`。 */
export function dshHome() {
  const configured = process.env.DSH_HOME
  return configured === undefined || configured === '' ? path.join(homedir(), '.dsh') : configured
}

/** 本插件的数据目录。 */
export function stateDir() {
  return path.join(dshHome(), 'data', 'dsh-home')
}

/** 偏好/布局文档路径。 */
export function stateFile() {
  return path.join(stateDir(), 'state.json')
}

/** 账本文档路径。 */
export function ledgerFile() {
  return path.join(stateDir(), 'ledger.json')
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

function writeJson(file, value) {
  mkdirSync(stateDir(), { recursive: true })
  const temporary = `${file}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 })
  renameSync(temporary, file)
}

/** 首页标题的上限：它进的是 state.json，不是卡片配置。 */
export const BOARD_TITLE_MAX = 40

/** 空偏好。 */
export function emptyPrefs() {
  return { lastSeenAt: null, dismissed: {}, canvasWidth: null, libraryPosition: null, boardTitle: null }
}

/** 空状态文档。 */
export function emptyState() {
  return { version: STATE_VERSION, layout: null, instances: initialInstances(), prefs: emptyPrefs() }
}

/** Read failures become a visible read-only diagnostic, never a writable reset. */
export function loadState() {
  let text
  try {
    text = readFileSync(stateFile(), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return emptyState()
    return readOnlyState(widgetStateError('Cannot read saved workbench', 'state-read-error'))
  }
  try {
    if (Buffer.byteLength(text) > 512 * 1024) throw widgetStateError('Saved workbench exceeds document limit', 'state-corrupt')
    const parsed = JSON.parse(text)
    if (parsed?.version !== 2 && parsed?.version !== STATE_VERSION) {
      throw widgetStateError('Saved workbench version is unsupported; original file retained', 'state-version')
    }
    if (!parsed.prefs || typeof parsed.prefs !== 'object' || Array.isArray(parsed.prefs)) throw widgetStateError('Saved preferences are corrupt', 'state-corrupt')
    const normalizedPrefs = normalizePrefs(parsed.prefs)
    if (Object.hasOwn(parsed.prefs, 'lastSeenAt') && parsed.prefs.lastSeenAt !== normalizedPrefs.lastSeenAt) throw widgetStateError('Saved preferences are corrupt', 'state-corrupt')
    if (Object.hasOwn(parsed.prefs, 'dismissed') && JSON.stringify(parsed.prefs.dismissed) !== JSON.stringify(normalizedPrefs.dismissed)) throw widgetStateError('Saved preferences are corrupt', 'state-corrupt')
    const layout = validateWorkbenchLayout(parsed.layout, normalizeLayout)
    // Keep original layout and prefs JSON: migration is lossless, including optional fields.
    const workbench = parsed.version === 2
      ? { layout: parsed.layout, instances: initialInstances(layout) }
      : { layout: parsed.layout, instances: validateWorkbench({ layout, instances: parsed.instances }, normalizeLayout).instances }
    // Retired widget types leave the board on read (instances + every layout reference),
    // so an upgrade never leaves "unknown widget" cards behind.
    const retired = retireWidgetTypes(workbench)
    const state = { ...parsed, ...retired.workbench, version: STATE_VERSION }
    return withStorage(state, { writable: true, status: parsed.version === 2 || retired.changed ? 'migrated' : 'ready', error: null })
  } catch (error) {
    return readOnlyState(widgetStateError(error.code === 'state-version' ? error.message : 'Saved workbench is corrupt or cannot migrate safely; original file retained', error.code === 'state-version' ? 'state-version' : 'state-corrupt'))
  }
}

/** Atomic commit. Recheck disk to protect future/corrupt files introduced since load. */
export function saveState(state) {
  if (!stateStorage(state).writable) throw widgetStateError('Saved workbench is read-only', 'state-read-only')
  const current = loadState()
  if (!stateStorage(current).writable) throw widgetStateError('Saved workbench is read-only; original file retained', 'state-read-only')
  const validated = validateWorkbench(state, normalizeLayout)
  const next = { ...state, version: STATE_VERSION, instances: validated.instances }
  if (Buffer.byteLength(JSON.stringify(next)) + 1 > 512 * 1024) throw widgetStateError('Saved document exceeds 512 KiB', 'state-write-error')
  if (stateStorage(current).status === 'migrated') {
    try {
      copyFileSync(stateFile(), `${stateFile()}.v2.bak`, constants.COPYFILE_EXCL)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
  }
  writeJson(stateFile(), next)
}

/** 计划文档路径（待办 / 日程 / 习惯）。 */
export function plannerFile() {
  return path.join(stateDir(), 'planner.json')
}

/** 计时文档路径（计时器 / 番茄钟）。 */
export function focusFile() {
  return path.join(stateDir(), 'focus.json')
}

/**
 * 读计划文档。
 * @returns `{ doc, error }`；文件不存在时给空文档，损坏时 `doc` 为 null 且保留原文件
 */
export function loadPlanner() {
  let text
  try {
    text = readFileSync(plannerFile(), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return { doc: emptyPlanner(), error: null }
    return { doc: null, error: 'planner-unreadable' }
  }
  try {
    if (Buffer.byteLength(text) > MAX_DOC_BYTES) return { doc: null, error: 'planner-too-large' }
    const doc = normalizePlanner(JSON.parse(text))
    return doc === null ? { doc: null, error: 'planner-corrupt' } : { doc, error: null }
  } catch {
    return { doc: null, error: 'planner-corrupt' }
  }
}

/** 原子写计划文档。 */
export function savePlanner(doc) {
  writeJson(plannerFile(), doc)
}

/**
 * 读计时文档。
 * @returns `{ doc, error }`；文件不存在时给空文档，损坏时 `doc` 为 null 且保留原文件
 */
export function loadFocus() {
  let text
  try {
    text = readFileSync(focusFile(), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return { doc: emptyFocus(), error: null }
    return { doc: null, error: 'focus-unreadable' }
  }
  try {
    if (Buffer.byteLength(text) > 512 * 1024) return { doc: null, error: 'focus-too-large' }
    const doc = normalizeFocus(JSON.parse(text))
    return doc === null ? { doc: null, error: 'focus-corrupt' } : { doc, error: null }
  } catch {
    return { doc: null, error: 'focus-corrupt' }
  }
}

/** 原子写计时文档。 */
export function saveFocus(doc) {
  writeJson(focusFile(), doc)
}

/** 空账本。 */
export function emptyLedger() {
  return { version: LEDGER_VERSION, foldVersion: 0, scannedAt: null, sessions: {} }
}

/**
 * 读账本；损坏或版本不符按空账本处理（下次扫描会重建）。
 * @returns 账本文档
 */
export function loadLedger() {
  const parsed = readJson(ledgerFile())
  if (parsed?.version !== LEDGER_VERSION || typeof parsed.sessions !== 'object' || parsed.sessions === null) {
    return emptyLedger()
  }
  return {
    version: LEDGER_VERSION,
    foldVersion: typeof parsed.foldVersion === 'number' ? parsed.foldVersion : 0,
    scannedAt: typeof parsed.scannedAt === 'number' ? parsed.scannedAt : null,
    sessions: parsed.sessions,
  }
}

/**
 * 原子写账本（可能几百 KB；调用方负责节流）。
 * @param ledger 账本文档
 */
export function saveLedger(ledger) {
  writeJson(ledgerFile(), ledger)
}

function isWidgetId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH
}

/**
 * 校验并规整一份布局；不合法就返回 null（调用方退回默认布局）。
 * @param raw 前端提交的布局
 * @returns `{ order, size, hidden }` 或 null
 */
export function normalizeLayout(raw) {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) return null
  const order = Array.isArray(raw.order) ? raw.order.filter(isWidgetId).slice(0, MAX_ENTRIES) : []
  const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter(isWidgetId).slice(0, MAX_ENTRIES) : []
  const size = {}
  if (raw.size !== null && typeof raw.size === 'object' && !Array.isArray(raw.size)) {
    for (const [id, value] of Object.entries(raw.size)) {
      if (!isWidgetId(id) || !WIDGET_SIZES.includes(value)) continue
      Object.defineProperty(size, id, { value, enumerable: true, configurable: true, writable: true })
    }
  }
  const uniqueOrder = []
  for (const id of order) if (!uniqueOrder.includes(id)) uniqueOrder.push(id)
  const focusOrder = Array.isArray(raw.focusOrder) ? raw.focusOrder.filter(isWidgetId).slice(0, MAX_ENTRIES) : []
  const uniqueFocus = []
  for (const id of focusOrder) if (!uniqueFocus.includes(id)) uniqueFocus.push(id)
  const layout = { order: uniqueOrder, focusOrder: uniqueFocus, size, hidden: [...new Set(hidden)] }
  if (typeof raw.instanceLayout === 'boolean') layout.instanceLayout = raw.instanceLayout
  if (raw.positions !== null && typeof raw.positions === 'object' && !Array.isArray(raw.positions)) {
    const positions = {}
    // Fixed-stride canvases store one map per column count (12..32). Legacy 2/6/12
    // keys stay valid and are preserved byte-for-byte in meaning, never migrated.
    for (const [key, rows] of Object.entries(raw.positions)) {
      if (!validBreakpoint(key) || rows === null || typeof rows !== 'object' || Array.isArray(rows)) continue
      const columns = Number(key)
      const valid = {}
      for (const [id, rect] of Object.entries(rows).slice(0, MAX_ENTRIES)) {
        if (!isWidgetId(id) || rect === null || typeof rect !== 'object') continue
        const { x, y, w, h } = rect
        if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || y > 10000
          || w < 1 || w > columns || x + w > columns || h < 3 || h > 30) continue
        Object.defineProperty(valid, id, { value: { x, y, w, h }, enumerable: true, configurable: true, writable: true })
      }
      positions[key] = valid
    }
    layout.positions = positions
  }
  return layout
}

/**
 * 校验并规整首页偏好。
 * @param raw 前端提交的偏好
 * @returns `{ lastSeenAt, dismissed, canvasWidth, libraryPosition }`
 */
export function normalizePrefs(raw) {
  const prefs = emptyPrefs()
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) return prefs
  if (typeof raw.lastSeenAt === 'number' && Number.isFinite(raw.lastSeenAt)) prefs.lastSeenAt = raw.lastSeenAt
  // The board's name is the user's: a trimmed, bounded string, and empty means "use the
  // default label" rather than a blank heading.
  if (typeof raw.boardTitle === 'string') {
    const title = Array.from(raw.boardTitle).slice(0, BOARD_TITLE_MAX).join('').trim()
    prefs.boardTitle = title === '' ? null : title
  }
  // One whole-board width; bounded here so a hand-edited file cannot produce an unusable canvas.
  if (typeof raw.canvasWidth === 'number' && Number.isFinite(raw.canvasWidth)) {
    prefs.canvasWidth = Math.round(Math.min(CANVAS_MAX_WIDTH, Math.max(CANVAS_MIN_WIDTH, raw.canvasWidth)))
  }
  // Corner of the floating widget library; bounded so a hand-edited file cannot park
  // it off the reachable area. Missing or malformed means the default corner.
  if (raw.libraryPosition !== null && raw.libraryPosition !== undefined
    && typeof raw.libraryPosition === 'object' && !Array.isArray(raw.libraryPosition)) {
    const { x, y } = raw.libraryPosition
    if (Number.isFinite(x) && Number.isFinite(y)) {
      prefs.libraryPosition = {
        x: Math.round(Math.min(20000, Math.max(0, x))),
        y: Math.round(Math.min(20000, Math.max(0, y))),
      }
    }
  }
  if (raw.dismissed !== null && typeof raw.dismissed === 'object' && !Array.isArray(raw.dismissed)) {
    for (const [id, at] of Object.entries(raw.dismissed)) {
      if (!isWidgetId(id) || typeof at !== 'number' || !Number.isFinite(at)) continue
      Object.defineProperty(prefs.dismissed, id, { value: at, enumerable: true, configurable: true, writable: true })
    }
  }
  return prefs
}
