import { constants, copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
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
/** 「回到现场」显示的原文截断长度。 */
const SNIPPET_LENGTH = 160;
/** 天桶保留窗口（更早的只计入总计）。 */
const DAY_WINDOW_MS = 400 * 24 * 36e5;
/** 本地日键 `YYYY-MM-DD`。 */
function dayKey(time) {
	const d = new Date(time);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${month}-${day}`;
}
/** 本地日键加偏移天数（负数往回），用于「最近 N 天」的键序列。 */
function shiftDayKey(time, deltaDays) {
	const d = new Date(time);
	d.setDate(d.getDate() + deltaDays);
	return dayKey(d.getTime());
}
function emptyDay() {
	return {
		activeMs: 0,
		runMs: 0,
		turns: 0
	};
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
		const key = dayKey(cursor);
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
		if (event.type === "turn/start") {
			turns += 1;
			const day = days[dayKey(time)] ?? (days[dayKey(time)] = emptyDay());
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
	for (const session of sessions) {
		const day = session.days?.[key];
		if (day === void 0) continue;
		activeMs += day.activeMs;
		runMs += day.runMs;
		turns += day.turns;
		if (day.activeMs > 0 || day.turns > 0) count += 1;
	}
	return {
		key,
		activeMs,
		runMs,
		turns,
		sessions: count
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
	const today = days[days.length - 1] ?? dayTotals(sessions, dayKey(now));
	const week = days.slice(-7).reduce((total, day) => ({
		activeMs: total.activeMs + day.activeMs,
		runMs: total.runMs + day.runMs,
		turns: total.turns + day.turns,
		sessions: total.sessions + day.sessions
	}), {
		activeMs: 0,
		runMs: 0,
		turns: 0,
		sessions: 0
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
		todayMs: session.days?.[dayKey(now)]?.activeMs ?? 0,
		todayTurns: session.days?.[dayKey(now)]?.turns ?? 0,
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
//#endregion
//#region src/widget-state.mjs
/** Durable widget identities. Registry availability never determines stored instances. */
const BUILTIN_WIDGET_IDS = Object.freeze([
	"recent",
	"tasks",
	"resume",
	"queue",
	"today",
	"running",
	"areas",
	"rhythm",
	"quick"
]);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
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
			if (![
				"12",
				"6",
				"2"
			].includes(columns) || !record(rows) || Object.keys(rows).length > 64) throw widgetStateError("invalid layout breakpoint");
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
const CANVAS_MAX_WIDTH = 4096;
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
		canvasWidth: null
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
		const workbench = parsed.version === 2 ? {
			layout: parsed.layout,
			instances: initialInstances(layout)
		} : {
			layout: parsed.layout,
			instances: validateWorkbench({
				layout,
				instances: parsed.instances
			}, normalizeLayout).instances
		};
		return withStorage({
			...parsed,
			...workbench,
			version: 3
		}, {
			writable: true,
			status: parsed.version === 2 ? "migrated" : "ready",
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
		for (const columns of [
			12,
			6,
			2
		]) {
			const rows = raw.positions[String(columns)];
			if (rows === null || typeof rows !== "object" || Array.isArray(rows)) continue;
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
			positions[String(columns)] = valid;
		}
		layout.positions = positions;
	}
	return layout;
}
/**
* 校验并规整首页偏好。
* @param raw 前端提交的偏好
* @returns `{ lastSeenAt, dismissed, canvasWidth }`
*/
function normalizePrefs(raw) {
	const prefs = emptyPrefs();
	if (raw === null || raw === void 0 || typeof raw !== "object" || Array.isArray(raw)) return prefs;
	if (typeof raw.lastSeenAt === "number" && Number.isFinite(raw.lastSeenAt)) prefs.lastSeenAt = raw.lastSeenAt;
	if (typeof raw.canvasWidth === "number" && Number.isFinite(raw.canvasWidth)) prefs.canvasWidth = Math.round(Math.min(CANVAS_MAX_WIDTH, Math.max(960, raw.canvasWidth)));
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
	if (ledger.foldVersion !== 3) {
		ledger.sessions = {};
		ledger.foldVersion = 3;
		ledger.scannedAt = null;
	}
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
				foldVersion: 3
			});
		} catch (error) {
			log(`ledger write failed: ${error?.message ?? error}`);
		}
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
				ledger.foldVersion = 3;
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
			const op = body?.op;
			try {
				if (op === "snapshot") {
					send(res, 200, {
						ok: true,
						value: service.snapshot()
					});
					return;
				}
				if (op === "activity") {
					send(res, 200, {
						ok: true,
						value: service.activity({
							timeZone: body.timeZone,
							cwd: body.cwd,
							date: body.date
						})
					});
					return;
				}
				if (op === "workbench.get") {
					send(res, 200, {
						ok: true,
						value: service.getWorkbench()
					});
					return;
				}
				if (op === "workbench.set") {
					send(res, 200, {
						ok: true,
						value: service.setWorkbench({
							layout: body.layout,
							instances: body.instances
						})
					});
					return;
				}
				if (op === "layout.get") {
					send(res, 200, {
						ok: true,
						value: {
							layout: service.getLayout(),
							storage: service.getStorage()
						}
					});
					return;
				}
				if (op === "layout.set") {
					const layout = normalizeLayout(body.layout);
					if (layout === null) {
						send(res, 400, {
							ok: false,
							error: {
								code: "bad-layout",
								message: "layout must be { order, size, hidden }"
							}
						});
						return;
					}
					send(res, 200, {
						ok: true,
						value: { layout: service.setLayout(layout) }
					});
					return;
				}
				if (op === "prefs.get") {
					send(res, 200, {
						ok: true,
						value: {
							prefs: service.getPrefs(),
							storage: service.getStorage()
						}
					});
					return;
				}
				if (op === "prefs.set") {
					send(res, 200, {
						ok: true,
						value: { prefs: service.setPrefs(normalizePrefs(body.prefs)) }
					});
					return;
				}
				if (op === "rescan") {
					service.scan();
					send(res, 200, {
						ok: true,
						value: { started: true }
					});
					return;
				}
				send(res, 400, {
					ok: false,
					error: {
						code: "unknown-op",
						message: `unknown op: ${String(op)}`
					}
				});
			} catch (error) {
				const code = error?.code;
				const status = code === "bad-workbench" || code === "bad-layout" || code === "bad-activity-query" ? 400 : code === "state-read-only" ? 409 : 500;
				const safeCode = [
					"bad-workbench",
					"bad-layout",
					"bad-activity-query",
					"state-read-only",
					"state-write-error"
				].includes(code) ? code : "internal";
				send(res, status, {
					ok: false,
					error: {
						code: safeCode,
						message: safeCode === "internal" ? "Workbench operation failed" : error.message
					},
					storage: service.getStorage()
				});
			}
		}
	}), "dsh-home: api route");
}
//#endregion
export { API_PATH, PLUGIN_ID, apply, createHomeService, inject, name };
