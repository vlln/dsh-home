/**
 * 首页与宿主之间的那条路由（`POST /plugins/dsh-home/api`）。
 * 信封：`{ ok: true, value }` / `{ ok: false, error: { code, message } }`。
 *
 * @module @vlln/dsh-home/client/api
 */

import type { LibraryPoint } from './library-position.ts'

/** 老入口（同源围栏自校验）；宿主仍保留，供旧客户端使用。 */
export const API_PATH = '/plugins/dsh-home/api'

/** 新入口：官方 `connection` 的 `/api` 围栏（只认 owner 对端）。 */
export const CONNECTION_PATH = '/api/dsh-home/rpc'

/** 余额路由（与 `src/index.mjs` 的 `BALANCE_PATH` 同源）。 */
export const BALANCE_PATH = '/api/dsh-home/balance'

/** 当前入口；第一次 404/405 之后记住降级结果，不再重试。 */
let preferredPath: string = CONNECTION_PATH

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

/** 一天的 token 桶（provider 上报；宿主侧按天折叠）。 */
export interface TokenBuckets { input: number; output: number; cacheRead: number; cacheWrite: number }

/** 一天的天桶（宿主本机时区）。 */
export interface DayBucket {
  key: string
  activeMs: number
  runMs: number
  turns: number
  sessions: number
  tokens: TokenBuckets
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
  week: { activeMs: number; runMs: number; turns: number; sessions: number; tokens: TokenBuckets }
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
  readonly status: number
  readonly storage?: StorageStatus
  constructor(message: string, code: string, storage?: StorageStatus, status = 0) {
    super(message)
    this.name = 'HomeApiError'
    this.code = code
    this.storage = storage
    this.status = status
  }
}
function storageStatus(value: unknown): StorageStatus | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const item = value as StorageStatus
  if (typeof item.writable !== 'boolean' || !['ready', 'migrated', 'read-only', 'write-error'].includes(item.status)) return undefined
  if (item.error !== null && (item.error === undefined || typeof item.error.code !== 'string' || typeof item.error.message !== 'string')) return undefined
  return { writable: item.writable, status: item.status, error: item.error === null ? null : { ...item.error } }
}

/** 首屏文档的读取上限：任何一条读取都不该让卡片永远停在「加载中」。 */
const DOCUMENT_TIMEOUT_MS = 20_000

function boundedSignal(signal: AbortSignal | undefined, deadlineMs: number | undefined): { signal: AbortSignal | undefined; done: () => void } {
  if (deadlineMs === undefined) return { signal, done: () => {} }
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort(new DOMException('Home API timed out', 'TimeoutError')) }, deadlineMs)
  const relay = (): void => { controller.abort(signal?.reason) }
  if (signal !== undefined) {
    if (signal.aborted) relay()
    else signal.addEventListener('abort', relay, { once: true })
  }
  return { signal: controller.signal, done: () => { clearTimeout(timer); signal?.removeEventListener('abort', relay) } }
}

/** 发一条 op；失败抛带 code 的 Error。`deadlineMs` 只给首屏文档读取用。 */
export async function post<T>(op: string, extra: Record<string, unknown> = {}, signal?: AbortSignal, deadlineMs?: number): Promise<T> {
  const bounded = boundedSignal(signal, deadlineMs)
  const attempt = async (target: string): Promise<T> => {
    try {
      return await postTo<T>(target, op, extra, bounded.signal)
    } catch (error) {
      const status = error instanceof HomeApiError ? error.status : 0
      if (target !== preferredPath || (status !== 404 && status !== 405)) throw error
      // 宿主没挂 connection 围栏（老版本或旧 profile）：降级到老入口并记住。
      preferredPath = API_PATH
      return postTo<T>(API_PATH, op, extra, bounded.signal)
    }
  }
  try {
    return await attempt(preferredPath)
  } finally {
    bounded.done()
  }
}

async function postTo<T>(target: string, op: string, extra: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(target, {
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
    throw new HomeApiError(`home api: HTTP ${response.status} without JSON`, 'http-error', undefined, response.status)
  }
  if (!response.ok || envelope.ok !== true) {
    throw new HomeApiError(envelope.error?.message ?? `home api: HTTP ${response.status}`, envelope.error?.code ?? 'http-error', storageStatus(envelope.storage), response.status)
  }
  return envelope.value as T
}

/** The board's own name: it travels in prefs, so it is bounded like the rest of them. */
export const BOARD_TITLE_MAX = 40

/** 首页偏好：上次看到的时间点 + 已 dismiss 的会话（新活动会让它复活）。 */
export interface Prefs {
  lastSeenAt: number | null
  dismissed: Record<string, number>
  /** Whole-board content width chosen in edit mode; null means the default. */
  canvasWidth: number | null
  /** Corner of the floating widget library; null means its default corner. */
  libraryPosition: LibraryPoint | null
  /** The board's own name; null means the default heading. */
  boardTitle: string | null
}

/** 空偏好。 */
export function emptyPrefs(): Prefs {
  return { lastSeenAt: null, dismissed: {}, canvasWidth: null, libraryPosition: null, boardTitle: null }
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
    // Absent means "never chosen", so hosts predating this preference stay readable.
    || (prefs.canvasWidth !== null && prefs.canvasWidth !== undefined && (typeof prefs.canvasWidth !== 'number' || !Number.isFinite(prefs.canvasWidth)))
    || prefs.dismissed === null || typeof prefs.dismissed !== 'object' || Array.isArray(prefs.dismissed)
    || Object.values(prefs.dismissed).some(at => typeof at !== 'number' || !Number.isFinite(at))
    // Absent means the default corner; a present-but-malformed value is a corrupt document.
    || (prefs.libraryPosition !== null && prefs.libraryPosition !== undefined
      && (typeof prefs.libraryPosition !== 'object' || Array.isArray(prefs.libraryPosition)
        || typeof prefs.libraryPosition.x !== 'number' || !Number.isFinite(prefs.libraryPosition.x)
        || typeof prefs.libraryPosition.y !== 'number' || !Number.isFinite(prefs.libraryPosition.y)))
    // Absent means "never renamed"; a present-but-wrong-typed name is a corrupt document.
    || (prefs.boardTitle !== null && prefs.boardTitle !== undefined && typeof prefs.boardTitle !== 'string')) {
    throw new HomeApiError('Invalid saved preferences response', 'bad-prefs-response')
  }
  return { ...prefs, libraryPosition: prefs.libraryPosition ?? null, boardTitle: prefs.boardTitle ?? null }
}

/** 写首页偏好。 */
export function savePrefs(prefs: Prefs): Promise<Prefs> {
  return post<{ prefs: Prefs }>('prefs.set', { prefs }).then(value => value.prefs)
}

/** 触发一次重扫（重建账本）。 */
export function requestRescan(): Promise<{ started: boolean }> {
  return post<{ started: boolean }>('rescan')
}

/** 一条计划条目（待办或日程）。 */
export interface PlannerItem {
  id: string
  kind: 'task' | 'event'
  title: string
  day: string | null
  start: string | null
  end: string | null
  done: boolean
  doneAt: number | null
  priority: 0 | 1 | 2
  note: string
  createdAt: number
  updatedAt: number
}

/** 一个习惯，`marks` 是「哪天做过」的日键集合。 */
export interface PlannerHabit {
  id: string
  title: string
  weekdays: number[] | null
  marks: Record<string, true>
  createdAt: number
}

/** 计划文档：一份数据、四个视图（待办 / 计划表 / 日程表 / 打卡）。 */
export interface PlannerDoc {
  version: number
  revision: number
  items: PlannerItem[]
  habits: PlannerHabit[]
}

/** 计划写入操作；`title` 由客户端给出，其余由宿主校验。 */
export type PlannerOperation =
  | { op: 'item.create'; item: Partial<Omit<PlannerItem, 'id' | 'createdAt' | 'updatedAt' | 'done' | 'doneAt'>> }
  | { op: 'item.update'; id: string; patch: Partial<Pick<PlannerItem, 'kind' | 'title' | 'day' | 'start' | 'end' | 'priority' | 'note'>> }
  | { op: 'item.delete'; id: string }
  | { op: 'item.toggle'; id: string; done?: boolean }
  | { op: 'habit.create'; habit: { title: string; weekdays?: number[] | null } }
  | { op: 'habit.update'; id: string; patch: { title?: string; weekdays?: number[] | null } }
  | { op: 'habit.delete'; id: string }
  | { op: 'habit.mark'; id: string; day: string; on?: boolean }

/** 计划文档 + 可写状态。 */
export interface PlannerDocument { planner: PlannerDoc; storage: StorageStatus }

/** 一个计时器槽（按组件实例分槽）。 */
export interface FocusTimer {
  label: string
  startedAt: number | null
  accumulatedMs: number
  running: boolean
  /** 0 = 不限；否则到点后表盘停在 00:00。 */
  targetMs: number
}

/** 一个番茄钟槽。 */
export interface FocusPomodoro {
  phase: 'focus' | 'break'
  startedAt: number | null
  elapsedMs: number
  focusMs: number
  breakMs: number
  completed: Record<string, number>
}

/** 计时文档：只存时间戳，剩多久由前端算。 */
export interface FocusDoc {
  version: number
  revision: number
  timers: Record<string, FocusTimer>
  pomodoros: Record<string, FocusPomodoro>
}

/** 计时写入操作。 */
export type FocusOperation =
  | { op: 'timer.start' | 'timer.pause' | 'timer.reset' | 'timer.clear'; instanceId: string }
  | { op: 'timer.rename'; instanceId: string; label: string }
  | { op: 'timer.target'; instanceId: string; targetMs: number }
  | { op: 'pomodoro.start' | 'pomodoro.pause' | 'pomodoro.settle' | 'pomodoro.skip' | 'pomodoro.reset' | 'pomodoro.clear'; instanceId: string }
  | { op: 'focus.gc'; instanceIds: string[] }

/** 计时文档 + 可写状态。 */
export interface FocusDocument { focus: FocusDoc; storage: StorageStatus }

function isDocumentRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertPlanner(value: unknown): PlannerDoc {
  if (!isDocumentRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.habits)
    || typeof value.revision !== 'number' || typeof value.version !== 'number') {
    throw new HomeApiError('Invalid planner document', 'bad-planner-response')
  }
  return value as unknown as PlannerDoc
}

function assertFocus(value: unknown): FocusDoc {
  if (!isDocumentRecord(value) || !isDocumentRecord(value.timers) || !isDocumentRecord(value.pomodoros)
    || typeof value.revision !== 'number' || typeof value.version !== 'number') {
    throw new HomeApiError('Invalid focus document', 'bad-focus-response')
  }
  return value as unknown as FocusDoc
}

/** 取计划文档。 */
export async function fetchPlanner(): Promise<PlannerDocument> {
  const value = await post<PlannerDocument>('planner.get', {}, undefined, DOCUMENT_TIMEOUT_MS)
  return { planner: assertPlanner(value?.planner), storage: storageStatus(value?.storage) ?? { writable: true, status: 'ready', error: null } }
}

/** 应用一条计划操作，返回整份新文档。 */
export async function applyPlanner(operation: PlannerOperation): Promise<PlannerDocument> {
  const value = await post<PlannerDocument>('planner.apply', { operation })
  return { planner: assertPlanner(value?.planner), storage: storageStatus(value?.storage) ?? { writable: true, status: 'ready', error: null } }
}

/** 取计时文档。 */
export async function fetchFocus(): Promise<FocusDocument> {
  const value = await post<FocusDocument>('focus.get', {}, undefined, DOCUMENT_TIMEOUT_MS)
  return { focus: assertFocus(value?.focus), storage: storageStatus(value?.storage) ?? { writable: true, status: 'ready', error: null } }
}

/** 应用一条计时操作，返回整份新文档。 */
export async function applyFocus(operation: FocusOperation): Promise<FocusDocument> {
  const value = await post<FocusDocument>('focus.apply', { operation })
  return { focus: assertFocus(value?.focus), storage: storageStatus(value?.storage) ?? { writable: true, status: 'ready', error: null } }
}
