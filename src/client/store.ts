/**
 * 首页的数据与布局状态：一份快照 + 订阅（`useSyncExternalStore` 的契约），
 * 账本 60 秒刷新一次，布局改动 500ms 防抖落盘。
 *
 * 会话标题/运行态来自官方 `ctx.sessions.list`（客户端已缓存的会话目录），
 * 账本只提供「时间」这一层——两者在页面里按 sessionId 合并。
 *
 * @module @vlln/dsh-home/client/store
 */

import { boardColumnsFor, isGridColumns, resolveCanvasWidth } from './canvas-width.ts'
import type { LibraryPoint } from './library-position.ts'
import { homeOrder } from './layout-model.ts'
import type { WorkspaceSource } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { JsonValue, WidgetDefinition, WidgetInstance, RegisteredWidgetDefinition, WidgetPreset } from './widget-contract.ts'
import { HomeWidgetRegistry, migrateWidgetInstance, validateWidgetConfig } from './widget-registry.ts'
import { legacyInstanceProjection, presetGeometry } from './widget-sizing.ts'
import { applyWidgetPreset, buildSpatialLayout, canPlace, carrySpatialBreakpoint, compactSpatialLayout, findSpatialSpace, mergeSpatialPositions, type SpatialItem } from './spatial-model.ts'
import {
  emptyLayout, emptyPrefs, fetchWorkbench, fetchPrefs, fetchSnapshot, saveWorkbench, savePrefs, HomeApiError,
  type Layout, type LedgerSnapshot, type Prefs, type WidgetSize, type StorageStatus,
} from './api.ts'

/** 客户端会话目录里首页需要的那几个字段。 */
export interface SessionMeta {
  id: string
  title?: string
  blank?: boolean
  running?: boolean
  cwd?: string
  updatedAt?: number
  parentSessionId?: string
  origin?: string
}

/** 首页状态。 */
export interface HomeState {
  ledger: LedgerSnapshot | null
  layout: Layout
  prefs: Prefs
  /** Preference writes are forbidden until the saved preferences were read successfully. */
  prefsLoaded: boolean
  instances: WidgetInstance[]
  workbenchLoaded: boolean
  workbenchBusy: boolean
  storage: StorageStatus
  sessions: Record<string, SessionMeta>
  /** Native workspace registry projection only; never persisted in Home. */
  nativePins?: { ids: readonly string[]; archived: readonly string[]; status: 'pending' | 'ready' | 'error' | 'unavailable' }
  /** Optional navigation services changed; keeps action consumers reactive. */
  actionRevision: number
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
    prefs: emptyPrefs(),
    prefsLoaded: false,
    instances: [],
    workbenchLoaded: false,
    workbenchBusy: false,
    storage: { writable: false, status: 'read-only', error: null },
    sessions: {},
    nativePins: { ids: [], archived: [], status: 'unavailable' },
    actionRevision: 0,
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

  private layoutTimer: ReturnType<typeof setTimeout> | null = null

  private prefsTimer: ReturnType<typeof setTimeout> | null = null

  private sessionOff: (() => void) | null = null
  private workspaceOff: (() => void) | null = null

  private disposed = false
  private writeQueue: Promise<unknown> = Promise.resolve()
  private migrationRegistry: HomeWidgetRegistry | null = null

  private assertEditable(): void {
    if (!this.state.workbenchLoaded || !this.state.storage.writable || this.state.workbenchBusy) {
      throw new Error(this.state.storage.error?.message ?? 'Workbench is not editable')
    }
  }

  private canWritePrefs(): boolean {
    return !this.disposed && this.state.prefsLoaded && this.state.workbenchLoaded && this.state.storage.writable
  }

  private recordWriteError(error: unknown): void {
    const diagnostic = error instanceof HomeApiError ? error.storage : undefined
    const readonly = diagnostic?.writable === false || (error instanceof HomeApiError && error.code === 'state-read-only')
    const storage: StorageStatus = readonly ? { writable: false, status: 'read-only', error: diagnostic?.error ?? {
      code: 'state-read-only', message: error instanceof Error ? error.message : String(error),
    } } : diagnostic ?? { writable: true, status: 'write-error', error: {
      code: error instanceof HomeApiError ? error.code : 'write-error', message: error instanceof Error ? error.message : String(error),
    } }
    if (!storage.writable) {
      if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
      if (this.prefsTimer !== null) clearTimeout(this.prefsTimer)
      this.layoutTimer = null
      this.prefsTimer = null
    }
    this.set({ storage })
  }

  /** Serialize complete document writes; a failed write never poisons later retries. */
  private persistDocument(layout = this.state.layout, instances = this.state.instances): Promise<void> {
    const document = structuredClone({ layout, instances })
    const operation = this.writeQueue.catch(() => {}).then(async () => {
      if (this.disposed) return
      if (!this.state.storage.writable) throw new HomeApiError(this.state.storage.error?.message ?? 'Saved workbench is read-only', 'state-read-only', this.state.storage)
      try {
        const saved = await saveWorkbench(document.layout, document.instances)
        if (this.state.storage.status === 'write-error') this.set({ storage: saved.storage })
      } catch (error) {
        this.recordWriteError(error)
        throw error
      }
    })
    this.writeQueue = operation
    return operation
  }

  constructor() {
    void this.refresh()
    void this.loadLayout()
    void this.loadPrefs()
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

  /** Notify consumers when optional navigation capabilities arrive or disappear. */
  notifyActionsChanged(): void {
    this.set({ actionRevision: this.state.actionRevision + 1 })
  }

  /** 接上官方会话目录（标题 / 运行态 / 空白态）。 */
  attachSessions(list: { getSnapshot: () => any; subscribe: (fn: () => void) => () => void }): void {
    this.sessionOff?.()
    const sync = (): void => {
      const snapshot = list.getSnapshot()
      const sessions: Record<string, SessionMeta> = {}
      for (const [id, summary] of Object.entries(snapshot?.byId ?? {})) {
        const item = summary as Record<string, unknown>
        sessions[id] = {
          id,
          ...(typeof item.displayTitle === 'string' && item.displayTitle.trim() !== '' ? { title: item.displayTitle }
            : typeof item.title === 'string' ? { title: item.title } : {}),
          ...(typeof item.blank === 'boolean' ? { blank: item.blank } : {}),
          ...(typeof item.running === 'boolean' ? { running: item.running } : {}),
          ...(typeof item.cwd === 'string' ? { cwd: item.cwd } : {}),
          ...(typeof item.updatedAt === 'number' ? { updatedAt: item.updatedAt } : {}),
          ...(typeof item.parentId === 'string' ? { parentSessionId: item.parentId }
            : typeof item.parentSessionId === 'string' ? { parentSessionId: item.parentSessionId } : {}),
          ...(typeof item.origin === 'string' ? { origin: item.origin } : {}),
        }
      }
      this.set({ sessions })
    }
    sync()
    this.sessionOff = list.subscribe(sync)
  }

  /** Release the optional catalog when its service scope is unloaded. */
  detachSessions(): void {
    this.sessionOff?.()
    this.sessionOff = null
  }

  /** Subscribe to the native global pin registry; Home never owns pin mutations. */
  attachWorkspaces(list: WorkspaceSource): void {
    this.workspaceOff?.()
    const sync = (): void => {
      const snapshot = list.getSnapshot()
      const ids = (values: readonly string[] | undefined): string[] => [...new Set((values ?? []).filter(id => typeof id === 'string' && id.trim() !== ''))]
      this.set({ nativePins: { ids: ids(snapshot.pinnedSessionIds), archived: ids(snapshot.archivedSessionIds),
        status: snapshot.state === 'error' ? 'error' : snapshot.phase === 'ready' ? 'ready' : 'pending' } })
    }
    sync()
    this.workspaceOff = list.subscribe(sync)
  }

  detachWorkspaces(): void {
    this.workspaceOff?.()
    this.workspaceOff = null
    this.set({ nativePins: { ids: [], archived: [], status: 'unavailable' } })
  }

  /** 拉一次账本快照。 */
  async refresh(): Promise<void> {
    if (this.state.refreshing) return
    this.set({ refreshing: true })
    try {
      const ledger = await fetchSnapshot()
      if (this.disposed) return
      this.set({ ledger, loading: false, refreshing: false, error: null, lastLoadedAt: Date.now(), now: Date.now() })
      if (ledger.scanning || ledger.scannedAt === null) {
        if (this.followUp !== null) clearTimeout(this.followUp)
        this.followUp = setTimeout(() => { this.followUp = null; void this.refresh() }, 3000)
      }
    } catch (error) {
      this.set({ loading: false, refreshing: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  /** 拉首页偏好。 */
  async loadPrefs(): Promise<void> {
    try {
      this.set({ prefs: await fetchPrefs(), prefsLoaded: true })
    } catch {
      // Keep defaults read-only: never persist an unread preference document.
      this.set({ prefsLoaded: false })
    }
  }

  /** 记下"这次看到了"，下次进首页就能算"自上次以来"。 */
  markSeen(): void {
    if (!this.canWritePrefs()) return
    if (this.state.prefs.lastSeenAt !== null
      && Date.now() - this.state.prefs.lastSeenAt < 60_000) return
    this.set({ prefs: { ...this.state.prefs, lastSeenAt: Date.now() } })
    this.persistPrefsSoon()
  }

  /** "这条我看过了"：记下时间；会话有新活动后会重新出现。 */
  dismiss(id: string): void {
    if (!this.canWritePrefs()) return
    this.set({ prefs: { ...this.state.prefs, dismissed: { ...this.state.prefs.dismissed, [id]: Date.now() } } })
    this.persistPrefsSoon()
  }

  /** One width for the whole board; not a per-widget size and never a layout change. */
  setCanvasWidth(width: number): void {
    if (!this.canWritePrefs()) return
    if (this.state.prefs.canvasWidth === width) return
    // Carry the rectangles to the new column count before anything can commit a
    // re-placed layout there: resizing is not a re-layout.
    const from = boardColumnsFor(resolveCanvasWidth(this.state.prefs.canvasWidth))
    const to = boardColumnsFor(width)
    this.set({ layout: carrySpatialBreakpoint(this.state.layout, from, to), prefs: { ...this.state.prefs, canvasWidth: width } })
    this.persistSoon()
    this.persistPrefsSoon()
  }

  /** Where the floating widget library was parked; `null` restores its default corner. */
  setLibraryPosition(position: LibraryPoint | null): void {
    if (!this.canWritePrefs()) return
    const current = this.state.prefs.libraryPosition
    if (current === position) return
    if (current !== null && position !== null && current.x === position.x && current.y === position.y) return
    this.set({ prefs: { ...this.state.prefs, libraryPosition: position } })
    this.persistPrefsSoon()
  }

  private persistPrefsSoon(): void {
    if (!this.canWritePrefs()) return
    if (this.prefsTimer !== null) clearTimeout(this.prefsTimer)
    this.prefsTimer = setTimeout(() => {
      this.prefsTimer = null
      if (!this.canWritePrefs()) return
      savePrefs(this.state.prefs).catch(error => { this.recordWriteError(error) })
    }, SAVE_DEBOUNCE_MS)
  }

  /** Load instances and geometry together. Failure never enables a default overwrite. */
  async loadLayout(): Promise<void> {
    try {
      const document = await fetchWorkbench()
      this.set({ layout: document.layout ?? emptyLayout(), instances: document.instances,
        storage: document.storage, workbenchLoaded: true })
      if (this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry)
    } catch (error) {
      this.set({ workbenchLoaded: true, storage: { writable: false, status: 'read-only',
        error: { code: 'load-error', message: error instanceof Error ? error.message : String(error) } } })
    }
  }

  /** Migrate only available definitions; preserve raw instances on any failure. */
  reconcileDefinitions(registry: HomeWidgetRegistry): void {
    this.migrationRegistry = registry
    if (!this.state.workbenchLoaded || !this.state.storage.writable || this.state.workbenchBusy) return
    let changed = false
    const instances = this.state.instances.map(instance => {
      const definition = registry.get(instance.typeId)
      if (!definition || definition.configVersion === instance.configVersion) return instance
      const result = migrateWidgetInstance(definition, instance)
      if (!result.ok) return instance
      changed = true
      return result.instance
    })
    if (changed) { this.set({ instances }); this.persistSoon() }
  }

  addInstance(definition: WidgetDefinition, current: SpatialItem[], cols: number): void {
    this.assertEditable()
    if (this.state.instances.length >= 64) throw new Error('Workbench instance limit reached')
    const registry = new HomeWidgetRegistry()
    registry.register({ ...definition, defaults: definition.sizing ? undefined : definition.defaults }, definition.typeId.startsWith('legacy:') ? { internalLegacyTypeId: true } : undefined)
    const instance = registry.createInstance(definition.typeId, crypto.randomUUID())
    this.insertInstance(instance, registry.get(definition.typeId)!, current, cols)
  }

  /** Publish one accepted library drop and every displaced peer atomically; no first-fit intermediate. */
  dropInstance(definition: WidgetDefinition, id: string, accepted: SpatialItem[], cols: number): void {
    this.assertEditable()
    if(!isGridColumns(cols))throw new Error('Invalid grid columns')
    if(this.state.instances.length>=64||this.state.instances.some(item=>item.instanceId===id))throw new Error('Invalid new instance')
    const registry=new HomeWidgetRegistry()
    registry.register({ ...definition, defaults: definition.sizing ? undefined : definition.defaults },definition.typeId.startsWith('legacy:')?{internalLegacyTypeId:true}:undefined)
    const instance=registry.createInstance(definition.typeId,id)
    const visible=this.state.instances.filter(item=>!this.state.layout.hidden.includes(item.instanceId)).map(item=>item.instanceId)
    if(accepted.length!==visible.length+1||new Set(accepted.map(item=>item.i)).size!==accepted.length||!accepted.some(item=>item.i===id)||visible.some(key=>!accepted.some(item=>item.i===key)))throw new Error('Stale drop layout')
    for(const item of accepted)if(![item.x,item.y,item.w,item.h].every(Number.isInteger)||item.x<0||item.y<0||item.w<1||item.h<3||item.x+item.w>cols||item.y+item.h>10003||!canPlace(accepted,item.i,item,cols))throw new Error('Invalid drop geometry')
    const active=accepted.find(item=>item.i===id)!
    const shape = presetGeometry(registry.get(definition.typeId)!.sizing.default, cols)
    if(active.w!==shape.w||active.h!==shape.h)throw new Error('Widget preset dimensions required')
    const layout=mergeSpatialPositions(this.state.layout,accepted,cols)
    layout.order=[...new Set([...(this.state.layout.instanceLayout ? [...this.state.layout.order,...this.state.instances.map(item=>item.instanceId)] : homeOrder(this.state.layout,this.state.instances.map(item=>item.instanceId))),id])]
    layout.instanceLayout=true
    this.set({instances:[...this.state.instances,instance],layout})
    this.persistSoon()
  }

  duplicateInstance(id: string, definition: WidgetDefinition, current: SpatialItem[], cols: number): void {
    this.assertEditable()
    if (this.state.instances.length >= 64) throw new Error('Workbench instance limit reached')
    const original = this.state.instances.find(instance => instance.instanceId === id)
    if (!original || original.typeId !== definition.typeId) throw new Error('Unknown widget instance or mismatched definition')
    const instance = { ...structuredClone(original), instanceId: crypto.randomUUID() }
    const registry = new HomeWidgetRegistry()
    registry.register({ ...definition, defaults: definition.sizing ? undefined : definition.defaults }, definition.typeId.startsWith('legacy:') ? { internalLegacyTypeId: true } : undefined)
    this.insertInstance(instance, registry.get(definition.typeId)!, current, cols)
  }

  private insertInstance(instance: WidgetInstance, definition: RegisteredWidgetDefinition, current: SpatialItem[], cols: number): void {
    const defaults = definition.defaults
    const meta = { id: instance.instanceId, sizing: definition.sizing, defaultSize: defaults?.size ?? 'm',
      defaultHeight: defaults?.height ?? 4, minWidth: defaults?.minWidth, minHeight: defaults?.minHeight,
      maxWidth: defaults?.maxWidth, maxHeight: defaults?.maxHeight }
    const layout = mergeSpatialPositions(this.state.layout, current, cols)
    const shape = buildSpatialLayout(emptyLayout(), [meta], cols)[0]
    const rect = shape && findSpatialSpace(current, shape, cols)
    if (!rect) throw new Error('No space available for this widget')
    const next = mergeSpatialPositions(layout, [{ ...shape, ...rect }], cols)
    next.order = [...(layout.instanceLayout ? [...new Set([...layout.order, ...this.state.instances.map(item => item.instanceId)])]
      : homeOrder(layout, this.state.instances.map(item => item.instanceId))), instance.instanceId]
    next.instanceLayout = true
    this.set({ instances: [...this.state.instances, instance], layout: next })
    this.persistSoon()
  }

  private layoutWithoutInstance(id: string): Layout {
    const layout = structuredClone(this.state.layout)
    layout.order = layout.order.filter(value => value !== id)
    layout.focusOrder = layout.focusOrder.filter(value => value !== id)
    layout.hidden = layout.hidden.filter(value => value !== id)
    delete layout.size[id]
    for (const rows of Object.values(layout.positions ?? {})) delete rows[id]
    return layout
  }

  removeInstance(id: string): void {
    this.assertEditable()
    this.set({ layout: this.layoutWithoutInstance(id), instances: this.state.instances.filter(instance => instance.instanceId !== id) })
    this.persistSoon()
  }

  /** Confirmation UI closes only after this write succeeds; failure keeps the card/config/layout. */
  async removeInstanceDurably(id: string): Promise<void> {
    this.assertEditable()
    if (this.disposed) throw new Error('Workbench is disposed')
    if (!this.state.instances.some(instance => instance.instanceId === id)) throw new Error('Unknown widget instance')
    const layout = this.layoutWithoutInstance(id)
    const instances = this.state.instances.filter(instance => instance.instanceId !== id)
    if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
    this.layoutTimer = null
    this.set({ workbenchBusy: true })
    let saved = false
    try {
      await this.persistDocument(layout, instances)
      this.set({ layout, instances })
      saved = true
    } finally {
      this.set({ workbenchBusy: false })
      if (saved && !this.disposed && this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry)
    }
  }

  async saveInstanceConfig(id: string, definition: WidgetDefinition, config: JsonValue): Promise<void> {
    this.assertEditable()
    const original = this.state.instances.find(instance => instance.instanceId === id)
    if (!original || original.typeId !== definition.typeId) throw new Error('Unknown widget instance or mismatched definition')
    const draft = validateWidgetConfig(definition, config)
    const instances = this.state.instances.map(instance => instance.instanceId === id
      ? { ...instance, config: draft, configVersion: definition.configVersion } : instance)
    if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
    this.layoutTimer = null
    this.set({ workbenchBusy: true })
    try {
      await this.persistDocument(this.state.layout, instances)
      this.set({ instances })
    } finally {
      this.set({ workbenchBusy: false })
      if (!this.disposed && this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry)
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

  /** 「三件事」的实际顺序：默认顺序 + 用户覆盖。 */
  orderedFocus(fallbackOrder: string[]): string[] {
    const known = new Set(fallbackOrder)
    const kept = this.state.layout.focusOrder.filter(id => known.has(id))
    const rest = fallbackOrder.filter(id => !kept.includes(id))
    return [...kept, ...rest]
  }

  /** 把「三件事」里的 id 插到 target 前/后。 */
  moveFocusRelative(id: string, target: string, side: 'before' | 'after', fallbackOrder: string[]): void {
    if (id === target) return
    const order = this.orderedFocus(fallbackOrder).filter(item => item !== id)
    const index = order.indexOf(target)
    if (index < 0) return
    order.splice(side === 'before' ? index : index + 1, 0, id)
    this.set({ layout: { ...this.state.layout, focusOrder: order } })
    this.persistSoon()
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

  /** Unified surface ordering, migrating the legacy two-section layout on first edit. */
  moveHomeRelative(id: string, target: string, side: 'before' | 'after', fallback: string[]): void {
    if (id === target) return
    const all = homeOrder(this.state.layout, fallback)
    if (!all.includes(id) || !all.includes(target)) return
    const order = all.filter(item => item !== id)
    const index = order.indexOf(target)
    order.splice(side === 'before' ? index : index + 1, 0, id)
    this.set({ layout: { ...this.state.layout, order } })
    this.persistSoon()
  }

  /** Explicit, no-reflow grid preset transaction. Failures have zero publication/write. */
  setWidgetPreset(id: string, definition: RegisteredWidgetDefinition, current: readonly SpatialItem[], cols: number, preset: WidgetPreset): boolean {
    this.assertEditable()
    if (this.disposed || !isGridColumns(cols)) throw new Error('Invalid preset request')
    const instance = this.state.instances.find(item => item.instanceId === id)
    if (!instance || instance.typeId !== definition.typeId || this.state.layout.hidden.includes(id)) throw new Error('Unknown widget')
    if (!this.migrationRegistry || this.migrationRegistry.get(instance.typeId) !== definition) throw new Error('Widget provider changed')
    const metas = this.state.instances.map(item => {
      const registered = this.migrationRegistry!.get(item.typeId)
      return { id: item.instanceId, sizing: registered?.sizing, declaredSizing: registered?.declaredSizing,
        legacyProjection: legacyInstanceProjection(item.typeId, item.instanceId, this.state.layout, registered), defaultSize: registered?.defaults.size ?? 'm' as const,
        defaultHeight: registered?.defaults.height ?? 4, ...registered?.defaults }
    })
    const actual = buildSpatialLayout(this.state.layout, metas, cols)
    if (actual.length !== current.length || new Set(current.map(item => item.i)).size !== current.length
      || actual.some(item => !current.some(peer => peer.i === item.i && peer.x === item.x && peer.y === item.y && peer.w === item.w && peer.h === item.h))) throw new Error('Stale preset geometry')
    for (const item of current) if (!canPlace(current, item.i, item, cols)) throw new Error('Invalid preset peers')
    const next = applyWidgetPreset(current, id, definition.sizing, preset, cols)
    if (next === current) return false
    this.set({ layout: mergeSpatialPositions(this.state.layout, [next.find(item => item.i === id)!], cols) })
    this.persistSoon()
    return true
  }

  /** Persist only the active breakpoint, retaining hidden and absent plugin positions. */
  setSpatialLayout(items: SpatialItem[], cols: number): void {
    this.assertEditable()
    this.set({ layout: mergeSpatialPositions(this.state.layout, items, cols) })
    this.persistSoon()
  }

  /**
   * User-click-only command: pass the current rendered geometry and breakpoint.
   * Page must also block active pointer/library drags, settings and its own save.
   * Read-only/loading/busy/disposed or invalid/stale requests throw atomically.
   * Only visible instance positions at this breakpoint change; config, sizes,
   * order, hidden/absent positions and every other breakpoint remain untouched.
   * Uses the normal debounce; Done/flushLayout still owns durable-write errors.
   */
  compactSpatialLayout(current: readonly SpatialItem[], cols: number): boolean {
    this.assertEditable()
    if (this.disposed) throw new Error('Workbench is disposed')
    const packed = compactSpatialLayout(current, cols)
    const visible = this.state.instances.filter(instance => !this.state.layout.hidden.includes(instance.instanceId))
    if (current.length !== visible.length || visible.some(instance => !current.some(item => item.i === instance.instanceId))) {
      throw new Error('Stale compact layout')
    }
    const saved = this.state.layout.positions?.[String(cols)]
    for (const item of current) {
      // Unsaved projected cards are allowed (legacy/missing breakpoint). Existing
      // durable rectangles must still match the snapshot the page is rendering.
      if (saved && Object.hasOwn(saved, item.i)) {
        const rect = saved[item.i]!
        if (rect.x !== item.x || rect.y !== item.y || rect.w !== item.w || rect.h !== item.h) {
          throw new Error('Stale compact geometry')
        }
      }
    }
    if (packed === current) return false
    this.set({ layout: mergeSpatialPositions(this.state.layout, packed, cols) })
    this.persistSoon()
    return true
  }

  /** Restoring one card finds a free slot without moving any existing widgets. */
  toggleSpatialHidden(id: string, current: SpatialItem[], metas: { id: string; defaultSize: WidgetSize }[], cols: number): void {
    this.assertEditable()
    if (!this.state.layout.hidden.includes(id)) { this.hide(id); return }
    const layout = mergeSpatialPositions(this.state.layout, current, cols)
    const unhidden = { ...layout, hidden: layout.hidden.filter(item => item !== id) }
    const candidate = buildSpatialLayout(unhidden, metas, cols).find(item => item.i === id)
    if (candidate !== undefined) {
      const saved = layout.positions?.[String(cols)]?.[id]
      const rect = saved !== undefined && canPlace(current, id, saved, cols)
        ? saved : findSpatialSpace(current, candidate, cols)
      if (rect !== null) {
        unhidden.positions = { ...layout.positions, [String(cols)]: { ...layout.positions?.[String(cols)], [id]: rect } }
      }
    }
    this.set({ layout: unhidden })
    this.persistSoon()
  }

  /** Done waits for a durable write; failures leave the editor open for retry. */
  async flushLayout(): Promise<void> {
    if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
    this.layoutTimer = null
    this.assertEditable()
    await this.persistDocument()
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
    this.assertEditable()
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

  private persistSoon(): void {
    if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
    this.layoutTimer = setTimeout(() => {
      this.layoutTimer = null
      if (this.state.storage.writable) void this.persistDocument().catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  dispose(): void {
    this.disposed = true
    if (this.timer !== null) clearInterval(this.timer)
    if (this.tick !== null) clearInterval(this.tick)
    if (this.followUp !== null) clearTimeout(this.followUp)
    if (this.layoutTimer !== null) clearTimeout(this.layoutTimer)
    if (this.prefsTimer !== null) clearTimeout(this.prefsTimer)
    this.detachSessions()
    this.detachWorkspaces()
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    this.listeners.clear()
  }
}
