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

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

/** 状态文档版本：形状变了就 +1（旧文档按空状态读，不做迁移）。 */
export const STATE_VERSION = 2

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

/** 空偏好。 */
export function emptyPrefs() {
  return { lastSeenAt: null, dismissed: {} }
}

/** 空状态文档。 */
export function emptyState() {
  return { version: STATE_VERSION, layout: null, prefs: emptyPrefs() }
}

/**
 * 读状态；文件缺失/损坏/版本不符都退回空状态（不抛，首页永远能打开）。
 * @returns 状态文档
 */
export function loadState() {
  const parsed = readJson(stateFile())
  if (parsed?.version !== STATE_VERSION) return emptyState()
  return {
    version: STATE_VERSION,
    layout: normalizeLayout(parsed.layout),
    prefs: normalizePrefs(parsed.prefs),
  }
}

/**
 * 原子写状态（只有布局与偏好，几十字节到几 KB）。
 * @param state 状态文档
 */
export function saveState(state) {
  writeJson(stateFile(), state)
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
      size[id] = value
    }
  }
  const uniqueOrder = []
  for (const id of order) if (!uniqueOrder.includes(id)) uniqueOrder.push(id)
  return { order: uniqueOrder, size, hidden: [...new Set(hidden)] }
}

/**
 * 校验并规整首页偏好。
 * @param raw 前端提交的偏好
 * @returns `{ lastSeenAt, dismissed }`
 */
export function normalizePrefs(raw) {
  const prefs = emptyPrefs()
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) return prefs
  if (typeof raw.lastSeenAt === 'number' && Number.isFinite(raw.lastSeenAt)) prefs.lastSeenAt = raw.lastSeenAt
  if (raw.dismissed !== null && typeof raw.dismissed === 'object' && !Array.isArray(raw.dismissed)) {
    for (const [id, at] of Object.entries(raw.dismissed)) {
      if (!isWidgetId(id) || typeof at !== 'number' || !Number.isFinite(at)) continue
      prefs.dismissed[id] = at
    }
  }
  return prefs
}
