/**
 * 活动账本：把一条会话的事件日志折成「天 × 指标」与「最近活动簇」。
 *
 * 纯函数，无 I/O——单测直接喂事件（见 test/ledger.test.mjs）。口径：
 * - **activeMs（在场时长）**：把事件时间戳按 `IDLE_GAP_MS` 聚成簇，簇内跨度求和。
 *   它回答「这一段里有人连着动过」，比 createdAt→lastAt 的会话跨度诚实得多。
 * - **runMs（agent 运行时长）**：`step/start` → 匹配的 `step/end` 的墙钟，求和。
 *   客观、可复现；与 activeMs 的差额就是「你在想 / 在等 / 在别处」。
 * - **turns**：`turn/start` 计数。
 * 分日按**宿主本机时区**切（跨 0 点的簇会被切段），前端不再重算——这样浏览器与
 * 宿主异时区时不会出现两套数（README「已知限制」写明了这条取舍）。
 *
 * @module @vlln/dsh-home/ledger
 */

/** 相邻事件超过这个间隔就算「离开过」，切新簇。 */
export const IDLE_GAP_MS = 5 * 60_000

/**
 * 折叠口径版本：改动活跃阈值、配对规则、截断长度等"会影响结果"的逻辑时 +1。
 * 账本里每个会话记着它被折时的版本，版本不一致就重折——否则修了口径之后，
 * revision 没变的旧聚合会永远留着错数。
 */
export const FOLD_VERSION = 4

/** 「回到现场」显示的原文截断长度。 */
const SNIPPET_LENGTH = 160

/** 活动簇保留窗口（只影响下发体积，不影响累计时长）。 */
export const CLUSTER_WINDOW_MS = 45 * 24 * 3600_000

/** 单会话保留的活动簇上限。 */
export const CLUSTER_LIMIT = 400

/** 天桶保留窗口（更早的只计入总计）。 */
export const DAY_WINDOW_MS = 400 * 24 * 3600_000

/** 本地日键 `YYYY-MM-DD`。 */
export function dayKey(time) {
  const d = new Date(time)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** 本地日键加偏移天数（负数往回），用于「最近 N 天」的键序列。 */
export function shiftDayKey(time, deltaDays) {
  const d = new Date(time)
  d.setDate(d.getDate() + deltaDays)
  return dayKey(d.getTime())
}

/** 一天里的 token 桶（与宿主的 `tokenUsage` 投影同一套字段）。 */
export function emptyTokens() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

function emptyDay() {
  return { activeMs: 0, runMs: 0, turns: 0, tokens: emptyTokens() }
}

/** provider 上报的桶值：只接受有限非负数，其余按 0（旧日志或缺字段）。 */
function tokenCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/** 一次 settlement 的用量，字段与宿主 `TokenUsage` 对齐。 */
export function tokensFromUsage(usage) {
  return {
    input: tokenCount(usage?.inputTokens),
    output: tokenCount(usage?.outputTokens),
    cacheRead: tokenCount(usage?.cacheReadTokens),
    cacheWrite: tokenCount(usage?.cacheWriteTokens),
  }
}

function sameTokens(left, right) {
  return left.input === right.input && left.output === right.output
    && left.cacheRead === right.cacheRead && left.cacheWrite === right.cacheWrite
}

function addTokens(days, key, tokens) {
  const day = days[key] ?? (days[key] = emptyDay())
  day.tokens.input += tokens.input
  day.tokens.output += tokens.output
  day.tokens.cacheRead += tokens.cacheRead
  day.tokens.cacheWrite += tokens.cacheWrite
}

function subtractTokens(days, key, tokens) {
  const day = days[key]
  if (day === undefined) return
  day.tokens.input -= tokens.input
  day.tokens.output -= tokens.output
  day.tokens.cacheRead -= tokens.cacheRead
  day.tokens.cacheWrite -= tokens.cacheWrite
}

/**
 * 一次 Assistant settlement 上报的用量，规则与宿主 token-meter 的 `usageOf` 一致：
 * `assistant/message` 看 `data.usage`；`assistant/attempt` 看流里最后一个 usage chunk。
 * @param event 一条逻辑事件
 * @returns usage 对象或 undefined
 */
export function usageOf(event) {
  if (event?.type !== 'assistant/message' && event?.type !== 'assistant/attempt') return undefined
  if (event.type === 'assistant/message' && event.data?.usage !== undefined) return event.data.usage
  if (event.type === 'assistant/attempt' || event.type === 'assistant/message') {
    const stream = event.data?.stream
    if (!Array.isArray(stream)) return undefined
    for (let index = stream.length - 1; index >= 0; index -= 1) {
      const record = stream[index]
      if (record?.type === 'chunk' && record.chunk?.type === 'usage') return record.chunk.usage
    }
  }
  return undefined
}

/**
 * 把 [start, end) 切片计入它跨越的每一天；跨 0 点自动切段（DST 安全，
 * 因为下一个 0 点由本地日历算出）。
 */
function addSpan(days, start, end, field) {
  let cursor = start
  while (cursor < end) {
    const d = new Date(cursor)
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    const sliceEnd = Math.min(end, nextMidnight)
    const key = dayKey(cursor)
    const day = days[key] ?? (days[key] = emptyDay())
    day[field] += sliceEnd - cursor
    cursor = sliceEnd
  }
}

function stepKey(event) {
  const turn = event.data?.turn
  const step = event.data?.step
  return turn === undefined && step === undefined ? undefined : `${turn ?? ''}:${step ?? ''}`
}

/**
 * 折一条会话。
 * @param header 会话头（createdAt/cwd/parentSession/origin/id）
 * @param events 该会话的完整逻辑事件（`ctx.sessionPersistence` 的 read 结果）
 * @param now 计算窗口用的当前时刻（测试注入）
 * @returns 账本里的单会话记录
 */
export function foldSession(header, events, now = Date.now()) {
  const times = []
  const days = {}
  const clusters = []
  const openSteps = new Map()
  let lastUserText
  // UTC-minute buckets preserve browser-zone dates without retaining message text.
  const humanMinutes = {}
  let turns = 0
  let runMs = 0
  let activeMs = 0
  let orphanStep = 0
  /** 最近一次计入的用量；同一个 turn/step 的新样本替换旧样本（与宿主投影同口径）。 */
  let lastSample = null

  for (const event of events) {
    const time = typeof event?.time === 'number' ? event.time : undefined
    if (time === undefined || !Number.isFinite(time) || !Number.isFinite(new Date(time).getTime())) continue
    times.push(time)
    if (event.type === 'user/message') {
      const source = event.data?.source
      const blocks = event.data?.content
      if (source?.kind === 'user' && Array.isArray(blocks)) {
        if (time >= now - DAY_WINDOW_MS && time <= now) {
          const minute = Math.floor(time / 60_000)
          humanMinutes[minute] = (humanMinutes[minute] ?? 0) + 1
        }
        const text = blocks
          .filter(block => block?.type === 'text' && typeof block.text === 'string')
          .map(block => block.text)
          .join('\n')
          .replace(/\s+/g, ' ')
          .trim()
        if (text !== '') lastUserText = text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text
      }
    }
    // 重试会让同一 turn/step 重新上报：先撤销上一次的样本，避免重复计数。
    if (event.type === 'llm/retry-started' && lastSample !== null
      && lastSample.turn === event.data?.turn && lastSample.step === event.data?.step) {
      subtractTokens(days, lastSample.key, lastSample.tokens)
      lastSample = null
    }
    const sample = usageOf(event)
    if (sample !== undefined) {
      const key = dayKey(time)
      const turn = event.data?.turn
      const step = event.data?.step
      const tokens = tokensFromUsage(sample)
      if (lastSample !== null && lastSample.turn === turn && lastSample.step === step) {
        if (!sameTokens(lastSample.tokens, tokens)) {
          subtractTokens(days, lastSample.key, lastSample.tokens)
          addTokens(days, key, tokens)
          lastSample = { turn, step, key, tokens }
        }
      } else {
        addTokens(days, key, tokens)
        lastSample = { turn, step, key, tokens }
      }
    }
    if (event.type === 'turn/start') {
      turns += 1
      const day = days[dayKey(time)] ?? (days[dayKey(time)] = emptyDay())
      day.turns += 1
    } else if (event.type === 'step/start') {
      // 没有 turn/step 标识的旧日志（或合成事件）按出现顺序配对。
      openSteps.set(stepKey(event) ?? `#${orphanStep++}`, time)
    } else if (event.type === 'step/end') {
      const key = stepKey(event) ?? `#${orphanStep - 1}`
      const started = openSteps.get(key)
      if (started !== undefined && time >= started) {
        runMs += time - started
        addSpan(days, started, time, 'runMs')
        openSteps.delete(key)
      }
    }
  }

  times.sort((a, b) => a - b)
  let clusterStart = times[0]
  let previous = times[0]
  const closeCluster = (end) => {
    if (clusterStart === undefined || end === undefined) return
    if (end > clusterStart) {
      activeMs += end - clusterStart
      addSpan(days, clusterStart, end, 'activeMs')
    }
    if (end >= now - CLUSTER_WINDOW_MS) clusters.push([clusterStart, end])
  }
  for (const time of times) {
    if (previous !== undefined && time - previous > IDLE_GAP_MS) {
      closeCluster(previous)
      clusterStart = time
    }
    previous = time
  }
  closeCluster(previous)

  const cutoff = now - DAY_WINDOW_MS
  for (const key of Object.keys(days)) {
    if (Date.parse(`${key}T00:00:00`) < cutoff) delete days[key]
  }

  return {
    id: header.id,
    cwd: header.cwd,
    createdAt: header.createdAt,
    ...(header.parentSession === undefined ? {} : { parentSessionId: header.parentSession }),
    ...(header.origin === undefined ? {} : { origin: header.origin }),
    firstAt: times[0],
    lastAt: times[times.length - 1],
    turns,
    runMs,
    activeMs,
    lastUserText,
    humanMinutes,
    days,
    clusters: clusters.slice(-CLUSTER_LIMIT),
  }
}

/** 一天的汇总（缺失的天返回全 0）。 */
function dayTotals(sessions, key) {
  let activeMs = 0
  let runMs = 0
  let turns = 0
  let count = 0
  const total = emptyTokens()
  for (const session of sessions) {
    const day = session.days?.[key]
    if (day === undefined) continue
    activeMs += day.activeMs
    runMs += day.runMs
    turns += day.turns
    const tokens = day.tokens ?? emptyTokens()
    total.input += tokens.input
    total.output += tokens.output
    total.cacheRead += tokens.cacheRead
    total.cacheWrite += tokens.cacheWrite
    // 「这一天开过工」= 有活动时长或有轮次；两者都为 0 的空壳事件不算。
    if (day.activeMs > 0 || day.turns > 0) count += 1
  }
  return { key, activeMs, runMs, turns, sessions: count, tokens: total }
}

/**
 * 生成下发给浏览器的快照。
 * @param state 持久化状态（sessions 映射）
 * @param options now（测试注入）/ dayCount（天窗长度，默认覆盖 30 天窗口）/ recentLimit（会话条数）
 */
export function buildSnapshot(state, { now = Date.now(), dayCount = 30, recentLimit = 40 } = {}) {
  const sessions = Object.values(state.sessions ?? {})
    .filter(session => typeof session?.lastAt === 'number')
    .sort((left, right) => right.lastAt - left.lastAt)

  const days = []
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    days.push(dayTotals(sessions, shiftDayKey(now, -offset)))
  }
  const today = days[days.length - 1] ?? dayTotals(sessions, dayKey(now))
  const week = days.slice(-7).reduce((total, day) => ({
    activeMs: total.activeMs + day.activeMs,
    runMs: total.runMs + day.runMs,
    turns: total.turns + day.turns,
    sessions: total.sessions + day.sessions,
    tokens: {
      input: total.tokens.input + day.tokens.input,
      output: total.tokens.output + day.tokens.output,
      cacheRead: total.tokens.cacheRead + day.tokens.cacheRead,
      cacheWrite: total.tokens.cacheWrite + day.tokens.cacheWrite,
    },
  }), { activeMs: 0, runMs: 0, turns: 0, sessions: 0, tokens: emptyTokens() })

  const recent = sessions.slice(0, recentLimit).map((session) => ({
    id: session.id,
    lastUserText: session.lastUserText,
    cwd: session.cwd,
    createdAt: session.createdAt,
    parentSessionId: session.parentSessionId,
    origin: session.origin,
    firstAt: session.firstAt,
    lastAt: session.lastAt,
    turns: session.turns,
    runMs: session.runMs,
    activeMs: session.activeMs,
    todayMs: session.days?.[dayKey(now)]?.activeMs ?? 0,
    todayTurns: session.days?.[dayKey(now)]?.turns ?? 0,
    // 时间带只需要最近 36 小时的簇。
    clusters: (session.clusters ?? []).filter(([, end]) => end >= now - 36 * 3600_000),
  }))

  return {
    generatedAt: now,
    scannedAt: state.scannedAt ?? null,
    scanning: state.scanning === true,
    progress: state.progress ?? { done: 0, total: 0 },
    sessionCount: sessions.length,
    days,
    today,
    week,
    sessions: recent,
  }
}
