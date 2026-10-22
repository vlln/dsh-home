import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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
	let turns = 0;
	let runMs = 0;
	let activeMs = 0;
	let orphanStep = 0;
	for (const event of events) {
		const time = typeof event?.time === "number" ? event.time : void 0;
		if (time === void 0) continue;
		times.push(time);
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
		sessionCount: sessions.length,
		days,
		today,
		week,
		sessions: recent
	};
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
/** 状态文件路径。 */
function stateFile() {
	return path.join(stateDir(), "state.json");
}
/** 空状态。 */
function emptyState() {
	return {
		version: 1,
		layout: null,
		sessions: {},
		scannedAt: null
	};
}
/**
* 读状态；文件缺失/损坏/版本不符都退回空状态（不抛，首页永远能打开）。
* @returns 状态文档
*/
function loadState() {
	let raw;
	try {
		raw = readFileSync(stateFile(), "utf8");
	} catch {
		return emptyState();
	}
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return emptyState();
	}
	if (parsed?.version !== 1 || typeof parsed.sessions !== "object" || parsed.sessions === null) return emptyState();
	return {
		version: 1,
		layout: normalizeLayout(parsed.layout),
		sessions: parsed.sessions,
		scannedAt: typeof parsed.scannedAt === "number" ? parsed.scannedAt : null
	};
}
/**
* 原子写状态。
* @param state 状态文档
*/
function saveState(state) {
	mkdirSync(stateDir(), { recursive: true });
	const target = stateFile();
	const temporary = `${target}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 384 });
	renameSync(temporary, target);
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
		size[id] = value;
	}
	/** @type {string[]} */
	const uniqueOrder = [];
	for (const id of order) if (!uniqueOrder.includes(id)) uniqueOrder.push(id);
	return {
		order: uniqueOrder,
		size,
		hidden: [...new Set(hidden)]
	};
}
//#endregion
//#region src/index.mjs
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
/** bundle 条目 id（= cordis.patch.yml 的 insert id）。 */
const PLUGIN_ID = "dsh-home";
/** 前端取数路由（与 client/index.tsx 的 API_PATH 同源）。 */
const API_PATH = "/plugins/dsh-home/api";
/** 路由体上限：只有 op 与一份布局，32 KiB 已经两个数量级余量。 */
const BODY_LIMIT = 32 * 1024;
/** 快照触发的重扫阈值：60 秒内刚扫过就不再扫。 */
const SCAN_TTL_MS = 6e4;
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
* @param routeOptions 注入点（测试可替换持久化实现）
*/
function createHomeService(ctx, { log = () => {} } = {}) {
	const state = loadState();
	/** @type {object | undefined} */
	let persistence;
	let scanning = false;
	let inflight = null;
	const persist = () => {
		try {
			saveState(state);
		} catch (error) {
			log(`state write failed: ${error?.message ?? error}`);
		}
	};
	const scan = async () => {
		if (persistence === void 0) return;
		if (inflight !== null) return inflight;
		scanning = true;
		state.scanning = true;
		inflight = (async () => {
			try {
				const snapshots = await persistence.list();
				let processed = 0;
				for (const snapshot of snapshots) {
					const id = snapshot.header.id;
					const revision = String(snapshot.revision);
					const previous = state.sessions[id];
					if (previous !== void 0 && previous.revision === revision) continue;
					let handle;
					try {
						handle = await persistence.open(id, "read");
						const { events } = await handle.read(0);
						state.sessions[id] = {
							...foldSession(snapshot.header, events),
							revision
						};
						processed += 1;
					} catch (error) {
						log(`skip session ${id}: ${error?.message ?? error}`);
					} finally {
						if (handle !== void 0) await handle.close().catch(() => {});
					}
					if (processed > 0 && processed % 5 === 0) {
						await new Promise((resolve) => setImmediate(resolve));
						persist();
					}
				}
				const live = new Set(snapshots.map((snapshot) => snapshot.header.id));
				for (const id of Object.keys(state.sessions)) if (!live.has(id)) delete state.sessions[id];
				state.scannedAt = Date.now();
			} catch (error) {
				log(`scan failed: ${error?.message ?? error}`);
			} finally {
				scanning = false;
				state.scanning = false;
				inflight = null;
				persist();
			}
		})();
		return inflight;
	};
	const snapshot = () => {
		if ((state.scannedAt === null || Date.now() - state.scannedAt > SCAN_TTL_MS) && !scanning) scan();
		return buildSnapshot({
			...state,
			scanning
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
		get state() {
			return state;
		},
		setLayout(layout) {
			state.layout = layout;
			persist();
			return state.layout;
		},
		getLayout() {
			return state.layout;
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
				if (op === "layout.get") {
					send(res, 200, {
						ok: true,
						value: { layout: service.getLayout() }
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
				send(res, 500, {
					ok: false,
					error: {
						code: "internal",
						message: error?.message ?? String(error)
					}
				});
			}
		}
	}), "dsh-home: api route");
}
//#endregion
export { API_PATH, PLUGIN_ID, apply, createHomeService, inject, name };
