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
import { buildSnapshot, foldSession, FOLD_VERSION } from './ledger.mjs'
import { loadLedger, loadState, normalizeLayout, normalizePrefs, saveLedger, saveState } from './state.mjs'

/** bundle 条目 id（= cordis.patch.yml 的 insert id）。 */
export const PLUGIN_ID = 'dsh-home'

/** 前端取数路由（与 client/index.tsx 的 API_PATH 同源）。 */
export const API_PATH = '/plugins/dsh-home/api'

/** 路由体上限：只有 op、一份布局或偏好，32 KiB 足够。 */
const BODY_LIMIT = 32 * 1024

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
export function createHomeService(ctx, { log = () => {} } = {}) {
  const state = loadState()
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
  let inflight = null
  let progress = { done: 0, total: 0 }

  const persistState = () => {
    try {
      saveState(state)
    } catch (error) {
      log(`state write failed: ${error?.message ?? error}`)
    }
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
        log(`scan failed: ${error?.message ?? error}`)
      } finally {
        scanning = false
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
    get state() { return state },
    get ledger() { return ledger },
    setLayout(layout) {
      state.layout = layout
      persistState()
      return state.layout
    },
    getLayout() {
      return state.layout
    },
    setPrefs(prefs) {
      state.prefs = prefs
      persistState()
      return state.prefs
    },
    getPrefs() {
      return state.prefs
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
        if (op === 'layout.get') {
          send(res, 200, { ok: true, value: { layout: service.getLayout() } })
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
          send(res, 200, { ok: true, value: { prefs: service.getPrefs() } })
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
        send(res, 500, { ok: false, error: { code: 'internal', message: error?.message ?? String(error) } })
      }
    },
  }), 'dsh-home: api route')
}
