/**
 * 首页共享数据的无 React 核心：计划 / 计时的快照、加载与写入。
 *
 * 单独成文件是为了能在 Node 里直接测「卸载 → 重新挂载」的生命周期，
 * 不必为了一个 store 把 React 拉进单测。
 */
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
  /** 卸载时递增；旧页面的在途响应不能写进新页面的快照。 */
  private epoch = 0

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): HomeDataSnapshot => this.snapshot

  private publish(patch: Partial<HomeDataSnapshot>): void {
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
    const epoch = this.epoch
    this.publish({ plannerLoading: true })
    const run = (async () => {
      try {
        const value = await fetchPlanner()
        if (epoch !== this.epoch) return
        this.publish({ planner: value.planner, plannerStorage: value.storage, plannerError: null })
      } catch (error) {
        if (epoch !== this.epoch) return
        this.publish({ plannerError: messageOf(error) })
      } finally {
        if (epoch === this.epoch) {
          this.publish({ plannerLoading: false })
          this.plannerInflight = null
        }
      }
    })()
    this.plannerInflight = run
    return run
  }

  refreshFocus(): Promise<void> {
    if (this.focusInflight !== null) return this.focusInflight
    const epoch = this.epoch
    this.publish({ focusLoading: true })
    const run = (async () => {
      try {
        const value = await fetchFocus()
        if (epoch !== this.epoch) return
        this.publish({ focus: value.focus, focusStorage: value.storage, focusError: null })
      } catch (error) {
        if (epoch !== this.epoch) return
        this.publish({ focusError: messageOf(error) })
      } finally {
        if (epoch === this.epoch) {
          this.publish({ focusLoading: false })
          this.focusInflight = null
        }
      }
    })()
    this.focusInflight = run
    return run
  }

  /** 应用一条计划操作；失败时记下错误并抛给调用方（由调用方决定是否提示）。 */
  async mutatePlanner(operation: PlannerOperation): Promise<void> {
    const epoch = this.epoch
    try {
      const value = await applyPlanner(operation)
      if (epoch === this.epoch) this.publish({ planner: value.planner, plannerStorage: value.storage, plannerError: null })
    } catch (error) {
      if (epoch === this.epoch) this.publish({ plannerError: messageOf(error), plannerStorage: storageOf(error) })
      throw error
    }
  }

  /** 应用一条计时操作。 */
  async mutateFocus(operation: FocusOperation): Promise<void> {
    const epoch = this.epoch
    try {
      const value = await applyFocus(operation)
      if (epoch === this.epoch) this.publish({ focus: value.focus, focusStorage: value.storage, focusError: null })
    } catch (error) {
      if (epoch === this.epoch) this.publish({ focusError: messageOf(error), focusStorage: storageOf(error) })
      throw error
    }
  }

  /** 页面卸载：丢掉这一页的数据与在途请求，但 store 本身还能被下一次挂载重新使用。
   * 之前这里把 disposed 置死后不再恢复，切走再回来就永远停在「加载中」。 */
  reset(): void {
    this.epoch += 1
    this.snapshot = initial()
    this.listeners.clear()
    this.plannerInflight = null
    this.focusInflight = null
  }
}

function storageOf(error: unknown): StorageStatus {
  const storage = (error as { storage?: StorageStatus } | null)?.storage
  return storage ?? ready
}

/** 页面级单例；`reset()` 只清空这一页，不关死 store。 */
export const homeData = new HomeDataStore()
