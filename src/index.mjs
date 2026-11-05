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
import { buildSnapshot, foldSession, FOLD_VERSION } from './ledger.mjs'
import { loadLedger, loadState, normalizeLayout, normalizePrefs, readOnlyState, saveLedger, saveState, stateStorage } from './state.mjs'
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
      const op = body?.op
      try {
        if (op === 'snapshot') {
          send(res, 200, { ok: true, value: service.snapshot() })
          return
        }
        if (op === 'activity') {
          send(res, 200, { ok: true, value: service.activity({ timeZone: body.timeZone, cwd: body.cwd, date: body.date }) })
          return
        }
        if (op === 'workbench.get') {
          send(res, 200, { ok: true, value: service.getWorkbench() })
          return
        }
        if (op === 'workbench.set') {
          send(res, 200, { ok: true, value: service.setWorkbench({ layout: body.layout, instances: body.instances }) })
          return
        }
        if (op === 'layout.get') {
          send(res, 200, { ok: true, value: { layout: service.getLayout(), storage: service.getStorage() } })
          return
        }
        if (op === 'layout.set') {
          const layout = normalizeLayout(body.layout)
          if (layout === null) {
            send(res, 400, { ok: false, error: { code: 'bad-layout', message: 'layout must be { order, size, hidden }' } })
            return
          }
          send(res, 200, { ok: true, value: { layout: service.setLayout(layout) } })
          return
        }
        if (op === 'prefs.get') {
          send(res, 200, { ok: true, value: { prefs: service.getPrefs(), storage: service.getStorage() } })
          return
        }
        if (op === 'prefs.set') {
          send(res, 200, { ok: true, value: { prefs: service.setPrefs(normalizePrefs(body.prefs)) } })
          return
        }
        if (op === 'rescan') {
          void service.scan()
          send(res, 200, { ok: true, value: { started: true } })
          return
        }
        send(res, 400, { ok: false, error: { code: 'unknown-op', message: `unknown op: ${String(op)}` } })
      } catch (error) {
        const code = error?.code
        const status = code === 'bad-workbench' || code === 'bad-layout' || code === 'bad-activity-query' ? 400 : code === 'state-read-only' ? 409 : 500
        const safeCode = ['bad-workbench', 'bad-layout', 'bad-activity-query', 'state-read-only', 'state-write-error'].includes(code) ? code : 'internal'
        send(res, status, { ok: false, error: { code: safeCode, message: safeCode === 'internal' ? 'Workbench operation failed' : error.message }, storage: service.getStorage() })
      }
    },
  }), 'dsh-home: api route')
}
