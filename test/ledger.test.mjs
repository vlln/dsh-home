/**
 * 账本口径的门禁：活跃簇、agent 运行时长、跨 0 点分日、快照汇总。
 * 用 `node --test` 跑（零依赖）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSnapshot, dayKey, foldSession, IDLE_GAP_MS } from '../src/ledger.mjs'

/** 本地时间的毫秒值（测试不写死 UTC，避免时区差异）。 */
function at(hour, minute, day = 22) {
  return new Date(2026, 9, day, hour, minute, 0, 0).getTime()
}

const NOW = at(18, 0)

function header(overrides = {}) {
  return { id: 'session-1', version: 4, createdAt: at(9, 0), cwd: '/tmp/project', isSeeded: false, delegationDepth: 0, ...overrides }
}

function event(time, type, data = {}) {
  return { time, type, data }
}

test('相邻事件在 idle 间隔内合成一个簇', () => {
  const session = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(at(10, 1), 'step/start', { turn: 1, step: 1 }),
    event(at(10, 3), 'assistant/message', { turn: 1, step: 1 }),
  ], NOW)
  assert.equal(session.activeMs, 3 * 60_000)
  assert.equal(session.clusters.length, 1)
})

test('超过 idle 间隔切簇，单事件簇不贡献时长', () => {
  const first = at(10, 0)
  const session = foldSession(header(), [
    event(first, 'turn/start', { turn: 1 }),
    event(first + 2 * 60_000, 'step/end', { turn: 1, step: 1 }),
    // 距上一个事件 380s > IDLE_GAP：从这里切新簇。
    event(first + 2 * 60_000 + IDLE_GAP_MS + 80_000, 'turn/start', { turn: 2 }),
    event(first + 2 * 60_000 + IDLE_GAP_MS + 140_000, 'step/start', { turn: 2, step: 1 }),
  ], NOW)
  assert.equal(session.clusters.length, 2)
  assert.equal(session.activeMs, 2 * 60_000 + 60_000)
})

test('agent 运行时长来自 step 边界配对', () => {
  const session = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(at(10, 0), 'step/start', { turn: 1, step: 1 }),
    event(at(10, 0) + 4_000, 'step/end', { turn: 1, step: 1 }),
    event(at(10, 1), 'step/start', { turn: 1, step: 2 }),
    event(at(10, 1) + 6_000, 'step/end', { turn: 1, step: 2 }),
  ], NOW)
  assert.equal(session.runMs, 10_000)
  assert.equal(session.turns, 1)
})

test('没有 turn/step 标识的旧日志按顺序配对，不炸', () => {
  const session = foldSession(header(), [
    event(at(10, 0), 'step/start'),
    event(at(10, 0) + 3_000, 'step/end'),
  ], NOW)
  assert.equal(session.runMs, 3_000)
})

test('跨 0 点的活动簇按本地日切段', () => {
  const session = foldSession(header(), [
    event(at(23, 55), 'turn/start', { turn: 1 }),
    event(at(23, 58), 'assistant/message', { turn: 1, step: 1 }),
    event(at(0, 1, 23), 'assistant/message', { turn: 1, step: 1 }),
  ], NOW)
  assert.equal(session.activeMs, 6 * 60_000)
  const first = session.days[dayKey(at(23, 55))]?.activeMs ?? 0
  const second = session.days[dayKey(at(0, 1, 23))]?.activeMs ?? 0
  assert.equal(first, 5 * 60_000)
  assert.equal(second, 1 * 60_000)
})

test('快照按本地日汇总今天与近 7 天，并排除子代理会话的顶层计数', () => {
  const state = {
    scannedAt: NOW - 1_000,
    sessions: {
      a: foldSession(header({ id: 'a' }), [
        event(at(10, 0), 'turn/start', { turn: 1 }),
        event(at(10, 1), 'turn/end', { turn: 1 }),
      ], NOW),
      child: foldSession(header({ id: 'child', parentSession: 'a', origin: 'subagent' }), [
        event(at(11, 0), 'turn/start', { turn: 1 }),
        event(at(11, 1), 'turn/end', { turn: 1 }),
      ], NOW),
    },
  }
  const snapshot = buildSnapshot(state, { now: NOW, dayCount: 14 })
  assert.equal(snapshot.days.length, 14)
  assert.equal(buildSnapshot(state, { now: NOW }).days.length, 30, 'the default window covers the 30-day activity range')
  assert.equal(snapshot.today.activeMs, 60_000 + 60_000)
  assert.equal(snapshot.today.turns, 2)
  assert.ok(snapshot.week.activeMs >= snapshot.today.activeMs)
  assert.equal(snapshot.sessions.length, 2)
  assert.equal(snapshot.sessions[0]?.id, 'child')
})

test('空会话不会在快照里造出假数据', () => {
  const snapshot = buildSnapshot({ sessions: {} }, { now: NOW })
  assert.equal(snapshot.today.activeMs, 0)
  assert.equal(snapshot.sessions.length, 0)
  assert.equal(snapshot.sessionCount, 0)
})

test('provider usage lands in the day bucket', () => {
  const session = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(at(10, 1), 'step/start', { turn: 1, step: 1 }),
    event(at(10, 2), 'assistant/message', { turn: 1, step: 1, usage: {
      inputTokens: 1200, outputTokens: 300, cacheReadTokens: 5000, cacheWriteTokens: 40,
    } }),
    event(at(10, 3), 'step/end', { turn: 1, step: 1 }),
  ], NOW)
  assert.deepEqual(session.days[dayKey(at(10, 2))].tokens, { input: 1200, output: 300, cacheRead: 5000, cacheWrite: 40 })
})

test('a replaced sample is not counted twice, and a retry adds its replacement', () => {
  const time = at(10, 2)
  const session = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(at(10, 1), 'step/start', { turn: 1, step: 1 }),
    event(time, 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 10 } }),
    event(time + 100, 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: 150, outputTokens: 20 } }),
  ], NOW)
  const tokens = session.days[dayKey(time)].tokens
  assert.deepEqual(tokens, { input: 150, output: 20, cacheRead: 0, cacheWrite: 0 }, 'the later sample replaced the earlier one')

  const retried = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(at(10, 1), 'step/start', { turn: 1, step: 1 }),
    event(time, 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 10 } }),
    event(time + 50, 'llm/retry-started', { turn: 1, step: 1 }),
    event(time + 200, 'assistant/attempt', { turn: 1, step: 1, stream: [
      { type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: 70, outputTokens: 7 } } },
      { type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: 80, outputTokens: 8, cacheReadTokens: 30 } } },
    ] }),
  ], NOW)
  assert.deepEqual(retried.days[dayKey(time)].tokens, { input: 80, output: 8, cacheRead: 30, cacheWrite: 0 }, 'the retried attempt counts on its own')
})

test('missing or hostile usage never poisons the bucket', () => {
  const time = at(10, 2)
  const session = foldSession(header(), [
    event(at(10, 0), 'turn/start', { turn: 1 }),
    event(time, 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: Number.NaN, outputTokens: -5, cacheReadTokens: '900' } }),
    event(time + 10, 'assistant/message', { turn: 1, step: 2 }),
  ], NOW)
  assert.deepEqual(session.days[dayKey(time)].tokens, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
})

test('the snapshot sums tokens for today and the week', () => {
  const sessions = {
    a: foldSession(header({ id: 'a' }), [
      event(at(10, 0), 'turn/start', { turn: 1 }),
      event(at(10, 1), 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 2 } }),
    ], NOW),
    b: foldSession(header({ id: 'b' }), [
      event(at(11, 0), 'turn/start', { turn: 1 }),
      event(at(11, 1), 'assistant/message', { turn: 1, step: 1, usage: { inputTokens: 5, outputTokens: 1, cacheReadTokens: 100 } }),
    ], NOW),
  }
  const snapshot = buildSnapshot({ sessions, scannedAt: NOW }, { now: NOW })
  assert.equal(snapshot.today.tokens.input, 15)
  assert.equal(snapshot.today.tokens.output, 3)
  assert.equal(snapshot.today.tokens.cacheRead, 100)
  assert.equal(snapshot.week.tokens.input, 15)
  assert.equal(snapshot.days[snapshot.days.length - 1].tokens.input, 15)
})
