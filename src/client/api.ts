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

/** 用户布局（只存覆盖，默认值在页面侧合并）。 */
export interface Layout {
  order: string[]
  /** 「三件事」的纵向顺序（卡片 id：resume / queue / today）。 */
  focusOrder: string[]
  size: Record<string, WidgetSize>
  hidden: string[]
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
}

/** 发一条 op；失败抛带 code 的 Error。 */
export async function post<T>(op: string, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ op, ...extra }),
  })
  let envelope: Envelope<T>
  try {
    envelope = await response.json() as Envelope<T>
  } catch {
    throw new Error(`home api: HTTP ${response.status} without JSON`)
  }
  if (!response.ok || envelope.ok !== true) {
    throw new Error(envelope.error?.message ?? `home api: HTTP ${response.status}`)
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
  return value.prefs
}

/** 写首页偏好。 */
export function savePrefs(prefs: Prefs): Promise<Prefs> {
  return post<{ prefs: Prefs }>('prefs.set', { prefs }).then(value => value.prefs)
}

/** 触发一次重扫（重建账本）。 */
export function requestRescan(): Promise<{ started: boolean }> {
  return post<{ started: boolean }>('rescan')
}
