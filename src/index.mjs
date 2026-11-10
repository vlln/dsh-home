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

import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { isSameOrigin } from './trust.mjs'
import { buildActivity, validateActivityQuery } from './activity.mjs'
import { applyFocusOp, emptyFocus } from './focus.mjs'
import { buildSnapshot, foldSession, FOLD_VERSION } from './ledger.mjs'
import { applyPlannerOp, emptyPlanner } from './planner.mjs'
import { loadFocus, loadLedger, loadPlanner, loadState, normalizeLayout, normalizePrefs, readOnlyState, saveFocus, saveLedger, savePlanner, saveState, stateDir, stateStorage } from './state.mjs'
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
    scanError = false
    let dirty = false
    inflight = (async () => {
      try {
        const snapshots = await persistence.list()
        // 最近创建的会话先折：首屏拿到的就是"最近在干什么"。
        const pending = snapshots
          .filter(snapshot => ledger.sessions[snapshot.header.id]?.revision !== String(snapshot.revision))
          .sort((left, right) => right.header.createdAt - left.header.createdAt)
        progress = { done: 0, total: pending.length }
        // 定时重扫大多没有变化。只有真的要折叠会话时才进入「整理中」，否则每分钟
        // 一次的空扫描会让卡片反复闪出进度文案（真实机器上首扫要几十秒）。
        if (pending.length === 0) {
          ledger.scannedAt = Date.now()
          ledger.foldVersion = FOLD_VERSION
          return
        }
        dirty = true
        scanning = true
        invalidateActivity()
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
          if (!live.has(id)) { delete ledger.sessions[id]; dirty = true }
        }
        ledger.scannedAt = Date.now()
        ledger.foldVersion = FOLD_VERSION
      } catch (error) {
        scanError = true
        // 失败也推进 TTL：否则 store 每 3 秒重试一次，卡片会一直闪「整理中」。
        ledger.scannedAt = Date.now()
        log(`scan failed: ${error?.message ?? error}`)
      } finally {
        scanning = false
        invalidateActivity()
        inflight = null
        // 空扫描（TTL 到期但没有任何会话变化）不再每分钟重写 1.8MB 的账本。
        if (dirty) persistLedger()
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
      // 读一次快照会顺手触发重扫；这次响应报告的是「调用前」是否在扫，
      // 不然每次 TTL 到期的请求都会把自己触发的那次扫描当成正在整理。
      const scanningBefore = scanning
      snapshot() // Reuse the existing bounded scanner and refresh TTL.
      const key = JSON.stringify(query)
      const cached = activityCache.get(key)
      if (cached && Date.now() - cached.at < 30_000) return clone(cached.value)
      const value = buildActivity({ ...ledger, scanning: scanningBefore, progress }, query, { available: persistence !== undefined, scanError })
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

    // 余额：key 留在宿主，浏览器只拿数字。
    scoped.effect(() => register.call(connection.fetch, {
      path: BALANCE_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => Response.json(await readBalance(scoped), { headers: { 'cache-control': 'no-store' } }),
    }), 'dsh-home: connection balance route')

    // 本地图片：`<img>` 只能读同源 URL，所以由宿主把这个路径读成响应体。
    // 只读、只认图片扩展名、限 20 MB，且整条路由在 owner 围栏之后。
    scoped.effect(() => register.call(connection.fetch, {
      path: IMAGE_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => serveImage(request),
    }), 'dsh-home: connection image route')

    // 选中的图片：浏览器给不出文件路径，而整份 widget 配置只有 8 KiB，
    // 也放不下图片字节。所以先落到插件自己的目录，配置里只记一条短路径。
    scoped.effect(() => register.call(connection.fetch, {
      path: PICTURE_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => storePicture(request),
    }), 'dsh-home: connection picture route')
  })
}

/**
 * 把平台返回的余额体解析成浏览器要的四个数。
 * @param body `/user/balance` 的 JSON
 * @returns 可用时带 total/currency，不可用时带 reason
 */
export function parseBalance(body) {
  const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : undefined
  const total = Number(info?.total_balance)
  if (!Number.isFinite(total)) return { available: false, reason: 'bad-response' }
  return {
    available: true,
    currency: typeof info.currency === 'string' ? info.currency : 'CNY',
    total,
    granted: Number.isFinite(Number(info.granted_balance)) ? Number(info.granted_balance) : null,
    toppedUp: Number.isFinite(Number(info.topped_up_balance)) ? Number(info.topped_up_balance) : null,
  }
}

/** 余额路由（`/api` 围栏后）。 */
export const BALANCE_PATH = '/api/dsh-home/balance'

/** 余额缓存：平台接口不该每次渲染都打一次。 */
const BALANCE_TTL_MS = 5 * 60_000
let balanceCache = null

/**
 * 读一次 DeepSeek 平台余额。
 *
 * key 只在宿主侧解析（设置里的 `apiKeyEnv` 引用 → credentials 服务），
 * 解析不到或平台不可达时回一个「不可用」的原因，浏览器不会看到 key。
 * @param ctx 插件上下文
 * @returns `{ available, currency, total, granted, toppedUp }` 或 `{ available: false, reason }`
 */
async function readBalance(ctx) {
  if (balanceCache !== null && Date.now() - balanceCache.at < BALANCE_TTL_MS) return balanceCache.value
  const finish = value => {
    balanceCache = { at: Date.now(), value }
    return value
  }
  try {
    const key = await resolvePlatformKey(ctx)
    if (key === null) return finish({ available: false, reason: 'not-configured' })
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return finish({ available: false, reason: `http-${response.status}` })
    return finish(parseBalance(await response.json()))
  } catch (error) {
    return finish({ available: false, reason: error?.name === 'TimeoutError' ? 'timeout' : 'unreachable' })
  }
}

/**
 * 解析 DeepSeek 平台的 API key：先找设置里声明的 `apiKeyEnv` 引用，再退到环境变量。
 * @param ctx 插件上下文
 * @returns key 或 null
 */
async function resolvePlatformKey(ctx) {
  try {
    const settings = ctx.get('settings')
    const credentials = ctx.get('credentials')
    const rows = typeof settings?.describe === 'function' ? settings.describe() : []
    for (const row of Array.isArray(rows) ? rows : []) {
      const ref = row?.apiKeyEnv
      if (typeof ref !== 'string' || ref === '') continue
      if (typeof credentials?.resolve !== 'function') continue
      const resolved = await credentials.resolve(ref)
      if (typeof resolved?.value === 'string' && resolved.value !== '') return resolved.value
    }
  } catch {
    // 设置或凭据服务不可用：走环境变量兜底。
  }
  const fromEnv = process.env.DEEPSEEK_API_KEY
  return typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : null
}

/** 本地图片路由（`/api` 围栏后）。 */
export const IMAGE_PATH = '/api/dsh-home/image'

/** 允许的图片扩展名与返回类型。 */
const IMAGE_TYPES = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'],
  ['.gif', 'image/gif'], ['.avif', 'image/avif'],
])

/** 单张本地图片的上限。 */
const IMAGE_LIMIT = 20 * 1024 * 1024

/**
 * 把 `path` 查询参数读成图片响应。
 * @param request Fetch 请求
 * @returns 图片字节，或一个说明原因的空响应
 */
async function serveImage(request) {
  const raw = new URL(request.url).searchParams.get('path')
  if (raw === null || raw.trim() === '' || raw.length > 4096) return new Response('bad path', { status: 400 })
  const expanded = raw.startsWith('~/') ? path.join(homedir(), raw.slice(2)) : raw
  if (!path.isAbsolute(expanded)) return new Response('path must be absolute', { status: 400 })
  const type = IMAGE_TYPES.get(path.extname(expanded).toLowerCase())
  if (type === undefined) return new Response('unsupported image type', { status: 415 })
  try {
    const info = await stat(expanded)
    if (!info.isFile()) return new Response('not a file', { status: 404 })
    if (info.size > IMAGE_LIMIT) return new Response('image too large', { status: 413 })
    const bytes = await readFile(expanded)
    return new Response(bytes, {
      status: 200,
      headers: { 'content-type': type, 'cache-control': 'private, max-age=60', 'x-content-type-options': 'nosniff' },
    })
  } catch {
    return new Response('not found', { status: 404 })
  }
}

/** 选图上传路由（`/api` 围栏后）。 */
export const PICTURE_PATH = '/api/dsh-home/picture'

/** 上传图片的上限：手机照片够用，又不至于把内存和磁盘吃满。 */
const PICTURE_LIMIT = 8 * 1024 * 1024

/**
 * 按内容开头的字节判断图片类型，不看客户端给的文件名。
 * @param bytes 文件字节
 * @returns 扩展名与 MIME；不认识就返回 undefined
 */
export function sniffPicture(bytes) {
  const ascii = (start, end = start + 4) => bytes.subarray(start, end).toString('latin1')
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return { ext: '.png', type: 'image/png' }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: '.jpg', type: 'image/jpeg' }
  if (bytes.length >= 6 && (ascii(0) === 'GIF8')) return { ext: '.gif', type: 'image/gif' }
  if (bytes.length >= 12 && ascii(0) === 'RIFF' && ascii(8) === 'WEBP') return { ext: '.webp', type: 'image/webp' }
  if (bytes.length >= 12 && ascii(4) === 'ftyp' && ['avif', 'avis'].includes(ascii(8))) return { ext: '.avif', type: 'image/avif' }
  return undefined
}

/**
 * 把一张选中的图片存进插件数据目录，返回它的绝对路径。
 * @param request Fetch 请求，body 为图片字节
 * @returns `{ ok: true, path }` 或说明原因的空响应
 */
export async function storePicture(request) {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > PICTURE_LIMIT) return new Response('picture too large', { status: 413 })
  const bytes = Buffer.from(await request.arrayBuffer())
  if (bytes.length === 0) return new Response('empty body', { status: 400 })
  if (bytes.length > PICTURE_LIMIT) return new Response('picture too large', { status: 413 })
  const kind = sniffPicture(bytes)
  if (kind === undefined) return new Response('unsupported picture type', { status: 415 })
  // 内容相同就是同一张图：重复选同一张不会在磁盘上堆副本。
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
  const dir = path.join(stateDir(), 'pictures')
  const file = path.join(dir, `${digest}${kind.ext}`)
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(file, bytes, { mode: 0o600 })
  } catch {
    return new Response('cannot store picture', { status: 500 })
  }
  return Response.json({ ok: true, path: file, type: kind.type, bytes: bytes.length }, { headers: { 'cache-control': 'no-store' } })
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
