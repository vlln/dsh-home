/**
 * dsh-home 的 Node half：把会话日志折成活动账本，经一条同源围栏路由下发，
 * 并托管首页布局的读写。
 *
 * 数据来源是官方的 `ctx.sessionPersistence`（`list` + `open(...,'read')` +
 * `read(0)`）——不直接读 `sessions/**.jsonl.zstd`：压缩帧、格式迁移（v0→v4）与
 * 撕裂尾部都归官方后端管，插件只消费逻辑事件流。
 *
 * 增量：按 `snapshot.revision` 判断会话是否变化，只重折变化的会话；其余直接复用
 * 上次结果。首次启用会回扫全部既有会话（后台分批，每 5 条落一次盘）。
 *
 * 路由：`POST /plugins/dsh-home/api`，body `{ op }`，统一 `{ok,value}` /
 * `{ok:false,error}` 信封（与 dsh-pr-inbox / better-sidebar 同形）；带 `Origin`
 * 的请求必须同源（CSRF 围栏）。
 *
 * @module @vlln/dsh-home
 */

import { isSameOrigin } from './trust.mjs'
import { buildSnapshot, foldSession } from './ledger.mjs'
import { loadState, normalizeLayout, saveState } from './state.mjs'

/** bundle 条目 id（= cordis.patch.yml 的 insert id）。 */
export const PLUGIN_ID = 'dsh-home'

/** 前端取数路由（与 client/index.tsx 的 API_PATH 同源）。 */
export const API_PATH = '/plugins/dsh-home/api'

/** 路由体上限：只有 op 与一份布局，32 KiB 已经两个数量级余量。 */
const BODY_LIMIT = 32 * 1024

/** 快照触发的重扫阈值：60 秒内刚扫过就不再扫。 */
const SCAN_TTL_MS = 60_000

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
 * @param routeOptions 注入点（测试可替换持久化实现）
 */
export function createHomeService(ctx, { log = () => {} } = {}) {
  const state = loadState()
  /** @type {object | undefined} */
  let persistence
  let scanning = false
  let inflight = null

  const persist = () => {
    try {
      saveState(state)
    } catch (error) {
      log(`state write failed: ${error?.message ?? error}`)
    }
  }

  const scan = async () => {
    if (persistence === undefined) return
    if (inflight !== null) return inflight
    scanning = true
    state.scanning = true
    inflight = (async () => {
      try {
        const snapshots = await persistence.list()
        let processed = 0
        for (const snapshot of snapshots) {
          const id = snapshot.header.id
          const revision = String(snapshot.revision)
          const previous = state.sessions[id]
          if (previous !== undefined && previous.revision === revision) continue
          let handle
          try {
            handle = await persistence.open(id, 'read')
            const { events } = await handle.read(0)
            state.sessions[id] = { ...foldSession(snapshot.header, events), revision }
            processed += 1
          } catch (error) {
            // 单条会话读不动（迁移中/损坏/权限）不该拖垮整次扫描。
            log(`skip session ${id}: ${error?.message ?? error}`)
          } finally {
            if (handle !== undefined) await handle.close().catch(() => {})
          }
          if (processed > 0 && processed % 5 === 0) {
            await new Promise(resolve => setImmediate(resolve))
            persist()
          }
        }
        const live = new Set(snapshots.map(snapshot => snapshot.header.id))
        for (const id of Object.keys(state.sessions)) {
          if (!live.has(id)) delete state.sessions[id]
        }
        state.scannedAt = Date.now()
      } catch (error) {
        log(`scan failed: ${error?.message ?? error}`)
      } finally {
        scanning = false
        state.scanning = false
        inflight = null
        persist()
      }
    })()
    return inflight
  }

  const snapshot = () => {
    const stale = state.scannedAt === null || Date.now() - state.scannedAt > SCAN_TTL_MS
    if (stale && !scanning) void scan()
    return buildSnapshot({ ...state, scanning })
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
    setLayout(layout) {
      state.layout = layout
      persist()
      return state.layout
    },
    getLayout() {
      return state.layout
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
