/**
 * dsh-home 的 Node half：把会话日志折成活动账本，经一条同源围栏路由下发，
 * 并托管首页布局与偏好。
 *
 * 数据来源是官方的 `ctx.sessionPersistence`（`list` + `open(...,'read')` +
 * `read(0)`）——不直接读 `sessions/**.jsonl.zstd`：压缩帧、格式迁移（v0→v4）与
 * 撕裂尾部都归官方后端管，插件只消费逻辑事件流。
 *
 * 增量与上界：
 * - 每个会话记 `revision`（官方变更令牌）与 `foldVersion`（本插件的折叠口径版本）。
 *   两者任一不匹配就重折；口径升级后旧聚合不会被留成错数。
 * - 扫描按会话创建时间**从新到旧**分批（每批 4 条并发、批间让出事件循环），
 *   每 1.5 秒落一次盘，随时可被打断——真实机器上有 900+ 条会话、2 GB 日志，
 *   一次同步读完会让首页卡死几分钟。
 * - 进度（`progress.done/total`）随快照下发，前端显示"正在整理历史 N/M"。
 *
 * 落盘拆两份：`state.json`（布局 + 偏好，写得勤）与 `ledger.json`（会话聚合，写得少）。
 *
 * @module @vlln/dsh-home
 */

import { isSameOrigin } from './trust.mjs'
import { buildActivity, validateActivityQuery } from './activity.mjs'
import { applyFocusOp, emptyFocus } from './focus.mjs'
import { buildSnapshot, foldSession, FOLD_VERSION } from './ledger.mjs'
import { applyPlannerOp, emptyPlanner } from './planner.mjs'
import { loadFocus, loadLedger, loadPlanner, loadState, normalizeLayout, normalizePrefs, readOnlyState, saveFocus, saveLedger, savePlanner, saveState, stateStorage } from './state.mjs'
import { BUILTIN_WIDGET_IDS, layoutInstanceIds, validateWorkbench, widgetStateError } from './widget-state.mjs'

/** bundle 条目 id（= cordis.patch.yml 的 insert id）。 */
export const PLUGIN_ID = 'dsh-home'

/** 前端取数路由（与 client/index.tsx 的 API_PATH 同源）。 */
export const API_PATH = '/plugins/dsh-home/api'

/** Bounded workbench envelope (64 instances, bounded configs and geometry). */
const BODY_LIMIT = 256 * 1024

/** 快照触发的重扫阈值：60 秒内刚扫过就不再扫。 */
const SCAN_TTL_MS = 60_000

/** 每批并发读取的会话数。 */
const SCAN_CONCURRENCY = 4

/** 两次落盘之间的最小间隔（900 条会话的账本约几百 KB）。 */
const PERSIST_INTERVAL_MS = 1500

export const name = PLUGIN_ID

/** 只强制依赖 webServer；账本服务缺席时首页降级为「暂无数据」而不是整条 pending。 */
export const inject = ['webServer']

/** 读请求体（限长，超限直接拒绝）。 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error('body too large'), { code: 'bad-request' }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('body is not JSON'), { code: 'bad-request' }))
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/**
 * 活动账本的进程内状态与扫描器。
 * @param ctx cordis 上下文（宿主半边）
 * @param options 注入点（日志；测试可替换持久化实现）
 */
export function createHomeService(ctx, { log = () => {}, load = loadState, save = saveState } = {}) {
  let state
  try { state = load() } catch (error) { state = readOnlyState(error) }
  // A broken loader must not remove the route or make a fallback writable.
  if (state === undefined || state === null) state = readOnlyState(widgetStateError('State loader returned no document', 'state-read-error'))
  let storage = stateStorage(state)
  const ledger = loadLedger()
  if (ledger.foldVersion !== FOLD_VERSION) {
    // 口径升级：清空旧聚合与 scannedAt，下次快照就触发整份重折
    // （留着旧的 scannedAt 会让"60 秒内刚扫过"的判断跳过重扫）。
    ledger.sessions = {}
    ledger.foldVersion = FOLD_VERSION
    ledger.scannedAt = null
  }
  // 计划与计时是两份独立文档：损坏时保留原文件、页面显示不可用，绝不覆盖成空文档。
  const loadedPlanner = loadPlanner()
  let planner = loadedPlanner.doc ?? emptyPlanner()
  let plannerStatus = loadedPlanner.doc === null
    ? { writable: false, status: 'read-only', error: { code: loadedPlanner.error, message: 'Saved plan data cannot be read; original file retained' } }
    : { writable: true, status: 'ready', error: null }
  const loadedFocus = loadFocus()
  let focus = loadedFocus.doc ?? emptyFocus()
  let focusStatus = loadedFocus.doc === null
    ? { writable: false, status: 'read-only', error: { code: loadedFocus.error, message: 'Saved timer data cannot be read; original file retained' } }
    : { writable: true, status: 'ready', error: null }
  /** @type {object | undefined} */
  let persistence
  let scanning = false
  let scanError = false
  let inflight = null
  let progress = { done: 0, total: 0 }
  // Small bounded query cache; scan mutations invalidate it, and live counts expire in 30 seconds.
  const activityCache = new Map()
  const invalidateActivity = () => activityCache.clear()

  const clone = value => structuredClone(value)
  // No await between staging, saving and commit: concurrent route handlers serialize here.
  const persistState = (next) => {
    if (!storage.writable) throw widgetStateError(storage.error?.message ?? 'Saved workbench is read-only', 'state-read-only')
    try {
      save(next)
    } catch (error) {
      const code = error?.code === 'state-read-only' ? 'state-read-only' : 'state-write-error'
      storage = { writable: code !== 'state-read-only', status: code === 'state-read-only' ? 'read-only' : 'write-error', error: {
        code, message: code === 'state-read-only' ? 'Saved workbench is read-only; original file retained' : 'Cannot save workbench; previous state retained',
      } }
      log(`state write failed: ${error?.message ?? error}`)
      throw widgetStateError(storage.error.message, code)
    }
    state = next
    storage = { writable: true, status: 'ready', error: null }
  }

  const persistLedger = () => {
    try {
      saveLedger({ ...ledger, foldVersion: FOLD_VERSION })
    } catch (error) {
      log(`ledger write failed: ${error?.message ?? error}`)
    }
  }

  const commitPlanner = (next) => {
    if (!plannerStatus.writable) throw widgetStateError(plannerStatus.error.message, plannerStatus.error.code)
    try {
      savePlanner(next)
    } catch (error) {
      plannerStatus = { writable: false, status: 'write-error', error: { code: 'planner-write-error', message: 'Cannot save plan data; previous file retained' } }
      log(`planner write failed: ${error?.message ?? error}`)
      throw widgetStateError(plannerStatus.error.message, 'planner-write-error')
    }
    planner = next
    plannerStatus = { writable: true, status: 'ready', error: null }
  }

  /**
   * 以磁盘为准刷新计划（文件很小，每次读取都重读）：
   * 外部改坏 → 立刻进入只读并保留原文件；修好 → 无需重启即恢复。
   */
  const refreshPlanner = () => {
    const loaded = loadPlanner()
    if (loaded.doc === null) {
      plannerStatus = { writable: false, status: 'read-only', error: { code: loaded.error, message: 'Saved plan data cannot be read; original file retained' } }
      return
    }
    planner = loaded.doc
    plannerStatus = { writable: true, status: 'ready', error: null }
  }

  const commitFocus = (next) => {
    if (!focusStatus.writable) throw widgetStateError(focusStatus.error.message, focusStatus.error.code)
    try {
      saveFocus(next)
    } catch (error) {
      focusStatus = { writable: false, status: 'write-error', error: { code: 'focus-write-error', message: 'Cannot save timer data; previous file retained' } }
      log(`focus write failed: ${error?.message ?? error}`)
      throw widgetStateError(focusStatus.error.message, 'focus-write-error')
    }
    focus = next
    focusStatus = { writable: true, status: 'ready', error: null }
  }

  /** 以磁盘为准刷新计时文档；语义同 {@link refreshPlanner}。 */
  const refreshFocus = () => {
    const loaded = loadFocus()
    if (loaded.doc === null) {
      focusStatus = { writable: false, status: 'read-only', error: { code: loaded.error, message: 'Saved timer data cannot be read; original file retained' } }
      return
    }
    focus = loaded.doc
    focusStatus = { writable: true, status: 'ready', error: null }
  }

  const foldOne = async (snapshot) => {
    const id = snapshot.header.id
    const revision = String(snapshot.revision)
    let handle
    try {
      handle = await persistence.open(id, 'read')
      const { events } = await handle.read(0)
      ledger.sessions[id] = { ...foldSession(snapshot.header, events), revision }
    } catch (error) {
      // 单条会话读不动（迁移中/损坏/权限）不该拖垮整次扫描；记下 revision
      // 免得每次重试同一条坏会话。
      log(`skip session ${id}: ${error?.message ?? error}`)
      ledger.sessions[id] = { id, createdAt: snapshot.header.createdAt, revision, failed: true }
    } finally {
      if (handle !== undefined) await handle.close().catch(() => {})
    }
  }

  const scan = async () => {
    if (persistence === undefined) return
    if (inflight !== null) return inflight
    scanning = true
    invalidateActivity()
    scanError = false
    inflight = (async () => {
      try {
        const snapshots = await persistence.list()
        // 最近创建的会话先折：首屏拿到的就是"最近在干什么"。
        const pending = snapshots
          .filter(snapshot => ledger.sessions[snapshot.header.id]?.revision !== String(snapshot.revision))
          .sort((left, right) => right.header.createdAt - left.header.createdAt)
        progress = { done: 0, total: pending.length }
        let lastPersist = Date.now()
        for (let index = 0; index < pending.length; index += SCAN_CONCURRENCY) {
          const batch = pending.slice(index, index + SCAN_CONCURRENCY)
          await Promise.all(batch.map(snapshot => foldOne(snapshot)))
          invalidateActivity()
          progress = { done: Math.min(pending.length, index + batch.length), total: pending.length }
          if (Date.now() - lastPersist > PERSIST_INTERVAL_MS) {
            lastPersist = Date.now()
            persistLedger()
          }
          // 让出事件循环：扫描不能把用户在会话里的输入卡住。
          await new Promise(resolve => setTimeout(resolve, 0))
        }
        const live = new Set(snapshots.map(snapshot => snapshot.header.id))
        for (const id of Object.keys(ledger.sessions)) {
          if (!live.has(id)) delete ledger.sessions[id]
        }
        ledger.scannedAt = Date.now()
        ledger.foldVersion = FOLD_VERSION
      } catch (error) {
        scanError = true
        log(`scan failed: ${error?.message ?? error}`)
      } finally {
        scanning = false
        invalidateActivity()
        inflight = null
        persistLedger()
      }
    })()
    return inflight
  }

  const snapshot = () => {
    const stale = ledger.scannedAt === null || Date.now() - ledger.scannedAt > SCAN_TTL_MS
    if (stale && !scanning) void scan()
    return buildSnapshot({ ...ledger, scanning, progress })
  }

  return {
    /** 会话持久化服务到位后绑定（缺席时账本为空，页面仍可用）。 */
    attach(service) {
      persistence = service
      return scan()
    },
    scan,
    snapshot,
    activity(raw) {
      const query = validateActivityQuery(raw)
      snapshot() // Reuse the existing bounded scanner and refresh TTL.
      const key = JSON.stringify(query)
      const cached = activityCache.get(key)
      if (cached && Date.now() - cached.at < 30_000) return clone(cached.value)
      const value = buildActivity({ ...ledger, scanning, progress }, query, { available: persistence !== undefined, scanError })
      if (activityCache.size >= 24) activityCache.delete(activityCache.keys().next().value)
      activityCache.set(key, { at: Date.now(), value })
      return clone(value)
    },
    get state() { return clone(state) },
    get ledger() { return ledger },
    getStorage() { return clone(storage) },
    getWorkbench() {
      return clone({ layout: state.layout, instances: state.instances, storage })
    },
    setWorkbench(workbench) {
      const validated = validateWorkbench(workbench, normalizeLayout)
      persistState({ ...state, ...validated })
      this.pruneFocus(validated.instances.map(instance => instance.instanceId))
      return this.getWorkbench()
    },
    setLayout(raw) {
      const layout = normalizeLayout(raw)
      if (layout === null) throw widgetStateError('layout must be an object', 'bad-layout')
      // Old clients can introduce legacy slots, but cannot erase configured instances.
      const instances = clone(state.instances)
      const ids = new Set(instances.map(instance => instance.instanceId))
      const missing = new Set(layoutInstanceIds(layout).filter(id => !ids.has(id)))
      instances.push(...[...missing].map(instanceId => ({ instanceId,
        typeId: BUILTIN_WIDGET_IDS.includes(instanceId) ? `@vlln/dsh-home:${instanceId}` : `legacy:${instanceId}`,
        configVersion: 1, config: {},
      })))
      const validated = validateWorkbench({ layout, instances }, normalizeLayout)
      persistState({ ...state, ...validated })
      return clone(state.layout)
    },
    getLayout() {
      return clone(state.layout)
    },
    setPrefs(prefs) {
      persistState({ ...state, prefs: { ...state.prefs, ...normalizePrefs(prefs) } })
      return clone(state.prefs)
    },
    getPrefs() {
      return clone(state.prefs)
    },
    /** 计划文档 + 可写状态；只读时先重试读盘，文件修好即恢复。 */
    getPlanner() {
      refreshPlanner()
      return clone({ planner, storage: plannerStatus })
    },
    applyPlanner(operation) {
      refreshPlanner()
      if (!plannerStatus.writable) throw widgetStateError(plannerStatus.error.message, plannerStatus.error.code)
      const { doc } = applyPlannerOp(planner, operation)
      if (doc !== planner) commitPlanner(doc)
      return clone({ planner, storage: plannerStatus })
    },
    /** 计时文档 + 可写状态。 */
    getFocus() {
      refreshFocus()
      return clone({ focus, storage: focusStatus })
    },
    applyFocus(operation) {
      refreshFocus()
      if (!focusStatus.writable) throw widgetStateError(focusStatus.error.message, focusStatus.error.code)
      const { doc } = applyFocusOp(focus, operation)
      if (doc !== focus) commitFocus(doc)
      return clone({ focus, storage: focusStatus })
    },
    /** 实例删掉后清理它的计时槽；失败不影响布局保存。 */
    pruneFocus(instanceIds) {
      if (!focusStatus.writable) return
      try {
        const { doc } = applyFocusOp(focus, { op: 'focus.gc', instanceIds })
        if (doc !== focus) commitFocus(doc)
      } catch (error) {
        log(`focus gc failed: ${error?.message ?? error}`)
      }
    },
  }
}

/**
 * Cordis entry。
 * @param ctx 宿主上下文
 */
export function apply(ctx) {
  const log = (message) => {
    try {
      ctx.logger?.('dsh-home')?.debug?.(message)
    } catch {
      // 日志失败不影响功能。
    }
  }
  const service = createHomeService(ctx, { log })

  // 会话持久化是可选的严格注入：服务缺席时首页降级为「暂无数据」，
  // 而不是让整条条目永久 pending（那会让面板、路由一起消失）。
  ctx.inject(['sessionPersistence'], (scoped) => {
    const persistence = scoped.get('sessionPersistence')
    if (persistence === undefined) return
    scoped.effect(() => {
      void service.attach(persistence)
      return () => {}
    }, 'dsh-home: activity ledger')
  })

  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  // 两个入口共用一套 op 分发：老路径给已安装的旧客户端，/api 围栏给新客户端。
  const runOp = body => dispatch(service, body)

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: API_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'POST only' } })
        return
      }
      if (!isSameOrigin(req)) {
        send(res, 403, { ok: false, error: { code: 'forbidden', message: 'cross-origin request rejected' } })
        return
      }
      let body
      try {
        body = await readBody(req)
      } catch (error) {
        send(res, 400, { ok: false, error: { code: error.code ?? 'bad-request', message: error.message } })
        return
      }
      const reply = await runOp(body)
      send(res, reply.status, reply.payload)
    },
  }), 'dsh-home: api route')

  // 官方 connection 的 `/api` 围栏：只认 owner 对端，Host/Origin 同源检查由宿主完成。
  ctx.inject(['connection'], (scoped) => {
    const connection = scoped.get('connection')
    const register = connection?.fetch?.register
    if (typeof register !== 'function') return
    scoped.effect(() => register.call(connection.fetch, {
      path: CONNECTION_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        let body
        try {
          body = await request.json()
        } catch {
          return Response.json({ ok: false, error: { code: 'bad-request', message: 'body is not JSON' } }, { status: 400 })
        }
        const reply = await runOp(body)
        return Response.json(reply.payload, { status: reply.status, headers: { 'cache-control': 'no-store' } })
      },
    }), 'dsh-home: connection api route')
  })
}

/** `/api` 围栏后的新入口。 */
export const CONNECTION_PATH = '/api/dsh-home/rpc'

/** 客户端输入类错误的码值：它们原样回给前端，其余一律归为 internal。 */
const CLIENT_ERROR_CODES = new Set([
  'bad-workbench', 'bad-layout', 'bad-activity-query', 'state-read-only',
  'bad-op', 'bad-item', 'bad-title', 'bad-note', 'bad-day', 'bad-time', 'bad-kind', 'bad-priority',
  'bad-weekdays', 'bad-marks', 'bad-habit', 'bad-id', 'unknown-op', 'too-many-items', 'too-many-habits',
  'missing-item', 'missing-habit', 'bad-slot', 'bad-timer', 'bad-pomodoro', 'bad-gc',
  'missing-timer', 'missing-pomodoro', 'too-many-slots', 'bad-planner', 'bad-focus',
  'focus-read-only', 'planner-read-only',
  'planner-corrupt', 'focus-corrupt', 'planner-unreadable', 'focus-unreadable',
  'planner-too-large', 'focus-too-large',
])

/** 是否是可原样回给前端的码值（其余一律归为 internal）。 */
function knownCode(code) {
  return CLIENT_ERROR_CODES.has(code) || /-(?:write-error|corrupt|unreadable|too-large)$/u.test(code)
}

/** 码值 → HTTP 状态。 */
function statusOf(code) {
  if (/-too-large$/u.test(code)) return 413
  if (code === 'state-read-only' || /-(?:read-only)$/u.test(code)) return 409
  if (/-(?:corrupt|unreadable)$/u.test(code)) return 409
  if (/-write-error$/u.test(code)) return 500
  if (CLIENT_ERROR_CODES.has(code)) return 400
  return 500
}

/**
 * 一条 op 的分发：两个 HTTP 入口共用，返回状态码与信封。
 * @param service 首页服务
 * @param body 已解析的请求体
 * @returns `{ status, payload }`
 */
async function dispatch(service, body) {
  const op = body?.op
  try {
    if (op === 'snapshot') return { status: 200, payload: { ok: true, value: service.snapshot() } }
    if (op === 'activity') return { status: 200, payload: { ok: true, value: service.activity({ timeZone: body.timeZone, cwd: body.cwd, date: body.date }) } }
    if (op === 'workbench.get') return { status: 200, payload: { ok: true, value: service.getWorkbench() } }
    if (op === 'workbench.set') return { status: 200, payload: { ok: true, value: service.setWorkbench({ layout: body.layout, instances: body.instances }) } }
    if (op === 'layout.get') return { status: 200, payload: { ok: true, value: { layout: service.getLayout(), storage: service.getStorage() } } }
    if (op === 'layout.set') {
      const layout = normalizeLayout(body.layout)
      if (layout === null) return { status: 400, payload: { ok: false, error: { code: 'bad-layout', message: 'layout must be { order, size, hidden }' } } }
      return { status: 200, payload: { ok: true, value: { layout: service.setLayout(layout) } } }
    }
    if (op === 'prefs.get') return { status: 200, payload: { ok: true, value: { prefs: service.getPrefs(), storage: service.getStorage() } } }
    if (op === 'prefs.set') return { status: 200, payload: { ok: true, value: { prefs: service.setPrefs(normalizePrefs(body.prefs)) } } }
    if (op === 'rescan') {
      void service.scan()
      return { status: 200, payload: { ok: true, value: { started: true } } }
    }
    if (op === 'planner.get') return { status: 200, payload: { ok: true, value: service.getPlanner() } }
    if (op === 'planner.apply') return { status: 200, payload: { ok: true, value: service.applyPlanner(body.operation) } }
    if (op === 'focus.get') return { status: 200, payload: { ok: true, value: service.getFocus() } }
    if (op === 'focus.apply') return { status: 200, payload: { ok: true, value: service.applyFocus(body.operation) } }
    return { status: 400, payload: { ok: false, error: { code: 'unknown-op', message: `unknown op: ${String(op)}` } } }
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'internal'
    const status = statusOf(code)
    const safeCode = knownCode(code) ? code : 'internal'
    const message = safeCode === 'internal' ? 'Workbench operation failed' : error.message
    return { status, payload: { ok: false, error: { code: safeCode, message }, storage: service.getStorage() } }
  }
}
