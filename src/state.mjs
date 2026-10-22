/**
 * 插件状态落盘：`$DSH_HOME/data/dsh-home/state.json`。
 *
 * 按 make-dsh-plugin 的 B 方案（每插件数据目录）：一份文档、几十到几百 KB、
 * 自己管版本。写盘走同目录 `.tmp` + `rename` 原子替换——写到一半崩溃不会留下
 * 半个 JSON。卸载不会自动删除（README「已知限制」写明清理方式）。
 *
 * @module @vlln/dsh-home/state
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

/** 状态文档版本：形状变了就 +1（旧文档按空状态读，不做迁移）。 */
export const STATE_VERSION = 1

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

/** 状态文件路径。 */
export function stateFile() {
  return path.join(stateDir(), 'state.json')
}

/** 空状态。 */
export function emptyState() {
  return { version: STATE_VERSION, layout: null, sessions: {}, scannedAt: null }
}

/**
 * 读状态；文件缺失/损坏/版本不符都退回空状态（不抛，首页永远能打开）。
 * @returns 状态文档
 */
export function loadState() {
  let raw
  try {
    raw = readFileSync(stateFile(), 'utf8')
  } catch {
    return emptyState()
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyState()
  }
  if (parsed?.version !== STATE_VERSION || typeof parsed.sessions !== 'object' || parsed.sessions === null) {
    return emptyState()
  }
  return {
    version: STATE_VERSION,
    layout: normalizeLayout(parsed.layout),
    sessions: parsed.sessions,
    scannedAt: typeof parsed.scannedAt === 'number' ? parsed.scannedAt : null,
  }
}

/**
 * 原子写状态。
 * @param state 状态文档
 */
export function saveState(state) {
  const dir = stateDir()
  mkdirSync(dir, { recursive: true })
  const target = stateFile()
  const temporary = `${target}.tmp`
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 })
  renameSync(temporary, target)
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
  /** @type {string[]} */
  const uniqueOrder = []
  for (const id of order) if (!uniqueOrder.includes(id)) uniqueOrder.push(id)
  return { order: uniqueOrder, size, hidden: [...new Set(hidden)] }
}
