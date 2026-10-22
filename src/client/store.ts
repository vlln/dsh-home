/**
 * 首页的数据与布局状态：一份快照 + 订阅（`useSyncExternalStore` 的契约），
 * 账本 60 秒刷新一次，布局改动 500ms 防抖落盘。
 *
 * 会话标题/运行态来自官方 `ctx.sessions.list`（客户端已缓存的会话目录），
 * 账本只提供「时间」这一层——两者在页面里按 sessionId 合并。
 *
 * @module @vlln/dsh-home/client/store
 */

import {
  emptyLayout, fetchLayout, fetchSnapshot, saveLayout, type Layout, type LedgerSnapshot, type WidgetSize,
} from './api.ts'

/** 客户端会话目录里首页需要的那几个字段。 */
export interface SessionMeta {
  id: string
  title?: string
  blank?: boolean
  running?: boolean
  cwd?: string
  updatedAt?: number
}

/** 首页状态。 */
export interface HomeState {
  ledger: LedgerSnapshot | null
  layout: Layout
  sessions: Record<string, SessionMeta>
  loading: boolean
  refreshing: boolean
  error: string | null
  lastLoadedAt: number | null
  now: number
}

/** 刷新周期：账本是分钟级数据，60 秒足够新。 */
const REFRESH_MS = 60_000

/** 布局落盘防抖。 */
const SAVE_DEBOUNCE_MS = 500

/** 订阅式状态容器。 */
export class HomeStore {
  private state: HomeState = {
    ledger: null,
    layout: emptyLayout(),
    sessions: {},
    loading: true,
    refreshing: false,
    error: null,
    lastLoadedAt: null,
    now: Date.now(),
  }

  private readonly listeners = new Set<() => void>()

  private timer: ReturnType<typeof setInterval> | null = null

  private tick: ReturnType<typeof setInterval> | null = null

  /** 账本还在扫描时的补拉定时器（首屏不应停在部分数据上等 60 秒）。 */
  private followUp: ReturnType<typeof setTimeout> | null = null

  private saveTimer: ReturnType<typeof setTimeout> | null = null

  private sessionOff: (() => void) | null = null

  private disposed = false

  constructor() {
    void this.refresh()
    void this.loadLayout()
    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        void this.refresh()
      }, REFRESH_MS)
      // 相对时间（"停在 3 分钟前"）每 30 秒走一格，不必等下一次取数。
      this.tick = setInterval(() => { this.set({ now: Date.now() }) }, 30_000)
      // 切回标签页立刻刷一次：隔夜回来不该看到昨天的账。
      document.addEventListener('visibilitychange', this.onVisibility)
    }
  }

  private readonly onVisibility = (): void => {
    if (typeof document !== 'undefined' && !document.hidden) void this.refresh()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): HomeState => this.state

  private set(patch: Partial<HomeState>): void {
    if (this.disposed) return
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  /** 接上官方会话目录（标题 / 运行态 / 空白态）。 */
  attachSessions(list: { getSnapshot: () => any; subscribe: (fn: () => void) => () => void }): void {
    const sync = (): void => {
      const snapshot = list.getSnapshot()
      const sessions: Record<string, SessionMeta> = {}
      for (const [id, summary] of Object.entries(snapshot?.byId ?? {})) {
        const item = summary as Record<string, unknown>
        sessions[id] = {
          id,
          ...(typeof item.title === 'string' ? { title: item.title } : {}),
          ...(typeof item.blank === 'boolean' ? { blank: item.blank } : {}),
          ...(typeof item.running === 'boolean' ? { running: item.running } : {}),
          ...(typeof item.cwd === 'string' ? { cwd: item.cwd } : {}),
          ...(typeof item.updatedAt === 'number' ? { updatedAt: item.updatedAt } : {}),
        }
      }
      this.set({ sessions })
    }
    sync()
    this.sessionOff = list.subscribe(sync)
  }

  /** 拉一次账本快照。 */
  async refresh(): Promise<void> {
    if (this.state.refreshing) return
    this.set({ refreshing: true })
    try {
      const ledger = await fetchSnapshot()
      this.set({ ledger, loading: false, refreshing: false, error: null, lastLoadedAt: Date.now(), now: Date.now() })
      if (ledger.scanning || ledger.scannedAt === null) {
        if (this.followUp !== null) clearTimeout(this.followUp)
        this.followUp = setTimeout(() => { this.followUp = null; void this.refresh() }, 3000)
      }
    } catch (error) {
      this.set({ loading: false, refreshing: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  /** 拉用户布局（失败就用默认布局，不拦页面）。 */
  async loadLayout(): Promise<void> {
    try {
      const layout = await fetchLayout()
      if (layout !== null) this.set({ layout })
    } catch {
      // 布局拿不到不是错误：默认排布照常工作。
    }
  }

  /** 把 id 移到 target 之前（target 为 undefined = 移到末尾）。 */
  moveBefore(id: string, target: string | undefined, fallbackOrder: string[]): void {
    const order = this.ordered(fallbackOrder).filter(item => item !== id)
    const index = target === undefined ? order.length : order.indexOf(target)
    order.splice(index < 0 ? order.length : index, 0, id)
    this.set({ layout: { ...this.state.layout, order } })
    this.persistSoon()
  }

  /** 按 fallback 顺序 + 用户 order 覆盖得到实际顺序。 */
  ordered(fallbackOrder: string[]): string[] {
    const known = new Set(fallbackOrder)
    const kept = this.state.layout.order.filter(id => known.has(id))
    const rest = fallbackOrder.filter(id => !kept.includes(id))
    return [...kept, ...rest]
  }

  /** 把 id 插到 target 前/后（拖拽落点用）。 */
  moveRelative(id: string, target: string, side: 'before' | 'after', fallbackOrder: string[]): void {
    if (id === target) return
    const order = this.ordered(fallbackOrder).filter(item => item !== id)
    const index = order.indexOf(target)
    if (index < 0) return
    order.splice(side === 'before' ? index : index + 1, 0, id)
    this.set({ layout: { ...this.state.layout, order } })
    this.persistSoon()
  }

  /** 显示/隐藏一张卡（编辑态的小组件清单用）。 */
  toggleHidden(id: string): void {
    const hidden = this.state.layout.hidden
    const next = hidden.includes(id) ? hidden.filter(item => item !== id) : [...hidden, id]
    this.set({ layout: { ...this.state.layout, hidden: next } })
    this.persistSoon()
  }

  setSize(id: string, size: WidgetSize): void {
    this.set({ layout: { ...this.state.layout, size: { ...this.state.layout.size, [id]: size } } })
    this.persistSoon()
  }

  hide(id: string): void {
    const hidden = this.state.layout.hidden.includes(id)
      ? this.state.layout.hidden
      : [...this.state.layout.hidden, id]
    this.set({ layout: { ...this.state.layout, hidden } })
    this.persistSoon()
  }

  showAll(): void {
    this.set({ layout: { ...this.state.layout, hidden: [] } })
    this.persistSoon()
  }

  reset(): void {
    this.set({ layout: emptyLayout() })
    this.persistSoon()
  }

  private persistSoon(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      saveLayout(this.state.layout).catch(() => {
        // 落盘失败不回滚 UI：下一次改动会再写一遍。
      })
    }, SAVE_DEBOUNCE_MS)
  }

  dispose(): void {
    this.disposed = true
    if (this.timer !== null) clearInterval(this.timer)
    if (this.tick !== null) clearInterval(this.tick)
    if (this.followUp !== null) clearTimeout(this.followUp)
    if (this.saveTimer !== null) clearTimeout(this.saveTimer)
    this.sessionOff?.()
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    this.listeners.clear()
  }
}
