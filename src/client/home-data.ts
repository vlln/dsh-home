/**
 * 首页共享数据：计划（待办 / 日程 / 习惯）与计时（计时器 / 番茄钟）。
 *
 * 一份模块级 store，多个组件实例共享同一份订阅——这就是「待办、计划表、日程表、打卡」
 * 四处即时互通的机制：任何一处写入后更新 store，别处同一帧就跟着重渲染。
 *
 * 写入以宿主为准：每次操作发一条 op，返回整份新文档。客户端不重复实现 op 语义，
 * 也就不存在两份口径互相漂移的问题（代价是等一次本地 RPC，通常 1–2 ms）。
 *
 * 预览（`props.preview` 存在）**不读这个 store**：组件自己渲染合成数据，
 * 因此预览不会发请求、不会订阅、不会起计时。
 *
 * @module @vlln/dsh-home/client/home-data
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  applyFocus, applyPlanner, fetchFocus, fetchPlanner,
  type FocusDoc, type FocusOperation, type PlannerDoc, type PlannerOperation, type StorageStatus,
} from './api.ts'

export interface HomeDataSnapshot {
  planner: PlannerDoc | null
  plannerStorage: StorageStatus
  plannerLoading: boolean
  plannerError: string | null
  focus: FocusDoc | null
  focusStorage: StorageStatus
  focusLoading: boolean
  focusError: string | null
}

const ready: StorageStatus = { writable: true, status: 'ready', error: null }

function initial(): HomeDataSnapshot {
  return {
    planner: null, plannerStorage: ready, plannerLoading: false, plannerError: null,
    focus: null, focusStorage: ready, focusLoading: false, focusError: null,
  }
}

/** 消息层错误 → 可显示的一行文字（不暴露内部栈）。 */
function messageOf(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.trim() === '' ? '数据不可用' : text
}

/** 共享数据 store；页面挂载时 `load()` 一次，卸载时 `reset()`。 */
export class HomeDataStore {
  private snapshot: HomeDataSnapshot = initial()
  private readonly listeners = new Set<() => void>()
  private plannerInflight: Promise<void> | null = null
  private focusInflight: Promise<void> | null = null
  private disposed = false

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): HomeDataSnapshot => this.snapshot

  private publish(patch: Partial<HomeDataSnapshot>): void {
    if (this.disposed) return
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  /** 首次读取；并发调用共用同一次请求。 */
  load(): void {
    void this.refreshPlanner()
    void this.refreshFocus()
  }

  refreshPlanner(): Promise<void> {
    if (this.plannerInflight !== null) return this.plannerInflight
    this.publish({ plannerLoading: true })
    const run = (async () => {
      try {
        const value = await fetchPlanner()
        this.publish({ planner: value.planner, plannerStorage: value.storage, plannerError: null })
      } catch (error) {
        this.publish({ plannerError: messageOf(error) })
      } finally {
        this.publish({ plannerLoading: false })
        this.plannerInflight = null
      }
    })()
    this.plannerInflight = run
    return run
  }

  refreshFocus(): Promise<void> {
    if (this.focusInflight !== null) return this.focusInflight
    this.publish({ focusLoading: true })
    const run = (async () => {
      try {
        const value = await fetchFocus()
        this.publish({ focus: value.focus, focusStorage: value.storage, focusError: null })
      } catch (error) {
        this.publish({ focusError: messageOf(error) })
      } finally {
        this.publish({ focusLoading: false })
        this.focusInflight = null
      }
    })()
    this.focusInflight = run
    return run
  }

  /** 应用一条计划操作；失败时记下错误并抛给调用方（由调用方决定是否提示）。 */
  async mutatePlanner(operation: PlannerOperation): Promise<void> {
    try {
      const value = await applyPlanner(operation)
      this.publish({ planner: value.planner, plannerStorage: value.storage, plannerError: null })
    } catch (error) {
      this.publish({ plannerError: messageOf(error), plannerStorage: storageOf(error) })
      throw error
    }
  }

  /** 应用一条计时操作。 */
  async mutateFocus(operation: FocusOperation): Promise<void> {
    try {
      const value = await applyFocus(operation)
      this.publish({ focus: value.focus, focusStorage: value.storage, focusError: null })
    } catch (error) {
      this.publish({ focusError: messageOf(error), focusStorage: storageOf(error) })
      throw error
    }
  }

  reset(): void {
    this.disposed = true
    this.snapshot = initial()
    this.listeners.clear()
  }
}

function storageOf(error: unknown): StorageStatus {
  const storage = (error as { storage?: StorageStatus } | null)?.storage
  return storage ?? ready
}

/** 页面级单例。 */
export const homeData = new HomeDataStore()

/** 组件拿到的视图：数据快照 + 发起操作的 store。 */
export interface HomeDataView extends HomeDataSnapshot { store: HomeDataStore }

/** 组件读取共享数据（无 selector：数据量小，引用比较交给 React）。 */
export function useHomeData(store: HomeDataStore = homeData): HomeDataView {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return { ...snapshot, store }
}

/**
 * 秒级时钟；`enabled` 为 false（或停止）时不排定时器。
 * 只用于「现在」这类纯计算，不触发请求。
 * @param intervalMs 刷新间隔，默认 1000
 * @param enabled 是否走时（隐藏的卡、预览都传 false）
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), Math.max(250, intervalMs))
    return () => clearInterval(timer)
  }, [intervalMs, enabled])
  return now
}

/** 今天的日键（本地时区）。 */
export function todayKey(now: number = Date.now()): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 日键加减天数。 */
export function shiftDay(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const at = new Date(year, month - 1, day)
  at.setDate(at.getDate() + delta)
  return todayKey(at.getTime())
}

/** 两个日键相差几天（`to - from`）。 */
export function dayDiff(from: string, to: string): number {
  const parse = (key: string): number => {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }
  return Math.round((parse(to) - parse(from)) / 86_400_000)
}

/** 一周七天的周几（周一 = 1 … 周日 = 7）。 */
export function weekdayOf(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  const index = new Date(year, month - 1, day).getDay()
  return index === 0 ? 7 : index
}
