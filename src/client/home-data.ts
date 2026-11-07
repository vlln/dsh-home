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
import { HomeDataStore, homeData } from './home-data-store.ts'
import type { HomeDataSnapshot } from './home-data-store.ts'

export { HomeDataStore, homeData } from './home-data-store.ts'
export type { HomeDataSnapshot } from './home-data-store.ts'

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
