import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { constants, copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
//#region src/trust.mjs
/**
* 跨站请求围栏：首页路由会读本机会话的统计，不能让任意网页借用户的浏览器打它。
* 规则：**带 `Origin` 的请求必须同源**；没有 `Origin` 的请求（curl、本地脚本）放行。
* 同源判定比较 `Origin.host` 与 `Host`——两者都由浏览器按当前页面/请求生成。
*
* @module @vlln/dsh-home/trust
*/
/**
* @param req node HTTP 请求
* @returns 是否允许继续处理
*/
function isSameOrigin(req) {
	const origin = req.headers.origin;
	if (typeof origin !== "string" || origin === "") return true;
	const host = req.headers.host;
	if (typeof host !== "string" || host === "") return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}
//#endregion
//#region src/activity.mjs
/** Browser-zone activity queries over the existing ledger; no raw-log reads or extra scans. */
const DAY = 864e5;
function validateActivityQuery(raw = {}) {
	const timeZone = raw.timeZone ?? "UTC";
	if (typeof timeZone !== "string" || timeZone.length > 100) throw badQuery();
	try {
		new Intl.DateTimeFormat("en", { timeZone }).format(0);
	} catch {
		throw badQuery();
	}
	const cwd = raw.cwd ?? "";
	if (typeof cwd !== "string" || cwd.length > 4096) throw badQuery();
	const date = raw.date;
	if (date !== void 0) {
		if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badQuery();
		const parsed = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
		if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw badQuery();
	}
	return {
		timeZone,
		cwd,
		date
	};
}
function badQuery() {
	return Object.assign(/* @__PURE__ */ new Error("Invalid activity query"), { code: "bad-activity-query" });
}
function keyFormatter(timeZone) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	});
}
function shift(key, days) {
	const d = /* @__PURE__ */ new Date(`${key}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}
function buildActivity(state, raw = {}, { now = Date.now(), available = true, scanError = false } = {}) {
	const query = validateActivityQuery(raw);
	const formatter = keyFormatter(query.timeZone);
	const minuteDays = /* @__PURE__ */ new Map();
	const keyAt = (time) => {
		const minute = Math.floor(time / 6e4);
		let key = minuteDays.get(minute);
		if (key === void 0) {
			const parts = formatter.formatToParts(time);
			key = [
				"year",
				"month",
				"day"
			].map((type) => parts.find((part) => part.type === type).value).join("-");
			minuteDays.set(minute, key);
		}
		return key;
	};
	const today = keyAt(now);
	const first = shift(today, -364);
	const totals = /* @__PURE__ */ new Map();
	const matches = [];
	const workspaces = /* @__PURE__ */ new Set();
	let failed = 0;
	for (const session of Object.values(state.sessions ?? {})) {
		if (session.failed) {
			failed++;
			continue;
		}
		if (session.parentSessionId !== void 0 || session.origin === "subagent") continue;
		if (session.cwd) workspaces.add(session.cwd);
		if (query.cwd && session.cwd !== query.cwd) continue;
		const perDay = /* @__PURE__ */ new Map();
		for (const [minute, count] of Object.entries(session.humanMinutes ?? {})) {
			const time = Number(minute) * 6e4;
			if (!Number.isFinite(time) || time < now - 367 * DAY || time > now || !Number.isSafeInteger(count) || count <= 0) continue;
			const key = keyAt(time);
			if (key < first || key > today) continue;
			perDay.set(key, (perDay.get(key) ?? 0) + count);
		}
		for (const [key, messages] of perDay) {
			const total = totals.get(key) ?? {
				messages: 0,
				sessions: 0
			};
			total.messages += messages;
			total.sessions++;
			totals.set(key, total);
		}
		const messages = perDay.get(query.date) ?? 0;
		if (messages > 0) matches.push({
			id: session.id,
			cwd: session.cwd,
			messages
		});
	}
	const days = [];
	for (let key = first; key <= today; key = shift(key, 1)) days.push({
		key,
		...totals.get(key) ?? {
			messages: 0,
			sessions: 0
		}
	});
	matches.sort((a, b) => b.messages - a.messages || a.id.localeCompare(b.id));
	const complete = available && !scanError && state.scannedAt != null && !state.scanning && failed === 0;
	return {
		generatedAt: now,
		timeZone: query.timeZone,
		today,
		days,
		workspaces: [...workspaces].sort(),
		complete,
		available,
		failed,
		scanError,
		scanning: state.scanning === true,
		progress: state.progress ?? {
			done: 0,
			total: 0
		},
		sessions: matches.slice(0, 100),
		matchedSessions: matches.length
	};
}
/** 番茄钟默认时长。 */
const DEFAULT_FOCUS_MS = 25 * 6e4;
const DEFAULT_BREAK_MS = 5 * 6e4;
/** 带错误码的计时错误。 */
function focusError(message, code = "bad-focus") {
	return Object.assign(new Error(message), { code });
}
/** 空文档。 */
function emptyFocus() {
	return {
		version: 1,
		revision: 0,
		timers: {},
		pomodoros: {}
	};
}
const isRecord$1 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** 本地日键；与 planner/ledger 同源。 */
function dayKey$2(time) {
	const d = new Date(time);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${month}-${day}`;
}
function duration(value, fallback) {
	return Number.isFinite(value) && value > 0 && value <= 24 * 36e5 ? value : fallback;
}
function strictKeys(raw, keys) {
	for (const key of Object.keys(raw)) if (!keys.includes(key)) throw focusError(`unknown field ${JSON.stringify(key)}`, "bad-focus");
}
function normalizeTimer(raw) {
	if (!isRecord$1(raw)) throw focusError("timer must be an object", "bad-timer");
	strictKeys(raw, [
		"label",
		"startedAt",
		"accumulatedMs",
		"running",
		"targetMs"
	]);
	const label = raw.label === void 0 ? "" : typeof raw.label === "string" ? raw.label.slice(0, 80) : (() => {
		throw focusError("timer label must be a string", "bad-timer");
	})();
	const startedAt = raw.startedAt === void 0 || raw.startedAt === null ? null : typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) && raw.startedAt >= 0 ? raw.startedAt : (() => {
		throw focusError("timer startedAt must be a non-negative timestamp", "bad-timer");
	})();
	const accumulatedMs = raw.accumulatedMs === void 0 ? 0 : typeof raw.accumulatedMs === "number" && Number.isSafeInteger(raw.accumulatedMs) && raw.accumulatedMs >= 0 ? raw.accumulatedMs : (() => {
		throw focusError("timer accumulatedMs must be a non-negative integer", "bad-timer");
	})();
	if (raw.running !== void 0 && typeof raw.running !== "boolean") throw focusError("timer running must be a boolean", "bad-timer");
	const targetMs = raw.targetMs === void 0 ? 0 : typeof raw.targetMs === "number" && Number.isSafeInteger(raw.targetMs) && raw.targetMs >= 0 && raw.targetMs <= 432e5 ? raw.targetMs : (() => {
		throw focusError("timer targetMs must be a non-negative integer", "bad-timer");
	})();
	const running = startedAt !== null && raw.running !== false;
	return {
		label,
		startedAt: running ? startedAt : null,
		accumulatedMs,
		running,
		targetMs
	};
}
function normalizeCompleted(raw) {
	const completed = {};
	if (raw === void 0 || raw === null) return completed;
	if (!isRecord$1(raw)) throw focusError("completed must be an object", "bad-pomodoro");
	for (const [key, value] of Object.entries(raw)) {
		if (!/^\d{4}-\d{2}-\d{2}$/u.test(key) || !Number.isSafeInteger(value) || value < 0) throw focusError("completed must map day keys to counts", "bad-pomodoro");
		completed[key] = value;
	}
	return completed;
}
function normalizePomodoro(raw) {
	if (!isRecord$1(raw)) throw focusError("pomodoro must be an object", "bad-pomodoro");
	strictKeys(raw, [
		"phase",
		"startedAt",
		"elapsedMs",
		"focusMs",
		"breakMs",
		"completed"
	]);
	if (raw.phase !== void 0 && raw.phase !== "focus" && raw.phase !== "break") throw focusError("pomodoro phase is invalid", "bad-pomodoro");
	return {
		phase: raw.phase === "break" ? "break" : "focus",
		startedAt: raw.startedAt === void 0 || raw.startedAt === null ? null : typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) && raw.startedAt >= 0 ? raw.startedAt : (() => {
			throw focusError("pomodoro startedAt must be a non-negative timestamp", "bad-pomodoro");
		})(),
		elapsedMs: raw.elapsedMs === void 0 ? 0 : typeof raw.elapsedMs === "number" && Number.isSafeInteger(raw.elapsedMs) && raw.elapsedMs >= 0 ? raw.elapsedMs : (() => {
			throw focusError("pomodoro elapsedMs must be a non-negative integer", "bad-pomodoro");
		})(),
		focusMs: duration(raw.focusMs, DEFAULT_FOCUS_MS),
		breakMs: duration(raw.breakMs, DEFAULT_BREAK_MS),
		completed: normalizeCompleted(raw.completed)
	};
}
/**
* 校验并规整一份存档。
* @param raw 磁盘上的文档
* @returns 规整后的文档；结构不可信时返回 `null`
*/
function normalizeFocus(raw) {
	try {
		if (!isRecord$1(raw) || raw.version !== 1) return null;
		if (!isRecord$1(raw.timers) || !isRecord$1(raw.pomodoros)) return null;
		const timers = {};
		const pomodoros = {};
		if (Object.keys(raw.timers).length > 64 || Object.keys(raw.pomodoros).length > 64) return null;
		for (const [key, value] of Object.entries(raw.timers)) {
			if (key === "" || key.length > 120) return null;
			timers[key] = normalizeTimer(value);
		}
		for (const [key, value] of Object.entries(raw.pomodoros)) {
			if (key === "" || key.length > 120) return null;
			pomodoros[key] = normalizePomodoro(value);
		}
		return {
			version: 1,
			revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
			timers,
			pomodoros
		};
	} catch {
		return null;
	}
}
/** 计时器已经走了多久（毫秒）。 */
function timerElapsed(timer, now = Date.now()) {
	const base = timer.accumulatedMs + (timer.running && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0);
	return Math.max(0, base);
}
/** 番茄钟当前阶段的快照：还剩多久、到点没有。 */
function pomodoroSnapshot(pomodoro, now = Date.now()) {
	const durationMs = pomodoro.phase === "break" ? pomodoro.breakMs : pomodoro.focusMs;
	const elapsed = pomodoro.elapsedMs + (pomodoro.startedAt !== null ? Math.max(0, now - pomodoro.startedAt) : 0);
	const remainingMs = Math.max(0, durationMs - elapsed);
	return {
		phase: pomodoro.phase,
		durationMs,
		elapsedMs: Math.min(durationMs, elapsed),
		remainingMs,
		due: elapsed >= durationMs
	};
}
/**
* 到点结算：只结算一轮，然后停在下一阶段起点（`startedAt = null`）。
* @param pomodoro 当前状态
* @param now 结算时刻
* @returns `{ pomodoro, settled }`，未到点原样返回
*/
function settlePomodoro(pomodoro, now = Date.now()) {
	if (!pomodoroSnapshot(pomodoro, now).due) return {
		pomodoro,
		settled: false
	};
	const completed = { ...pomodoro.completed };
	if (pomodoro.phase === "focus") completed[dayKey$2(now)] = (completed[dayKey$2(now)] ?? 0) + 1;
	return {
		pomodoro: {
			...pomodoro,
			phase: pomodoro.phase === "focus" ? "break" : "focus",
			elapsedMs: 0,
			startedAt: null,
			completed
		},
		settled: true
	};
}
/** 一次操作的结果：文档 + 是否真的改了。 */
function result$1(doc, changed) {
	return {
		doc: changed ? {
			...doc,
			revision: doc.revision + 1
		} : doc,
		changed
	};
}
function slotId(value) {
	if (typeof value !== "string" || value === "" || value.length > 120) throw focusError("instanceId is required", "bad-slot");
	return value;
}
function needTimer(doc, id) {
	const timer = doc.timers[id];
	if (timer === void 0) throw focusError("no such timer", "missing-timer");
	return timer;
}
function needPomodoro(doc, id) {
	const pomodoro = doc.pomodoros[id];
	if (pomodoro === void 0) throw focusError("no such pomodoro", "missing-pomodoro");
	return pomodoro;
}
/**
* 在文档上应用一条操作。
* @param doc 当前文档（不会被修改）
* @param op `{ op, instanceId, ... }`
* @param options `{ now }`，便于测试注入
* @returns `{ doc, changed }`
*/
function applyFocusOp(doc, op, { now = Date.now() } = {}) {
	if (!isRecord$1(op) || typeof op.op !== "string") throw focusError("op must be an object with an op name", "bad-op");
	const timers = { ...doc.timers };
	const pomodoros = { ...doc.pomodoros };
	const base = {
		...doc,
		timers,
		pomodoros
	};
	switch (op.op) {
		case "timer.start": {
			const id = slotId(op.instanceId);
			const current = timers[id];
			if (Object.keys(timers).length >= 64 && current === void 0) throw focusError(`at most 64 timers`, "too-many-slots");
			if (current !== void 0 && current.running) return result$1(base, false);
			timers[id] = {
				...current ?? {
					label: "",
					startedAt: null,
					accumulatedMs: 0,
					running: false,
					targetMs: 0
				},
				startedAt: now,
				running: true
			};
			return result$1(base, true);
		}
		case "timer.pause": {
			const id = slotId(op.instanceId);
			const current = needTimer(base, id);
			if (!current.running) return result$1(base, false);
			timers[id] = {
				...current,
				accumulatedMs: timerElapsed(current, now),
				startedAt: null,
				running: false
			};
			return result$1(base, true);
		}
		case "timer.reset": {
			const id = slotId(op.instanceId);
			const current = timers[id];
			if (current === void 0) return result$1(base, false);
			timers[id] = {
				...current,
				accumulatedMs: 0,
				startedAt: null,
				running: false
			};
			return result$1(base, true);
		}
		case "timer.target": {
			const id = slotId(op.instanceId);
			if (typeof op.targetMs !== "number" || !Number.isSafeInteger(op.targetMs) || op.targetMs < 0 || op.targetMs > 432e5) throw focusError("targetMs must be a non-negative integer within 12 hours", "bad-target");
			const current = timers[id] ?? {
				label: "",
				startedAt: null,
				accumulatedMs: 0,
				running: false,
				targetMs: 0
			};
			if (current.targetMs === op.targetMs) return result$1(base, false);
			timers[id] = {
				...current,
				targetMs: op.targetMs
			};
			return result$1(base, true);
		}
		case "timer.rename": {
			const id = slotId(op.instanceId);
			const label = typeof op.label === "string" ? op.label.trim().slice(0, 80) : "";
			timers[id] = {
				...timers[id] ?? {
					label: "",
					startedAt: null,
					accumulatedMs: 0,
					running: false,
					targetMs: 0
				},
				label
			};
			return result$1(base, true);
		}
		case "timer.clear": {
			const id = slotId(op.instanceId);
			if (timers[id] === void 0) return result$1(base, false);
			delete timers[id];
			return result$1(base, true);
		}
		case "pomodoro.start": {
			const id = slotId(op.instanceId);
			const current = pomodoros[id] ?? {
				phase: "focus",
				startedAt: null,
				elapsedMs: 0,
				focusMs: 15e5,
				breakMs: 3e5,
				completed: {}
			};
			if (Object.keys(pomodoros).length >= 64 && pomodoros[id] === void 0) throw focusError(`at most 64 pomodoros`, "too-many-slots");
			const settled = settlePomodoro(current, now);
			if (settled.settled) {
				pomodoros[id] = settled.pomodoro;
				return result$1({
					...base,
					pomodoros
				}, true);
			}
			if (current.startedAt !== null) return result$1(base, false);
			pomodoros[id] = {
				...current,
				startedAt: now
			};
			return result$1(base, true);
		}
		case "pomodoro.pause": {
			const id = slotId(op.instanceId);
			const current = needPomodoro(base, id);
			if (current.startedAt === null) return result$1(base, false);
			const settled = settlePomodoro(current, now);
			if (settled.settled) {
				pomodoros[id] = settled.pomodoro;
				return result$1(base, true);
			}
			const snapshot = pomodoroSnapshot(current, now);
			pomodoros[id] = {
				...current,
				elapsedMs: snapshot.elapsedMs,
				startedAt: null
			};
			return result$1(base, true);
		}
		case "pomodoro.settle": {
			const id = slotId(op.instanceId);
			const settled = settlePomodoro(needPomodoro(base, id), now);
			if (!settled.settled) return result$1(base, false);
			pomodoros[id] = settled.pomodoro;
			return result$1(base, true);
		}
		case "pomodoro.skip": {
			const id = slotId(op.instanceId);
			const current = needPomodoro(base, id);
			const settled = settlePomodoro(current, now);
			pomodoros[id] = settled.settled ? settled.pomodoro : {
				...current,
				phase: current.phase === "focus" ? "break" : "focus",
				elapsedMs: 0,
				startedAt: null
			};
			return result$1(base, true);
		}
		case "pomodoro.reset": {
			const id = slotId(op.instanceId);
			const current = pomodoros[id];
			if (current === void 0) return result$1(base, false);
			pomodoros[id] = {
				...current,
				phase: "focus",
				elapsedMs: 0,
				startedAt: null
			};
			return result$1(base, true);
		}
		case "pomodoro.clear": {
			const id = slotId(op.instanceId);
			if (pomodoros[id] === void 0) return result$1(base, false);
			delete pomodoros[id];
			return result$1(base, true);
		}
		case "focus.gc": {
			if (!Array.isArray(op.instanceIds)) throw focusError("instanceIds must be an array", "bad-gc");
			const live = new Set(op.instanceIds.filter((id) => typeof id === "string"));
			let changed = false;
			for (const id of Object.keys(timers)) if (!live.has(id)) {
				delete timers[id];
				changed = true;
			}
			for (const id of Object.keys(pomodoros)) if (!live.has(id)) {
				delete pomodoros[id];
				changed = true;
			}
			return result$1(base, changed);
		}
		default: throw focusError(`unknown focus op ${JSON.stringify(op.op)}`, "unknown-op");
	}
}
/** 「回到现场」显示的原文截断长度。 */
const SNIPPET_LENGTH = 160;
/** 天桶保留窗口（更早的只计入总计）。 */
const DAY_WINDOW_MS = 400 * 24 * 36e5;
/** 本地日键 `YYYY-MM-DD`。 */
function dayKey$1(time) {
	const d = new Date(time);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${month}-${day}`;
}
/** 本地日键加偏移天数（负数往回），用于「最近 N 天」的键序列。 */
function shiftDayKey(time, deltaDays) {
	const d = new Date(time);
	d.setDate(d.getDate() + deltaDays);
	return dayKey$1(d.getTime());
}
/** 一天里的 token 桶（与宿主的 `tokenUsage` 投影同一套字段）。 */
function emptyTokens() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0
	};
}
function emptyDay() {
	return {
		activeMs: 0,
		runMs: 0,
		turns: 0,
		tokens: emptyTokens()
	};
}
/** provider 上报的桶值：只接受有限非负数，其余按 0（旧日志或缺字段）。 */
function tokenCount(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}
/** 一次 settlement 的用量，字段与宿主 `TokenUsage` 对齐。 */
function tokensFromUsage(usage) {
	return {
		input: tokenCount(usage?.inputTokens),
		output: tokenCount(usage?.outputTokens),
		cacheRead: tokenCount(usage?.cacheReadTokens),
		cacheWrite: tokenCount(usage?.cacheWriteTokens)
	};
}
function sameTokens(left, right) {
	return left.input === right.input && left.output === right.output && left.cacheRead === right.cacheRead && left.cacheWrite === right.cacheWrite;
}
function addTokens(days, key, tokens) {
	const day = days[key] ?? (days[key] = emptyDay());
	day.tokens.input += tokens.input;
	day.tokens.output += tokens.output;
	day.tokens.cacheRead += tokens.cacheRead;
	day.tokens.cacheWrite += tokens.cacheWrite;
}
function subtractTokens(days, key, tokens) {
	const day = days[key];
	if (day === void 0) return;
	day.tokens.input -= tokens.input;
	day.tokens.output -= tokens.output;
	day.tokens.cacheRead -= tokens.cacheRead;
	day.tokens.cacheWrite -= tokens.cacheWrite;
}
/**
* 一次 Assistant settlement 上报的用量，规则与宿主 token-meter 的 `usageOf` 一致：
* `assistant/message` 看 `data.usage`；`assistant/attempt` 看流里最后一个 usage chunk。
* @param event 一条逻辑事件
* @returns usage 对象或 undefined
*/
function usageOf(event) {
	if (event?.type !== "assistant/message" && event?.type !== "assistant/attempt") return void 0;
	if (event.type === "assistant/message" && event.data?.usage !== void 0) return event.data.usage;
	if (event.type === "assistant/attempt" || event.type === "assistant/message") {
		const stream = event.data?.stream;
		if (!Array.isArray(stream)) return void 0;
		for (let index = stream.length - 1; index >= 0; index -= 1) {
			const record = stream[index];
			if (record?.type === "chunk" && record.chunk?.type === "usage") return record.chunk.usage;
		}
	}
}
/**
* 把 [start, end) 切片计入它跨越的每一天；跨 0 点自动切段（DST 安全，
* 因为下一个 0 点由本地日历算出）。
*/
function addSpan(days, start, end, field) {
	let cursor = start;
	while (cursor < end) {
		const d = new Date(cursor);
		const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
		const sliceEnd = Math.min(end, nextMidnight);
		const key = dayKey$1(cursor);
		const day = days[key] ?? (days[key] = emptyDay());
		day[field] += sliceEnd - cursor;
		cursor = sliceEnd;
	}
}
function stepKey(event) {
	const turn = event.data?.turn;
	const step = event.data?.step;
	return turn === void 0 && step === void 0 ? void 0 : `${turn ?? ""}:${step ?? ""}`;
}
/**
* 折一条会话。
* @param header 会话头（createdAt/cwd/parentSession/origin/id）
* @param events 该会话的完整逻辑事件（`ctx.sessionPersistence` 的 read 结果）
* @param now 计算窗口用的当前时刻（测试注入）
* @returns 账本里的单会话记录
*/
function foldSession(header, events, now = Date.now()) {
	const times = [];
	const days = {};
	const clusters = [];
	const openSteps = /* @__PURE__ */ new Map();
	let lastUserText;
	const humanMinutes = {};
	let turns = 0;
	let runMs = 0;
	let activeMs = 0;
	let orphanStep = 0;
	/** 最近一次计入的用量；同一个 turn/step 的新样本替换旧样本（与宿主投影同口径）。 */
	let lastSample = null;
	for (const event of events) {
		const time = typeof event?.time === "number" ? event.time : void 0;
		if (time === void 0 || !Number.isFinite(time) || !Number.isFinite(new Date(time).getTime())) continue;
		times.push(time);
		if (event.type === "user/message") {
			const source = event.data?.source;
			const blocks = event.data?.content;
			if (source?.kind === "user" && Array.isArray(blocks)) {
				if (time >= now - 3456e7 && time <= now) {
					const minute = Math.floor(time / 6e4);
					humanMinutes[minute] = (humanMinutes[minute] ?? 0) + 1;
				}
				const text = blocks.filter((block) => block?.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n").replace(/\s+/g, " ").trim();
				if (text !== "") lastUserText = text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
			}
		}
		if (event.type === "llm/retry-started" && lastSample !== null && lastSample.turn === event.data?.turn && lastSample.step === event.data?.step) {
			subtractTokens(days, lastSample.key, lastSample.tokens);
			lastSample = null;
		}
		const sample = usageOf(event);
		if (sample !== void 0) {
			const key = dayKey$1(time);
			const turn = event.data?.turn;
			const step = event.data?.step;
			const tokens = tokensFromUsage(sample);
			if (lastSample !== null && lastSample.turn === turn && lastSample.step === step) {
				if (!sameTokens(lastSample.tokens, tokens)) {
					subtractTokens(days, lastSample.key, lastSample.tokens);
					addTokens(days, key, tokens);
					lastSample = {
						turn,
						step,
						key,
						tokens
					};
				}
			} else {
				addTokens(days, key, tokens);
				lastSample = {
					turn,
					step,
					key,
					tokens
				};
			}
		}
		if (event.type === "turn/start") {
			turns += 1;
			const day = days[dayKey$1(time)] ?? (days[dayKey$1(time)] = emptyDay());
			day.turns += 1;
		} else if (event.type === "step/start") openSteps.set(stepKey(event) ?? `#${orphanStep++}`, time);
		else if (event.type === "step/end") {
			const key = stepKey(event) ?? `#${orphanStep - 1}`;
			const started = openSteps.get(key);
			if (started !== void 0 && time >= started) {
				runMs += time - started;
				addSpan(days, started, time, "runMs");
				openSteps.delete(key);
			}
		}
	}
	times.sort((a, b) => a - b);
	let clusterStart = times[0];
	let previous = times[0];
	const closeCluster = (end) => {
		if (clusterStart === void 0 || end === void 0) return;
		if (end > clusterStart) {
			activeMs += end - clusterStart;
			addSpan(days, clusterStart, end, "activeMs");
		}
		if (end >= now - 3888e6) clusters.push([clusterStart, end]);
	};
	for (const time of times) {
		if (previous !== void 0 && time - previous > 3e5) {
			closeCluster(previous);
			clusterStart = time;
		}
		previous = time;
	}
	closeCluster(previous);
	const cutoff = now - DAY_WINDOW_MS;
	for (const key of Object.keys(days)) if (Date.parse(`${key}T00:00:00`) < cutoff) delete days[key];
	return {
		id: header.id,
		cwd: header.cwd,
		createdAt: header.createdAt,
		...header.parentSession === void 0 ? {} : { parentSessionId: header.parentSession },
		...header.origin === void 0 ? {} : { origin: header.origin },
		firstAt: times[0],
		lastAt: times[times.length - 1],
		turns,
		runMs,
		activeMs,
		lastUserText,
		humanMinutes,
		days,
		clusters: clusters.slice(-400)
	};
}
/** 一天的汇总（缺失的天返回全 0）。 */
function dayTotals(sessions, key) {
	let activeMs = 0;
	let runMs = 0;
	let turns = 0;
	let count = 0;
	const total = emptyTokens();
	for (const session of sessions) {
		const day = session.days?.[key];
		if (day === void 0) continue;
		activeMs += day.activeMs;
		runMs += day.runMs;
		turns += day.turns;
		const tokens = day.tokens ?? emptyTokens();
		total.input += tokens.input;
		total.output += tokens.output;
		total.cacheRead += tokens.cacheRead;
		total.cacheWrite += tokens.cacheWrite;
		if (day.activeMs > 0 || day.turns > 0) count += 1;
	}
	return {
		key,
		activeMs,
		runMs,
		turns,
		sessions: count,
		tokens: total
	};
}
/**
* 生成下发给浏览器的快照。
* @param state 持久化状态（sessions 映射）
* @param options now（测试注入）/ dayCount（天窗长度）/ recentLimit（会话条数）
*/
function buildSnapshot(state, { now = Date.now(), dayCount = 14, recentLimit = 40 } = {}) {
	const sessions = Object.values(state.sessions ?? {}).filter((session) => typeof session?.lastAt === "number").sort((left, right) => right.lastAt - left.lastAt);
	const days = [];
	for (let offset = dayCount - 1; offset >= 0; offset -= 1) days.push(dayTotals(sessions, shiftDayKey(now, -offset)));
	const today = days[days.length - 1] ?? dayTotals(sessions, dayKey$1(now));
	const week = days.slice(-7).reduce((total, day) => ({
		activeMs: total.activeMs + day.activeMs,
		runMs: total.runMs + day.runMs,
		turns: total.turns + day.turns,
		sessions: total.sessions + day.sessions,
		tokens: {
			input: total.tokens.input + day.tokens.input,
			output: total.tokens.output + day.tokens.output,
			cacheRead: total.tokens.cacheRead + day.tokens.cacheRead,
			cacheWrite: total.tokens.cacheWrite + day.tokens.cacheWrite
		}
	}), {
		activeMs: 0,
		runMs: 0,
		turns: 0,
		sessions: 0,
		tokens: emptyTokens()
	});
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
		todayMs: session.days?.[dayKey$1(now)]?.activeMs ?? 0,
		todayTurns: session.days?.[dayKey$1(now)]?.turns ?? 0,
		clusters: (session.clusters ?? []).filter(([, end]) => end >= now - 36 * 36e5)
	}));
	return {
		generatedAt: now,
		scannedAt: state.scannedAt ?? null,
		scanning: state.scanning === true,
		progress: state.progress ?? {
			done: 0,
			total: 0
		},
		sessionCount: sessions.length,
		days,
		today,
		week,
		sessions: recent
	};
}
/** 单条备注字数上限。 */
const MAX_NOTE = 2e3;
/** 条目类别。 */
const ITEM_KINDS = Object.freeze(["task", "event"]);
/** 带错误码的计划数据错误。 */
function plannerError(message, code = "bad-planner") {
	return Object.assign(new Error(message), { code });
}
/** 空文档。 */
function emptyPlanner() {
	return {
		version: 1,
		revision: 0,
		items: [],
		habits: []
	};
}
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** 本地日键 `YYYY-MM-DD`（与账本同源：按宿主本机时区）。 */
function dayKey(time) {
	const d = new Date(time);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${month}-${day}`;
}
/** 合法日键：格式对且是日历上真实存在的一天。 */
function validDay(value) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const at = new Date(year, month - 1, day);
	return at.getFullYear() === year && at.getMonth() === month - 1 && at.getDate() === day;
}
/** 合法时刻 `HH:mm`（24 小时制，不含秒）。 */
function validTime(value) {
	return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value);
}
/** 从 now 往回推 `days` 天的日键，用于打点窗口裁剪。 */
function windowDayKey(now, days = 400) {
	const at = new Date(now);
	at.setDate(at.getDate() - days);
	return dayKey(at.getTime());
}
function titleOf(value) {
	if (typeof value !== "string") throw plannerError("title must be a string", "bad-title");
	const text = value.trim();
	if (text === "") throw plannerError("title cannot be empty", "bad-title");
	if (text.length > 200) throw plannerError(`title exceeds 200 characters`, "bad-title");
	return text;
}
function noteOf(value) {
	if (value === void 0 || value === null) return "";
	if (typeof value !== "string") throw plannerError("note must be a string", "bad-note");
	if (value.length > 2e3) throw plannerError(`note exceeds ${MAX_NOTE} characters`, "bad-note");
	return value;
}
function priorityOf(value) {
	if (value === void 0 || value === null) return 0;
	if (value !== 0 && value !== 1 && value !== 2) throw plannerError("priority must be 0, 1 or 2", "bad-priority");
	return value;
}
function dayOf(value) {
	if (value === void 0 || value === null) return null;
	if (!validDay(value)) throw plannerError("day must be YYYY-MM-DD", "bad-day");
	return value;
}
function timeOf(value, field) {
	if (value === void 0 || value === null) return null;
	if (!validTime(value)) throw plannerError(`${field} must be HH:mm`, "bad-time");
	return value;
}
/** 条目字段集合：这是 update 的白名单，也是序列化的唯一来源。 */
const ITEM_FIELDS = Object.freeze([
	"kind",
	"title",
	"day",
	"start",
	"end",
	"priority",
	"note"
]);
/**
* 规范化一条条目（不含 id 与时间戳）。
* @param raw 客户端提交的条目
* @returns 规整后的条目字段
*/
function normalizeItemFields(raw) {
	if (!isRecord(raw)) throw plannerError("item must be an object", "bad-item");
	for (const key of Object.keys(raw)) if (!ITEM_FIELDS.includes(key)) throw plannerError(`unknown item field ${JSON.stringify(key)}`, "bad-item");
	const kind = raw.kind ?? "task";
	if (!ITEM_KINDS.includes(kind)) throw plannerError("kind must be task or event", "bad-kind");
	const title = titleOf(raw.title);
	const day = dayOf(raw.day);
	const start = timeOf(raw.start, "start");
	const end = timeOf(raw.end, "end");
	const priority = priorityOf(raw.priority);
	const note = noteOf(raw.note);
	if (start !== null && day === null) throw plannerError("start requires a day", "bad-time");
	if (end !== null && start === null) throw plannerError("end requires a start", "bad-time");
	if (start !== null && end !== null && end <= start) throw plannerError("end must be after start", "bad-time");
	if (kind === "event" && day === null) throw plannerError("an event requires a day", "bad-day");
	return {
		kind,
		title,
		day,
		start,
		end,
		priority,
		note
	};
}
/** 规范化一条习惯（不含 id 与时间戳）。 */
function normalizeHabitFields(raw) {
	if (!isRecord(raw)) throw plannerError("habit must be an object", "bad-habit");
	for (const key of Object.keys(raw)) if (key !== "title" && key !== "weekdays") throw plannerError(`unknown habit field ${JSON.stringify(key)}`, "bad-habit");
	return {
		title: titleOf(raw.title),
		weekdays: normalizeWeekdays(raw.weekdays)
	};
}
/** 周几：null（每天）或 1..7 的升序去重数组。 */
function normalizeWeekdays(value) {
	if (value === void 0 || value === null) return null;
	if (!Array.isArray(value) || value.length === 0 || value.length > 7) throw plannerError("weekdays must list 1..7", "bad-weekdays");
	const unique = [...new Set(value)];
	for (const day of unique) if (!Number.isInteger(day) || day < 1 || day > 7) throw plannerError("weekdays must list 1..7", "bad-weekdays");
	return unique.sort((left, right) => left - right);
}
/** 打点表：键是日键，值恒为 true；非布尔值视为损坏。 */
function normalizeMarks(raw) {
	const marks = {};
	if (raw === void 0 || raw === null) return marks;
	if (!isRecord(raw)) throw plannerError("marks must be an object", "bad-marks");
	for (const [key, value] of Object.entries(raw)) {
		if (!validDay(key) || value !== true) throw plannerError("marks must map day keys to true", "bad-marks");
		marks[key] = true;
	}
	return marks;
}
function normalizeStoredItem(raw) {
	if (!isRecord(raw)) throw plannerError("stored item must be an object", "bad-item");
	const fields = normalizeItemFields({
		kind: raw.kind,
		title: raw.title,
		day: raw.day,
		start: raw.start,
		end: raw.end,
		priority: raw.priority,
		note: raw.note
	});
	if (typeof raw.id !== "string" || raw.id === "") throw plannerError("item id is missing", "bad-item");
	const done = raw.done === true;
	return {
		id: raw.id,
		...fields,
		done,
		doneAt: done && typeof raw.doneAt === "number" ? raw.doneAt : null,
		createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
		updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0
	};
}
function normalizeStoredHabit(raw) {
	if (!isRecord(raw)) throw plannerError("stored habit must be an object", "bad-habit");
	const fields = normalizeHabitFields({
		title: raw.title,
		weekdays: raw.weekdays
	});
	if (typeof raw.id !== "string" || raw.id === "") throw plannerError("habit id is missing", "bad-habit");
	return {
		id: raw.id,
		...fields,
		marks: normalizeMarks(raw.marks),
		createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0
	};
}
/**
* 校验并规整一份存档。
* @param raw 磁盘上的文档
* @returns 规整后的文档；结构不可信时返回 `null`（调用方保留原文件并显示错误）
*/
function normalizePlanner(raw) {
	try {
		if (!isRecord(raw) || raw.version !== 1) return null;
		if (!Array.isArray(raw.items) || !Array.isArray(raw.habits)) return null;
		if (raw.items.length > 500 || raw.habits.length > 30) return null;
		const items = raw.items.map(normalizeStoredItem);
		const habits = raw.habits.map(normalizeStoredHabit);
		const ids = /* @__PURE__ */ new Set();
		for (const entry of [...items, ...habits]) {
			if (ids.has(entry.id)) return null;
			ids.add(entry.id);
		}
		return {
			version: 1,
			revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
			items,
			habits
		};
	} catch {
		return null;
	}
}
/** 文档字节数（与落盘一致，含换行）。 */
function plannerBytes(doc) {
	return Buffer.byteLength(JSON.stringify(doc)) + 1;
}
function assertCapacity(doc) {
	if (plannerBytes(doc) > 524288) throw plannerError("planner document exceeds 512 KiB", "planner-too-large");
}
function newId(prefix, makeId) {
	return `${prefix}_${makeId()}`;
}
/** 默认 id 生成器：调用方（宿主）可以替换，测试里用确定序列。 */
function defaultIdMaker() {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function findIndex(list, id, code) {
	const index = list.findIndex((entry) => entry.id === id);
	if (index < 0) throw plannerError(`no such entry ${JSON.stringify(id)}`, code);
	return index;
}
function pruneMarks(habit, now) {
	const floor = windowDayKey(now);
	let changed = false;
	for (const key of Object.keys(habit.marks)) if (key < floor) {
		delete habit.marks[key];
		changed = true;
	}
	return changed;
}
/** 一次操作的结果：文档 + 是否真的改了。 */
function result(doc, changed) {
	return {
		doc: changed ? {
			...doc,
			revision: doc.revision + 1
		} : doc,
		changed
	};
}
/**
* 在文档上应用一条操作。
* @param doc 当前文档（不会被修改）
* @param op `{ op, ... }`，见 README 的「计划数据」一节
* @param options `{ now, makeId }`，便于测试注入
* @returns `{ doc, changed }`；非法操作抛带 code 的错误
*/
function applyPlannerOp(doc, op, { now = Date.now(), makeId = defaultIdMaker } = {}) {
	if (!isRecord(op) || typeof op.op !== "string") throw plannerError("op must be an object with an op name", "bad-op");
	const items = doc.items.map((item) => ({ ...item }));
	const habits = doc.habits.map((habit) => ({
		...habit,
		marks: { ...habit.marks }
	}));
	const base = {
		...doc,
		items,
		habits
	};
	switch (op.op) {
		case "item.create": {
			if (items.length >= 500) throw plannerError(`at most 500 items`, "too-many-items");
			const fields = normalizeItemFields(op.item ?? {});
			const item = {
				id: newId("it", makeId),
				...fields,
				done: false,
				doneAt: null,
				createdAt: now,
				updatedAt: now
			};
			if (items.some((entry) => entry.id === item.id)) throw plannerError("generated item id collides", "bad-id");
			items.push(item);
			const next = {
				...base,
				items
			};
			assertCapacity(next);
			return result(next, true);
		}
		case "item.update": {
			const index = findIndex(items, op.id, "missing-item");
			const current = items[index];
			if (!isRecord(op.patch)) throw plannerError("patch must be an object", "bad-item");
			for (const key of Object.keys(op.patch)) if (!ITEM_FIELDS.includes(key)) throw plannerError(`unknown item field ${JSON.stringify(key)}`, "bad-item");
			const merged = {
				...current,
				...op.patch
			};
			const fields = normalizeItemFields({
				kind: merged.kind,
				title: merged.title,
				day: merged.day,
				start: merged.start,
				end: merged.end,
				priority: merged.priority,
				note: merged.note
			});
			items[index] = {
				...current,
				...fields,
				updatedAt: now
			};
			const next = {
				...base,
				items
			};
			assertCapacity(next);
			return result(next, true);
		}
		case "item.delete": {
			const index = items.findIndex((entry) => entry.id === op.id);
			if (index < 0) return result(base, false);
			items.splice(index, 1);
			return result(base, true);
		}
		case "item.toggle": {
			const index = findIndex(items, op.id, "missing-item");
			const current = items[index];
			const done = typeof op.done === "boolean" ? op.done : current.done !== true;
			items[index] = {
				...current,
				done,
				doneAt: done ? now : null,
				updatedAt: now
			};
			return result(base, true);
		}
		case "habit.create": {
			if (habits.length >= 30) throw plannerError(`at most 30 habits`, "too-many-habits");
			const fields = normalizeHabitFields(op.habit ?? {});
			const habit = {
				id: newId("hb", makeId),
				...fields,
				marks: {},
				createdAt: now
			};
			if (habits.some((entry) => entry.id === habit.id)) throw plannerError("generated habit id collides", "bad-id");
			habits.push(habit);
			const next = {
				...base,
				habits
			};
			assertCapacity(next);
			return result(next, true);
		}
		case "habit.update": {
			const index = findIndex(habits, op.id, "missing-habit");
			const current = habits[index];
			if (!isRecord(op.patch)) throw plannerError("patch must be an object", "bad-habit");
			for (const key of Object.keys(op.patch)) if (key !== "title" && key !== "weekdays") throw plannerError(`unknown habit field ${JSON.stringify(key)}`, "bad-habit");
			const fields = normalizeHabitFields({
				title: op.patch.title ?? current.title,
				weekdays: op.patch.weekdays ?? current.weekdays
			});
			habits[index] = {
				...current,
				...fields
			};
			return result(base, true);
		}
		case "habit.delete": {
			const index = habits.findIndex((entry) => entry.id === op.id);
			if (index < 0) return result(base, false);
			habits.splice(index, 1);
			return result(base, true);
		}
		case "habit.mark": {
			const habit = habits[findIndex(habits, op.id, "missing-habit")];
			if (!validDay(op.day)) throw plannerError("day must be YYYY-MM-DD", "bad-day");
			if (op.on !== false) habit.marks[op.day] = true;
			else delete habit.marks[op.day];
			pruneMarks(habit, now);
			const next = {
				...base,
				habits
			};
			assertCapacity(next);
			return result(next, true);
		}
		default: throw plannerError(`unknown planner op ${JSON.stringify(op.op)}`, "unknown-op");
	}
}
//#endregion
//#region src/widget-state.mjs
/** Durable widget identities. Registry availability never determines stored instances. */
const BUILTIN_WIDGET_IDS = Object.freeze([
	"recent",
	"today",
	"running",
	"areas",
	"rhythm",
	"quick"
]);
/**
* 已下线类型 → 替代类型（`null` 表示没有替代）。
*
* 这些实例还留在旧 state.json 里：`running` 改为「会话状态」后，「在等我」只是它的一个视图，
* 所以队列实例并入 running；任务起点与「回到现场」整块删除，实例与布局一起清掉。
* `@vlln/dsh-home:running` 本身不在表里——它只是换了标题和内容。
*/
const RETIRED_WIDGET_TYPES = Object.freeze({
	"@vlln/dsh-home:tasks": null,
	"@vlln/dsh-home:resume": null,
	"@vlln/dsh-home:queue": "@vlln/dsh-home:running"
});
/**
* 把已下线类型的实例就地迁移/删除，并同步清掉布局里对它们的引用。
* 纯函数：返回新对象，未命中任何下线类型时原样返回（`changed: false`）。
* @param {{instances: object[], layout: object|null}} workbench
*/
function retireWidgetTypes(workbench) {
	const runningId = "@vlln/dsh-home:running";
	let runningExists = workbench.instances.some((instance) => instance.typeId === runningId);
	let renamed = false;
	const dropped = /* @__PURE__ */ new Set();
	const instances = [];
	for (const instance of workbench.instances) {
		if (!Object.hasOwn(RETIRED_WIDGET_TYPES, instance.typeId)) {
			instances.push(instance);
			continue;
		}
		const replacement = RETIRED_WIDGET_TYPES[instance.typeId];
		if (replacement !== null && !runningExists) {
			runningExists = true;
			renamed = true;
			instances.push({
				...instance,
				typeId: replacement,
				configVersion: 1,
				config: {}
			});
			continue;
		}
		dropped.add(instance.instanceId);
	}
	if (!renamed && dropped.size === 0) return {
		changed: false,
		workbench
	};
	return {
		changed: true,
		workbench: {
			...workbench,
			instances,
			layout: pruneLayout(workbench.layout, dropped)
		}
	};
}
function pruneLayout(layout, dropped) {
	if (layout === null || dropped.size === 0) return layout;
	const next = { ...layout };
	for (const key of [
		"order",
		"focusOrder",
		"hidden"
	]) if (Array.isArray(next[key])) next[key] = next[key].filter((id) => !dropped.has(id));
	if (next.size !== void 0) next.size = Object.fromEntries(Object.entries(next.size).filter(([id]) => !dropped.has(id)));
	if (next.positions !== void 0) next.positions = Object.fromEntries(Object.entries(next.positions).map(([columns, rows]) => [columns, Object.fromEntries(Object.entries(rows).filter(([id]) => !dropped.has(id)))]));
	return next;
}
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** Durable breakpoints span the whole fixed-stride canvas: 1..32 canonical integers.
* Columns below 12 are legacy but kept readable, never migrated or deleted. */
const validBreakpoint = (value) => typeof value === "string" && /^(?:[1-9]|[12]\d|3[0-2])$/u.test(value);
const validInstanceId = (value) => typeof value === "string" && value.length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/u.test(value);
function widgetStateError(message, code = "bad-workbench") {
	return Object.assign(new Error(message), { code });
}
/** Strict JSON, including callers that bypass the HTTP JSON decoder. */
function assertJson(value, depth = 0, ancestors = /* @__PURE__ */ new Set(), budget = { nodes: 0 }) {
	if (++budget.nodes > 4096 || depth > 8) throw widgetStateError("config exceeds JSON complexity limits");
	if (value === null || typeof value === "boolean" || typeof value === "string") return;
	if (typeof value === "number" && Number.isFinite(value)) return;
	if (typeof value !== "object" || ancestors.has(value)) throw widgetStateError("config must contain finite JSON values only");
	if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw widgetStateError("config must contain plain JSON objects only");
	if (Object.getOwnPropertySymbols(value).length) throw widgetStateError("config cannot contain symbol keys");
	ancestors.add(value);
	for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (!Object.hasOwn(descriptor, "value")) throw widgetStateError("config cannot contain accessors");
	if (Array.isArray(value)) {
		if (Object.keys(value).length !== value.length) throw widgetStateError("config arrays must be dense JSON arrays");
		for (const item of value) assertJson(item, depth + 1, ancestors, budget);
	} else for (const [key, item] of Object.entries(value)) {
		if (key.length > 256 || [
			"__proto__",
			"constructor",
			"prototype"
		].includes(key)) throw widgetStateError("config key is invalid");
		assertJson(item, depth + 1, ancestors, budget);
	}
	ancestors.delete(value);
}
function validateInstances(raw) {
	if (!Array.isArray(raw) || raw.length > 64) throw widgetStateError("instances must be an array of at most 64 items");
	if (Object.keys(raw).length !== raw.length) throw widgetStateError("instances must be a dense array");
	const seen = /* @__PURE__ */ new Set();
	return raw.map((instance) => {
		if (!record(instance) || Object.keys(instance).sort().join(",") !== "config,configVersion,instanceId,typeId") throw widgetStateError("instance fields must be instanceId, typeId, configVersion, config");
		const { instanceId, typeId, configVersion, config } = instance;
		if (!validInstanceId(instanceId) || seen.has(instanceId)) throw widgetStateError("invalid or duplicate instanceId");
		if (typeof typeId !== "string" || typeId.length > 256 || !/^[^\s:]+:[^\s]+$/u.test(typeId)) throw widgetStateError("invalid typeId");
		if (!Number.isSafeInteger(configVersion) || configVersion < 1 || configVersion > 1e6) throw widgetStateError("invalid configVersion");
		assertJson(config);
		const json = JSON.stringify(config);
		if (Buffer.byteLength(json) > 8192) throw widgetStateError("config exceeds 8 KiB");
		seen.add(instanceId);
		return {
			instanceId,
			typeId,
			configVersion,
			config: JSON.parse(json)
		};
	});
}
/** Union includes hidden, size-only and every breakpoint's absent/uninstalled IDs. */
function layoutInstanceIds(layout) {
	if (!layout) return [];
	return [.../* @__PURE__ */ new Set([
		...layout.order ?? [],
		...layout.focusOrder ?? [],
		...layout.hidden ?? [],
		...Object.keys(layout.size ?? {}),
		...Object.values(layout.positions ?? {}).flatMap((rows) => Object.keys(rows))
	])];
}
function initialInstances(layout = null) {
	return validateInstances([.../* @__PURE__ */ new Set([...BUILTIN_WIDGET_IDS, ...layoutInstanceIds(layout)])].map((instanceId) => ({
		instanceId,
		typeId: BUILTIN_WIDGET_IDS.includes(instanceId) ? `@vlln/dsh-home:${instanceId}` : `legacy:${instanceId}`,
		configVersion: 1,
		config: {}
	})));
}
/** New workbench writes are strict; the exported legacy normalizer stays permissive. */
function validateWorkbenchLayout(raw, normalizeLayout) {
	if (raw === null) return null;
	if (!record(raw)) throw widgetStateError("layout must be an object or null");
	const keys = /* @__PURE__ */ new Set([
		"order",
		"focusOrder",
		"hidden",
		"size",
		"positions",
		"instanceLayout"
	]);
	if (Object.keys(raw).some((key) => !keys.has(key))) throw widgetStateError("unknown layout field");
	if (raw.instanceLayout !== void 0 && typeof raw.instanceLayout !== "boolean") throw widgetStateError("invalid instanceLayout flag");
	for (const key of [
		"order",
		"focusOrder",
		"hidden"
	]) {
		if (raw[key] === void 0) continue;
		if (!Array.isArray(raw[key]) || raw[key].length > 64 || raw[key].some((id) => !validInstanceId(id)) || new Set(raw[key]).size !== raw[key].length) throw widgetStateError(`invalid layout ${key}`);
	}
	if (raw.size !== void 0 && (!record(raw.size) || Object.keys(raw.size).length > 64 || Object.entries(raw.size).some(([id, size]) => !validInstanceId(id) || ![
		"s",
		"m",
		"l"
	].includes(size)))) throw widgetStateError("invalid layout size");
	if (raw.positions !== void 0) {
		if (!record(raw.positions)) throw widgetStateError("invalid layout positions");
		for (const [columns, rows] of Object.entries(raw.positions)) {
			if (!validBreakpoint(columns) || !record(rows) || Object.keys(rows).length > 64) throw widgetStateError("invalid layout breakpoint");
			for (const [id, rect] of Object.entries(rows)) {
				if (!validInstanceId(id) || !record(rect) || Object.keys(rect).sort().join(",") !== "h,w,x,y") throw widgetStateError("invalid layout rectangle");
				const { x, y, w, h } = rect;
				if (![
					x,
					y,
					w,
					h
				].every(Number.isInteger) || x < 0 || y < 0 || y > 1e4 || w < 1 || x + w > Number(columns) || h < 3 || h > 30) throw widgetStateError("invalid layout geometry");
			}
		}
	}
	return normalizeLayout(raw);
}
function validateWorkbench(raw, normalizeLayout) {
	if (!record(raw)) throw widgetStateError("workbench must be an object");
	const layout = validateWorkbenchLayout(raw.layout, normalizeLayout);
	const instances = validateInstances(raw.instances);
	const ids = new Set(instances.map((instance) => instance.instanceId));
	if (layoutInstanceIds(layout).some((id) => !ids.has(id))) throw widgetStateError("layout references an unknown instanceId");
	const result = {
		layout,
		instances
	};
	if (Buffer.byteLength(JSON.stringify(result)) > 262144) throw widgetStateError("workbench exceeds 256 KiB");
	return result;
}
/** Bounds for the one user-chosen board width; must match client canvas-width.ts.
* 12 columns (1140px) .. 32 columns (3060px); a hand-edited file is clamped here. */
const CANVAS_MIN_WIDTH = 1140;
const CANVAS_MAX_WIDTH = 3060;
const storageMetadata = /* @__PURE__ */ new WeakMap();
function stateStorage(state) {
	return storageMetadata.get(state) ?? {
		writable: true,
		status: "ready",
		error: null
	};
}
function withStorage(state, storage) {
	storageMetadata.set(state, storage);
	return state;
}
function readOnlyState(error) {
	return withStorage(emptyState(), {
		writable: false,
		status: "read-only",
		error: {
			code: error?.code ?? "state-read-error",
			message: error?.message ?? "Cannot read saved workbench"
		}
	});
}
/** 控件尺寸档（与前端 CSS 的 `data-size` 同源）。 */
const WIDGET_SIZES = [
	"s",
	"m",
	"l"
];
/** 布局里允许的最大条目数（防脏数据把页面撑爆）。 */
const MAX_ENTRIES = 64;
/** 单个 widget id 的长度上限。 */
const MAX_ID_LENGTH = 120;
/** 宿主 home 目录：DSH_HOME 优先，缺省 `~/.dsh`。 */
function dshHome() {
	const configured = process.env.DSH_HOME;
	return configured === void 0 || configured === "" ? path.join(homedir(), ".dsh") : configured;
}
/** 本插件的数据目录。 */
function stateDir() {
	return path.join(dshHome(), "data", "dsh-home");
}
/** 偏好/布局文档路径。 */
function stateFile() {
	return path.join(stateDir(), "state.json");
}
/** 账本文档路径。 */
function ledgerFile() {
	return path.join(stateDir(), "ledger.json");
}
function readJson(file) {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return;
	}
}
function writeJson(file, value) {
	mkdirSync(stateDir(), { recursive: true });
	const temporary = `${file}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(value)}\n`, { mode: 384 });
	renameSync(temporary, file);
}
/** 空偏好。 */
function emptyPrefs() {
	return {
		lastSeenAt: null,
		dismissed: {},
		canvasWidth: null,
		libraryPosition: null
	};
}
/** 空状态文档。 */
function emptyState() {
	return {
		version: 3,
		layout: null,
		instances: initialInstances(),
		prefs: emptyPrefs()
	};
}
/** Read failures become a visible read-only diagnostic, never a writable reset. */
function loadState() {
	let text;
	try {
		text = readFileSync(stateFile(), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return emptyState();
		return readOnlyState(widgetStateError("Cannot read saved workbench", "state-read-error"));
	}
	try {
		if (Buffer.byteLength(text) > 512 * 1024) throw widgetStateError("Saved workbench exceeds document limit", "state-corrupt");
		const parsed = JSON.parse(text);
		if (parsed?.version !== 2 && parsed?.version !== 3) throw widgetStateError("Saved workbench version is unsupported; original file retained", "state-version");
		if (!parsed.prefs || typeof parsed.prefs !== "object" || Array.isArray(parsed.prefs)) throw widgetStateError("Saved preferences are corrupt", "state-corrupt");
		const normalizedPrefs = normalizePrefs(parsed.prefs);
		if (Object.hasOwn(parsed.prefs, "lastSeenAt") && parsed.prefs.lastSeenAt !== normalizedPrefs.lastSeenAt) throw widgetStateError("Saved preferences are corrupt", "state-corrupt");
		if (Object.hasOwn(parsed.prefs, "dismissed") && JSON.stringify(parsed.prefs.dismissed) !== JSON.stringify(normalizedPrefs.dismissed)) throw widgetStateError("Saved preferences are corrupt", "state-corrupt");
		const layout = validateWorkbenchLayout(parsed.layout, normalizeLayout);
		const retired = retireWidgetTypes(parsed.version === 2 ? {
			layout: parsed.layout,
			instances: initialInstances(layout)
		} : {
			layout: parsed.layout,
			instances: validateWorkbench({
				layout,
				instances: parsed.instances
			}, normalizeLayout).instances
		});
		return withStorage({
			...parsed,
			...retired.workbench,
			version: 3
		}, {
			writable: true,
			status: parsed.version === 2 || retired.changed ? "migrated" : "ready",
			error: null
		});
	} catch (error) {
		return readOnlyState(widgetStateError(error.code === "state-version" ? error.message : "Saved workbench is corrupt or cannot migrate safely; original file retained", error.code === "state-version" ? "state-version" : "state-corrupt"));
	}
}
/** Atomic commit. Recheck disk to protect future/corrupt files introduced since load. */
function saveState(state) {
	if (!stateStorage(state).writable) throw widgetStateError("Saved workbench is read-only", "state-read-only");
	const current = loadState();
	if (!stateStorage(current).writable) throw widgetStateError("Saved workbench is read-only; original file retained", "state-read-only");
	const validated = validateWorkbench(state, normalizeLayout);
	const next = {
		...state,
		version: 3,
		instances: validated.instances
	};
	if (Buffer.byteLength(JSON.stringify(next)) + 1 > 512 * 1024) throw widgetStateError("Saved document exceeds 512 KiB", "state-write-error");
	if (stateStorage(current).status === "migrated") try {
		copyFileSync(stateFile(), `${stateFile()}.v2.bak`, constants.COPYFILE_EXCL);
	} catch (error) {
		if (error.code !== "EEXIST") throw error;
	}
	writeJson(stateFile(), next);
}
/** 计划文档路径（待办 / 日程 / 习惯）。 */
function plannerFile() {
	return path.join(stateDir(), "planner.json");
}
/** 计时文档路径（计时器 / 番茄钟）。 */
function focusFile() {
	return path.join(stateDir(), "focus.json");
}
/**
* 读计划文档。
* @returns `{ doc, error }`；文件不存在时给空文档，损坏时 `doc` 为 null 且保留原文件
*/
function loadPlanner() {
	let text;
	try {
		text = readFileSync(plannerFile(), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return {
			doc: emptyPlanner(),
			error: null
		};
		return {
			doc: null,
			error: "planner-unreadable"
		};
	}
	try {
		if (Buffer.byteLength(text) > 524288) return {
			doc: null,
			error: "planner-too-large"
		};
		const doc = normalizePlanner(JSON.parse(text));
		return doc === null ? {
			doc: null,
			error: "planner-corrupt"
		} : {
			doc,
			error: null
		};
	} catch {
		return {
			doc: null,
			error: "planner-corrupt"
		};
	}
}
/** 原子写计划文档。 */
function savePlanner(doc) {
	writeJson(plannerFile(), doc);
}
/**
* 读计时文档。
* @returns `{ doc, error }`；文件不存在时给空文档，损坏时 `doc` 为 null 且保留原文件
*/
function loadFocus() {
	let text;
	try {
		text = readFileSync(focusFile(), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return {
			doc: emptyFocus(),
			error: null
		};
		return {
			doc: null,
			error: "focus-unreadable"
		};
	}
	try {
		if (Buffer.byteLength(text) > 512 * 1024) return {
			doc: null,
			error: "focus-too-large"
		};
		const doc = normalizeFocus(JSON.parse(text));
		return doc === null ? {
			doc: null,
			error: "focus-corrupt"
		} : {
			doc,
			error: null
		};
	} catch {
		return {
			doc: null,
			error: "focus-corrupt"
		};
	}
}
/** 原子写计时文档。 */
function saveFocus(doc) {
	writeJson(focusFile(), doc);
}
/** 空账本。 */
function emptyLedger() {
	return {
		version: 1,
		foldVersion: 0,
		scannedAt: null,
		sessions: {}
	};
}
/**
* 读账本；损坏或版本不符按空账本处理（下次扫描会重建）。
* @returns 账本文档
*/
function loadLedger() {
	const parsed = readJson(ledgerFile());
	if (parsed?.version !== 1 || typeof parsed.sessions !== "object" || parsed.sessions === null) return emptyLedger();
	return {
		version: 1,
		foldVersion: typeof parsed.foldVersion === "number" ? parsed.foldVersion : 0,
		scannedAt: typeof parsed.scannedAt === "number" ? parsed.scannedAt : null,
		sessions: parsed.sessions
	};
}
/**
* 原子写账本（可能几百 KB；调用方负责节流）。
* @param ledger 账本文档
*/
function saveLedger(ledger) {
	writeJson(ledgerFile(), ledger);
}
function isWidgetId(value) {
	return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}
/**
* 校验并规整一份布局；不合法就返回 null（调用方退回默认布局）。
* @param raw 前端提交的布局
* @returns `{ order, size, hidden }` 或 null
*/
function normalizeLayout(raw) {
	if (raw === null || raw === void 0 || typeof raw !== "object" || Array.isArray(raw)) return null;
	const order = Array.isArray(raw.order) ? raw.order.filter(isWidgetId).slice(0, MAX_ENTRIES) : [];
	const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter(isWidgetId).slice(0, MAX_ENTRIES) : [];
	const size = {};
	if (raw.size !== null && typeof raw.size === "object" && !Array.isArray(raw.size)) for (const [id, value] of Object.entries(raw.size)) {
		if (!isWidgetId(id) || !WIDGET_SIZES.includes(value)) continue;
		Object.defineProperty(size, id, {
			value,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	const uniqueOrder = [];
	for (const id of order) if (!uniqueOrder.includes(id)) uniqueOrder.push(id);
	const focusOrder = Array.isArray(raw.focusOrder) ? raw.focusOrder.filter(isWidgetId).slice(0, MAX_ENTRIES) : [];
	const uniqueFocus = [];
	for (const id of focusOrder) if (!uniqueFocus.includes(id)) uniqueFocus.push(id);
	const layout = {
		order: uniqueOrder,
		focusOrder: uniqueFocus,
		size,
		hidden: [...new Set(hidden)]
	};
	if (typeof raw.instanceLayout === "boolean") layout.instanceLayout = raw.instanceLayout;
	if (raw.positions !== null && typeof raw.positions === "object" && !Array.isArray(raw.positions)) {
		const positions = {};
		for (const [key, rows] of Object.entries(raw.positions)) {
			if (!validBreakpoint(key) || rows === null || typeof rows !== "object" || Array.isArray(rows)) continue;
			const columns = Number(key);
			const valid = {};
			for (const [id, rect] of Object.entries(rows).slice(0, MAX_ENTRIES)) {
				if (!isWidgetId(id) || rect === null || typeof rect !== "object") continue;
				const { x, y, w, h } = rect;
				if (![
					x,
					y,
					w,
					h
				].every(Number.isInteger) || x < 0 || y < 0 || y > 1e4 || w < 1 || w > columns || x + w > columns || h < 3 || h > 30) continue;
				Object.defineProperty(valid, id, {
					value: {
						x,
						y,
						w,
						h
					},
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
			positions[key] = valid;
		}
		layout.positions = positions;
	}
	return layout;
}
/**
* 校验并规整首页偏好。
* @param raw 前端提交的偏好
* @returns `{ lastSeenAt, dismissed, canvasWidth, libraryPosition }`
*/
function normalizePrefs(raw) {
	const prefs = emptyPrefs();
	if (raw === null || raw === void 0 || typeof raw !== "object" || Array.isArray(raw)) return prefs;
	if (typeof raw.lastSeenAt === "number" && Number.isFinite(raw.lastSeenAt)) prefs.lastSeenAt = raw.lastSeenAt;
	if (typeof raw.canvasWidth === "number" && Number.isFinite(raw.canvasWidth)) prefs.canvasWidth = Math.round(Math.min(CANVAS_MAX_WIDTH, Math.max(CANVAS_MIN_WIDTH, raw.canvasWidth)));
	if (raw.libraryPosition !== null && raw.libraryPosition !== void 0 && typeof raw.libraryPosition === "object" && !Array.isArray(raw.libraryPosition)) {
		const { x, y } = raw.libraryPosition;
		if (Number.isFinite(x) && Number.isFinite(y)) prefs.libraryPosition = {
			x: Math.round(Math.min(2e4, Math.max(0, x))),
			y: Math.round(Math.min(2e4, Math.max(0, y)))
		};
	}
	if (raw.dismissed !== null && typeof raw.dismissed === "object" && !Array.isArray(raw.dismissed)) for (const [id, at] of Object.entries(raw.dismissed)) {
		if (!isWidgetId(id) || typeof at !== "number" || !Number.isFinite(at)) continue;
		Object.defineProperty(prefs.dismissed, id, {
			value: at,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	return prefs;
}
//#endregion
//#region src/index.mjs
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
/** bundle 条目 id（= cordis.patch.yml 的 insert id）。 */
const PLUGIN_ID = "dsh-home";
/** 前端取数路由（与 client/index.tsx 的 API_PATH 同源）。 */
const API_PATH = "/plugins/dsh-home/api";
/** Bounded workbench envelope (64 instances, bounded configs and geometry). */
const BODY_LIMIT = 256 * 1024;
/** 快照触发的重扫阈值：60 秒内刚扫过就不再扫。 */
const SCAN_TTL_MS = 6e4;
/** 每批并发读取的会话数。 */
const SCAN_CONCURRENCY = 4;
/** 两次落盘之间的最小间隔（900 条会话的账本约几百 KB）。 */
const PERSIST_INTERVAL_MS = 1500;
const name = PLUGIN_ID;
/** 只强制依赖 webServer；账本服务缺席时首页降级为「暂无数据」而不是整条 pending。 */
const inject = ["webServer"];
/** 读请求体（限长，超限直接拒绝）。 */
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > BODY_LIMIT) {
				reject(Object.assign(/* @__PURE__ */ new Error("body too large"), { code: "bad-request" }));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			try {
				resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				reject(Object.assign(/* @__PURE__ */ new Error("body is not JSON"), { code: "bad-request" }));
			}
		});
		req.on("error", reject);
	});
}
function send(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}
/**
* 活动账本的进程内状态与扫描器。
* @param ctx cordis 上下文（宿主半边）
* @param options 注入点（日志；测试可替换持久化实现）
*/
function createHomeService(ctx, { log = () => {}, load = loadState, save = saveState } = {}) {
	let state;
	try {
		state = load();
	} catch (error) {
		state = readOnlyState(error);
	}
	if (state === void 0 || state === null) state = readOnlyState(widgetStateError("State loader returned no document", "state-read-error"));
	let storage = stateStorage(state);
	const ledger = loadLedger();
	if (ledger.foldVersion !== 4) {
		ledger.sessions = {};
		ledger.foldVersion = 4;
		ledger.scannedAt = null;
	}
	const loadedPlanner = loadPlanner();
	let planner = loadedPlanner.doc ?? emptyPlanner();
	let plannerStatus = loadedPlanner.doc === null ? {
		writable: false,
		status: "read-only",
		error: {
			code: loadedPlanner.error,
			message: "Saved plan data cannot be read; original file retained"
		}
	} : {
		writable: true,
		status: "ready",
		error: null
	};
	const loadedFocus = loadFocus();
	let focus = loadedFocus.doc ?? emptyFocus();
	let focusStatus = loadedFocus.doc === null ? {
		writable: false,
		status: "read-only",
		error: {
			code: loadedFocus.error,
			message: "Saved timer data cannot be read; original file retained"
		}
	} : {
		writable: true,
		status: "ready",
		error: null
	};
	/** @type {object | undefined} */
	let persistence;
	let scanning = false;
	let scanError = false;
	let inflight = null;
	let progress = {
		done: 0,
		total: 0
	};
	const activityCache = /* @__PURE__ */ new Map();
	const invalidateActivity = () => activityCache.clear();
	const clone = (value) => structuredClone(value);
	const persistState = (next) => {
		if (!storage.writable) throw widgetStateError(storage.error?.message ?? "Saved workbench is read-only", "state-read-only");
		try {
			save(next);
		} catch (error) {
			const code = error?.code === "state-read-only" ? "state-read-only" : "state-write-error";
			storage = {
				writable: code !== "state-read-only",
				status: code === "state-read-only" ? "read-only" : "write-error",
				error: {
					code,
					message: code === "state-read-only" ? "Saved workbench is read-only; original file retained" : "Cannot save workbench; previous state retained"
				}
			};
			log(`state write failed: ${error?.message ?? error}`);
			throw widgetStateError(storage.error.message, code);
		}
		state = next;
		storage = {
			writable: true,
			status: "ready",
			error: null
		};
	};
	const persistLedger = () => {
		try {
			saveLedger({
				...ledger,
				foldVersion: 4
			});
		} catch (error) {
			log(`ledger write failed: ${error?.message ?? error}`);
		}
	};
	const commitPlanner = (next) => {
		if (!plannerStatus.writable) throw widgetStateError(plannerStatus.error.message, plannerStatus.error.code);
		try {
			savePlanner(next);
		} catch (error) {
			plannerStatus = {
				writable: false,
				status: "write-error",
				error: {
					code: "planner-write-error",
					message: "Cannot save plan data; previous file retained"
				}
			};
			log(`planner write failed: ${error?.message ?? error}`);
			throw widgetStateError(plannerStatus.error.message, "planner-write-error");
		}
		planner = next;
		plannerStatus = {
			writable: true,
			status: "ready",
			error: null
		};
	};
	/**
	* 以磁盘为准刷新计划（文件很小，每次读取都重读）：
	* 外部改坏 → 立刻进入只读并保留原文件；修好 → 无需重启即恢复。
	*/
	const refreshPlanner = () => {
		const loaded = loadPlanner();
		if (loaded.doc === null) {
			plannerStatus = {
				writable: false,
				status: "read-only",
				error: {
					code: loaded.error,
					message: "Saved plan data cannot be read; original file retained"
				}
			};
			return;
		}
		planner = loaded.doc;
		plannerStatus = {
			writable: true,
			status: "ready",
			error: null
		};
	};
	const commitFocus = (next) => {
		if (!focusStatus.writable) throw widgetStateError(focusStatus.error.message, focusStatus.error.code);
		try {
			saveFocus(next);
		} catch (error) {
			focusStatus = {
				writable: false,
				status: "write-error",
				error: {
					code: "focus-write-error",
					message: "Cannot save timer data; previous file retained"
				}
			};
			log(`focus write failed: ${error?.message ?? error}`);
			throw widgetStateError(focusStatus.error.message, "focus-write-error");
		}
		focus = next;
		focusStatus = {
			writable: true,
			status: "ready",
			error: null
		};
	};
	/** 以磁盘为准刷新计时文档；语义同 {@link refreshPlanner}。 */
	const refreshFocus = () => {
		const loaded = loadFocus();
		if (loaded.doc === null) {
			focusStatus = {
				writable: false,
				status: "read-only",
				error: {
					code: loaded.error,
					message: "Saved timer data cannot be read; original file retained"
				}
			};
			return;
		}
		focus = loaded.doc;
		focusStatus = {
			writable: true,
			status: "ready",
			error: null
		};
	};
	const foldOne = async (snapshot) => {
		const id = snapshot.header.id;
		const revision = String(snapshot.revision);
		let handle;
		try {
			handle = await persistence.open(id, "read");
			const { events } = await handle.read(0);
			ledger.sessions[id] = {
				...foldSession(snapshot.header, events),
				revision
			};
		} catch (error) {
			log(`skip session ${id}: ${error?.message ?? error}`);
			ledger.sessions[id] = {
				id,
				createdAt: snapshot.header.createdAt,
				revision,
				failed: true
			};
		} finally {
			if (handle !== void 0) await handle.close().catch(() => {});
		}
	};
	const scan = async () => {
		if (persistence === void 0) return;
		if (inflight !== null) return inflight;
		scanning = true;
		invalidateActivity();
		scanError = false;
		inflight = (async () => {
			try {
				const snapshots = await persistence.list();
				const pending = snapshots.filter((snapshot) => ledger.sessions[snapshot.header.id]?.revision !== String(snapshot.revision)).sort((left, right) => right.header.createdAt - left.header.createdAt);
				progress = {
					done: 0,
					total: pending.length
				};
				let lastPersist = Date.now();
				for (let index = 0; index < pending.length; index += SCAN_CONCURRENCY) {
					const batch = pending.slice(index, index + SCAN_CONCURRENCY);
					await Promise.all(batch.map((snapshot) => foldOne(snapshot)));
					invalidateActivity();
					progress = {
						done: Math.min(pending.length, index + batch.length),
						total: pending.length
					};
					if (Date.now() - lastPersist > PERSIST_INTERVAL_MS) {
						lastPersist = Date.now();
						persistLedger();
					}
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
				const live = new Set(snapshots.map((snapshot) => snapshot.header.id));
				for (const id of Object.keys(ledger.sessions)) if (!live.has(id)) delete ledger.sessions[id];
				ledger.scannedAt = Date.now();
				ledger.foldVersion = 4;
			} catch (error) {
				scanError = true;
				log(`scan failed: ${error?.message ?? error}`);
			} finally {
				scanning = false;
				invalidateActivity();
				inflight = null;
				persistLedger();
			}
		})();
		return inflight;
	};
	const snapshot = () => {
		if ((ledger.scannedAt === null || Date.now() - ledger.scannedAt > SCAN_TTL_MS) && !scanning) scan();
		return buildSnapshot({
			...ledger,
			scanning,
			progress
		});
	};
	return {
		/** 会话持久化服务到位后绑定（缺席时账本为空，页面仍可用）。 */
		attach(service) {
			persistence = service;
			return scan();
		},
		scan,
		snapshot,
		activity(raw) {
			const query = validateActivityQuery(raw);
			snapshot();
			const key = JSON.stringify(query);
			const cached = activityCache.get(key);
			if (cached && Date.now() - cached.at < 3e4) return clone(cached.value);
			const value = buildActivity({
				...ledger,
				scanning,
				progress
			}, query, {
				available: persistence !== void 0,
				scanError
			});
			if (activityCache.size >= 24) activityCache.delete(activityCache.keys().next().value);
			activityCache.set(key, {
				at: Date.now(),
				value
			});
			return clone(value);
		},
		get state() {
			return clone(state);
		},
		get ledger() {
			return ledger;
		},
		getStorage() {
			return clone(storage);
		},
		getWorkbench() {
			return clone({
				layout: state.layout,
				instances: state.instances,
				storage
			});
		},
		setWorkbench(workbench) {
			const validated = validateWorkbench(workbench, normalizeLayout);
			persistState({
				...state,
				...validated
			});
			this.pruneFocus(validated.instances.map((instance) => instance.instanceId));
			return this.getWorkbench();
		},
		setLayout(raw) {
			const layout = normalizeLayout(raw);
			if (layout === null) throw widgetStateError("layout must be an object", "bad-layout");
			const instances = clone(state.instances);
			const ids = new Set(instances.map((instance) => instance.instanceId));
			const missing = new Set(layoutInstanceIds(layout).filter((id) => !ids.has(id)));
			instances.push(...[...missing].map((instanceId) => ({
				instanceId,
				typeId: BUILTIN_WIDGET_IDS.includes(instanceId) ? `@vlln/dsh-home:${instanceId}` : `legacy:${instanceId}`,
				configVersion: 1,
				config: {}
			})));
			const validated = validateWorkbench({
				layout,
				instances
			}, normalizeLayout);
			persistState({
				...state,
				...validated
			});
			return clone(state.layout);
		},
		getLayout() {
			return clone(state.layout);
		},
		setPrefs(prefs) {
			persistState({
				...state,
				prefs: {
					...state.prefs,
					...normalizePrefs(prefs)
				}
			});
			return clone(state.prefs);
		},
		getPrefs() {
			return clone(state.prefs);
		},
		/** 计划文档 + 可写状态；只读时先重试读盘，文件修好即恢复。 */
		getPlanner() {
			refreshPlanner();
			return clone({
				planner,
				storage: plannerStatus
			});
		},
		applyPlanner(operation) {
			refreshPlanner();
			if (!plannerStatus.writable) throw widgetStateError(plannerStatus.error.message, plannerStatus.error.code);
			const { doc } = applyPlannerOp(planner, operation);
			if (doc !== planner) commitPlanner(doc);
			return clone({
				planner,
				storage: plannerStatus
			});
		},
		/** 计时文档 + 可写状态。 */
		getFocus() {
			refreshFocus();
			return clone({
				focus,
				storage: focusStatus
			});
		},
		applyFocus(operation) {
			refreshFocus();
			if (!focusStatus.writable) throw widgetStateError(focusStatus.error.message, focusStatus.error.code);
			const { doc } = applyFocusOp(focus, operation);
			if (doc !== focus) commitFocus(doc);
			return clone({
				focus,
				storage: focusStatus
			});
		},
		/** 实例删掉后清理它的计时槽；失败不影响布局保存。 */
		pruneFocus(instanceIds) {
			if (!focusStatus.writable) return;
			try {
				const { doc } = applyFocusOp(focus, {
					op: "focus.gc",
					instanceIds
				});
				if (doc !== focus) commitFocus(doc);
			} catch (error) {
				log(`focus gc failed: ${error?.message ?? error}`);
			}
		}
	};
}
/**
* Cordis entry。
* @param ctx 宿主上下文
*/
function apply(ctx) {
	const log = (message) => {
		try {
			ctx.logger?.("dsh-home")?.debug?.(message);
		} catch {}
	};
	const service = createHomeService(ctx, { log });
	ctx.inject(["sessionPersistence"], (scoped) => {
		const persistence = scoped.get("sessionPersistence");
		if (persistence === void 0) return;
		scoped.effect(() => {
			service.attach(persistence);
			return () => {};
		}, "dsh-home: activity ledger");
	});
	const webServer = ctx.get("webServer");
	if (webServer === void 0) return;
	const runOp = (body) => dispatch(service, body);
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: API_PATH,
		handler: async (req, res) => {
			if (req.method !== "POST") {
				send(res, 405, {
					ok: false,
					error: {
						code: "method-not-allowed",
						message: "POST only"
					}
				});
				return;
			}
			if (!isSameOrigin(req)) {
				send(res, 403, {
					ok: false,
					error: {
						code: "forbidden",
						message: "cross-origin request rejected"
					}
				});
				return;
			}
			let body;
			try {
				body = await readBody(req);
			} catch (error) {
				send(res, 400, {
					ok: false,
					error: {
						code: error.code ?? "bad-request",
						message: error.message
					}
				});
				return;
			}
			const reply = await runOp(body);
			send(res, reply.status, reply.payload);
		}
	}), "dsh-home: api route");
	ctx.inject(["connection"], (scoped) => {
		const connection = scoped.get("connection");
		const register = connection?.fetch?.register;
		if (typeof register !== "function") return;
		scoped.effect(() => register.call(connection.fetch, {
			path: CONNECTION_PATH,
			methods: ["POST"],
			requestBody: "buffered",
			fetch: async (request) => {
				let body;
				try {
					body = await request.json();
				} catch {
					return Response.json({
						ok: false,
						error: {
							code: "bad-request",
							message: "body is not JSON"
						}
					}, { status: 400 });
				}
				const reply = await runOp(body);
				return Response.json(reply.payload, {
					status: reply.status,
					headers: { "cache-control": "no-store" }
				});
			}
		}), "dsh-home: connection api route");
		scoped.effect(() => register.call(connection.fetch, {
			path: BALANCE_PATH,
			methods: ["POST"],
			requestBody: "buffered",
			fetch: async () => Response.json(await readBalance(scoped), { headers: { "cache-control": "no-store" } })
		}), "dsh-home: connection balance route");
		scoped.effect(() => register.call(connection.fetch, {
			path: IMAGE_PATH,
			methods: ["GET"],
			requestBody: "buffered",
			fetch: async (request) => serveImage(request)
		}), "dsh-home: connection image route");
	});
}
/**
* 把平台返回的余额体解析成浏览器要的四个数。
* @param body `/user/balance` 的 JSON
* @returns 可用时带 total/currency，不可用时带 reason
*/
function parseBalance(body) {
	const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : void 0;
	const total = Number(info?.total_balance);
	if (!Number.isFinite(total)) return {
		available: false,
		reason: "bad-response"
	};
	return {
		available: true,
		currency: typeof info.currency === "string" ? info.currency : "CNY",
		total,
		granted: Number.isFinite(Number(info.granted_balance)) ? Number(info.granted_balance) : null,
		toppedUp: Number.isFinite(Number(info.topped_up_balance)) ? Number(info.topped_up_balance) : null
	};
}
/** 余额路由（`/api` 围栏后）。 */
const BALANCE_PATH = "/api/dsh-home/balance";
/** 余额缓存：平台接口不该每次渲染都打一次。 */
const BALANCE_TTL_MS = 5 * 6e4;
let balanceCache = null;
/**
* 读一次 DeepSeek 平台余额。
*
* key 只在宿主侧解析（设置里的 `apiKeyEnv` 引用 → credentials 服务），
* 解析不到或平台不可达时回一个「不可用」的原因，浏览器不会看到 key。
* @param ctx 插件上下文
* @returns `{ available, currency, total, granted, toppedUp }` 或 `{ available: false, reason }`
*/
async function readBalance(ctx) {
	if (balanceCache !== null && Date.now() - balanceCache.at < BALANCE_TTL_MS) return balanceCache.value;
	const finish = (value) => {
		balanceCache = {
			at: Date.now(),
			value
		};
		return value;
	};
	try {
		const key = await resolvePlatformKey(ctx);
		if (key === null) return finish({
			available: false,
			reason: "not-configured"
		});
		const response = await fetch("https://api.deepseek.com/user/balance", {
			headers: {
				authorization: `Bearer ${key}`,
				accept: "application/json"
			},
			signal: AbortSignal.timeout(1e4)
		});
		if (!response.ok) return finish({
			available: false,
			reason: `http-${response.status}`
		});
		return finish(parseBalance(await response.json()));
	} catch (error) {
		return finish({
			available: false,
			reason: error?.name === "TimeoutError" ? "timeout" : "unreachable"
		});
	}
}
/**
* 解析 DeepSeek 平台的 API key：先找设置里声明的 `apiKeyEnv` 引用，再退到环境变量。
* @param ctx 插件上下文
* @returns key 或 null
*/
async function resolvePlatformKey(ctx) {
	try {
		const settings = ctx.get("settings");
		const credentials = ctx.get("credentials");
		const rows = typeof settings?.describe === "function" ? settings.describe() : [];
		for (const row of Array.isArray(rows) ? rows : []) {
			const ref = row?.apiKeyEnv;
			if (typeof ref !== "string" || ref === "") continue;
			if (typeof credentials?.resolve !== "function") continue;
			const resolved = await credentials.resolve(ref);
			if (typeof resolved?.value === "string" && resolved.value !== "") return resolved.value;
		}
	} catch {}
	const fromEnv = process.env.DEEPSEEK_API_KEY;
	return typeof fromEnv === "string" && fromEnv !== "" ? fromEnv : null;
}
/** 本地图片路由（`/api` 围栏后）。 */
const IMAGE_PATH = "/api/dsh-home/image";
/** 允许的图片扩展名与返回类型。 */
const IMAGE_TYPES = /* @__PURE__ */ new Map([
	[".png", "image/png"],
	[".jpg", "image/jpeg"],
	[".jpeg", "image/jpeg"],
	[".webp", "image/webp"],
	[".gif", "image/gif"],
	[".avif", "image/avif"]
]);
/** 单张本地图片的上限。 */
const IMAGE_LIMIT = 20 * 1024 * 1024;
/**
* 把 `path` 查询参数读成图片响应。
* @param request Fetch 请求
* @returns 图片字节，或一个说明原因的空响应
*/
async function serveImage(request) {
	const raw = new URL(request.url).searchParams.get("path");
	if (raw === null || raw.trim() === "" || raw.length > 4096) return new Response("bad path", { status: 400 });
	const expanded = raw.startsWith("~/") ? path.join(homedir(), raw.slice(2)) : raw;
	if (!path.isAbsolute(expanded)) return new Response("path must be absolute", { status: 400 });
	const type = IMAGE_TYPES.get(path.extname(expanded).toLowerCase());
	if (type === void 0) return new Response("unsupported image type", { status: 415 });
	try {
		const info = await stat(expanded);
		if (!info.isFile()) return new Response("not a file", { status: 404 });
		if (info.size > IMAGE_LIMIT) return new Response("image too large", { status: 413 });
		const bytes = await readFile(expanded);
		return new Response(bytes, {
			status: 200,
			headers: {
				"content-type": type,
				"cache-control": "private, max-age=60",
				"x-content-type-options": "nosniff"
			}
		});
	} catch {
		return new Response("not found", { status: 404 });
	}
}
/** `/api` 围栏后的新入口。 */
const CONNECTION_PATH = "/api/dsh-home/rpc";
/** 客户端输入类错误的码值：它们原样回给前端，其余一律归为 internal。 */
const CLIENT_ERROR_CODES = /* @__PURE__ */ new Set([
	"bad-workbench",
	"bad-layout",
	"bad-activity-query",
	"state-read-only",
	"bad-op",
	"bad-item",
	"bad-title",
	"bad-note",
	"bad-day",
	"bad-time",
	"bad-kind",
	"bad-priority",
	"bad-weekdays",
	"bad-marks",
	"bad-habit",
	"bad-id",
	"unknown-op",
	"too-many-items",
	"too-many-habits",
	"missing-item",
	"missing-habit",
	"bad-slot",
	"bad-timer",
	"bad-pomodoro",
	"bad-gc",
	"missing-timer",
	"missing-pomodoro",
	"too-many-slots",
	"bad-planner",
	"bad-focus",
	"focus-read-only",
	"planner-read-only",
	"planner-corrupt",
	"focus-corrupt",
	"planner-unreadable",
	"focus-unreadable",
	"planner-too-large",
	"focus-too-large"
]);
/** 是否是可原样回给前端的码值（其余一律归为 internal）。 */
function knownCode(code) {
	return CLIENT_ERROR_CODES.has(code) || /-(?:write-error|corrupt|unreadable|too-large)$/u.test(code);
}
/** 码值 → HTTP 状态。 */
function statusOf(code) {
	if (/-too-large$/u.test(code)) return 413;
	if (code === "state-read-only" || /-(?:read-only)$/u.test(code)) return 409;
	if (/-(?:corrupt|unreadable)$/u.test(code)) return 409;
	if (/-write-error$/u.test(code)) return 500;
	if (CLIENT_ERROR_CODES.has(code)) return 400;
	return 500;
}
/**
* 一条 op 的分发：两个 HTTP 入口共用，返回状态码与信封。
* @param service 首页服务
* @param body 已解析的请求体
* @returns `{ status, payload }`
*/
async function dispatch(service, body) {
	const op = body?.op;
	try {
		if (op === "snapshot") return {
			status: 200,
			payload: {
				ok: true,
				value: service.snapshot()
			}
		};
		if (op === "activity") return {
			status: 200,
			payload: {
				ok: true,
				value: service.activity({
					timeZone: body.timeZone,
					cwd: body.cwd,
					date: body.date
				})
			}
		};
		if (op === "workbench.get") return {
			status: 200,
			payload: {
				ok: true,
				value: service.getWorkbench()
			}
		};
		if (op === "workbench.set") return {
			status: 200,
			payload: {
				ok: true,
				value: service.setWorkbench({
					layout: body.layout,
					instances: body.instances
				})
			}
		};
		if (op === "layout.get") return {
			status: 200,
			payload: {
				ok: true,
				value: {
					layout: service.getLayout(),
					storage: service.getStorage()
				}
			}
		};
		if (op === "layout.set") {
			const layout = normalizeLayout(body.layout);
			if (layout === null) return {
				status: 400,
				payload: {
					ok: false,
					error: {
						code: "bad-layout",
						message: "layout must be { order, size, hidden }"
					}
				}
			};
			return {
				status: 200,
				payload: {
					ok: true,
					value: { layout: service.setLayout(layout) }
				}
			};
		}
		if (op === "prefs.get") return {
			status: 200,
			payload: {
				ok: true,
				value: {
					prefs: service.getPrefs(),
					storage: service.getStorage()
				}
			}
		};
		if (op === "prefs.set") return {
			status: 200,
			payload: {
				ok: true,
				value: { prefs: service.setPrefs(normalizePrefs(body.prefs)) }
			}
		};
		if (op === "rescan") {
			service.scan();
			return {
				status: 200,
				payload: {
					ok: true,
					value: { started: true }
				}
			};
		}
		if (op === "planner.get") return {
			status: 200,
			payload: {
				ok: true,
				value: service.getPlanner()
			}
		};
		if (op === "planner.apply") return {
			status: 200,
			payload: {
				ok: true,
				value: service.applyPlanner(body.operation)
			}
		};
		if (op === "focus.get") return {
			status: 200,
			payload: {
				ok: true,
				value: service.getFocus()
			}
		};
		if (op === "focus.apply") return {
			status: 200,
			payload: {
				ok: true,
				value: service.applyFocus(body.operation)
			}
		};
		return {
			status: 400,
			payload: {
				ok: false,
				error: {
					code: "unknown-op",
					message: `unknown op: ${String(op)}`
				}
			}
		};
	} catch (error) {
		const code = typeof error?.code === "string" ? error.code : "internal";
		const status = statusOf(code);
		const safeCode = knownCode(code) ? code : "internal";
		return {
			status,
			payload: {
				ok: false,
				error: {
					code: safeCode,
					message: safeCode === "internal" ? "Workbench operation failed" : error.message
				},
				storage: service.getStorage()
			}
		};
	}
}
//#endregion
export { API_PATH, BALANCE_PATH, CONNECTION_PATH, IMAGE_PATH, PLUGIN_ID, apply, createHomeService, inject, name, parseBalance };
