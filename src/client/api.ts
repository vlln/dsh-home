/**
 * 首页与宿主之间的那条路由（`POST /plugins/dsh-home/api`）。
 * 信封：`{ ok: true, value }` / `{ ok: false, error: { code, message } }`。
 *
 * @module @vlln/dsh-home/client/api
 */

/** 与 src/index.mjs 的 API_PATH 同源。 */
export const API_PATH = '/plugins/dsh-home/api'

/** 卡片尺寸档。 */
export type WidgetSize = 's' | 'm' | 'l'

/** A widget's durable grid coordinates within one viewport breakpoint. */
export interface GridRect { x: number; y: number; w: number; h: number }

/** 用户布局（只存覆盖，默认值在页面侧合并）。 */
export interface Layout {
  order: string[]
  /** Instance layouts use generic ordering; absent means legacy split-order migration. */
  instanceLayout?: boolean
  /** 「三件事」的纵向顺序（卡片 id：resume / queue / today）。 */
  focusOrder: string[]
  size: Record<string, WidgetSize>
  hidden: string[]
  /** Column-count keyed spatial layouts; absent means migrate legacy order/size. */
  positions?: Record<string, Record<string, GridRect>>
}

export interface StorageStatus {
  writable: boolean
  status: 'ready' | 'migrated' | 'read-only' | 'write-error'
  error: null | { code: string; message: string }
}
export interface WorkbenchDocument {
  layout: Layout | null
  instances: import('./widget-contract.ts').WidgetInstance[]
  storage: StorageStatus
}
export function fetchWorkbench(): Promise<WorkbenchDocument> {
  return post<WorkbenchDocument>('workbench.get')
}
export function saveWorkbench(layout: Layout, instances: import('./widget-contract.ts').WidgetInstance[]): Promise<WorkbenchDocument> {
  return post<WorkbenchDocument>('workbench.set', { layout, instances })
}

/** 一天的天桶（宿主本机时区）。 */
export interface DayBucket {
  key: string
  activeMs: number
  runMs: number
  turns: number
  sessions: number
}

/** 账本里的单会话摘要。 */
export interface LedgerSession {
  id: string
  cwd?: string
  createdAt: number
  parentSessionId?: string
  origin?: string
  firstAt?: number
  lastAt: number
  turns: number
  runMs: number
  activeMs: number
  todayMs: number
  todayTurns: number
  clusters: [number, number][]
  /** 最后一条人类输入的原文（截断），用于「回到现场」。 */
  lastUserText?: string
}

/** 一次快照。 */
export interface LedgerSnapshot {
  generatedAt: number
  scannedAt: number | null
  scanning: boolean
  /** 历史整理进度（done/total）；首屏可以据此说"还在整理"。 */
  progress: { done: number; total: number }
  sessionCount: number
  days: DayBucket[]
  today: Omit<DayBucket, 'key'>
  week: { activeMs: number; runMs: number; turns: number; sessions: number }
  sessions: LedgerSession[]
}

interface Envelope<T> {
  ok: boolean
  value?: T
  error?: { code: string; message: string }
  storage?: StorageStatus
}

/** Keep server diagnostics on failed writes (especially a newly read-only document). */
export class HomeApiError extends Error {
  readonly code: string
  readonly storage?: StorageStatus
  constructor(message: string, code: string, storage?: StorageStatus) {
    super(message)
    this.name = 'HomeApiError'
    this.code = code
    this.storage = storage
  }
}
function storageStatus(value: unknown): StorageStatus | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const item = value as StorageStatus
  if (typeof item.writable !== 'boolean' || !['ready', 'migrated', 'read-only', 'write-error'].includes(item.status)) return undefined
  if (item.error !== null && (item.error === undefined || typeof item.error.code !== 'string' || typeof item.error.message !== 'string')) return undefined
  return { writable: item.writable, status: item.status, error: item.error === null ? null : { ...item.error } }
}

/** 发一条 op；失败抛带 code 的 Error。 */
export async function post<T>(op: string, extra: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    body: JSON.stringify({ op, ...extra }),
  })
  let envelope: Envelope<T>
  try {
    envelope = await response.json() as Envelope<T>
  } catch {
    throw new Error(`home api: HTTP ${response.status} without JSON`)
  }
  if (!response.ok || envelope.ok !== true) {
    throw new HomeApiError(envelope.error?.message ?? `home api: HTTP ${response.status}`, envelope.error?.code ?? 'http-error', storageStatus(envelope.storage))
  }
  return envelope.value as T
}

/** 首页偏好：上次看到的时间点 + 已 dismiss 的会话（新活动会让它复活）。 */
export interface Prefs {
  lastSeenAt: number | null
  dismissed: Record<string, number>
}

/** 空偏好。 */
export function emptyPrefs(): Prefs {
  return { lastSeenAt: null, dismissed: {} }
}

/** 空布局。 */
export function emptyLayout(): Layout {
  return { order: [], focusOrder: [], size: {}, hidden: [] }
}

/** 取账本快照。 */
export function fetchSnapshot(): Promise<LedgerSnapshot> {
  return post<LedgerSnapshot>('snapshot')
}

/** 取用户布局。 */
export async function fetchLayout(): Promise<Layout | null> {
  const value = await post<{ layout: Layout | null }>('layout.get')
  return value.layout ?? null
}

/** 写用户布局。 */
export function saveLayout(layout: Layout): Promise<Layout> {
  return post<{ layout: Layout }>('layout.set', { layout }).then(value => value.layout)
}

/** 取首页偏好。 */
export async function fetchPrefs(): Promise<Prefs> {
  const value = await post<{ prefs: Prefs }>('prefs.get')
  const prefs = value?.prefs
  if (!prefs || (prefs.lastSeenAt !== null && (typeof prefs.lastSeenAt !== 'number' || !Number.isFinite(prefs.lastSeenAt)))
    || prefs.dismissed === null || typeof prefs.dismissed !== 'object' || Array.isArray(prefs.dismissed)
    || Object.values(prefs.dismissed).some(at => typeof at !== 'number' || !Number.isFinite(at))) {
    throw new HomeApiError('Invalid saved preferences response', 'bad-prefs-response')
  }
  return prefs
}

/** 写首页偏好。 */
export function savePrefs(prefs: Prefs): Promise<Prefs> {
  return post<{ prefs: Prefs }>('prefs.set', { prefs }).then(value => value.prefs)
}

/** 触发一次重扫（重建账本）。 */
export function requestRescan(): Promise<{ started: boolean }> {
  return post<{ started: boolean }>('rescan')
}
