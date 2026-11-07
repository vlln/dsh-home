window.__ModuleLoader__.load({
	id: "@vlln/dsh-home",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		react_dom = __toESM(react_dom, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/format.ts
		/**
		* 数字与时间的人话格式：时长、相对时间、日期、快捷键提示。
		*
		* @module @vlln/dsh-home/client/format
		*/
		/**
		* 时长：`0` → "0 分钟"，`<1h` → 分钟，整点 → 小时，其余 → 小时+分。
		* @param ms 毫秒
		* @param t 翻译
		*/
		function formatDuration(ms, t) {
			if (ms > 0 && ms < 6e4) return t("dur.lessThanMinute");
			const minutes = Math.max(0, Math.round(ms / 6e4));
			if (minutes <= 0) return t("dur.none");
			if (minutes < 60) return t("dur.minutes", { n: minutes });
			const hours = Math.floor(minutes / 60);
			const rest = minutes % 60;
			if (rest === 0) return t("dur.hours", { h: hours });
			return t("dur.hoursMinutes", {
				h: hours,
				m: rest
			});
		}
		/**
		* 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前。
		* @param time 目标时刻
		* @param now 当前时刻
		* @param t 翻译
		*/
		function formatAgo(time, now, t) {
			const delta = Math.max(0, now - time);
			const minutes = Math.floor(delta / 6e4);
			if (minutes < 1) return t("time.justNow");
			if (minutes < 60) return t("time.minutesAgo", { n: minutes });
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return t("time.hoursAgo", { n: hours });
			return t("time.daysAgo", { n: Math.floor(hours / 24) });
		}
		/**
		* 原生会话列表那种紧凑相对时间：`刚刚 / 5分钟 / 3小时 / 2天 / 4个月 / 1年`。
		* 分桶交给宿主 `relativeTime`，所以同一会话在我们的卡片与原生侧栏里说法一致。
		* @param time 目标时刻
		* @param now 当前时刻
		* @param t 翻译
		*/
		function compactAgo(time, now, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(time, now);
			return unit === "now" ? t("time.now") : t(`time.${unit}`, { n });
		}
		/**
		* 今天的日期行：地区化月日 + 星期。
		* @param now 当前时刻
		* @param locale 语言（`ctx.locale` 的 active）
		*/
		function formatDay(now, locale) {
			const tag = locale === "zh" || locale.startsWith("zh") ? "zh-CN" : "en-US";
			try {
				return `${new Intl.DateTimeFormat(tag, {
					month: "long",
					day: "numeric"
				}).format(now)} ${new Intl.DateTimeFormat(tag, { weekday: "short" }).format(now)}`;
			} catch {
				return new Date(now).toDateString();
			}
		}
		/**
		* 日期键 → 短标签（`10-22` / `10/22`）。
		* @param key `YYYY-MM-DD`
		*/
		function shortDay(key) {
			const [, month, day] = key.split("-");
			return month === void 0 || day === void 0 ? key : `${month}-${day}`;
		}
		/**
		* 平台快捷键提示：macOS 用 ⌘N，其余 Ctrl+N。
		* @returns 可直接嵌进文案的字符串
		*/
		function shortcutHint() {
			const platform = typeof navigator === "undefined" ? "" : navigator.platform;
			return /mac/i.test(platform) ? "⌘N" : "Ctrl+N";
		}
		/**
		* 时刻的 `HH:MM`（本地时区，24 小时制）。
		* @param time 时刻
		*/
		function hhmm(time) {
			const date = new Date(time);
			return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
		}
		//#endregion
		//#region src/client/boundary.tsx
		/**
		* 单卡的错误边界：一个 widget（尤其是第三方经 `home.widget` 贡献的）抛错时，
		* 只让那一张卡变成一句提示，而不是把整页（乃至宿主的整块 UI）带走。
		*
		* 类组件是 React 里唯一能做错误边界的形式；这里刻意不依赖任何宿主服务。
		*
		* @module @vlln/dsh-home/client/boundary
		*/
		/** 捕获子树渲染错误，渲染 fallback。 */
		var CardBoundary = class extends react.Component {
			state = { failed: false };
			static getDerivedStateFromError() {
				return { failed: true };
			}
			componentDidCatch(error) {
				console.error("[dsh-home] widget failed:", error);
			}
			render() {
				return this.state.failed ? this.props.fallback : this.props.children;
			}
		};
		//#endregion
		//#region src/client/drag-release.ts
		function observeDragRelease(targets, options) {
			let ended = false;
			const listeners = [];
			const clear = () => {
				ended = true;
				for (const [target, type, listener] of listeners) target.removeEventListener(type, listener, true);
			};
			const matches = (event) => event.pointerId === void 0 || event.pointerId === options.pointerId;
			const end = (event, release) => {
				if (ended || !matches(event)) return;
				clear();
				if (release) options.onRelease(event);
				else options.onCancel();
			};
			const listen = (target, type, listener) => {
				listeners.push([
					target,
					type,
					listener
				]);
				target.addEventListener(type, listener, true);
			};
			const release = (event) => {
				if (event.button !== void 0 && event.button !== 0) return;
				end(event, true);
			};
			if (options.transport === "pointer") {
				listen(targets.window, "pointerup", release);
				listen(targets.window, "pointercancel", (event) => end(event, false));
				if (!options.touch) listen(targets.window, "mouseup", release);
				listen(targets.window, "pointermove", (event) => {
					if (event.pointerType !== "touch" && event.buttons !== void 0 && !(event.buttons & 1)) end(event, false);
				});
			} else if (options.transport === "mouse") {
				listen(targets.window, "mouseup", release);
				listen(targets.window, "mousemove", (event) => {
					if (event.buttons !== void 0 && !(event.buttons & 1)) end(event, false);
				});
			} else {
				listen(targets.window, "touchend", release);
				listen(targets.window, "touchcancel", (event) => end(event, false));
			}
			listen(targets.window, "blur", (event) => {
				if (event.target === targets.window) end(event, false);
			});
			listen(targets.document, "mouseleave", (event) => {
				if ((event.target === targets.document || event.target === targets.documentElement) && event.relatedTarget == null) end(event, false);
			});
			return clear;
		}
		//#endregion
		//#region src/client/drop-zone.ts
		/** Inclusive on every edge: a release exactly on the border still aims at the target. */
		function insideDropZone(point, box) {
			if (point === null || box === null) return false;
			return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
		}
		function boardWidth(columns) {
			return columns * 84 + (columns - 1) * 12;
		}
		/** `12 * 84 + 11 * 12 = 1140`. */
		const CANVAS_MIN_WIDTH = boardWidth(12);
		/** `32 * 84 + 31 * 12 = 3060`. */
		const CANVAS_MAX_WIDTH = boardWidth(32);
		const CANVAS_DEFAULT_WIDTH = boardWidth(12);
		function clampColumns(value) {
			return Math.max(12, Math.min(32, Math.round(value)));
		}
		/** Runtime grid columns: the fixed-stride canvas 12..32 plus the legacy 2/6
		* breakpoint data that must stay readable. Anything else is not a grid. */
		function isGridColumns(value) {
			return typeof value === "number" && Number.isInteger(value) && (value === 2 || value === 6 || value >= 12 && value <= 32);
		}
		/** `cols = clamp(floor((W + 12) / 96), 12, 32)`; the window is never an input. */
		function columnsForWidth(width) {
			if (typeof width !== "number" || !Number.isFinite(width)) return 12;
			return clampColumns(Math.floor((width + 12) / 96));
		}
		/** Exact board pixel width for a column count: `cols*84 + (cols-1)*12`. */
		function boardWidthForColumns(columns) {
			return boardWidth(clampColumns(columns));
		}
		/** Exact widget pixel width for a span: `w*84 + (w-1)*12`, constant for a given w. */
		function widgetWidthForColumns(span) {
			return boardWidth(span);
		}
		/** Nearest whole row unit, never below one unit. */
		function unitColumns(columns) {
			return Math.max(4, Math.round(columns / 4) * 4);
		}
		/** The column count actually used: a whole row unit, so a saved 12-column layout keeps
		* its own breakpoint instead of drifting onto a stray 13-column board. */
		function boardColumnsFor(width) {
			return unitColumns(columnsForWidth(width));
		}
		/** Snap any width to a whole row unit: the board the user actually gets. */
		function snapCanvasWidth(width) {
			return boardWidthForColumns(boardColumnsFor(width));
		}
		function clampCanvasWidth(value) {
			if (typeof value !== "number" || !Number.isFinite(value)) return CANVAS_DEFAULT_WIDTH;
			return Math.round(Math.max(CANVAS_MIN_WIDTH, Math.min(CANVAS_MAX_WIDTH, value)));
		}
		/** A saved preference, or the default when the user never chose one. */
		function resolveCanvasWidth(saved) {
			return saved === null || saved === void 0 ? CANVAS_DEFAULT_WIDTH : clampCanvasWidth(saved);
		}
		/** Pixel width from a pointer delta along one edge, so dragging out always widens.
		* The column is centred, so one edge moving `dx` outward widens the box by `2·dx`
		* and the edge itself stays exactly under the pointer. The result is raw: the
		* gesture previews continuously and only the commit snaps to a whole column. */
		function canvasWidthFromEdgeDrag(startWidth, startX, currentX, side) {
			return clampCanvasWidth(startWidth + (side === "right" ? currentX - startX : startX - currentX) * 2);
		}
		/** Keyboard equivalent: one whole column per press. Home and End reach the bounds. */
		function canvasWidthFromKey(width, key) {
			const columns = boardColumnsFor(width);
			if (key === "ArrowLeft") return boardWidthForColumns(columns - 4);
			if (key === "ArrowRight") return boardWidthForColumns(columns + 4);
			if (key === "Home") return CANVAS_MIN_WIDTH;
			if (key === "End") return CANVAS_MAX_WIDTH;
			return width;
		}
		//#endregion
		//#region src/client/layout-model.ts
		/** Compatibility-only defaults for pre-instance state; new types supply geometry metadata. */
		function legacySpatialHeight(id) {
			return id === "tasks" ? 8 : id === "recent" ? 7 : 4;
		}
		const PRIMARY_IDS = /* @__PURE__ */ new Set(["recent", "tasks"]);
		const FOCUS_IDS = [
			"resume",
			"queue",
			"today"
		];
		const FOCUS_SET = new Set(FOCUS_IDS);
		/** Keep the first occurrence of currently registered ids, then append missing defaults. */
		function completeOrder(order, fallback) {
			const known = new Set(fallback);
			return [...new Set([...order, ...fallback].filter((id) => known.has(id)))];
		}
		/**
		* Project persisted overrides onto all currently available home cards (fallback).
		*
		* An order containing resume or queue is already unified: keep its known ids,
		* appending missing fallback ids. Otherwise migrate the legacy split layout:
		* recent/tasks first (their old grid-relative order), then focusOrder completed
		* with resume/queue/today, then the remaining grid cards and newly registered ids.
		* Every result id occurs once and belongs to fallback. Hidden cards stay in this
		* full order so hiding does not move them. Neither argument nor any persisted
		* field (including hidden, size and focusOrder) is modified or written back.
		*/
		function homeOrder(layout, fallback) {
			const grid = completeOrder(layout.order, fallback);
			if (layout.order.includes("resume") || layout.order.includes("queue")) return grid;
			const known = new Set(fallback);
			const focus = completeOrder(layout.focusOrder ?? [], FOCUS_IDS).filter((id) => known.has(id));
			return [
				...grid.filter((id) => PRIMARY_IDS.has(id)),
				...focus,
				...grid.filter((id) => !PRIMARY_IDS.has(id) && !FOCUS_SET.has(id))
			];
		}
		//#endregion
		//#region src/client/widget-sizing.ts
		function fail$1(message) {
			throw new Error(`homeWidgets: sizing ${message}`);
		}
		function plainData(input, keys, field) {
			if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail$1(`${field} must be a plain object`);
			for (const key of Reflect.ownKeys(input)) {
				if (typeof key !== "string" || !keys.includes(key)) fail$1(`${field} supports only ${keys.join(" and ")}`);
				const descriptor = Object.getOwnPropertyDescriptor(input, key);
				if (!descriptor.enumerable || !("value" in descriptor)) fail$1(`${field} requires data properties`);
			}
			if (keys.some((key) => !Object.hasOwn(input, key))) fail$1(`${field} requires ${keys.join(" and ")}`);
		}
		Object.freeze([
			4,
			8,
			12
		]);
		Object.freeze([
			4,
			6,
			8,
			10
		]);
		function shapeFor(input) {
			let w, h;
			if (typeof input === "string") {
				const match = /^([1-9][0-9]*)x([1-9][0-9]*)$/.exec(input);
				if (!match) fail$1("shape must be { w, h } or a legacy integer WxH string");
				w = Number(match[1]);
				h = Number(match[2]);
			} else {
				plainData(input, ["w", "h"], "shape");
				w = input.w;
				h = input.h;
			}
			if (!Number.isInteger(w) || w < 1 || w > 12) fail$1("shape w must be an integer between 1 and 12");
			if (!Number.isInteger(h) || h < 3 || h > 30) fail$1("shape h must be an integer between 3 and 30");
			return Object.freeze({
				w,
				h
			});
		}
		const sameShape = (a, b) => a.w === b.w && a.h === b.h;
		/** Compare nominal declarations, independent of object identity or legacy string syntax. */
		function sameWidgetPreset(a, b) {
			return sameShape(shapeFor(a), shapeFor(b));
		}
		function normalizeWidgetSizing(input) {
			return normalizeShapes(input);
		}
		/** Kept separate from the exported name so legacy `defaults` share one code path. */
		function normalizeShapes(input) {
			plainData(input, ["default", "supported"], "declaration");
			const values = input.supported;
			if (!Array.isArray(values) || Object.getPrototypeOf(values) !== Array.prototype || values.length < 1 || values.length > 16) fail$1("supported must contain 1..16 shapes");
			for (const key of Reflect.ownKeys(values)) {
				if (key === "length") continue;
				if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= values.length) fail$1("supported requires an ordinary dense array");
				const descriptor = Object.getOwnPropertyDescriptor(values, key);
				if (!descriptor.enumerable || !("value" in descriptor)) fail$1("supported requires data properties");
			}
			const supported = [];
			for (let index = 0; index < values.length; index++) {
				if (!Object.hasOwn(values, index)) fail$1("supported requires an ordinary dense array");
				const shape = shapeFor(values[index]);
				if (supported.some((other) => sameShape(other, shape))) fail$1("supported cannot contain duplicate shapes");
				supported.push(shape);
			}
			const requested = shapeFor(input.default);
			const defaultShape = supported.find((shape) => sameShape(shape, requested));
			if (!defaultShape) fail$1("default must match a supported shape by w/h");
			return Object.freeze({
				default: defaultShape,
				supported: Object.freeze(supported)
			});
		}
		/** Legacy hints become one fixed declaration; do not round the original height. */
		function legacyWidgetSizing(defaults) {
			const shape = {
				w: defaults.size === "s" ? 4 : defaults.size === "m" ? 8 : 12,
				h: defaults.height
			};
			return normalizeShapes({
				default: shape,
				supported: [shape]
			});
		}
		function presetGeometry(preset, cols) {
			if (!Number.isInteger(cols) || !(cols === 2 || cols === 6 || cols >= 12 && cols <= 32)) throw new Error("Invalid grid breakpoint");
			const shape = shapeFor(preset);
			if (cols >= 12) return {
				w: Math.min(shape.w, cols),
				h: shape.h
			};
			return {
				w: cols === 6 ? shape.w <= 4 ? Math.min(shape.w, 3) : Math.min(shape.w, 6) : Math.min(shape.w, 2),
				h: shape.h
			};
		}
		/** Duplicate projected shapes are one option; prefer the default's declaration by w/h. */
		function projectedWidgetPresets(sizing, cols) {
			const result = [];
			const defaultShape = shapeFor(sizing.default);
			for (const preset of sizing.supported) {
				const shape = presetGeometry(preset, cols);
				const existing = result.find((item) => sameShape(item, shape));
				if (!existing) result.push({
					preset,
					...shape
				});
				else if (sameShape(shapeFor(preset), defaultShape)) existing.preset = preset;
			}
			return result;
		}
		/** Pre-position builtins existed before explicit sizing; only generic legacy records
		* (no exact position in any breakpoint) use these immutable historical hints. */
		function legacyInstanceProjection(typeId, id, layout, definition) {
			if (Object.values(layout.positions ?? {}).some((rows) => Object.hasOwn(rows, id))) return void 0;
			return {
				recent: {
					size: "m",
					height: 7
				},
				tasks: {
					size: "s",
					height: 8
				},
				today: {
					size: "m",
					height: 4
				},
				running: {
					size: "s",
					height: 4
				},
				areas: {
					size: "s",
					height: 4
				},
				rhythm: {
					size: "m",
					height: 4
				},
				resume: {
					size: "m",
					height: 4
				},
				queue: {
					size: "s",
					height: 4
				},
				quick: {
					size: "s",
					height: 4
				},
				notes: {
					size: "s",
					height: 6
				},
				clock: {
					size: "s",
					height: 4
				},
				activity: {
					size: "m",
					height: 6
				}
			}[typeId.startsWith("@vlln/dsh-home:") ? typeId.slice(15) : ""] ?? (definition ? {
				size: definition.defaults.size,
				height: definition.defaults.height
			} : void 0);
		}
		/** Compatibility bounds summarize this widget's declarations, not additional resize options. */
		function sizingDefaults(sizing) {
			const shape = shapeFor(sizing.default), shapes = sizing.supported.map(shapeFor);
			return Object.freeze({
				size: shape.w <= 4 ? "s" : shape.w <= 8 ? "m" : "l",
				height: shape.h,
				minWidth: Math.min(...shapes.map((item) => item.w)),
				maxWidth: Math.max(...shapes.map((item) => item.w)),
				minHeight: Math.min(...shapes.map((item) => item.h)),
				maxHeight: Math.max(...shapes.map((item) => item.h))
			});
		}
		//#endregion
		//#region src/client/spatial-model.ts
		const SPATIAL_MAX_Y = 1e4;
		function columns(cols) {
			return isGridColumns(cols) ? cols : 12;
		}
		/** Legacy width buckets are defined on 12 columns; wider canvases keep those widths,
		* they do not make a saved `l` card span the whole new board. */
		function legacyBucket(cols) {
			return Math.min(columns(cols), 12);
		}
		function record$1(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function isRect(value, cols) {
			if (!record$1(value)) return false;
			const { x, y, w, h } = value;
			return typeof x === "number" && Number.isInteger(x) && x >= 0 && typeof y === "number" && Number.isInteger(y) && y >= 0 && y <= 1e4 && typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= cols && typeof h === "number" && Number.isInteger(h) && h >= 3 && h <= 30 && x + w <= cols;
		}
		function overlaps$1(a, b) {
			return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
		}
		function bounded(value, fallback, min, max) {
			return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
		}
		/** Legacy width buckets: 12 (and any wider canvas) -> 4/8/12, 6 -> 3/6/6, 2 -> 2/2/2. */
		function widthFromSize(size, cols) {
			const bucket = legacyBucket(cols);
			if (bucket <= 2) return bucket;
			if (bucket <= 6) return size === "s" ? Math.min(3, bucket) : bucket;
			return size === "s" ? 4 : size === "l" ? bucket : Math.min(8, bucket);
		}
		/** Width-only compatibility bucket (6-column m/l and all 2-column sizes coincide). */
		function sizeFromRect(rect, cols) {
			const bucket = legacyBucket(cols);
			if (bucket <= 2 || rect.w <= widthFromSize("s", bucket)) return "s";
			return rect.w <= widthFromSize("m", bucket) ? "m" : "l";
		}
		/**
		* Test an exact rectangle, excluding id itself. Edges may touch. Invalid, out of
		* bounds or overlapping proposals fail; no item is pushed or compacted.
		*/
		function canPlace(geometry, id, rect, cols = 12) {
			cols = columns(cols);
			return isRect(rect, cols) && geometry.every((item) => item.i === id || !overlaps$1(rect, item));
		}
		/**
		* Find the first row-major empty slot for the requested width/height. Its x/y
		* are deliberately ignored. Returns null only if the bounded grid is full.
		*/
		function findSpatialSpace(geometry, rect, cols) {
			cols = columns(cols);
			const shape = {
				x: 0,
				y: 0,
				w: rect.w,
				h: rect.h
			};
			if (!isRect(shape, cols)) return null;
			for (let y = 0; y <= SPATIAL_MAX_Y; y++) for (let x = 0; x <= cols - shape.w; x++) {
				const candidate = {
					...shape,
					x,
					y
				};
				if (geometry.every((item) => !overlaps$1(candidate, item))) return candidate;
			}
			return null;
		}
		function compactSpatialLayout(geometry, cols) {
			if (!isGridColumns(cols)) throw new Error("Invalid grid columns");
			if (!Array.isArray(geometry) || geometry.length > 64) throw new Error("Invalid compact layout");
			const ids = /* @__PURE__ */ new Set();
			for (const item of geometry) {
				if (!record$1(item) || typeof item.i !== "string" || item.i.length === 0 || ids.has(item.i) || !isRect(item, cols)) throw new Error("Invalid compact geometry");
				ids.add(item.i);
			}
			if (geometry.some((item) => !canPlace(geometry, item.i, item, cols))) throw new Error("Overlapping compact geometry");
			if (geometry.every((item) => {
				const first = findSpatialSpace(geometry.filter((peer) => peer !== item), item, cols);
				return first !== null && first.x === item.x && first.y === item.y;
			})) return geometry;
			const visual = geometry.map((item, index) => ({
				item,
				index
			})).sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.index - b.index);
			const occupied = [];
			const packed = /* @__PURE__ */ new Map();
			let changed = false;
			for (const { item } of visual) {
				const rect = findSpatialSpace(occupied, item, cols);
				if (rect === null) throw new Error("No space available to compact layout");
				const next = item.x === rect.x && item.y === rect.y ? item : {
					...item,
					x: rect.x,
					y: rect.y
				};
				changed ||= next !== item;
				occupied.push(next);
				packed.set(item.i, next);
			}
			return changed ? geometry.map((item) => packed.get(item.i)) : geometry;
		}
		/** The canvas column count is a user preference, so the active key can change at any
		* time. When that exact count has no saved rows yet, read the nearest stored
		* breakpoint verbatim: largest key <= cols, else smallest key >= cols. Rectangles are
		* never scaled or re-projected; one that no longer fits falls through to first-fit.
		* The legacy 6/2 projections keep their independent first-fit behaviour. Writes always
		* target String(cols) (see mergeSpatialPositions). */
		function savedBreakpointFor(layout, cols) {
			const positions = layout.positions;
			if (!record$1(positions)) return {};
			if (cols < 12) return record$1(positions[String(cols)]) ? positions[String(cols)] : {};
			const rowsAt = (key) => {
				const rows = positions[key];
				return record$1(rows) && Object.keys(rows).length > 0 ? rows : null;
			};
			const exact = rowsAt(String(cols));
			if (exact !== null) return exact;
			const keys = Object.keys(positions).filter((key) => /^(?:[1-9]|[12]\d|3[0-2])$/u.test(key) && rowsAt(key) !== null).map(Number).sort((a, b) => a - b);
			const below = keys.filter((key) => key < cols).at(-1);
			const above = keys.find((key) => key > cols);
			const fallback = below ?? above;
			return fallback === void 0 ? {} : rowsAt(String(fallback));
		}
		/**
		* Project registered, visible cards in homeOrder order, without mutating layout.
		* All legal saved rectangles are reserved before missing/invalid cards are
		* first-fit placed, so migration cannot steal a later card's saved position.
		* For conflicting saved data, the earlier ordered card wins; only the loser is
		* relocated. Hidden/unregistered cards never collide and their data is untouched.
		* Each breakpoint is independent: when the active column count has no data, the
		* nearest stored breakpoint is read verbatim; a missing one uses legacy first-fit.
		* Neither path writes or compacts another breakpoint. viewportCols distinguishes
		* widget resize bounds from the actual viewport for implicit keyboard movement.
		*/
		function buildSpatialLayout(layout, metas, cols) {
			cols = columns(cols);
			const byId = /* @__PURE__ */ new Map();
			for (const meta of metas) if (!byId.has(meta.id)) byId.set(meta.id, meta);
			const hidden = new Set(layout.hidden);
			const available = [...byId.keys()];
			const order = (layout.instanceLayout ? [.../* @__PURE__ */ new Set([...layout.order, ...available])].filter((id) => byId.has(id)) : homeOrder(layout, available)).filter((id) => !hidden.has(id));
			const saved = savedBreakpointFor(layout, cols);
			const occupied = [];
			const items = /* @__PURE__ */ new Map();
			const itemFrom = (id, rect) => {
				const meta = byId.get(id);
				const options = meta.sizing ? projectedWidgetPresets(meta.sizing, cols) : null;
				const minW = options ? Math.min(rect.w, ...options.map((item) => item.w)) : Math.min(meta.minWidth ?? 3, cols);
				const maxW = options ? Math.max(rect.w, ...options.map((item) => item.w)) : Math.min(meta.maxWidth ?? cols, cols);
				return {
					i: id,
					x: rect.x,
					y: rect.y,
					w: rect.w,
					h: rect.h,
					minW,
					minH: options ? Math.min(rect.h, ...options.map((item) => item.h)) : meta.minHeight ?? 3,
					maxW,
					viewportCols: cols,
					...options ? { maxH: Math.max(rect.h, ...options.map((item) => item.h)) } : meta.maxHeight === void 0 ? {} : { maxH: meta.maxHeight }
				};
			};
			for (const id of order) {
				const rect = Object.hasOwn(saved, id) ? saved[id] : void 0;
				if (isRect(rect, cols) && canPlace(occupied, id, rect, cols)) {
					const item = itemFrom(id, rect);
					occupied.push(item);
					items.set(id, item);
				}
			}
			for (const id of order) {
				if (items.has(id)) continue;
				const override = Object.hasOwn(layout.size, id) ? layout.size[id] : void 0;
				const size = override === "s" || override === "m" || override === "l" ? override : byId.get(id).defaultSize;
				const raw = Object.hasOwn(saved, id) && record$1(saved[id]) ? saved[id] : {};
				const meta = byId.get(id);
				const minW = Math.min(meta.minWidth ?? 3, cols);
				const maxW = Math.min(meta.maxWidth ?? cols, cols);
				const minH = meta.minHeight ?? 3;
				const maxH = meta.maxHeight ?? 30;
				const preset = meta.sizing ? presetGeometry(meta.sizing.default, cols) : null;
				const rect = findSpatialSpace(occupied, {
					x: 0,
					y: 0,
					w: preset ? override === "s" || override === "m" || override === "l" ? widthFromSize(override, cols) : meta.legacyProjection ? widthFromSize(meta.legacyProjection.size, cols) : preset.w : bounded(raw.w, Math.max(minW, Math.min(maxW, widthFromSize(size, cols))), minW, maxW),
					h: preset ? meta.legacyProjection?.height ?? preset.h : bounded(raw.h, meta.defaultHeight ?? legacySpatialHeight(id), minH, maxH)
				}, cols);
				if (rect === null) continue;
				const item = itemFrom(id, rect);
				occupied.push(item);
				items.set(id, item);
			}
			return order.flatMap((id) => {
				const item = items.get(id);
				return item ? [item] : [];
			});
		}
		function moveSpatialItem(geometry, id, dx, dy, cols) {
			const item = geometry.find((entry) => entry.i === id);
			if (!item || !Number.isInteger(dx) || !Number.isInteger(dy) || dx === 0 && dy === 0) return geometry;
			const count = columns(cols ?? item.viewportCols ?? item.maxW ?? 12);
			const moved = {
				...item,
				x: item.x + dx,
				y: item.y + dy
			};
			if (!canPlace(geometry, id, moved, count)) return geometry;
			return geometry.map((entry) => entry === item ? moved : entry);
		}
		/** Explicit size choice: keep x/y and every peer; no solver or automatic reflow. */
		function applyWidgetPreset(geometry, id, sizing, preset, cols) {
			const declared = sizing.supported.find((item) => sameWidgetPreset(item, preset));
			if (!declared) throw new Error("Unsupported widget size");
			const option = {
				preset: declared,
				...presetGeometry(declared, cols)
			};
			const target = geometry.find((item) => item.i === id);
			if (!target || !option) throw new Error("Unknown widget or preset");
			const next = {
				...target,
				w: option.w,
				h: option.h
			};
			if (!canPlace(geometry, id, next, cols)) throw new Error("Widget preset is blocked");
			if (target.w === next.w && target.h === next.h) return geometry;
			return geometry.map((item) => item === target ? next : item);
		}
		/**
		* Merge visible geometry into only the current breakpoint. Never replace the
		* whole positions map: hidden cards, absent external plugins and every other
		* breakpoint keep their saved data. Invalid proposals are ignored; callers
		* should validate resize proposals with canPlace before merging.
		*/
		function mergeSpatialPositions(layout, geometry, cols) {
			cols = columns(cols);
			const key = String(cols);
			const current = layout.positions?.[key];
			const next = record$1(current) ? { ...current } : {};
			const hidden = new Set(layout.hidden);
			for (const item of geometry) if (!hidden.has(item.i) && isRect(item, cols)) Object.defineProperty(next, item.i, {
				value: {
					x: item.x,
					y: item.y,
					w: item.w,
					h: item.h
				},
				enumerable: true,
				configurable: true,
				writable: true
			});
			return {
				...layout,
				positions: {
					...layout.positions,
					[key]: next
				}
			};
		}
		//#endregion
		//#region src/client/api.ts
		/** 老入口（同源围栏自校验）；宿主仍保留，供旧客户端使用。 */
		const API_PATH = "/plugins/dsh-home/api";
		/** 新入口：官方 `connection` 的 `/api` 围栏（只认 owner 对端）。 */
		const CONNECTION_PATH = "/api/dsh-home/rpc";
		/** 余额路由（与 `src/index.mjs` 的 `BALANCE_PATH` 同源）。 */
		const BALANCE_PATH = "/api/dsh-home/balance";
		/** 当前入口；第一次 404/405 之后记住降级结果，不再重试。 */
		let preferredPath = CONNECTION_PATH;
		function fetchWorkbench() {
			return post("workbench.get");
		}
		function saveWorkbench(layout, instances) {
			return post("workbench.set", {
				layout,
				instances
			});
		}
		/** Keep server diagnostics on failed writes (especially a newly read-only document). */
		var HomeApiError = class extends Error {
			code;
			status;
			storage;
			constructor(message, code, storage, status = 0) {
				super(message);
				this.name = "HomeApiError";
				this.code = code;
				this.storage = storage;
				this.status = status;
			}
		};
		function storageStatus(value) {
			if (value === null || typeof value !== "object") return void 0;
			const item = value;
			if (typeof item.writable !== "boolean" || ![
				"ready",
				"migrated",
				"read-only",
				"write-error"
			].includes(item.status)) return void 0;
			if (item.error !== null && (item.error === void 0 || typeof item.error.code !== "string" || typeof item.error.message !== "string")) return void 0;
			return {
				writable: item.writable,
				status: item.status,
				error: item.error === null ? null : { ...item.error }
			};
		}
		/** 发一条 op；失败抛带 code 的 Error。 */
		async function post(op, extra = {}, signal) {
			const attempt = async (target) => {
				try {
					return await postTo(target, op, extra, signal);
				} catch (error) {
					const status = error instanceof HomeApiError ? error.status : 0;
					if (target !== preferredPath || status !== 404 && status !== 405) throw error;
					preferredPath = API_PATH;
					return postTo(API_PATH, op, extra, signal);
				}
			};
			return attempt(preferredPath);
		}
		async function postTo(target, op, extra, signal) {
			const response = await fetch(target, {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "same-origin",
				cache: "no-store",
				signal,
				body: JSON.stringify({
					op,
					...extra
				})
			});
			let envelope;
			try {
				envelope = await response.json();
			} catch {
				throw new HomeApiError(`home api: HTTP ${response.status} without JSON`, "http-error", void 0, response.status);
			}
			if (!response.ok || envelope.ok !== true) throw new HomeApiError(envelope.error?.message ?? `home api: HTTP ${response.status}`, envelope.error?.code ?? "http-error", storageStatus(envelope.storage), response.status);
			return envelope.value;
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
		/** 空布局。 */
		function emptyLayout() {
			return {
				order: [],
				focusOrder: [],
				size: {},
				hidden: []
			};
		}
		/** 取账本快照。 */
		function fetchSnapshot() {
			return post("snapshot");
		}
		/** 取首页偏好。 */
		async function fetchPrefs() {
			const prefs = (await post("prefs.get"))?.prefs;
			if (!prefs || prefs.lastSeenAt !== null && (typeof prefs.lastSeenAt !== "number" || !Number.isFinite(prefs.lastSeenAt)) || prefs.canvasWidth !== null && prefs.canvasWidth !== void 0 && (typeof prefs.canvasWidth !== "number" || !Number.isFinite(prefs.canvasWidth)) || prefs.dismissed === null || typeof prefs.dismissed !== "object" || Array.isArray(prefs.dismissed) || Object.values(prefs.dismissed).some((at) => typeof at !== "number" || !Number.isFinite(at)) || prefs.libraryPosition !== null && prefs.libraryPosition !== void 0 && (typeof prefs.libraryPosition !== "object" || Array.isArray(prefs.libraryPosition) || typeof prefs.libraryPosition.x !== "number" || !Number.isFinite(prefs.libraryPosition.x) || typeof prefs.libraryPosition.y !== "number" || !Number.isFinite(prefs.libraryPosition.y))) throw new HomeApiError("Invalid saved preferences response", "bad-prefs-response");
			return {
				...prefs,
				libraryPosition: prefs.libraryPosition ?? null
			};
		}
		/** 写首页偏好。 */
		function savePrefs(prefs) {
			return post("prefs.set", { prefs }).then((value) => value.prefs);
		}
		/** 触发一次重扫（重建账本）。 */
		function requestRescan() {
			return post("rescan");
		}
		function isDocumentRecord(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function assertPlanner(value) {
			if (!isDocumentRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.habits) || typeof value.revision !== "number" || typeof value.version !== "number") throw new HomeApiError("Invalid planner document", "bad-planner-response");
			return value;
		}
		function assertFocus(value) {
			if (!isDocumentRecord(value) || !isDocumentRecord(value.timers) || !isDocumentRecord(value.pomodoros) || typeof value.revision !== "number" || typeof value.version !== "number") throw new HomeApiError("Invalid focus document", "bad-focus-response");
			return value;
		}
		/** 取计划文档。 */
		async function fetchPlanner() {
			const value = await post("planner.get");
			return {
				planner: assertPlanner(value?.planner),
				storage: storageStatus(value?.storage) ?? {
					writable: true,
					status: "ready",
					error: null
				}
			};
		}
		/** 应用一条计划操作，返回整份新文档。 */
		async function applyPlanner(operation) {
			const value = await post("planner.apply", { operation });
			return {
				planner: assertPlanner(value?.planner),
				storage: storageStatus(value?.storage) ?? {
					writable: true,
					status: "ready",
					error: null
				}
			};
		}
		/** 取计时文档。 */
		async function fetchFocus() {
			const value = await post("focus.get");
			return {
				focus: assertFocus(value?.focus),
				storage: storageStatus(value?.storage) ?? {
					writable: true,
					status: "ready",
					error: null
				}
			};
		}
		/** 应用一条计时操作，返回整份新文档。 */
		async function applyFocus(operation) {
			const value = await post("focus.apply", { operation });
			return {
				focus: assertFocus(value?.focus),
				storage: storageStatus(value?.storage) ?? {
					writable: true,
					status: "ready",
					error: null
				}
			};
		}
		//#endregion
		//#region src/client/collision-preview.ts
		function validColumns(cols) {
			return Number.isInteger(cols) && cols >= 1 && cols <= 32;
		}
		function clamp$2(value, max) {
			return Math.max(0, Math.min(max, value));
		}
		function snapAxis(raw, max, targets, previous) {
			const bounded = clamp$2(raw, max);
			if (previous !== void 0 && Number.isInteger(previous) && previous >= 0 && previous <= max && Math.abs(bounded - previous) <= .620000001) return previous;
			let result = Math.round(bounded);
			let nearest = .220000001;
			for (const target of targets) {
				if (!Number.isInteger(target) || target < 0 || target > max) continue;
				const distance = Math.abs(bounded - target);
				if (distance < nearest || distance === nearest && target < result) {
					result = target;
					nearest = distance;
				}
			}
			return clamp$2(result, max);
		}
		/**
		* Raw x/y are floating grid coordinates (not pixels). Grid edges already include
		* the standard gap: peer.right and peer.bottom are adjacency targets, not +1.
		* Magnetic targets only participate within 0.22 cells; previous x/y independently
		* hold until 0.62 cells away, so jitter never drags either axis across the board.
		* Dimensions always come from the drag-start active item, including at cols=2.
		* Missing ids return a bounded default shape; bad raw axes retain their origin.
		*/
		function snapCandidate(raw, id, snapshot, cols, previous) {
			const count = validColumns(cols) ? cols : 12;
			const active = snapshot.find((item) => item.i === id);
			const shape = active && canPlace([], id, active, count) ? active : {
				x: 0,
				y: 0,
				w: Math.min(3, count),
				h: 3
			};
			const maxX = count - shape.w;
			const xTargets = [0, maxX];
			const yTargets = [0, SPATIAL_MAX_Y];
			for (const peer of snapshot) {
				if (peer.i === id || !canPlace([], peer.i, peer, count)) continue;
				xTargets.push(peer.x, peer.x + peer.w - shape.w, peer.x - shape.w, peer.x + peer.w);
				yTargets.push(peer.y, peer.y + peer.h - shape.h, peer.y - shape.h, peer.y + peer.h);
			}
			return {
				x: snapAxis(Number.isFinite(raw.x) ? raw.x : shape.x, maxX, xTargets, previous?.x),
				y: snapAxis(Number.isFinite(raw.y) ? raw.y : shape.y, SPATIAL_MAX_Y, yTargets, previous?.y),
				w: shape.w,
				h: shape.h
			};
		}
		//#endregion
		//#region src/client/library-drag-model.ts
		function libraryItem(definition, id, cols, layout) {
			if (!isGridColumns(cols) || layout.some((item) => item.i === id)) throw new Error("Invalid library drag identity or columns");
			if (layout.some((item) => ![
				item.x,
				item.y,
				item.w,
				item.h
			].every(Number.isInteger) || item.x < 0 || item.y < 0 || item.w < 1 || item.h < 3)) throw new Error("Invalid peer geometry");
			const d = definition.defaults;
			const item = buildSpatialLayout(emptyLayout(), [{
				id,
				sizing: definition.sizing,
				defaultSize: d.size,
				defaultHeight: d.height,
				minWidth: d.minWidth,
				maxWidth: d.maxWidth,
				minHeight: d.minHeight,
				maxHeight: d.maxHeight
			}], cols)[0];
			const y = Math.max(0, ...layout.map((entry) => entry.y + entry.h));
			if (y + item.h > 1e4) throw new Error("No space for library draft");
			return {
				...item,
				x: 0,
				y
			};
		}
		function libraryPointerInside(point, grid) {
			return [
				point.x,
				point.y,
				grid.left,
				grid.top,
				grid.width,
				grid.height
			].every(Number.isFinite) && grid.width > 0 && grid.height > 0 && point.x >= grid.left && point.x < grid.left + grid.width && point.y >= grid.top && point.y < grid.top + grid.height;
		}
		//#endregion
		//#region node_modules/.pnpm/react-grid-layout@2.2.3_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-grid-layout/dist/chunk-76RTO6EO.mjs
		function calcGridColWidth(positionParams) {
			const { margin, containerPadding, containerWidth, cols } = positionParams;
			return (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols;
		}
		function calcGridItemWHPx(gridUnits, colOrRowSize, marginPx) {
			if (!Number.isFinite(gridUnits)) return gridUnits;
			return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx);
		}
		function calcGridItemPosition(positionParams, x, y, w, h, dragPosition, resizePosition) {
			const { margin, containerPadding, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			let width;
			let height;
			let top;
			let left;
			if (resizePosition) {
				width = Math.round(resizePosition.width);
				height = Math.round(resizePosition.height);
			} else {
				width = calcGridItemWHPx(w, colWidth, margin[0]);
				height = calcGridItemWHPx(h, rowHeight, margin[1]);
			}
			if (dragPosition) {
				top = Math.round(dragPosition.top);
				left = Math.round(dragPosition.left);
			} else if (resizePosition) {
				top = Math.round(resizePosition.top);
				left = Math.round(resizePosition.left);
			} else {
				top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
				left = Math.round((colWidth + margin[0]) * x + containerPadding[0]);
			}
			if (!dragPosition && !resizePosition) {
				if (Number.isFinite(w)) {
					const actualMarginRight = Math.round((colWidth + margin[0]) * (x + w) + containerPadding[0]) - left - width;
					if (actualMarginRight !== margin[0]) width += actualMarginRight - margin[0];
				}
				if (Number.isFinite(h)) {
					const actualMarginBottom = Math.round((rowHeight + margin[1]) * (y + h) + containerPadding[1]) - top - height;
					if (actualMarginBottom !== margin[1]) height += actualMarginBottom - margin[1];
				}
			}
			return {
				top,
				left,
				width,
				height
			};
		}
		function calcXY(positionParams, top, left, w, h) {
			const { margin, containerPadding, cols, rowHeight, maxRows } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			let x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
			let y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));
			x = clamp$1(x, 0, cols - w);
			y = clamp$1(y, 0, maxRows - h);
			return {
				x,
				y
			};
		}
		function calcXYRaw(positionParams, top, left) {
			const { margin, containerPadding, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			return {
				x: Math.round((left - containerPadding[0]) / (colWidth + margin[0])),
				y: Math.round((top - containerPadding[1]) / (rowHeight + margin[1]))
			};
		}
		function calcWHRaw(positionParams, width, height) {
			const { margin, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			return {
				w: Math.max(1, Math.round((width + margin[0]) / (colWidth + margin[0]))),
				h: Math.max(1, Math.round((height + margin[1]) / (rowHeight + margin[1])))
			};
		}
		function clamp$1(num, lowerBound, upperBound) {
			return Math.max(Math.min(num, upperBound), lowerBound);
		}
		function collides(l1, l2) {
			if (l1.i === l2.i) return false;
			if (l1.x + l1.w <= l2.x) return false;
			if (l1.x >= l2.x + l2.w) return false;
			if (l1.y + l1.h <= l2.y) return false;
			if (l1.y >= l2.y + l2.h) return false;
			return true;
		}
		function getFirstCollision(layout, layoutItem) {
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0 && collides(item, layoutItem)) return item;
			}
		}
		function getAllCollisions(layout, layoutItem) {
			return layout.filter((l) => collides(l, layoutItem));
		}
		function sortLayoutItems(layout, compactType) {
			if (compactType === "horizontal") return sortLayoutItemsByColRow(layout);
			if (compactType === "vertical") return sortLayoutItemsByRowCol(layout);
			if (compactType === "wrap") return sortLayoutItemsByRowCol(layout);
			return [...layout];
		}
		function sortLayoutItemsByRowCol(layout) {
			return [...layout].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});
		}
		function sortLayoutItemsByColRow(layout) {
			return [...layout].sort((a, b) => {
				if (a.x !== b.x) return a.x - b.x;
				return a.y - b.y;
			});
		}
		function bottom(layout) {
			let max = 0;
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) {
					const bottomY = item.y + item.h;
					if (bottomY > max) max = bottomY;
				}
			}
			return max;
		}
		function getLayoutItem(layout, id) {
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0 && item.i === id) return item;
			}
		}
		function getStatics(layout) {
			return layout.filter((l) => l.static === true);
		}
		function cloneLayoutItem(layoutItem) {
			return {
				i: layoutItem.i,
				x: layoutItem.x,
				y: layoutItem.y,
				w: layoutItem.w,
				h: layoutItem.h,
				minW: layoutItem.minW,
				maxW: layoutItem.maxW,
				minH: layoutItem.minH,
				maxH: layoutItem.maxH,
				moved: Boolean(layoutItem.moved),
				static: Boolean(layoutItem.static),
				isDraggable: layoutItem.isDraggable,
				isResizable: layoutItem.isResizable,
				resizeHandles: layoutItem.resizeHandles,
				constraints: layoutItem.constraints,
				isBounded: layoutItem.isBounded
			};
		}
		function cloneLayout(layout) {
			const newLayout = new Array(layout.length);
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) newLayout[i] = cloneLayoutItem(item);
			}
			return newLayout;
		}
		function modifyLayout(layout, layoutItem) {
			const newLayout = new Array(layout.length);
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) if (layoutItem.i === item.i) newLayout[i] = layoutItem;
				else newLayout[i] = item;
			}
			return newLayout;
		}
		function withLayoutItem(layout, itemKey, cb) {
			let item = getLayoutItem(layout, itemKey);
			if (!item) return [[...layout], null];
			item = cb(cloneLayoutItem(item));
			return [modifyLayout(layout, item), item];
		}
		function correctBounds(layout, bounds) {
			const collidesWith = getStatics(layout);
			for (let i = 0; i < layout.length; i++) {
				const l = layout[i];
				if (l === void 0) continue;
				if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
				if (l.x < 0) {
					l.x = 0;
					l.w = bounds.cols;
				}
				if (!l.static) collidesWith.push(l);
				else while (getFirstCollision(collidesWith, l)) l.y++;
			}
			return layout;
		}
		function moveElement(layout, l, x, y, isUserAction, preventCollision, compactType, cols, allowOverlap) {
			if (l.static && l.isDraggable !== true) return [...layout];
			if (l.y === y && l.x === x) return [...layout];
			const oldX = l.x;
			const oldY = l.y;
			if (typeof x === "number") l.x = x;
			if (typeof y === "number") l.y = y;
			l.moved = true;
			let sorted = sortLayoutItems(layout, compactType);
			if (compactType === "vertical" && typeof y === "number" ? oldY >= y : compactType === "horizontal" && typeof x === "number" ? oldX >= x : false) sorted = sorted.reverse();
			const collisions = getAllCollisions(sorted, l);
			const hasCollisions = collisions.length > 0;
			if (hasCollisions && allowOverlap) return cloneLayout(layout);
			if (hasCollisions && preventCollision) {
				l.x = oldX;
				l.y = oldY;
				l.moved = false;
				return layout;
			}
			let resultLayout = [...layout];
			for (let i = 0; i < collisions.length; i++) {
				const collision = collisions[i];
				if (collision === void 0) continue;
				if (collision.moved) continue;
				if (collision.static) resultLayout = moveElementAwayFromCollision(resultLayout, collision, l, isUserAction, compactType);
				else resultLayout = moveElementAwayFromCollision(resultLayout, l, collision, isUserAction, compactType);
			}
			return resultLayout;
		}
		function moveElementAwayFromCollision(layout, collidesWith, itemToMove, isUserAction, compactType, cols) {
			const compactH = compactType === "horizontal";
			const compactV = compactType === "vertical";
			const preventCollision = collidesWith.static;
			if (isUserAction) {
				isUserAction = false;
				const fakeItem = {
					x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
					y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
					w: itemToMove.w,
					h: itemToMove.h,
					i: "-1"
				};
				const firstCollision = getFirstCollision(layout, fakeItem);
				const collisionNorth = firstCollision !== void 0 && firstCollision.y + firstCollision.h > collidesWith.y;
				const collisionWest = firstCollision !== void 0 && collidesWith.x + collidesWith.w > firstCollision.x;
				if (!firstCollision) return moveElement(layout, itemToMove, compactH ? fakeItem.x : void 0, compactV ? fakeItem.y : void 0, isUserAction, preventCollision, compactType);
				if (collisionNorth && compactV) return moveElement(layout, itemToMove, void 0, itemToMove.y + 1, isUserAction, preventCollision, compactType);
				if (collisionNorth && compactType === null) {
					collidesWith.y = itemToMove.y;
					itemToMove.y = itemToMove.y + itemToMove.h;
					return [...layout];
				}
				if (collisionWest && compactH) return moveElement(layout, collidesWith, itemToMove.x, void 0, isUserAction, preventCollision, compactType);
			}
			const newX = compactH ? itemToMove.x + 1 : void 0;
			const newY = compactV ? itemToMove.y + 1 : void 0;
			if (newX === void 0 && newY === void 0) return [...layout];
			return moveElement(layout, itemToMove, newX, newY, isUserAction, preventCollision, compactType);
		}
		//#endregion
		//#region node_modules/.pnpm/react-grid-layout@2.2.3_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-grid-layout/dist/chunk-KDANGDDL.mjs
		function clamp(value, min, max) {
			return Math.max(min, Math.min(max, value));
		}
		var defaultConstraints = [{
			name: "gridBounds",
			constrainPosition(item, x, y, { cols, maxRows }) {
				return {
					x: clamp(x, 0, Math.max(0, cols - item.w)),
					y: clamp(y, 0, Math.max(0, maxRows - item.h))
				};
			},
			constrainSize(item, w, h, handle, { cols, maxRows }) {
				const maxW = handle === "w" || handle === "nw" || handle === "sw" ? item.x + item.w : cols - item.x;
				const maxH = handle === "n" || handle === "nw" || handle === "ne" ? item.y + item.h : maxRows - item.y;
				return {
					w: clamp(w, 1, Math.max(1, maxW)),
					h: clamp(h, 1, Math.max(1, maxH))
				};
			}
		}, {
			name: "minMaxSize",
			constrainSize(item, w, h) {
				return {
					w: clamp(w, item.minW ?? 1, item.maxW ?? Infinity),
					h: clamp(h, item.minH ?? 1, item.maxH ?? Infinity)
				};
			}
		}];
		function applyPositionConstraints(constraints, item, x, y, context) {
			let result = {
				x,
				y
			};
			for (const constraint of constraints) if (constraint.constrainPosition) result = constraint.constrainPosition(item, result.x, result.y, context);
			if (item.constraints) {
				for (const constraint of item.constraints) if (constraint.constrainPosition) result = constraint.constrainPosition(item, result.x, result.y, context);
			}
			return result;
		}
		function applySizeConstraints(constraints, item, w, h, handle, context) {
			let result = {
				w,
				h
			};
			for (const constraint of constraints) if (constraint.constrainSize) result = constraint.constrainSize(item, result.w, result.h, handle, context);
			if (item.constraints) {
				for (const constraint of item.constraints) if (constraint.constrainSize) result = constraint.constrainSize(item, result.w, result.h, handle, context);
			}
			return result;
		}
		function setTransform({ top, left, width, height }) {
			const translate = `translate(${left}px,${top}px)`;
			return {
				transform: translate,
				WebkitTransform: translate,
				MozTransform: translate,
				msTransform: translate,
				OTransform: translate,
				width: `${width}px`,
				height: `${height}px`,
				position: "absolute"
			};
		}
		function setTopLeft({ top, left, width, height }) {
			return {
				top: `${top}px`,
				left: `${left}px`,
				width: `${width}px`,
				height: `${height}px`,
				position: "absolute"
			};
		}
		function perc(num) {
			return num * 100 + "%";
		}
		function constrainWidth(left, currentWidth, newWidth, containerWidth) {
			return left + newWidth > containerWidth ? currentWidth : newWidth;
		}
		function constrainHeight(top, currentHeight, newHeight) {
			return top < 0 ? currentHeight : newHeight;
		}
		function constrainLeft(left) {
			return Math.max(0, left);
		}
		function constrainTop(top) {
			return Math.max(0, top);
		}
		var resizeNorth = (currentSize, newSize, _containerWidth) => {
			const { left, height, width } = newSize;
			const top = currentSize.top - (height - currentSize.height);
			return {
				left,
				width,
				height: constrainHeight(top, currentSize.height, height),
				top: constrainTop(top)
			};
		};
		var resizeEast = (currentSize, newSize, containerWidth) => {
			const { top, left, height, width } = newSize;
			return {
				top,
				height,
				width: constrainWidth(currentSize.left, currentSize.width, width, containerWidth),
				left: constrainLeft(left)
			};
		};
		var resizeWest = (currentSize, newSize, _containerWidth) => {
			const { top, height, width } = newSize;
			const left = currentSize.left + currentSize.width - width;
			if (left < 0) return {
				height,
				width: currentSize.left + currentSize.width,
				top: constrainTop(top),
				left: 0
			};
			return {
				height,
				width,
				top: constrainTop(top),
				left
			};
		};
		var resizeSouth = (currentSize, newSize, _containerWidth) => {
			const { top, left, height, width } = newSize;
			return {
				width,
				left,
				height: constrainHeight(top, currentSize.height, height),
				top: constrainTop(top)
			};
		};
		var resizeNorthEast = (currentSize, newSize, containerWidth) => resizeNorth(currentSize, resizeEast(currentSize, newSize, containerWidth));
		var resizeNorthWest = (currentSize, newSize, containerWidth) => resizeNorth(currentSize, resizeWest(currentSize, newSize));
		var resizeSouthEast = (currentSize, newSize, containerWidth) => resizeSouth(currentSize, resizeEast(currentSize, newSize, containerWidth));
		var resizeSouthWest = (currentSize, newSize, containerWidth) => resizeSouth(currentSize, resizeWest(currentSize, newSize));
		var resizeHandlerMap = {
			n: resizeNorth,
			ne: resizeNorthEast,
			e: resizeEast,
			se: resizeSouthEast,
			s: resizeSouth,
			sw: resizeSouthWest,
			w: resizeWest,
			nw: resizeNorthWest
		};
		function resizeItemInDirection(direction, currentSize, newSize, containerWidth) {
			const handler = resizeHandlerMap[direction];
			if (!handler) return newSize;
			return handler(currentSize, {
				...currentSize,
				...newSize
			}, containerWidth);
		}
		var defaultPositionStrategy = {
			type: "transform",
			scale: 1,
			calcStyle(pos) {
				return setTransform(pos);
			}
		};
		var defaultGridConfig = {
			cols: 12,
			rowHeight: 150,
			margin: [10, 10],
			containerPadding: null,
			maxRows: Infinity
		};
		var defaultDragConfig = {
			enabled: true,
			bounded: false,
			threshold: 3
		};
		var defaultResizeConfig = {
			enabled: true,
			handles: ["se"]
		};
		var defaultDropConfig = {
			enabled: false,
			defaultItem: {
				w: 1,
				h: 1
			}
		};
		function resolveCompactionCollision(layout, item, moveToCoord, axis, hasStatics) {
			const sizeProp = axis === "x" ? "w" : "h";
			item[axis] += 1;
			const itemIndex = layout.findIndex((l) => l.i === item.i);
			const layoutHasStatics = hasStatics ?? getStatics(layout).length > 0;
			for (let i = itemIndex + 1; i < layout.length; i++) {
				const otherItem = layout[i];
				if (otherItem === void 0) continue;
				if (otherItem.static) continue;
				if (!layoutHasStatics && otherItem.y > item.y + item.h) break;
				if (collides(item, otherItem)) resolveCompactionCollision(layout, otherItem, moveToCoord + item[sizeProp], axis, layoutHasStatics);
			}
			item[axis] = moveToCoord;
		}
		function compactItemVertical(compareWith, l, fullLayout, maxY) {
			l.x = Math.max(l.x, 0);
			l.y = Math.max(l.y, 0);
			l.y = Math.min(maxY, l.y);
			while (l.y > 0 && !getFirstCollision(compareWith, l)) l.y--;
			let collision;
			while ((collision = getFirstCollision(compareWith, l)) !== void 0) resolveCompactionCollision(fullLayout, l, collision.y + collision.h, "y");
			l.y = Math.max(l.y, 0);
			return l;
		}
		function compactItemHorizontal(compareWith, l, cols, fullLayout) {
			l.x = Math.max(l.x, 0);
			l.y = Math.max(l.y, 0);
			while (l.x > 0 && !getFirstCollision(compareWith, l)) l.x--;
			let collision;
			while ((collision = getFirstCollision(compareWith, l)) !== void 0) {
				resolveCompactionCollision(fullLayout, l, collision.x + collision.w, "x");
				if (l.x + l.w > cols) {
					l.x = cols - l.w;
					l.y++;
					while (l.x > 0 && !getFirstCollision(compareWith, l)) l.x--;
				}
			}
			l.x = Math.max(l.x, 0);
			return l;
		}
		var verticalCompactor = {
			type: "vertical",
			allowOverlap: false,
			compact(layout, _cols) {
				const compareWith = getStatics(layout);
				let maxY = bottom(compareWith);
				const sorted = sortLayoutItemsByRowCol(layout);
				const out = new Array(layout.length);
				for (let i = 0; i < sorted.length; i++) {
					const sortedItem = sorted[i];
					if (sortedItem === void 0) continue;
					let l = cloneLayoutItem(sortedItem);
					if (!l.static) {
						l = compactItemVertical(compareWith, l, sorted, maxY);
						maxY = Math.max(maxY, l.y + l.h);
						compareWith.push(l);
					}
					const originalIndex = layout.indexOf(sortedItem);
					out[originalIndex] = l;
					l.moved = false;
				}
				return out;
			}
		};
		var horizontalCompactor = {
			type: "horizontal",
			allowOverlap: false,
			compact(layout, cols) {
				const compareWith = getStatics(layout);
				const sorted = sortLayoutItemsByColRow(layout);
				const out = new Array(layout.length);
				for (let i = 0; i < sorted.length; i++) {
					const sortedItem = sorted[i];
					if (sortedItem === void 0) continue;
					let l = cloneLayoutItem(sortedItem);
					if (!l.static) {
						l = compactItemHorizontal(compareWith, l, cols, sorted);
						compareWith.push(l);
					}
					const originalIndex = layout.indexOf(sortedItem);
					out[originalIndex] = l;
					l.moved = false;
				}
				return out;
			}
		};
		var noCompactor = {
			type: null,
			allowOverlap: false,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var verticalOverlapCompactor = {
			...verticalCompactor,
			allowOverlap: true,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var horizontalOverlapCompactor = {
			...horizontalCompactor,
			allowOverlap: true,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var noOverlapCompactor = {
			...noCompactor,
			allowOverlap: true
		};
		function getCompactor(compactType, allowOverlap = false, preventCollision = false) {
			let baseCompactor;
			if (allowOverlap) if (compactType === "vertical") baseCompactor = verticalOverlapCompactor;
			else if (compactType === "horizontal") baseCompactor = horizontalOverlapCompactor;
			else baseCompactor = noOverlapCompactor;
			else if (compactType === "vertical") baseCompactor = verticalCompactor;
			else if (compactType === "horizontal") baseCompactor = horizontalCompactor;
			else baseCompactor = noCompactor;
			if (preventCollision) return {
				...baseCompactor,
				preventCollision
			};
			return baseCompactor;
		}
		//#endregion
		//#region node_modules/.pnpm/fast-equals@4.0.3/node_modules/fast-equals/dist/fast-equals.cjs.js
		var require_fast_equals_cjs = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			/**
			* Default equality comparator pass-through, used as the standard `isEqual` creator for
			* use inside the built comparator.
			*/
			function createDefaultIsNestedEqual(comparator) {
				return function isEqual(a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, meta) {
					return comparator(a, b, meta);
				};
			}
			/**
			* Wrap the provided `areItemsEqual` method to manage the circular cache, allowing
			* for circular references to be safely included in the comparison without creating
			* stack overflows.
			*/
			function createIsCircular(areItemsEqual) {
				return function isCircular(a, b, isEqual, cache) {
					if (!a || !b || typeof a !== "object" || typeof b !== "object") return areItemsEqual(a, b, isEqual, cache);
					var cachedA = cache.get(a);
					var cachedB = cache.get(b);
					if (cachedA && cachedB) return cachedA === b && cachedB === a;
					cache.set(a, b);
					cache.set(b, a);
					var result = areItemsEqual(a, b, isEqual, cache);
					cache.delete(a);
					cache.delete(b);
					return result;
				};
			}
			/**
			* Targeted shallow merge of two objects.
			*
			* @NOTE
			* This exists as a tinier compiled version of the `__assign` helper that
			* `tsc` injects in case of `Object.assign` not being present.
			*/
			function merge(a, b) {
				var merged = {};
				for (var key in a) merged[key] = a[key];
				for (var key in b) merged[key] = b[key];
				return merged;
			}
			/**
			* Whether the value is a plain object.
			*
			* @NOTE
			* This is a same-realm compariosn only.
			*/
			function isPlainObject(value) {
				return value.constructor === Object || value.constructor == null;
			}
			/**
			* When the value is `Promise`-like, aka "then-able".
			*/
			function isPromiseLike(value) {
				return typeof value.then === "function";
			}
			/**
			* Whether the values passed are strictly equal or both NaN.
			*/
			function sameValueZeroEqual(a, b) {
				return a === b || a !== a && b !== b;
			}
			var ARGUMENTS_TAG = "[object Arguments]";
			var BOOLEAN_TAG = "[object Boolean]";
			var DATE_TAG = "[object Date]";
			var REG_EXP_TAG = "[object RegExp]";
			var MAP_TAG = "[object Map]";
			var NUMBER_TAG = "[object Number]";
			var OBJECT_TAG = "[object Object]";
			var SET_TAG = "[object Set]";
			var STRING_TAG = "[object String]";
			var toString = Object.prototype.toString;
			function createComparator(_a) {
				var areArraysEqual = _a.areArraysEqual, areDatesEqual = _a.areDatesEqual, areMapsEqual = _a.areMapsEqual, areObjectsEqual = _a.areObjectsEqual, areRegExpsEqual = _a.areRegExpsEqual, areSetsEqual = _a.areSetsEqual, createIsNestedEqual = _a.createIsNestedEqual;
				var isEqual = createIsNestedEqual(comparator);
				/**
				* compare the value of the two objects and return true if they are equivalent in values
				*/
				function comparator(a, b, meta) {
					if (a === b) return true;
					if (!a || !b || typeof a !== "object" || typeof b !== "object") return a !== a && b !== b;
					if (isPlainObject(a) && isPlainObject(b)) return areObjectsEqual(a, b, isEqual, meta);
					var aArray = Array.isArray(a);
					var bArray = Array.isArray(b);
					if (aArray || bArray) return aArray === bArray && areArraysEqual(a, b, isEqual, meta);
					var aTag = toString.call(a);
					if (aTag !== toString.call(b)) return false;
					if (aTag === DATE_TAG) return areDatesEqual(a, b, isEqual, meta);
					if (aTag === REG_EXP_TAG) return areRegExpsEqual(a, b, isEqual, meta);
					if (aTag === MAP_TAG) return areMapsEqual(a, b, isEqual, meta);
					if (aTag === SET_TAG) return areSetsEqual(a, b, isEqual, meta);
					if (aTag === OBJECT_TAG || aTag === ARGUMENTS_TAG) return isPromiseLike(a) || isPromiseLike(b) ? false : areObjectsEqual(a, b, isEqual, meta);
					if (aTag === BOOLEAN_TAG || aTag === NUMBER_TAG || aTag === STRING_TAG) return sameValueZeroEqual(a.valueOf(), b.valueOf());
					return false;
				}
				return comparator;
			}
			/**
			* Whether the arrays are equal in value.
			*/
			function areArraysEqual(a, b, isEqual, meta) {
				var index = a.length;
				if (b.length !== index) return false;
				while (index-- > 0) if (!isEqual(a[index], b[index], index, index, a, b, meta)) return false;
				return true;
			}
			/**
			* Whether the arrays are equal in value, including circular references.
			*/
			var areArraysEqualCircular = createIsCircular(areArraysEqual);
			/**
			* Whether the dates passed are equal in value.
			*
			* @NOTE
			* This is a standalone function instead of done inline in the comparator
			* to allow for overrides.
			*/
			function areDatesEqual(a, b) {
				return sameValueZeroEqual(a.valueOf(), b.valueOf());
			}
			/**
			* Whether the `Map`s are equal in value.
			*/
			function areMapsEqual(a, b, isEqual, meta) {
				var isValueEqual = a.size === b.size;
				if (!isValueEqual) return false;
				if (!a.size) return true;
				var matchedIndices = {};
				var indexA = 0;
				a.forEach(function(aValue, aKey) {
					if (!isValueEqual) return;
					var hasMatch = false;
					var matchIndexB = 0;
					b.forEach(function(bValue, bKey) {
						if (!hasMatch && !matchedIndices[matchIndexB] && (hasMatch = isEqual(aKey, bKey, indexA, matchIndexB, a, b, meta) && isEqual(aValue, bValue, aKey, bKey, a, b, meta))) matchedIndices[matchIndexB] = true;
						matchIndexB++;
					});
					indexA++;
					isValueEqual = hasMatch;
				});
				return isValueEqual;
			}
			/**
			* Whether the `Map`s are equal in value, including circular references.
			*/
			var areMapsEqualCircular = createIsCircular(areMapsEqual);
			var OWNER = "_owner";
			var hasOwnProperty = Object.prototype.hasOwnProperty;
			/**
			* Whether the objects are equal in value.
			*/
			function areObjectsEqual(a, b, isEqual, meta) {
				var keysA = Object.keys(a);
				var index = keysA.length;
				if (Object.keys(b).length !== index) return false;
				var key;
				while (index-- > 0) {
					key = keysA[index];
					if (key === OWNER) {
						var reactElementA = !!a.$$typeof;
						var reactElementB = !!b.$$typeof;
						if ((reactElementA || reactElementB) && reactElementA !== reactElementB) return false;
					}
					if (!hasOwnProperty.call(b, key) || !isEqual(a[key], b[key], key, key, a, b, meta)) return false;
				}
				return true;
			}
			/**
			* Whether the objects are equal in value, including circular references.
			*/
			var areObjectsEqualCircular = createIsCircular(areObjectsEqual);
			/**
			* Whether the regexps passed are equal in value.
			*
			* @NOTE
			* This is a standalone function instead of done inline in the comparator
			* to allow for overrides. An example of this would be supporting a
			* pre-ES2015 environment where the `flags` property is not available.
			*/
			function areRegExpsEqual(a, b) {
				return a.source === b.source && a.flags === b.flags;
			}
			/**
			* Whether the `Set`s are equal in value.
			*/
			function areSetsEqual(a, b, isEqual, meta) {
				var isValueEqual = a.size === b.size;
				if (!isValueEqual) return false;
				if (!a.size) return true;
				var matchedIndices = {};
				a.forEach(function(aValue, aKey) {
					if (!isValueEqual) return;
					var hasMatch = false;
					var matchIndex = 0;
					b.forEach(function(bValue, bKey) {
						if (!hasMatch && !matchedIndices[matchIndex] && (hasMatch = isEqual(aValue, bValue, aKey, bKey, a, b, meta))) matchedIndices[matchIndex] = true;
						matchIndex++;
					});
					isValueEqual = hasMatch;
				});
				return isValueEqual;
			}
			/**
			* Whether the `Set`s are equal in value, including circular references.
			*/
			var areSetsEqualCircular = createIsCircular(areSetsEqual);
			var DEFAULT_CONFIG = Object.freeze({
				areArraysEqual,
				areDatesEqual,
				areMapsEqual,
				areObjectsEqual,
				areRegExpsEqual,
				areSetsEqual,
				createIsNestedEqual: createDefaultIsNestedEqual
			});
			var DEFAULT_CIRCULAR_CONFIG = Object.freeze({
				areArraysEqual: areArraysEqualCircular,
				areDatesEqual,
				areMapsEqual: areMapsEqualCircular,
				areObjectsEqual: areObjectsEqualCircular,
				areRegExpsEqual,
				areSetsEqual: areSetsEqualCircular,
				createIsNestedEqual: createDefaultIsNestedEqual
			});
			var isDeepEqual = createComparator(DEFAULT_CONFIG);
			/**
			* Whether the items passed are deeply-equal in value.
			*/
			function deepEqual(a, b) {
				return isDeepEqual(a, b, void 0);
			}
			createComparator(merge(DEFAULT_CONFIG, { createIsNestedEqual: function() {
				return sameValueZeroEqual;
			} }));
			createComparator(DEFAULT_CIRCULAR_CONFIG);
			createComparator(merge(DEFAULT_CIRCULAR_CONFIG, { createIsNestedEqual: function() {
				return sameValueZeroEqual;
			} }));
			exports.deepEqual = deepEqual;
		}));
		//#endregion
		//#region node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js
		/**
		* Copyright (c) 2013-present, Facebook, Inc.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_ReactPropTypesSecret = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
		}));
		//#endregion
		//#region node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithThrowingShims.js
		/**
		* Copyright (c) 2013-present, Facebook, Inc.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_factoryWithThrowingShims = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var ReactPropTypesSecret = require_ReactPropTypesSecret();
			function emptyFunction() {}
			function emptyFunctionWithReset() {}
			emptyFunctionWithReset.resetWarningCache = emptyFunction;
			module.exports = function() {
				function shim(props, propName, componentName, location, propFullName, secret) {
					if (secret === ReactPropTypesSecret) return;
					var err = /* @__PURE__ */ new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
					err.name = "Invariant Violation";
					throw err;
				}
				shim.isRequired = shim;
				function getShim() {
					return shim;
				}
				var ReactPropTypes = {
					array: shim,
					bigint: shim,
					bool: shim,
					func: shim,
					number: shim,
					object: shim,
					string: shim,
					symbol: shim,
					any: shim,
					arrayOf: getShim,
					element: shim,
					elementType: shim,
					instanceOf: getShim,
					node: shim,
					objectOf: getShim,
					oneOf: getShim,
					oneOfType: getShim,
					shape: getShim,
					exact: getShim,
					checkPropTypes: emptyFunctionWithReset,
					resetWarningCache: emptyFunction
				};
				ReactPropTypes.PropTypes = ReactPropTypes;
				return ReactPropTypes;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js
		var require_prop_types = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_factoryWithThrowingShims()();
		}));
		//#endregion
		//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region node_modules/.pnpm/react-draggable@4.7.2_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-draggable/build/cjs/chunk-ACOTSM7X.mjs
		var import_prop_types = /* @__PURE__ */ __toESM(require_prop_types(), 1);
		function findInArray(array, callback) {
			for (let i = 0, length = array.length; i < length; i++) if (callback.apply(callback, [
				array[i],
				i,
				array
			])) return array[i];
		}
		function isFunction(func) {
			return typeof func === "function" || Object.prototype.toString.call(func) === "[object Function]";
		}
		function isNum(num) {
			return typeof num === "number" && !isNaN(num);
		}
		function int(a) {
			return parseInt(a, 10);
		}
		function dontSetMe(props, propName, componentName) {
			if (props[propName]) return /* @__PURE__ */ new Error(`Invalid prop ${propName} passed to ${componentName} - do not set this, set it on the child.`);
		}
		var prefixes = [
			"Moz",
			"Webkit",
			"O",
			"ms"
		];
		function getPrefix(prop = "transform") {
			var _a, _b;
			if (typeof window === "undefined") return "";
			const style = (_b = (_a = window.document) == null ? void 0 : _a.documentElement) == null ? void 0 : _b.style;
			if (!style) return "";
			if (prop in style) return "";
			for (let i = 0; i < prefixes.length; i++) if (browserPrefixToKey(prop, prefixes[i]) in style) return prefixes[i];
			return "";
		}
		function browserPrefixToKey(prop, prefix) {
			return prefix ? `${prefix}${kebabToTitleCase(prop)}` : prop;
		}
		function kebabToTitleCase(str) {
			let out = "";
			let shouldCapitalize = true;
			for (let i = 0; i < str.length; i++) if (shouldCapitalize) {
				out += str[i].toUpperCase();
				shouldCapitalize = false;
			} else if (str[i] === "-") shouldCapitalize = true;
			else out += str[i];
			return out;
		}
		var getPrefix_default = getPrefix();
		var matchesSelectorFunc = "";
		function matchesSelector(el, selector) {
			var _a;
			if (!matchesSelectorFunc) matchesSelectorFunc = (_a = findInArray([
				"matches",
				"webkitMatchesSelector",
				"mozMatchesSelector",
				"msMatchesSelector",
				"oMatchesSelector"
			], function(method) {
				return isFunction(el[method]);
			})) != null ? _a : "";
			const matchFn = el[matchesSelectorFunc];
			if (!isFunction(matchFn)) return false;
			return Boolean(matchFn.call(el, selector));
		}
		function matchesSelectorAndParentsTo(el, selector, baseNode) {
			let node = el;
			do {
				if (matchesSelector(node, selector)) return true;
				if (node === baseNode) return false;
				node = node.parentNode;
			} while (node);
			return false;
		}
		function addEvent(el, event, handler, inputOptions) {
			if (!el) return;
			const options = {
				capture: true,
				...inputOptions
			};
			const listener = handler;
			if (el.addEventListener) el.addEventListener(event, listener, options);
			else if (el.attachEvent) el.attachEvent("on" + event, listener);
			else el["on" + event] = listener;
		}
		function removeEvent(el, event, handler, inputOptions) {
			if (!el) return;
			const options = {
				capture: true,
				...inputOptions
			};
			const listener = handler;
			if (el.removeEventListener) el.removeEventListener(event, listener, options);
			else if (el.detachEvent) el.detachEvent("on" + event, listener);
			else el["on" + event] = null;
		}
		function outerHeight(node) {
			let height = node.clientHeight;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			height += int(computedStyle.borderTopWidth);
			height += int(computedStyle.borderBottomWidth);
			return height;
		}
		function outerWidth(node) {
			let width = node.clientWidth;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			width += int(computedStyle.borderLeftWidth);
			width += int(computedStyle.borderRightWidth);
			return width;
		}
		function innerHeight(node) {
			let height = node.clientHeight;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			height -= int(computedStyle.paddingTop);
			height -= int(computedStyle.paddingBottom);
			return height;
		}
		function innerWidth(node) {
			let width = node.clientWidth;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			width -= int(computedStyle.paddingLeft);
			width -= int(computedStyle.paddingRight);
			return width;
		}
		function offsetXYFromParent(evt, offsetParent, scale) {
			const offsetParentRect = offsetParent === offsetParent.ownerDocument.body ? {
				left: 0,
				top: 0
			} : offsetParent.getBoundingClientRect();
			return {
				x: (evt.clientX + offsetParent.scrollLeft - offsetParentRect.left) / scale,
				y: (evt.clientY + offsetParent.scrollTop - offsetParentRect.top) / scale
			};
		}
		function createCSSTransform(controlPos, positionOffset) {
			const translation = getTranslation(controlPos, positionOffset, "px");
			return { [browserPrefixToKey("transform", getPrefix_default)]: translation };
		}
		function createSVGTransform(controlPos, positionOffset) {
			return getTranslation(controlPos, positionOffset, "");
		}
		function getTranslation({ x, y }, positionOffset, unitSuffix) {
			let translation = `translate(${x}${unitSuffix},${y}${unitSuffix})`;
			if (positionOffset) translation = `translate(${`${typeof positionOffset.x === "string" ? positionOffset.x : positionOffset.x + unitSuffix}`}, ${`${typeof positionOffset.y === "string" ? positionOffset.y : positionOffset.y + unitSuffix}`})` + translation;
			return translation;
		}
		function getTouch(e, identifier) {
			return e.targetTouches && findInArray(e.targetTouches, (t) => identifier === t.identifier) || e.changedTouches && findInArray(e.changedTouches, (t) => identifier === t.identifier);
		}
		function getTouchIdentifier(e) {
			if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier;
			if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier;
		}
		function getDefaultNonce() {
			return typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : void 0;
		}
		function addUserSelectStyles(doc, nonce) {
			if (!doc) return;
			let styleEl = doc.getElementById("react-draggable-style-el");
			if (!styleEl) {
				styleEl = doc.createElement("style");
				styleEl.type = "text/css";
				styleEl.id = "react-draggable-style-el";
				const resolvedNonce = nonce != null ? nonce : getDefaultNonce();
				if (resolvedNonce) styleEl.setAttribute("nonce", resolvedNonce);
				styleEl.innerHTML = ".react-draggable-transparent-selection *::-moz-selection {all: inherit;}\n";
				styleEl.innerHTML += ".react-draggable-transparent-selection *::selection {all: inherit;}\n";
				doc.getElementsByTagName("head")[0].appendChild(styleEl);
			}
			if (doc.body) addClassName(doc.body, "react-draggable-transparent-selection");
		}
		function scheduleRemoveUserSelectStyles(doc) {
			if (window.requestAnimationFrame) window.requestAnimationFrame(() => {
				removeUserSelectStyles(doc);
			});
			else removeUserSelectStyles(doc);
		}
		function removeUserSelectStyles(doc) {
			if (!doc) return;
			try {
				if (doc.body) removeClassName(doc.body, "react-draggable-transparent-selection");
				const ieSelection = doc.selection;
				if (ieSelection) ieSelection.empty();
				else {
					const selection = (doc.defaultView || window).getSelection();
					if (selection && selection.type !== "Caret") selection.removeAllRanges();
				}
			} catch {}
		}
		function addClassName(el, className) {
			if (el.classList) el.classList.add(className);
			else if (!el.className.match(new RegExp(`(?:^|\\s)${className}(?!\\S)`))) el.className += ` ${className}`;
		}
		function removeClassName(el, className) {
			if (el.classList) el.classList.remove(className);
			else el.className = el.className.replace(new RegExp(`(?:^|\\s)${className}(?!\\S)`, "g"), "");
		}
		function getBoundPosition(draggable, x, y) {
			if (!draggable.props.bounds) return [x, y];
			let { bounds } = draggable.props;
			bounds = typeof bounds === "string" ? bounds : cloneBounds(bounds);
			const node = findDOMNode(draggable);
			if (typeof bounds === "string") {
				const { ownerDocument } = node;
				const ownerWindow = ownerDocument.defaultView;
				if (!ownerWindow) throw new Error("Cannot resolve the owner window of the draggable node.");
				let boundNode;
				if (bounds === "parent") boundNode = node.parentNode;
				else boundNode = node.getRootNode().querySelector(bounds);
				if (!(boundNode instanceof ownerWindow.HTMLElement)) throw new Error("Bounds selector \"" + bounds + "\" could not find an element.");
				const boundNodeEl = boundNode;
				const nodeStyle = ownerWindow.getComputedStyle(node);
				const boundNodeStyle = ownerWindow.getComputedStyle(boundNodeEl);
				bounds = {
					left: -node.offsetLeft + int(boundNodeStyle.paddingLeft) + int(nodeStyle.marginLeft),
					top: -node.offsetTop + int(boundNodeStyle.paddingTop) + int(nodeStyle.marginTop),
					right: innerWidth(boundNodeEl) - outerWidth(node) - node.offsetLeft + int(boundNodeStyle.paddingRight) - int(nodeStyle.marginRight),
					bottom: innerHeight(boundNodeEl) - outerHeight(node) - node.offsetTop + int(boundNodeStyle.paddingBottom) - int(nodeStyle.marginBottom)
				};
			}
			if (isNum(bounds.right)) x = Math.min(x, bounds.right);
			if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom);
			if (isNum(bounds.left)) x = Math.max(x, bounds.left);
			if (isNum(bounds.top)) y = Math.max(y, bounds.top);
			return [x, y];
		}
		function snapToGrid(grid, pendingX, pendingY) {
			return [Math.round(pendingX / grid[0]) * grid[0], Math.round(pendingY / grid[1]) * grid[1]];
		}
		function canDragX(draggable) {
			return draggable.props.axis === "both" || draggable.props.axis === "x";
		}
		function canDragY(draggable) {
			return draggable.props.axis === "both" || draggable.props.axis === "y";
		}
		function getControlPosition(e, touchIdentifier, draggableCore) {
			const touchObj = typeof touchIdentifier === "number" ? getTouch(e, touchIdentifier) : null;
			if (typeof touchIdentifier === "number" && !touchObj) return null;
			const node = findDOMNode(draggableCore);
			const offsetParent = draggableCore.props.offsetParent || node.offsetParent || node.ownerDocument.body;
			return offsetXYFromParent(touchObj || e, offsetParent, draggableCore.props.scale);
		}
		function createCoreData(draggable, x, y) {
			const isStart = !isNum(draggable.lastX);
			const node = findDOMNode(draggable);
			if (isStart) return {
				node,
				deltaX: 0,
				deltaY: 0,
				lastX: x,
				lastY: y,
				x,
				y
			};
			else return {
				node,
				deltaX: x - draggable.lastX,
				deltaY: y - draggable.lastY,
				lastX: draggable.lastX,
				lastY: draggable.lastY,
				x,
				y
			};
		}
		function createDraggableData(draggable, coreData) {
			const scale = draggable.props.scale;
			return {
				node: coreData.node,
				x: draggable.state.x + coreData.deltaX / scale,
				y: draggable.state.y + coreData.deltaY / scale,
				deltaX: coreData.deltaX / scale,
				deltaY: coreData.deltaY / scale,
				lastX: draggable.state.x,
				lastY: draggable.state.y
			};
		}
		function cloneBounds(bounds) {
			return {
				left: bounds.left,
				top: bounds.top,
				right: bounds.right,
				bottom: bounds.bottom
			};
		}
		function findDOMNode(draggable) {
			const node = draggable.findDOMNode();
			if (!node) throw new Error("<DraggableCore>: Unmounted during event!");
			return node;
		}
		var log_default = typeof process !== "undefined" && process.env.DRAGGABLE_DEBUG ? console.log.bind(console) : function noop() {};
		var eventsFor = {
			touch: {
				start: "touchstart",
				move: "touchmove",
				stop: "touchend"
			},
			mouse: {
				start: "mousedown",
				move: "mousemove",
				stop: "mouseup"
			}
		};
		var dragEventFor = eventsFor.mouse;
		var DraggableCore = class extends react.Component {
			constructor() {
				super(...arguments);
				this.dragging = false;
				this.lastX = NaN;
				this.lastY = NaN;
				this.touchIdentifier = null;
				this.mounted = false;
				this.handleDragStart = (e) => {
					this.props.onMouseDown(e);
					if (!this.props.allowAnyClick && (typeof e.button === "number" && e.button !== 0 || e.ctrlKey)) return false;
					const thisNode = this.findDOMNode();
					if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) throw new Error("<DraggableCore> not mounted on DragStart!");
					const { ownerDocument } = thisNode;
					if (this.props.disabled || !(e.target instanceof ownerDocument.defaultView.Node) || this.props.handle && !matchesSelectorAndParentsTo(e.target, this.props.handle, thisNode) || this.props.cancel && matchesSelectorAndParentsTo(e.target, this.props.cancel, thisNode)) return;
					if (e.type === "touchstart" && !this.props.allowMobileScroll) e.preventDefault();
					const touchIdentifier = getTouchIdentifier(e);
					this.touchIdentifier = touchIdentifier;
					const position = getControlPosition(e, touchIdentifier, this);
					if (position == null) return;
					const { x, y } = position;
					const coreEvent = createCoreData(this, x, y);
					log_default("DraggableCore: handleDragStart: %j", coreEvent);
					log_default("calling", this.props.onStart);
					if (this.props.onStart(e, coreEvent) === false || this.mounted === false) return;
					if (this.props.enableUserSelectHack) addUserSelectStyles(ownerDocument, this.props.nonce);
					this.dragging = true;
					this.lastX = x;
					this.lastY = y;
					addEvent(ownerDocument, dragEventFor.move, this.handleDrag);
					addEvent(ownerDocument, dragEventFor.stop, this.handleDragStop);
				};
				this.handleDrag = (e) => {
					const position = getControlPosition(e, this.touchIdentifier, this);
					if (position == null) return;
					let { x, y } = position;
					if (Array.isArray(this.props.grid)) {
						let deltaX = x - this.lastX, deltaY = y - this.lastY;
						[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
						if (!deltaX && !deltaY) return;
						x = this.lastX + deltaX;
						y = this.lastY + deltaY;
					}
					const coreEvent = createCoreData(this, x, y);
					log_default("DraggableCore: handleDrag: %j", coreEvent);
					if (this.props.onDrag(e, coreEvent) === false || this.mounted === false) {
						try {
							this.handleDragStop(new MouseEvent("mouseup"));
						} catch {
							const event = document.createEvent("MouseEvents");
							event.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
							this.handleDragStop(event);
						}
						return;
					}
					this.lastX = x;
					this.lastY = y;
				};
				this.handleDragStop = (e) => {
					if (!this.dragging) return;
					const position = getControlPosition(e, this.touchIdentifier, this);
					if (position == null) return;
					let { x, y } = position;
					if (Array.isArray(this.props.grid)) {
						let deltaX = x - this.lastX || 0;
						let deltaY = y - this.lastY || 0;
						[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
						x = this.lastX + deltaX;
						y = this.lastY + deltaY;
					}
					const coreEvent = createCoreData(this, x, y);
					if (this.props.onStop(e, coreEvent) === false || this.mounted === false) return false;
					const thisNode = this.findDOMNode();
					if (thisNode) {
						if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(thisNode.ownerDocument);
					}
					log_default("DraggableCore: handleDragStop: %j", coreEvent);
					this.dragging = false;
					this.lastX = NaN;
					this.lastY = NaN;
					if (thisNode) {
						log_default("DraggableCore: Removing handlers");
						removeEvent(thisNode.ownerDocument, dragEventFor.move, this.handleDrag);
						removeEvent(thisNode.ownerDocument, dragEventFor.stop, this.handleDragStop);
					}
				};
				this.onMouseDown = (e) => {
					dragEventFor = eventsFor.mouse;
					return this.handleDragStart(e);
				};
				this.onMouseUp = (e) => {
					dragEventFor = eventsFor.mouse;
					return this.handleDragStop(e);
				};
				this.onTouchStart = (e) => {
					dragEventFor = eventsFor.touch;
					return this.handleDragStart(e);
				};
				this.onTouchEnd = (e) => {
					dragEventFor = eventsFor.touch;
					return this.handleDragStop(e);
				};
			}
			componentDidMount() {
				this.mounted = true;
				const thisNode = this.findDOMNode();
				if (thisNode) addEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
			}
			componentWillUnmount() {
				this.mounted = false;
				const thisNode = this.findDOMNode();
				if (thisNode) {
					const { ownerDocument } = thisNode;
					removeEvent(ownerDocument, eventsFor.mouse.move, this.handleDrag);
					removeEvent(ownerDocument, eventsFor.touch.move, this.handleDrag);
					removeEvent(ownerDocument, eventsFor.mouse.stop, this.handleDragStop);
					removeEvent(ownerDocument, eventsFor.touch.stop, this.handleDragStop);
					removeEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
					if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(ownerDocument);
				}
			}
			findDOMNode() {
				var _a;
				if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
				const legacyReactDOM = react_dom.default;
				if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
				log_default("react-draggable: ReactDOM.findDOMNode is not available in React 19+. You must provide a nodeRef prop. See: https://github.com/react-grid-layout/react-draggable#noderef");
				return null;
			}
			render() {
				return react.cloneElement(react.Children.only(this.props.children), {
					onMouseDown: this.onMouseDown,
					onMouseUp: this.onMouseUp,
					onTouchEnd: this.onTouchEnd
				});
			}
		};
		DraggableCore.displayName = "DraggableCore";
		DraggableCore.propTypes = {
			/**
			* `allowAnyClick` allows dragging using any mouse button.
			* By default, we only accept the left button.
			*
			* Defaults to `false`.
			*/
			allowAnyClick: import_prop_types.default.bool,
			/**
			* `allowMobileScroll` turns off cancellation of the 'touchstart' event
			* on mobile devices. Only enable this if you are having trouble with click
			* events. Prefer using 'handle' / 'cancel' instead.
			*
			* Defaults to `false`.
			*/
			allowMobileScroll: import_prop_types.default.bool,
			children: import_prop_types.default.node.isRequired,
			/**
			* `disabled`, if true, stops the <Draggable> from dragging. All handlers,
			* with the exception of `onMouseDown`, will not fire.
			*/
			disabled: import_prop_types.default.bool,
			/**
			* By default, we add 'user-select:none' attributes to the document body
			* to prevent ugly text selection during drag. If this is causing problems
			* for your app, set this to `false`.
			*/
			enableUserSelectHack: import_prop_types.default.bool,
			/**
			* `offsetParent`, if set, uses the passed DOM node to compute drag offsets
			* instead of using the parent node.
			*/
			offsetParent: function(props, propName) {
				if (props[propName] && props[propName].nodeType !== 1) throw new Error("Draggable's offsetParent must be a DOM Node.");
			},
			/**
			* `grid` specifies the x and y that dragging should snap to.
			*/
			grid: import_prop_types.default.arrayOf(import_prop_types.default.number),
			/**
			* `handle` specifies a selector to be used as the handle that initiates drag.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*         return (
			*            <Draggable handle=".handle">
			*              <div>
			*                  <div className="handle">Click me to drag</div>
			*                  <div>This is some other content</div>
			*              </div>
			*           </Draggable>
			*         );
			*       }
			*   });
			* ```
			*/
			handle: import_prop_types.default.string,
			/**
			* `cancel` specifies a selector to be used to prevent drag initialization.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*           return(
			*               <Draggable cancel=".cancel">
			*                   <div>
			*                     <div className="cancel">You can't drag from here</div>
			*                     <div>Dragging here works fine</div>
			*                   </div>
			*               </Draggable>
			*           );
			*       }
			*   });
			* ```
			*/
			cancel: import_prop_types.default.string,
			nodeRef: import_prop_types.default.object,
			/**
			* `nonce` is applied to the dynamically-injected <style> element used by the
			* user-select hack, so it isn't blocked under a strict Content Security
			* Policy (`style-src` without `'unsafe-inline'`). If omitted, webpack's
			* `__webpack_nonce__` global is used when available.
			*/
			nonce: import_prop_types.default.string,
			/**
			* Called when dragging starts.
			* If this function returns the boolean false, dragging will be canceled.
			*/
			onStart: import_prop_types.default.func,
			/**
			* Called while dragging.
			* If this function returns the boolean false, dragging will be canceled.
			*/
			onDrag: import_prop_types.default.func,
			/**
			* Called when dragging stops.
			* If this function returns the boolean false, the drag will remain active.
			*/
			onStop: import_prop_types.default.func,
			/**
			* A workaround option which can be passed if onMouseDown needs to be accessed,
			* since it'll always be blocked (as there is internal use of onMouseDown)
			*/
			onMouseDown: import_prop_types.default.func,
			/**
			* `scale`, if set, applies scaling while dragging an element
			*/
			scale: import_prop_types.default.number,
			/**
			* These properties should be defined on the child, not here.
			*/
			className: dontSetMe,
			style: dontSetMe,
			transform: dontSetMe
		};
		DraggableCore.defaultProps = {
			allowAnyClick: false,
			allowMobileScroll: false,
			disabled: false,
			enableUserSelectHack: true,
			onStart: function() {},
			onDrag: function() {},
			onStop: function() {},
			onMouseDown: function() {},
			scale: 1
		};
		var Draggable = class extends react.Component {
			constructor(props) {
				super(props);
				this.onDragStart = (e, coreData) => {
					log_default("Draggable: onDragStart: %j", coreData);
					if (this.props.onStart(e, createDraggableData(this, coreData)) === false) return false;
					this.setState({
						dragging: true,
						dragged: true
					});
				};
				this.onDrag = (e, coreData) => {
					if (!this.state.dragging) return false;
					log_default("Draggable: onDrag: %j", coreData);
					const uiData = createDraggableData(this, coreData);
					const newState = {
						x: uiData.x,
						y: uiData.y,
						slackX: 0,
						slackY: 0
					};
					if (this.props.bounds) {
						const { x, y } = newState;
						newState.x += this.state.slackX;
						newState.y += this.state.slackY;
						const [newStateX, newStateY] = getBoundPosition(this, newState.x, newState.y);
						newState.x = newStateX;
						newState.y = newStateY;
						newState.slackX = this.state.slackX + (x - newState.x);
						newState.slackY = this.state.slackY + (y - newState.y);
						uiData.x = newState.x;
						uiData.y = newState.y;
						uiData.deltaX = newState.x - this.state.x;
						uiData.deltaY = newState.y - this.state.y;
					}
					if (this.props.onDrag(e, uiData) === false) return false;
					this.setState(newState);
				};
				this.onDragStop = (e, coreData) => {
					if (!this.state.dragging) return false;
					if (this.props.onStop(e, createDraggableData(this, coreData)) === false) return false;
					log_default("Draggable: onDragStop: %j", coreData);
					const newState = {
						dragging: false,
						slackX: 0,
						slackY: 0
					};
					if (Boolean(this.props.position)) {
						const { x, y } = this.props.position;
						newState.x = x;
						newState.y = y;
					}
					this.setState(newState);
				};
				this.state = {
					dragging: false,
					dragged: false,
					x: props.position ? props.position.x : props.defaultPosition.x,
					y: props.position ? props.position.y : props.defaultPosition.y,
					prevPropsPosition: { ...props.position },
					slackX: 0,
					slackY: 0,
					isElementSVG: false
				};
				if (props.position && !(props.onDrag || props.onStop)) console.warn("A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.");
			}
			static getDerivedStateFromProps({ position }, { prevPropsPosition }) {
				if (position && (!prevPropsPosition || position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y)) {
					log_default("Draggable: getDerivedStateFromProps %j", {
						position,
						prevPropsPosition
					});
					return {
						x: position.x,
						y: position.y,
						prevPropsPosition: { ...position }
					};
				}
				return null;
			}
			componentDidMount() {
				if (typeof window.SVGElement !== "undefined" && this.findDOMNode() instanceof window.SVGElement) this.setState({ isElementSVG: true });
			}
			componentWillUnmount() {
				if (this.state.dragging) this.setState({ dragging: false });
			}
			findDOMNode() {
				var _a;
				if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
				const legacyReactDOM = react_dom.default;
				if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
				return null;
			}
			render() {
				const { axis, bounds, children, defaultPosition, defaultClassName, defaultClassNameDragging, defaultClassNameDragged, position, positionOffset, scale, ...draggableCoreProps } = this.props;
				let style = {};
				let svgTransform = null;
				const draggable = !Boolean(position) || this.state.dragging;
				const validPosition = position || defaultPosition;
				const transformOpts = {
					x: canDragX(this) && draggable ? this.state.x : validPosition.x,
					y: canDragY(this) && draggable ? this.state.y : validPosition.y
				};
				if (this.state.isElementSVG) svgTransform = createSVGTransform(transformOpts, positionOffset);
				else style = createCSSTransform(transformOpts, positionOffset);
				const onlyChild = react.Children.only(children);
				const className = clsx(onlyChild.props.className || "", defaultClassName, {
					[defaultClassNameDragging]: this.state.dragging,
					[defaultClassNameDragged]: this.state.dragged
				});
				return /* @__PURE__ */ react.createElement(DraggableCore, {
					...draggableCoreProps,
					onStart: this.onDragStart,
					onDrag: this.onDrag,
					onStop: this.onDragStop
				}, react.cloneElement(onlyChild, {
					className,
					style: {
						...onlyChild.props.style,
						...style
					},
					transform: svgTransform
				}));
			}
		};
		Draggable.displayName = "Draggable";
		Draggable.propTypes = {
			...DraggableCore.propTypes,
			/**
			* `axis` determines which axis the draggable can move.
			*
			*  Note that all callbacks will still return data as normal. This only
			*  controls flushing to the DOM.
			*
			* 'both' allows movement horizontally and vertically.
			* 'x' limits movement to horizontal axis.
			* 'y' limits movement to vertical axis.
			* 'none' limits all movement.
			*
			* Defaults to 'both'.
			*/
			axis: import_prop_types.default.oneOf([
				"both",
				"x",
				"y",
				"none"
			]),
			/**
			* `bounds` determines the range of movement available to the element.
			* Available values are:
			*
			* 'parent' restricts movement within the Draggable's parent node.
			*
			* Alternatively, pass an object with the following properties, all of which are optional:
			*
			* {left: LEFT_BOUND, right: RIGHT_BOUND, bottom: BOTTOM_BOUND, top: TOP_BOUND}
			*
			* All values are in px.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*         return (
			*            <Draggable bounds={{right: 300, bottom: 300}}>
			*              <div>Content</div>
			*           </Draggable>
			*         );
			*       }
			*   });
			* ```
			*/
			bounds: import_prop_types.default.oneOfType([
				import_prop_types.default.shape({
					left: import_prop_types.default.number,
					right: import_prop_types.default.number,
					top: import_prop_types.default.number,
					bottom: import_prop_types.default.number
				}),
				import_prop_types.default.string,
				import_prop_types.default.oneOf([false])
			]),
			defaultClassName: import_prop_types.default.string,
			defaultClassNameDragging: import_prop_types.default.string,
			defaultClassNameDragged: import_prop_types.default.string,
			/**
			* `defaultPosition` specifies the x and y that the dragged item should start at
			*
			* Example:
			*
			* ```jsx
			*      let App = React.createClass({
			*          render: function () {
			*              return (
			*                  <Draggable defaultPosition={{x: 25, y: 25}}>
			*                      <div>I start with transformX: 25px and transformY: 25px;</div>
			*                  </Draggable>
			*              );
			*          }
			*      });
			* ```
			*/
			defaultPosition: import_prop_types.default.shape({
				x: import_prop_types.default.number,
				y: import_prop_types.default.number
			}),
			positionOffset: import_prop_types.default.shape({
				x: import_prop_types.default.oneOfType([import_prop_types.default.number, import_prop_types.default.string]),
				y: import_prop_types.default.oneOfType([import_prop_types.default.number, import_prop_types.default.string])
			}),
			/**
			* `position`, if present, defines the current position of the element.
			*
			*  This is similar to how form elements in React work - if no `position` is supplied, the component
			*  is uncontrolled.
			*
			* Example:
			*
			* ```jsx
			*      let App = React.createClass({
			*          render: function () {
			*              return (
			*                  <Draggable position={{x: 25, y: 25}}>
			*                      <div>I start with transformX: 25px and transformY: 25px;</div>
			*                  </Draggable>
			*              );
			*          }
			*      });
			* ```
			*/
			position: import_prop_types.default.shape({
				x: import_prop_types.default.number,
				y: import_prop_types.default.number
			}),
			/**
			* These properties should be defined on the child, not here.
			*/
			className: dontSetMe,
			style: dontSetMe,
			transform: dontSetMe
		};
		Draggable.defaultProps = {
			...DraggableCore.defaultProps,
			axis: "both",
			bounds: false,
			defaultClassName: "react-draggable",
			defaultClassNameDragging: "react-draggable-dragging",
			defaultClassNameDragged: "react-draggable-dragged",
			defaultPosition: {
				x: 0,
				y: 0
			},
			scale: 1
		};
		//#endregion
		//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.js
		var require_clsx = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			function r(e) {
				var o, t, f = "";
				if ("string" == typeof e || "number" == typeof e) f += e;
				else if ("object" == typeof e) if (Array.isArray(e)) {
					var n = e.length;
					for (o = 0; o < n; o++) e[o] && (t = r(e[o])) && (f && (f += " "), f += t);
				} else for (t in e) e[t] && (f && (f += " "), f += t);
				return f;
			}
			function e() {
				for (var e, o, t = 0, f = "", n = arguments.length; t < n; t++) (e = arguments[t]) && (o = r(e)) && (f && (f += " "), f += o);
				return f;
			}
			module.exports = e, module.exports.clsx = e;
		}));
		//#endregion
		//#region node_modules/.pnpm/react-draggable@4.7.2_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-draggable/build/cjs/Draggable.js
		var require_Draggable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var __create = Object.create;
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __getProtoOf = Object.getPrototypeOf;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __export = (target, all) => {
				for (var name in all) __defProp(target, name, {
					get: all[name],
					enumerable: true
				});
			};
			var __copyProps = (to, from, except, desc) => {
				if (from && typeof from === "object" || typeof from === "function") {
					for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
						get: () => from[key],
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
				return to;
			};
			var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
				value: mod,
				enumerable: true
			}) : target, mod));
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
			var Draggable_exports = {};
			__export(Draggable_exports, {
				DraggableCore: () => DraggableCore,
				default: () => Draggable
			});
			module.exports = __toCommonJS(Draggable_exports);
			var React2$1 = __toESM(require("react"));
			var import_prop_types2 = __toESM(require_prop_types());
			var import_react_dom2 = __toESM(require("react-dom"));
			var import_clsx = require_clsx();
			function findInArray(array, callback) {
				for (let i = 0, length = array.length; i < length; i++) if (callback.apply(callback, [
					array[i],
					i,
					array
				])) return array[i];
			}
			function isFunction(func) {
				return typeof func === "function" || Object.prototype.toString.call(func) === "[object Function]";
			}
			function isNum(num) {
				return typeof num === "number" && !isNaN(num);
			}
			function int(a) {
				return parseInt(a, 10);
			}
			function dontSetMe(props, propName, componentName) {
				if (props[propName]) return /* @__PURE__ */ new Error(`Invalid prop ${propName} passed to ${componentName} - do not set this, set it on the child.`);
			}
			var prefixes = [
				"Moz",
				"Webkit",
				"O",
				"ms"
			];
			function getPrefix(prop = "transform") {
				var _a, _b;
				if (typeof window === "undefined") return "";
				const style = (_b = (_a = window.document) == null ? void 0 : _a.documentElement) == null ? void 0 : _b.style;
				if (!style) return "";
				if (prop in style) return "";
				for (let i = 0; i < prefixes.length; i++) if (browserPrefixToKey(prop, prefixes[i]) in style) return prefixes[i];
				return "";
			}
			function browserPrefixToKey(prop, prefix) {
				return prefix ? `${prefix}${kebabToTitleCase(prop)}` : prop;
			}
			function kebabToTitleCase(str) {
				let out = "";
				let shouldCapitalize = true;
				for (let i = 0; i < str.length; i++) if (shouldCapitalize) {
					out += str[i].toUpperCase();
					shouldCapitalize = false;
				} else if (str[i] === "-") shouldCapitalize = true;
				else out += str[i];
				return out;
			}
			var getPrefix_default = getPrefix();
			var matchesSelectorFunc = "";
			function matchesSelector(el, selector) {
				var _a;
				if (!matchesSelectorFunc) matchesSelectorFunc = (_a = findInArray([
					"matches",
					"webkitMatchesSelector",
					"mozMatchesSelector",
					"msMatchesSelector",
					"oMatchesSelector"
				], function(method) {
					return isFunction(el[method]);
				})) != null ? _a : "";
				const matchFn = el[matchesSelectorFunc];
				if (!isFunction(matchFn)) return false;
				return Boolean(matchFn.call(el, selector));
			}
			function matchesSelectorAndParentsTo(el, selector, baseNode) {
				let node = el;
				do {
					if (matchesSelector(node, selector)) return true;
					if (node === baseNode) return false;
					node = node.parentNode;
				} while (node);
				return false;
			}
			function addEvent(el, event, handler, inputOptions) {
				if (!el) return;
				const options = {
					capture: true,
					...inputOptions
				};
				const listener = handler;
				if (el.addEventListener) el.addEventListener(event, listener, options);
				else if (el.attachEvent) el.attachEvent("on" + event, listener);
				else el["on" + event] = listener;
			}
			function removeEvent(el, event, handler, inputOptions) {
				if (!el) return;
				const options = {
					capture: true,
					...inputOptions
				};
				const listener = handler;
				if (el.removeEventListener) el.removeEventListener(event, listener, options);
				else if (el.detachEvent) el.detachEvent("on" + event, listener);
				else el["on" + event] = null;
			}
			function outerHeight(node) {
				let height = node.clientHeight;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				height += int(computedStyle.borderTopWidth);
				height += int(computedStyle.borderBottomWidth);
				return height;
			}
			function outerWidth(node) {
				let width = node.clientWidth;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				width += int(computedStyle.borderLeftWidth);
				width += int(computedStyle.borderRightWidth);
				return width;
			}
			function innerHeight(node) {
				let height = node.clientHeight;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				height -= int(computedStyle.paddingTop);
				height -= int(computedStyle.paddingBottom);
				return height;
			}
			function innerWidth(node) {
				let width = node.clientWidth;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				width -= int(computedStyle.paddingLeft);
				width -= int(computedStyle.paddingRight);
				return width;
			}
			function offsetXYFromParent(evt, offsetParent, scale) {
				const offsetParentRect = offsetParent === offsetParent.ownerDocument.body ? {
					left: 0,
					top: 0
				} : offsetParent.getBoundingClientRect();
				return {
					x: (evt.clientX + offsetParent.scrollLeft - offsetParentRect.left) / scale,
					y: (evt.clientY + offsetParent.scrollTop - offsetParentRect.top) / scale
				};
			}
			function createCSSTransform(controlPos, positionOffset) {
				const translation = getTranslation(controlPos, positionOffset, "px");
				return { [browserPrefixToKey("transform", getPrefix_default)]: translation };
			}
			function createSVGTransform(controlPos, positionOffset) {
				return getTranslation(controlPos, positionOffset, "");
			}
			function getTranslation({ x, y }, positionOffset, unitSuffix) {
				let translation = `translate(${x}${unitSuffix},${y}${unitSuffix})`;
				if (positionOffset) translation = `translate(${`${typeof positionOffset.x === "string" ? positionOffset.x : positionOffset.x + unitSuffix}`}, ${`${typeof positionOffset.y === "string" ? positionOffset.y : positionOffset.y + unitSuffix}`})` + translation;
				return translation;
			}
			function getTouch(e, identifier) {
				return e.targetTouches && findInArray(e.targetTouches, (t) => identifier === t.identifier) || e.changedTouches && findInArray(e.changedTouches, (t) => identifier === t.identifier);
			}
			function getTouchIdentifier(e) {
				if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier;
				if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier;
			}
			function getDefaultNonce() {
				return typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : void 0;
			}
			function addUserSelectStyles(doc, nonce) {
				if (!doc) return;
				let styleEl = doc.getElementById("react-draggable-style-el");
				if (!styleEl) {
					styleEl = doc.createElement("style");
					styleEl.type = "text/css";
					styleEl.id = "react-draggable-style-el";
					const resolvedNonce = nonce != null ? nonce : getDefaultNonce();
					if (resolvedNonce) styleEl.setAttribute("nonce", resolvedNonce);
					styleEl.innerHTML = ".react-draggable-transparent-selection *::-moz-selection {all: inherit;}\n";
					styleEl.innerHTML += ".react-draggable-transparent-selection *::selection {all: inherit;}\n";
					doc.getElementsByTagName("head")[0].appendChild(styleEl);
				}
				if (doc.body) addClassName(doc.body, "react-draggable-transparent-selection");
			}
			function scheduleRemoveUserSelectStyles(doc) {
				if (window.requestAnimationFrame) window.requestAnimationFrame(() => {
					removeUserSelectStyles(doc);
				});
				else removeUserSelectStyles(doc);
			}
			function removeUserSelectStyles(doc) {
				if (!doc) return;
				try {
					if (doc.body) removeClassName(doc.body, "react-draggable-transparent-selection");
					const ieSelection = doc.selection;
					if (ieSelection) ieSelection.empty();
					else {
						const selection = (doc.defaultView || window).getSelection();
						if (selection && selection.type !== "Caret") selection.removeAllRanges();
					}
				} catch {}
			}
			function addClassName(el, className) {
				if (el.classList) el.classList.add(className);
				else if (!el.className.match(new RegExp(`(?:^|\\s)${className}(?!\\S)`))) el.className += ` ${className}`;
			}
			function removeClassName(el, className) {
				if (el.classList) el.classList.remove(className);
				else el.className = el.className.replace(new RegExp(`(?:^|\\s)${className}(?!\\S)`, "g"), "");
			}
			function getBoundPosition(draggable, x, y) {
				if (!draggable.props.bounds) return [x, y];
				let { bounds } = draggable.props;
				bounds = typeof bounds === "string" ? bounds : cloneBounds(bounds);
				const node = findDOMNode(draggable);
				if (typeof bounds === "string") {
					const { ownerDocument } = node;
					const ownerWindow = ownerDocument.defaultView;
					if (!ownerWindow) throw new Error("Cannot resolve the owner window of the draggable node.");
					let boundNode;
					if (bounds === "parent") boundNode = node.parentNode;
					else boundNode = node.getRootNode().querySelector(bounds);
					if (!(boundNode instanceof ownerWindow.HTMLElement)) throw new Error("Bounds selector \"" + bounds + "\" could not find an element.");
					const boundNodeEl = boundNode;
					const nodeStyle = ownerWindow.getComputedStyle(node);
					const boundNodeStyle = ownerWindow.getComputedStyle(boundNodeEl);
					bounds = {
						left: -node.offsetLeft + int(boundNodeStyle.paddingLeft) + int(nodeStyle.marginLeft),
						top: -node.offsetTop + int(boundNodeStyle.paddingTop) + int(nodeStyle.marginTop),
						right: innerWidth(boundNodeEl) - outerWidth(node) - node.offsetLeft + int(boundNodeStyle.paddingRight) - int(nodeStyle.marginRight),
						bottom: innerHeight(boundNodeEl) - outerHeight(node) - node.offsetTop + int(boundNodeStyle.paddingBottom) - int(nodeStyle.marginBottom)
					};
				}
				if (isNum(bounds.right)) x = Math.min(x, bounds.right);
				if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom);
				if (isNum(bounds.left)) x = Math.max(x, bounds.left);
				if (isNum(bounds.top)) y = Math.max(y, bounds.top);
				return [x, y];
			}
			function snapToGrid(grid, pendingX, pendingY) {
				return [Math.round(pendingX / grid[0]) * grid[0], Math.round(pendingY / grid[1]) * grid[1]];
			}
			function canDragX(draggable) {
				return draggable.props.axis === "both" || draggable.props.axis === "x";
			}
			function canDragY(draggable) {
				return draggable.props.axis === "both" || draggable.props.axis === "y";
			}
			function getControlPosition(e, touchIdentifier, draggableCore) {
				const touchObj = typeof touchIdentifier === "number" ? getTouch(e, touchIdentifier) : null;
				if (typeof touchIdentifier === "number" && !touchObj) return null;
				const node = findDOMNode(draggableCore);
				const offsetParent = draggableCore.props.offsetParent || node.offsetParent || node.ownerDocument.body;
				return offsetXYFromParent(touchObj || e, offsetParent, draggableCore.props.scale);
			}
			function createCoreData(draggable, x, y) {
				const isStart = !isNum(draggable.lastX);
				const node = findDOMNode(draggable);
				if (isStart) return {
					node,
					deltaX: 0,
					deltaY: 0,
					lastX: x,
					lastY: y,
					x,
					y
				};
				else return {
					node,
					deltaX: x - draggable.lastX,
					deltaY: y - draggable.lastY,
					lastX: draggable.lastX,
					lastY: draggable.lastY,
					x,
					y
				};
			}
			function createDraggableData(draggable, coreData) {
				const scale = draggable.props.scale;
				return {
					node: coreData.node,
					x: draggable.state.x + coreData.deltaX / scale,
					y: draggable.state.y + coreData.deltaY / scale,
					deltaX: coreData.deltaX / scale,
					deltaY: coreData.deltaY / scale,
					lastX: draggable.state.x,
					lastY: draggable.state.y
				};
			}
			function cloneBounds(bounds) {
				return {
					left: bounds.left,
					top: bounds.top,
					right: bounds.right,
					bottom: bounds.bottom
				};
			}
			function findDOMNode(draggable) {
				const node = draggable.findDOMNode();
				if (!node) throw new Error("<DraggableCore>: Unmounted during event!");
				return node;
			}
			var React$2 = __toESM(require("react"));
			var import_prop_types = __toESM(require_prop_types());
			var import_react_dom = __toESM(require("react-dom"));
			var log_default = typeof process !== "undefined" && process.env.DRAGGABLE_DEBUG ? console.log.bind(console) : function noop() {};
			var eventsFor = {
				touch: {
					start: "touchstart",
					move: "touchmove",
					stop: "touchend"
				},
				mouse: {
					start: "mousedown",
					move: "mousemove",
					stop: "mouseup"
				}
			};
			var dragEventFor = eventsFor.mouse;
			var DraggableCore = class extends React$2.Component {
				constructor() {
					super(...arguments);
					this.dragging = false;
					this.lastX = NaN;
					this.lastY = NaN;
					this.touchIdentifier = null;
					this.mounted = false;
					this.handleDragStart = (e) => {
						this.props.onMouseDown(e);
						if (!this.props.allowAnyClick && (typeof e.button === "number" && e.button !== 0 || e.ctrlKey)) return false;
						const thisNode = this.findDOMNode();
						if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) throw new Error("<DraggableCore> not mounted on DragStart!");
						const { ownerDocument } = thisNode;
						if (this.props.disabled || !(e.target instanceof ownerDocument.defaultView.Node) || this.props.handle && !matchesSelectorAndParentsTo(e.target, this.props.handle, thisNode) || this.props.cancel && matchesSelectorAndParentsTo(e.target, this.props.cancel, thisNode)) return;
						if (e.type === "touchstart" && !this.props.allowMobileScroll) e.preventDefault();
						const touchIdentifier = getTouchIdentifier(e);
						this.touchIdentifier = touchIdentifier;
						const position = getControlPosition(e, touchIdentifier, this);
						if (position == null) return;
						const { x, y } = position;
						const coreEvent = createCoreData(this, x, y);
						log_default("DraggableCore: handleDragStart: %j", coreEvent);
						log_default("calling", this.props.onStart);
						if (this.props.onStart(e, coreEvent) === false || this.mounted === false) return;
						if (this.props.enableUserSelectHack) addUserSelectStyles(ownerDocument, this.props.nonce);
						this.dragging = true;
						this.lastX = x;
						this.lastY = y;
						addEvent(ownerDocument, dragEventFor.move, this.handleDrag);
						addEvent(ownerDocument, dragEventFor.stop, this.handleDragStop);
					};
					this.handleDrag = (e) => {
						const position = getControlPosition(e, this.touchIdentifier, this);
						if (position == null) return;
						let { x, y } = position;
						if (Array.isArray(this.props.grid)) {
							let deltaX = x - this.lastX, deltaY = y - this.lastY;
							[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
							if (!deltaX && !deltaY) return;
							x = this.lastX + deltaX;
							y = this.lastY + deltaY;
						}
						const coreEvent = createCoreData(this, x, y);
						log_default("DraggableCore: handleDrag: %j", coreEvent);
						if (this.props.onDrag(e, coreEvent) === false || this.mounted === false) {
							try {
								this.handleDragStop(new MouseEvent("mouseup"));
							} catch {
								const event = document.createEvent("MouseEvents");
								event.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
								this.handleDragStop(event);
							}
							return;
						}
						this.lastX = x;
						this.lastY = y;
					};
					this.handleDragStop = (e) => {
						if (!this.dragging) return;
						const position = getControlPosition(e, this.touchIdentifier, this);
						if (position == null) return;
						let { x, y } = position;
						if (Array.isArray(this.props.grid)) {
							let deltaX = x - this.lastX || 0;
							let deltaY = y - this.lastY || 0;
							[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
							x = this.lastX + deltaX;
							y = this.lastY + deltaY;
						}
						const coreEvent = createCoreData(this, x, y);
						if (this.props.onStop(e, coreEvent) === false || this.mounted === false) return false;
						const thisNode = this.findDOMNode();
						if (thisNode) {
							if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(thisNode.ownerDocument);
						}
						log_default("DraggableCore: handleDragStop: %j", coreEvent);
						this.dragging = false;
						this.lastX = NaN;
						this.lastY = NaN;
						if (thisNode) {
							log_default("DraggableCore: Removing handlers");
							removeEvent(thisNode.ownerDocument, dragEventFor.move, this.handleDrag);
							removeEvent(thisNode.ownerDocument, dragEventFor.stop, this.handleDragStop);
						}
					};
					this.onMouseDown = (e) => {
						dragEventFor = eventsFor.mouse;
						return this.handleDragStart(e);
					};
					this.onMouseUp = (e) => {
						dragEventFor = eventsFor.mouse;
						return this.handleDragStop(e);
					};
					this.onTouchStart = (e) => {
						dragEventFor = eventsFor.touch;
						return this.handleDragStart(e);
					};
					this.onTouchEnd = (e) => {
						dragEventFor = eventsFor.touch;
						return this.handleDragStop(e);
					};
				}
				componentDidMount() {
					this.mounted = true;
					const thisNode = this.findDOMNode();
					if (thisNode) addEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
				}
				componentWillUnmount() {
					this.mounted = false;
					const thisNode = this.findDOMNode();
					if (thisNode) {
						const { ownerDocument } = thisNode;
						removeEvent(ownerDocument, eventsFor.mouse.move, this.handleDrag);
						removeEvent(ownerDocument, eventsFor.touch.move, this.handleDrag);
						removeEvent(ownerDocument, eventsFor.mouse.stop, this.handleDragStop);
						removeEvent(ownerDocument, eventsFor.touch.stop, this.handleDragStop);
						removeEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
						if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(ownerDocument);
					}
				}
				findDOMNode() {
					var _a;
					if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
					const legacyReactDOM = import_react_dom.default;
					if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
					log_default("react-draggable: ReactDOM.findDOMNode is not available in React 19+. You must provide a nodeRef prop. See: https://github.com/react-grid-layout/react-draggable#noderef");
					return null;
				}
				render() {
					return React$2.cloneElement(React$2.Children.only(this.props.children), {
						onMouseDown: this.onMouseDown,
						onMouseUp: this.onMouseUp,
						onTouchEnd: this.onTouchEnd
					});
				}
			};
			DraggableCore.displayName = "DraggableCore";
			DraggableCore.propTypes = {
				/**
				* `allowAnyClick` allows dragging using any mouse button.
				* By default, we only accept the left button.
				*
				* Defaults to `false`.
				*/
				allowAnyClick: import_prop_types.default.bool,
				/**
				* `allowMobileScroll` turns off cancellation of the 'touchstart' event
				* on mobile devices. Only enable this if you are having trouble with click
				* events. Prefer using 'handle' / 'cancel' instead.
				*
				* Defaults to `false`.
				*/
				allowMobileScroll: import_prop_types.default.bool,
				children: import_prop_types.default.node.isRequired,
				/**
				* `disabled`, if true, stops the <Draggable> from dragging. All handlers,
				* with the exception of `onMouseDown`, will not fire.
				*/
				disabled: import_prop_types.default.bool,
				/**
				* By default, we add 'user-select:none' attributes to the document body
				* to prevent ugly text selection during drag. If this is causing problems
				* for your app, set this to `false`.
				*/
				enableUserSelectHack: import_prop_types.default.bool,
				/**
				* `offsetParent`, if set, uses the passed DOM node to compute drag offsets
				* instead of using the parent node.
				*/
				offsetParent: function(props, propName) {
					if (props[propName] && props[propName].nodeType !== 1) throw new Error("Draggable's offsetParent must be a DOM Node.");
				},
				/**
				* `grid` specifies the x and y that dragging should snap to.
				*/
				grid: import_prop_types.default.arrayOf(import_prop_types.default.number),
				/**
				* `handle` specifies a selector to be used as the handle that initiates drag.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*         return (
				*            <Draggable handle=".handle">
				*              <div>
				*                  <div className="handle">Click me to drag</div>
				*                  <div>This is some other content</div>
				*              </div>
				*           </Draggable>
				*         );
				*       }
				*   });
				* ```
				*/
				handle: import_prop_types.default.string,
				/**
				* `cancel` specifies a selector to be used to prevent drag initialization.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*           return(
				*               <Draggable cancel=".cancel">
				*                   <div>
				*                     <div className="cancel">You can't drag from here</div>
				*                     <div>Dragging here works fine</div>
				*                   </div>
				*               </Draggable>
				*           );
				*       }
				*   });
				* ```
				*/
				cancel: import_prop_types.default.string,
				nodeRef: import_prop_types.default.object,
				/**
				* `nonce` is applied to the dynamically-injected <style> element used by the
				* user-select hack, so it isn't blocked under a strict Content Security
				* Policy (`style-src` without `'unsafe-inline'`). If omitted, webpack's
				* `__webpack_nonce__` global is used when available.
				*/
				nonce: import_prop_types.default.string,
				/**
				* Called when dragging starts.
				* If this function returns the boolean false, dragging will be canceled.
				*/
				onStart: import_prop_types.default.func,
				/**
				* Called while dragging.
				* If this function returns the boolean false, dragging will be canceled.
				*/
				onDrag: import_prop_types.default.func,
				/**
				* Called when dragging stops.
				* If this function returns the boolean false, the drag will remain active.
				*/
				onStop: import_prop_types.default.func,
				/**
				* A workaround option which can be passed if onMouseDown needs to be accessed,
				* since it'll always be blocked (as there is internal use of onMouseDown)
				*/
				onMouseDown: import_prop_types.default.func,
				/**
				* `scale`, if set, applies scaling while dragging an element
				*/
				scale: import_prop_types.default.number,
				/**
				* These properties should be defined on the child, not here.
				*/
				className: dontSetMe,
				style: dontSetMe,
				transform: dontSetMe
			};
			DraggableCore.defaultProps = {
				allowAnyClick: false,
				allowMobileScroll: false,
				disabled: false,
				enableUserSelectHack: true,
				onStart: function() {},
				onDrag: function() {},
				onStop: function() {},
				onMouseDown: function() {},
				scale: 1
			};
			var Draggable = class extends React2$1.Component {
				constructor(props) {
					super(props);
					this.onDragStart = (e, coreData) => {
						log_default("Draggable: onDragStart: %j", coreData);
						if (this.props.onStart(e, createDraggableData(this, coreData)) === false) return false;
						this.setState({
							dragging: true,
							dragged: true
						});
					};
					this.onDrag = (e, coreData) => {
						if (!this.state.dragging) return false;
						log_default("Draggable: onDrag: %j", coreData);
						const uiData = createDraggableData(this, coreData);
						const newState = {
							x: uiData.x,
							y: uiData.y,
							slackX: 0,
							slackY: 0
						};
						if (this.props.bounds) {
							const { x, y } = newState;
							newState.x += this.state.slackX;
							newState.y += this.state.slackY;
							const [newStateX, newStateY] = getBoundPosition(this, newState.x, newState.y);
							newState.x = newStateX;
							newState.y = newStateY;
							newState.slackX = this.state.slackX + (x - newState.x);
							newState.slackY = this.state.slackY + (y - newState.y);
							uiData.x = newState.x;
							uiData.y = newState.y;
							uiData.deltaX = newState.x - this.state.x;
							uiData.deltaY = newState.y - this.state.y;
						}
						if (this.props.onDrag(e, uiData) === false) return false;
						this.setState(newState);
					};
					this.onDragStop = (e, coreData) => {
						if (!this.state.dragging) return false;
						if (this.props.onStop(e, createDraggableData(this, coreData)) === false) return false;
						log_default("Draggable: onDragStop: %j", coreData);
						const newState = {
							dragging: false,
							slackX: 0,
							slackY: 0
						};
						if (Boolean(this.props.position)) {
							const { x, y } = this.props.position;
							newState.x = x;
							newState.y = y;
						}
						this.setState(newState);
					};
					this.state = {
						dragging: false,
						dragged: false,
						x: props.position ? props.position.x : props.defaultPosition.x,
						y: props.position ? props.position.y : props.defaultPosition.y,
						prevPropsPosition: { ...props.position },
						slackX: 0,
						slackY: 0,
						isElementSVG: false
					};
					if (props.position && !(props.onDrag || props.onStop)) console.warn("A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.");
				}
				static getDerivedStateFromProps({ position }, { prevPropsPosition }) {
					if (position && (!prevPropsPosition || position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y)) {
						log_default("Draggable: getDerivedStateFromProps %j", {
							position,
							prevPropsPosition
						});
						return {
							x: position.x,
							y: position.y,
							prevPropsPosition: { ...position }
						};
					}
					return null;
				}
				componentDidMount() {
					if (typeof window.SVGElement !== "undefined" && this.findDOMNode() instanceof window.SVGElement) this.setState({ isElementSVG: true });
				}
				componentWillUnmount() {
					if (this.state.dragging) this.setState({ dragging: false });
				}
				findDOMNode() {
					var _a;
					if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
					const legacyReactDOM = import_react_dom2.default;
					if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
					return null;
				}
				render() {
					const { axis, bounds, children, defaultPosition, defaultClassName, defaultClassNameDragging, defaultClassNameDragged, position, positionOffset, scale, ...draggableCoreProps } = this.props;
					let style = {};
					let svgTransform = null;
					const draggable = !Boolean(position) || this.state.dragging;
					const validPosition = position || defaultPosition;
					const transformOpts = {
						x: canDragX(this) && draggable ? this.state.x : validPosition.x,
						y: canDragY(this) && draggable ? this.state.y : validPosition.y
					};
					if (this.state.isElementSVG) svgTransform = createSVGTransform(transformOpts, positionOffset);
					else style = createCSSTransform(transformOpts, positionOffset);
					const onlyChild = React2$1.Children.only(children);
					const className = (0, import_clsx.clsx)(onlyChild.props.className || "", defaultClassName, {
						[defaultClassNameDragging]: this.state.dragging,
						[defaultClassNameDragged]: this.state.dragged
					});
					return /* @__PURE__ */ React2$1.createElement(DraggableCore, {
						...draggableCoreProps,
						onStart: this.onDragStart,
						onDrag: this.onDrag,
						onStop: this.onDragStop
					}, React2$1.cloneElement(onlyChild, {
						className,
						style: {
							...onlyChild.props.style,
							...style
						},
						transform: svgTransform
					}));
				}
			};
			Draggable.displayName = "Draggable";
			Draggable.propTypes = {
				...DraggableCore.propTypes,
				/**
				* `axis` determines which axis the draggable can move.
				*
				*  Note that all callbacks will still return data as normal. This only
				*  controls flushing to the DOM.
				*
				* 'both' allows movement horizontally and vertically.
				* 'x' limits movement to horizontal axis.
				* 'y' limits movement to vertical axis.
				* 'none' limits all movement.
				*
				* Defaults to 'both'.
				*/
				axis: import_prop_types2.default.oneOf([
					"both",
					"x",
					"y",
					"none"
				]),
				/**
				* `bounds` determines the range of movement available to the element.
				* Available values are:
				*
				* 'parent' restricts movement within the Draggable's parent node.
				*
				* Alternatively, pass an object with the following properties, all of which are optional:
				*
				* {left: LEFT_BOUND, right: RIGHT_BOUND, bottom: BOTTOM_BOUND, top: TOP_BOUND}
				*
				* All values are in px.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*         return (
				*            <Draggable bounds={{right: 300, bottom: 300}}>
				*              <div>Content</div>
				*           </Draggable>
				*         );
				*       }
				*   });
				* ```
				*/
				bounds: import_prop_types2.default.oneOfType([
					import_prop_types2.default.shape({
						left: import_prop_types2.default.number,
						right: import_prop_types2.default.number,
						top: import_prop_types2.default.number,
						bottom: import_prop_types2.default.number
					}),
					import_prop_types2.default.string,
					import_prop_types2.default.oneOf([false])
				]),
				defaultClassName: import_prop_types2.default.string,
				defaultClassNameDragging: import_prop_types2.default.string,
				defaultClassNameDragged: import_prop_types2.default.string,
				/**
				* `defaultPosition` specifies the x and y that the dragged item should start at
				*
				* Example:
				*
				* ```jsx
				*      let App = React.createClass({
				*          render: function () {
				*              return (
				*                  <Draggable defaultPosition={{x: 25, y: 25}}>
				*                      <div>I start with transformX: 25px and transformY: 25px;</div>
				*                  </Draggable>
				*              );
				*          }
				*      });
				* ```
				*/
				defaultPosition: import_prop_types2.default.shape({
					x: import_prop_types2.default.number,
					y: import_prop_types2.default.number
				}),
				positionOffset: import_prop_types2.default.shape({
					x: import_prop_types2.default.oneOfType([import_prop_types2.default.number, import_prop_types2.default.string]),
					y: import_prop_types2.default.oneOfType([import_prop_types2.default.number, import_prop_types2.default.string])
				}),
				/**
				* `position`, if present, defines the current position of the element.
				*
				*  This is similar to how form elements in React work - if no `position` is supplied, the component
				*  is uncontrolled.
				*
				* Example:
				*
				* ```jsx
				*      let App = React.createClass({
				*          render: function () {
				*              return (
				*                  <Draggable position={{x: 25, y: 25}}>
				*                      <div>I start with transformX: 25px and transformY: 25px;</div>
				*                  </Draggable>
				*              );
				*          }
				*      });
				* ```
				*/
				position: import_prop_types2.default.shape({
					x: import_prop_types2.default.number,
					y: import_prop_types2.default.number
				}),
				/**
				* These properties should be defined on the child, not here.
				*/
				className: dontSetMe,
				style: dontSetMe,
				transform: dontSetMe
			};
			Draggable.defaultProps = {
				...DraggableCore.defaultProps,
				axis: "both",
				bounds: false,
				defaultClassName: "react-draggable",
				defaultClassNameDragging: "react-draggable-dragging",
				defaultClassNameDragged: "react-draggable-dragged",
				defaultPosition: {
					x: 0,
					y: 0
				},
				scale: 1
			};
			0 && (module.exports = { DraggableCore });
		}));
		//#endregion
		//#region node_modules/.pnpm/react-draggable@4.7.2_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-draggable/build/cjs/cjs.js
		var require_cjs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Draggable = require_Draggable();
			const DraggableCore = Draggable.DraggableCore;
			const Default = Draggable.default || Draggable;
			module.exports = Default;
			module.exports.default = Default;
			module.exports.DraggableCore = DraggableCore;
		}));
		//#endregion
		//#region node_modules/.pnpm/react-resizable@3.2.0_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-resizable/build/utils.js
		var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.cloneElement = cloneElement;
			var _react = _interopRequireDefault(require("react"));
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			function cloneElement(element, props) {
				if (props.style && element.props.style) props.style = _objectSpread(_objectSpread({}, element.props.style), props.style);
				if (props.className && element.props.className) props.className = element.props.className + " " + props.className;
				return /*#__PURE__*/ _react.default.cloneElement(element, props);
			}
		}));
		//#endregion
		//#region node_modules/.pnpm/react-resizable@3.2.0_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-resizable/build/propTypes.js
		var require_propTypes = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.resizableProps = void 0;
			var _propTypes = _interopRequireDefault(require_prop_types());
			require_cjs();
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			exports.resizableProps = {
				axis: _propTypes.default.oneOf([
					"both",
					"x",
					"y",
					"none"
				]),
				className: _propTypes.default.string,
				children: _propTypes.default.element.isRequired,
				draggableOpts: _propTypes.default.shape({
					allowAnyClick: _propTypes.default.bool,
					cancel: _propTypes.default.string,
					children: _propTypes.default.node,
					disabled: _propTypes.default.bool,
					enableUserSelectHack: _propTypes.default.bool,
					offsetParent: typeof Element !== "undefined" ? _propTypes.default.instanceOf(Element) : _propTypes.default.any,
					grid: _propTypes.default.arrayOf(_propTypes.default.number),
					handle: _propTypes.default.string,
					nodeRef: _propTypes.default.object,
					onStart: _propTypes.default.func,
					onDrag: _propTypes.default.func,
					onStop: _propTypes.default.func,
					onMouseDown: _propTypes.default.func,
					scale: _propTypes.default.number
				}),
				height: function() {
					for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
					const props = args[0];
					if (props.axis === "both" || props.axis === "y") return _propTypes.default.number.isRequired(...args);
					return _propTypes.default.number(...args);
				},
				handle: _propTypes.default.oneOfType([_propTypes.default.node, _propTypes.default.func]),
				handleSize: _propTypes.default.arrayOf(_propTypes.default.number),
				lockAspectRatio: _propTypes.default.bool,
				maxConstraints: _propTypes.default.arrayOf(_propTypes.default.number),
				minConstraints: _propTypes.default.arrayOf(_propTypes.default.number),
				onResizeStop: _propTypes.default.func,
				onResizeStart: _propTypes.default.func,
				onResize: _propTypes.default.func,
				resizeHandles: _propTypes.default.arrayOf(_propTypes.default.oneOf([
					"s",
					"w",
					"e",
					"n",
					"sw",
					"nw",
					"se",
					"ne"
				])),
				transformScale: _propTypes.default.number,
				width: function() {
					for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) args[_key2] = arguments[_key2];
					const props = args[0];
					if (props.axis === "both" || props.axis === "x") return _propTypes.default.number.isRequired(...args);
					return _propTypes.default.number(...args);
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/react-resizable@3.2.0_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-resizable/build/Resizable.js
		var require_Resizable = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.default = void 0;
			var React$1 = _interopRequireWildcard(require("react"));
			var _reactDraggable = require_cjs();
			var _utils = require_utils();
			var _propTypes = require_propTypes();
			const _excluded = [
				"children",
				"className",
				"draggableOpts",
				"width",
				"height",
				"handle",
				"handleSize",
				"lockAspectRatio",
				"axis",
				"minConstraints",
				"maxConstraints",
				"onResize",
				"onResizeStop",
				"onResizeStart",
				"resizeHandles",
				"transformScale"
			];
			function _interopRequireWildcard(e, t) {
				if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
				return (_interopRequireWildcard = function(e, t) {
					if (!t && e && e.__esModule) return e;
					var o, i, f = {
						__proto__: null,
						default: e
					};
					if (null === e || "object" != typeof e && "function" != typeof e) return f;
					if (o = t ? n : r) {
						if (o.has(e)) return o.get(e);
						o.set(e, f);
					}
					for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
					return f;
				})(e, t);
			}
			function _extends() {
				return _extends = Object.assign ? Object.assign.bind() : function(n) {
					for (var e = 1; e < arguments.length; e++) {
						var t = arguments[e];
						for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
					}
					return n;
				}, _extends.apply(null, arguments);
			}
			function _objectWithoutPropertiesLoose(r, e) {
				if (null == r) return {};
				var t = {};
				for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
					if (-1 !== e.indexOf(n)) continue;
					t[n] = r[n];
				}
				return t;
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			var Resizable = class extends React$1.Component {
				constructor() {
					super(...arguments);
					this.handleRefs = {};
					this.lastHandleRect = null;
					this.slack = null;
					this.lastSize = null;
				}
				componentWillUnmount() {
					this.resetData();
				}
				resetData() {
					this.lastHandleRect = this.slack = this.lastSize = null;
				}
				runConstraints(width, height) {
					const _this$props = this.props, minConstraints = _this$props.minConstraints, maxConstraints = _this$props.maxConstraints, lockAspectRatio = _this$props.lockAspectRatio;
					if (!minConstraints && !maxConstraints && !lockAspectRatio) return [width, height];
					if (lockAspectRatio) {
						const ratio = this.props.width / this.props.height;
						const deltaW = width - this.props.width;
						const deltaH = height - this.props.height;
						if (Math.abs(deltaW) > Math.abs(deltaH * ratio)) height = width / ratio;
						else width = height * ratio;
					}
					const oldW = width, oldH = height;
					let _ref = this.slack || [0, 0], slackW = _ref[0], slackH = _ref[1];
					width += slackW;
					height += slackH;
					if (minConstraints) {
						width = Math.max(minConstraints[0], width);
						height = Math.max(minConstraints[1], height);
					}
					if (maxConstraints) {
						width = Math.min(maxConstraints[0], width);
						height = Math.min(maxConstraints[1], height);
					}
					this.slack = [slackW + (oldW - width), slackH + (oldH - height)];
					return [width, height];
				}
				/**
				* Wrapper around drag events to provide more useful data.
				*
				* @param  {String} handlerName Handler name to wrap.
				* @return {Function}           Handler function.
				*/
				resizeHandler(handlerName, axis) {
					return (e, _ref2) => {
						var _this$lastSize$width, _this$lastSize, _this$lastSize$height, _this$lastSize2;
						let node = _ref2.node, deltaX = _ref2.deltaX, deltaY = _ref2.deltaY;
						if (handlerName === "onResizeStart") this.resetData();
						const canDragX = (this.props.axis === "both" || this.props.axis === "x") && axis !== "n" && axis !== "s";
						const canDragY = (this.props.axis === "both" || this.props.axis === "y") && axis !== "e" && axis !== "w";
						if (!canDragX && !canDragY) return;
						const axisV = axis[0];
						const axisH = axis[axis.length - 1];
						const handleRect = node.getBoundingClientRect();
						if (this.lastHandleRect != null) {
							if (axisH === "w") {
								const deltaLeftSinceLast = handleRect.left - this.lastHandleRect.left;
								deltaX += deltaLeftSinceLast;
							}
							if (axisV === "n") {
								const deltaTopSinceLast = handleRect.top - this.lastHandleRect.top;
								deltaY += deltaTopSinceLast;
							}
						}
						this.lastHandleRect = handleRect;
						if (axisH === "w") deltaX = -deltaX;
						if (axisV === "n") deltaY = -deltaY;
						const baseWidth = (_this$lastSize$width = (_this$lastSize = this.lastSize) == null ? void 0 : _this$lastSize.width) != null ? _this$lastSize$width : this.props.width;
						const baseHeight = (_this$lastSize$height = (_this$lastSize2 = this.lastSize) == null ? void 0 : _this$lastSize2.height) != null ? _this$lastSize$height : this.props.height;
						let width = baseWidth + (canDragX ? deltaX / this.props.transformScale : 0);
						let height = baseHeight + (canDragY ? deltaY / this.props.transformScale : 0);
						var _this$runConstraints = this.runConstraints(width, height);
						width = _this$runConstraints[0];
						height = _this$runConstraints[1];
						if (handlerName === "onResizeStop" && this.lastSize) {
							var _this$lastSize3 = this.lastSize;
							width = _this$lastSize3.width;
							height = _this$lastSize3.height;
						}
						const dimensionsChanged = width !== baseWidth || height !== baseHeight;
						if (handlerName !== "onResizeStop") this.lastSize = {
							width,
							height
						};
						const cb = typeof this.props[handlerName] === "function" ? this.props[handlerName] : null;
						if (cb && !(handlerName === "onResize" && !dimensionsChanged)) {
							e.persist == null || e.persist();
							cb(e, {
								node,
								size: {
									width,
									height
								},
								handle: axis
							});
						}
						if (handlerName === "onResizeStop") this.resetData();
					};
				}
				renderResizeHandle(handleAxis, ref) {
					const handle = this.props.handle;
					if (!handle) return /*#__PURE__*/ React$1.createElement("span", {
						className: "react-resizable-handle react-resizable-handle-" + handleAxis,
						ref
					});
					if (typeof handle === "function") return handle(handleAxis, ref);
					const isDOMElement = typeof handle.type === "string";
					const props = _objectSpread({ ref }, isDOMElement ? {} : { handleAxis });
					return /*#__PURE__*/ React$1.cloneElement(handle, props);
				}
				render() {
					const _this$props2 = this.props, children = _this$props2.children, className = _this$props2.className, draggableOpts = _this$props2.draggableOpts;
					_this$props2.width;
					_this$props2.height;
					_this$props2.handle;
					_this$props2.handleSize;
					_this$props2.lockAspectRatio;
					_this$props2.axis;
					_this$props2.minConstraints;
					_this$props2.maxConstraints;
					_this$props2.onResize;
					_this$props2.onResizeStop;
					_this$props2.onResizeStart;
					const resizeHandles = _this$props2.resizeHandles;
					_this$props2.transformScale;
					const p = _objectWithoutPropertiesLoose(_this$props2, _excluded);
					return (0, _utils.cloneElement)(children, _objectSpread(_objectSpread({}, p), {}, {
						className: (className ? className + " " : "") + "react-resizable",
						children: [...React$1.Children.toArray(children.props.children), ...resizeHandles.map((handleAxis) => {
							var _this$handleRefs$hand;
							const ref = (_this$handleRefs$hand = this.handleRefs[handleAxis]) != null ? _this$handleRefs$hand : this.handleRefs[handleAxis] = /*#__PURE__*/ React$1.createRef();
							return /*#__PURE__*/ React$1.createElement(_reactDraggable.DraggableCore, _extends({}, draggableOpts, {
								nodeRef: ref,
								key: "resizableHandle-" + handleAxis,
								onStop: this.resizeHandler("onResizeStop", handleAxis),
								onStart: this.resizeHandler("onResizeStart", handleAxis),
								onDrag: this.resizeHandler("onResize", handleAxis)
							}), this.renderResizeHandle(handleAxis, ref));
						})]
					}));
				}
			};
			exports.default = Resizable;
			Resizable.propTypes = _propTypes.resizableProps;
			Resizable.defaultProps = {
				axis: "both",
				handleSize: [20, 20],
				lockAspectRatio: false,
				minConstraints: [20, 20],
				maxConstraints: [Infinity, Infinity],
				resizeHandles: ["se"],
				transformScale: 1
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/react-resizable@3.2.0_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-resizable/build/ResizableBox.js
		var require_ResizableBox = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.default = void 0;
			var React = _interopRequireWildcard(require("react"));
			var _propTypes = _interopRequireDefault(require_prop_types());
			var _Resizable = _interopRequireDefault(require_Resizable());
			var _propTypes2 = require_propTypes();
			const _excluded = [
				"handle",
				"handleSize",
				"onResize",
				"onResizeStart",
				"onResizeStop",
				"draggableOpts",
				"minConstraints",
				"maxConstraints",
				"lockAspectRatio",
				"axis",
				"width",
				"height",
				"resizeHandles",
				"style",
				"transformScale"
			];
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			function _interopRequireWildcard(e, t) {
				if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
				return (_interopRequireWildcard = function(e, t) {
					if (!t && e && e.__esModule) return e;
					var o, i, f = {
						__proto__: null,
						default: e
					};
					if (null === e || "object" != typeof e && "function" != typeof e) return f;
					if (o = t ? n : r) {
						if (o.has(e)) return o.get(e);
						o.set(e, f);
					}
					for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
					return f;
				})(e, t);
			}
			function _extends() {
				return _extends = Object.assign ? Object.assign.bind() : function(n) {
					for (var e = 1; e < arguments.length; e++) {
						var t = arguments[e];
						for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
					}
					return n;
				}, _extends.apply(null, arguments);
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			function _objectWithoutPropertiesLoose(r, e) {
				if (null == r) return {};
				var t = {};
				for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
					if (-1 !== e.indexOf(n)) continue;
					t[n] = r[n];
				}
				return t;
			}
			var ResizableBox = class extends React.Component {
				constructor() {
					super(...arguments);
					this.state = {
						width: this.props.width,
						height: this.props.height,
						propsWidth: this.props.width,
						propsHeight: this.props.height
					};
					this.onResize = (e, data) => {
						const size = data.size;
						if (this.props.onResize) {
							e.persist == null || e.persist();
							this.setState(size, () => this.props.onResize && this.props.onResize(e, data));
						} else this.setState(size);
					};
				}
				static getDerivedStateFromProps(props, state) {
					if (state.propsWidth !== props.width || state.propsHeight !== props.height) return {
						width: props.width,
						height: props.height,
						propsWidth: props.width,
						propsHeight: props.height
					};
					return null;
				}
				render() {
					const _this$props = this.props, handle = _this$props.handle, handleSize = _this$props.handleSize;
					_this$props.onResize;
					const onResizeStart = _this$props.onResizeStart, onResizeStop = _this$props.onResizeStop, draggableOpts = _this$props.draggableOpts, minConstraints = _this$props.minConstraints, maxConstraints = _this$props.maxConstraints, lockAspectRatio = _this$props.lockAspectRatio, axis = _this$props.axis;
					_this$props.width;
					_this$props.height;
					const resizeHandles = _this$props.resizeHandles, style = _this$props.style, transformScale = _this$props.transformScale, props = _objectWithoutPropertiesLoose(_this$props, _excluded);
					return /*#__PURE__*/ React.createElement(_Resizable.default, {
						axis,
						draggableOpts,
						handle,
						handleSize,
						height: this.state.height,
						lockAspectRatio,
						maxConstraints,
						minConstraints,
						onResizeStart,
						onResize: this.onResize,
						onResizeStop,
						resizeHandles,
						transformScale,
						width: this.state.width
					}, /*#__PURE__*/ React.createElement("div", _extends({}, props, { style: _objectSpread(_objectSpread({}, style), {}, {
						width: this.state.width + "px",
						height: this.state.height + "px"
					}) })));
				}
			};
			exports.default = ResizableBox;
			ResizableBox.propTypes = _objectSpread(_objectSpread({}, _propTypes2.resizableProps), {}, { children: _propTypes.default.element });
		}));
		//#endregion
		//#region node_modules/.pnpm/react-grid-layout@2.2.3_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-grid-layout/dist/chunk-WGL5FSZH.mjs
		var import_react_resizable = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = function() {
				throw new Error("Don't instantiate Resizable directly! Use require('react-resizable').Resizable");
			};
			module.exports.Resizable = require_Resizable().default;
			module.exports.ResizableBox = require_ResizableBox().default;
		})))();
		var import_fast_equals_cjs = require_fast_equals_cjs();
		function GridItem(props) {
			const { children, cols, containerWidth, margin, containerPadding, rowHeight, maxRows, isDraggable, isResizable, isBounded, static: isStatic, useCSSTransforms = true, usePercentages = false, transformScale = 1, positionStrategy, dragThreshold = 0, droppingPosition, className = "", style, handle = "", cancel = "", x, y, w, h, minW = 1, maxW = Infinity, minH = 1, maxH = Infinity, i, resizeHandles, resizeHandle, constraints = defaultConstraints, layoutItem, layout = [], onDragStart: onDragStartProp, onDrag: onDragProp, onDragStop: onDragStopProp, onResizeStart: onResizeStartProp, onResize: onResizeProp, onResizeStop: onResizeStopProp } = props;
			const [dragging, setDragging] = (0, react.useState)(false);
			const [resizing, setResizing] = (0, react.useState)(false);
			const elementRef = (0, react.useRef)(null);
			const dragPositionRef = (0, react.useRef)({
				left: 0,
				top: 0
			});
			const resizePositionRef = (0, react.useRef)({
				top: 0,
				left: 0,
				width: 0,
				height: 0
			});
			const prevDroppingPositionRef = (0, react.useRef)(void 0);
			const layoutRef = (0, react.useRef)(layout);
			layoutRef.current = layout;
			const onDragStartRef = (0, react.useRef)(null);
			const onDragRef = (0, react.useRef)(null);
			const dragPendingRef = (0, react.useRef)(false);
			const initialDragClientRef = (0, react.useRef)({
				x: 0,
				y: 0
			});
			const thresholdExceededRef = (0, react.useRef)(false);
			const positionParams = (0, react.useMemo)(() => ({
				cols,
				containerPadding,
				containerWidth,
				margin,
				maxRows,
				rowHeight
			}), [
				cols,
				containerPadding,
				containerWidth,
				margin,
				maxRows,
				rowHeight
			]);
			const constraintContext = (0, react.useMemo)(() => ({
				cols,
				maxRows,
				containerWidth,
				containerHeight: 0,
				rowHeight,
				margin,
				layout: []
			}), [
				cols,
				maxRows,
				containerWidth,
				rowHeight,
				margin
			]);
			const getConstraintContext = (0, react.useCallback)(() => ({
				...constraintContext,
				layout: layoutRef.current
			}), [constraintContext]);
			const effectiveLayoutItem = (0, react.useMemo)(() => layoutItem ?? {
				i,
				x,
				y,
				w,
				h,
				minW,
				maxW,
				minH,
				maxH
			}, [
				layoutItem,
				i,
				x,
				y,
				w,
				h,
				minW,
				maxW,
				minH,
				maxH
			]);
			const createStyle = (0, react.useCallback)((pos2) => {
				if (positionStrategy?.calcStyle) return positionStrategy.calcStyle(pos2);
				if (useCSSTransforms) return setTransform(pos2);
				const styleObj = setTopLeft(pos2);
				if (usePercentages) return {
					...styleObj,
					left: perc(pos2.left / containerWidth),
					width: perc(pos2.width / containerWidth)
				};
				return styleObj;
			}, [
				positionStrategy,
				useCSSTransforms,
				usePercentages,
				containerWidth
			]);
			const onDragStart = (0, react.useCallback)((e, { node }) => {
				if (!onDragStartProp) return;
				const { offsetParent } = node;
				if (!offsetParent) return;
				const parentRect = offsetParent.getBoundingClientRect();
				const clientRect = node.getBoundingClientRect();
				const cLeft = clientRect.left / transformScale;
				const pLeft = parentRect.left / transformScale;
				const cTop = clientRect.top / transformScale;
				const pTop = parentRect.top / transformScale;
				let newPosition;
				if (positionStrategy?.calcDragPosition) {
					const mouseEvent = e;
					newPosition = positionStrategy.calcDragPosition(mouseEvent.clientX, mouseEvent.clientY, mouseEvent.clientX - clientRect.left, mouseEvent.clientY - clientRect.top);
				} else newPosition = {
					left: cLeft - pLeft + offsetParent.scrollLeft,
					top: cTop - pTop + offsetParent.scrollTop
				};
				dragPositionRef.current = newPosition;
				if (dragThreshold > 0) {
					const mouseEvent = e;
					initialDragClientRef.current = {
						x: mouseEvent.clientX,
						y: mouseEvent.clientY
					};
					dragPendingRef.current = true;
					thresholdExceededRef.current = false;
					setDragging(true);
					return;
				}
				setDragging(true);
				const rawPos = calcXYRaw(positionParams, newPosition.top, newPosition.left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragStartProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragStartProp,
				transformScale,
				positionParams,
				positionStrategy,
				dragThreshold,
				constraints,
				effectiveLayoutItem,
				getConstraintContext,
				i
			]);
			const onDrag = (0, react.useCallback)((e, { node, deltaX, deltaY }) => {
				if (!onDragProp || !dragging) return;
				const mouseEvent = e;
				if (dragPendingRef.current && !thresholdExceededRef.current) {
					const dx = mouseEvent.clientX - initialDragClientRef.current.x;
					const dy = mouseEvent.clientY - initialDragClientRef.current.y;
					if (Math.hypot(dx, dy) < dragThreshold) return;
					thresholdExceededRef.current = true;
					dragPendingRef.current = false;
					if (onDragStartProp) {
						const rawPos2 = calcXYRaw(positionParams, dragPositionRef.current.top, dragPositionRef.current.left);
						const { x: startX, y: startY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos2.x, rawPos2.y, getConstraintContext());
						onDragStartProp(i, startX, startY, {
							e,
							node,
							newPosition: dragPositionRef.current
						});
					}
				}
				let top = dragPositionRef.current.top + deltaY;
				let left = dragPositionRef.current.left + deltaX;
				if (isBounded) {
					const { offsetParent } = node;
					if (offsetParent) {
						const bottomBoundary = offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[1]);
						top = clamp$1(top, 0, bottomBoundary);
						const colWidth2 = calcGridColWidth(positionParams);
						const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth2, margin[0]);
						left = clamp$1(left, 0, rightBoundary);
					}
				}
				const newPosition = {
					top,
					left
				};
				dragPositionRef.current = newPosition;
				const rawPos = calcXYRaw(positionParams, top, left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragProp,
				onDragStartProp,
				dragging,
				dragThreshold,
				isBounded,
				h,
				rowHeight,
				margin,
				positionParams,
				containerWidth,
				w,
				i,
				constraints,
				effectiveLayoutItem,
				getConstraintContext
			]);
			const onDragStop = (0, react.useCallback)((e, { node }) => {
				if (!onDragStopProp || !dragging) return;
				const wasPending = dragPendingRef.current;
				dragPendingRef.current = false;
				thresholdExceededRef.current = false;
				initialDragClientRef.current = {
					x: 0,
					y: 0
				};
				if (wasPending) {
					setDragging(false);
					dragPositionRef.current = {
						left: 0,
						top: 0
					};
					return;
				}
				const { left, top } = dragPositionRef.current;
				const newPosition = {
					top,
					left
				};
				setDragging(false);
				dragPositionRef.current = {
					left: 0,
					top: 0
				};
				const rawPos = calcXYRaw(positionParams, top, left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragStopProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragStopProp,
				dragging,
				positionParams,
				constraints,
				effectiveLayoutItem,
				getConstraintContext,
				i
			]);
			onDragStartRef.current = onDragStart;
			onDragRef.current = onDrag;
			const onResizeHandler = (0, react.useCallback)((e, { node, size, handle: resizeHandle2 }, position, handlerName) => {
				const handler = handlerName === "onResizeStart" ? onResizeStartProp : handlerName === "onResize" ? onResizeProp : onResizeStopProp;
				if (!handler) return;
				let updatedSize;
				if (node) updatedSize = resizeItemInDirection(resizeHandle2, position, size, containerWidth);
				else updatedSize = {
					...size,
					top: position.top,
					left: position.left
				};
				resizePositionRef.current = updatedSize;
				const rawSize = calcWHRaw(positionParams, updatedSize.width, updatedSize.height);
				const { w: newW, h: newH } = applySizeConstraints(constraints, effectiveLayoutItem, rawSize.w, rawSize.h, resizeHandle2, getConstraintContext());
				handler(i, newW, newH, {
					e: e.nativeEvent,
					node,
					size: updatedSize,
					handle: resizeHandle2
				});
			}, [
				onResizeStartProp,
				onResizeProp,
				onResizeStopProp,
				containerWidth,
				positionParams,
				i,
				constraints,
				effectiveLayoutItem,
				getConstraintContext
			]);
			const handleResizeStart = (0, react.useCallback)((e, data) => {
				setResizing(true);
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResizeStart");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			const handleResize = (0, react.useCallback)((e, data) => {
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResize");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			const handleResizeStop = (0, react.useCallback)((e, data) => {
				setResizing(false);
				resizePositionRef.current = {
					top: 0,
					left: 0,
					width: 0,
					height: 0
				};
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResizeStop");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			(0, react.useEffect)(() => {
				if (!droppingPosition) return;
				const node = elementRef.current;
				if (!node) return;
				const prevDroppingPosition = prevDroppingPositionRef.current || {
					left: 0,
					top: 0
				};
				const shouldDrag = dragging && (droppingPosition.left !== prevDroppingPosition.left || droppingPosition.top !== prevDroppingPosition.top);
				if (!dragging) {
					const fakeData = {
						node,
						deltaX: droppingPosition.left,
						deltaY: droppingPosition.top,
						lastX: 0,
						lastY: 0,
						x: droppingPosition.left,
						y: droppingPosition.top
					};
					onDragStartRef.current?.(droppingPosition.e, fakeData);
				} else if (shouldDrag) {
					const fakeData = {
						node,
						deltaX: droppingPosition.left - dragPositionRef.current.left,
						deltaY: droppingPosition.top - dragPositionRef.current.top,
						lastX: dragPositionRef.current.left,
						lastY: dragPositionRef.current.top,
						x: droppingPosition.left,
						y: droppingPosition.top
					};
					onDragRef.current?.(droppingPosition.e, fakeData);
				}
				prevDroppingPositionRef.current = droppingPosition;
			}, [
				droppingPosition,
				dragging,
				i
			]);
			const pos = calcGridItemPosition(positionParams, x, y, w, h, dragging ? dragPositionRef.current : null, resizing ? resizePositionRef.current : null);
			const child = react.default.Children.only(children);
			const colWidth = calcGridColWidth(positionParams);
			const minConstraints = [calcGridItemWHPx(minW, colWidth, margin[0]), calcGridItemWHPx(minH, rowHeight, margin[1])];
			const maxConstraints = [calcGridItemWHPx(maxW, colWidth, margin[0]), calcGridItemWHPx(maxH, rowHeight, margin[1])];
			const childProps = child.props;
			const childClassName = childProps["className"];
			const childStyle = childProps["style"];
			let newChild = react.default.cloneElement(child, {
				ref: elementRef,
				className: clsx("react-grid-item", childClassName, className, {
					static: isStatic,
					resizing,
					"react-draggable": isDraggable,
					"react-draggable-dragging": dragging,
					dropping: Boolean(droppingPosition),
					cssTransforms: useCSSTransforms
				}),
				style: {
					...style,
					...childStyle,
					...createStyle(pos)
				}
			});
			const resizableHandle = resizeHandle;
			newChild = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_react_resizable.Resizable, {
				draggableOpts: { disabled: !isResizable },
				className: isResizable ? void 0 : "react-resizable-hide",
				width: pos.width,
				height: pos.height,
				minConstraints,
				maxConstraints,
				onResizeStart: handleResizeStart,
				onResize: handleResize,
				onResizeStop: handleResizeStop,
				transformScale,
				resizeHandles,
				handle: resizableHandle,
				children: newChild
			});
			newChild = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DraggableCore, {
				disabled: !isDraggable,
				onStart: onDragStart,
				onDrag,
				onStop: onDragStop,
				handle,
				cancel: ".react-resizable-handle" + (cancel ? "," + cancel : ""),
				scale: transformScale,
				nodeRef: elementRef,
				children: newChild
			});
			return newChild;
		}
		var noop = () => {};
		var layoutClassName = "react-grid-layout";
		var isFirefox = false;
		try {
			isFirefox = /firefox/i.test(navigator.userAgent);
		} catch {}
		function childrenEqual(a, b) {
			const aArr = react.default.Children.toArray(a);
			const bArr = react.default.Children.toArray(b);
			if (aArr.length !== bArr.length) return false;
			for (let i = 0; i < aArr.length; i++) {
				const aChild = aArr[i];
				const bChild = bArr[i];
				if (aChild?.key !== bChild?.key) return false;
			}
			return true;
		}
		function synchronizeLayoutWithChildren(initialLayout, children, cols, compactor) {
			const layout = [];
			const childKeys = /* @__PURE__ */ new Set();
			react.default.Children.forEach(children, (child) => {
				if (!react.default.isValidElement(child) || child.key === null) return;
				const key = String(child.key);
				childKeys.add(key);
				const existingItem = initialLayout.find((l) => l.i === key);
				if (existingItem) layout.push(cloneLayoutItem(existingItem));
				else {
					const dataGrid = child.props["data-grid"];
					if (dataGrid) layout.push({
						i: key,
						x: dataGrid.x ?? 0,
						y: dataGrid.y ?? 0,
						w: dataGrid.w ?? 1,
						h: dataGrid.h ?? 1,
						minW: dataGrid.minW,
						maxW: dataGrid.maxW,
						minH: dataGrid.minH,
						maxH: dataGrid.maxH,
						static: dataGrid.static,
						isDraggable: dataGrid.isDraggable,
						isResizable: dataGrid.isResizable,
						resizeHandles: dataGrid.resizeHandles,
						isBounded: dataGrid.isBounded
					});
					else layout.push({
						i: key,
						x: 0,
						y: bottom(layout),
						w: 1,
						h: 1
					});
				}
			});
			const corrected = correctBounds(layout, { cols });
			return compactor.compact(corrected, cols);
		}
		function GridLayout(props) {
			const { children, width, gridConfig: gridConfigProp, dragConfig: dragConfigProp, resizeConfig: resizeConfigProp, dropConfig: dropConfigProp, positionStrategy = defaultPositionStrategy, compactor: compactorProp, constraints = defaultConstraints, layout: propsLayout = [], droppingItem: droppingItemProp, autoSize = true, className = "", style = {}, innerRef, onLayoutChange = noop, onDragStart: onDragStartProp = noop, onDrag: onDragProp = noop, onDragStop: onDragStopProp = noop, onResizeStart: onResizeStartProp = noop, onResize: onResizeProp = noop, onResizeStop: onResizeStopProp = noop, onDrop: onDropProp = noop, onDropDragOver: onDropDragOverProp = noop } = props;
			const gridConfig = (0, react.useMemo)(() => ({
				...defaultGridConfig,
				...gridConfigProp
			}), [gridConfigProp]);
			const dragConfig = (0, react.useMemo)(() => ({
				...defaultDragConfig,
				...dragConfigProp
			}), [dragConfigProp]);
			const resizeConfig = (0, react.useMemo)(() => ({
				...defaultResizeConfig,
				...resizeConfigProp
			}), [resizeConfigProp]);
			const dropConfig = (0, react.useMemo)(() => ({
				...defaultDropConfig,
				...dropConfigProp
			}), [dropConfigProp]);
			const { cols, rowHeight, maxRows, margin, containerPadding } = gridConfig;
			const { enabled: isDraggable, bounded: isBounded, handle: draggableHandle, cancel: draggableCancel, threshold: dragThreshold } = dragConfig;
			const { enabled: isResizable, handles: resizeHandles, handleComponent: resizeHandle } = resizeConfig;
			const { enabled: isDroppable, defaultItem: defaultDropItem, onDragOver: dropConfigOnDragOver } = dropConfig;
			const compactor = compactorProp ?? getCompactor("vertical");
			const compactType = compactor.type;
			const allowOverlap = compactor.allowOverlap;
			const preventCollision = compactor.preventCollision ?? false;
			const droppingItem = (0, react.useMemo)(() => droppingItemProp ?? {
				i: "__dropping-elem__",
				...defaultDropItem
			}, [droppingItemProp, defaultDropItem]);
			const useCSSTransforms = positionStrategy.type === "transform";
			const transformScale = positionStrategy.scale;
			const effectiveContainerPadding = containerPadding ?? margin;
			const [mounted, setMounted] = (0, react.useState)(false);
			const [layout, setLayout] = (0, react.useState)(() => synchronizeLayoutWithChildren(propsLayout, children, cols, compactor));
			const [activeDrag, setActiveDrag] = (0, react.useState)(null);
			const [resizing, setResizing] = (0, react.useState)(false);
			const [droppingDOMNode, setDroppingDOMNode] = (0, react.useState)(null);
			const [droppingPosition, setDroppingPosition] = (0, react.useState)();
			const oldDragItemRef = (0, react.useRef)(null);
			const oldResizeItemRef = (0, react.useRef)(null);
			const oldLayoutRef = (0, react.useRef)(null);
			const dragEnterCounterRef = (0, react.useRef)(0);
			const prevLayoutRef = (0, react.useRef)(layout);
			const prevPropsLayoutRef = (0, react.useRef)(propsLayout);
			const prevChildrenRef = (0, react.useRef)(children);
			const prevCompactTypeRef = (0, react.useRef)(compactType);
			const layoutRef = (0, react.useRef)(layout);
			layoutRef.current = layout;
			(0, react.useEffect)(() => {
				setMounted(true);
				if (!(0, import_fast_equals_cjs.deepEqual)(layout, propsLayout)) onLayoutChange(layout);
			}, []);
			(0, react.useEffect)(() => {
				if (activeDrag) return;
				if (droppingDOMNode) return;
				const layoutChanged = !(0, import_fast_equals_cjs.deepEqual)(propsLayout, prevPropsLayoutRef.current);
				const childrenChanged = !childrenEqual(children, prevChildrenRef.current);
				const compactTypeChanged = compactType !== prevCompactTypeRef.current;
				if (layoutChanged || childrenChanged || compactTypeChanged) {
					const newLayout = synchronizeLayoutWithChildren(layoutChanged ? propsLayout : layout, children, cols, compactor);
					if (!(0, import_fast_equals_cjs.deepEqual)(newLayout, layout)) setLayout(newLayout);
				}
				prevPropsLayoutRef.current = propsLayout;
				prevChildrenRef.current = children;
				prevCompactTypeRef.current = compactType;
			}, [
				propsLayout,
				children,
				cols,
				compactType,
				compactor,
				activeDrag,
				droppingDOMNode,
				layout
			]);
			(0, react.useEffect)(() => {
				if (!activeDrag && !(0, import_fast_equals_cjs.deepEqual)(layout, prevLayoutRef.current)) {
					prevLayoutRef.current = layout;
					const publicLayout = layout.filter((l) => l.i !== droppingItem.i);
					onLayoutChange(publicLayout);
				}
			}, [
				layout,
				activeDrag,
				onLayoutChange,
				droppingItem.i
			]);
			const containerHeight = (0, react.useMemo)(() => {
				if (!autoSize) return void 0;
				const nbRow = bottom(layout);
				const containerPaddingY = effectiveContainerPadding[1];
				return nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px";
			}, [
				autoSize,
				layout,
				rowHeight,
				margin,
				effectiveContainerPadding
			]);
			const onDragStart = (0, react.useCallback)((i, _x, _y, data) => {
				const currentLayout = layoutRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i
				};
				oldDragItemRef.current = cloneLayoutItem(l);
				oldLayoutRef.current = currentLayout;
				setActiveDrag(placeholder);
				onDragStartProp(currentLayout, l, l, null, data.e, data.node);
			}, [onDragStartProp]);
			const onDrag = (0, react.useCallback)((i, x, y, data) => {
				const currentLayout = layoutRef.current;
				const oldDragItem = oldDragItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i
				};
				const newLayout = moveElement(currentLayout, l, x, y, true, preventCollision, compactType, cols, allowOverlap);
				onDragProp(newLayout, oldDragItem, l, placeholder, data.e, data.node);
				setLayout(compactor.compact(newLayout, cols));
				setActiveDrag(placeholder);
			}, [
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onDragProp
			]);
			const onDragStop = (0, react.useCallback)((i, x, y, data) => {
				if (!activeDrag) return;
				const currentLayout = layoutRef.current;
				const oldDragItem = oldDragItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const newLayout = moveElement(currentLayout, l, x, y, true, preventCollision, compactType, cols, allowOverlap);
				const finalLayout = compactor.compact(newLayout, cols);
				onDragStopProp(finalLayout, oldDragItem, l, null, data.e, data.node);
				const oldLayout = oldLayoutRef.current;
				oldDragItemRef.current = null;
				oldLayoutRef.current = null;
				setActiveDrag(null);
				setLayout(finalLayout);
				if (oldLayout && !(0, import_fast_equals_cjs.deepEqual)(oldLayout, finalLayout)) onLayoutChange(finalLayout);
			}, [
				activeDrag,
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onDragStopProp,
				onLayoutChange
			]);
			const onResizeStart = (0, react.useCallback)((i, _w, _h, data) => {
				const currentLayout = layoutRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				oldResizeItemRef.current = cloneLayoutItem(l);
				oldLayoutRef.current = currentLayout;
				setResizing(true);
				onResizeStartProp(currentLayout, l, l, null, data.e, data.node);
			}, [onResizeStartProp]);
			const onResize = (0, react.useCallback)((i, w, h, data) => {
				const currentLayout = layoutRef.current;
				const oldResizeItem = oldResizeItemRef.current;
				const { handle } = data;
				let shouldMoveItem = false;
				let newX;
				let newY;
				const [newLayout, l] = withLayoutItem(currentLayout, i, (item) => {
					newX = item.x;
					newY = item.y;
					if ([
						"sw",
						"w",
						"nw",
						"n",
						"ne"
					].includes(handle)) {
						if ([
							"sw",
							"nw",
							"w"
						].includes(handle)) {
							newX = item.x + (item.w - w);
							w = item.x !== newX && newX < 0 ? item.w : w;
							newX = newX < 0 ? 0 : newX;
						}
						if ([
							"ne",
							"n",
							"nw"
						].includes(handle)) {
							newY = item.y + (item.h - h);
							h = item.y !== newY && newY < 0 ? item.h : h;
							newY = newY < 0 ? 0 : newY;
						}
						shouldMoveItem = true;
					}
					if (preventCollision && !allowOverlap) {
						if (getAllCollisions(currentLayout, {
							...item,
							w,
							h,
							x: newX ?? item.x,
							y: newY ?? item.y
						}).filter((layoutItem) => layoutItem.i !== item.i).length > 0) {
							newY = item.y;
							h = item.h;
							newX = item.x;
							w = item.w;
							shouldMoveItem = false;
						}
					}
					item.w = w;
					item.h = h;
					return item;
				});
				if (!l) return;
				let finalLayout = newLayout;
				if (shouldMoveItem && newX !== void 0 && newY !== void 0) finalLayout = moveElement(newLayout, l, newX, newY, true, preventCollision, compactType, cols, allowOverlap);
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i,
					static: true
				};
				onResizeProp(finalLayout, oldResizeItem, l, placeholder, data.e, data.node);
				setLayout(compactor.compact(finalLayout, cols));
				setActiveDrag(placeholder);
			}, [
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onResizeProp
			]);
			const onResizeStop = (0, react.useCallback)((i, _w, _h, data) => {
				const currentLayout = layoutRef.current;
				const oldResizeItem = oldResizeItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				const finalLayout = compactor.compact(currentLayout, cols);
				onResizeStopProp(finalLayout, oldResizeItem, l ?? null, null, data.e, data.node);
				const oldLayout = oldLayoutRef.current;
				oldResizeItemRef.current = null;
				oldLayoutRef.current = null;
				setActiveDrag(null);
				setResizing(false);
				setLayout(finalLayout);
				if (oldLayout && !(0, import_fast_equals_cjs.deepEqual)(oldLayout, finalLayout)) onLayoutChange(finalLayout);
			}, [
				cols,
				compactor,
				onResizeStopProp,
				onLayoutChange
			]);
			const removeDroppingPlaceholder = (0, react.useCallback)(() => {
				const currentLayout = layoutRef.current;
				if (!currentLayout.some((l) => l.i === droppingItem.i)) {
					setDroppingDOMNode(null);
					setActiveDrag(null);
					setDroppingPosition(void 0);
					return;
				}
				const newLayout = compactor.compact(currentLayout.filter((l) => l.i !== droppingItem.i), cols);
				setLayout(newLayout);
				setDroppingDOMNode(null);
				setActiveDrag(null);
				setDroppingPosition(void 0);
			}, [
				droppingItem.i,
				cols,
				compactor
			]);
			const handleDragOver = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				if (isFirefox && !e.nativeEvent.target?.classList.contains(layoutClassName)) return false;
				const rawResult = dropConfigOnDragOver ? dropConfigOnDragOver(e.nativeEvent) : onDropDragOverProp(e);
				if (rawResult === false) {
					if (droppingDOMNode) removeDroppingPlaceholder();
					return false;
				}
				const { dragOffsetX = 0, dragOffsetY = 0, ...onDragOverResult } = rawResult ?? {};
				const finalDroppingItem = {
					...droppingItem,
					...onDragOverResult
				};
				const gridRect = e.currentTarget.getBoundingClientRect();
				const positionParams = {
					cols,
					margin,
					maxRows,
					rowHeight,
					containerWidth: width,
					containerPadding: effectiveContainerPadding
				};
				const actualColWidth = calcGridColWidth(positionParams);
				const itemPixelWidth = calcGridItemWHPx(finalDroppingItem.w, actualColWidth, margin[0]);
				const itemPixelHeight = calcGridItemWHPx(finalDroppingItem.h, rowHeight, margin[1]);
				const itemCenterOffsetX = itemPixelWidth / 2;
				const itemCenterOffsetY = itemPixelHeight / 2;
				const rawGridX = e.clientX - gridRect.left + dragOffsetX - itemCenterOffsetX;
				const rawGridY = e.clientY - gridRect.top + dragOffsetY - itemCenterOffsetY;
				const clampedGridX = Math.max(0, rawGridX);
				const clampedGridY = Math.max(0, rawGridY);
				const newDroppingPosition = {
					left: clampedGridX / transformScale,
					top: clampedGridY / transformScale,
					e: e.nativeEvent
				};
				if (!droppingDOMNode) {
					const calculatedPosition = calcXY(positionParams, clampedGridY, clampedGridX, finalDroppingItem.w, finalDroppingItem.h);
					setDroppingDOMNode(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {}, finalDroppingItem.i));
					setDroppingPosition(newDroppingPosition);
					const baseLayout = layoutRef.current.filter((l) => l.i !== finalDroppingItem.i);
					setLayout([...baseLayout, {
						...finalDroppingItem,
						x: calculatedPosition.x,
						y: calculatedPosition.y,
						static: false,
						isDraggable: true
					}]);
				} else if (droppingPosition) {
					if (droppingPosition.left !== newDroppingPosition.left || droppingPosition.top !== newDroppingPosition.top) setDroppingPosition(newDroppingPosition);
				}
			}, [
				droppingDOMNode,
				droppingPosition,
				droppingItem,
				dropConfigOnDragOver,
				onDropDragOverProp,
				removeDroppingPlaceholder,
				transformScale,
				cols,
				margin,
				maxRows,
				rowHeight,
				width,
				effectiveContainerPadding
			]);
			const handleDragLeave = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				dragEnterCounterRef.current--;
				if (dragEnterCounterRef.current < 0) dragEnterCounterRef.current = 0;
				if (dragEnterCounterRef.current === 0) removeDroppingPlaceholder();
			}, [removeDroppingPlaceholder]);
			const handleDragEnter = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				dragEnterCounterRef.current++;
			}, []);
			const handleDrop = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				const currentLayout = layoutRef.current;
				const item = currentLayout.find((l) => l.i === droppingItem.i);
				dragEnterCounterRef.current = 0;
				removeDroppingPlaceholder();
				onDropProp(currentLayout, item, e.nativeEvent);
			}, [
				droppingItem.i,
				removeDroppingPlaceholder,
				onDropProp
			]);
			const processGridItem = (0, react.useCallback)((child, isDroppingItem) => {
				if (!child || !child.key) return null;
				const l = getLayoutItem(layout, String(child.key));
				if (!l) return null;
				const draggable = typeof l.isDraggable === "boolean" ? l.isDraggable : !l.static && isDraggable;
				const resizable = typeof l.isResizable === "boolean" ? l.isResizable : !l.static && isResizable;
				const resizeHandlesOptions = l.resizeHandles || [...resizeHandles];
				const bounded = draggable && isBounded && l.isBounded !== false;
				const resizeHandleElement = resizeHandle;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridItem, {
					containerWidth: width,
					cols,
					margin,
					containerPadding: effectiveContainerPadding,
					maxRows,
					rowHeight,
					cancel: draggableCancel,
					handle: draggableHandle,
					onDragStart,
					onDrag,
					onDragStop,
					onResizeStart,
					onResize,
					onResizeStop,
					isDraggable: draggable,
					isResizable: resizable,
					isBounded: bounded,
					useCSSTransforms: useCSSTransforms && mounted,
					usePercentages: !mounted,
					transformScale,
					positionStrategy,
					dragThreshold,
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i: l.i,
					minH: l.minH,
					minW: l.minW,
					maxH: l.maxH,
					maxW: l.maxW,
					static: l.static,
					droppingPosition: isDroppingItem ? droppingPosition : void 0,
					resizeHandles: resizeHandlesOptions,
					resizeHandle: resizeHandleElement,
					constraints,
					layoutItem: l,
					layout,
					children: child
				}, l.i);
			}, [
				layout,
				width,
				cols,
				margin,
				effectiveContainerPadding,
				maxRows,
				rowHeight,
				draggableCancel,
				draggableHandle,
				onDragStart,
				onDrag,
				onDragStop,
				onResizeStart,
				onResize,
				onResizeStop,
				isDraggable,
				isResizable,
				isBounded,
				useCSSTransforms,
				mounted,
				transformScale,
				positionStrategy,
				dragThreshold,
				droppingPosition,
				resizeHandles,
				resizeHandle,
				constraints
			]);
			const renderPlaceholder = () => {
				if (!activeDrag) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridItem, {
					w: activeDrag.w,
					h: activeDrag.h,
					x: activeDrag.x,
					y: activeDrag.y,
					i: activeDrag.i,
					className: `react-grid-placeholder ${resizing ? "placeholder-resizing" : ""}`,
					containerWidth: width,
					cols,
					margin,
					containerPadding: effectiveContainerPadding,
					maxRows,
					rowHeight,
					isDraggable: false,
					isResizable: false,
					isBounded: false,
					useCSSTransforms,
					transformScale,
					constraints,
					layout,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {})
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: innerRef,
				className: clsx(layoutClassName, className),
				style: {
					height: containerHeight,
					...style
				},
				onDrop: isDroppable ? handleDrop : void 0,
				onDragLeave: isDroppable ? handleDragLeave : void 0,
				onDragEnter: isDroppable ? handleDragEnter : void 0,
				onDragOver: isDroppable ? handleDragOver : void 0,
				children: [
					react.default.Children.map(children, (child) => {
						if (!react.default.isValidElement(child)) return null;
						return processGridItem(child);
					}),
					isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true),
					renderPlaceholder()
				]
			});
		}
		//#endregion
		//#region src/client/multi-preview.ts
		function overlaps(a, b) {
			return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
		}
		function contains(rect, point) {
			return point.x >= rect.x && point.x < rect.x + rect.w && point.y >= rect.y && point.y < rect.y + rect.h;
		}
		/**
		* Choose one axis for the entire direct collision set, never separately per peer.
		* A single target uses its normalized pointer offset (candidate center outside
		* that target). Multiple targets minimize summed edge-exit distance; ties use y.
		*/
		function placementAxis(snapshot, id, rect, pointer) {
			if (!rect) return "y";
			const direct = snapshot.filter((peer) => peer.i !== id && overlaps(rect, peer));
			if (direct.length === 1) {
				const peer = direct[0];
				const point = pointer && contains(peer, pointer) ? pointer : {
					x: rect.x + rect.w / 2,
					y: rect.y + rect.h / 2
				};
				const dx = (point.x - peer.x - peer.w / 2) / peer.w;
				const dy = (point.y - peer.y - peer.h / 2) / peer.h;
				return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
			}
			let dx = 0;
			let dy = 0;
			for (const peer of direct) {
				dx += Math.min(Math.abs(rect.x - peer.x - peer.w), Math.abs(rect.x + rect.w - peer.x));
				dy += Math.min(Math.abs(rect.y - peer.y - peer.h), Math.abs(rect.y + rect.h - peer.y));
			}
			return dx < dy ? "x" : "y";
		}
		/**
		* Keep successful preferred-axis previews byte-for-byte. Only after that entire
		* axis is exhausted may the other axis run, once; never combine axes in a solve.
		*/
		function multiPreviewPlacement(snapshot, id, rect, cols, pointer) {
			const axis = placementAxis(snapshot, id, rect, pointer);
			return solveAxis(snapshot, id, rect, cols, axis, pointer) ?? solveAxis(snapshot, id, rect, cols, axis === "x" ? "y" : "x", pointer) ?? snapshot.map((item) => ({ ...item }));
		}
		/**
		* One shared axis, immutable cross coordinates and original peer order. Keep
		* the original preferred sweep and bounded direct-peer partitions unchanged;
		* aligned direct groups stay together and chain peers inherit their direction.
		* No arbitrary moves, active relocation, or free reordering are searched.
		*/
		function solveAxis(snapshot, id, rect, cols, axis, pointer) {
			const clone = () => snapshot.map((item) => ({ ...item }));
			const activeIndex = snapshot.findIndex((item) => item.i === id);
			if (axis !== "x" && axis !== "y" || !Number.isInteger(cols) || cols < 1 || cols > 32 || activeIndex < 0 || !canPlace([], id, rect, cols) || pointer !== void 0 && (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y))) return;
			const ids = /* @__PURE__ */ new Set();
			for (const item of snapshot) {
				if (typeof item.i !== "string" || ids.has(item.i) || !canPlace(snapshot, item.i, item, cols)) return void 0;
				ids.add(item.i);
			}
			const cross = axis === "x" ? "y" : "x";
			const size = axis === "x" ? "w" : "h";
			const crossSize = axis === "x" ? "h" : "w";
			const center = rect[axis] + rect[size] / 2;
			const origin = snapshot[activeIndex];
			const originCenter = origin[axis] + origin[size] / 2;
			const preferred = snapshot.map(() => 0);
			const direct = snapshot.map((peer, index) => index !== activeIndex && overlaps(rect, peer) ? index : -1).filter((index) => index >= 0);
			for (const index of direct) {
				const peer = snapshot[index];
				const peerCenter = peer[axis] + peer[size] / 2;
				let sign = peerCenter < center ? -1 : peerCenter > center ? 1 : 0;
				if (sign === 0) {
					const group = direct.filter((other) => snapshot[other][axis] === peer[axis] && snapshot[other][size] === peer[size]);
					sign = pointer && group.some((other) => contains(snapshot[other], pointer)) ? pointer[axis] > peerCenter ? -1 : 1 : originCenter > center ? -1 : 1;
				}
				preferred[index] = sign;
			}
			const peers = snapshot.map((_, index) => index).filter((index) => index !== activeIndex).sort((a, b) => snapshot[a][axis] - snapshot[b][axis] || a - b);
			const crossOverlaps = (a, b) => a[cross] < b[cross] + b[crossSize] && b[cross] < a[cross] + a[crossSize];
			const sweep = (directSigns) => {
				const next = clone();
				next[activeIndex] = {
					...next[activeIndex],
					x: rect.x,
					y: rect.y,
					w: rect.w,
					h: rect.h
				};
				const signs = [...directSigns];
				for (const index of direct) next[index][axis] = signs[index] < 0 ? rect[axis] - snapshot[index][size] : rect[axis] + rect[size];
				for (const sign of [-1, 1]) {
					const ordered = sign < 0 ? peers.slice().reverse() : peers;
					for (const blockerIndex of ordered) {
						if (signs[blockerIndex] !== sign) continue;
						const blocker = next[blockerIndex];
						for (const peerIndex of ordered) {
							const peer = next[peerIndex];
							if (peerIndex === blockerIndex || !crossOverlaps(blocker, peer)) continue;
							const before = snapshot[peerIndex][axis] < snapshot[blockerIndex][axis];
							if (sign < 0 !== before) continue;
							const edge = sign < 0 ? blocker[axis] - peer[size] : blocker[axis] + blocker[size];
							if (sign < 0 ? peer[axis] <= edge : peer[axis] >= edge) continue;
							if (signs[peerIndex] !== 0 && signs[peerIndex] !== sign) return void 0;
							signs[peerIndex] = sign;
							peer[axis] = edge;
						}
					}
				}
				for (const peer of next) if (!canPlace(next, peer.i, peer, cols)) return void 0;
				return next;
			};
			const original = sweep(preferred);
			if (original) return original;
			const sortedDirect = [...direct].sort((a, b) => snapshot[a][axis] - snapshot[b][axis] || snapshot[a][size] - snapshot[b][size] || a - b);
			const partitions = [];
			for (let split = 0; split <= sortedDirect.length; split++) {
				const left = snapshot[sortedDirect[split - 1]];
				const right = snapshot[sortedDirect[split]];
				if (left && right && left[axis] === right[axis] && left[size] === right[size]) continue;
				const signs = snapshot.map(() => 0);
				let violations = 0;
				for (let position = 0; position < sortedDirect.length; position++) {
					const index = sortedDirect[position];
					signs[index] = position < split ? -1 : 1;
					if (signs[index] !== preferred[index]) violations++;
				}
				partitions.push({
					signs,
					violations,
					split
				});
			}
			partitions.sort((a, b) => a.violations - b.violations || a.split - b.split);
			let best;
			let bestViolations = Infinity;
			let bestMovement = Infinity;
			for (const partition of partitions) {
				if (partition.violations > bestViolations) break;
				const next = sweep(partition.signs);
				if (!next) continue;
				const movement = peers.reduce((sum, index) => sum + Math.abs(next[index][axis] - snapshot[index][axis]), 0);
				if (movement < bestMovement) {
					best = next;
					bestViolations = partition.violations;
					bestMovement = movement;
				}
			}
			return best;
		}
		function advanceHover(previous, candidate, colliding, now) {
			if (!colliding) return {
				intent: null,
				ready: true,
				remaining: 0
			};
			if (!Number.isFinite(now) || now < 0) return {
				intent: null,
				ready: false,
				remaining: 500
			};
			const key = `${candidate.x},${candidate.y},${candidate.w},${candidate.h}`;
			if (!previous || previous.key !== key || !Number.isFinite(previous.since) || previous.since < 0 || now < previous.since) return {
				intent: {
					key,
					since: now,
					confirmed: false
				},
				ready: false,
				remaining: 500
			};
			const remaining = Math.max(0, 500 - (now - previous.since));
			if (previous.confirmed || remaining === 0) return {
				intent: previous.confirmed ? previous : {
					...previous,
					confirmed: true
				},
				ready: true,
				remaining: 0
			};
			return {
				intent: previous,
				ready: false,
				remaining
			};
		}
		//#endregion
		//#region src/client/drag-visual.ts
		function pinDraggedItem(peers, id, candidate) {
			return peers.map((item) => item.i === id ? {
				...item,
				...candidate
			} : { ...item });
		}
		function placementAccepted(preview, id, candidate) {
			const item = preview.find((entry) => entry.i === id);
			return item !== void 0 && item.x === candidate.x && item.y === candidate.y && item.w === candidate.w && item.h === candidate.h;
		}
		//#endregion
		//#region src/client/canvas-extent.ts
		const stride = 56;
		function canvasContentHeight(layout) {
			return Math.max(0, ...layout.map((item) => (item.y + item.h) * stride - 12));
		}
		/** Retain the high-water mark, including unsnapped pixels and one viewport of runway.
		* Growing before scrolling avoids a browser clamp at the old board's bottom.
		* No additive padding or arbitrary pixel cap: the existing model owns legal y.
		*/
		function extendCanvasHeight(previous, contentBottom, pixelBottom = 0, viewportBottom = 0, viewportHeight = 0) {
			return Math.ceil(Math.max(previous, 900, contentBottom + stride, pixelBottom + stride, viewportBottom + Math.max(stride, viewportHeight)));
		}
		/** A vertical canvas has a fixed horizontal footprint, even during RGL pixel dragging. */
		function clampCanvasLeft(left, canvasWidth, itemWidth) {
			return Math.max(0, Math.min(left, Math.max(0, canvasWidth - itemWidth)));
		}
		function clampCanvasScroll(top, scrollHeight, clientHeight) {
			return Math.max(0, Math.min(top, Math.max(0, scrollHeight - clientHeight)));
		}
		//#endregion
		//#region src/client/spatial-grid.tsx
		/** RGL supplies pixel dragging/resize; a snapshot-based compactor previews local displacement. */
		const items = (value, cols) => value.map((item) => ({
			...item,
			minW: item.minW ?? Math.min(3, cols),
			minH: item.minH ?? 3,
			maxW: Math.min(item.maxW ?? cols, cols)
		}));
		function SpatialGrid({ width, cols, layout, editing, onCommit, onActive, children, libraryDrag, libraryGhost, onLibraryDrop, onLibraryEnd, deleteZone, onDeleteRequest }) {
			const [libraryVisual, setLibraryVisual] = (0, react.useState)(null);
			const [libraryOutline, setLibraryOutline] = (0, react.useState)(null);
			const libraryRef = (0, react.useRef)(libraryDrag);
			const zoneRef = (0, react.useRef)(deleteZone);
			zoneRef.current = deleteZone;
			const deleteRequest = (0, react.useRef)(onDeleteRequest);
			deleteRequest.current = onDeleteRequest;
			/** Visual armed state of the delete target while a card hovers it. */
			const armed = (0, react.useRef)(false);
			const latestLayout = (0, react.useRef)(layout);
			latestLayout.current = layout;
			libraryRef.current = libraryDrag;
			const libraryHandlers = (0, react.useRef)({
				onLibraryDrop,
				onLibraryEnd
			});
			libraryHandlers.current = {
				onLibraryDrop,
				onLibraryEnd
			};
			const [epoch, setEpoch] = (0, react.useState)(0);
			const [current, setCurrent] = (0, react.useState)(layout);
			const [dragHeight, setDragHeight] = (0, react.useState)(0);
			const extent = (0, react.useRef)(0);
			const scrollOrigin = (0, react.useRef)(null);
			const settleScroll = (0, react.useRef)(null);
			const active = (0, react.useRef)(false);
			const original = (0, react.useRef)(layout);
			const cancelled = (0, react.useRef)(false);
			const gesture = (0, react.useRef)(null);
			const root = (0, react.useRef)(null);
			const pointer = (0, react.useRef)(null);
			const lastTouch = (0, react.useRef)(null);
			const hoverTimer = (0, react.useRef)(null);
			const refreshStationary = (0, react.useRef)(() => {});
			const refreshLibrary = (0, react.useRef)(() => {});
			const desktopRelease = (0, react.useRef)(null);
			const desktopFinish = (0, react.useRef)(() => {});
			const cancelGesture = (0, react.useRef)(() => {});
			const updateLibraryTransaction = (0, react.useRef)(() => {});
			const retainCanvas = (contentBottom = 0, pixelBottom = 0) => {
				const grid = root.current;
				if (!grid) return;
				const container = grid.closest(".dsh-home");
				const viewport = container?.getBoundingClientRect();
				const next = extendCanvasHeight(extent.current, contentBottom, pixelBottom, viewport ? viewport.bottom - grid.getBoundingClientRect().top : 0, container?.clientHeight ?? 0);
				extent.current = next;
				grid.style.minHeight = `${next}px`;
				setDragHeight(next);
			};
			const beginCanvas = () => {
				const container = root.current?.closest(".dsh-home");
				scrollOrigin.current = container ? {
					container,
					top: container.scrollTop
				} : null;
				settleScroll.current = null;
				extent.current = root.current?.getBoundingClientRect().height ?? 0;
				retainCanvas(extent.current);
			};
			const releaseCanvas = (restore, result) => {
				const container = scrollOrigin.current?.container ?? root.current?.closest(".dsh-home");
				settleScroll.current = container ? {
					container,
					top: restore ? scrollOrigin.current?.top ?? container.scrollTop : container.scrollTop
				} : null;
				scrollOrigin.current = null;
				extent.current = 0;
				if (root.current) root.current.style.minHeight = `${Math.max(900, canvasContentHeight(result))}px`;
				setDragHeight(0);
			};
			(0, react.useLayoutEffect)(() => {
				const settled = settleScroll.current;
				if (!settled || active.current) return;
				settleScroll.current = null;
				settled.container.scrollTop = clampCanvasScroll(settled.top, settled.container.scrollHeight, settled.container.clientHeight);
			});
			const clearHover = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				hoverTimer.current = null;
				if (root.current) {
					delete root.current.dataset.hoverPending;
					delete root.current.dataset.dropRejected;
				}
			};
			/** True while the live pointer sits on the page's delete target; a drop there aborts. */
			const overDeleteZone = () => {
				const zone = zoneRef.current?.current;
				if (zone === null || zone === void 0 || libraryRef.current) return false;
				return insideDropZone(pointer.current, zone.getBoundingClientRect());
			};
			/** Mirror the pointer state onto the target so the affordance follows the gesture. */
			const armDeleteZone = (next) => {
				armed.current = next;
				const zone = zoneRef.current?.current;
				if (zone === null || zone === void 0) return;
				if (next) zone.dataset.armed = "true";
				else delete zone.dataset.armed;
			};
			(0, react.useEffect)(() => {
				if (!active.current) setCurrent(layout);
			}, [layout]);
			(0, react.useEffect)(() => {
				clearHover();
				desktopRelease.current?.();
				active.current = false;
				cancelled.current = true;
				gesture.current = null;
				pointer.current = null;
				releaseCanvas(true, layout);
				setCurrent(layout);
				setDragHeight(0);
				document.body.classList.remove("dsh-home-dragging");
				onActive(false);
				return () => {
					clearHover();
					desktopRelease.current?.();
					active.current = false;
					cancelled.current = true;
					gesture.current = null;
					document.body.classList.remove("dsh-home-dragging");
					onActive(false);
				};
			}, [cols, onActive]);
			cancelGesture.current = () => {
				if (!active.current) return;
				clearHover();
				armDeleteZone(false);
				desktopRelease.current?.();
				cancelled.current = true;
				active.current = false;
				gesture.current = null;
				pointer.current = null;
				releaseCanvas(true, original.current);
				setCurrent(original.current);
				setDragHeight(0);
				setEpoch((i) => i + 1);
				setLibraryVisual(null);
				setLibraryOutline(null);
				document.body.classList.remove("dsh-home-dragging");
				onActive(false);
				if (libraryRef.current) libraryHandlers.current.onLibraryEnd?.();
			};
			(0, react.useEffect)(() => {
				const cancel = (event) => {
					if (!active.current || event.type === "keydown" && event.key !== "Escape") return;
					if (event.type === "keydown") {
						event.preventDefault();
						event.stopImmediatePropagation();
					}
					cancelGesture.current();
				};
				window.addEventListener("keydown", cancel, true);
				window.addEventListener("touchcancel", cancel, true);
				window.addEventListener("blur", cancel);
				return () => {
					window.removeEventListener("keydown", cancel, true);
					window.removeEventListener("touchcancel", cancel, true);
					window.removeEventListener("blur", cancel);
					document.body.classList.remove("dsh-home-dragging");
				};
			}, [onActive]);
			(0, react.useEffect)(() => {
				if (!editing) return;
				let frame = 0;
				const track = (event) => {
					const touch = "touches" in event ? event.touches[0] : void 0;
					if ("touches" in event && touch === void 0) return;
					pointer.current = {
						x: touch?.clientX ?? event.clientX,
						y: touch?.clientY ?? event.clientY,
						touch: touch !== void 0
					};
					if ("touches" in event) lastTouch.current = event;
				};
				const release = (event) => {
					if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
					pointer.current = {
						x: event.clientX,
						y: event.clientY,
						touch: event.pointerType !== "mouse"
					};
				};
				const scroll = () => {
					const p = pointer.current;
					armDeleteZone(active.current && gesture.current?.kind === "drag" && !libraryRef.current && overDeleteZone());
					const container = root.current?.closest(".dsh-home");
					if (active.current && gesture.current?.kind === "drag" && p && !p.touch && container) {
						const bounds = container.getBoundingClientRect();
						const edge = 72;
						let dy = 0;
						if (p.y > bounds.bottom - edge) dy = Math.min(16, Math.ceil((p.y - bounds.bottom + edge) / 5));
						else if (p.y < bounds.top + edge + 80) dy = -Math.min(16, Math.ceil((bounds.top + edge + 80 - p.y) / 5));
						if (dy !== 0) {
							if (dy > 0) retainCanvas();
							const before = container.scrollTop;
							container.scrollTop += dy;
							if (container.scrollTop !== before && !p.touch) if (libraryRef.current) refreshLibrary.current();
							else document.dispatchEvent(new MouseEvent("mousemove", {
								bubbles: true,
								cancelable: true,
								clientX: p.x,
								clientY: p.y,
								buttons: 1
							}));
						}
					}
					frame = requestAnimationFrame(scroll);
				};
				document.addEventListener("mousemove", track, true);
				document.addEventListener("touchmove", track, {
					capture: true,
					passive: true
				});
				document.addEventListener("pointerup", release, true);
				frame = requestAnimationFrame(scroll);
				return () => {
					document.removeEventListener("mousemove", track, true);
					document.removeEventListener("touchmove", track, true);
					document.removeEventListener("pointerup", release, true);
					cancelAnimationFrame(frame);
				};
			}, [editing]);
			const start = (value, item, kind, event, node) => {
				if (!item) return;
				const snapshot = items(value, cols);
				original.current = snapshot;
				cancelled.current = false;
				active.current = true;
				const touch = "touches" in event ? event.touches[0] : void 0;
				const mouse = touch ?? event;
				const box = node?.getBoundingClientRect();
				clearHover();
				armDeleteZone(false);
				gesture.current = {
					id: item.i,
					kind,
					snapshot,
					candidate: {
						x: item.x,
						y: item.y,
						w: item.w,
						h: item.h
					},
					preview: snapshot,
					intent: null,
					pending: false,
					direction: "y",
					rejected: false,
					node,
					grab: box && Number.isFinite(mouse.clientX) ? {
						x: mouse.clientX - box.left,
						y: mouse.clientY - box.top
					} : void 0
				};
				if (Number.isFinite(mouse.clientX)) pointer.current = {
					x: mouse.clientX,
					y: mouse.clientY,
					touch: touch !== void 0
				};
				beginCanvas();
				document.body.classList.add("dsh-home-dragging");
				const session = gesture.current;
				desktopRelease.current?.();
				desktopRelease.current = observeDragRelease({
					window,
					document,
					documentElement: document.documentElement
				}, {
					transport: touch ? "touch" : "mouse",
					onRelease: () => {
						setTimeout(() => {
							if (active.current && gesture.current === session) desktopFinish.current();
						}, 0);
					},
					onCancel: () => cancelGesture.current()
				});
				onActive(true);
			};
			const update = (_value, _old, item, placeholder, _event, node) => {
				const session = gesture.current;
				if (!session || !item || cancelled.current) return;
				if (session.kind === "drag") {
					const gridBox = root.current?.getBoundingClientRect();
					const box = node?.getBoundingClientRect();
					const p = pointer.current;
					session.candidate = snapCandidate(gridBox && p && session.grab ? {
						x: (p.x - session.grab.x - gridBox.left) / ((width + 12) / cols),
						y: (p.y - session.grab.y - gridBox.top) / 56
					} : gridBox && box ? {
						x: (box.left - gridBox.left) / ((width + 12) / cols),
						y: (box.top - gridBox.top) / 56
					} : {
						x: item.x,
						y: item.y
					}, session.id, session.snapshot, cols, session.candidate);
				} else session.candidate = {
					x: item.x,
					y: item.y,
					w: item.w,
					h: item.h
				};
				clearHover();
				const grid = root.current?.getBoundingClientRect();
				const p = pointer.current;
				const aim = grid && p ? {
					x: (p.x - grid.left) / ((width + 12) / cols),
					y: (p.y - grid.top) / 56
				} : void 0;
				const direction = session.kind === "drag" ? placementAxis(session.snapshot, session.id, session.candidate, aim) : "y";
				if (direction !== session.direction) session.intent = null;
				session.direction = direction;
				const colliding = !canPlace(session.snapshot, session.id, session.candidate, cols);
				const intent = session.kind === "drag" ? advanceHover(session.intent, session.candidate, colliding, performance.now()) : {
					intent: null,
					ready: true,
					remaining: 0
				};
				session.intent = intent.intent;
				session.pending = !intent.ready;
				session.preview = intent.ready ? multiPreviewPlacement(session.snapshot, session.id, session.candidate, cols, session.kind === "drag" ? aim : void 0) : session.snapshot.map((entry) => ({ ...entry }));
				if (session.pending) {
					if (root.current) root.current.dataset.hoverPending = "true";
					const pendingKey = session.intent?.key;
					hoverTimer.current = setTimeout(() => {
						hoverTimer.current = null;
						if (!active.current || gesture.current !== session || session.intent?.key !== pendingKey) return;
						refreshStationary.current();
					}, Math.max(1, Math.ceil(intent.remaining)));
				}
				session.rejected = !session.pending && !placementAccepted(session.preview, session.id, session.candidate);
				if (root.current) if (session.rejected) root.current.dataset.dropRejected = "true";
				else delete root.current.dataset.dropRejected;
				const visualBottom = Math.max(canvasContentHeight([session.candidate]), canvasContentHeight(session.preview));
				const gridBox = root.current?.getBoundingClientRect();
				const point = pointer.current;
				const pixelBottom = gridBox && point && session.grab ? point.y - session.grab.y - gridBox.top + session.candidate.h * 56 - 12 : 0;
				retainCanvas(visualBottom, pixelBottom);
				if (placeholder) {
					placeholder.x = session.candidate.x;
					placeholder.y = session.candidate.y;
					placeholder.w = session.candidate.w;
					placeholder.h = session.candidate.h;
				}
			};
			refreshStationary.current = () => {
				const p = pointer.current;
				if (!active.current || !p) return;
				if (libraryRef.current) refreshLibrary.current();
				else if (!p.touch) document.dispatchEvent(new MouseEvent("mousemove", {
					bubbles: true,
					cancelable: true,
					clientX: p.x,
					clientY: p.y,
					buttons: 1
				}));
				else if (lastTouch.current) {
					const event = lastTouch.current;
					(event.target ?? document).dispatchEvent(new TouchEvent("touchmove", {
						bubbles: true,
						cancelable: true,
						touches: Array.from(event.touches),
						targetTouches: Array.from(event.targetTouches),
						changedTouches: Array.from(event.changedTouches)
					}));
				}
			};
			const compactor = (0, react.useMemo)(() => ({
				type: null,
				allowOverlap: true,
				preventCollision: false,
				compact(value) {
					const session = gesture.current;
					return active.current && session && !cancelled.current ? pinDraggedItem(session.preview, session.id, session.candidate) : value.map((item) => ({ ...item }));
				}
			}), []);
			const stop = (value) => {
				if (cancelled.current || !active.current || !gesture.current) return;
				const session = gesture.current;
				if (!libraryRef.current && overDeleteZone()) {
					const id = session.id, node = session.node;
					desktopRelease.current?.();
					cancelGesture.current();
					deleteRequest.current?.(id, node);
					return;
				}
				desktopRelease.current?.();
				const result = session?.preview ?? items(value, cols);
				const restoreEngine = session?.pending || session?.rejected;
				clearHover();
				active.current = false;
				gesture.current = null;
				pointer.current = null;
				releaseCanvas(Boolean(restoreEngine), result);
				setCurrent(result);
				setDragHeight(0);
				if (restoreEngine) setEpoch((i) => i + 1);
				onActive(false);
				document.body.classList.remove("dsh-home-dragging");
				onCommit(result);
			};
			desktopFinish.current = () => {
				stop(original.current);
				setEpoch((i) => i + 1);
			};
			updateLibraryTransaction.current = () => {
				const drag = libraryRef.current, session = gesture.current, p = pointer.current, grid = root.current?.getBoundingClientRect();
				if (!drag || !session || !p || !grid) return;
				const inside = libraryPointerInside(p, grid) && !document.elementFromPoint(p.x, p.y)?.closest(".dsh-library-panel");
				const w = (width + 12) / cols * drag.item.w - 12, h = drag.item.h * 56 - 12;
				setLibraryVisual({
					x: p.x - drag.grab.x,
					y: p.y - drag.grab.y,
					w,
					h,
					inside
				});
				if (!inside) {
					clearHover();
					session.intent = null;
					session.pending = true;
					session.rejected = false;
					session.preview = session.snapshot.map((entry) => ({ ...entry }));
					setCurrent(layout);
					setLibraryOutline(null);
					return;
				}
				const item = { ...drag.item };
				update([], null, item, null, new Event("library-drag"), null);
				setCurrent(session.preview.filter((entry) => entry.i !== drag.id));
				setLibraryOutline({
					x: grid.left + session.candidate.x * ((width + 12) / cols),
					y: grid.top + session.candidate.y * 56,
					w,
					h,
					pending: session.pending || session.rejected
				});
			};
			refreshLibrary.current = () => updateLibraryTransaction.current();
			(0, react.useLayoutEffect)(() => {
				if (!libraryDrag || !editing) return;
				const drag = libraryDrag;
				const snapshot = [...layout.map((item) => ({ ...item })), { ...drag.item }];
				original.current = layout;
				cancelled.current = false;
				active.current = true;
				pointer.current = {
					...drag.start,
					touch: drag.touch
				};
				gesture.current = {
					id: drag.id,
					kind: "drag",
					snapshot,
					candidate: { ...drag.item },
					preview: snapshot,
					node: null,
					grab: drag.grab,
					intent: null,
					pending: true,
					direction: "y",
					rejected: false
				};
				beginCanvas();
				document.body.classList.add("dsh-home-dragging");
				onActive(true);
				updateLibraryTransaction.current();
				const move = (event) => {
					if (!active.current || cancelled.current || event.pointerId !== drag.pointerId) return;
					event.preventDefault();
					pointer.current = {
						x: event.clientX,
						y: event.clientY,
						touch: event.pointerType === "touch"
					};
					updateLibraryTransaction.current();
				};
				const finish = (event) => {
					if (!active.current || cancelled.current || "pointerId" in event && event.pointerId !== drag.pointerId) return;
					pointer.current = {
						x: event.clientX,
						y: event.clientY,
						touch: "pointerType" in event && event.pointerType === "touch"
					};
					updateLibraryTransaction.current();
					const s = gesture.current, grid = root.current?.getBoundingClientRect();
					const accepted = grid && libraryPointerInside(pointer.current, grid) && !document.elementFromPoint(event.clientX, event.clientY)?.closest(".dsh-library-panel") && s && !s.pending && !s.rejected && placementAccepted(s.preview, drag.id, s.candidate);
					clearHover();
					active.current = false;
					gesture.current = null;
					pointer.current = null;
					releaseCanvas(!accepted, accepted && s ? s.preview : latestLayout.current);
					setCurrent(accepted && s ? s.preview : latestLayout.current);
					setLibraryVisual(null);
					setLibraryOutline(null);
					setDragHeight(0);
					document.body.classList.remove("dsh-home-dragging");
					onActive(false);
					if (accepted && s) libraryHandlers.current.onLibraryDrop?.(drag, s.preview);
					libraryHandlers.current.onLibraryEnd?.();
				};
				const release = observeDragRelease({
					window,
					document,
					documentElement: document.documentElement
				}, {
					transport: "pointer",
					pointerId: drag.pointerId,
					touch: drag.touch,
					onRelease: (event) => finish(event),
					onCancel: () => cancelGesture.current()
				});
				window.addEventListener("pointermove", move, {
					capture: true,
					passive: false
				});
				return () => {
					release();
					window.removeEventListener("pointermove", move, true);
					clearHover();
					if (active.current) releaseCanvas(true, latestLayout.current);
					active.current = false;
					gesture.current = null;
					pointer.current = null;
					setLibraryVisual(null);
					setLibraryOutline(null);
					setCurrent(latestLayout.current);
					setDragHeight(0);
					document.body.classList.remove("dsh-home-dragging");
					onActive(false);
				};
			}, [
				libraryDrag?.id,
				cols,
				editing
			]);
			const positionStrategy = (0, react.useMemo)(() => ({
				type: "transform",
				scale: 1,
				calcStyle: (position) => setTransform({
					...position,
					left: clampCanvasLeft(position.left, width, position.width)
				})
			}), [width]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridLayout, {
					width,
					layout: (0, react.useMemo)(() => current.map((item) => ({
						...item,
						maxH: item.maxH ?? 30
					})), [current]),
					innerRef: root,
					className: "dsh-spatial-grid",
					compactor,
					positionStrategy,
					gridConfig: {
						cols,
						rowHeight: 44,
						margin: [12, 12],
						containerPadding: [0, 0],
						maxRows: 10003
					},
					dragConfig: {
						enabled: editing,
						handle: ".dsh-widget-grip",
						cancel: "button:not(.dsh-widget-grip), input, select, textarea, a",
						threshold: 5
					},
					resizeConfig: {
						enabled: false,
						handles: []
					},
					style: { minHeight: editing ? Math.max(900, dragHeight, canvasContentHeight(current)) : void 0 },
					onDragStart: (value, _old, item, _placeholder, event, node) => {
						start(value, item, "drag", event, node);
					},
					onResizeStart: (value, _old, item, _placeholder, event, node) => {
						start(value, item, "resize", event, node);
					},
					onDrag: update,
					onResize: update,
					onDragStop: (value) => {
						stop(value);
					},
					onResizeStop: (value) => {
						stop(value);
					},
					children
				}, `${cols}-${epoch}`),
				libraryVisual && libraryOutline && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-library-outline",
					"data-pending": libraryOutline.pending,
					style: {
						left: libraryOutline.x,
						top: libraryOutline.y,
						width: libraryOutline.w,
						height: libraryOutline.h
					},
					"aria-hidden": "true"
				}), document.body),
				libraryVisual && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-library-ghost dsh-w",
					"data-inside": libraryVisual.inside,
					style: {
						left: libraryVisual.x,
						top: libraryVisual.y,
						width: libraryVisual.w,
						height: libraryVisual.h
					},
					inert: true,
					"aria-hidden": "true",
					children: libraryGhost
				}), document.body)
			] });
		}
		//#endregion
		//#region src/client/home-data.ts
		/**
		* 首页共享数据：计划（待办 / 日程 / 习惯）与计时（计时器 / 番茄钟）。
		*
		* 一份模块级 store，多个组件实例共享同一份订阅——这就是「待办、计划表、日程表、打卡」
		* 四处即时互通的机制：任何一处写入后更新 store，别处同一帧就跟着重渲染。
		*
		* 写入以宿主为准：每次操作发一条 op，返回整份新文档。客户端不重复实现 op 语义，
		* 也就不存在两份口径互相漂移的问题（代价是等一次本地 RPC，通常 1–2 ms）。
		*
		* 预览（`props.preview` 存在）**不读这个 store**：组件自己渲染合成数据，
		* 因此预览不会发请求、不会订阅、不会起计时。
		*
		* @module @vlln/dsh-home/client/home-data
		*/
		const ready = {
			writable: true,
			status: "ready",
			error: null
		};
		function initial() {
			return {
				planner: null,
				plannerStorage: ready,
				plannerLoading: false,
				plannerError: null,
				focus: null,
				focusStorage: ready,
				focusLoading: false,
				focusError: null
			};
		}
		/** 消息层错误 → 可显示的一行文字（不暴露内部栈）。 */
		function messageOf(error) {
			const text = error instanceof Error ? error.message : String(error);
			return text.trim() === "" ? "数据不可用" : text;
		}
		/** 共享数据 store；页面挂载时 `load()` 一次，卸载时 `reset()`。 */
		var HomeDataStore = class {
			snapshot = initial();
			listeners = /* @__PURE__ */ new Set();
			plannerInflight = null;
			focusInflight = null;
			disposed = false;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			getSnapshot = () => this.snapshot;
			publish(patch) {
				if (this.disposed) return;
				this.snapshot = {
					...this.snapshot,
					...patch
				};
				for (const listener of [...this.listeners]) listener();
			}
			/** 首次读取；并发调用共用同一次请求。 */
			load() {
				this.refreshPlanner();
				this.refreshFocus();
			}
			refreshPlanner() {
				if (this.plannerInflight !== null) return this.plannerInflight;
				this.publish({ plannerLoading: true });
				const run = (async () => {
					try {
						const value = await fetchPlanner();
						this.publish({
							planner: value.planner,
							plannerStorage: value.storage,
							plannerError: null
						});
					} catch (error) {
						this.publish({ plannerError: messageOf(error) });
					} finally {
						this.publish({ plannerLoading: false });
						this.plannerInflight = null;
					}
				})();
				this.plannerInflight = run;
				return run;
			}
			refreshFocus() {
				if (this.focusInflight !== null) return this.focusInflight;
				this.publish({ focusLoading: true });
				const run = (async () => {
					try {
						const value = await fetchFocus();
						this.publish({
							focus: value.focus,
							focusStorage: value.storage,
							focusError: null
						});
					} catch (error) {
						this.publish({ focusError: messageOf(error) });
					} finally {
						this.publish({ focusLoading: false });
						this.focusInflight = null;
					}
				})();
				this.focusInflight = run;
				return run;
			}
			/** 应用一条计划操作；失败时记下错误并抛给调用方（由调用方决定是否提示）。 */
			async mutatePlanner(operation) {
				try {
					const value = await applyPlanner(operation);
					this.publish({
						planner: value.planner,
						plannerStorage: value.storage,
						plannerError: null
					});
				} catch (error) {
					this.publish({
						plannerError: messageOf(error),
						plannerStorage: storageOf(error)
					});
					throw error;
				}
			}
			/** 应用一条计时操作。 */
			async mutateFocus(operation) {
				try {
					const value = await applyFocus(operation);
					this.publish({
						focus: value.focus,
						focusStorage: value.storage,
						focusError: null
					});
				} catch (error) {
					this.publish({
						focusError: messageOf(error),
						focusStorage: storageOf(error)
					});
					throw error;
				}
			}
			reset() {
				this.disposed = true;
				this.snapshot = initial();
				this.listeners.clear();
			}
		};
		function storageOf(error) {
			return error?.storage ?? ready;
		}
		/** 页面级单例。 */
		const homeData = new HomeDataStore();
		/** 组件读取共享数据（无 selector：数据量小，引用比较交给 React）。 */
		function useHomeData(store = homeData) {
			return {
				...(0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot),
				store
			};
		}
		/**
		* 秒级时钟；`enabled` 为 false（或停止）时不排定时器。
		* 只用于「现在」这类纯计算，不触发请求。
		* @param intervalMs 刷新间隔，默认 1000
		* @param enabled 是否走时（隐藏的卡、预览都传 false）
		*/
		function useNow(intervalMs = 1e3, enabled = true) {
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				if (!enabled) return;
				setNow(Date.now());
				const timer = setInterval(() => setNow(Date.now()), Math.max(250, intervalMs));
				return () => clearInterval(timer);
			}, [intervalMs, enabled]);
			return now;
		}
		/** 今天的日键（本地时区）。 */
		function todayKey(now = Date.now()) {
			const d = new Date(now);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		/** 日键加减天数。 */
		function shiftDay(key, delta) {
			const [year, month, day] = key.split("-").map(Number);
			const at = new Date(year, month - 1, day);
			at.setDate(at.getDate() + delta);
			return todayKey(at.getTime());
		}
		/** 两个日键相差几天（`to - from`）。 */
		function dayDiff(from, to) {
			const parse = (key) => {
				const [year, month, day] = key.split("-").map(Number);
				return new Date(year, month - 1, day).getTime();
			};
			return Math.round((parse(to) - parse(from)) / 864e5);
		}
		/** 一周七天的周几（周一 = 1 … 周日 = 7）。 */
		function weekdayOf(key) {
			const [year, month, day] = key.split("-").map(Number);
			const index = new Date(year, month - 1, day).getDay();
			return index === 0 ? 7 : index;
		}
		//#endregion
		//#region src/client/widget-registry.ts
		const WIDGET_JSON_LIMITS = Object.freeze({
			maxDepth: 8,
			maxNodes: 4096,
			maxBytes: 8192,
			maxKeyLength: 256
		});
		const WIDGET_DEFAULTS = Object.freeze({
			size: "m",
			height: 4,
			minWidth: 3,
			maxWidth: 12,
			minHeight: 3,
			maxHeight: 30
		});
		const UNSAFE_KEYS = /* @__PURE__ */ new Set([
			"__proto__",
			"constructor",
			"prototype"
		]);
		const PUBLIC_TYPE_ID = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._/-]*):[a-z0-9][a-z0-9._/-]*$/;
		function fail(message) {
			throw new Error(`homeWidgets: ${message}`);
		}
		function message(error) {
			return error instanceof Error ? error.message : String(error);
		}
		function synchronous(value, field) {
			if (value instanceof Promise) {
				value.catch(() => {});
				fail(`${field} must return synchronously, not a Promise`);
			}
		}
		function positiveVersion(value, field) {
			if (!Number.isSafeInteger(value) || value < 1 || value > 1e6) fail(`${field} must be a positive safe integer at most 1000000`);
		}
		function stableId(value, field) {
			const maxLength = field === "instanceId" ? 120 : 200;
			if (typeof value !== "string" || value.length === 0 || value.length > maxLength || value !== value.trim() || /[\s\u0000-\u001f\u007f]/u.test(value) || UNSAFE_KEYS.has(value)) fail(`${field} must be a nonempty stable identifier (at most ${maxLength} characters, no whitespace/control characters)`);
		}
		/** Validate AND independently clone JSON without invoking getters/toJSON or copying unsafe prototypes. */
		function cloneWidgetConfig(value) {
			synchronous(value, "config");
			let nodes = 0;
			let characters = 0;
			const ancestors = /* @__PURE__ */ new Set();
			const text = (value, path) => {
				characters += value.length;
				if (characters > WIDGET_JSON_LIMITS.maxBytes) fail(`${path}: config exceeds byte limit (8 KiB)`);
			};
			const visit = (input, depth, path) => {
				if (++nodes > WIDGET_JSON_LIMITS.maxNodes) fail(`${path}: config exceeds node limit`);
				if (depth > WIDGET_JSON_LIMITS.maxDepth) fail(`${path}: config exceeds depth limit`);
				if (input === null || typeof input === "boolean") return input;
				if (typeof input === "string") {
					text(input, path);
					return input;
				}
				if (typeof input === "number" && Number.isFinite(input)) return input;
				if (typeof input !== "object" || input === null) fail(`${path}: config must contain only finite JSON values`);
				if (ancestors.has(input)) fail(`${path}: config contains a cycle`);
				const array = Array.isArray(input);
				const proto = Object.getPrototypeOf(input);
				if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail(`${path}: config must use plain objects and arrays`);
				const keys = Reflect.ownKeys(input);
				if (keys.length > WIDGET_JSON_LIMITS.maxNodes + 1) fail(`${path}: config exceeds node limit`);
				ancestors.add(input);
				try {
					const result = array ? [] : {};
					if (array && input.length > WIDGET_JSON_LIMITS.maxNodes) fail(`${path}: config exceeds node limit`);
					for (const key of keys) {
						if (array && key === "length") continue;
						if (typeof key !== "string") fail(`${path}: config cannot contain symbol keys`);
						if (UNSAFE_KEYS.has(key)) fail(`${path}.${key}: unsafe config key`);
						if (key.length > WIDGET_JSON_LIMITS.maxKeyLength) fail(`${path}: config key exceeds length limit`);
						if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length)) fail(`${path}.${key}: arrays cannot contain named properties`);
						const descriptor = Object.getOwnPropertyDescriptor(input, key);
						if (!descriptor.enumerable || !("value" in descriptor)) fail(`${path}.${key}: config requires enumerable data properties`);
						if (!array) text(key, path);
						result[key] = visit(descriptor.value, depth + 1, `${path}.${key}`);
					}
					if (array && Object.keys(result).length !== input.length) fail(`${path}: config cannot contain sparse arrays`);
					return result;
				} finally {
					ancestors.delete(input);
				}
			};
			const result = visit(value, 0, "config");
			if (new TextEncoder().encode(JSON.stringify(result)).byteLength > WIDGET_JSON_LIMITS.maxBytes) fail("config exceeds byte limit (8 KiB)");
			return result;
		}
		function validateResult(value) {
			synchronous(value, "validateConfig");
			if (value === false) fail("validateConfig rejected config");
			if (typeof value === "string" && value.length > 0) fail(`validateConfig: ${value}`);
			if (value !== void 0 && value !== true && typeof value !== "string") fail("validateConfig must return boolean, string, or undefined synchronously");
		}
		/** Application-level validation receives its own clone and cannot mutate the accepted value. */
		function validateWidgetConfig(definition, input) {
			const config = cloneWidgetConfig(input);
			validateResult(definition.validateConfig(cloneWidgetConfig(config)));
			return config;
		}
		function defaultsFor(input) {
			if (input !== void 0 && (input === null || typeof input !== "object" || Array.isArray(input))) fail("defaults must be an object");
			const defaults = {
				...WIDGET_DEFAULTS,
				...input
			};
			for (const key of Object.keys(defaults)) if (!Object.hasOwn(WIDGET_DEFAULTS, key)) fail(`defaults.${key} is not supported`);
			if (![
				"s",
				"m",
				"l"
			].includes(defaults.size)) fail("defaults.size must be s, m, or l");
			for (const key of [
				"minWidth",
				"maxWidth",
				"minHeight",
				"maxHeight",
				"height"
			]) {
				const value = defaults[key];
				const max = key.endsWith("Width") ? 12 : 30;
				const min = 3;
				if (!Number.isInteger(value) || value < min || value > max) fail(`defaults.${key} must be an integer between ${min} and ${max}`);
			}
			if (defaults.minWidth > defaults.maxWidth) fail("defaults.minWidth must not exceed maxWidth");
			if (defaults.minHeight > defaults.maxHeight) fail("defaults.minHeight must not exceed maxHeight");
			if (defaults.height < defaults.minHeight || defaults.height > defaults.maxHeight) fail("defaults.height must be within minHeight/maxHeight");
			const width = defaults.size === "s" ? 4 : defaults.size === "m" ? 8 : 12;
			if (width < defaults.minWidth || width > defaults.maxWidth) fail("defaults.size must fit minWidth/maxWidth on the 12-column grid");
			return Object.freeze(defaults);
		}
		/** Each preview is ephemeral: no registry/store mutation, live instance or persisted data is read. */
		function createWidgetPreviewProps(definition, dimensions) {
			const config = validateWidgetConfig(definition, (definition.preview?.config ?? definition.defaultConfig)());
			return {
				...dimensions,
				config,
				instance: {
					instanceId: "home-gallery-preview",
					typeId: definition.typeId,
					configVersion: definition.configVersion,
					config
				},
				editing: false,
				visible: true,
				preview: { data: cloneWidgetConfig(definition.preview?.data ?? null) }
			};
		}
		function freezeJson(value) {
			if (value !== null && typeof value === "object") {
				for (const child of Object.values(value)) freezeJson(child);
				Object.freeze(value);
			}
			return value;
		}
		var HomeWidgetRegistry = class {
			entries = /* @__PURE__ */ new Map();
			snapshot = Object.freeze([]);
			listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.snapshot;
			get = (typeId) => this.entries.get(typeId);
			subscribe = (listener) => {
				this.listeners.add(listener);
				let active = true;
				return () => {
					if (active) {
						active = false;
						this.listeners.delete(listener);
					}
				};
			};
			/** Example: ctx.effect(() => ctx.homeWidgets.register(definition)). No context is retained. */
			register(definition, internal) {
				if (definition === null || typeof definition !== "object") fail("widget definition must be an object");
				const typeId = definition.typeId;
				stableId(typeId, "typeId");
				const legacy = internal?.internalLegacyTypeId === true && typeId.startsWith("legacy:");
				if ((!PUBLIC_TYPE_ID.test(typeId) || typeId.startsWith("legacy:")) && !legacy) fail(`typeId "${typeId}" must be namespaced (e.g. @acme/widgets:clock); legacy: is reserved for the internal adapter`);
				if (this.entries.has(typeId)) fail(`duplicate typeId "${typeId}"`);
				if (definition.apiVersion !== 1) fail(`"${typeId}": apiVersion must be 1`);
				positiveVersion(definition.configVersion, "configVersion");
				for (const key of ["title", "description"]) {
					const value = definition[key];
					if (key === "description" && value === void 0) continue;
					if (typeof value !== "function" && (typeof value !== "string" || value.trim() === "")) fail(`"${typeId}": ${key} must be nonempty text or a localized text function`);
				}
				if (definition.source !== void 0 && (typeof definition.source !== "string" || definition.source.trim() === "")) fail("source must be nonempty text");
				for (const key of [
					"defaultConfig",
					"validateConfig",
					"migrateConfig"
				]) {
					if (key === "migrateConfig" && definition[key] === void 0) continue;
					if (typeof definition[key] !== "function") fail(`"${typeId}": ${key} must be a synchronous function`);
				}
				for (const key of [
					"Content",
					"Settings",
					"icon",
					"Preview"
				]) {
					const value = definition[key];
					if (key !== "Content" && value === void 0) continue;
					const wrapped = value !== null && typeof value === "object" && "$$typeof" in value && [
						Symbol.for("react.memo"),
						Symbol.for("react.forward_ref"),
						Symbol.for("react.lazy")
					].includes(value.$$typeof);
					if (typeof value !== "function" && !wrapped) fail(`"${typeId}": ${key} must be a React component`);
				}
				if (definition.sizing !== void 0 && definition.defaults !== void 0) fail("use sizing or legacy defaults, not both");
				const sizing = definition.sizing === void 0 ? legacyWidgetSizing(defaultsFor(definition.defaults)) : normalizeWidgetSizing(definition.sizing);
				const defaults = sizingDefaults(sizing);
				const factory = definition.defaultConfig;
				const validator = definition.validateConfig;
				const sample = definition.preview;
				let preview;
				if (sample !== void 0) {
					if (sample === null || typeof sample !== "object" || Array.isArray(sample) || ![Object.prototype, null].includes(Object.getPrototypeOf(sample))) fail("preview must be a plain object");
					for (const key of Reflect.ownKeys(sample)) {
						if (key !== "config" && key !== "data") fail("preview supports only config and data");
						const descriptor = Object.getOwnPropertyDescriptor(sample, key);
						if (!descriptor.enumerable || !("value" in descriptor)) fail(`preview.${key} must be a data property`);
					}
					const sampleFactory = sample.config;
					if (sampleFactory !== void 0 && typeof sampleFactory !== "function") fail("preview.config must be a synchronous function");
					preview = Object.freeze({
						...sampleFactory === void 0 ? {} : { config: () => {
							try {
								return validateWidgetConfig({ validateConfig: validator }, sampleFactory());
							} catch (error) {
								fail(`"${typeId}" preview.config: ${message(error)}`);
							}
						} },
						data: freezeJson(cloneWidgetConfig(sample.data ?? null))
					});
					preview.config?.();
				}
				const normalized = {
					...definition,
					defaults,
					sizing,
					preview,
					defaultConfig: () => {
						try {
							return validateWidgetConfig({ validateConfig: validator }, factory());
						} catch (error) {
							fail(`"${typeId}" defaultConfig: ${message(error)}`);
						}
					}
				};
				normalized.defaultConfig();
				if (this.entries.has(typeId)) fail(`duplicate typeId "${typeId}"`);
				const entry = Object.freeze(normalized);
				this.entries.set(typeId, entry);
				this.publish();
				let active = true;
				return () => {
					if (!active) return;
					active = false;
					if (this.entries.get(typeId) !== entry) return;
					this.entries.delete(typeId);
					this.publish();
				};
			}
			createInstance = (typeId, instanceId) => {
				stableId(instanceId, "instanceId");
				const definition = this.entries.get(typeId);
				if (!definition) fail(`unknown typeId "${typeId}"`);
				return {
					instanceId,
					typeId,
					configVersion: definition.configVersion,
					config: definition.defaultConfig()
				};
			};
			publish() {
				this.snapshot = Object.freeze([...this.entries.values()]);
				for (const listener of [...this.listeners]) try {
					listener();
				} catch (error) {
					console.error("[dsh-home] widget registry subscriber failed", error);
				}
			}
		};
		/** A failed migration returns the exact original instance, including its raw config, without writes. */
		function migrateWidgetInstance(definition, instance) {
			try {
				if (instance.typeId !== definition.typeId) fail("instance typeId does not match widget definition");
				stableId(instance.instanceId, "instanceId");
				positiveVersion(definition.configVersion, "target configVersion");
				positiveVersion(instance.configVersion, "instance configVersion");
				if (instance.configVersion > definition.configVersion) fail("instance configVersion is newer than the installed widget");
				let config = cloneWidgetConfig(instance.config);
				const migrated = instance.configVersion < definition.configVersion;
				if (migrated) {
					if (!definition.migrateConfig) fail("migrateConfig is required for older configVersion");
					config = definition.migrateConfig(config, instance.configVersion, definition.configVersion);
				}
				const validated = validateWidgetConfig(definition, config);
				return {
					ok: true,
					migrated,
					instance: {
						instanceId: instance.instanceId,
						typeId: instance.typeId,
						configVersion: definition.configVersion,
						config: validated
					}
				};
			} catch (error) {
				return {
					ok: false,
					instance,
					error: `Widget "${instance.typeId}" config: ${message(error)}`
				};
			}
		}
		//#endregion
		//#region src/client/widget-settings.tsx
		/** Optional editing helper, explicitly chosen by a widget's Content; never shell UI. */
		/** Extension metadata is untrusted render-time code, including translated title callbacks. */
		function widgetText(value, fallback) {
			try {
				const text = typeof value === "function" ? value() : value;
				if (text instanceof Promise) {
					text.catch(() => {});
					return fallback;
				}
				return typeof text === "string" && text.trim() !== "" ? text : fallback;
			} catch {
				return fallback;
			}
		}
		function SettingsFailure({ t, onFailed }) {
			(0, react.useEffect)(onFailed, [onFailed]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-error",
				role: "alert",
				children: t("settings.renderError")
			});
		}
		function ConfigDraft({ t, widgetProps, title, Fields, validate, onClose }) {
			const [draft, setDraft] = (0, react.useState)(() => cloneWidgetConfig(widgetProps.config));
			const [saving, setSaving] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const disabled = !widgetProps.saveConfig || widgetProps.editing || Boolean(widgetProps.preview);
			const save = async () => {
				if (saving || disabled || failed) return;
				setSaving(true);
				setError(null);
				try {
					const next = cloneWidgetConfig(draft);
					try {
						const result = validate(next);
						if (result === false || typeof result === "string" && result.length > 0) throw new Error("Invalid config");
					} catch {
						setError(t("settings.invalid"));
						return;
					}
					await widgetProps.saveConfig(next);
					onClose();
				} catch {
					setError(t("settings.saveError"));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				title,
				closeLabel: t("settings.cancel"),
				onClose: () => {
					if (!saving) onClose();
				},
				className: "dsh-widget-config-modal",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: saving,
					"data-modal-autofocus": true,
					onClick: onClose,
					children: t("settings.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: saving || disabled || failed,
					onClick: () => {
						save();
					},
					children: t(saving ? "edit.saving" : "settings.save")
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-widget-settings",
					"aria-busy": saving,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-settings-fields",
						inert: saving || disabled || void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
							fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsFailure, {
								t,
								onFailed: () => setFailed(true)
							}),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Fields, {
								...widgetProps,
								instance: {
									...widgetProps.instance,
									config: cloneWidgetConfig(draft)
								},
								config: cloneWidgetConfig(draft),
								onConfigChange: (config) => {
									if (!saving && !disabled) try {
										setDraft(cloneWidgetConfig(config));
										setError(null);
									} catch {
										setError(t("settings.invalid"));
									}
								}
							})
						})
					}), error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-task-error",
						role: "alert",
						children: error
					})]
				})
			});
		}
		/** Builtins opt in at their own content position; third-party widgets can build any editor. */
		function WidgetConfigEditor({ t, widgetProps, title, label, Fields, validate }) {
			const [open, setOpen] = (0, react.useState)(false);
			if (widgetProps.editing || widgetProps.preview) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-widget-own-editor",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					size: "sm",
					disabled: !widgetProps.saveConfig,
					onClick: () => setOpen(true),
					children: label
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfigDraft, {
					t,
					widgetProps,
					title,
					Fields,
					validate,
					onClose: () => setOpen(false)
				})]
			});
		}
		//#endregion
		//#region src/client/gallery-model.ts
		function galleryText(value, fallback = "") {
			try {
				const text = typeof value === "function" ? value() : value;
				if (text instanceof Promise) {
					text.catch(() => {});
					return fallback;
				}
				return typeof text === "string" && text.trim() ? text : fallback;
			} catch {
				return fallback;
			}
		}
		function isBuiltinDefinition(definition) {
			return definition.typeId.startsWith("@vlln/dsh-home:");
		}
		function filterWidgetDefinitions(definitions, search, source) {
			const words = search.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
			return definitions.filter((definition) => {
				const builtin = isBuiltinDefinition(definition);
				if (source === "builtin" && !builtin || source === "extension" && builtin) return false;
				const haystack = [
					galleryText(definition.title),
					galleryText(definition.description),
					definition.source ?? "",
					definition.typeId
				].join(" ").toLocaleLowerCase();
				return words.every((word) => haystack.includes(word));
			});
		}
		//#endregion
		//#region src/client/fit-rows.ts
		/**
		* 摘要卡不滚动：按容器实际高度决定能放几行，而不是拍一个常量。
		*
		* 小组件的高度由网格声明（固定尺寸，用户不改），但字体缩放、断点与标题换行都会
		* 改变可用空间。这里量一次「一行占多高」和「容器有多高」，算出正好放得下的行数；
		* 只截取最近的 N 行，剩下的用文字说明总数——卡片里永远不出现滚动条。
		*
		* @module @vlln/dsh-home/client/fit-rows
		*/
		/** 行间距与 `.dsh-rows` 的 gap 一致。 */
		const ROW_GAP = 2;
		/**
		* @param ref 行列表容器（高度由 flex 决定，不随行数增长）
		* @param selector 单个行的选择器，用来量真实行高
		* @returns 能完整放下的行数；首次测量前为 null
		*/
		function useVisibleRows(ref, selector) {
			const [count, setCount] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => {
				const node = ref.current;
				if (node === null) return;
				const measure = () => {
					const row = node.querySelector(selector);
					if (row === null) return;
					const pitch = row.getBoundingClientRect().height + ROW_GAP;
					if (!(pitch > 0)) return;
					const next = Math.max(1, Math.floor((node.clientHeight + ROW_GAP) / pitch));
					setCount((previous) => previous === next ? previous : next);
				};
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(node);
				return () => {
					observer.disconnect();
				};
			}, [ref, selector]);
			return count;
		}
		//#endregion
		//#region src/client/workspace-pill.tsx
		/** A workspace name as a capsule: the shape alone separates it from the session title.
		* Every capsule uses the same neutral fill — the colour does not encode which directory
		* this is, so a board never turns into a rainbow of unrelated accents. */
		function WorkspacePill({ label, cwd, title, unknown = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-ws-pill",
				"data-unknown": unknown ? "true" : void 0,
				title: title ?? cwd,
				children: label
			});
		}
		//#endregion
		//#region src/client/session-row.tsx
		const DOT = {
			approval: "warning",
			plan: "warning",
			question: "warning",
			running: "ongoing",
			unread: "done",
			idle: "idle",
			unknown: "idle"
		};
		function SessionRow({ session, title, workspace, workspaceTitle, status, now, t, onOpen, reason, onDismiss }) {
			const trailing = session.lastAt === null ? t("recent.unknownActivity") : compactAgo(session.lastAt, now, t);
			const statusLabel = t(`recent.status.${status}`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-session-line",
				"data-dismissible": onDismiss === void 0 ? void 0 : "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-row dsh-session-row",
					"data-session-id": session.id,
					"data-status": status,
					"aria-label": `${title} · ${workspace} · ${statusLabel}`,
					onClick: onOpen,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-session-status",
							role: "img",
							"aria-label": statusLabel,
							title: statusLabel,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: DOT[status] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspacePill, {
							label: workspace,
							cwd: workspaceTitle ?? workspace,
							title: workspaceTitle ?? workspace,
							unknown: workspaceTitle === void 0
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-session-title",
							title,
							children: title
						}),
						reason !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-chip dsh-session-reason",
							"data-tone": "warn",
							children: reason
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-session-trailing",
							"aria-hidden": "true",
							children: trailing
						})
					]
				}), onDismiss !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-icon-button dsh-session-dismiss",
					"aria-label": t("queue.dismiss"),
					title: t("queue.dismiss"),
					onClick: onDismiss,
					children: "×"
				})]
			});
		}
		//#endregion
		//#region src/client/session-model.ts
		/** Non-positive / non-finite / out-of-Date-range timestamps are not usable activity. */
		function activityTimestamp(value) {
			return typeof value === "number" && value > 0 && Number.isFinite(value) && value <= 864e13 ? value : null;
		}
		function text$1(value) {
			return value === void 0 || value.trim() === "" ? void 0 : value.trim();
		}
		function isSubagent(session) {
			return session !== void 0 && (text$1(session.parentSessionId ?? void 0) !== void 0 || session.origin === "subagent");
		}
		function compareText(left, right) {
			return left < right ? -1 : left > right ? 1 : 0;
		}
		/** Union by id; exclusion evidence from either source wins; does not mutate either input. */
		function mergeRecentSessions(catalog, ledger = []) {
			const byId = new Map(ledger.map((session) => [session.id, session]));
			const ids = /* @__PURE__ */ new Set([...Object.keys(catalog), ...byId.keys()]);
			const result = [];
			for (const id of ids) {
				const meta = Object.hasOwn(catalog, id) ? catalog[id] : void 0;
				const activity = byId.get(id);
				if (id.trim() === "" || meta?.blank === true || isSubagent(meta) || isSubagent(activity)) continue;
				if (meta === void 0 && activity !== void 0 && !(activity.turns > 0 || text$1(activity.lastUserText) !== void 0)) continue;
				const catalogAt = activityTimestamp(meta?.updatedAt);
				const ledgerAt = activityTimestamp(activity?.lastAt);
				result.push({
					id,
					title: text$1(meta?.title),
					cwd: text$1(meta?.cwd) ?? text$1(activity?.cwd),
					lastAt: catalogAt === null ? ledgerAt : ledgerAt === null ? catalogAt : Math.max(catalogAt, ledgerAt),
					running: meta?.running
				});
			}
			return result.sort((left, right) => {
				if (left.lastAt === null && right.lastAt !== null) return 1;
				if (left.lastAt !== null && right.lastAt === null) return -1;
				return (right.lastAt ?? 0) - (left.lastAt ?? 0) || compareText(left.id, right.id);
			});
		}
		/** Runtime status wins; false running means idle, not completed. Missing means unknown. */
		function recentSessionStatus(session, status) {
			const pending = status?.pendingInteraction;
			const kind = typeof pending === "string" ? pending : pending !== null && typeof pending === "object" && "kind" in pending ? pending.kind : void 0;
			if (kind === "approval") return "approval";
			if (kind === "plan-review") return "plan";
			if (kind === "question") return "question";
			if (status?.running === true) return "running";
			if (status?.completionUnread === true) return "unread";
			if (status?.running === false) return "idle";
			if (session.running === true) return "running";
			if (session.running === false) return "idle";
			return "unknown";
		}
		/** Shortest unique trailing path among known working directories; identical cwd shares a label. */
		function cwdLabels(paths) {
			const unique = [...new Set(paths.filter((path) => path !== void 0 && path !== ""))];
			const parts = new Map(unique.map((path) => [path, path.replaceAll("\\", "/").split("/").filter(Boolean)]));
			const labels = /* @__PURE__ */ new Map();
			for (const path of unique) {
				const components = parts.get(path);
				let label = path;
				for (let depth = 1; depth <= components.length; depth += 1) {
					const suffix = components.slice(-depth).join("/");
					if (!unique.some((other) => other !== path && parts.get(other).slice(-depth).join("/") === suffix)) {
						label = suffix;
						break;
					}
				}
				labels.set(path, label);
			}
			const counts = /* @__PURE__ */ new Map();
			for (const label of labels.values()) counts.set(label, (counts.get(label) ?? 0) + 1);
			for (const [path, label] of labels) if (counts.get(label) > 1) labels.set(path, path);
			return labels;
		}
		/** Native select values: empty means all, '?' means missing cwd, paths have a ':' prefix. */
		function cwdFilterValue(cwd) {
			return cwd === void 0 ? "?" : `:${cwd}`;
		}
		/** All query tokens must match title, full path, or full id (case insensitive). */
		function filterRecentSessions(sessions, query = "", directory = "") {
			const tokens = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
			return sessions.filter((session) => {
				if (directory !== "" && cwdFilterValue(session.cwd) !== directory) return false;
				const haystack = [
					session.title ?? "",
					session.cwd ?? "",
					session.id
				].join("\n").toLocaleLowerCase();
				return tokens.every((token) => haystack.includes(token));
			});
		}
		/** UI page size. Show more adds another page, without fetching or hiding rows permanently. */
		function recentPageSize(size) {
			return size === "s" ? 3 : size === "m" ? 6 : 10;
		}
		/** Content-height capacity, not width buckets. Reserve filters, footer and gaps;
		* the list stays scrollable for larger fonts/long metadata and Show more. */
		function recentViewportPageSize(size, width, height) {
			if (!Number.isFinite(height) || !Number.isFinite(width) || height <= 0 || width <= 0) return recentPageSize(size);
			return Math.max(1, Math.min(20, Math.floor((height - (width < 400 ? 104 : 62)) / 30)));
		}
		/** Indexing is not a claim that the account has no sessions or no search results yet. */
		function recentEmptyState(total, matched, indexing) {
			if (matched > 0) return null;
			if (indexing) return "indexing";
			return total === 0 ? "empty" : "noMatch";
		}
		const SESSION_STATUS_GROUPS = [
			"running",
			"waiting",
			"done"
		];
		/** 细状态 → 视图；idle/unknown 不属于任何视图，也就不出现在这个组件里。 */
		function statusGroupOf(status) {
			if (status === "running") return "running";
			if (status === "approval" || status === "plan" || status === "question") return "waiting";
			if (status === "unread") return "done";
			return null;
		}
		/**
		* 按视图分组的行。`dismissed` 只静音「在等你」到下一次活动：看过了不等于永远别看。
		* 排序是最近活动在前，同刻按 id，保证同一份数据两次渲染顺序一致。
		*/
		function statusSessions(sessions, statuses, dismissed = {}) {
			const rows = [];
			for (const session of sessions) {
				const status = recentSessionStatus(session, statuses?.get(session.id));
				const group = statusGroupOf(status);
				if (group === null) continue;
				const at = session.lastAt ?? 0;
				const muted = dismissed[session.id];
				if (group === "waiting" && muted !== void 0 && muted >= at) continue;
				rows.push({
					session,
					status,
					group,
					at
				});
			}
			return rows.sort((left, right) => right.at - left.at || (left.session.id < right.session.id ? -1 : left.session.id > right.session.id ? 1 : 0));
		}
		/** 每个视图的条数，用于顶部筛选上的计数。 */
		function groupCounts(rows) {
			const counts = {
				running: 0,
				waiting: 0,
				done: 0
			};
			for (const row of rows) counts[row.group] += 1;
			return counts;
		}
		/**
		* 当前展示哪个视图：用户选的优先；它空了就落到第一个有内容的视图，
		* 这样卡片不会因为一个空状态变成一张空卡。全都空时仍尊重用户的选择。
		*/
		function effectiveGroup(counts, chosen) {
			if (counts[chosen] > 0) return chosen;
			return SESSION_STATUS_GROUPS.find((group) => counts[group] > 0) ?? chosen;
		}
		/**
		* 工作区胶囊的颜色档：同一路径永远同一档，不同路径尽量分散到六个色相。
		* 只决定装饰色，不携带状态含义。
		*/
		//#endregion
		//#region src/client/recent.tsx
		/** Recent sessions: catalog + activity ledger, independent of focus/dismiss preferences. */
		/** Body only: registry/page supplies the standard widget shell and heading. */
		function RecentBody({ t, data, sessions, now, actions, size, width, height, statuses, statusSource, loading, loadError }) {
			const [query, setQuery] = (0, react.useState)("");
			const [directory, setDirectory] = (0, react.useState)("");
			const rowsRef = (0, react.useRef)(null);
			const all = (0, react.useMemo)(() => mergeRecentSessions(sessions, data?.sessions), [sessions, data?.sessions]);
			const labels = (0, react.useMemo)(() => cwdLabels(all.map((session) => session.cwd)), [all]);
			const directories = (0, react.useMemo)(() => [...labels].sort(([leftPath, left], [rightPath, right]) => left < right ? -1 : left > right ? 1 : leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0), [labels]);
			const hasUnknownCwd = all.some((session) => session.cwd === void 0);
			const matched = (0, react.useMemo)(() => filterRecentSessions(all, query, directory), [
				all,
				query,
				directory
			]);
			const estimate = recentViewportPageSize(size, width, height);
			const capacity = useVisibleRows(rowsRef, ".dsh-session-line");
			const shown = matched.slice(0, capacity ?? estimate);
			const indexing = !loadError && (data === null ? loading !== false : data.scanning || data.scannedAt === null);
			const empty = recentEmptyState(all.length, matched.length, indexing);
			const source = statusSource ?? (statuses === void 0 ? "none" : "runtime");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-recent",
				"data-status-source": source,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-recent-filters",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							type: "search",
							className: "dsh-recent-search",
							"aria-label": t("recent.search"),
							placeholder: t("recent.search"),
							value: query,
							onChange: (event) => {
								setQuery(event.currentTarget.value);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "dsh-recent-cwd",
							"aria-label": t("recent.cwd"),
							value: directory,
							title: directory.startsWith(":") ? directory.slice(1) : t("recent.cwd"),
							onChange: (event) => {
								setDirectory(event.currentTarget.value);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("recent.allCwds")
								}),
								hasUnknownCwd && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "?",
									children: t("recent.unknownCwd")
								}),
								directories.map(([path, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: cwdFilterValue(path),
									title: path,
									children: label
								}, path)),
								directory !== "" && !all.some((session) => cwdFilterValue(session.cwd) === directory) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: directory,
									children: directory === "?" ? t("recent.unknownCwd") : directory.slice(1)
								})
							]
						})]
					}),
					empty !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-empty",
						role: "status",
						children: t(loadError && all.length === 0 ? "error.load" : `recent.${empty}`)
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rows",
						ref: rowsRef,
						children: shown.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
							session,
							title: session.title ?? t("recent.untitled"),
							workspace: session.cwd === void 0 ? t("recent.unknownCwd") : labels.get(session.cwd) ?? session.cwd,
							workspaceTitle: session.cwd,
							status: recentSessionStatus(session, source === "runtime" ? statuses?.get(session.id) : void 0),
							now,
							t,
							onOpen: () => {
								actions.openSession(session.id);
							}
						}, session.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-recent-footer",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-muted",
							role: "status",
							children: t("recent.count", {
								shown: shown.length,
								total: matched.length
							})
						}), indexing && shown.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-muted",
							role: "status",
							children: t("recent.indexing")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/pinned-model.ts
		function pinnedSessionRows(pins, sessions) {
			const archived = new Set(pins?.archived ?? []);
			const seen = /* @__PURE__ */ new Set();
			return (pins?.ids ?? []).flatMap((id) => {
				if (typeof id !== "string" || id.trim() === "" || seen.has(id) || archived.has(id)) return [];
				seen.add(id);
				const meta = Object.hasOwn(sessions, id) ? sessions[id] : void 0;
				return [{
					id,
					title: meta?.title?.trim() || void 0,
					cwd: meta?.cwd?.trim() || void 0,
					lastAt: activityTimestamp(meta?.updatedAt),
					running: meta?.running
				}];
			});
		}
		//#endregion
		//#region src/client/pinned-widget.tsx
		/** Read-only native pins: the card shows as many rows as fit, never a scrollbar. */
		function PinnedBody() {
			const { state, t, actions, statuses, statusSource } = useBuiltin();
			const pins = state.nativePins;
			const rows = pinnedSessionRows(pins, state.sessions);
			const rowsRef = (0, react.useRef)(null);
			const capacity = useVisibleRows(rowsRef, ".dsh-session-line");
			const shown = capacity === null ? rows : rows.slice(0, capacity);
			const labels = cwdLabels(rows.map((row) => row.cwd));
			const stateKey = !pins || pins.status === "unavailable" ? "pinned.unavailable" : pins.status === "pending" ? "pinned.loading" : pins.status === "error" ? "pinned.error" : "pinned.empty";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pinned",
				"data-status-source": statusSource,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pinned-summary",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("pinned.count", { count: rows.length }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: shown.length < rows.length ? t("pinned.visible", {
							shown: shown.length,
							total: rows.length
						}) : t("pinned.order") })]
					}),
					pins?.status === "error" && rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						role: "alert",
						children: t("pinned.error")
					}),
					rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-empty",
						role: "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(stateKey) }), pins?.status === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-muted",
							children: t("pinned.hint")
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rows dsh-pinned-rows",
						ref: rowsRef,
						children: shown.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
							session,
							title: session.title ?? t("recent.untitled"),
							workspace: session.cwd === void 0 ? t("recent.unknownCwd") : labels.get(session.cwd) ?? session.cwd,
							workspaceTitle: session.cwd,
							status: recentSessionStatus(session, statusSource === "runtime" ? statuses.get(session.id) : void 0),
							now: state.now,
							t,
							onOpen: () => {
								actions.openSession(session.id);
							}
						}, session.id))
					})
				]
			});
		}
		//#endregion
		//#region src/client/widget-visual-model.ts
		/** Small presentation-only projections. Never a goal, completion score or status authority. */
		/** Local calendar boundary, not a fixed 24-hour offset (DST days may be 23/25h). */
		function localDayWindow(now) {
			const date = new Date(now);
			date.setHours(0, 0, 0, 0);
			const start = date.getTime();
			date.setDate(date.getDate() + 1);
			return {
				start,
				end: date.getTime()
			};
		}
		/** Union visible normalized day intervals before drawing; concurrent sessions must
		* not look like extra progress. This dial is temporal coverage, not summed activeMs. */
		function dayCoverage(intervals) {
			const sorted = intervals.filter((i) => Number.isFinite(i.left) && Number.isFinite(i.width) && i.width > 0).map((i) => ({
				from: Math.max(0, i.left),
				to: Math.min(100, i.left + i.width)
			})).filter((i) => i.to > i.from).sort((a, b) => a.from - b.from);
			const merged = [];
			for (const range of sorted) {
				const last = merged[merged.length - 1];
				if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
				else merged.push({ ...range });
			}
			return merged;
		}
		//#endregion
		//#region src/client/widgets.tsx
		/**
		* 首页的数据型内置小组件。每张卡只画「卡片内部」，卡片外壳（圆角/描边/标题行/
		* 编辑工具）由 page.tsx 统一提供；专用个人组件与外部组件经公开注册表复用同一外壳。
		*
		* 口径提醒：数字全部来自宿主账本（`activeMs` 在场时长 = 事件簇跨度求和；
		* `runMs` = step 墙钟；`turns` = turn 数），标题/运行态来自官方会话目录。
		*
		* @module @vlln/dsh-home/client/widgets
		*/
		function IconPin() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5 2h6l-1 5 2 2H9l-1 5-1-5H4l2-2-1-5Z",
					stroke: "currentColor",
					strokeWidth: "1.1",
					strokeLinejoin: "round"
				})
			});
		}
		function IconToday() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8",
					r: "5.5",
					stroke: "currentColor",
					strokeWidth: "1.2"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8 5.2V8l2 1.4",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})]
			});
		}
		function IconSessions() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3 4.5h10M3 8h10M3 11.5h6",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round"
				})
			});
		}
		function IconRhythm() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3 12V8.5M6.4 12V5M9.8 12V7M13.2 12V4",
					stroke: "currentColor",
					strokeWidth: "1.4",
					strokeLinecap: "round"
				})
			});
		}
		/** 空的友好态（不画灰框，只给一句话 + 可选动作）。 */
		function Empty({ children, action }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children }), action]
			});
		}
		/** 空态里的主行动（开个新会话）。 */
		function StartAction({ t, actions }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-empty-action",
				onClick: () => {
					actions.startSession();
				},
				children: t("widget.empty.action")
			});
		}
		/** 会话标题：官方标题 → 目录名 → 短 id。 */
		function sessionTitle(session, sessions, t) {
			const title = session === void 0 ? void 0 : sessions[session.id]?.title?.trim();
			if (title !== void 0 && title !== "") return title;
			const cwd = session?.cwd ?? (session === void 0 ? void 0 : sessions[session.id]?.cwd);
			if (cwd !== void 0 && cwd !== "") {
				const base = cwd.split("/").filter(Boolean).pop();
				if (base !== void 0 && base !== "") return base;
			}
			return t("widget.unknown");
		}
		function dayMsLabel(start, end, fraction) {
			if (fraction === 1) return "24";
			const time = hhmm(start + (end - start) * fraction);
			return time.endsWith(":00") ? time.slice(0, 2) : time;
		}
		/** Actual temporal coverage; no arbitrary daily goal or fake completion ring. */
		function DayDial({ segments, nowFraction, start, end }) {
			const coverage = dayCoverage(segments);
			const angle = nowFraction / 100 * Math.PI * 2 - Math.PI / 2;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dsh-day-dial",
				viewBox: "0 0 100 100",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: "dsh-day-dial-track",
						cx: "50",
						cy: "50",
						r: "35"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
						transform: "rotate(-90 50 50)",
						children: coverage.map((range, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: "dsh-day-dial-arc",
							cx: "50",
							cy: "50",
							r: "35",
							pathLength: "100",
							strokeDasharray: `${range.to - range.from} ${100 - (range.to - range.from)}`,
							strokeDashoffset: -range.from
						}, i))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: "dsh-day-dial-now",
						cx: 50 + 35 * Math.cos(angle),
						cy: 50 + 35 * Math.sin(angle),
						r: "2.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: "50",
						y: "9",
						textAnchor: "middle",
						children: dayMsLabel(start, end, 0)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: "96",
						y: "53",
						textAnchor: "end",
						children: dayMsLabel(start, end, .25)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: "50",
						y: "97",
						textAnchor: "middle",
						children: dayMsLabel(start, end, .5)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: "4",
						y: "53",
						children: dayMsLabel(start, end, .75)
					})
				]
			});
		}
		function TodayBody({ t, data, sessions, now, actions, height }) {
			const { start, end } = localDayWindow(now);
			const dayMs = end - start;
			const segments = [];
			let longest = 0;
			for (const session of data?.sessions ?? []) for (const [from, to] of session.clusters) {
				const begin = Math.max(from, start);
				const finish = Math.min(to, end);
				if (!Number.isFinite(begin) || !Number.isFinite(finish) || finish <= begin) continue;
				longest = Math.max(longest, finish - begin);
				segments.push({
					left: (begin - start) / dayMs * 100,
					width: (finish - begin) / dayMs * 100,
					live: finish >= now - 10 * 6e4,
					label: `${hhmm(begin)}–${hhmm(finish)} · ${formatDuration(finish - begin, t)} · ${sessionTitle(session, sessions, t)}`
				});
			}
			const nowFraction = Math.min(100, Math.max(0, (now - start) / dayMs * 100));
			const active = data?.today.activeMs ?? 0;
			const run = data?.today.runMs ?? 0;
			const hasActivity = segments.length > 0;
			if (!hasActivity && active === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, {
				action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StartAction, {
					t,
					actions
				}),
				children: t("widget.today.empty", { shortcut: shortcutHint() })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-today-content",
				"data-roomy": (height ?? 0) >= 190,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-today-hero",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-metric",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-number",
								children: formatDuration(active, t)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-label",
								children: t("widget.today.focused")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DayDial, {
							segments,
							nowFraction,
							start,
							end
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-today-timeline",
						children: hasActivity ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-band-track",
							"aria-label": `${t("aria.band")}: ${segments.map((segment) => segment.label).join("; ")}`,
							role: "img",
							children: [segments.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-band-seg",
								"data-now": segment.live ? "true" : "false",
								style: {
									left: `${segment.left}%`,
									width: `${segment.width}%`
								},
								title: segment.label
							}, index)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-band-now",
								style: { left: `${nowFraction}%` }
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-band-scale",
							"aria-hidden": "true",
							children: [
								0,
								.25,
								.5,
								.75,
								1
							].map((fraction) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: dayMsLabel(start, end, fraction) }, fraction))
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, {
							action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StartAction, {
								t,
								actions
							}),
							children: t("widget.today.empty", { shortcut: shortcutHint() })
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-today-stats",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: data?.today.sessions ?? 0 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.today.sessionsLabel") })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: data?.today.turns ?? 0 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.today.turnsLabel") })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatDuration(run, t) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.today.runLabel") })] })
						]
					}),
					longest > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted dsh-today-longest",
						children: t("widget.today.longest", { dur: formatDuration(longest, t) })
					})
				]
			});
		}
		function AreasBody({ t, data, actions }) {
			const listRef = (0, react.useRef)(null);
			const capacity = useVisibleRows(listRef, ".dsh-row");
			const groups = /* @__PURE__ */ new Map();
			for (const session of data?.sessions ?? []) {
				if (session.todayMs <= 0 && session.todayTurns <= 0) continue;
				const key = session.cwd ?? "";
				const name = key.split("/").filter(Boolean).pop() ?? t("unit.unknown");
				const group = groups.get(key) ?? {
					name,
					cwd: key,
					ms: 0,
					sessions: 0,
					lastAt: 0
				};
				group.ms += session.todayMs;
				group.sessions += 1;
				if (session.parentSessionId === void 0 && session.origin !== "subagent" && session.lastAt >= group.lastAt) {
					group.lastAt = session.lastAt;
					group.topLevelId = session.id;
				}
				groups.set(key, group);
			}
			const sorted = [...groups.values()].sort((left, right) => right.ms - left.ms);
			if (sorted.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, {
				action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StartAction, {
					t,
					actions
				}),
				children: t("widget.areas.empty")
			});
			const limit = capacity ?? sorted.length;
			const rows = sorted.length > limit ? sorted.slice(0, Math.max(0, limit - 1)) : sorted;
			const rest = sorted.slice(rows.length);
			const restMs = rest.reduce((sum, group) => sum + group.ms, 0);
			const restSessions = rest.reduce((sum, group) => sum + group.sessions, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-rows dsh-area-rows",
				ref: listRef,
				children: [rows.map((group) => {
					const meta = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-row-meta",
						children: t("widget.areas.row", {
							dur: formatDuration(group.ms, t),
							sessions: group.sessions
						})
					});
					const title = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-row-top",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspacePill, {
							label: group.name,
							cwd: group.cwd,
							title: group.cwd
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-area-duration",
							children: formatDuration(group.ms, t)
						})]
					});
					const bar = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-area-track",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: `${sorted[0].ms > 0 ? group.ms / sorted[0].ms * 100 : 0}%` } })
					});
					return group.topLevelId === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-row dsh-row-static",
						children: [
							title,
							bar,
							meta
						]
					}, group.name) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-row",
						onClick: () => {
							actions.openSession(group.topLevelId);
						},
						children: [
							title,
							bar,
							meta
						]
					}, group.name);
				}), rest.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-row dsh-row-static",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-row-top",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-title",
							children: t("widget.areas.others", { count: rest.length })
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-row-meta",
						children: t("widget.areas.row", {
							dur: formatDuration(restMs, t),
							sessions: restSessions
						})
					})]
				})]
			});
		}
		function RhythmBody({ t, data }) {
			const days = data?.days ?? [];
			if (days.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.rhythm.empty") });
			const peak = Math.max(1, ...days.map((day) => day.activeMs));
			const total = days.reduce((sum, day) => sum + day.activeMs, 0);
			const best = days.reduce((winner, day) => day.activeMs > winner.activeMs ? day : winner, days[0]);
			const todayKey = days[days.length - 1]?.key;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-rhythm-content",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-metric",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-number",
							children: formatDuration(total, t)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-label",
							children: t("widget.rhythm.totalLabel")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rhythm",
						role: "img",
						"aria-label": t("aria.rhythm"),
						children: days.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-rhythm-col",
							title: `${shortDay(day.key)} · ${formatDuration(day.activeMs, t)}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-rhythm-bar",
								"data-today": day.key === todayKey ? "true" : "false",
								style: { height: `${Math.max(day.activeMs > 0 ? 4 : 1, day.activeMs / peak * 100)}%` }
							})
						}, day.key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rhythm-days",
						"aria-hidden": "true",
						children: days.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: day.key.slice(8) }, day.key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted",
						children: t("widget.rhythm.peak", {
							dur: formatDuration(best.activeMs, t),
							day: shortDay(best.key)
						})
					})
				]
			});
		}
		/** 内置小组件表：顺序即默认排布。 */
		const BUILTIN_WIDGETS = [
			{
				id: "recent",
				order: 0,
				defaultSize: "m",
				defaultHeight: 7,
				Glyph: IconSessions,
				title: (t) => t("widget.recent.title"),
				body: RecentBody
			},
			{
				id: "pinned",
				order: 5,
				defaultSize: "s",
				defaultHeight: 7,
				Glyph: IconPin,
				title: (t) => t("widget.pinned.title"),
				body: PinnedBody
			},
			{
				id: "today",
				order: 20,
				defaultSize: "m",
				defaultHeight: 4,
				Glyph: IconToday,
				title: (t) => t("widget.today.title"),
				body: TodayBody
			},
			{
				id: "areas",
				order: 40,
				defaultSize: "s",
				defaultHeight: 4,
				Glyph: IconSessions,
				title: (t) => t("widget.areas.title"),
				body: AreasBody
			},
			{
				id: "rhythm",
				order: 50,
				defaultSize: "m",
				defaultHeight: 4,
				Glyph: IconRhythm,
				title: (t) => t("widget.rhythm.title"),
				body: RhythmBody
			}
		];
		//#endregion
		//#region src/client/activity-model.ts
		function validateActivityConfig(value) {
			if (!value || typeof value !== "object" || Array.isArray(value)) return false;
			const c = value;
			return typeof c.cwd === "string" && c.cwd.length <= 4096 && [
				"auto",
				"quarter",
				"year"
			].includes(c.range);
		}
		function shiftCalendarDay(key, delta) {
			const date = /* @__PURE__ */ new Date(`${key}T12:00:00Z`);
			date.setUTCDate(date.getUTCDate() + delta);
			return date.toISOString().slice(0, 10);
		}
		const mondayIndex = (key) => ((/* @__PURE__ */ new Date(`${key}T12:00:00Z`)).getUTCDay() + 6) % 7;
		const gridWidth = (columns, cell, gap = 3) => columns * cell + (columns - 1) * gap;
		/**
		* 热力图几何。
		*
		* @param height 图表区（`.dsh-activity-scroll`）的实测高度；不再猜「卡片减去固定 chrome」，
		*   而是由布局量出来再交给这里，卡片就永远不会因为多一行说明文字而溢出。
		* @returns 单元格大小、周数、区块与图表宽度
		*/
		function activityWeeks(days, today, width, range, height = Infinity) {
			let available = Math.max(0, Number.isFinite(width) ? width - 6 : 0);
			const columns = Math.max(1, Math.floor((available + 3) / 19));
			const count = range === "year" ? 365 : range === "quarter" ? 84 : Math.min(365, (columns - 1) * 7 + mondayIndex(today) + 1);
			const first = shiftCalendarDay(today, 1 - count);
			const values = new Map(days.map((day) => [day.key, day]));
			const makeWeeks = (from, to) => {
				const weeks = [];
				for (let key = shiftCalendarDay(from, -mondayIndex(from)); key <= to;) {
					const week = [];
					for (let i = 0; i < 7; i++) {
						week.push(key < from || key > to ? null : values.get(key) ?? {
							key,
							messages: 0,
							sessions: 0
						});
						key = shiftCalendarDay(key, 1);
					}
					weeks.push(week);
				}
				return weeks;
			};
			const weeks = makeWeeks(first, today);
			const blocked = range === "quarter" && available >= 3 * gridWidth(7, 16) + 48;
			const blocks = blocked ? Array.from({ length: 3 }, (_, i) => {
				const start = shiftCalendarDay(first, i * 28);
				const end = shiftCalendarDay(start, 27);
				return {
					first: start,
					last: end,
					weeks: makeWeeks(start, end)
				};
			}) : [];
			const rows = blocked ? Math.max(...blocks.map((block) => block.weeks.length)) : 7;
			const compact = range === "year" && !blocked && (available - (weeks.length - 1) * 3) / weeks.length < 8;
			const gap = compact ? 1 : 3;
			const minCell = compact ? 2 : range === "year" ? 8 : 12;
			const reserve = blocked ? 50 + (rows - 1) * gap : 22 + rows * gap;
			const heightLimit = Number.isFinite(height) ? (height - reserve) / rows : 24;
			const widthLimit = blocked ? (available - 48 - 18 * gap) / 21 : (available - (weeks.length - 1) * gap) / weeks.length;
			const cellSize = Math.max(minCell, Math.min(24, heightLimit, widthLimit));
			return {
				weeks,
				count,
				first,
				cellSize,
				chartWidth: blocked ? 3 * gridWidth(7, cellSize, gap) + 48 : gridWidth(weeks.length, cellSize, gap),
				blocks,
				gap
			};
		}
		/** Synthetic gallery sample. Registry preview JSON is capped at 8 KiB, so keep it
		* to 84 days; a full year (~16 KiB) makes registration throw and the plugin fail to boot. */
		function activityPreviewSnapshot() {
			return {
				generatedAt: Date.UTC(2026, 9, 20, 10, 24),
				timeZone: "UTC",
				today: "2026-10-20",
				days: Array.from({ length: 84 }, (_, i) => ({
					key: shiftCalendarDay("2026-10-20", i - 83),
					messages: (i * 7 + Math.floor(i / 9)) % 15,
					sessions: i % 3
				})),
				workspaces: [],
				available: true,
				complete: true,
				failed: 0,
				scanError: false,
				scanning: false,
				progress: {
					done: 3,
					total: 3
				},
				sessions: [],
				matchedSessions: 0
			};
		}
		function activityLevel(messages) {
			return messages <= 0 ? 0 : messages <= 2 ? 1 : messages <= 5 ? 2 : messages <= 10 ? 3 : 4;
		}
		//#endregion
		//#region src/client/activity-widget.tsx
		function browserZone() {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		}
		function useActivity(cwd, date, preview) {
			const { state } = useBuiltin();
			const [loaded, setLoaded] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(false);
			const [loading, setLoading] = (0, react.useState)(true);
			const [retry, setRetry] = (0, react.useState)(0);
			const zone = browserZone();
			(0, react.useEffect)(() => {
				if (preview) return;
				let active = true;
				let timer;
				let deadline;
				let controller;
				setError(false);
				const load = async () => {
					controller = new AbortController();
					const request = controller;
					setLoading(true);
					deadline = setTimeout(() => {
						request.abort();
					}, 15e3);
					try {
						const value = await post("activity", {
							cwd,
							timeZone: zone,
							...date ? { date } : {}
						}, request.signal);
						if (!active) return;
						setLoaded({
							value,
							cwd,
							zone,
							date
						});
						setError(false);
						if (value.scanning) timer = setTimeout(() => {
							load();
						}, 3e3);
					} catch {
						if (active) setError(true);
					} finally {
						clearTimeout(deadline);
						if (active) setLoading(false);
					}
				};
				load();
				return () => {
					active = false;
					clearTimeout(timer);
					clearTimeout(deadline);
					controller?.abort();
				};
			}, [
				cwd,
				zone,
				date,
				retry,
				state.lastLoadedAt,
				preview
			]);
			if (preview) {
				const sample = preview.data;
				return {
					result: sample !== null && typeof sample === "object" && !Array.isArray(sample) && typeof sample.today === "string" && Array.isArray(sample.days) && Array.isArray(sample.sessions) ? sample : {
						generatedAt: 0,
						timeZone: "UTC",
						today: "2026-10-20",
						days: [],
						workspaces: [],
						available: true,
						complete: true,
						failed: 0,
						scanError: false,
						scanning: false,
						progress: {
							done: 0,
							total: 0
						},
						sessions: [],
						matchedSessions: 0
					},
					error: false,
					loading: false,
					detailReady: true,
					retry: () => {}
				};
			}
			const result = loaded?.cwd === cwd && loaded.zone === zone ? loaded.value : null;
			return {
				result,
				error,
				loading,
				detailReady: result !== null && loaded?.date === date,
				retry: () => setRetry((n) => n + 1)
			};
		}
		function ActivityContent(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityBody, { ...props });
		}
		function ActivityBody({ config, width, height, preview, saveConfig }) {
			const { t, state, actions } = useBuiltin();
			const [date, setDate] = (0, react.useState)();
			const [tip, setTip] = (0, react.useState)(null);
			const { result, error, loading, detailReady, retry } = useActivity(config.cwd, date, preview);
			const calendar = (0, react.useRef)(null);
			const [chart, setChart] = (0, react.useState)(null);
			const ready = result !== null && result.available;
			(0, react.useLayoutEffect)(() => {
				const node = calendar.current;
				if (node === null) return;
				const measure = () => {
					const w = node.clientWidth;
					const h = node.clientHeight;
					setChart((previous) => previous !== null && previous.w === w && previous.h === h ? previous : {
						w,
						h
					});
				};
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(node);
				return () => {
					observer.disconnect();
				};
			}, [result]);
			(0, react.useEffect)(() => {
				if (preview) return;
				const node = calendar.current;
				if (ready && node) node.scrollLeft = node.scrollWidth;
			}, [
				ready,
				config.cwd,
				config.range,
				preview
			]);
			if (!result && error) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-empty",
				role: "alert",
				children: [t("activity.error"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					onClick: retry,
					children: t("activity.retry")
				})]
			});
			if (!result) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-empty",
				role: "status",
				children: t("activity.loading")
			});
			if (!result.available) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-empty",
				children: t("activity.unavailable")
			});
			const { weeks, count, first, cellSize, chartWidth, blocks, gap } = activityWeeks(result.days, result.today, chart?.w ?? width, config.range, chart?.h ?? Math.max(0, height - 96));
			const days = result.days.filter((day) => day.key >= first && day.key <= result.today);
			const active = days.filter((day) => day.messages > 0).length;
			const messages = days.reduce((n, day) => n + day.messages, 0);
			const labels = cwdLabels(result.workspaces);
			const dayLabel = (day) => t(result.complete ? "activity.day" : "activity.partialDay", {
				date: day.key,
				messages: day.messages,
				sessions: day.sessions
			});
			const showTip = (event, text) => {
				setTip({
					x: event.clientX,
					y: event.clientY,
					text
				});
			};
			const cell = (day, index) => day ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-activity-cell",
				"data-date": day.key,
				"data-level": activityLevel(day.messages),
				"data-selected": date === day.key,
				"data-unknown": !result.complete && day.messages === 0,
				"aria-label": dayLabel(day),
				"aria-pressed": date === day.key,
				onMouseEnter: (event) => {
					showTip(event, dayLabel(day));
				},
				onMouseLeave: () => {
					setTip(null);
				},
				onFocus: (event) => setTip({
					x: event.currentTarget.getBoundingClientRect().left + 8,
					y: event.currentTarget.getBoundingClientRect().top,
					text: dayLabel(day)
				}),
				onBlur: () => {
					setTip(null);
				},
				onClick: () => {
					if (!preview) setDate((previous) => previous === day.key ? void 0 : day.key);
				}
			}, day.key) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-activity-cell dsh-activity-spacer" }, `pad${index}`);
			const weekdays = [
				"mon",
				"tue",
				"wed",
				"thu",
				"fri",
				"sat",
				"sun"
			];
			const detail = date !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityDayDetail, {
				date,
				t,
				state,
				actions,
				sessions: result.sessions,
				ready: detailReady,
				complete: result.complete,
				loading,
				error,
				matched: result.matchedSessions,
				onBack: () => {
					setDate(void 0);
				}
			}) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-activity",
				"data-activity-complete": result.complete,
				"data-activity-range": config.range,
				"data-activity-layout": blocks.length ? "blocks" : "weeks",
				style: {
					"--dsh-activity-cell-size": `${cellSize}px`,
					"--dsh-activity-chart-width": `${chartWidth}px`,
					"--dsh-activity-gap": `${gap}px`
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-activity-summary",
						"aria-label": t("activity.summary", {
							days: count,
							active,
							messages
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-activity-primary",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								className: "dsh-activity-number",
								children: active
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.activeDays") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-activity-secondary",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.period", { days: count }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.messages", { count: messages }) }),
								result.scanning && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.indexing", result.progress) })
							]
						})]
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-muted",
						role: "alert",
						children: [t("activity.error"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							onClick: retry,
							children: t("activity.retry")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: calendar,
						className: "dsh-activity-scroll",
						tabIndex: detail === null ? 0 : -1,
						"aria-label": t("activity.metric"),
						"data-detail": detail === null ? void 0 : "true",
						children: detail ?? (blocks.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-activity-blocks",
							children: blocks.map((block) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-activity-block",
								"aria-label": t("activity.block", {
									first: block.first,
									last: block.last
								}),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-activity-block-label",
										title: `${block.first} – ${block.last}`,
										children: [
											block.first.slice(5),
											" – ",
											block.last.slice(5)
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-activity-weekdays",
										"aria-hidden": "true",
										children: weekdays.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`activity.${day}`) }, day))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-activity-block-days",
										children: block.weeks.flat().map(cell)
									})
								]
							}, block.first))
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-activity-grid",
							style: { gridTemplateColumns: `repeat(${weeks.length}, var(--dsh-activity-cell-size))` },
							children: weeks.map((week, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-activity-week",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-activity-month",
									"aria-hidden": "true",
									children: week.find((day) => day?.key.endsWith("-01"))?.key.slice(5, 7) ?? ""
								}), week.map(cell)]
							}, i))
						}))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-activity-caption",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-activity-range",
								children: [
									first,
									" – ",
									result.today
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-activity-legend",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.less") }),
									[
										0,
										1,
										2,
										3,
										4
									].map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-activity-cell",
										"data-level": level
									}, level)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.more") })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-activity-filters",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									className: "dsh-quiet-select dsh-activity-scale",
									"aria-label": t("activity.range"),
									title: t("activity.range"),
									value: config.range,
									disabled: saveConfig === void 0,
									onChange: (event) => {
										saveConfig?.({
											...config,
											range: event.target.value
										});
									},
									children: [
										"auto",
										"quarter",
										"year"
									].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value,
										children: t(`activity.${value}`)
									}, value))
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-quiet-select dsh-activity-cwd",
									"aria-label": t("activity.cwd"),
									title: config.cwd === "" ? t("activity.all") : config.cwd,
									value: config.cwd,
									disabled: saveConfig === void 0,
									onChange: (event) => {
										saveConfig?.({
											...config,
											cwd: event.target.value
										});
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: t("activity.all")
										}),
										config.cwd !== "" && !result.workspaces.includes(config.cwd) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: config.cwd,
											children: labels.get(config.cwd) ?? config.cwd
										}),
										result.workspaces.map((cwd) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: cwd,
											children: labels.get(cwd) ?? cwd
										}, cwd))
									]
								})]
							})
						]
					}),
					tip !== null && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-hover-tip",
						role: "tooltip",
						style: {
							left: Math.min(tip.x + 12, window.innerWidth - 250),
							top: Math.max(8, tip.y - 34)
						},
						children: tip.text
					}), document.body)
				]
			});
		}
		/** 选中某一天后就地把日历换成当天明细：读数不把卡片撑高，返回即回到热力图。 */
		function ActivityDayDetail({ date, t, state, actions, sessions, ready, complete, loading, error, matched, onBack }) {
			const rowsRef = (0, react.useRef)(null);
			const capacity = useVisibleRows(rowsRef, ".dsh-row");
			const shown = capacity === null ? sessions : sessions.slice(0, capacity);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-activity-detail",
				"aria-label": t("activity.detail", { date }),
				"aria-busy": loading || !ready && !error,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-activity-detail-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("activity.detail", { date }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-quiet-select dsh-activity-back",
							onClick: onBack,
							children: t("activity.back")
						})]
					}),
					!ready ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						role: "status",
						children: t(error ? "activity.error" : "activity.loading")
					}) : sessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t(complete ? "activity.dateEmpty" : "activity.dateUnknown")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rows dsh-activity-days",
						ref: rowsRef,
						children: shown.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-row",
							onClick: () => actions.openSession(session.id),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-row-title",
								children: state.sessions[session.id]?.title?.trim() || session.cwd?.split("/").filter(Boolean).pop() || session.id
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-row-meta",
								children: t("activity.messages", { count: session.messages })
							})]
						}, session.id))
					}),
					ready && matched > 100 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted",
						children: t("activity.detailCount", { count: matched })
					})
				]
			});
		}
		function registerActivityWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:activity",
				apiVersion: 1,
				title: () => t("activity.title"),
				description: () => t("activity.description"),
				source: "@vlln/dsh-home",
				preview: { data: activityPreviewSnapshot() },
				sizing: {
					default: {
						w: 8,
						h: 6
					},
					supported: [
						{
							w: 4,
							h: 8
						},
						{
							w: 8,
							h: 6
						},
						{
							w: 8,
							h: 8
						},
						{
							w: 12,
							h: 6
						}
					]
				},
				configVersion: 1,
				defaultConfig: () => ({
					cwd: "",
					range: "auto"
				}),
				validateConfig: validateActivityConfig,
				Content: ActivityContent
			});
		}
		//#endregion
		//#region src/client/active-model.ts
		/** 2 天看不出节奏，已删除；30 天覆盖一个自然月的工作节律。
		* 「今天」曾经也是这里的一个窗口；24 小时时间带与柱状图不是同一种图，已移出。 */
		const ACTIVE_RANGES = [
			"7d",
			"14d",
			"30d"
		];
		const ACTIVE_DAY_COUNT = {
			"7d": 7,
			"14d": 14,
			"30d": 30
		};
		/** 配置只认这三个窗口；手改的文件（含旧 today / 2d）退回默认，不抛错。 */
		function validateActiveConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			if (!Object.keys(value).every((key) => key === "range")) return false;
			return ACTIVE_RANGES.includes(value.range);
		}
		/** v1→v2 删掉「今天」，v2→v3 删掉「2 天」：旧值统一落到 7 天，其它非法值同样处理。 */
		function migrateActiveConfig(config, fromVersion) {
			if (fromVersion >= 3) return validateActiveConfig(config) ? config : { range: "7d" };
			const range = config !== null && typeof config === "object" && !Array.isArray(config) ? config.range : void 0;
			return { range: ACTIVE_RANGES.includes(range) ? range : "7d" };
		}
		/** 画廊预览用的样例：固定日期，避免每次渲染都变。 */
		function activePreviewData() {
			const days = Array.from({ length: 30 }, (_, index) => {
				const date = new Date(Date.UTC(2026, 9, 6 + index));
				const activeMs = [
					42,
					0,
					96,
					61,
					130,
					0,
					18,
					74,
					155,
					88,
					0,
					210,
					133,
					64,
					51,
					0,
					120,
					93,
					46,
					168,
					0,
					72,
					141,
					118,
					0,
					205,
					96,
					64,
					133,
					88
				][index] * 6e4;
				const tokens = {
					input: Math.round(activeMs / 900),
					output: Math.round(activeMs / 3600),
					cacheRead: Math.round(activeMs / 260),
					cacheWrite: 0
				};
				return {
					key: date.toISOString().slice(0, 10),
					activeMs,
					runMs: Math.round(activeMs * .4),
					turns: Math.round(activeMs / 9e5),
					sessions: activeMs > 0 ? 1 : 0,
					tokens
				};
			});
			return {
				days,
				today: {
					activeMs: days.at(-1).activeMs,
					runMs: days.at(-1).runMs,
					turns: days.at(-1).turns,
					sessions: 1,
					tokens: days.at(-1).tokens
				},
				sessions: []
			};
		}
		//#endregion
		//#region src/client/active-widget.tsx
		function barLabel(day, t) {
			return `${shortDay(day.key)} · ${formatDuration(day.activeMs, t)}`;
		}
		function Bars({ days, t, todayKey }) {
			const peak = Math.max(1, ...days.map((day) => day.activeMs));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-rhythm dsh-active-bars",
				role: "group",
				"aria-label": t("active.chart"),
				children: days.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: barLabel(day, t),
					side: "top",
					portal: true,
					delayMs: 60,
					maxWidth: 220,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-rhythm-col dsh-active-col",
						tabIndex: 0,
						role: "img",
						"aria-label": barLabel(day, t),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-rhythm-bar dsh-active-bar",
							"data-today": day.key === todayKey ? "true" : "false",
							"data-zero": day.activeMs > 0 ? "false" : "true",
							style: { height: `${Math.max(day.activeMs > 0 ? 4 : 1, day.activeMs / peak * 100)}%` }
						})
					})
				}, day.key))
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-rhythm-days dsh-active-days",
				"data-dense": days.length > 14 ? "true" : void 0,
				"aria-hidden": "true",
				children: days.map((day, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: days.length > 14 && index % 5 !== 0 && index !== days.length - 1 ? "" : day.key.slice(8) }, day.key))
			})] });
		}
		function ActiveBody({ config, saveConfig, preview }) {
			const { t, state } = useBuiltin();
			const data = preview === void 0 ? state.ledger : preview.data;
			const range = ACTIVE_RANGES.includes(config.range) ? config.range : "7d";
			const window = (data?.days ?? []).slice(-ACTIVE_DAY_COUNT[range]);
			const total = window.reduce((sum, day) => sum + day.activeMs, 0);
			const todayKey = window[window.length - 1]?.key ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-active",
				"data-range": range,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-active-toolbar",
						role: "group",
						"aria-label": t("active.range"),
						children: ACTIVE_RANGES.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-chip dsh-active-range",
							"data-active": value === range,
							"aria-pressed": value === range,
							disabled: saveConfig === void 0,
							onClick: () => {
								saveConfig?.({ range: value });
							},
							children: t(`active.${value}`)
						}, value))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-active-hero",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-number",
							children: formatDuration(total, t)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-label",
							children: t("active.total", { range: t(`active.${range}`) })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bars, {
						days: window,
						t,
						todayKey
					})
				]
			});
		}
		function registerActiveWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:active",
				apiVersion: 1,
				title: () => t("widget.active.title"),
				description: () => t("gallery.description.active"),
				source: "@vlln/dsh-home",
				preview: { data: activePreviewData() },
				sizing: {
					default: {
						w: 8,
						h: 4
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 8,
							h: 4
						},
						{
							w: 12,
							h: 6
						}
					]
				},
				configVersion: 3,
				defaultConfig: () => ({ range: "7d" }),
				validateConfig: (config) => validateActiveConfig(config),
				migrateConfig: migrateActiveConfig,
				Content: ActiveBody
			});
		}
		//#endregion
		//#region src/client/personal-model.ts
		const PERSONAL_CONFIG_MAX_BYTES = 8 * 1024;
		/** 下拉里提供的时区：常见的几档 + 浏览器时区；用户手改的时区也会作为一项保留。 */
		const CLOCK_ZONES = [
			"UTC",
			"Asia/Shanghai",
			"Asia/Hong_Kong",
			"Asia/Taipei",
			"Asia/Tokyo",
			"Asia/Seoul",
			"Asia/Singapore",
			"Asia/Bangkok",
			"Asia/Kolkata",
			"Asia/Dubai",
			"Europe/London",
			"Europe/Berlin",
			"Europe/Paris",
			"Europe/Madrid",
			"Europe/Moscow",
			"America/New_York",
			"America/Chicago",
			"America/Denver",
			"America/Los_Angeles",
			"America/Sao_Paulo",
			"Australia/Sydney",
			"Australia/Perth",
			"Pacific/Auckland",
			"Pacific/Honolulu"
		];
		const encoder = new TextEncoder();
		/** Count serialized UTF-8, including JSON escaping and property names, not JS code units. */
		function personalConfigBytes(config) {
			return encoder.encode(JSON.stringify(config)).byteLength;
		}
		/** Require exactly this version's data fields; never invoke accessors or normalize saved input. */
		function fields(value, names) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const proto = Object.getPrototypeOf(value);
			if (proto !== Object.prototype && proto !== null) return false;
			return Reflect.ownKeys(value).length === names.length && names.every((name) => {
				const property = Object.getOwnPropertyDescriptor(value, name);
				return property !== void 0 && property.enumerable && "value" in property;
			});
		}
		function defaultNotesConfig() {
			return { text: "" };
		}
		function defaultClockConfig() {
			return { timeZone: "" };
		}
		function validateNotesConfig(config) {
			if (!fields(config, ["text"])) return false;
			if (typeof config.text !== "string" || config.text.length > 8192) return false;
			return personalConfigBytes(config) <= PERSONAL_CONFIG_MAX_BYTES;
		}
		/** v1 → v2: 旧便笺的标题变成第一行，内容跟在空行之后；不会静默丢字。 */
		function migrateNotesConfig(config, fromVersion) {
			if (fromVersion >= 2) return validateNotesConfig(config) ? config : defaultNotesConfig();
			if (config === null || typeof config !== "object" || Array.isArray(config)) return defaultNotesConfig();
			const old = config;
			const title = typeof old.title === "string" ? old.title.trim() : "";
			const text = typeof old.text === "string" ? old.text.trim() : "";
			return { text: title === "" ? text : text === "" ? title : `${title}\n\n${text}` };
		}
		/** An empty zone deliberately omits Intl's timeZone option, following the browser's zone. */
		function isValidTimeZone(zone) {
			if (typeof zone !== "string" || zone.length > 100 || zone !== zone.trim()) return false;
			if (zone === "") return true;
			try {
				new Intl.DateTimeFormat("en-US", { timeZone: zone });
				return true;
			} catch {
				return false;
			}
		}
		function validateClockConfig(config) {
			return fields(config, ["timeZone"]) && isValidTimeZone(config.timeZone) && personalConfigBytes(config) <= 8192;
		}
		/** v2 → v3：丢掉标题与 12/24 制，只保留时区；非法时区退回浏览器时区。 */
		function migrateClockConfig(config, fromVersion) {
			if (fromVersion >= 3) return validateClockConfig(config) ? config : defaultClockConfig();
			const zone = config !== null && typeof config === "object" && !Array.isArray(config) ? config.timeZone : void 0;
			return { timeZone: isValidTimeZone(zone) ? zone : "" };
		}
		/** The caller supplies an explicit translated locale tag, never language guessed from prose. */
		function formatPersonalClock(now, config, locale) {
			const zone = config.timeZone === "" ? {} : { timeZone: config.timeZone };
			return {
				time: new Intl.DateTimeFormat(locale, {
					...zone,
					hour: "2-digit",
					minute: "2-digit"
				}).format(now),
				date: new Intl.DateTimeFormat(locale, {
					...zone,
					year: "numeric",
					month: "long",
					day: "numeric",
					weekday: "long"
				}).format(now)
			};
		}
		function millisecondsToNextMinute(now) {
			return 6e4 - (now % 6e4 + 6e4) % 6e4;
		}
		/** Update immediately and at minute boundaries; hidden tabs have no pending timer. */
		function startMinuteClock(onTick, environment) {
			let stopped = false;
			let timer;
			let scheduled = false;
			const clear = () => {
				if (scheduled) environment.cancel(timer);
				scheduled = false;
			};
			const tick = () => {
				clear();
				if (stopped || environment.hidden()) return;
				onTick(environment.now());
				if (stopped) return;
				timer = environment.schedule(tick, millisecondsToNextMinute(environment.now()));
				scheduled = true;
			};
			const unsubscribe = environment.subscribeVisibility(tick);
			tick();
			return () => {
				stopped = true;
				clear();
				unsubscribe();
			};
		}
		//#endregion
		//#region src/client/personal-clock-display.ts
		function personalClockDisplayParts(now, config, locale) {
			const zone = config.timeZone === "" ? {} : { timeZone: config.timeZone };
			const dateParts = new Intl.DateTimeFormat(locale, {
				...zone,
				day: "numeric",
				month: "short"
			}).formatToParts(now);
			return {
				timeParts: new Intl.DateTimeFormat(locale, {
					...zone,
					hour: "2-digit",
					minute: "2-digit"
				}).formatToParts(now),
				day: dateParts.find((part) => part.type === "day")?.value ?? "",
				month: new Intl.DateTimeFormat(locale, {
					...zone,
					month: "short"
				}).formatToParts(now).map((part) => part.value).join("")
			};
		}
		//#endregion
		//#region src/client/personal-widgets.tsx
		/** Personal builtins use only the public widget registry; the host owns drafts and persistence. */
		function NotesContent(props) {
			const { config, preview, editing, saveConfig } = props;
			const { t } = useBuiltin();
			const [draft, setDraft] = (0, react.useState)(config.text);
			const [active, setActive] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const editable = saveConfig !== void 0 && preview === void 0 && !editing;
			(0, react.useEffect)(() => {
				if (!active) setDraft(config.text);
			}, [config.text, active]);
			const commit = (text) => {
				if (saveConfig === void 0 || text === config.text) return;
				if (!validateNotesConfig({ text })) {
					setError("limit");
					return;
				}
				saveConfig({ text }).then(() => {
					setError(null);
				}, () => {
					setError("save");
				});
			};
			(0, react.useEffect)(() => {
				if (!active || draft === config.text) return;
				const timer = window.setTimeout(() => {
					commit(draft);
				}, 600);
				return () => {
					window.clearTimeout(timer);
				};
			}, [
				draft,
				active,
				config.text,
				commit
			]);
			const begin = () => {
				if (editable) {
					setError(null);
					setActive(true);
				}
			};
			if (!editable || !active) {
				const shown = editable ? draft : config.text;
				const [shownTitle, ...shownRest] = shown.split("\n");
				const shownBody = shownRest.join("\n").replace(/^\n+/u, "");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-note",
					"data-empty": shown.trim() === "" ? "true" : "false",
					"data-editable": editable ? "true" : "false",
					role: editable ? "button" : void 0,
					tabIndex: editable ? 0 : void 0,
					"aria-label": editable ? t("notes.edit") : void 0,
					onClick: editable ? begin : void 0,
					onKeyDown: editable ? (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							begin();
						}
					} : void 0,
					children: [
						(shownTitle ?? "").trim() !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "dsh-note-title",
							children: shownTitle
						}),
						shownBody.trim() !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-note-body",
							children: shownBody
						}),
						shown.trim() === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-note-title",
							"data-placeholder": "true",
							children: t("notes.placeholder")
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-note",
				"data-editing": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					className: "dsh-note-input",
					"aria-label": t("widget.notes.title"),
					value: draft,
					autoFocus: true,
					placeholder: t("notes.placeholder"),
					spellCheck: false,
					onBlur: () => {
						commit(draft);
						setActive(false);
					},
					onChange: (event) => {
						setError(null);
						setDraft(event.target.value);
					}
				}), error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-note-error",
					role: "alert",
					children: t(error === "limit" ? "notes.limitError" : "notes.saveError")
				})]
			});
		}
		function ClockContent(props) {
			const { config, visible, preview, editing, saveConfig } = props;
			const { t, state } = useBuiltin();
			const [liveNow, setNow] = (0, react.useState)(() => preview ? state.now : Date.now());
			const now = preview ? state.now : liveNow;
			(0, react.useEffect)(() => {
				if (preview || !visible) return;
				return startMinuteClock(setNow, {
					now: Date.now,
					hidden: () => document.visibilityState === "hidden",
					schedule: (callback, delay) => window.setTimeout(callback, delay),
					cancel: (handle) => window.clearTimeout(handle),
					subscribeVisibility: (callback) => {
						document.addEventListener("visibilitychange", callback);
						return () => document.removeEventListener("visibilitychange", callback);
					}
				});
			}, [visible, preview]);
			const locale = t("clock.dateLocale");
			const { time, date } = formatPersonalClock(now, config, locale);
			const { timeParts, day, month } = personalClockDisplayParts(now, config, locale);
			const editable = saveConfig !== void 0 && preview === void 0 && !editing;
			const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
			const zones = config.timeZone !== "" && !CLOCK_ZONES.includes(config.timeZone) ? [config.timeZone, ...CLOCK_ZONES] : CLOCK_ZONES;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-clock",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-personal-clock-display",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
						className: "dsh-personal-clock-time",
						dateTime: new Date(now).toISOString(),
						"aria-label": time,
						children: timeParts.map((part, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"data-part": part.type,
							"aria-hidden": "true",
							children: part.value
						}, index))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-personal-clock-date",
						role: "img",
						"aria-label": date,
						title: date,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-personal-clock-day",
							"aria-hidden": "true",
							children: day
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-personal-clock-month",
							"aria-hidden": "true",
							children: month
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-personal-clock-zone",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: "dsh-quiet-select dsh-clock-zone",
						"aria-label": t("clock.timeZone"),
						title: config.timeZone === "" ? `${t("clock.followBrowser")} · ${browserZone}` : config.timeZone,
						value: config.timeZone,
						disabled: !editable,
						onChange: (event) => {
							saveConfig?.({ timeZone: event.target.value });
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("clock.followBrowser")
						}), zones.map((zone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: zone,
							children: zone
						}, zone))]
					})
				})]
			});
		}
		/** Registers types only; adding/duplicating instances remains a host/user decision. */
		function registerPersonalWidgets(registry, t) {
			const disposers = [];
			const dispose = () => {
				for (const off of disposers.splice(0).reverse()) off();
			};
			try {
				disposers.push(registry.register({
					typeId: "@vlln/dsh-home:notes",
					apiVersion: 1,
					configVersion: 2,
					source: "@vlln/dsh-home",
					title: () => t("widget.notes.title"),
					description: () => t("widget.notes.description"),
					icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular,
					preview: { config: () => ({ text: `${t("gallery.sample.noteTitle")}\n\n${t("gallery.sample.noteText")}` }) },
					sizing: {
						default: {
							w: 4,
							h: 6
						},
						supported: [
							{
								w: 4,
								h: 6
							},
							{
								w: 4,
								h: 8
							},
							{
								w: 8,
								h: 8
							},
							{
								w: 8,
								h: 12
							}
						]
					},
					defaultConfig: defaultNotesConfig,
					validateConfig: validateNotesConfig,
					migrateConfig: migrateNotesConfig,
					Content: NotesContent
				}));
				disposers.push(registry.register({
					typeId: "@vlln/dsh-home:clock",
					apiVersion: 1,
					configVersion: 3,
					source: "@vlln/dsh-home",
					title: () => t("widget.clock.title"),
					description: () => t("widget.clock.description"),
					icon: _deepseek_ai_dsh_client_ui_primitives.IconClockOutlineRegular,
					preview: {
						config: () => ({ timeZone: "UTC" }),
						data: { now: Date.UTC(2026, 9, 20, 10, 24) }
					},
					sizing: {
						default: {
							w: 4,
							h: 4
						},
						supported: [{
							w: 4,
							h: 4
						}]
					},
					defaultConfig: defaultClockConfig,
					validateConfig: validateClockConfig,
					migrateConfig: migrateClockConfig,
					Content: ClockContent
				}));
			} catch (error) {
				dispose();
				throw error;
			}
			return dispose;
		}
		//#endregion
		//#region src/client/quick-model.ts
		const QUICK_TYPE_ID = "@vlln/dsh-home:quick";
		const QUICK_LIMITS = Object.freeze({
			links: 8,
			label: 80,
			url: 2048,
			session: 200,
			workdir: 4096
		});
		const QUICK_KINDS = [
			"session",
			"url",
			"workdir"
		];
		const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
		const SCHEME = /^[a-z][a-z\d+.-]*:/iu;
		function record(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function text(value, max) {
			return typeof value === "string" && value.length > 0 && value.length <= max && value.trim() !== "" && !CONTROL.test(value);
		}
		/** Absolute HTTP(S) only: no protocol-relative URLs, credentials, control characters or scheme guessing. */
		function isSafeQuickUrl(value) {
			if (!text(value, QUICK_LIMITS.url) || value !== value.trim() || !/^https?:\/\/[^/\\]/iu.test(value) || /\s|\\/u.test(value)) return false;
			try {
				const url = new URL(value);
				return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "" && url.username === "" && url.password === "";
			} catch {
				return false;
			}
		}
		/** Session identifiers are opaque host IDs, never paths, URIs or external navigation targets. */
		function isSafeQuickSession(value) {
			return text(value, QUICK_LIMITS.session) && /^[a-z\d][a-z\d_.-]*$/iu.test(value);
		}
		/** Pass a bounded local path to the host workspace API; never resolve or execute it in the browser. */
		function isSafeQuickWorkdir(value) {
			if (!text(value, QUICK_LIMITS.workdir) || value !== value.trim() || value.includes("://")) return false;
			if (/^[a-z]:[\\/]/iu.test(value)) return true;
			return !SCHEME.test(value) && !value.startsWith("//") && !value.startsWith("\\\\") && !value.includes("://");
		}
		function quickLinkError(value) {
			if (!record(value)) return "config";
			if (!QUICK_KINDS.includes(value.kind)) return "kind";
			if (!text(value.label, QUICK_LIMITS.label)) return "label";
			if (Object.keys(value).some((key) => ![
				"kind",
				"label",
				"target"
			].includes(key))) return "config";
			if (value.kind === "url" && !isSafeQuickUrl(value.target)) return "url";
			if (value.kind === "session" && !isSafeQuickSession(value.target)) return "session";
			if (value.kind === "workdir" && !isSafeQuickWorkdir(value.target)) return "workdir";
			return null;
		}
		function quickConfigError(value) {
			if (!record(value) || Object.keys(value).some((key) => key !== "links") || !Array.isArray(value.links)) return "config";
			if (value.links.length > QUICK_LIMITS.links) return "limit";
			for (const link of value.links) {
				const error = quickLinkError(link);
				if (error !== null) return error;
			}
			return null;
		}
		/** Prepare-only payload for the host action: an empty prompt never submits or replaces draft text. */
		function quickWorkdirDraft(target) {
			if (!isSafeQuickWorkdir(target)) throw new Error("Invalid quick working directory");
			return {
				cwd: target,
				prompt: ""
			};
		}
		/** Fresh arrays on every call, with no shared per-instance config. */
		function defaultQuickConfig() {
			return { links: [] };
		}
		function validateQuickConfig(value) {
			return quickConfigError(value) === null;
		}
		/** Keep the legacy instance and layout: only replace its formerly empty config. */
		function migrateQuickConfig(value, fromVersion, toVersion) {
			if (fromVersion !== 1 || toVersion !== 2 || !record(value) || Object.keys(value).length !== 0) throw new Error("Unsupported quick widget configuration migration");
			return defaultQuickConfig();
		}
		//#endregion
		//#region src/client/quick-widget.tsx
		/** The builtin quick type uses the public instance/settings contract without owning layout or persistence. */
		function QuickGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8.8 1.8 4 9h3.3l-.9 5.2L11.6 7H8.2l.6-5.2Z",
					stroke: "currentColor",
					strokeWidth: "1.1",
					strokeLinejoin: "round"
				})
			});
		}
		function QuickContent(props) {
			const { config, instance, editing, visible, preview } = props;
			const { state, t, actions } = useBuiltin();
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const pending = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (preview) return;
				return () => {
					pending.current?.abort();
				};
			}, [preview]);
			(0, react.useEffect)(() => {
				if (preview) return;
				if (editing || !visible) pending.current?.abort();
			}, [
				editing,
				visible,
				preview
			]);
			const last = (state.ledger?.sessions ?? []).filter((session) => session.parentSessionId === void 0 && session.origin !== "subagent" && session.turns > 0).reduce((latest, session) => latest === void 0 || session.lastAt > latest.lastAt ? session : latest, void 0);
			const disabled = Boolean(preview) || editing || !visible || busy;
			const configError = quickConfigError(config);
			const open = (link) => {
				if (disabled || quickLinkError(link) !== null) return;
				setError(null);
				if (link.kind === "session") {
					if (state.sessions[link.target] === void 0 && !state.ledger?.sessions.some((session) => session.id === link.target)) {
						setError(t("quick.sessionMissing"));
						return;
					}
					try {
						actions.openSession(link.target);
					} catch {
						setError(t("quick.actionError"));
					}
				} else if (link.kind === "workdir") {
					if (actions.startTask === void 0) {
						setError(t("quick.workdirUnavailable"));
						return;
					}
					const controller = new AbortController();
					pending.current = controller;
					setBusy(true);
					actions.startTask({
						...quickWorkdirDraft(link.target),
						signal: controller.signal
					}).catch(() => {
						if (!controller.signal.aborted) setError(t("quick.actionError"));
					}).finally(() => {
						if (pending.current === controller) {
							pending.current = null;
							setBusy(false);
						}
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-quick-widget",
				"data-quick-instance": instance.instanceId,
				"aria-busy": busy,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						disabled,
						onClick: () => {
							actions.startSession();
						},
						className: "dsh-quick-widget-action",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.quick.new") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-key",
							children: shortcutHint()
						})]
					}),
					last !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						disabled,
						onClick: () => {
							actions.openSession(last.id);
						},
						className: "dsh-quick-widget-action",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.quick.resume") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-key",
							children: formatAgo(last.lastAt, state.now, t)
						})]
					}),
					configError === null && config.links.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-quick-widget-links",
						children: config.links.map((link, index) => link.kind === "url" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
							className: "dsh-quick-widget-link",
							href: disabled ? void 0 : link.target,
							target: "_blank",
							rel: "noopener noreferrer",
							"aria-disabled": disabled || void 0,
							tabIndex: disabled ? -1 : void 0,
							title: link.target,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: link.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "↗"
							})]
						}, index) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							disabled: disabled || link.kind === "workdir" && actions.startTask === void 0,
							title: link.target,
							className: "dsh-quick-widget-action",
							onClick: () => {
								open(link);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: link.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-quick-widget-kind",
								children: t(`quick.kind.${link.kind}`)
							})]
						}, index))
					}),
					configError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-quick-widget-error",
						role: "alert",
						children: t(`quick.error.${configError}`)
					}),
					busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						role: "status",
						children: t("quick.preparing")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-quick-widget-error",
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted",
						children: t("quick.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
						t,
						widgetProps: props,
						title: t("widget.quick.title"),
						label: t("quick.edit"),
						Fields: QuickSettings,
						validate: validateQuickConfig
					})
				]
			});
		}
		function QuickSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const update = (index, patch) => onConfigChange({ links: config.links.map((link, at) => at === index ? {
				...link,
				...patch
			} : { ...link }) });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-quick-settings",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("quick.settings.hint")
					}),
					config.links.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("quick.settings.empty")
					}),
					config.links.map((link, index) => {
						const error = quickLinkError(link);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							className: "dsh-quick-settings-row",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: t("quick.linkNumber", { n: index + 1 }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-quick-settings-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("quick.kind") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: "dsh-home-select",
										value: link.kind,
										onChange: (event) => {
											update(index, {
												kind: event.target.value,
												target: ""
											});
										},
										children: QUICK_KINDS.map((kind) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: kind,
											children: t(`quick.kind.${kind}`)
										}, kind))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-quick-settings-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("quick.label") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										value: link.label,
										maxLength: QUICK_LIMITS.label,
										onChange: (event) => {
											update(index, { label: event.target.value });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-quick-settings-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`quick.target.${link.kind}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										value: link.target,
										placeholder: t(`quick.placeholder.${link.kind}`),
										maxLength: QUICK_LIMITS[link.kind],
										autoCapitalize: "none",
										autoCorrect: "off",
										spellCheck: false,
										"aria-invalid": error === link.kind || void 0,
										onChange: (event) => {
											update(index, { target: event.target.value });
										}
									})]
								}),
								error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-quick-widget-error",
									role: "status",
									children: t(`quick.error.${error}`)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"aria-label": t("quick.removeLabel", { n: index + 1 }),
									onClick: () => {
										onConfigChange({ links: config.links.filter((_, at) => at !== index).map((link) => ({ ...link })) });
									},
									children: t("quick.remove")
								})
							]
						}, index);
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						disabled: config.links.length >= QUICK_LIMITS.links,
						onClick: () => {
							if (config.links.length >= QUICK_LIMITS.links) return;
							onConfigChange({ links: [...config.links.map((link) => ({ ...link })), {
								kind: "url",
								label: t("quick.newLabel"),
								target: ""
							}] });
						},
						children: t("quick.add")
					})
				]
			});
		}
		/** Caller owns cleanup; register in place of the generic legacy quick definition, never alongside it. */
		function registerQuickWidget(registry, t) {
			return registry.register({
				typeId: QUICK_TYPE_ID,
				apiVersion: 1,
				title: () => t("widget.quick.title"),
				description: () => t("quick.description"),
				source: "@vlln/dsh-home",
				icon: QuickGlyph,
				preview: { data: builtinPreviewData(t) },
				sizing: {
					default: {
						w: 4,
						h: 6
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 4,
							h: 6
						},
						{
							w: 4,
							h: 8
						},
						{
							w: 8,
							h: 6
						}
					]
				},
				configVersion: 2,
				defaultConfig: defaultQuickConfig,
				validateConfig: validateQuickConfig,
				migrateConfig: migrateQuickConfig,
				Content: QuickContent
			});
		}
		//#endregion
		//#region src/client/item-editor.tsx
		/**
		* 条目编辑器：待办、计划表、日程表共用的一张表单。
		*
		* 只做「编辑一条」：标题、日期、起止时间、备注；保存由调用方发 op。
		* 校验与宿主同口径（标题非空、end 晚于 start、有 start 必须有 day），
		* 但宿主仍是权威——这里只负责让按钮在明显不合法时不可点。
		*
		* @module @vlln/dsh-home/client/item-editor
		*/
		/** 空草稿；新建时把日期预填成「今天」或点中的那天。 */
		function emptyDraft(day = null) {
			return {
				title: "",
				day,
				start: null,
				end: null,
				note: "",
				priority: 0
			};
		}
		/** 本地校验；返回错误键或 null。 */
		function draftError(draft) {
			if (draft.title.trim() === "") return "planner.error.title";
			if (draft.start !== null && draft.day === null) return "planner.error.dayRequired";
			if (draft.end !== null && draft.start === null) return "planner.error.startRequired";
			if (draft.start !== null && draft.end !== null && draft.end <= draft.start) return "planner.error.endAfterStart";
			return null;
		}
		function ItemEditor({ initial, t, onSave, onCancel, onDelete, autoFocus = true, compact = false }) {
			const id = (0, react.useId)();
			const [draft, setDraft] = (0, react.useState)(initial);
			const titleRef = (0, react.useRef)(null);
			const error = draftError(draft);
			(0, react.useEffect)(() => {
				if (autoFocus) titleRef.current?.focus();
			}, [autoFocus]);
			const submit = () => {
				if (error !== null) return;
				onSave({
					title: draft.title.trim(),
					day: draft.day,
					start: draft.start,
					end: draft.end,
					note: draft.note,
					priority: draft.priority
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: "dsh-item-editor",
				"data-compact": compact ? "true" : "false",
				onSubmit: (event) => {
					event.preventDefault();
					submit();
				},
				onKeyDown: (event) => {
					if (event.key === "Escape") {
						event.stopPropagation();
						onCancel();
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-item-field dsh-item-title",
						htmlFor: `${id}-title`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-item-label",
							children: t("planner.field.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: `${id}-title`,
							ref: titleRef,
							type: "text",
							maxLength: 200,
							value: draft.title,
							placeholder: t("planner.field.titlePlaceholder"),
							onChange: (event) => setDraft({
								...draft,
								title: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-item-row",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-item-field",
								htmlFor: `${id}-day`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-item-label",
									children: t("planner.field.day")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: `${id}-day`,
									type: "date",
									value: draft.day ?? "",
									onChange: (event) => setDraft({
										...draft,
										day: event.target.value === "" ? null : event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-item-field",
								htmlFor: `${id}-start`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-item-label",
									children: t("planner.field.start")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: `${id}-start`,
									type: "time",
									value: draft.start ?? "",
									onChange: (event) => setDraft({
										...draft,
										start: event.target.value === "" ? null : event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-item-field",
								htmlFor: `${id}-end`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-item-label",
									children: t("planner.field.end")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: `${id}-end`,
									type: "time",
									value: draft.end ?? "",
									onChange: (event) => setDraft({
										...draft,
										end: event.target.value === "" ? null : event.target.value
									})
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-item-priority",
						role: "group",
						"aria-label": t("planner.field.priority"),
						children: [
							0,
							1,
							2
						].map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-item-priority-pill",
							"data-level": level,
							"aria-pressed": draft.priority === level,
							onClick: () => setDraft({
								...draft,
								priority: level
							}),
							children: t(`planner.priority.${level}`)
						}, level))
					}),
					!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-item-field",
						htmlFor: `${id}-note`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-item-label",
							children: t("planner.field.note")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							id: `${id}-note`,
							rows: 2,
							maxLength: 2e3,
							value: draft.note,
							onChange: (event) => setDraft({
								...draft,
								note: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-item-actions",
						children: [
							error === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-item-hint" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-item-hint",
								role: "alert",
								children: t(error)
							}),
							onDelete !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-item-button dsh-item-delete",
								onClick: onDelete,
								children: t("planner.action.delete")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-item-button",
								onClick: onCancel,
								children: t("planner.action.cancel")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								className: "dsh-item-button dsh-item-save",
								disabled: error !== null,
								children: t("planner.action.save")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/planner-model.ts
		/** 未完成在前；有日期在前；同一天按时间；再按创建时间。 */
		function sortItems(items) {
			return [...items].sort((left, right) => {
				if (left.done !== right.done) return left.done ? 1 : -1;
				const leftDay = left.day ?? "9999-12-31";
				const rightDay = right.day ?? "9999-12-31";
				if (leftDay !== rightDay) return leftDay < rightDay ? -1 : 1;
				const leftStart = left.start ?? "99:99";
				const rightStart = right.start ?? "99:99";
				if (leftStart !== rightStart) return leftStart < rightStart ? -1 : 1;
				if (left.done && right.done) return (right.doneAt ?? 0) - (left.doneAt ?? 0);
				return left.createdAt - right.createdAt;
			});
		}
		/**
		* 把条目分到「今天 / 本周 / 更远 / 无日期 / 已完成」。
		* 逾期未完成归入今天（日历里那一格也会亮），不让它消失在旧日期里。
		*/
		function groupItems(items, today) {
			const groups = {
				today: [],
				week: [],
				later: [],
				undated: [],
				done: []
			};
			for (const item of sortItems(items)) {
				if (item.done) {
					groups.done.push(item);
					continue;
				}
				if (item.day === null) {
					groups.undated.push(item);
					continue;
				}
				const diff = dayDiff(today, item.day);
				if (diff <= 0) groups.today.push(item);
				else if (diff <= 7) groups.week.push(item);
				else groups.later.push(item);
			}
			return groups;
		}
		/** 某一天的条目（含已完成的），按时间排序。 */
		function itemsOnDay(items, day) {
			return sortItems(items.filter((item) => item.day === day));
		}
		/**
		* 月网格（周一开头，6 行 × 7 列），首尾填上相邻月份的日期。
		* @param anchor 任意一天（用它的年月）
		*/
		function monthGrid(anchor) {
			const [year, month] = anchor.split("-").map(Number);
			const first = `${year}-${String(month).padStart(2, "0")}-01`;
			let cursor = shiftDay(first, -(weekdayOf(first) - 1));
			const weeks = [];
			for (let row = 0; row < 6; row++) {
				const week = [];
				for (let column = 0; column < 7; column++) {
					week.push(cursor);
					cursor = shiftDay(cursor, 1);
				}
				weeks.push(week);
			}
			return weeks;
		}
		/** 月网格里是否属于锚点月份。 */
		function inMonth(day, anchor) {
			return day.slice(0, 7) === anchor.slice(0, 7);
		}
		/** 同一个月前后翻页。 */
		function shiftMonth(anchor, delta) {
			const [year, month] = anchor.split("-").map(Number);
			const at = new Date(year, month - 1 + delta, 1);
			return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-01`;
		}
		/** 习惯今天该不该做。 */
		function habitDue(habit, today) {
			if (habit.weekdays === null) return true;
			return habit.weekdays.includes(weekdayOf(today));
		}
		/** 习惯今天做过没有。 */
		function habitMarked(habit, today) {
			return habit.marks[today] === true;
		}
		/**
		* 连续天数：从今天往回数，遇到没做的就停；今天还没做但昨天做了，仍然算昨天的连续。
		* 这样早上打开不会看到「连续 0 天」。
		*/
		function habitStreak(habit, today) {
			let cursor = today;
			if (!habitMarked(habit, cursor)) cursor = shiftDay(cursor, -1);
			let streak = 0;
			for (let guard = 0; guard < 400; guard++) {
				if (!habitMarked(habit, cursor)) break;
				streak++;
				cursor = shiftDay(cursor, -1);
			}
			return streak;
		}
		/** 一条条目的时间标签：`09:30` 或 `09:30–10:30`，没时间就是空串。 */
		function itemTime(item) {
			if (item.start === null) return "";
			return item.end === null ? item.start : `${item.start}–${item.end}`;
		}
		/** 条目的简短日期标签：今天 / 明天 / 11-08。 */
		function itemDayLabel(item, today, t) {
			if (item.day === null) return "";
			const diff = dayDiff(today, item.day);
			if (diff === 0) return t("plan.today");
			if (diff === 1) return t("plan.tomorrow");
			if (diff === -1) return t("plan.yesterday");
			return item.day.slice(5);
		}
		//#endregion
		//#region src/client/planner-rows.tsx
		function PlannerRow({ item, today, t, readOnly, editing, showDay = true, showTime = true, onToggle, onEdit, onSave, onDelete, onCancel }) {
			if (editing) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
				className: "dsh-todo-item",
				"data-editing": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemEditor, {
					t,
					compact: true,
					autoFocus: true,
					initial: {
						title: item.title,
						day: item.day,
						start: item.start,
						end: item.end,
						note: item.note,
						priority: item.priority
					},
					onSave,
					onDelete,
					onCancel
				})
			});
			const time = showTime ? itemTime(item) : "";
			const dayLabel = showDay && item.day !== today ? itemDayLabel(item, today, t) : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-todo-item",
				"data-done": item.done ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-todo-check",
					role: "checkbox",
					"aria-checked": item.done,
					"aria-label": item.title,
					disabled: readOnly,
					onClick: onToggle,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-todo-tick",
						"aria-hidden": "true"
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-todo-main",
					disabled: readOnly,
					onClick: onEdit,
					title: item.note === "" ? void 0 : item.note,
					children: [
						item.priority > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-priority",
							"data-priority": item.priority,
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-todo-title",
							children: item.title
						}),
						(time !== "" || dayLabel !== "") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-todo-meta",
							children: [time !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-todo-time",
								children: time
							}), dayLabel !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-todo-day",
								children: dayLabel
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/planner-preview.ts
		/** 预览用固定「今天」：2026-11-06（周五）。 */
		const PREVIEW_DAY = "2026-11-06";
		/** 预览时刻：当天 10:24（本地时区，跟用户看到的一致）。 */
		const PREVIEW_NOW$1 = new Date(2026, 10, 6, 10, 24).getTime();
		const base = {
			priority: 0,
			note: "",
			doneAt: null,
			createdAt: PREVIEW_NOW$1,
			updatedAt: PREVIEW_NOW$1
		};
		function item(id, title, overrides = {}) {
			return {
				id,
				kind: "task",
				title,
				day: PREVIEW_DAY,
				start: null,
				end: null,
				done: false,
				...base,
				...overrides
			};
		}
		function previewItems() {
			return [
				item("it_1", "review 组件契约", {
					start: "09:00",
					end: "09:45"
				}),
				item("it_2", "写首页周报", { start: "14:00" }),
				item("it_3", "整理插件文档"),
				item("it_4", "回复设计评审", { day: "2026-11-09" }),
				item("it_5", "续期域名", {
					day: null,
					kind: "task"
				}),
				item("it_6", "合并发布分支", {
					start: "08:10",
					done: true,
					doneAt: PREVIEW_NOW$1 - 36e5
				})
			];
		}
		function previewHabits() {
			return [
				{
					id: "hb_1",
					title: "跑步",
					weekdays: null,
					createdAt: PREVIEW_NOW$1,
					marks: {
						"2026-11-06": true,
						"2026-11-05": true,
						"2026-11-04": true
					}
				},
				{
					id: "hb_2",
					title: "读 20 页",
					weekdays: null,
					createdAt: PREVIEW_NOW$1,
					marks: { "2026-11-05": true }
				},
				{
					id: "hb_3",
					title: "周报复盘",
					weekdays: [5],
					createdAt: PREVIEW_NOW$1,
					marks: {}
				}
			];
		}
		/** 预览数据（每个组件把它塞进自己的 `preview.data`）。 */
		function plannerPreview() {
			return {
				day: PREVIEW_DAY,
				now: PREVIEW_NOW$1,
				items: previewItems(),
				habits: previewHabits()
			};
		}
		//#endregion
		//#region src/client/todo-widget.tsx
		/**
		* 待办：按「今天 / 本周 / 更远 / 无日期 / 已完成」分组的清单。
		*
		* 与计划表、日程表、打卡共用一份 `planner.json`：这里勾掉一条，计划表和日历同一帧就变。
		* 新建默认落在今天；点标题进编辑；`preview` 分支只渲染合成数据。
		*
		* @module @vlln/dsh-home/client/todo-widget
		*/
		function defaultTodoConfig() {
			return { showDone: true };
		}
		function validateTodoConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "showDone") && typeof config.showDone === "boolean";
		}
		const GROUP_ORDER = [
			{
				key: "today",
				label: "todo.group.today"
			},
			{
				key: "week",
				label: "todo.group.week"
			},
			{
				key: "later",
				label: "todo.group.later"
			},
			{
				key: "undated",
				label: "todo.group.undated"
			}
		];
		function TodoBody({ data, today, t, readOnly, showDone, onCreate, onToggle, onUpdate, onDelete }) {
			const [draft, setDraft] = (0, react.useState)("");
			const [editingId, setEditingId] = (0, react.useState)(null);
			const groups = groupItems(data.items, today);
			const total = groups.today.length + groups.week.length + groups.later.length + groups.undated.length;
			const visibleDone = showDone ? groups.done.slice(0, 6) : [];
			const add = () => {
				const title = draft.trim();
				if (title === "" || onCreate === void 0) return;
				onCreate(title);
				setDraft("");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-todo",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-todo-scroll",
					children: [
						total === 0 && groups.done.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-todo-empty",
							children: t("todo.empty")
						}),
						GROUP_ORDER.map((group) => {
							const items = groups[group.key];
							if (items.length === 0) return null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-todo-group",
								"data-group": group.key,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", {
									className: "dsh-todo-heading",
									children: [t(group.label), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-todo-count",
										children: items.length
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "dsh-todo-list",
									children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlannerRow, {
										item,
										today,
										t,
										readOnly,
										editing: editingId === item.id,
										onToggle: () => onToggle?.(item),
										onEdit: () => setEditingId(item.id),
										onSave: (fields) => {
											onUpdate?.(item, fields);
											setEditingId(null);
										},
										onDelete: readOnly ? void 0 : () => {
											onDelete?.(item);
											setEditingId(null);
										},
										onCancel: () => setEditingId(null)
									}, item.id))
								})]
							}, group.key);
						}),
						visibleDone.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "dsh-todo-group",
							"data-group": "done",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", {
								className: "dsh-todo-heading",
								children: [t("todo.group.done"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-todo-count",
									children: groups.done.length
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: "dsh-todo-list",
								children: visibleDone.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlannerRow, {
									item,
									today,
									t,
									readOnly,
									editing: editingId === item.id,
									onToggle: () => onToggle?.(item),
									onEdit: () => setEditingId(item.id),
									onSave: (fields) => {
										onUpdate?.(item, fields);
										setEditingId(null);
									},
									onDelete: readOnly ? void 0 : () => {
										onDelete?.(item);
										setEditingId(null);
									},
									onCancel: () => setEditingId(null)
								}, item.id))
							})]
						})
					]
				}), !readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: "dsh-todo-add",
					onSubmit: (event) => {
						event.preventDefault();
						add();
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						value: draft,
						maxLength: 200,
						placeholder: t("todo.addPlaceholder"),
						onChange: (event) => setDraft(event.target.value),
						"aria-label": t("todo.addPlaceholder")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "dsh-todo-add-button",
						disabled: draft.trim() === "",
						"aria-label": t("planner.add"),
						children: "+"
					})]
				})]
			});
		}
		function ConnectedTodo({ config, editing }) {
			const { t } = useBuiltin();
			const data = useHomeData();
			const today = todayKey();
			if (data.plannerError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-planner-detail",
						children: data.plannerError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-planner-retry",
						onClick: () => void data.store.refreshPlanner(),
						children: t("planner.retry")
					})
				]
			});
			if (data.planner === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("planner.loading")
			});
			const readOnly = editing || !data.plannerStorage.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodoBody, {
				data: {
					day: today,
					items: data.planner.items
				},
				today,
				t,
				readOnly,
				showDone: config.showDone,
				onCreate: (title) => {
					data.store.mutatePlanner({
						op: "item.create",
						item: {
							title,
							day: today
						}
					}).catch(() => {});
				},
				onToggle: (item) => {
					data.store.mutatePlanner({
						op: "item.toggle",
						id: item.id
					}).catch(() => {});
				},
				onUpdate: (item, fields) => {
					data.store.mutatePlanner({
						op: "item.update",
						id: item.id,
						patch: fields
					}).catch(() => {});
				},
				onDelete: (item) => {
					data.store.mutatePlanner({
						op: "item.delete",
						id: item.id
					}).catch(() => {});
				}
			});
		}
		function TodoContent(props) {
			const { t } = useBuiltin();
			const preview = props.preview?.data;
			if (preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodoBody, {
				data: preview,
				today: preview.day,
				t,
				readOnly: true,
				showDone: props.config.showDone
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedTodo, { ...props });
		}
		function registerTodoWidget(registry, t) {
			const preview = plannerPreview();
			return registry.register({
				typeId: "@vlln/dsh-home:todo",
				apiVersion: 1,
				title: () => t("widget.todo.title"),
				description: () => t("gallery.description.todo"),
				source: "@vlln/dsh-home",
				preview: { data: {
					day: preview.day,
					items: preview.items
				} },
				sizing: {
					default: {
						w: 4,
						h: 6
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 4,
							h: 6
						},
						{
							w: 4,
							h: 8
						},
						{
							w: 8,
							h: 6
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultTodoConfig,
				validateConfig: (config) => validateTodoConfig(config),
				Content: TodoContent
			});
		}
		//#endregion
		//#region src/client/plan-widget.tsx
		/**
		* 今日计划：今天的时间轴。
		*
		* 有开始时间的条目按时间排成块，没时间的（以及逾期未完成的）挂在「待安排」。
		* 一条「现在」线按当前时刻插在正确的位置——它每分钟重算一次，纯本地计算。
		*
		* @module @vlln/dsh-home/client/plan-widget
		*/
		function defaultPlanConfig() {
			return { showDone: false };
		}
		function validatePlanConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "showDone") && typeof config.showDone === "boolean";
		}
		function clockOf(time) {
			return time;
		}
		function PlanBody({ data, today, now, t, readOnly, showDone, onToggle, onUpdate, onDelete, onCreate }) {
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			const items = (0, react.useMemo)(() => data.items.filter((item) => item.day !== null && item.day <= today), [data.items, today]);
			const timed = itemsOnDay(items, today).filter((item) => item.start !== null && (showDone || !item.done));
			const free = items.filter((item) => item.day !== today || item.start === null).filter((item) => showDone || !item.done).sort((left, right) => (left.day ?? "9999").localeCompare(right.day ?? "9999") || left.createdAt - right.createdAt);
			const nowClock = `${String(new Date(now).getHours()).padStart(2, "0")}:${String(new Date(now).getMinutes()).padStart(2, "0")}`;
			const nowLabel = nowClock;
			const rowFor = (item, showDay = false, showTime = false) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlannerRow, {
				item,
				today,
				t,
				readOnly,
				editing: editingId === item.id,
				showDay,
				showTime,
				onToggle: () => onToggle?.(item),
				onEdit: () => setEditingId(item.id),
				onSave: (fields) => {
					onUpdate?.(item, fields);
					setEditingId(null);
				},
				onDelete: readOnly ? void 0 : () => {
					onDelete?.(item);
					setEditingId(null);
				},
				onCancel: () => setEditingId(null)
			}, item.id);
			let nowPlaced = false;
			const timeline = [];
			for (const item of timed) {
				if (!nowPlaced && (item.start ?? "") > nowClock) {
					nowPlaced = true;
					timeline.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: "dsh-plan-now",
						"aria-label": t("plan.now"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-plan-now-time",
							children: nowLabel
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-plan-now-rule",
							"aria-hidden": "true"
						})]
					}, "now"));
				}
				timeline.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: "dsh-plan-block",
					"data-done": item.done ? "true" : "false",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-plan-time",
							children: [clockOf(item.start ?? ""), item.end !== null ? `–${item.end}` : ""]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsh-todo-list",
							children: rowFor(item)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-plan-rule",
							"aria-hidden": "true"
						})
					]
				}, item.id));
			}
			if (!nowPlaced) timeline.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-plan-now",
				"aria-label": t("plan.now"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-plan-now-time",
					children: nowLabel
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-plan-now-rule",
					"aria-hidden": "true"
				})]
			}, "now"));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-plan",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-plan-scroll",
					children: [
						timed.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-todo-empty",
							children: t("plan.empty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsh-plan-list",
							children: timeline
						}),
						free.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "dsh-todo-group",
							"data-group": "free",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", {
								className: "dsh-todo-heading",
								children: [t("plan.unscheduled"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-todo-count",
									children: free.length
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: "dsh-todo-list",
								children: free.map((item) => rowFor(item, true, true))
							})]
						}),
						timed.length === 0 && free.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-plan-hint",
							children: t("plan.emptyHint")
						}),
						adding && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemEditor, {
							t,
							initial: emptyDraft(today),
							autoFocus: true,
							onSave: (fields) => {
								onCreate?.(fields);
								setAdding(false);
							},
							onCancel: () => setAdding(false)
						})
					]
				}), !readOnly && !adding && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-plan-add",
					onClick: () => setAdding(true),
					children: ["+ ", t("planner.add")]
				})]
			});
		}
		function ConnectedPlan(props) {
			const { t } = useBuiltin();
			const { config, editing } = props;
			const data = useHomeData();
			const today = todayKey();
			const now = useNow(3e4);
			if (data.plannerError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-planner-retry",
					onClick: () => void data.store.refreshPlanner(),
					children: t("planner.retry")
				})]
			});
			if (data.planner === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("planner.loading")
			});
			const readOnly = editing || !data.plannerStorage.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlanBody, {
				data: {
					day: today,
					now,
					items: data.planner.items
				},
				today,
				now,
				t,
				readOnly,
				showDone: config.showDone,
				onCreate: (fields) => {
					data.store.mutatePlanner({
						op: "item.create",
						item: fields
					}).catch(() => {});
				},
				onToggle: (item) => {
					data.store.mutatePlanner({
						op: "item.toggle",
						id: item.id
					}).catch(() => {});
				},
				onUpdate: (item, fields) => {
					data.store.mutatePlanner({
						op: "item.update",
						id: item.id,
						patch: fields
					}).catch(() => {});
				},
				onDelete: (item) => {
					data.store.mutatePlanner({
						op: "item.delete",
						id: item.id
					}).catch(() => {});
				}
			});
		}
		function PlanContent(props) {
			const { t } = useBuiltin();
			const preview = props.preview?.data;
			if (preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlanBody, {
				data: preview,
				today: preview.day,
				now: preview.now,
				t,
				readOnly: true,
				showDone: props.config.showDone
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedPlan, { ...props });
		}
		function registerPlanWidget(registry, t) {
			const preview = plannerPreview();
			return registry.register({
				typeId: "@vlln/dsh-home:plan",
				apiVersion: 1,
				title: () => t("widget.plan.title"),
				description: () => t("gallery.description.plan"),
				source: "@vlln/dsh-home",
				preview: { data: {
					day: preview.day,
					now: preview.now,
					items: preview.items
				} },
				sizing: {
					default: {
						w: 8,
						h: 6
					},
					supported: [
						{
							w: 8,
							h: 4
						},
						{
							w: 8,
							h: 6
						},
						{
							w: 8,
							h: 8
						},
						{
							w: 12,
							h: 6
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultPlanConfig,
				validateConfig: (config) => validatePlanConfig(config),
				Content: PlanContent
			});
		}
		//#endregion
		//#region src/client/calendar-widget.tsx
		/**
		* 日程：月视图 + 所选日期的条目。
		*
		* 月格里的圆点只表示「这天还有没做完的事」；点某天在下方看当天条目，也能直接在那天新建。
		* 与待办、计划表共用一份数据，任何一处改动这里立刻反映。
		*
		* @module @vlln/dsh-home/client/calendar-widget
		*/
		function defaultCalendarConfig() {
			return { weekStart: 1 };
		}
		function validateCalendarConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "weekStart") && (config.weekStart === 1 || config.weekStart === 7);
		}
		function monthTitle(anchor) {
			const [year, month] = anchor.split("-").map(Number);
			return new Date(year, month - 1, 1).toLocaleDateString(void 0, {
				year: "numeric",
				month: "long"
			});
		}
		function CalendarBody({ data, today, t, readOnly, onToggle, onUpdate, onDelete, onCreate, weekStart }) {
			const [anchor, setAnchor] = (0, react.useState)(() => `${today.slice(0, 7)}-01`);
			const [selected, setSelected] = (0, react.useState)(today);
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			const grid = monthGrid(anchor);
			const weeks = weekStart === 1 ? grid : grid.map((week) => [...week.slice(6), ...week.slice(0, 6)]);
			const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
				return t(`calendar.weekday.${weekStart === 1 ? index + 1 : (index + 6) % 7 + 1}`);
			});
			const selectedItems = itemsOnDay(data.items, selected);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-calendar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-calendar-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-calendar-nav",
								"aria-label": t("calendar.prev"),
								onClick: () => setAnchor(shiftMonth(anchor, -1)),
								children: "‹"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-calendar-title",
								children: monthTitle(anchor)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-calendar-today",
								onClick: () => {
									setAnchor(`${today.slice(0, 7)}-01`);
									setSelected(today);
								},
								children: t("calendar.today")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-calendar-nav",
								"aria-label": t("calendar.next"),
								onClick: () => setAnchor(shiftMonth(anchor, 1)),
								children: "›"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-calendar-weekdays",
						"aria-hidden": "true",
						children: weekdayLabels.map((label, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }, index))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-calendar-grid",
						role: "grid",
						"aria-label": monthTitle(anchor),
						children: weeks.map((week, row) => week.map((day) => {
							const date = Number(day.slice(8));
							const outside = !inMonth(day, anchor);
							const open = data.items.filter((item) => item.day === day && !item.done).length;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "gridcell",
								className: "dsh-calendar-cell",
								"data-outside": outside ? "true" : "false",
								"data-today": day === today ? "true" : "false",
								"data-selected": day === selected ? "true" : "false",
								"aria-pressed": day === selected,
								"aria-label": day,
								onClick: () => {
									setSelected(day);
									if (outside) setAnchor(`${day.slice(0, 7)}-01`);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-calendar-date",
									children: date
								}), open > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-calendar-dot",
									"data-density": Math.min(3, open),
									"aria-hidden": "true"
								})]
							}, `${row}-${day}`);
						}))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-calendar-day",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-calendar-day-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: selected === today ? t("plan.today") : selected }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-todo-count",
								children: selectedItems.filter((item) => !item.done).length
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-calendar-list",
							children: [
								selectedItems.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-todo-empty",
									children: t("calendar.empty")
								}),
								selectedItems.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "dsh-todo-list",
									children: selectedItems.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlannerRow, {
										item,
										today,
										t,
										readOnly,
										editing: editingId === item.id,
										showDay: false,
										onToggle: () => onToggle?.(item),
										onEdit: () => setEditingId(item.id),
										onSave: (fields) => {
											onUpdate?.(item, fields);
											setEditingId(null);
										},
										onDelete: readOnly ? void 0 : () => {
											onDelete?.(item);
											setEditingId(null);
										},
										onCancel: () => setEditingId(null)
									}, item.id))
								}),
								adding && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemEditor, {
									t,
									initial: emptyDraft(selected),
									autoFocus: true,
									onSave: (fields) => {
										onCreate?.(fields);
										setAdding(false);
									},
									onCancel: () => setAdding(false)
								})
							]
						})]
					}),
					!readOnly && !adding && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-plan-add",
						onClick: () => setAdding(true),
						children: ["+ ", t("calendar.addOn", { day: selected === today ? t("plan.today") : selected.slice(5) })]
					})
				]
			});
		}
		function ConnectedCalendar(props) {
			const { t } = useBuiltin();
			const { config, editing } = props;
			const data = useHomeData();
			const today = todayKey();
			if (data.plannerError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-planner-retry",
					onClick: () => void data.store.refreshPlanner(),
					children: t("planner.retry")
				})]
			});
			if (data.planner === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("planner.loading")
			});
			const readOnly = editing || !data.plannerStorage.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalendarBody, {
				data: {
					day: today,
					items: data.planner.items
				},
				today,
				t,
				readOnly,
				weekStart: config.weekStart,
				onCreate: (fields) => {
					data.store.mutatePlanner({
						op: "item.create",
						item: fields
					}).catch(() => {});
				},
				onToggle: (item) => {
					data.store.mutatePlanner({
						op: "item.toggle",
						id: item.id
					}).catch(() => {});
				},
				onUpdate: (item, fields) => {
					data.store.mutatePlanner({
						op: "item.update",
						id: item.id,
						patch: fields
					}).catch(() => {});
				},
				onDelete: (item) => {
					data.store.mutatePlanner({
						op: "item.delete",
						id: item.id
					}).catch(() => {});
				}
			});
		}
		function CalendarContent(props) {
			const { t } = useBuiltin();
			const preview = props.preview?.data;
			if (preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalendarBody, {
				data: preview,
				today: preview.day,
				t,
				readOnly: true,
				weekStart: props.config.weekStart
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedCalendar, { ...props });
		}
		function registerCalendarWidget(registry, t) {
			const preview = plannerPreview();
			return registry.register({
				typeId: "@vlln/dsh-home:calendar",
				apiVersion: 1,
				title: () => t("widget.calendar.title"),
				description: () => t("gallery.description.calendar"),
				source: "@vlln/dsh-home",
				preview: { data: {
					day: preview.day,
					items: preview.items
				} },
				sizing: {
					default: {
						w: 8,
						h: 8
					},
					supported: [
						{
							w: 8,
							h: 6
						},
						{
							w: 8,
							h: 8
						},
						{
							w: 12,
							h: 8
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultCalendarConfig,
				validateConfig: (config) => validateCalendarConfig(config),
				Content: CalendarContent
			});
		}
		//#endregion
		//#region src/client/habit-widget.tsx
		/**
		* 打卡：今天该做的习惯，点一下打点，右侧是连续天数。
		*
		* 只显示今天该做的（`weekdays` 过滤）；连续天数从今天往回数，今天还没做时从昨天起算，
		* 早上打开不会看到「连续 0 天」。数据与待办同一份 planner 文档。
		*
		* @module @vlln/dsh-home/client/habit-widget
		*/
		function defaultHabitConfig() {
			return { showAll: false };
		}
		function validateHabitConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "showAll") && typeof config.showAll === "boolean";
		}
		/** 稳定的色相槽：同一个习惯总是同一个颜色。 */
		function habitHue(id) {
			let hash = 0;
			for (const char of id) hash = hash * 31 + (char.codePointAt(0) ?? 0) >>> 0;
			return hash % 6;
		}
		function weekdayLabel(habit, t) {
			if (habit.weekdays === null) return t("habit.everyday");
			return t("habit.weekdays", { days: habit.weekdays.map((day) => t(`calendar.weekday.${day}`)).join(" ") });
		}
		function HabitBody({ habits, today, t, readOnly, showAll, onMark, onDelete, onCreate }) {
			const [draft, setDraft] = (0, react.useState)("");
			const due = habits.filter((habit) => habitDue(habit, today));
			const others = habits.filter((habit) => !habitDue(habit, today));
			const visible = showAll ? [...due, ...others] : due;
			const add = () => {
				const title = draft.trim();
				if (title === "" || onCreate === void 0) return;
				onCreate(title);
				setDraft("");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-habit",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-habit-scroll",
					children: [visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-todo-empty",
						children: t("habit.empty")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dsh-habit-list",
						children: visible.map((habit) => {
							const marked = habitMarked(habit, today);
							const streak = habitStreak(habit, today);
							const isDue = habitDue(habit, today);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: "dsh-habit-row",
								"data-marked": marked ? "true" : "false",
								"data-due": isDue ? "true" : "false",
								"data-hue": habitHue(habit.id),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-habit-mark",
										role: "checkbox",
										"aria-checked": marked,
										"aria-label": habit.title,
										disabled: readOnly,
										onClick: () => onMark?.(habit, !marked),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-todo-tick",
											"aria-hidden": "true"
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dsh-habit-text",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-habit-title",
											children: habit.title
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-habit-meta",
											children: weekdayLabel(habit, t)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-habit-streak",
										"data-zero": streak === 0 ? "true" : "false",
										children: streak === 0 ? t("habit.noStreak") : t("habit.streak", { count: streak })
									}),
									!readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-habit-delete",
										"aria-label": t("habit.delete"),
										onClick: () => onDelete?.(habit),
										children: "×"
									})
								]
							}, habit.id);
						})
					})]
				}), !readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: "dsh-todo-add",
					onSubmit: (event) => {
						event.preventDefault();
						add();
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						value: draft,
						maxLength: 200,
						placeholder: t("habit.addPlaceholder"),
						"aria-label": t("habit.addPlaceholder"),
						onChange: (event) => setDraft(event.target.value)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "dsh-todo-add-button",
						disabled: draft.trim() === "",
						"aria-label": t("planner.add"),
						children: "+"
					})]
				})]
			});
		}
		function ConnectedHabit(props) {
			const { t } = useBuiltin();
			const { config, editing } = props;
			const data = useHomeData();
			const today = todayKey();
			if (data.plannerError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-planner-retry",
					onClick: () => void data.store.refreshPlanner(),
					children: t("planner.retry")
				})]
			});
			if (data.planner === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("planner.loading")
			});
			const readOnly = editing || !data.plannerStorage.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HabitBody, {
				habits: data.planner.habits,
				today,
				t,
				readOnly,
				showAll: config.showAll,
				onMark: (habit, on) => {
					data.store.mutatePlanner({
						op: "habit.mark",
						id: habit.id,
						day: today,
						on
					}).catch(() => {});
				},
				onDelete: (habit) => {
					data.store.mutatePlanner({
						op: "habit.delete",
						id: habit.id
					}).catch(() => {});
				},
				onCreate: (title) => {
					data.store.mutatePlanner({
						op: "habit.create",
						habit: { title }
					}).catch(() => {});
				}
			});
		}
		function HabitContent(props) {
			const { t } = useBuiltin();
			const preview = props.preview?.data;
			if (preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HabitBody, {
				habits: preview.habits,
				today: preview.day,
				t,
				readOnly: true,
				showAll: props.config.showAll
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedHabit, { ...props });
		}
		function registerHabitWidget(registry, t) {
			const preview = plannerPreview();
			return registry.register({
				typeId: "@vlln/dsh-home:habit",
				apiVersion: 1,
				title: () => t("widget.habit.title"),
				description: () => t("gallery.description.habit"),
				source: "@vlln/dsh-home",
				preview: { data: {
					day: preview.day,
					habits: preview.habits
				} },
				sizing: {
					default: {
						w: 4,
						h: 6
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 4,
							h: 6
						},
						{
							w: 4,
							h: 8
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultHabitConfig,
				validateConfig: (config) => validateHabitConfig(config),
				Content: HabitContent
			});
		}
		//#endregion
		//#region src/client/focus-model.ts
		/** 计时器已经走了多久（毫秒）。 */
		function timerElapsed(timer, now) {
			if (timer === void 0) return 0;
			const base = timer.accumulatedMs + (timer.running && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0);
			return Math.max(0, base);
		}
		/** 番茄钟当前阶段：还剩多久、到点没有。 */
		function pomodoroSnapshot(pomodoro, now) {
			if (pomodoro === void 0) return {
				phase: "focus",
				durationMs: 25 * 6e4,
				remainingMs: 25 * 6e4,
				due: false
			};
			const durationMs = pomodoro.phase === "break" ? pomodoro.breakMs : pomodoro.focusMs;
			const elapsed = pomodoro.elapsedMs + (pomodoro.startedAt !== null ? Math.max(0, now - pomodoro.startedAt) : 0);
			return {
				phase: pomodoro.phase,
				durationMs,
				remainingMs: Math.max(0, durationMs - elapsed),
				due: elapsed >= durationMs
			};
		}
		/** 今日完成轮数。 */
		function completedToday(pomodoro, day) {
			return pomodoro?.completed[day] ?? 0;
		}
		/** `mm:ss` / `h:mm:ss`。 */
		function formatClock(ms) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor(total % 3600 / 60);
			const seconds = total % 60;
			const mm = String(minutes).padStart(2, "0");
			const ss = String(seconds).padStart(2, "0");
			return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
		}
		/** 倒计时剩余：按日历日算天数，再给时分。 */
		function countdownLeft(date, now) {
			const [year, month, day] = date.split("-").map(Number);
			const diff = new Date(year, month - 1, day).getTime() - now;
			if (diff <= 0) return {
				days: 0,
				hours: 0,
				minutes: 0,
				expired: true
			};
			return {
				days: Math.floor(diff / 864e5),
				hours: Math.floor(diff % 864e5 / 36e5),
				minutes: Math.floor(diff % 36e5 / 6e4),
				expired: false
			};
		}
		/** `YYYY-MM-DD` 的本地解析（不经过 UTC，避免时区漂移）。 */
		function parseDayKey(key) {
			const [year, month, day] = key.split("-").map(Number);
			return new Date(year, month - 1, day).getTime();
		}
		/** 倒计时列表里最近的一个未到期项；都过期时取最后一个。 */
		function nextTarget(items, now) {
			if (items.length === 0) return null;
			const sorted = [...items].sort((left, right) => left.date.localeCompare(right.date));
			return sorted.find((item) => parseDayKey(item.date) > now) ?? sorted[sorted.length - 1] ?? null;
		}
		//#endregion
		//#region src/client/timer-widget.tsx
		/**
		* 计时器：一个倒计时圆盘。
		*
		* 圆盘就是设置器：没启动时拖动圆环设定剩余时间（1–60 分钟），中间显示倒计时数字；
		* 启动后圆环按剩余比例收缩，下方只剩 Pause / Reset 两个选择，暂停后是 Resume / Reset。
		*
		* 时间状态存在宿主的 `focus.json`（按实例分槽：startedAt + accumulatedMs + targetMs），
		* 刷新、关页面、重启宿主都接着走。拖圆盘时只改本地预览，松手才写一次 `timer.target`，
		* 否则拖动会变成一串 RPC。
		*
		* @module @vlln/dsh-home/client/timer-widget
		*/
		/** 新计时器的默认时长；圆盘可以随时改。 */
		const DEFAULT_TARGET_MS = 5 * 6e4;
		/** 圆盘右侧的快捷时长（分钟）。 */
		const PRESETS = [
			5,
			10,
			15,
			25,
			45,
			60
		];
		function defaultTimerConfig() {
			return {};
		}
		/** v1 的 `label` 不再是这张卡的内容（圆盘中间只有数字），迁移时直接丢弃。 */
		function migrateTimerConfig() {
			return {};
		}
		function validateTimerConfig(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0;
		}
		const PREVIEW = {
			label: "",
			startedAt: null,
			accumulatedMs: 746e3,
			running: false,
			targetMs: 25 * 6e4
		};
		/** 把指针角度换算成分钟：正上方 = 60，顺时针一圈 = 1…60。 */
		function minutesFromAngle(dx, dy) {
			const angle = Math.atan2(dx, -dy);
			const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
			return Math.min(60, Math.max(1, Math.round(normalized / (Math.PI * 2) * 60)));
		}
		function TimerDial({ targetMs, fraction, displayMs, reached, editable, t, onPreview, onCommit }) {
			const minutes = Math.round(targetMs / 6e4);
			const latest = (0, react.useRef)(minutes);
			latest.current = minutes;
			const dial = (0, react.useRef)(null);
			const timer = (0, react.useRef)(void 0);
			const pending = (0, react.useRef)(null);
			const flush = () => {
				window.clearTimeout(timer.current);
				if (pending.current === null) return;
				const value = pending.current;
				pending.current = null;
				onCommit(value);
			};
			const later = (ms) => {
				window.clearTimeout(timer.current);
				pending.current = ms;
				timer.current = window.setTimeout(flush, 260);
			};
			(0, react.useEffect)(() => () => flush(), []);
			(0, react.useEffect)(() => {
				const node = dial.current;
				if (node === null || !editable) return;
				const wheel = (event) => {
					event.preventDefault();
					const direction = event.deltaY < 0 ? 1 : -1;
					const step = event.shiftKey ? 5 : 1;
					const next = Math.min(60, Math.max(1, latest.current + direction * step));
					if (next === latest.current) return;
					latest.current = next;
					onPreview(next * 6e4);
					later(next * 6e4);
				};
				node.addEventListener("wheel", wheel, { passive: false });
				return () => {
					node.removeEventListener("wheel", wheel);
				};
			});
			const arc = Math.min(1, Math.max(0, fraction));
			const angle = arc * Math.PI * 2 - Math.PI / 2;
			const handleX = 50 + 44 * Math.cos(angle);
			const handleY = 50 + 44 * Math.sin(angle);
			const nudge = (delta) => {
				const next = Math.min(60, Math.max(1, latest.current + delta));
				if (next === latest.current) return;
				latest.current = next;
				onPreview(next * 6e4);
				later(next * 6e4);
			};
			const drag = (event) => {
				if (!editable || event.button !== 0) return;
				event.preventDefault();
				const node = event.currentTarget;
				const startX = event.clientX;
				const startY = event.clientY;
				let started = false;
				let value = latest.current * 6e4;
				const apply = (next) => {
					const rect = node.getBoundingClientRect();
					const minutesAt = minutesFromAngle(next.clientX - (rect.left + rect.width / 2), next.clientY - (rect.top + rect.height / 2));
					value = minutesAt * 6e4;
					latest.current = minutesAt;
					onPreview(value);
				};
				const move = (next) => {
					if (!started) {
						if (Math.hypot(next.clientX - startX, next.clientY - startY) < 4) return;
						started = true;
					}
					apply(next);
				};
				const finish = () => {
					window.removeEventListener("pointermove", move);
					window.removeEventListener("pointerup", finish);
					window.removeEventListener("pointercancel", finish);
					if (started) {
						pending.current = value;
						flush();
					}
				};
				window.addEventListener("pointermove", move);
				window.addEventListener("pointerup", finish);
				window.addEventListener("pointercancel", finish);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: dial,
				className: "dsh-timer-dial",
				role: "slider",
				tabIndex: editable ? 0 : -1,
				"aria-label": t("timer.dial"),
				"aria-valuemin": 1,
				"aria-valuemax": 60,
				"aria-valuenow": minutes,
				"aria-valuetext": t("timer.minutes", { n: minutes }),
				"aria-disabled": editable ? void 0 : true,
				"data-draggable": editable ? "true" : void 0,
				onPointerDown: drag,
				onKeyDown: (event) => {
					if (!editable) return;
					if (event.key === "ArrowUp" || event.key === "ArrowRight") {
						event.preventDefault();
						nudge(1);
					} else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
						event.preventDefault();
						nudge(-1);
					} else if (event.key === "PageUp") {
						event.preventDefault();
						nudge(5);
					} else if (event.key === "PageDown") {
						event.preventDefault();
						nudge(-5);
					} else if (event.key === "Home") {
						event.preventDefault();
						onPreview(6e4);
						later(6e4);
					} else if (event.key === "End") {
						event.preventDefault();
						onPreview(60 * 6e4);
						later(60 * 6e4);
					}
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 100 100",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: "dsh-dial-track",
							cx: "50",
							cy: "50",
							r: "44"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: "dsh-dial-arc",
							cx: "50",
							cy: "50",
							r: "44",
							pathLength: "1",
							transform: "rotate(-90 50 50)",
							strokeDasharray: `${Math.max(1e-4, arc)} ${1 - Math.max(1e-4, arc)}`
						}),
						arc > .001 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: "dsh-dial-handle",
							cx: handleX,
							cy: handleY,
							r: "3.4"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-timer-face",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-dial-value",
						children: formatClock(displayMs)
					}), reached && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-dial-note",
						children: t("timer.reached")
					})]
				})]
			});
		}
		function TimerBody({ elapsed, targetMs, running, readOnly, t, onPreview, onCommit, onStart, onPause, onReset, onRestart }) {
			const target = Math.max(6e4, targetMs);
			const remaining = Math.max(0, target - elapsed);
			const reached = elapsed >= target;
			const idle = !running && elapsed === 0;
			const display = idle ? target : remaining;
			const fraction = idle ? target / (60 * 6e4) : remaining / target;
			const primary = reached ? t("timer.restart") : idle ? t("timer.start") : running ? t("timer.pause") : t("timer.resume");
			const editable = !readOnly && idle;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-timer",
				"data-running": running ? "true" : "false",
				"data-reached": reached ? "true" : "false",
				"data-idle": idle ? "true" : "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimerDial, {
						targetMs: target,
						fraction,
						displayMs: display,
						reached,
						editable,
						t,
						onPreview,
						onCommit
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-timer-presets",
						role: "group",
						"aria-label": t("timer.presets"),
						children: PRESETS.map((minutes) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-timer-preset",
							disabled: !editable,
							"data-active": Math.round(target / 6e4) === minutes ? "true" : void 0,
							"aria-pressed": Math.round(target / 6e4) === minutes,
							onClick: () => {
								onPreview(minutes * 6e4);
								onCommit(minutes * 6e4);
							},
							children: t("timer.preset", { n: minutes })
						}, minutes))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-timer-actions",
						children: idle ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-timer-button dsh-timer-primary",
							disabled: readOnly,
							onClick: onStart,
							children: t("timer.start")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-timer-button dsh-timer-primary",
							disabled: readOnly,
							onClick: reached ? onRestart : running ? onPause : onStart,
							children: primary
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-timer-button",
							disabled: readOnly,
							onClick: onReset,
							children: t("timer.reset")
						})] })
					})
				]
			});
		}
		function ConnectedTimer(props) {
			const { t } = useBuiltin();
			const data = useHomeData();
			const instanceId = props.instance.instanceId;
			const slot = data.focus?.timers[instanceId];
			const [targetMs, setTargetMs] = (0, react.useState)(slot?.targetMs || DEFAULT_TARGET_MS);
			const synced = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (data.focus === null && !data.focusLoading && data.focusError === null) data.store.refreshFocus();
			}, [
				data.focus,
				data.focusLoading,
				data.focusError,
				data.store
			]);
			(0, react.useEffect)(() => {
				if (synced.current || slot === void 0) return;
				synced.current = true;
				setTargetMs(slot.targetMs > 0 ? slot.targetMs : DEFAULT_TARGET_MS);
			}, [slot]);
			const running = slot?.running === true;
			const now = useNow(1e3, running);
			const elapsed = slot === void 0 ? 0 : timerElapsed(slot, now);
			(0, react.useEffect)(() => {
				if (data.focus === null || slot === void 0 || !slot.running) return;
				if (slot.targetMs > 0 && timerElapsed(slot, Date.now()) >= slot.targetMs) data.store.mutateFocus({
					op: "timer.pause",
					instanceId
				}).catch(() => {});
			}, [
				data.focus,
				slot,
				instanceId,
				elapsed
			]);
			if (data.focusError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-planner-retry",
					onClick: () => void data.store.refreshFocus(),
					children: t("planner.retry")
				})]
			});
			const ready = data.focus !== null;
			const readOnly = props.editing || !ready || !data.focusStorage.writable;
			const [problem, setProblem] = (0, react.useState)(null);
			const wantedTarget = (0, react.useRef)(null);
			const wantedRun = (0, react.useRef)(null);
			const run = (operation) => data.store.mutateFocus(operation).catch(() => {
				setProblem("save");
				throw new Error("timer write failed");
			});
			const persistTarget = (ms) => {
				wantedTarget.current = ms;
				run({
					op: "timer.target",
					instanceId,
					targetMs: ms
				}).catch(() => {});
			};
			(0, react.useEffect)(() => {
				if (slot === void 0) return;
				if (wantedTarget.current !== null) if (slot.targetMs === wantedTarget.current) wantedTarget.current = null;
				else setProblem("save");
				if (wantedRun.current !== null) if (slot.running === wantedRun.current) wantedRun.current = null;
				else setProblem("save");
				if (wantedTarget.current === null && wantedRun.current === null) setProblem((previous) => previous === "save" ? null : previous);
			}, [slot]);
			(0, react.useEffect)(() => {
				if (!ready || readOnly) return;
				if ((slot?.targetMs ?? 0) > 0 || slot?.running === true || (slot?.accumulatedMs ?? 0) > 0) return;
				persistTarget(DEFAULT_TARGET_MS);
			}, [
				ready,
				readOnly,
				slot?.targetMs,
				slot?.running,
				slot?.accumulatedMs
			]);
			const alert = props.editing ? null : data.focusStorage.writable ? problem : "readonly";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-timer-wrap",
				"aria-busy": ready ? void 0 : "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimerBody, {
						elapsed,
						targetMs,
						running,
						readOnly,
						t,
						onPreview: setTargetMs,
						onCommit: persistTarget,
						onStart: () => {
							wantedRun.current = true;
							run({
								op: "timer.start",
								instanceId
							}).catch(() => {});
						},
						onPause: () => {
							wantedRun.current = false;
							run({
								op: "timer.pause",
								instanceId
							}).catch(() => {});
						},
						onReset: () => {
							wantedRun.current = false;
							run({
								op: "timer.reset",
								instanceId
							}).catch(() => {});
						},
						onRestart: () => {
							wantedRun.current = true;
							run({
								op: "timer.reset",
								instanceId
							}).then(() => run({
								op: "timer.start",
								instanceId
							})).catch(() => {});
						}
					}),
					alert !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-timer-alert",
						role: "status",
						title: t("timer.writeHint"),
						children: t(alert === "readonly" ? "timer.readOnly" : "timer.writeFailed")
					}),
					!ready && !data.focusLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-planner-retry",
						onClick: () => void data.store.refreshFocus(),
						children: t("planner.retry")
					})
				]
			});
		}
		function TimerContent(props) {
			const { t } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimerBody, {
				elapsed: timerElapsed(PREVIEW, Date.now()),
				targetMs: PREVIEW.targetMs,
				running: false,
				readOnly: true,
				t,
				onPreview: () => {},
				onCommit: () => {},
				onStart: () => {},
				onPause: () => {},
				onReset: () => {},
				onRestart: () => {}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedTimer, { ...props });
		}
		function registerTimerWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:timer",
				apiVersion: 1,
				title: () => t("widget.timer.title"),
				description: () => t("gallery.description.timer"),
				source: "@vlln/dsh-home",
				preview: { config: () => ({}) },
				sizing: {
					default: {
						w: 4,
						h: 4
					},
					supported: [{
						w: 4,
						h: 4
					}, {
						w: 4,
						h: 6
					}]
				},
				configVersion: 2,
				defaultConfig: defaultTimerConfig,
				validateConfig: (config) => validateTimerConfig(config),
				migrateConfig: migrateTimerConfig,
				Content: TimerContent
			});
		}
		//#endregion
		//#region src/client/pomodoro-widget.tsx
		/**
		* 番茄钟：25 分钟专注 + 5 分钟休息，独立的，不挂任何会话。
		*
		* 状态只在宿主 `focus.json` 里（按实例分槽）；到点由本组件发一次 `pomodoro.settle`，
		* 宿主记一轮并停在下一阶段起点。关着页面到点，下次打开只结算这一轮，不追补、不连跳。
		*
		* @module @vlln/dsh-home/client/pomodoro-widget
		*/
		function defaultPomodoroConfig() {
			return { rounds: 0 };
		}
		function validatePomodoroConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "rounds") && typeof config.rounds === "number";
		}
		const PREVIEW_POMODORO = {
			phase: "focus",
			startedAt: null,
			elapsedMs: 7 * 6e4,
			focusMs: 25 * 6e4,
			breakMs: 5 * 6e4,
			completed: { "2026-11-06": 3 }
		};
		function PomodoroBody({ pomodoro, today, t, readOnly, onStart, onPause, onSkip, onReset }) {
			const running = pomodoro.startedAt !== null;
			const snapshot = pomodoroSnapshot(pomodoro, useNow(1e3, running && !readOnly));
			const rounds = completedToday(pomodoro, today);
			const progress = snapshot.durationMs === 0 ? 0 : Math.min(1, (snapshot.durationMs - snapshot.remainingMs) / snapshot.durationMs);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pomodoro",
				"data-phase": snapshot.phase,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pomodoro-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-chip",
							children: snapshot.phase === "focus" ? t("pomodoro.focus") : t("pomodoro.break")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-pomodoro-rounds",
							children: t("pomodoro.rounds", { count: rounds })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ring",
						"data-running": running ? "true" : "false",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							className: "dsh-ring-svg",
							viewBox: "0 0 120 120",
							"aria-hidden": "true",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: "dsh-ring-track",
								cx: "60",
								cy: "60",
								r: "52"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: "dsh-ring-progress",
								cx: "60",
								cy: "60",
								r: "52",
								pathLength: "1",
								strokeDasharray: `${Math.max(.001, progress).toFixed(4)} 1`,
								transform: "rotate(-90 60 60)"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ring-inner",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ring-value",
								role: "timer",
								children: formatClock(snapshot.remainingMs)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ring-caption",
								children: t(snapshot.phase === "focus" ? "pomodoro.focus" : "pomodoro.break")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-timer-actions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-timer-button dsh-timer-primary",
								disabled: readOnly,
								onClick: running ? onPause : onStart,
								children: running ? t("timer.pause") : t("pomodoro.start")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-timer-button",
								disabled: readOnly,
								onClick: onSkip,
								children: t("pomodoro.skip")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-timer-button",
								disabled: readOnly,
								onClick: onReset,
								children: t("timer.reset")
							})
						]
					})
				]
			});
		}
		function ConnectedPomodoro(props) {
			const { t } = useBuiltin();
			const data = useHomeData();
			const instanceId = props.instance.instanceId;
			const pomodoro = data.focus?.pomodoros[instanceId];
			const today = todayKey();
			const dueSent = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				if (pomodoro === void 0 || data.focusStorage.writable === false || props.editing) return;
				if (!pomodoroSnapshot(pomodoro, Date.now()).due || pomodoro.startedAt === null) return;
				if (dueSent.current === pomodoro.startedAt) return;
				dueSent.current = pomodoro.startedAt;
				data.store.mutateFocus({
					op: "pomodoro.settle",
					instanceId
				}).catch(() => {});
			});
			if (data.focusError !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-planner-fallback",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("planner.unavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-planner-retry",
					onClick: () => void data.store.refreshFocus(),
					children: t("planner.retry")
				})]
			});
			if (data.focus === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("planner.loading")
			});
			const readOnly = props.editing || !data.focusStorage.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PomodoroBody, {
				pomodoro: pomodoro ?? {
					phase: "focus",
					startedAt: null,
					elapsedMs: 0,
					focusMs: 25 * 6e4,
					breakMs: 5 * 6e4,
					completed: {}
				},
				today,
				t,
				readOnly,
				onStart: () => {
					data.store.mutateFocus({
						op: "pomodoro.start",
						instanceId
					}).catch(() => {});
				},
				onPause: () => {
					data.store.mutateFocus({
						op: "pomodoro.pause",
						instanceId
					}).catch(() => {});
				},
				onSkip: () => {
					data.store.mutateFocus({
						op: "pomodoro.skip",
						instanceId
					}).catch(() => {});
				},
				onReset: () => {
					data.store.mutateFocus({
						op: "pomodoro.reset",
						instanceId
					}).catch(() => {});
				}
			});
		}
		function PomodoroContent(props) {
			const { t } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PomodoroBody, {
				pomodoro: PREVIEW_POMODORO,
				today: "2026-11-06",
				t,
				readOnly: true,
				onStart: () => {},
				onPause: () => {},
				onSkip: () => {},
				onReset: () => {}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedPomodoro, { ...props });
		}
		function registerPomodoroWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:pomodoro",
				apiVersion: 1,
				title: () => t("widget.pomodoro.title"),
				description: () => t("gallery.description.pomodoro"),
				source: "@vlln/dsh-home",
				preview: { config: defaultPomodoroConfig },
				sizing: {
					default: {
						w: 4,
						h: 6
					},
					supported: [{
						w: 4,
						h: 4
					}, {
						w: 4,
						h: 6
					}]
				},
				configVersion: 1,
				defaultConfig: defaultPomodoroConfig,
				validateConfig: (config) => validatePomodoroConfig(config),
				Content: PomodoroContent
			});
		}
		//#endregion
		//#region src/client/countdown-widget.tsx
		/**
		* 倒计时：多个目标日期，显示最近的一个还剩多久。
		*
		* 数据只在组件配置里（目标不超过 8 个），到点显示「已到期」但不自动删除、不弹窗。
		* 不联网、不请求；时间由 `useNow` 每分钟重算。
		*
		* @module @vlln/dsh-home/client/countdown-widget
		*/
		const MAX_TARGETS = 8;
		const MAX_TITLE = 60;
		function defaultCountdownConfig() {
			return { targets: [] };
		}
		function validTarget(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const target = value;
			return Object.keys(target).sort().join(",") === "date,id,title" && typeof target.id === "string" && target.id !== "" && target.id.length <= 40 && typeof target.title === "string" && target.title.trim() !== "" && target.title.length <= MAX_TITLE && typeof target.date === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(target.date) && Number.isFinite(parseDayKey(target.date));
		}
		function validateCountdownConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			if (!Object.keys(config).every((key) => key === "targets")) return false;
			if (!Array.isArray(config.targets) || config.targets.length > MAX_TARGETS) return false;
			const ids = /* @__PURE__ */ new Set();
			for (const target of config.targets) {
				if (!validTarget(target) || ids.has(target.id)) return false;
				ids.add(target.id);
			}
			return true;
		}
		function createId(seed) {
			return `t_${seed.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
		}
		const PREVIEW_CONFIG = { targets: [{
			id: "t_1",
			title: "发布 1.0",
			date: "2026-12-01"
		}, {
			id: "t_2",
			title: "团队旅行",
			date: "2027-01-15"
		}] };
		function CountdownSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const id = (0, react.useId)();
			const update = (targets) => onConfigChange({ targets: targets.slice(0, MAX_TARGETS) });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-settings",
				children: [
					config.targets.map((target, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-countdown-row",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-item-field",
								htmlFor: `${id}-title-${index}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-item-label",
									children: t("countdown.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: `${id}-title-${index}`,
									type: "text",
									maxLength: MAX_TITLE,
									value: target.title,
									onChange: (event) => update(config.targets.map((entry) => entry.id === target.id ? {
										...entry,
										title: event.target.value
									} : entry))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-item-field",
								htmlFor: `${id}-date-${index}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-item-label",
									children: t("countdown.date")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: `${id}-date-${index}`,
									type: "date",
									value: target.date,
									onChange: (event) => update(config.targets.map((entry) => entry.id === target.id ? {
										...entry,
										date: event.target.value
									} : entry))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-item-button",
								"aria-label": t("countdown.remove"),
								onClick: () => update(config.targets.filter((entry) => entry.id !== target.id)),
								children: "×"
							})
						]
					}, target.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-item-button",
						disabled: config.targets.length >= MAX_TARGETS,
						onClick: () => update([...config.targets, {
							id: createId(Date.now()),
							title: "",
							date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
						}]),
						children: ["+ ", t("countdown.add")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-personal-hint",
						children: t("countdown.hint", { max: MAX_TARGETS })
					})
				]
			});
		}
		function CountdownBody({ config, now, t, readOnly }) {
			const target = nextTarget(config.targets.filter(validTarget), now);
			if (target === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-todo-empty",
				children: t(config.targets.length === 0 ? "countdown.empty" : "countdown.pickOne")
			});
			const left = countdownLeft(target.date, now);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-countdown",
				"data-expired": left.expired ? "true" : "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-countdown-title",
						children: target.title
					}),
					left.expired ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-countdown-expired",
						children: t("countdown.expired")
					}) : left.days > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-countdown-clock",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-countdown-days",
								children: left.days
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-countdown-unit",
								children: t("countdown.days")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-countdown-rest",
								children: [
									String(left.hours).padStart(2, "0"),
									":",
									String(left.minutes).padStart(2, "0")
								]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-countdown-clock",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-countdown-days",
							children: [
								String(left.hours).padStart(2, "0"),
								":",
								String(left.minutes).padStart(2, "0")
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-countdown-unit",
							children: t("countdown.hours")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-countdown-date",
						children: target.date
					}),
					!readOnly && config.targets.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-countdown-hint",
						children: t("countdown.addHint")
					})
				]
			});
		}
		function ConnectedCountdown(props) {
			const { t } = useBuiltin();
			const now = useNow(6e4);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-countdown-wrap",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CountdownBody, {
					config: props.config,
					now,
					t,
					readOnly: props.editing
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
					t,
					widgetProps: props,
					title: t("widget.countdown.title"),
					label: t("countdown.settings"),
					Fields: CountdownSettings,
					validate: validateCountdownConfig
				})]
			});
		}
		function CountdownContent(props) {
			const { t } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CountdownBody, {
				config: PREVIEW_CONFIG,
				now: Date.now(),
				t,
				readOnly: true
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedCountdown, { ...props });
		}
		function registerCountdownWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:countdown",
				apiVersion: 1,
				title: () => t("widget.countdown.title"),
				description: () => t("gallery.description.countdown"),
				source: "@vlln/dsh-home",
				preview: { config: () => PREVIEW_CONFIG },
				sizing: {
					default: {
						w: 4,
						h: 4
					},
					supported: [{
						w: 4,
						h: 4
					}, {
						w: 4,
						h: 6
					}]
				},
				configVersion: 1,
				defaultConfig: defaultCountdownConfig,
				validateConfig: (config) => validateCountdownConfig(config),
				Content: CountdownContent
			});
		}
		//#endregion
		//#region src/client/usage-model.ts
		function emptyBuckets() {
			return {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0
			};
		}
		/** 合计各桶；缺字段按 0（老账本或未采样的天）。 */
		function bucketsOf(day) {
			const tokens = day?.tokens;
			if (tokens === void 0) return emptyBuckets();
			return {
				input: tokens.input ?? 0,
				output: tokens.output ?? 0,
				cacheRead: tokens.cacheRead ?? 0,
				cacheWrite: tokens.cacheWrite ?? 0
			};
		}
		/** 一天的总 token（输入 + 输出 + 缓存读 + 缓存写）。 */
		function totalTokens(buckets) {
			return buckets.input + buckets.output + buckets.cacheRead + buckets.cacheWrite;
		}
		/** 多天求和。 */
		function sumDays(days) {
			return days.reduce((total, day) => {
				const buckets = bucketsOf(day);
				return {
					input: total.input + buckets.input,
					output: total.output + buckets.output,
					cacheRead: total.cacheRead + buckets.cacheRead,
					cacheWrite: total.cacheWrite + buckets.cacheWrite
				};
			}, emptyBuckets());
		}
		/** 缓存命中率 = 缓存读 /（未缓存输入 + 缓存读 + 缓存写）；没有输入时返回 null。 */
		function cacheHitRate(buckets) {
			const prompt = buckets.input + buckets.cacheRead + buckets.cacheWrite;
			return prompt === 0 ? null : buckets.cacheRead / prompt;
		}
		/** 速率 = 输出 token ÷ 运行时长（token/s）；没有运行时长时返回 null。 */
		function tokensPerSecond(buckets, runMs) {
			if (!Number.isFinite(runMs) || runMs <= 0) return null;
			return buckets.output / (runMs / 1e3);
		}
		/** 紧凑数字：1 234 → 1.2k，3 400 000 → 3.4M。 */
		function compactCount(value) {
			if (!Number.isFinite(value) || value < 0) return "0";
			if (value < 1e3) return String(Math.round(value));
			if (value < 1e6) return `${(value / 1e3).toFixed(value < 1e4 ? 1 : 0).replace(/\.0$/u, "")}k`;
			return `${(value / 1e6).toFixed(value < 1e7 ? 1 : 0).replace(/\.0$/u, "")}M`;
		}
		//#endregion
		//#region src/client/usage-widget.tsx
		function defaultUsageConfig() {
			return { week: true };
		}
		function validateUsageConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "week") && typeof config.week === "boolean";
		}
		function percent(value) {
			return `${Math.round(value * 100)}%`;
		}
		function donutGradient(buckets) {
			const parts = [
				{
					value: buckets.input,
					color: "var(--dsh-ramp-4)"
				},
				{
					value: buckets.cacheRead,
					color: "var(--dsh-ramp-2)"
				},
				{
					value: buckets.output,
					color: "var(--dsh-ramp-3)"
				},
				{
					value: buckets.cacheWrite,
					color: "var(--dsh-ramp-1)"
				}
			].filter((part) => part.value > 0);
			const sum = parts.reduce((total, part) => total + part.value, 0);
			if (sum === 0) return "conic-gradient(var(--dsh-accent-soft) 0 100%)";
			let cursor = 0;
			return `conic-gradient(from -90deg, ${parts.map((part) => {
				const from = cursor;
				cursor += part.value / sum * 100;
				return `${part.color} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`;
			}).join(", ")})`;
		}
		function UsageBody({ data, t, compact, week }) {
			const today = bucketsOf(data.today);
			const total = totalTokens(today);
			const rate = tokensPerSecond(today, data.today.runMs);
			cacheHitRate(today);
			const days = week ? data.days.slice(-7) : [];
			const peak = Math.max(1, ...days.map((day) => totalTokens(bucketsOf(day))));
			const windowBuckets = week ? sumDays(days) : today;
			const windowHit = cacheHitRate(windowBuckets);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-usage",
				"data-compact": compact ? "true" : "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-usage-hero",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-usage-figure",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-usage-total",
								"aria-label": t("usage.today"),
								children: compactCount(total)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-usage-unit",
								children: [
									t("usage.today"),
									" · ",
									t("usage.unit")
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-usage-donut",
							style: { background: donutGradient(windowBuckets) },
							role: "img",
							"aria-label": t("usage.split"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-usage-donut-hole",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: windowHit === null ? "—" : percent(windowHit) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { children: t(week ? "usage.sevenDays" : "usage.hit") })]
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-usage-chips",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-chip",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
										className: "dsh-chip-dot",
										style: { "--dsh-part": "var(--dsh-ramp-4)" },
										"aria-hidden": "true"
									}),
									t("usage.input"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: compactCount(today.input) })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-chip",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
										className: "dsh-chip-dot",
										style: { "--dsh-part": "var(--dsh-ramp-2)" },
										"aria-hidden": "true"
									}),
									t("usage.cache"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: compactCount(today.cacheRead) })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-chip",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
										className: "dsh-chip-dot",
										style: { "--dsh-part": "var(--dsh-ramp-3)" },
										"aria-hidden": "true"
									}),
									t("usage.output"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: compactCount(today.output) })
								]
							})
						]
					}),
					week && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-usage-bars",
						role: "img",
						"aria-label": t("usage.week"),
						children: days.map((day) => {
							const value = totalTokens(bucketsOf(day));
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-usage-col",
								title: `${day.key.slice(5)} · ${compactCount(value)}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-usage-bar",
									style: { height: `${Math.max(value > 0 ? 6 : 1, value / peak * 100)}%` }
								})
							}, day.key);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-usage-foot",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-muted",
							children: [
								t("usage.rate"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: rate === null ? "—" : rate.toFixed(1) }),
								" ",
								t("usage.perSecond")
							]
						}), week && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-muted",
							children: [
								t("usage.weekTotal"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: compactCount(totalTokens(sumDays(days))) })
							]
						})]
					})
				]
			});
		}
		function ConnectedUsage(props) {
			const { t, state } = useBuiltin();
			const snapshot = state.ledger;
			if (snapshot === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-planner-loading",
				role: "status",
				children: t("usage.loading")
			});
			const today = snapshot.today;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBody, {
				t,
				compact: props.width < 480,
				week: props.config.week,
				data: {
					today: {
						tokens: today.tokens,
						runMs: today.runMs
					},
					days: snapshot.days
				}
			});
		}
		function UsageContent(props) {
			const { t } = useBuiltin();
			const preview = props.preview?.data;
			if (preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBody, {
				data: preview,
				t,
				compact: props.width < 480,
				week: props.config.week
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedUsage, { ...props });
		}
		function previewData() {
			const days = Array.from({ length: 14 }, (_, index) => {
				const activeMs = [
					42,
					0,
					96,
					61,
					130,
					0,
					18,
					74,
					155,
					88,
					0,
					210,
					133,
					64
				][index] * 6e4;
				return {
					key: `2026-11-${String(index + 1).padStart(2, "0")}`,
					activeMs,
					runMs: Math.round(activeMs * .4),
					turns: 3,
					sessions: activeMs > 0 ? 1 : 0,
					tokens: {
						input: Math.round(activeMs / 900),
						output: Math.round(activeMs / 3600),
						cacheRead: Math.round(activeMs / 260),
						cacheWrite: 0
					}
				};
			});
			const last = days[13];
			return {
				today: {
					tokens: last.tokens,
					runMs: last.runMs
				},
				days
			};
		}
		function registerUsageWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:usage",
				apiVersion: 1,
				title: () => t("widget.usage.title"),
				description: () => t("gallery.description.usage"),
				source: "@vlln/dsh-home",
				preview: { data: previewData() },
				sizing: {
					default: {
						w: 8,
						h: 4
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 8,
							h: 4
						},
						{
							w: 8,
							h: 6
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultUsageConfig,
				validateConfig: (config) => validateUsageConfig(config),
				Content: UsageContent
			});
		}
		//#endregion
		//#region src/client/quote-model.ts
		const BUILTIN_ZH = [
			"把今天该做的做完，剩下的交给明天。",
			"慢慢来，但别停。",
			"先让它跑起来，再让它跑得好。",
			"写下来，就已经解决了一半。",
			"一次只做一件事，做完再抬头。",
			"不确定的时候，先做那个可逆的。",
			"把复杂留给自己，把简单留给别人。",
			"能删掉的代码，才是好代码。",
			"休息不是偷懒，是为了下一段专注。",
			"今天的进度，比昨天的计划重要。",
			"少一点犹豫，多一点提交。",
			"做完比做完美更接近完成。"
		];
		const BUILTIN_EN = [
			"Finish what today asks for; leave the rest for tomorrow.",
			"Go slowly, but do not stop.",
			"Make it run first, then make it run well.",
			"Writing it down solves half of it.",
			"One thing at a time, then look up.",
			"When unsure, pick the reversible move.",
			"Keep the complexity; hand over the simple part.",
			"Good code is code you can delete.",
			"A rest is not laziness; it funds the next focus.",
			"Today's progress beats yesterday's plan.",
			"Less hesitation, more commits.",
			"Done is closer to finished than perfect."
		];
		/** 稳定的每日索引：同一句在一天里不会跳。 */
		function quoteIndex(day, count, salt = "") {
			if (count <= 0) return 0;
			let hash = 2166136261;
			for (const char of `${day}|${salt}`) {
				hash ^= char.codePointAt(0) ?? 0;
				hash = Math.imul(hash, 16777619) >>> 0;
			}
			return hash % count;
		}
		/** 今天该显示哪一句；自定义清单优先。 */
		function pickQuote(config, day, language) {
			const words = config.lines.filter((line) => line.trim() !== "");
			if (words.length > 0) return words[quoteIndex(day, words.length, "custom")];
			const builtin = language.startsWith("zh") ? BUILTIN_ZH : BUILTIN_EN;
			return builtin[quoteIndex(day, builtin.length, language)];
		}
		//#endregion
		//#region src/client/quote-widget.tsx
		/**
		* 一句话：内置语录按日期确定性轮换，也可以换成自己的清单。
		*
		* 同一天、同一种语言永远是同一句（用日键做种子），不联网、不请求、不随机。
		*
		* @module @vlln/dsh-home/client/quote-widget
		*/
		function defaultQuoteConfig() {
			return { lines: [] };
		}
		function validateQuoteConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			if (!Object.keys(config).every((key) => key === "lines")) return false;
			return Array.isArray(config.lines) && config.lines.length <= 50 && config.lines.every((line) => typeof line === "string" && line.length <= 120);
		}
		function QuoteSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const id = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-settings",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dsh-item-field",
					htmlFor: `${id}-lines`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-item-label",
						children: t("quote.lines")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						id: `${id}-lines`,
						rows: 8,
						value: config.lines.join("\n"),
						placeholder: t("quote.placeholder"),
						onChange: (event) => onConfigChange({ lines: event.target.value.split("\n").slice(0, 50).map((line) => line.slice(0, 120)) })
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-personal-hint",
					children: t("quote.hint", { max: 50 })
				})]
			});
		}
		function QuoteBody({ text, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-quote",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-quote-mark",
						"aria-hidden": "true",
						children: "“"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-quote-text",
						children: text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-quote-hint",
						children: t("quote.daily")
					})
				]
			});
		}
		function QuoteContent(props) {
			const { t, language } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuoteBody, {
				t,
				text: pickQuote({ lines: [] }, "2026-11-06", language)
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-quote-wrap",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuoteBody, {
					t,
					text: pickQuote(props.config, todayKey(), language)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
					t,
					widgetProps: props,
					title: t("widget.quote.title"),
					label: t("quote.settings"),
					Fields: QuoteSettings,
					validate: validateQuoteConfig
				})]
			});
		}
		function registerQuoteWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:quote",
				apiVersion: 1,
				title: () => t("widget.quote.title"),
				description: () => t("gallery.description.quote"),
				source: "@vlln/dsh-home",
				preview: { config: () => ({ lines: [] }) },
				sizing: {
					default: {
						w: 4,
						h: 4
					},
					supported: [{
						w: 4,
						h: 4
					}, {
						w: 4,
						h: 6
					}]
				},
				configVersion: 1,
				defaultConfig: defaultQuoteConfig,
				validateConfig: (config) => validateQuoteConfig(config),
				Content: QuoteContent
			});
		}
		function validatePictureConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "src" || key === "title" || key === "fit") && typeof config.src === "string" && config.src.length <= 1024 && typeof config.title === "string" && config.title.length <= 80 && (config.fit === "cover" || config.fit === "contain");
		}
		/** 宿主的本地图片路由（与 `src/index.mjs` 的 `IMAGE_PATH` 同源）。 */
		const IMAGE_PATH = "/api/dsh-home/image";
		/**
		* 把配置里的来源翻译成可渲染的 URL。
		* @param src 用户填写的地址或路径
		* @returns 远程地址直出；本地路径走宿主路由；空值与不认识的协议视为无来源
		*/
		function pictureSource(src) {
			const value = src.trim();
			if (value === "") return { kind: "none" };
			if (/^https?:\/\//iu.test(value)) return {
				kind: "remote",
				url: value
			};
			if (/^[a-z][a-z\d+.-]*:/iu.test(value)) return { kind: "none" };
			if (!value.startsWith("/") && !value.startsWith("~/")) return { kind: "none" };
			return {
				kind: "local",
				url: `${IMAGE_PATH}?path=${encodeURIComponent(value)}`
			};
		}
		//#endregion
		//#region src/client/picture-widget.tsx
		/**
		* 图片卡：一张图 + 可选标题。来源可以是 http(s) 地址，也可以是本地绝对路径。
		*
		* 本地路径由宿主的只读路由读出（`<img>` 无法直接读文件），限制图片扩展名与 20 MB；
		* 加载失败只显示占位块和路径，不留破图。无网络请求的预览用内联 SVG。
		*
		* @module @vlln/dsh-home/client/picture-widget
		*/
		/** 预览用内联图：不联网、不读盘。 */
		const PREVIEW_SRC = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"180\" viewBox=\"0 0 320 180\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e8eef7\"/><stop offset=\"1\" stop-color=\"#d7e2f2\"/></linearGradient></defs><rect width=\"320\" height=\"180\" fill=\"url(#g)\"/><circle cx=\"250\" cy=\"52\" r=\"26\" fill=\"#f7fafc\"/><path d=\"M0 180 L96 92 L168 150 L232 108 L320 180 Z\" fill=\"#b9cbe4\"/></svg>");
		function PictureSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const id = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-settings",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-item-field",
						htmlFor: `${id}-src`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-item-label",
							children: t("picture.src")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: `${id}-src`,
							type: "text",
							maxLength: 1024,
							value: config.src,
							placeholder: "https://… 或 /Users/…",
							onChange: (event) => onConfigChange({
								...config,
								src: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-item-field",
						htmlFor: `${id}-title`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-item-label",
							children: t("picture.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: `${id}-title`,
							type: "text",
							maxLength: 80,
							value: config.title,
							onChange: (event) => onConfigChange({
								...config,
								title: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-item-field",
						htmlFor: `${id}-fit`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-item-label",
							children: t("picture.fit")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							id: `${id}-fit`,
							value: config.fit,
							onChange: (event) => onConfigChange({
								...config,
								fit: event.target.value === "contain" ? "contain" : "cover"
							}),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "cover",
								children: t("picture.fitCover")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "contain",
								children: t("picture.fitContain")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-personal-hint",
						children: t("picture.hint")
					})
				]
			});
		}
		function PictureBody({ config, t, fallback }) {
			const [failed, setFailed] = (0, react.useState)(null);
			const source = pictureSource(fallback ?? config.src);
			if (source.kind === "none") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-picture-empty",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-picture-empty-glyph",
					"aria-hidden": "true",
					children: "▧"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("picture.empty") })]
			});
			if (failed === source.url) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-picture-empty",
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-picture-empty-glyph",
						"aria-hidden": "true",
						children: "▧"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("picture.failed") }),
					source.kind === "local" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-picture-path",
						children: config.src
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
				className: "dsh-picture",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: source.url,
					alt: config.title === "" ? t("picture.alt") : config.title,
					style: { objectFit: config.fit },
					loading: "lazy",
					decoding: "async",
					onError: () => setFailed(source.url)
				}), config.title !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
					className: "dsh-picture-caption",
					children: config.title
				})]
			});
		}
		function PictureContent(props) {
			const { t } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PictureBody, {
				t,
				config: {
					...props.config,
					title: props.config.title === "" ? t("widget.picture.title") : props.config.title
				},
				fallback: PREVIEW_SRC
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-picture-wrap",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PictureBody, {
					t,
					config: props.config
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
					t,
					widgetProps: props,
					title: t("widget.picture.title"),
					label: t("picture.settings"),
					Fields: PictureSettings,
					validate: validatePictureConfig
				})]
			});
		}
		function registerPictureWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:picture",
				apiVersion: 1,
				title: () => t("widget.picture.title"),
				description: () => t("gallery.description.picture"),
				source: "@vlln/dsh-home",
				preview: { config: () => ({
					src: "",
					title: "",
					fit: "cover"
				}) },
				sizing: {
					default: {
						w: 4,
						h: 4
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 8,
							h: 4
						},
						{
							w: 8,
							h: 6
						}
					]
				},
				configVersion: 1,
				defaultConfig: () => ({
					src: "",
					title: "",
					fit: "cover"
				}),
				validateConfig: (config) => validatePictureConfig(config),
				Content: PictureContent
			});
		}
		//#endregion
		//#region src/client/balance-widget.tsx
		/**
		* 余额：DeepSeek 平台账户余额。
		*
		* key 只在宿主侧使用（设置里的 `apiKeyEnv` 引用 → 凭据服务，或 `DEEPSEEK_API_KEY`），
		* 浏览器只拿数字。没有配置或平台不可达时显示原因，不显示旧值、不重试。
		* 请求由用户点击触发，或挂载后拉一次（宿主缓存 5 分钟）。
		*
		* @module @vlln/dsh-home/client/balance-widget
		*/
		function defaultBalanceConfig() {
			return { auto: true };
		}
		function validateBalanceConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			return Object.keys(config).every((key) => key === "auto") && typeof config.auto === "boolean";
		}
		const PREVIEW_STATE = {
			available: true,
			currency: "CNY",
			total: 128.5,
			granted: 0,
			toppedUp: 128.5
		};
		function reasonKey(reason) {
			if (reason === void 0) return "balance.unavailable";
			if (reason === "not-configured") return "balance.notConfigured";
			if (reason === "timeout") return "balance.timeout";
			return "balance.unavailable";
		}
		function BalanceBody({ state, t, loading, onRefresh, readOnly }) {
			if (!state.available) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-balance",
				"data-available": "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-label",
						children: t("balance.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-amount",
						"data-unknown": "true",
						children: "¥ —"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-reason",
						children: t(reasonKey(state.reason))
					}),
					!readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-timer-button",
						disabled: loading,
						onClick: onRefresh,
						children: t("balance.refresh")
					})
				]
			});
			const currency = state.currency === "CNY" ? "¥" : state.currency === "USD" ? "$" : `${state.currency ?? ""} `;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-balance",
				"data-available": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-label",
						children: t("balance.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-balance-amount",
						"data-known": "true",
						children: [currency, (state.total ?? 0).toFixed(2)]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-balance-detail",
						children: [state.toppedUp !== null && state.toppedUp !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							t("balance.toppedUp"),
							" ",
							state.toppedUp.toFixed(2)
						] }), state.granted !== null && state.granted !== void 0 && state.granted > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							t("balance.granted"),
							" ",
							state.granted.toFixed(2)
						] })]
					}),
					!readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-timer-button",
						disabled: loading,
						onClick: onRefresh,
						children: t("balance.refresh")
					})
				]
			});
		}
		function ConnectedBalance(props) {
			const { t } = useBuiltin();
			const [state, setState] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const readOnly = props.editing;
			const load = async () => {
				setLoading(true);
				setFailed(false);
				try {
					const response = await fetch(BALANCE_PATH, {
						method: "POST",
						credentials: "same-origin",
						cache: "no-store"
					});
					if (!response.ok) throw new Error(`balance: HTTP ${response.status}`);
					setState(await response.json());
				} catch {
					setFailed(true);
				} finally {
					setLoading(false);
				}
			};
			(0, react.useEffect)(() => {
				if (!props.config.auto || readOnly) return;
				load();
			}, [props.config.auto, readOnly]);
			if (failed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-balance",
				"data-available": "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-label",
						children: t("balance.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-amount",
						"data-unknown": "true",
						children: "¥ —"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-reason",
						children: t("balance.unavailable")
					}),
					!readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-timer-button",
						onClick: () => void load(),
						children: t("balance.refresh")
					})
				]
			});
			if (state === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-balance",
				"data-available": "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-label",
						children: t("balance.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-amount",
						"data-unknown": "true",
						children: "¥ —"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-balance-reason",
						children: loading ? t("balance.loading") : t("balance.idle")
					}),
					!readOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-timer-button",
						disabled: loading,
						onClick: () => void load(),
						children: t("balance.query")
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceBody, {
				state,
				t,
				loading,
				readOnly,
				onRefresh: () => void load()
			});
		}
		function BalanceContent(props) {
			const { t } = useBuiltin();
			if (props.preview !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceBody, {
				state: PREVIEW_STATE,
				t,
				loading: false,
				readOnly: true,
				onRefresh: () => {}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectedBalance, { ...props });
		}
		function registerBalanceWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:balance",
				apiVersion: 1,
				title: () => t("widget.balance.title"),
				description: () => t("gallery.description.balance"),
				source: "@vlln/dsh-home",
				preview: { config: () => ({ auto: true }) },
				sizing: {
					default: {
						w: 4,
						h: 4
					},
					supported: [{
						w: 4,
						h: 4
					}]
				},
				configVersion: 1,
				defaultConfig: defaultBalanceConfig,
				validateConfig: (config) => validateBalanceConfig(config),
				Content: BalanceContent
			});
		}
		//#endregion
		//#region src/client/session-status-widget.tsx
		const GROUP_TYPE = "@vlln/dsh-home:running";
		/** 三个视图的稳定顺序与默认值；旧实例的 `{}` 仍然有效（自动选第一个有内容的视图）。 */
		function defaultSessionStatusConfig() {
			return { status: null };
		}
		function validateSessionStatusConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const config = value;
			if (!Object.keys(config).every((key) => key === "status")) return false;
			return config.status === void 0 || config.status === null || SESSION_STATUS_GROUPS.includes(config.status);
		}
		/** 「在等我」的原因：审批 / 计划评审 / 提问 / 跑完没看。 */
		function waitingReason(status, t) {
			const interaction = typeof status?.pendingInteraction === "string" ? status.pendingInteraction : status?.pendingInteraction?.kind;
			if (interaction === "approval") return t("queue.approval");
			if (interaction === "plan-review") return t("queue.plan");
			if (interaction === "question") return t("queue.question");
			if (status?.completionUnread === true) return t("queue.done");
		}
		function StatusGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M2 4.5h6M2 8h9M2 11.5h5",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12.4",
						cy: "4.5",
						r: "1.6",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "13.4",
						cy: "11.5",
						r: "1.6",
						fill: "currentColor"
					})
				]
			});
		}
		function SessionStatusContent(props) {
			const { state, t, actions, statuses, statusSource, store } = useBuiltin();
			const configured = SESSION_STATUS_GROUPS.includes(props.config.status) ? props.config.status : null;
			const rows = statusSessions(mergeRecentSessions(state.sessions, state.ledger?.sessions), statusSource === "runtime" ? statuses : void 0, state.prefs.dismissed);
			const counts = groupCounts(rows);
			const group = configured ?? effectiveGroup(counts, "running");
			const labels = cwdLabels(rows.map((row) => row.session.cwd));
			const shown = rows.filter((row) => row.group === group);
			const canChoose = props.saveConfig !== void 0 && props.preview === void 0;
			const open = (id) => {
				actions.openSession(id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-session-status",
				"data-status-source": statusSource,
				"data-group": group,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-status-filter",
						role: "group",
						"aria-label": t("sessionStatus.filter"),
						children: SESSION_STATUS_GROUPS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-status-chip",
							"data-group": value,
							"data-active": value === group,
							"aria-pressed": value === group,
							disabled: !canChoose,
							onClick: () => {
								props.saveConfig?.({ status: value });
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
									className: "dsh-status-dot",
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`sessionStatus.group.${value}`) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-status-count",
									"aria-hidden": "true",
									children: counts[value]
								})
							]
						}, value))
					}),
					shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-empty dsh-status-empty",
						role: "status",
						children: t(`sessionStatus.empty.${group}`)
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-rows dsh-status-rows",
						children: shown.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
							session: row.session,
							title: row.session.title ?? t("recent.untitled"),
							workspace: row.session.cwd === void 0 ? t("recent.unknownCwd") : labels.get(row.session.cwd) ?? row.session.cwd,
							workspaceTitle: row.session.cwd,
							status: row.status,
							reason: group === "waiting" ? waitingReason(statuses.get(row.session.id), t) : void 0,
							now: state.now,
							t,
							onOpen: () => open(row.session.id),
							onDismiss: group === "waiting" ? () => {
								store.dismiss(row.session.id);
							} : void 0
						}, row.session.id))
					}),
					statusSource !== "runtime" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("sessionStatus.noStatus")
					})
				]
			});
		}
		function registerSessionStatusWidget(registry, t) {
			return registry.register({
				typeId: GROUP_TYPE,
				apiVersion: 1,
				title: () => t("widget.sessionStatus.title"),
				description: () => t("sessionStatus.description"),
				source: "@vlln/dsh-home",
				icon: StatusGlyph,
				preview: {
					data: builtinPreviewData(t),
					config: defaultSessionStatusConfig
				},
				sizing: {
					default: {
						w: 4,
						h: 6
					},
					supported: [
						{
							w: 4,
							h: 4
						},
						{
							w: 4,
							h: 6
						},
						{
							w: 8,
							h: 6
						},
						{
							w: 8,
							h: 8
						}
					]
				},
				configVersion: 1,
				defaultConfig: defaultSessionStatusConfig,
				validateConfig: (config) => validateSessionStatusConfig(config),
				Content: SessionStatusContent
			});
		}
		//#endregion
		//#region src/client/builtin-registration.tsx
		/** Internal adapters: builtins use the same public registry; no business dispatch lives in the page. */
		const Runtime = (0, react.createContext)(null);
		const EMPTY = /* @__PURE__ */ new Map();
		function BuiltinProvider({ store, t, actions, useSessionStatus, language = "en", children }) {
			const statuses = (useSessionStatus ?? ((selector) => selector(EMPTY)))((snapshot) => snapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Runtime.Provider, {
				value: {
					store,
					t,
					actions,
					statuses,
					statusSource: useSessionStatus ? "runtime" : "none",
					language
				},
				children
			});
		}
		const PREVIEW_NOW = Date.UTC(2026, 9, 20, 10, 24);
		const inert = () => {};
		const PREVIEW_ACTIONS = {
			openSession: inert,
			startSession: inert,
			leave: inert,
			startTask: async () => {},
			pickDirectory: async () => null
		};
		/** Synthetic data only. Never derives from the live store, runtime session catalog or user config. */
		function builtinPreviewData(t) {
			const sessions = [
				0,
				1,
				2
			].map((index) => ({
				id: `sample-${index}`,
				cwd: `sample/${[
					"project",
					"review",
					"plan"
				][index]}`,
				createdAt: PREVIEW_NOW - 72e5,
				firstAt: PREVIEW_NOW - 36e5,
				lastAt: PREVIEW_NOW - index * 6e5,
				turns: 5 - index,
				runMs: 6e5,
				activeMs: 15e5,
				todayMs: 15e5,
				todayTurns: 5 - index,
				clusters: [[PREVIEW_NOW - (index + 1) * 18e5, PREVIEW_NOW - index * 18e5 - 3e5]],
				lastUserText: t("gallery.sample.continue")
			}));
			const totals = {
				activeMs: 45e5,
				runMs: 18e5,
				turns: 12,
				sessions: 3
			};
			return {
				now: PREVIEW_NOW,
				nativePins: {
					ids: [
						"sample-0",
						"sample-1",
						"sample-2"
					],
					archived: [],
					status: "ready"
				},
				ledger: {
					generatedAt: PREVIEW_NOW,
					scannedAt: PREVIEW_NOW,
					scanning: false,
					progress: {
						done: 3,
						total: 3
					},
					sessionCount: 3,
					today: totals,
					week: totals,
					sessions,
					days: Array.from({ length: 14 }, (_, i) => ({
						key: (/* @__PURE__ */ new Date(PREVIEW_NOW - (13 - i) * 864e5)).toISOString().slice(0, 10),
						activeMs: (i % 5 + 1) * 9e5,
						runMs: 6e5,
						turns: i + 1,
						sessions: 2
					}))
				},
				sessions: Object.fromEntries(sessions.map((session, i) => [session.id, {
					id: session.id,
					cwd: session.cwd,
					title: t([
						"gallery.sample.project",
						"gallery.sample.review",
						"gallery.sample.plan"
					][i]),
					running: i === 0,
					updatedAt: session.lastAt
				}])),
				statuses: [
					["sample-0", { running: true }],
					["sample-1", { pendingInteraction: "approval" }],
					["sample-2", { completionUnread: true }]
				]
			};
		}
		/** An isolated runtime shadows any surrounding live provider. No HomeStore is constructed. */
		function BuiltinPreviewProvider({ t, data, language = "en", children }) {
			const runtime = (0, react.useMemo)(() => {
				const sample = data !== null && !Array.isArray(data) && typeof data === "object" ? data : {};
				const hasLedger = sample.ledger !== null && typeof sample.ledger === "object" && !Array.isArray(sample.ledger) && Array.isArray(sample.ledger.sessions) && Array.isArray(sample.ledger.days) && sample.ledger.today !== void 0;
				const state = {
					ledger: hasLedger ? sample.ledger : null,
					layout: emptyLayout(),
					prefs: emptyPrefs(),
					prefsLoaded: false,
					instances: [],
					workbenchLoaded: false,
					workbenchBusy: false,
					storage: {
						writable: false,
						status: "read-only",
						error: null
					},
					sessions: hasLedger && sample.sessions !== null && typeof sample.sessions === "object" && !Array.isArray(sample.sessions) ? sample.sessions : {},
					nativePins: hasLedger && sample.nativePins !== null && typeof sample.nativePins === "object" && !Array.isArray(sample.nativePins) ? sample.nativePins : {
						ids: [],
						archived: [],
						status: "ready"
					},
					actionRevision: 0,
					loading: false,
					refreshing: false,
					error: null,
					lastLoadedAt: null,
					now: typeof sample.now === "number" ? sample.now : PREVIEW_NOW
				};
				const statuses = /* @__PURE__ */ new Map();
				if (hasLedger && Array.isArray(sample.statuses)) {
					for (const entry of sample.statuses) if (Array.isArray(entry) && typeof entry[0] === "string" && entry[1] !== null && typeof entry[1] === "object" && !Array.isArray(entry[1])) statuses.set(entry[0], entry[1]);
				}
				return {
					store: {
						getSnapshot: () => state,
						subscribe: () => inert,
						dismiss: inert
					},
					t,
					actions: PREVIEW_ACTIONS,
					statuses,
					statusSource: hasLedger ? "runtime" : "none",
					language
				};
			}, [
				t,
				data,
				language
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Runtime.Provider, {
				value: runtime,
				children
			});
		}
		function useBuiltin() {
			const runtime = (0, react.useContext)(Runtime);
			if (!runtime) throw new Error("Builtin widget requires its home runtime");
			const state = (0, react.useSyncExternalStore)(runtime.store.subscribe, runtime.store.getSnapshot, runtime.store.getSnapshot);
			return {
				...runtime,
				state
			};
		}
		const BUILTIN_SIZING = {
			pinned: {
				default: {
					w: 4,
					h: 8
				},
				supported: [{
					w: 4,
					h: 8
				}, {
					w: 8,
					h: 8
				}]
			},
			recent: {
				default: {
					w: 8,
					h: 8
				},
				supported: [
					{
						w: 4,
						h: 8
					},
					{
						w: 8,
						h: 8
					},
					{
						w: 8,
						h: 10
					},
					{
						w: 12,
						h: 10
					}
				]
			},
			today: {
				default: {
					w: 8,
					h: 4
				},
				supported: [{
					w: 4,
					h: 4
				}, {
					w: 8,
					h: 4
				}]
			},
			areas: {
				default: {
					w: 4,
					h: 6
				},
				supported: [
					{
						w: 4,
						h: 6
					},
					{
						w: 8,
						h: 6
					},
					{
						w: 8,
						h: 8
					}
				]
			},
			rhythm: {
				default: {
					w: 8,
					h: 4
				},
				supported: [
					{
						w: 4,
						h: 4
					},
					{
						w: 8,
						h: 4
					},
					{
						w: 12,
						h: 6
					}
				]
			}
		};
		function registerBuiltins(registry, t) {
			const disposers = BUILTIN_WIDGETS.map((widget) => {
				function Content({ size, width, height }) {
					const { state, t, actions, statuses, statusSource } = useBuiltin();
					const Body = widget.body;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Body, {
						t,
						data: state.ledger,
						sessions: state.sessions,
						now: state.now,
						actions,
						size,
						width,
						height,
						statuses,
						statusSource,
						loading: state.loading,
						loadError: state.error !== null
					});
				}
				return registry.register({
					typeId: `@vlln/dsh-home:${widget.id}`,
					apiVersion: 1,
					title: () => widget.title(t),
					description: () => t(`gallery.description.${widget.id}`),
					source: "@vlln/dsh-home",
					icon: widget.Glyph,
					preview: { data: builtinPreviewData(t) },
					sizing: BUILTIN_SIZING[widget.id],
					configVersion: 1,
					defaultConfig: () => ({}),
					validateConfig: () => true,
					Content
				});
			});
			disposers.push(registerActivityWidget(registry, t), registerActiveWidget(registry, t), registerPersonalWidgets(registry, t), registerQuickWidget(registry, t), registerSessionStatusWidget(registry, t), registerTodoWidget(registry, t), registerPlanWidget(registry, t), registerCalendarWidget(registry, t), registerHabitWidget(registry, t), registerTimerWidget(registry, t), registerPomodoroWidget(registry, t), registerCountdownWidget(registry, t), registerUsageWidget(registry, t), registerQuoteWidget(registry, t), registerPictureWidget(registry, t), registerBalanceWidget(registry, t));
			return () => {
				for (const off of disposers.reverse()) off();
			};
		}
		/** Real card pixel height for a row span, identical to the board's geometry. */
		function cardHeightForRows(rows) {
			return rows * 44 + (rows - 1) * 12;
		}
		/** Content-box size for a card of `columns × rows` cells. */
		function cardContentSize(columns, rows) {
			return {
				width: Math.max(1, widgetWidthForColumns(columns) - 32),
				height: Math.max(1, cardHeightForRows(rows) - 58)
			};
		}
		/** Card pixel size of a definition's default grid shape. */
		function cardSizeForShape(shape) {
			return {
				width: widgetWidthForColumns(shape.w),
				height: cardHeightForRows(shape.h)
			};
		}
		//#endregion
		//#region src/client/widget-preview.tsx
		/**
		* Previews are the real card, not an illustration.
		*
		* The gallery renders the registered `Content` in the same `.dsh-w-body` the board uses,
		* at the definition's own grid size in pixels, and only then scales it down to fit the
		* tray. Layout therefore sees exactly the width/height a real card would, so container
		* queries, row counts and charts cannot drift from the board.
		*
		* @module @vlln/dsh-home/client/widget-preview
		*/
		/** The registered Content in an inert box. Used by the drag ghost, which draws its own shell. */
		function WidgetContentPreview({ definition, t, language = "en", width, height, size }) {
			const sample = (0, react.useMemo)(() => createWidgetPreviewProps(definition, {
				size: definition.defaults.size,
				width: 0,
				height: 0
			}), [definition]);
			const Content = definition.Content;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				inert: true,
				"aria-hidden": "true",
				"data-widget-content-preview": definition.typeId,
				style: {
					width,
					height
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BuiltinPreviewProvider, {
					t,
					data: sample.preview.data,
					language,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content, {
						...sample,
						size,
						width,
						height
					})
				})
			});
		}
		/** The real body at its default card size, scaled to fit the tray column it is measured in.
		* The gallery draws the same `WidgetFrameHeader` the board uses, so the tile *is* a card:
		* header at 1×, body at the card's own width/height and then a visual scale. */
		function WidgetPreview({ definition, t, language = "en" }) {
			const { width: cardWidth, height: cardHeight } = cardSizeForShape(definition.sizing.default);
			const { width: contentWidth, height: contentHeight } = cardContentSize(definition.sizing.default.w, definition.sizing.default.h);
			const host = (0, react.useRef)(null);
			const [scale, setScale] = (0, react.useState)(1);
			(0, react.useLayoutEffect)(() => {
				const node = host.current;
				if (node === null) return;
				const measure = () => {
					const available = node.clientWidth;
					if (available > 0) setScale(Math.min(1, available / contentWidth));
				};
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(node);
				return () => {
					observer.disconnect();
				};
			}, [contentWidth]);
			const sample = (0, react.useMemo)(() => createWidgetPreviewProps(definition, {
				size: definition.defaults.size,
				width: 0,
				height: 0
			}), [definition]);
			const Content = definition.Content;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: host,
				className: "dsh-card-preview",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-card-preview-frame",
					style: {
						width: contentWidth * scale,
						height: contentHeight * scale
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BuiltinPreviewProvider, {
						t,
						data: sample.preview.data,
						language,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-w-body dsh-home-widget-content dsh-card-preview-body",
							inert: true,
							"aria-hidden": "true",
							"data-widget-content-preview": definition.typeId,
							style: {
								width: contentWidth,
								height: contentHeight,
								transform: scale === 1 ? void 0 : `scale(${scale})`
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content, {
								...sample,
								size: definition.defaults.size,
								width: cardWidth,
								height: cardHeight
							})
						})
					})
				})
			});
		}
		//#endregion
		//#region src/client/widget-frame.tsx
		function WidgetFrameHeader({ title, t, editing, icon, onPointerDown, onNudge, onKeyDelete, gripDisabled, disabled = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-w-head${editing ? " dsh-widget-grip" : ""}`,
				onPointerDown,
				children: [
					icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-widget-symbol",
						"aria-hidden": "true",
						children: icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: "dsh-w-title",
						children: title
					}),
					editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-tools",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-tool dsh-widget-grip",
							disabled: gripDisabled ?? disabled,
							"aria-label": t("edit.drag"),
							title: t("edit.drag"),
							onKeyDown: (event) => {
								if ((event.key === "Delete" || event.key === "Backspace") && onKeyDelete) {
									event.preventDefault();
									onKeyDelete();
									return;
								}
								if (onNudge && event.key.startsWith("Arrow")) {
									event.preventDefault();
									onNudge(event.key);
								}
							},
							children: "⠿"
						})
					})
				]
			});
		}
		function round(value, min, max) {
			return Math.min(Math.round(Math.max(min, max)), Math.max(Math.round(min), Math.round(value)));
		}
		/**
		* Clamp a corner so the whole window stays reachable.
		* @param minTop minimum `y`; the caller passes the host frame clearance so the window
		*   can never hide its title bar under the host chrome.
		*/
		function clampLibraryPosition(position, viewport, size, minTop = 8) {
			return {
				x: round(position.x, 8, viewport.width - size.width - 8),
				y: round(position.y, minTop, viewport.height - size.height - 8)
			};
		}
		/** The window follows the pointer 1:1 from where it was grabbed, then clamps. */
		function libraryPositionFromDrag(start, delta, viewport, size, minTop) {
			return clampLibraryPosition({
				x: start.x + delta.x,
				y: start.y + delta.y
			}, viewport, size, minTop);
		}
		const KEY_STEPS = {
			ArrowLeft: {
				x: -1,
				y: 0
			},
			ArrowRight: {
				x: 1,
				y: 0
			},
			ArrowUp: {
				x: 0,
				y: -1
			},
			ArrowDown: {
				x: 0,
				y: 1
			}
		};
		/** Keyboard parity for the drag. Unknown keys return `null` so the caller ignores them. */
		function libraryPositionFromKey(position, key, viewport, size, minTop, step = 16) {
			const direction = KEY_STEPS[key];
			if (direction === void 0) return null;
			return clampLibraryPosition({
				x: position.x + direction.x * step,
				y: position.y + direction.y * step
			}, viewport, size, minTop);
		}
		//#endregion
		//#region src/client/widget-gallery.tsx
		/** A library of ordinary widget shells: real Content previews and the same title/grip drag affordance. */
		function WidgetGallery({ definitions, t, language, disabled, onDrag, onClose, position, onPositionChange }) {
			const [search, setSearch] = (0, react.useState)(""), [source, setSource] = (0, react.useState)("all");
			const pending = (0, react.useRef)(null);
			const [dragSource, setDragSource] = (0, react.useState)(null);
			const sourceRelease = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				pending.current?.();
				sourceRelease.current?.();
			}, []);
			const panel = (0, react.useRef)(null);
			const placed = (0, react.useRef)(position);
			const [moving, setMoving] = (0, react.useState)(false);
			const endMove = (0, react.useRef)(null);
			const sizeOf = (node) => ({
				width: node.offsetWidth,
				height: node.offsetHeight
			});
			const viewportOf = () => ({
				width: window.innerWidth,
				height: window.innerHeight
			});
			/** The host frame paints over the top of the page; inherited clearance keeps the title bar clear of it. */
			const minTopOf = (node) => {
				const clearance = Number.parseFloat(getComputedStyle(node).getPropertyValue("--dsh-frame-top-clearance"));
				return 8 + (Number.isFinite(clearance) ? Math.max(0, clearance) : 0);
			};
			const apply = (0, react.useCallback)((next) => {
				const node = panel.current;
				if (node === null) return;
				if (next === null) {
					node.style.removeProperty("left");
					node.style.removeProperty("top");
					node.style.removeProperty("right");
					return;
				}
				node.style.left = `${next.x}px`;
				node.style.top = `${next.y}px`;
				node.style.right = "auto";
			}, []);
			const place = (0, react.useCallback)((next) => {
				const node = panel.current;
				const clamped = next === null || node === null ? next : clampLibraryPosition(next, viewportOf(), sizeOf(node), minTopOf(node));
				placed.current = clamped;
				apply(clamped);
				return clamped;
			}, []);
			(0, react.useLayoutEffect)(() => {
				placed.current = position;
				place(position);
			}, [position, place]);
			(0, react.useLayoutEffect)(() => {
				const resize = () => {
					place(placed.current);
				};
				window.addEventListener("resize", resize);
				return () => {
					window.removeEventListener("resize", resize);
					endMove.current?.();
				};
			}, [place]);
			const finishMove = (commit, moved, current) => {
				endMove.current = null;
				setMoving(false);
				if (commit && moved) {
					place(current);
					onPositionChange(current);
				} else apply(placed.current);
			};
			const beginMove = (event) => {
				if (event.button !== 0 || !event.isPrimary) return;
				if (event.target.closest("button:not(.dsh-library-grip)") !== null) return;
				const node = panel.current;
				if (node === null) return;
				event.preventDefault();
				const rect = node.getBoundingClientRect();
				const start = {
					x: rect.left,
					y: rect.top
				}, size = sizeOf(node), origin = {
					x: event.clientX,
					y: event.clientY
				}, minTop = minTopOf(node);
				let current = start, moved = false;
				endMove.current?.();
				setMoving(true);
				const move = (next) => {
					if (next.pointerId !== event.pointerId) return;
					const point = libraryPositionFromDrag(start, {
						x: next.clientX - origin.x,
						y: next.clientY - origin.y
					}, viewportOf(), size, minTop);
					if (point.x !== current.x || point.y !== current.y) moved = true;
					current = point;
					apply(point);
				};
				const up = (next) => {
					if (next.pointerId === event.pointerId) finish(true, moved, current);
				};
				const cancel = (next) => {
					if (next.pointerId === event.pointerId) finish(false, moved, current);
				};
				const finish = (commit, changed, point) => {
					window.removeEventListener("pointermove", move, true);
					window.removeEventListener("pointerup", up, true);
					window.removeEventListener("pointercancel", cancel, true);
					finishMove(commit, changed, point);
				};
				endMove.current = () => {
					finish(false, moved, current);
				};
				window.addEventListener("pointermove", move, true);
				window.addEventListener("pointerup", up, true);
				window.addEventListener("pointercancel", cancel, true);
			};
			const resetPosition = (event) => {
				if (event.target.closest("button:not(.dsh-library-grip)") !== null) return;
				place(null);
				onPositionChange(null);
			};
			const moveByKey = (event) => {
				const node = panel.current;
				if (node === null) return;
				if (event.key === "Home") {
					event.preventDefault();
					event.stopPropagation();
					place(null);
					onPositionChange(null);
					return;
				}
				const rect = node.getBoundingClientRect();
				const next = libraryPositionFromKey(placed.current ?? {
					x: rect.left,
					y: rect.top
				}, event.key, viewportOf(), sizeOf(node), minTopOf(node), event.shiftKey ? 64 : 16);
				if (next === null) return;
				event.preventDefault();
				event.stopPropagation();
				place(next);
				onPositionChange(next);
			};
			const filtered = filterWidgetDefinitions(definitions, search, source);
			const begin = (definition, event) => {
				if (disabled || event.button !== 0 || !event.isPrimary || event.target.closest("button:not(.dsh-widget-grip)")) return;
				event.preventDefault();
				pending.current?.();
				const x = event.clientX, y = event.clientY, pointerId = event.pointerId;
				const node = event.currentTarget.closest(".dsh-directory-item").getBoundingClientRect();
				const grab = {
					x: (x - node.left) / node.width,
					y: Math.min(28, y - node.top)
				};
				const targets = {
					window,
					document,
					documentElement: document.documentElement
				};
				let release = () => {};
				const clear = () => {
					window.removeEventListener("pointermove", move, true);
					release();
					pending.current = null;
				};
				const move = (e) => {
					if (e.pointerId !== pointerId || Math.hypot(e.clientX - x, e.clientY - y) < 5) return;
					clear();
					sourceRelease.current?.();
					sourceRelease.current = observeDragRelease(targets, {
						transport: "pointer",
						pointerId,
						touch: e.pointerType === "touch",
						onRelease: () => setDragSource(null),
						onCancel: () => setDragSource(null)
					});
					(0, react_dom.flushSync)(() => {
						setDragSource(definition.typeId);
						onDrag(definition, {
							x: e.clientX,
							y: e.clientY,
							pointerId,
							touch: e.pointerType === "touch"
						}, grab);
					});
				};
				release = observeDragRelease(targets, {
					transport: "pointer",
					pointerId,
					touch: event.pointerType === "touch",
					onRelease: clear,
					onCancel: clear
				});
				window.addEventListener("pointermove", move, true);
				pending.current = clear;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				ref: panel,
				className: "dsh-library-panel",
				"aria-label": t("gallery.addTab"),
				"data-moving": moving ? "true" : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-library-heading",
						onPointerDown: beginMove,
						onDoubleClick: resetPosition,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tool dsh-library-grip",
								"aria-label": t("library.move"),
								title: t("library.moveHint"),
								onKeyDown: moveByKey,
								children: "⠿"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("gallery.addTab") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								"aria-label": t("library.close"),
								onClick: onClose,
								children: "×"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-gallery-hint",
						children: t("library.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-gallery-toolbar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							type: "search",
							"aria-label": t("gallery.search"),
							placeholder: t("gallery.search"),
							value: search,
							onChange: (event) => setSearch(event.target.value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-gallery-filters",
							role: "group",
							"aria-label": t("gallery.filter"),
							children: [
								"all",
								"builtin",
								"extension"
							].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: source === value ? "outline" : "ghost",
								"aria-pressed": source === value,
								onClick: () => setSource(value),
								children: t(`gallery.${value}`)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-widget-directory",
						children: filtered.map((definition) => {
							const title = galleryText(definition.title, definition.typeId), Icon = definition.icon;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								portal: true,
								side: "left",
								delayMs: 350,
								maxWidth: 300,
								disabled: disabled || dragSource !== null,
								label: `${galleryText(definition.description)}\n${definition.source ?? definition.typeId}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
									className: "dsh-w dsh-directory-item",
									"data-widget-type": definition.typeId,
									onPointerDown: (event) => begin(definition, event),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetFrameHeader, {
										title,
										t,
										editing: true,
										disabled: disabled && dragSource !== definition.typeId,
										icon: Icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 14 }) : void 0
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-library-preview",
										inert: true,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
											fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-empty",
												children: t("error.card")
											}),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPreview, {
												definition,
												t,
												language
											})
										})
									})]
								})
							}, definition.typeId);
						})
					}),
					filtered.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-gallery-empty",
						role: "status",
						children: [t("gallery.noMatch"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							onClick: () => {
								setSearch("");
								setSource("all");
							},
							children: t("gallery.clear")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/canvas-grip.tsx
		/** Width handles for the whole board, mirroring the host Conversation tab: one 10px
		* col-resize strip on each side. Dragging rewrites the board's CSS width directly so
		* the preview follows the pointer frame by frame; only the commit snaps to a whole
		* column (`cols*96 - 12`). Widget pixel sizes never depend on this value. */
		function board(handle) {
			return handle.closest(".dsh-home");
		}
		function applyWidth(handle, width) {
			board(handle)?.style.setProperty("--dsh-home-board-width", `${width}px`);
		}
		/** While the board is wider than the scroll port its edges are off screen; centre the
		* overflow so both margins stay balanced. Fitting boards centre through CSS instead. */
		function centreOverflow(handle) {
			const home = board(handle);
			if (home === null || home.scrollWidth <= home.clientWidth + 1) return;
			home.scrollLeft = Math.max(0, (home.scrollWidth - home.clientWidth) / 2);
		}
		function CanvasWidthHandle({ side, label, hint, value, onCommit }) {
			const gesture = (0, react.useRef)({
				dragging: false,
				base: 0,
				origin: 0,
				raw: 0,
				scroll: 0
			});
			const finish = (0, react.useCallback)((handle, persist) => {
				const state = gesture.current;
				if (!state.dragging) return;
				state.dragging = false;
				handle.toggleAttribute("data-dragging", false);
				delete board(handle)?.dataset.resizing;
				if (persist) return;
				applyWidth(handle, value);
				const home = board(handle);
				if (home !== null) home.scrollLeft = state.scroll;
			}, [value]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-canvas-grip",
				"data-side": side,
				"data-canvas-grip": side,
				role: "separator",
				"aria-orientation": "vertical",
				tabIndex: 0,
				"aria-label": label,
				"aria-valuemin": CANVAS_MIN_WIDTH,
				"aria-valuemax": CANVAS_MAX_WIDTH,
				"aria-valuenow": value,
				title: hint,
				onDoubleClick: () => onCommit(CANVAS_DEFAULT_WIDTH),
				onKeyDown: (event) => {
					const next = canvasWidthFromKey(value, event.key);
					if (next === value) return;
					event.preventDefault();
					event.stopPropagation();
					onCommit(next);
				},
				onPointerDown: (event) => {
					if (event.button !== 0 || !event.isPrimary) return;
					event.preventDefault();
					event.stopPropagation();
					const handle = event.currentTarget;
					event.currentTarget.setPointerCapture(event.pointerId);
					gesture.current = {
						dragging: true,
						base: value,
						origin: event.clientX,
						raw: value,
						scroll: board(handle)?.scrollLeft ?? 0
					};
					handle.toggleAttribute("data-dragging", true);
					const home = board(handle);
					if (home !== null) home.dataset.resizing = "true";
				},
				onPointerMove: (event) => {
					const state = gesture.current;
					if (!state.dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
					const box = event.currentTarget.getBoundingClientRect();
					event.currentTarget.style.setProperty("--dsh-canvas-grip-y", `${event.clientY - box.top}px`);
					state.raw = snapCanvasWidth(canvasWidthFromEdgeDrag(state.base, state.origin, event.clientX, side));
					applyWidth(event.currentTarget, state.raw);
					centreOverflow(event.currentTarget);
				},
				onPointerUp: (event) => {
					const state = gesture.current;
					if (!state.dragging) return;
					const handle = event.currentTarget;
					const moved = event.clientX !== state.origin;
					const committed = moved ? snapCanvasWidth(state.raw) : value;
					finish(handle, true);
					if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
					applyWidth(handle, committed);
					centreOverflow(handle);
					if (moved && committed !== value) onCommit(committed);
				},
				onPointerCancel: (event) => {
					finish(event.currentTarget, false);
				},
				onLostPointerCapture: (event) => {
					finish(event.currentTarget, false);
				}
			});
		}
		//#endregion
		//#region src/client/debris.ts
		/** Deterministic PRNG (mulberry32) so a burst can be replayed in tests. */
		function seededRandom(seed) {
			let state = seed >>> 0;
			return () => {
				state = state + 1831565813 >>> 0;
				let value = state;
				value = Math.imul(value ^ value >>> 15, value | 1);
				value ^= value + Math.imul(value ^ value >>> 7, value | 61);
				return ((value ^ value >>> 14) >>> 0) / 4294967296;
			};
		}
		/**
		* Mostly uniform across the card, with a bias toward its edges so the cloud reads as a
		* rim of dust around the footprint rather than a dot in the middle.
		*/
		function debrisParticles(width, height, random, count = 46) {
			const particles = [];
			for (let index = 0; index < count; index++) {
				const edge = index % 3 === 0;
				const x = edge ? random() < .5 ? random() * width * .18 : width - random() * width * .18 : random() * width;
				const y = edge ? random() < .5 ? random() * height * .18 : height - random() * height * .18 : random() * height;
				const awayX = x - width / 2;
				const awayY = y - height / 2;
				const reach = .35 + random() * .55;
				particles.push({
					x: Math.round(x),
					y: Math.round(y),
					size: 2 + Math.floor(random() * 6),
					dx: Math.round(awayX * reach + (random() - .5) * 26),
					dy: Math.round(awayY * reach * .45 - 6 - random() * 34),
					delay: Math.round(random() * 70),
					duration: 380 + Math.round(random() * 240),
					tone: index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
					opacity: .45 + random() * .4
				});
			}
			return particles;
		}
		/** @param width source card width so the bloom roughly matches its footprint. */
		function debrisPuff(width, height, random, count = 46) {
			return {
				particles: debrisParticles(width, height, random, count),
				halo: Math.round(Math.min(width, height) * .95),
				haloDuration: 420
			};
		}
		/** How long the layer must stay alive: the slowest particle plus a small grace. */
		function debrisLifetime(puff) {
			const slowest = Math.max(0, ...puff.particles.map((particle) => particle.delay + particle.duration));
			return Math.max(slowest, puff.haloDuration) + 140;
		}
		//#endregion
		//#region src/client/debris-burst.ts
		/**
		* Visual half of the delete gesture: the card is gone the moment it is dropped, and a
		* small puff of debris lifts off around its footprint — the same read as deleting an app
		* on a phone, not a picture of the card breaking apart.
		*
		* The layer is imperative and self-cleaning: one absolutely positioned root over the old
		* card rect, a soft halo, a cloud of small translucent particles sampled from the card's
		* own colours, and removal once the last animation lands. Reduced motion deletes silently.
		*/
		const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		/** Sample the card's own material so the dust does not look like generic confetti. */
		function cardTones(node) {
			const style = getComputedStyle(node);
			const label = style.color;
			const border = style.borderTopColor;
			const accent = style.getPropertyValue("--dsh-accent").trim();
			return [
				label,
				border !== "" ? border : label,
				accent !== "" ? accent : label
			].filter((tone) => tone !== "");
		}
		/**
		* @param node card element, still in place (drag position is fine)
		* @returns whether a burst was started; `false` means "reduce motion" or nothing to show
		*/
		function scatterDebris(node, options = {}) {
			const box = node.getBoundingClientRect();
			if (options.reducedMotion ?? prefersReducedMotion()) return false;
			if (!(box.width >= 24 && box.height >= 24) || typeof node.animate !== "function") return false;
			const layer = document.createElement("div");
			layer.className = "dsh-debris";
			layer.setAttribute("aria-hidden", "true");
			layer.style.left = `${box.left}px`;
			layer.style.top = `${box.top}px`;
			layer.style.width = `${box.width}px`;
			layer.style.height = `${box.height}px`;
			document.body.append(layer);
			const random = seededRandom(options.seed ?? Math.floor(performance.now() * 1e3) % 2147483647);
			const puff = debrisPuff(box.width, box.height, random);
			const tones = cardTones(node);
			const animations = [];
			const halo = document.createElement("div");
			halo.className = "dsh-debris-halo";
			halo.style.left = `${Math.round((box.width - puff.halo) / 2)}px`;
			halo.style.top = `${Math.round((box.height - puff.halo) / 2)}px`;
			halo.style.width = `${puff.halo}px`;
			halo.style.height = `${puff.halo}px`;
			halo.style.background = `radial-gradient(circle, ${tones[tones.length - 1]} 0%, transparent 68%)`;
			layer.append(halo);
			animations.push(halo.animate([{
				transform: "scale(.65)",
				opacity: .5
			}, {
				transform: "scale(1.05)",
				opacity: 0
			}], {
				duration: puff.haloDuration,
				easing: "cubic-bezier(.2,.7,.3,1)",
				fill: "forwards"
			}));
			if (tones.length > 0) for (const particle of puff.particles) {
				const element = document.createElement("i");
				element.className = "dsh-debris-particle";
				element.style.left = `${particle.x}px`;
				element.style.top = `${particle.y}px`;
				element.style.width = `${particle.size}px`;
				element.style.height = `${particle.size}px`;
				element.style.background = tones[particle.tone % tones.length];
				layer.append(element);
				animations.push(element.animate([{
					transform: "translate3d(0,0,0) scale(1)",
					opacity: particle.opacity
				}, {
					transform: `translate3d(${particle.dx}px,${particle.dy}px,0) scale(.7)`,
					opacity: 0
				}], {
					duration: particle.duration,
					delay: particle.delay,
					easing: "cubic-bezier(.25,.55,.4,1)",
					fill: "forwards"
				}));
			}
			const remove = () => {
				layer.remove();
			};
			const timer = setTimeout(remove, debrisLifetime(puff) + 240);
			Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
				clearTimeout(timer);
				remove();
			});
			return true;
		}
		//#endregion
		//#region src/client/page.tsx
		/** Registry-driven widget instances. The page owns layout, not widget business logic. */
		/** 已并入「最近活跃」的旧组件：仍照常渲染已有实例，只是不再出现在组件库里。 */
		const RETIRED_FROM_LIBRARY = /* @__PURE__ */ new Set(["@vlln/dsh-home:today", "@vlln/dsh-home:rhythm"]);
		function WidgetBody({ definition, widgetProps }) {
			const viewport = (0, react.useRef)(null);
			const [dimensions, setDimensions] = (0, react.useState)({
				width: 0,
				height: 0
			});
			(0, react.useEffect)(() => {
				const node = viewport.current;
				if (node === null) return;
				const measure = () => {
					const style = getComputedStyle(node);
					const width = Math.max(0, node.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight));
					const height = Math.max(0, node.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom));
					setDimensions((previous) => previous.width === width && previous.height === height ? previous : {
						width,
						height
					});
				};
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(node);
				return () => {
					observer.disconnect();
				};
			}, [widgetProps.instance.instanceId]);
			if (widgetProps.instance.configVersion !== definition.configVersion) throw new Error("Widget config version unavailable");
			const config = validateWidgetConfig(definition, widgetProps.config);
			const Content = definition.Content;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: viewport,
				className: "dsh-widget-viewport",
				children: dimensions.width > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content, {
					...widgetProps,
					...dimensions,
					instance: {
						...widgetProps.instance,
						config
					},
					config
				})
			});
		}
		function WidgetIcon({ definition }) {
			const Icon = definition.icon;
			return Icon === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 14 });
		}
		function boundaryKey(instance, definition) {
			return `${instance.instanceId}:${instance.typeId}:${instance.configVersion}:${definition?.configVersion ?? "missing"}:${JSON.stringify(instance.config)}`;
		}
		function contentProps(instance, rect, boardWidth, cols, editing, visible) {
			return {
				instance,
				config: instance.config,
				size: rect === void 0 ? "m" : sizeFromRect(rect, cols),
				width: rect === void 0 ? boardWidth : widgetWidthForColumns(rect.w),
				height: rect === void 0 ? 212 : rect.h * 44 + (rect.h - 1) * 12,
				editing,
				visible
			};
		}
		function HomePage(props) {
			const { t, store, registry, actions, locale } = props;
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
			const definitions = (0, react.useSyncExternalStore)(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
			const [editing, setEditing] = (0, react.useState)(false);
			const [trayOpen, setTrayOpen] = (0, react.useState)(false);
			const [libraryDrag, setLibraryDrag] = (0, react.useState)(null);
			/** Cards already dropped on the delete target: hidden immediately, persisted after. */
			const [deleting, setDeleting] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [sinceCount, setSinceCount] = (0, react.useState)(null);
			const [saving, setSaving] = (0, react.useState)(false);
			const [saveError, setSaveError] = (0, react.useState)(false);
			const [managementError, setManagementError] = (0, react.useState)(false);
			const [interacting, setInteracting] = (0, react.useState)(false);
			const seenRef = (0, react.useRef)(false);
			const writable = state.workbenchLoaded && state.storage.writable;
			const busy = saving || state.workbenchBusy;
			const editable = editing && writable && !busy;
			(0, react.useEffect)(() => {
				store.refresh();
			}, [store]);
			(0, react.useEffect)(() => {
				homeData.load();
				const onVisible = () => {
					if (document.visibilityState === "visible") homeData.load();
				};
				document.addEventListener("visibilitychange", onVisible);
				window.addEventListener("focus", onVisible);
				return () => {
					document.removeEventListener("visibilitychange", onVisible);
					window.removeEventListener("focus", onVisible);
					homeData.reset();
				};
			}, []);
			(0, react.useEffect)(() => {
				if (seenRef.current || state.ledger === null || !state.prefsLoaded || !writable) return;
				const previous = state.prefs.lastSeenAt;
				if (previous !== null) setSinceCount(state.ledger.sessions.filter((session) => session.parentSessionId === void 0 && session.turns > 0 && session.lastAt > previous).length);
				seenRef.current = true;
				store.markSeen();
			}, [
				state.ledger,
				state.prefs.lastSeenAt,
				state.prefsLoaded,
				writable,
				store
			]);
			const definitionIds = (0, react.useRef)(/* @__PURE__ */ new WeakMap());
			const nextDefinitionId = (0, react.useRef)(0);
			for (const definition of definitions) if (!definitionIds.current.has(definition)) definitionIds.current.set(definition, ++nextDefinitionId.current);
			const renderKey = (instance, definition) => `${boundaryKey(instance, definition)}:${definition === void 0 ? 0 : definitionIds.current.get(definition)}`;
			const byType = (0, react.useMemo)(() => new Map(definitions.map((definition) => [definition.typeId, definition])), [definitions]);
			const metas = (0, react.useMemo)(() => state.instances.map((instance) => {
				const defaults = byType.get(instance.typeId)?.defaults;
				return {
					id: instance.instanceId,
					sizing: byType.get(instance.typeId)?.sizing,
					legacyProjection: legacyInstanceProjection(instance.typeId, instance.instanceId, state.layout, byType.get(instance.typeId)),
					defaultSize: defaults?.size ?? "m",
					defaultHeight: defaults?.height ?? 4,
					...defaults === void 0 ? {} : {
						minWidth: defaults.minWidth,
						maxWidth: defaults.maxWidth,
						minHeight: defaults.minHeight,
						maxHeight: defaults.maxHeight
					}
				};
			}), [
				state.instances,
				state.layout,
				byType
			]);
			const cols = boardColumnsFor(resolveCanvasWidth(state.prefs.canvasWidth));
			const boardWidth = boardWidthForColumns(cols);
			(0, react.useEffect)(() => {
				setLibraryDrag(null);
			}, [cols]);
			(0, react.useEffect)(() => {
				if (!editing || !writable || busy) setLibraryDrag(null);
			}, [
				editing,
				writable,
				busy
			]);
			const geometry = (0, react.useMemo)(() => state.workbenchLoaded ? buildSpatialLayout(state.layout, metas, cols).filter((item) => !deleting.has(item.i)) : [], [
				state.workbenchLoaded,
				state.layout,
				metas,
				cols,
				deleting
			]);
			const instancesById = (0, react.useMemo)(() => new Map(state.instances.map((instance) => [instance.instanceId, instance])), [state.instances]);
			const activeChanged = (0, react.useCallback)((value) => {
				setInteracting(value);
			}, []);
			const commit = (0, react.useCallback)((value) => {
				if (editable) store.setSpatialLayout(value, cols);
			}, [
				editable,
				store,
				cols
			]);
			const finish = (0, react.useCallback)(async () => {
				if (interacting || busy || !writable) return;
				setSaving(true);
				setSaveError(false);
				try {
					store.setSpatialLayout(geometry, cols);
					await store.flushLayout();
					setEditing(false);
					setTrayOpen(false);
				} catch {
					setSaveError(true);
				} finally {
					setSaving(false);
				}
			}, [
				geometry,
				cols,
				interacting,
				busy,
				writable,
				store
			]);
			(0, react.useEffect)(() => {
				const keydown = (event) => {
					if (event.defaultPrevented || event.key !== "Escape" || interacting || busy) return;
					if (trayOpen) {
						event.preventDefault();
						setTrayOpen(false);
						return;
					}
					if (editing) {
						event.preventDefault();
						finish();
					}
				};
				window.addEventListener("keydown", keydown);
				return () => {
					window.removeEventListener("keydown", keydown);
				};
			}, [
				editing,
				finish,
				busy,
				trayOpen,
				interacting
			]);
			const nudge = (id, key) => {
				if (!editable || interacting) return;
				const next = moveSpatialItem(geometry, id, key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0, key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0, cols);
				if (next !== geometry) commit(next);
			};
			const manage = (change) => {
				if (!editable || interacting) return;
				setManagementError(false);
				try {
					change();
				} catch {
					setManagementError(true);
				}
			};
			const homeRef = (0, react.useRef)(null);
			const deleteZoneRef = (0, react.useRef)(null);
			/**
			* Deletion is immediate: the card is hidden in the same frame (so the drag's restore
			* pass never flashes it back), shattered where the user let go, then persisted.
			*/
			const requestDelete = (0, react.useCallback)((instanceId, source) => {
				if (!editable) return;
				setManagementError(false);
				const node = source ?? document.querySelector(`.dsh-home-widget[data-widget-id="${CSS.escape(instanceId)}"]`);
				if (node !== null) scatterDebris(node);
				setDeleting((previous) => {
					const next = new Set(previous);
					next.add(instanceId);
					return next;
				});
				store.removeInstanceDurably(instanceId).catch(() => {
					setManagementError(true);
					setDeleting((previous) => {
						const next = new Set(previous);
						next.delete(instanceId);
						return next;
					});
				});
			}, [editable, store]);
			(0, react.useLayoutEffect)(() => {
				homeRef.current?.style.setProperty("--dsh-home-board-width", `${boardWidth}px`);
			}, [boardWidth]);
			const gripVisible = editable && !interacting;
			const commitCanvasWidth = (next) => {
				store.setCanvasWidth(next);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: homeRef,
				className: "dsh-home",
				"data-editing": editing ? "true" : "false",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-home-inner",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: "dsh-home-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-title-row",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
										className: "dsh-home-title",
										children: t("panel.title")
									}),
									!editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										"aria-label": t("action.refresh"),
										onClick: () => {
											store.refresh();
										},
										children: "↻"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-home-updated",
										children: editing ? t("edit.mode") : state.lastLoadedAt === null ? t("summary.scanning") : t("summary.updated", { time: formatAgo(state.lastLoadedAt, state.now, t) })
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-sub",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatDay(state.now, locale()) }), !editing && sinceCount !== null && sinceCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.since", { count: sinceCount }) })]
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-actions",
								role: "group",
								"aria-label": t("aria.actions"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: editing ? "primary" : "outline",
									size: "sm",
									disabled: !writable || busy || interacting,
									"aria-pressed": editing,
									onClick: () => {
										if (editing) finish();
										else {
											setEditing(true);
											setSaveError(false);
										}
									},
									children: t(saving ? "edit.saving" : editing ? "action.done" : "action.edit")
								}), !editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									onClick: () => {
										actions.startSession();
									},
									children: t("action.newSession")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										actions.leave();
									},
									children: t("action.back")
								})] })]
							})]
						}),
						editable && interacting && libraryDrag === null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							ref: deleteZoneRef,
							className: "dsh-home-delete-zone",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 16 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-home-delete-zone-idle",
									children: t("edit.deleteZone")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-home-delete-zone-armed",
									children: t("edit.deleteZoneArmed")
								})
							]
						}),
						!state.workbenchLoaded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-workbench-notice",
							role: "status",
							children: t("workbench.loading")
						}),
						state.workbenchLoaded && !state.storage.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-workbench-notice",
							role: "alert",
							children: [t("workbench.readOnly"), state.storage.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: state.storage.error.message })]
						}),
						state.storage.status === "write-error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-error",
							role: "alert",
							children: t("workbench.writeError")
						}),
						editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-edit-bar",
							inert: !editable || interacting || void 0,
							role: "region",
							"aria-label": t("edit.mode"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-edit-hint",
								children: t("edit.hint")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-edit-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									"aria-expanded": trayOpen,
									onClick: () => {
										setTrayOpen(!trayOpen);
									},
									children: t("action.widgets")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: libraryDrag !== null || geometry.length === 0,
									title: t("action.compactHint"),
									onClick: () => manage(() => {
										store.compactSpatialLayout(geometry, cols);
									}),
									children: t("action.compact")
								})]
							})]
						}),
						saveError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-error",
							role: "alert",
							children: t("edit.saveError")
						}),
						managementError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-error",
							role: "alert",
							children: t("manager.error")
						}),
						state.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-error",
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("error.load") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									store.refresh();
								},
								children: t("error.retry")
							})]
						}),
						editing && trayOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetGallery, {
							definitions: definitions.filter((definition) => !RETIRED_FROM_LIBRARY.has(definition.typeId)),
							t,
							language: locale(),
							disabled: !writable || busy || interacting,
							position: state.prefs.libraryPosition,
							onPositionChange: (position) => {
								store.setLibraryPosition(position);
							},
							onClose: () => setTrayOpen(false),
							onDrag: (definition, point, grab) => {
								if (!editable || interacting) return;
								try {
									const id = crypto.randomUUID(), item = libraryItem(definition, id, cols, geometry);
									setLibraryDrag({
										id,
										definition,
										item,
										start: {
											x: point.x,
											y: point.y
										},
										grab: {
											x: grab.x * widgetWidthForColumns(item.w),
											y: grab.y
										},
										touch: point.touch,
										pointerId: point.pointerId,
										baseLayout: JSON.stringify(state.layout)
									});
								} catch {
									setManagementError(true);
								}
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-spatial-container",
							"data-layout-surface": "spatial",
							"data-cols": cols,
							children: state.workbenchLoaded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpatialGrid, {
								width: boardWidth,
								cols,
								layout: geometry,
								editing: editable,
								onCommit: commit,
								onActive: activeChanged,
								deleteZone: deleteZoneRef,
								onDeleteRequest: requestDelete,
								libraryDrag,
								onLibraryEnd: () => setLibraryDrag(null),
								onLibraryDrop: (drag, accepted) => {
									try {
										if (registry.get(drag.definition.typeId) !== drag.definition || JSON.stringify(store.getSnapshot().layout) !== drag.baseLayout) throw new Error("Widget or layout changed");
										store.dropInstance(drag.definition, drag.id, accepted, cols);
									} catch {
										setManagementError(true);
									}
								},
								libraryGhost: libraryDrag && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetFrameHeader, {
									title: widgetText(libraryDrag.definition.title, libraryDrag.definition.typeId),
									t,
									editing: true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
									fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-empty",
										children: t("error.card")
									}),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetContentPreview, {
										definition: libraryDrag.definition,
										t,
										language: locale(),
										size: libraryDrag.definition.defaults.size,
										...cardContentSize(libraryDrag.item.w, libraryDrag.item.h)
									})
								})] }),
								children: geometry.map((rect) => {
									const instance = instancesById.get(rect.i);
									if (instance === void 0) return null;
									const definition = byType.get(instance.typeId);
									const title = widgetText(definition?.title, instance.typeId);
									const widgetProps = {
										...contentProps(instance, rect, boardWidth, cols, editing, true),
										...!editing && writable && !busy && definition ? { saveConfig: async (config) => {
											if (registry.get(instance.typeId) !== definition) throw new Error("Widget provider changed");
											await store.saveInstanceConfig(instance.instanceId, definition, config);
										} } : {}
									};
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: "dsh-w dsh-home-widget",
										"data-widget-id": instance.instanceId,
										"data-widget-type": instance.typeId,
										"data-size": widgetProps.size,
										"data-editing": String(editing),
										"aria-label": t("aria.widget", { title }),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetFrameHeader, {
											title,
											t,
											editing,
											disabled: !writable || busy || interacting,
											gripDisabled: !writable || busy,
											icon: definition?.icon !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
												fallback: null,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetIcon, { definition })
											}, definitionIds.current.get(definition)),
											onKeyDelete: () => requestDelete(instance.instanceId),
											onNudge: (key) => nudge(instance.instanceId, key)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-w-body dsh-home-widget-content",
											inert: editing || void 0,
											children: definition === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-empty",
												role: "status",
												children: t("widget.unavailable", { typeId: instance.typeId })
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
												fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "dsh-error",
													role: "alert",
													children: t("error.card")
												}),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetBody, {
													definition,
													widgetProps
												})
											}, renderKey(instance, definition))
										})]
									}, instance.instanceId);
								})
							})
						}),
						state.workbenchLoaded && geometry.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-empty",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("empty.noWidgets") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								disabled: !writable || busy,
								onClick: () => {
									setEditing(true);
									setTrayOpen(true);
								},
								children: t("action.widgets")
							})]
						}),
						editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-muted dsh-edit-footnote",
							children: t("edit.keyboard")
						}),
						gripVisible && ["left", "right"].map((side) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasWidthHandle, {
							side,
							value: boardWidth,
							onCommit: commitCanvasWidth,
							label: t(side === "left" ? "canvas.widthLeft" : "canvas.widthRight"),
							hint: t("canvas.widthHint")
						}, side))
					]
				})
			});
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* 首页的数据与布局状态：一份快照 + 订阅（`useSyncExternalStore` 的契约），
		* 账本 60 秒刷新一次，布局改动 500ms 防抖落盘。
		*
		* 会话标题/运行态来自官方 `ctx.sessions.list`（客户端已缓存的会话目录），
		* 账本只提供「时间」这一层——两者在页面里按 sessionId 合并。
		*
		* @module @vlln/dsh-home/client/store
		*/
		/** 刷新周期：账本是分钟级数据，60 秒足够新。 */
		const REFRESH_MS = 6e4;
		/** 布局落盘防抖。 */
		const SAVE_DEBOUNCE_MS = 500;
		/** 订阅式状态容器。 */
		var HomeStore = class {
			state = {
				ledger: null,
				layout: emptyLayout(),
				prefs: emptyPrefs(),
				prefsLoaded: false,
				instances: [],
				workbenchLoaded: false,
				workbenchBusy: false,
				storage: {
					writable: false,
					status: "read-only",
					error: null
				},
				sessions: {},
				nativePins: {
					ids: [],
					archived: [],
					status: "unavailable"
				},
				actionRevision: 0,
				loading: true,
				refreshing: false,
				error: null,
				lastLoadedAt: null,
				now: Date.now()
			};
			listeners = /* @__PURE__ */ new Set();
			timer = null;
			tick = null;
			/** 账本还在扫描时的补拉定时器（首屏不应停在部分数据上等 60 秒）。 */
			followUp = null;
			layoutTimer = null;
			prefsTimer = null;
			sessionOff = null;
			workspaceOff = null;
			disposed = false;
			writeQueue = Promise.resolve();
			migrationRegistry = null;
			assertEditable() {
				if (!this.state.workbenchLoaded || !this.state.storage.writable || this.state.workbenchBusy) throw new Error(this.state.storage.error?.message ?? "Workbench is not editable");
			}
			canWritePrefs() {
				return !this.disposed && this.state.prefsLoaded && this.state.workbenchLoaded && this.state.storage.writable;
			}
			recordWriteError(error) {
				const diagnostic = error instanceof HomeApiError ? error.storage : void 0;
				const storage = diagnostic?.writable === false || error instanceof HomeApiError && error.code === "state-read-only" ? {
					writable: false,
					status: "read-only",
					error: diagnostic?.error ?? {
						code: "state-read-only",
						message: error instanceof Error ? error.message : String(error)
					}
				} : diagnostic ?? {
					writable: true,
					status: "write-error",
					error: {
						code: error instanceof HomeApiError ? error.code : "write-error",
						message: error instanceof Error ? error.message : String(error)
					}
				};
				if (!storage.writable) {
					if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
					if (this.prefsTimer !== null) clearTimeout(this.prefsTimer);
					this.layoutTimer = null;
					this.prefsTimer = null;
				}
				this.set({ storage });
			}
			/** Serialize complete document writes; a failed write never poisons later retries. */
			persistDocument(layout = this.state.layout, instances = this.state.instances) {
				const document = structuredClone({
					layout,
					instances
				});
				const operation = this.writeQueue.catch(() => {}).then(async () => {
					if (this.disposed) return;
					if (!this.state.storage.writable) throw new HomeApiError(this.state.storage.error?.message ?? "Saved workbench is read-only", "state-read-only", this.state.storage);
					try {
						const saved = await saveWorkbench(document.layout, document.instances);
						if (this.state.storage.status === "write-error") this.set({ storage: saved.storage });
					} catch (error) {
						this.recordWriteError(error);
						throw error;
					}
				});
				this.writeQueue = operation;
				return operation;
			}
			constructor() {
				this.refresh();
				this.loadLayout();
				this.loadPrefs();
				if (typeof window !== "undefined") {
					this.timer = setInterval(() => {
						if (typeof document !== "undefined" && document.hidden) return;
						this.refresh();
					}, REFRESH_MS);
					this.tick = setInterval(() => {
						this.set({ now: Date.now() });
					}, 3e4);
					document.addEventListener("visibilitychange", this.onVisibility);
				}
			}
			onVisibility = () => {
				if (typeof document !== "undefined" && !document.hidden) this.refresh();
			};
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			getSnapshot = () => this.state;
			set(patch) {
				if (this.disposed) return;
				this.state = {
					...this.state,
					...patch
				};
				for (const listener of this.listeners) listener();
			}
			/** Notify consumers when optional navigation capabilities arrive or disappear. */
			notifyActionsChanged() {
				this.set({ actionRevision: this.state.actionRevision + 1 });
			}
			/** 接上官方会话目录（标题 / 运行态 / 空白态）。 */
			attachSessions(list) {
				this.sessionOff?.();
				const sync = () => {
					const snapshot = list.getSnapshot();
					const sessions = {};
					for (const [id, summary] of Object.entries(snapshot?.byId ?? {})) {
						const item = summary;
						sessions[id] = {
							id,
							...typeof item.displayTitle === "string" && item.displayTitle.trim() !== "" ? { title: item.displayTitle } : typeof item.title === "string" ? { title: item.title } : {},
							...typeof item.blank === "boolean" ? { blank: item.blank } : {},
							...typeof item.running === "boolean" ? { running: item.running } : {},
							...typeof item.cwd === "string" ? { cwd: item.cwd } : {},
							...typeof item.updatedAt === "number" ? { updatedAt: item.updatedAt } : {},
							...typeof item.parentId === "string" ? { parentSessionId: item.parentId } : typeof item.parentSessionId === "string" ? { parentSessionId: item.parentSessionId } : {},
							...typeof item.origin === "string" ? { origin: item.origin } : {}
						};
					}
					this.set({ sessions });
				};
				sync();
				this.sessionOff = list.subscribe(sync);
			}
			/** Release the optional catalog when its service scope is unloaded. */
			detachSessions() {
				this.sessionOff?.();
				this.sessionOff = null;
			}
			/** Subscribe to the native global pin registry; Home never owns pin mutations. */
			attachWorkspaces(list) {
				this.workspaceOff?.();
				const sync = () => {
					const snapshot = list.getSnapshot();
					const ids = (values) => [...new Set((values ?? []).filter((id) => typeof id === "string" && id.trim() !== ""))];
					this.set({ nativePins: {
						ids: ids(snapshot.pinnedSessionIds),
						archived: ids(snapshot.archivedSessionIds),
						status: snapshot.state === "error" ? "error" : snapshot.phase === "ready" ? "ready" : "pending"
					} });
				};
				sync();
				this.workspaceOff = list.subscribe(sync);
			}
			detachWorkspaces() {
				this.workspaceOff?.();
				this.workspaceOff = null;
				this.set({ nativePins: {
					ids: [],
					archived: [],
					status: "unavailable"
				} });
			}
			/** 拉一次账本快照。 */
			async refresh() {
				if (this.state.refreshing) return;
				this.set({ refreshing: true });
				try {
					const ledger = await fetchSnapshot();
					if (this.disposed) return;
					this.set({
						ledger,
						loading: false,
						refreshing: false,
						error: null,
						lastLoadedAt: Date.now(),
						now: Date.now()
					});
					if (ledger.scanning || ledger.scannedAt === null) {
						if (this.followUp !== null) clearTimeout(this.followUp);
						this.followUp = setTimeout(() => {
							this.followUp = null;
							this.refresh();
						}, 3e3);
					}
				} catch (error) {
					this.set({
						loading: false,
						refreshing: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			/** 拉首页偏好。 */
			async loadPrefs() {
				try {
					this.set({
						prefs: await fetchPrefs(),
						prefsLoaded: true
					});
				} catch {
					this.set({ prefsLoaded: false });
				}
			}
			/** 记下"这次看到了"，下次进首页就能算"自上次以来"。 */
			markSeen() {
				if (!this.canWritePrefs()) return;
				if (this.state.prefs.lastSeenAt !== null && Date.now() - this.state.prefs.lastSeenAt < 6e4) return;
				this.set({ prefs: {
					...this.state.prefs,
					lastSeenAt: Date.now()
				} });
				this.persistPrefsSoon();
			}
			/** "这条我看过了"：记下时间；会话有新活动后会重新出现。 */
			dismiss(id) {
				if (!this.canWritePrefs()) return;
				this.set({ prefs: {
					...this.state.prefs,
					dismissed: {
						...this.state.prefs.dismissed,
						[id]: Date.now()
					}
				} });
				this.persistPrefsSoon();
			}
			/** One width for the whole board; not a per-widget size and never a layout change. */
			setCanvasWidth(width) {
				if (!this.canWritePrefs()) return;
				if (this.state.prefs.canvasWidth === width) return;
				this.set({ prefs: {
					...this.state.prefs,
					canvasWidth: width
				} });
				this.persistPrefsSoon();
			}
			/** Where the floating widget library was parked; `null` restores its default corner. */
			setLibraryPosition(position) {
				if (!this.canWritePrefs()) return;
				const current = this.state.prefs.libraryPosition;
				if (current === position) return;
				if (current !== null && position !== null && current.x === position.x && current.y === position.y) return;
				this.set({ prefs: {
					...this.state.prefs,
					libraryPosition: position
				} });
				this.persistPrefsSoon();
			}
			persistPrefsSoon() {
				if (!this.canWritePrefs()) return;
				if (this.prefsTimer !== null) clearTimeout(this.prefsTimer);
				this.prefsTimer = setTimeout(() => {
					this.prefsTimer = null;
					if (!this.canWritePrefs()) return;
					savePrefs(this.state.prefs).catch((error) => {
						this.recordWriteError(error);
					});
				}, SAVE_DEBOUNCE_MS);
			}
			/** Load instances and geometry together. Failure never enables a default overwrite. */
			async loadLayout() {
				try {
					const document = await fetchWorkbench();
					this.set({
						layout: document.layout ?? emptyLayout(),
						instances: document.instances,
						storage: document.storage,
						workbenchLoaded: true
					});
					if (this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry);
				} catch (error) {
					this.set({
						workbenchLoaded: true,
						storage: {
							writable: false,
							status: "read-only",
							error: {
								code: "load-error",
								message: error instanceof Error ? error.message : String(error)
							}
						}
					});
				}
			}
			/** Migrate only available definitions; preserve raw instances on any failure. */
			reconcileDefinitions(registry) {
				this.migrationRegistry = registry;
				if (!this.state.workbenchLoaded || !this.state.storage.writable || this.state.workbenchBusy) return;
				let changed = false;
				const instances = this.state.instances.map((instance) => {
					const definition = registry.get(instance.typeId);
					if (!definition || definition.configVersion === instance.configVersion) return instance;
					const result = migrateWidgetInstance(definition, instance);
					if (!result.ok) return instance;
					changed = true;
					return result.instance;
				});
				if (changed) {
					this.set({ instances });
					this.persistSoon();
				}
			}
			addInstance(definition, current, cols) {
				this.assertEditable();
				if (this.state.instances.length >= 64) throw new Error("Workbench instance limit reached");
				const registry = new HomeWidgetRegistry();
				registry.register({
					...definition,
					defaults: definition.sizing ? void 0 : definition.defaults
				}, definition.typeId.startsWith("legacy:") ? { internalLegacyTypeId: true } : void 0);
				const instance = registry.createInstance(definition.typeId, crypto.randomUUID());
				this.insertInstance(instance, registry.get(definition.typeId), current, cols);
			}
			/** Publish one accepted library drop and every displaced peer atomically; no first-fit intermediate. */
			dropInstance(definition, id, accepted, cols) {
				this.assertEditable();
				if (!isGridColumns(cols)) throw new Error("Invalid grid columns");
				if (this.state.instances.length >= 64 || this.state.instances.some((item) => item.instanceId === id)) throw new Error("Invalid new instance");
				const registry = new HomeWidgetRegistry();
				registry.register({
					...definition,
					defaults: definition.sizing ? void 0 : definition.defaults
				}, definition.typeId.startsWith("legacy:") ? { internalLegacyTypeId: true } : void 0);
				const instance = registry.createInstance(definition.typeId, id);
				const visible = this.state.instances.filter((item) => !this.state.layout.hidden.includes(item.instanceId)).map((item) => item.instanceId);
				if (accepted.length !== visible.length + 1 || new Set(accepted.map((item) => item.i)).size !== accepted.length || !accepted.some((item) => item.i === id) || visible.some((key) => !accepted.some((item) => item.i === key))) throw new Error("Stale drop layout");
				for (const item of accepted) if (![
					item.x,
					item.y,
					item.w,
					item.h
				].every(Number.isInteger) || item.x < 0 || item.y < 0 || item.w < 1 || item.h < 3 || item.x + item.w > cols || item.y + item.h > 10003 || !canPlace(accepted, item.i, item, cols)) throw new Error("Invalid drop geometry");
				const active = accepted.find((item) => item.i === id);
				const shape = presetGeometry(registry.get(definition.typeId).sizing.default, cols);
				if (active.w !== shape.w || active.h !== shape.h) throw new Error("Widget preset dimensions required");
				const layout = mergeSpatialPositions(this.state.layout, accepted, cols);
				layout.order = [.../* @__PURE__ */ new Set([...this.state.layout.instanceLayout ? [...this.state.layout.order, ...this.state.instances.map((item) => item.instanceId)] : homeOrder(this.state.layout, this.state.instances.map((item) => item.instanceId)), id])];
				layout.instanceLayout = true;
				this.set({
					instances: [...this.state.instances, instance],
					layout
				});
				this.persistSoon();
			}
			duplicateInstance(id, definition, current, cols) {
				this.assertEditable();
				if (this.state.instances.length >= 64) throw new Error("Workbench instance limit reached");
				const original = this.state.instances.find((instance) => instance.instanceId === id);
				if (!original || original.typeId !== definition.typeId) throw new Error("Unknown widget instance or mismatched definition");
				const instance = {
					...structuredClone(original),
					instanceId: crypto.randomUUID()
				};
				const registry = new HomeWidgetRegistry();
				registry.register({
					...definition,
					defaults: definition.sizing ? void 0 : definition.defaults
				}, definition.typeId.startsWith("legacy:") ? { internalLegacyTypeId: true } : void 0);
				this.insertInstance(instance, registry.get(definition.typeId), current, cols);
			}
			insertInstance(instance, definition, current, cols) {
				const defaults = definition.defaults;
				const meta = {
					id: instance.instanceId,
					sizing: definition.sizing,
					defaultSize: defaults?.size ?? "m",
					defaultHeight: defaults?.height ?? 4,
					minWidth: defaults?.minWidth,
					minHeight: defaults?.minHeight,
					maxWidth: defaults?.maxWidth,
					maxHeight: defaults?.maxHeight
				};
				const layout = mergeSpatialPositions(this.state.layout, current, cols);
				const shape = buildSpatialLayout(emptyLayout(), [meta], cols)[0];
				const rect = shape && findSpatialSpace(current, shape, cols);
				if (!rect) throw new Error("No space available for this widget");
				const next = mergeSpatialPositions(layout, [{
					...shape,
					...rect
				}], cols);
				next.order = [...layout.instanceLayout ? [.../* @__PURE__ */ new Set([...layout.order, ...this.state.instances.map((item) => item.instanceId)])] : homeOrder(layout, this.state.instances.map((item) => item.instanceId)), instance.instanceId];
				next.instanceLayout = true;
				this.set({
					instances: [...this.state.instances, instance],
					layout: next
				});
				this.persistSoon();
			}
			layoutWithoutInstance(id) {
				const layout = structuredClone(this.state.layout);
				layout.order = layout.order.filter((value) => value !== id);
				layout.focusOrder = layout.focusOrder.filter((value) => value !== id);
				layout.hidden = layout.hidden.filter((value) => value !== id);
				delete layout.size[id];
				for (const rows of Object.values(layout.positions ?? {})) delete rows[id];
				return layout;
			}
			removeInstance(id) {
				this.assertEditable();
				this.set({
					layout: this.layoutWithoutInstance(id),
					instances: this.state.instances.filter((instance) => instance.instanceId !== id)
				});
				this.persistSoon();
			}
			/** Confirmation UI closes only after this write succeeds; failure keeps the card/config/layout. */
			async removeInstanceDurably(id) {
				this.assertEditable();
				if (this.disposed) throw new Error("Workbench is disposed");
				if (!this.state.instances.some((instance) => instance.instanceId === id)) throw new Error("Unknown widget instance");
				const layout = this.layoutWithoutInstance(id);
				const instances = this.state.instances.filter((instance) => instance.instanceId !== id);
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				this.layoutTimer = null;
				this.set({ workbenchBusy: true });
				let saved = false;
				try {
					await this.persistDocument(layout, instances);
					this.set({
						layout,
						instances
					});
					saved = true;
				} finally {
					this.set({ workbenchBusy: false });
					if (saved && !this.disposed && this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry);
				}
			}
			async saveInstanceConfig(id, definition, config) {
				this.assertEditable();
				const original = this.state.instances.find((instance) => instance.instanceId === id);
				if (!original || original.typeId !== definition.typeId) throw new Error("Unknown widget instance or mismatched definition");
				const draft = validateWidgetConfig(definition, config);
				const instances = this.state.instances.map((instance) => instance.instanceId === id ? {
					...instance,
					config: draft,
					configVersion: definition.configVersion
				} : instance);
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				this.layoutTimer = null;
				this.set({ workbenchBusy: true });
				try {
					await this.persistDocument(this.state.layout, instances);
					this.set({ instances });
				} finally {
					this.set({ workbenchBusy: false });
					if (!this.disposed && this.migrationRegistry) this.reconcileDefinitions(this.migrationRegistry);
				}
			}
			/** 把 id 移到 target 之前（target 为 undefined = 移到末尾）。 */
			moveBefore(id, target, fallbackOrder) {
				const order = this.ordered(fallbackOrder).filter((item) => item !== id);
				const index = target === void 0 ? order.length : order.indexOf(target);
				order.splice(index < 0 ? order.length : index, 0, id);
				this.set({ layout: {
					...this.state.layout,
					order
				} });
				this.persistSoon();
			}
			/** 按 fallback 顺序 + 用户 order 覆盖得到实际顺序。 */
			ordered(fallbackOrder) {
				const known = new Set(fallbackOrder);
				const kept = this.state.layout.order.filter((id) => known.has(id));
				const rest = fallbackOrder.filter((id) => !kept.includes(id));
				return [...kept, ...rest];
			}
			/** 「三件事」的实际顺序：默认顺序 + 用户覆盖。 */
			orderedFocus(fallbackOrder) {
				const known = new Set(fallbackOrder);
				const kept = this.state.layout.focusOrder.filter((id) => known.has(id));
				const rest = fallbackOrder.filter((id) => !kept.includes(id));
				return [...kept, ...rest];
			}
			/** 把「三件事」里的 id 插到 target 前/后。 */
			moveFocusRelative(id, target, side, fallbackOrder) {
				if (id === target) return;
				const order = this.orderedFocus(fallbackOrder).filter((item) => item !== id);
				const index = order.indexOf(target);
				if (index < 0) return;
				order.splice(side === "before" ? index : index + 1, 0, id);
				this.set({ layout: {
					...this.state.layout,
					focusOrder: order
				} });
				this.persistSoon();
			}
			/** 把 id 插到 target 前/后（拖拽落点用）。 */
			moveRelative(id, target, side, fallbackOrder) {
				if (id === target) return;
				const order = this.ordered(fallbackOrder).filter((item) => item !== id);
				const index = order.indexOf(target);
				if (index < 0) return;
				order.splice(side === "before" ? index : index + 1, 0, id);
				this.set({ layout: {
					...this.state.layout,
					order
				} });
				this.persistSoon();
			}
			/** Unified surface ordering, migrating the legacy two-section layout on first edit. */
			moveHomeRelative(id, target, side, fallback) {
				if (id === target) return;
				const all = homeOrder(this.state.layout, fallback);
				if (!all.includes(id) || !all.includes(target)) return;
				const order = all.filter((item) => item !== id);
				const index = order.indexOf(target);
				order.splice(side === "before" ? index : index + 1, 0, id);
				this.set({ layout: {
					...this.state.layout,
					order
				} });
				this.persistSoon();
			}
			/** Explicit, no-reflow grid preset transaction. Failures have zero publication/write. */
			setWidgetPreset(id, definition, current, cols, preset) {
				this.assertEditable();
				if (this.disposed || !isGridColumns(cols)) throw new Error("Invalid preset request");
				const instance = this.state.instances.find((item) => item.instanceId === id);
				if (!instance || instance.typeId !== definition.typeId || this.state.layout.hidden.includes(id)) throw new Error("Unknown widget");
				if (!this.migrationRegistry || this.migrationRegistry.get(instance.typeId) !== definition) throw new Error("Widget provider changed");
				const metas = this.state.instances.map((item) => {
					const registered = this.migrationRegistry.get(item.typeId);
					return {
						id: item.instanceId,
						sizing: registered?.sizing,
						legacyProjection: legacyInstanceProjection(item.typeId, item.instanceId, this.state.layout, registered),
						defaultSize: registered?.defaults.size ?? "m",
						defaultHeight: registered?.defaults.height ?? 4,
						...registered?.defaults
					};
				});
				const actual = buildSpatialLayout(this.state.layout, metas, cols);
				if (actual.length !== current.length || new Set(current.map((item) => item.i)).size !== current.length || actual.some((item) => !current.some((peer) => peer.i === item.i && peer.x === item.x && peer.y === item.y && peer.w === item.w && peer.h === item.h))) throw new Error("Stale preset geometry");
				for (const item of current) if (!canPlace(current, item.i, item, cols)) throw new Error("Invalid preset peers");
				const next = applyWidgetPreset(current, id, definition.sizing, preset, cols);
				if (next === current) return false;
				this.set({ layout: mergeSpatialPositions(this.state.layout, [next.find((item) => item.i === id)], cols) });
				this.persistSoon();
				return true;
			}
			/** Persist only the active breakpoint, retaining hidden and absent plugin positions. */
			setSpatialLayout(items, cols) {
				this.assertEditable();
				this.set({ layout: mergeSpatialPositions(this.state.layout, items, cols) });
				this.persistSoon();
			}
			/**
			* User-click-only command: pass the current rendered geometry and breakpoint.
			* Page must also block active pointer/library drags, settings and its own save.
			* Read-only/loading/busy/disposed or invalid/stale requests throw atomically.
			* Only visible instance positions at this breakpoint change; config, sizes,
			* order, hidden/absent positions and every other breakpoint remain untouched.
			* Uses the normal debounce; Done/flushLayout still owns durable-write errors.
			*/
			compactSpatialLayout(current, cols) {
				this.assertEditable();
				if (this.disposed) throw new Error("Workbench is disposed");
				const packed = compactSpatialLayout(current, cols);
				const visible = this.state.instances.filter((instance) => !this.state.layout.hidden.includes(instance.instanceId));
				if (current.length !== visible.length || visible.some((instance) => !current.some((item) => item.i === instance.instanceId))) throw new Error("Stale compact layout");
				const saved = this.state.layout.positions?.[String(cols)];
				for (const item of current) if (saved && Object.hasOwn(saved, item.i)) {
					const rect = saved[item.i];
					if (rect.x !== item.x || rect.y !== item.y || rect.w !== item.w || rect.h !== item.h) throw new Error("Stale compact geometry");
				}
				if (packed === current) return false;
				this.set({ layout: mergeSpatialPositions(this.state.layout, packed, cols) });
				this.persistSoon();
				return true;
			}
			/** Restoring one card finds a free slot without moving any existing widgets. */
			toggleSpatialHidden(id, current, metas, cols) {
				this.assertEditable();
				if (!this.state.layout.hidden.includes(id)) {
					this.hide(id);
					return;
				}
				const layout = mergeSpatialPositions(this.state.layout, current, cols);
				const unhidden = {
					...layout,
					hidden: layout.hidden.filter((item) => item !== id)
				};
				const candidate = buildSpatialLayout(unhidden, metas, cols).find((item) => item.i === id);
				if (candidate !== void 0) {
					const saved = layout.positions?.[String(cols)]?.[id];
					const rect = saved !== void 0 && canPlace(current, id, saved, cols) ? saved : findSpatialSpace(current, candidate, cols);
					if (rect !== null) unhidden.positions = {
						...layout.positions,
						[String(cols)]: {
							...layout.positions?.[String(cols)],
							[id]: rect
						}
					};
				}
				this.set({ layout: unhidden });
				this.persistSoon();
			}
			/** Done waits for a durable write; failures leave the editor open for retry. */
			async flushLayout() {
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				this.layoutTimer = null;
				this.assertEditable();
				await this.persistDocument();
			}
			/** 显示/隐藏一张卡（编辑态的小组件清单用）。 */
			toggleHidden(id) {
				const hidden = this.state.layout.hidden;
				const next = hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id];
				this.set({ layout: {
					...this.state.layout,
					hidden: next
				} });
				this.persistSoon();
			}
			setSize(id, size) {
				this.set({ layout: {
					...this.state.layout,
					size: {
						...this.state.layout.size,
						[id]: size
					}
				} });
				this.persistSoon();
			}
			hide(id) {
				this.assertEditable();
				const hidden = this.state.layout.hidden.includes(id) ? this.state.layout.hidden : [...this.state.layout.hidden, id];
				this.set({ layout: {
					...this.state.layout,
					hidden
				} });
				this.persistSoon();
			}
			showAll() {
				this.set({ layout: {
					...this.state.layout,
					hidden: []
				} });
				this.persistSoon();
			}
			persistSoon() {
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				this.layoutTimer = setTimeout(() => {
					this.layoutTimer = null;
					if (this.state.storage.writable) this.persistDocument().catch(() => {});
				}, SAVE_DEBOUNCE_MS);
			}
			dispose() {
				this.disposed = true;
				if (this.timer !== null) clearInterval(this.timer);
				if (this.tick !== null) clearInterval(this.tick);
				if (this.followUp !== null) clearTimeout(this.followUp);
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				if (this.prefsTimer !== null) clearTimeout(this.prefsTimer);
				this.detachSessions();
				this.detachWorkspaces();
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
				this.listeners.clear();
			}
		};
		//#endregion
		//#region src/client/design-system.ts
		const designSystemStyles = `
.dsh-home, .dsh-w {
  /* 唯一强调色：主操作、今天标记、全部数据图形。 */
  --dsh-accent: var(--dsw-alias-state-business-primary);
  --dsh-accent-soft: color-mix(in srgb, var(--dsh-accent) 12%, transparent);
  /* 悬停加深：浅色主题变深、深色主题变亮，始终朝墨色方向走一档。 */
  --dsh-accent-hover: color-mix(in srgb, var(--dsh-accent) 86%, var(--dsw-alias-label-primary));
  /* 注意力与错误：只用于真实状态，不做装饰。 */
  --dsh-warning: var(--dsw-alias-state-warn-primary);
  --dsh-warning-soft: color-mix(in srgb, var(--dsh-warning) 12%, transparent);
  --dsh-danger: var(--dsw-alias-state-error-primary);
  --dsh-danger-soft: color-mix(in srgb, var(--dsh-danger) 12%, transparent);
  /* 成功 / 完成：绿。只用于「做成了」的状态，不做装饰。 */
  --dsh-positive: var(--dsw-alias-state-success-primary);
  --dsh-positive-soft: color-mix(in srgb, var(--dsh-positive) 12%, transparent);
  /* 数据图形：同一色相的四档。 */
  --dsh-ramp-1: color-mix(in srgb, var(--dsh-accent) 18%, var(--dsw-alias-bg-layer-1));
  --dsh-ramp-2: color-mix(in srgb, var(--dsh-accent) 44%, var(--dsw-alias-bg-layer-1));
  --dsh-ramp-3: color-mix(in srgb, var(--dsh-accent) 72%, var(--dsw-alias-bg-layer-1));
  --dsh-ramp-4: var(--dsh-accent);
  /* 轨道 / 空槽：比背景深一档，不用彩色。 */
  --dsh-track: var(--dsw-alias-bg-skeleton);
  /* 工作区胶囊：唯一底色与唯一字色。 */
  --dsh-pill-bg: var(--dsw-alias-interactive-bg-active);
  --dsh-pill-ink: var(--dsw-alias-label-secondary);
  /* 排版与几何。 */
  --dsh-hero-size: 30px;
  --dsh-hero-line: 34px;
  --dsh-radius-pill: 999px;
}

/* 主值：所有卡片同一个字号，不再各卡 26/28/32/36 混用。 */
.dsh-home-widget .dsh-number,
.dsh-home-widget .dsh-activity-number,
.dsh-home-widget .dsh-rhythm-hero,
.dsh-home-widget .dsh-usage-total,
.dsh-home-widget .dsh-balance-amount,
.dsh-home-widget .dsh-countdown-days {
  font-size: var(--dsh-hero-size);
  line-height: var(--dsh-hero-line);
  font-weight: 600;
  letter-spacing: -.03em;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
}

/* 工作区胶囊：统一中性色。颜色不编码目录身份，只有文字说明它是哪个工作区。 */
.dsh-ws-pill {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 38%;
  padding: 1px 8px;
  border-radius: var(--dsh-radius-pill);
  corner-shape: round;
  background: var(--dsh-pill-bg);
  color: var(--dsh-pill-ink);
  font: var(--dsw-font-xxs-strong-12);
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-ws-pill[data-unknown="true"] { background: transparent; box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l3); color: var(--dsw-alias-label-tertiary); }

/* 安静的状态胶囊：选中用墨色，未选中只是浅底；状态含义由文字承担。 */
.dsh-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border: none;
  border-radius: var(--dsh-radius-pill);
  corner-shape: round;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.dsh-chip:hover { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.dsh-chip[data-active="true"] { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary-foreground); }
.dsh-chip:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent)); outline-offset: 1px; }
.dsh-chip[data-tone="warn"] { background: var(--dsh-warning-soft); color: var(--dsh-warning); }
.dsh-chip[data-tone="danger"] { background: var(--dsh-danger-soft); color: var(--dsh-danger); }
.dsh-chip[data-tone="accent"] { background: var(--dsh-accent-soft); color: var(--dsh-accent); }

/* 会话状态筛选：与其它 chip 同一语法；选中态为墨色，状态含义由小圆点承担：
   在跑=绿、在等你=琥珀、未读=蓝。颜色按语义固定，不按组件分配。 */
.dsh-status-chip[data-group="running"] { --dsh-status-color: var(--dsh-positive); }
.dsh-status-chip[data-group="waiting"] { --dsh-status-color: var(--dsh-warning); }
.dsh-status-chip[data-group="done"] { --dsh-status-color: var(--dsh-accent); }
.dsh-status-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; clip-path: circle(50%); background: var(--dsh-status-color, var(--dsw-alias-label-tertiary)); }
.dsh-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--dsh-radius-pill);
  corner-shape: round;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  cursor: pointer;
}
.dsh-status-chip:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.dsh-status-chip:disabled { cursor: default; }
.dsh-status-chip[data-active="true"] { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary-foreground); }
.dsh-status-count { font-variant-numeric: tabular-nums; opacity: .65; }
.dsh-status-chip[data-active="true"] .dsh-status-count { opacity: 1; }

/* 安静的文本下拉：没有边框和底色，只有小字与箭头。 */
.dsh-quiet-select {
  box-sizing: border-box;
  max-width: 100%;
  height: 20px;
  margin: 0;
  padding: 0 14px 0 0;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--dsw-font-family);
  font-size: 11px;
  line-height: 20px;
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 7px) 9px, calc(100% - 3px) 9px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
  transition: color 120ms ease-out;
  text-overflow: ellipsis;
}
.dsh-quiet-select:is(:hover, :focus-visible) { color: var(--dsw-alias-label-secondary); }
.dsh-quiet-select:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent)); outline-offset: 2px; border-radius: var(--dsw-radius-xs); }
.dsh-quiet-select:disabled { opacity: .7; cursor: default; }

/* 悬停提示：跟随指针的小气泡，Portal 到 body，不被卡片裁剪。 */
.dsh-hover-tip {
  position: fixed;
  z-index: 1000;
  max-width: 240px;
  padding: 4px 8px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary-foreground);
  font: var(--dsw-font-xxxs-11);
  line-height: 16px;
  pointer-events: none;
  box-shadow: var(--dsw-shadow-lv2);
}

/* 数据轨道：所有条形图共用同一条中性轨道。 */
.dsh-track { background: var(--dsh-track); border-radius: var(--dsh-radius-xs); overflow: hidden; }
.dsh-track > span { display: block; height: 100%; border-radius: inherit; background: var(--dsh-accent); }

@media (prefers-reduced-motion: reduce) {
  .dsh-quiet-select { transition: none; }
}
`;
		//#endregion
		//#region src/client/activity-styles.ts
		const activityStyles = `
.dsh-activity { --dsh-activity-cell-size:16px; display:flex; flex-direction:column; gap:8px; min-width:0; height:100%; min-height:0; }
/* Align text to the chart only for the centred three-block layout. A narrow chart
   must not squeeze its summary/legend into wrapped lines that overflow the card. */
.dsh-activity-summary, .dsh-activity-caption { flex:none; width:100%; max-width:100%; box-sizing:border-box; margin-inline:auto; }
.dsh-activity[data-activity-layout="blocks"] :is(.dsh-activity-summary, .dsh-activity-caption) { width:var(--dsh-activity-chart-width); }
.dsh-activity-summary { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 16px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xs-13); }
.dsh-activity-primary { display:flex; align-items:baseline; gap:6px; }
.dsh-activity-number { color:var(--dsw-alias-label-primary); }
.dsh-activity-secondary { display:flex; flex-wrap:wrap; gap:4px 12px; }
.dsh-activity-secondary > span + span { padding-inline-start:12px; border-inline-start:.5px solid var(--dsw-alias-border-l2); }
/* Both axes use the same bounded cell size. Auto adds natural weeks as width
   grows; only explicit year (or exceptionally tiny cards) needs local scrolling. */
/* 卡片装不下时先缩格子：竖向与横向都不出现滚动条（一年用 2px 点阵兜底）。 */
.dsh-activity-scroll { flex:1 1 auto; min-height:0; overflow:hidden; max-width:100%; padding:3px; border-radius:var(--dsw-radius-xs); scroll-padding-inline:3px; }
.dsh-activity-scroll:focus-visible { outline:2px solid var(--dsh-accent); outline-offset:-2px; }
.dsh-activity-grid { display:grid; gap:var(--dsh-activity-gap,3px); width:max-content; margin-inline:auto; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,3px); min-width:0; }
.dsh-activity-blocks { display:flex; align-items:start; gap:24px; width:max-content; margin-inline:auto; }
.dsh-activity-block { display:flex; flex-direction:column; gap:6px; }
.dsh-activity-block-label { font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
.dsh-activity-weekdays, .dsh-activity-block-days { display:grid; grid-template-columns:repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,3px); }
.dsh-activity-weekdays { text-align:center; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-caption { display:flex; align-items:center; flex-wrap:wrap; gap:2px 12px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
.dsh-activity-range { flex:none; }
.dsh-activity-legend { margin-inline-start:auto; }
.dsh-activity-month { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); overflow:visible; }
.dsh-activity-cell { display:block; flex:none; width:var(--dsh-activity-cell-size); height:var(--dsh-activity-cell-size); aspect-ratio:1; padding:0; border:0; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-module-platform); }
button.dsh-activity-cell { cursor:pointer; transition:box-shadow 120ms ease-out; }
.dsh-activity-cell[data-level="1"] { background:color-mix(in srgb, var(--dsh-accent) 22%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="2"] { background:color-mix(in srgb, var(--dsh-accent) 44%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="3"] { background:color-mix(in srgb, var(--dsh-accent) 70%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="4"] { background:var(--dsh-accent); }
.dsh-activity-cell[data-unknown="true"] { background:transparent; outline:1px dashed var(--dsw-alias-border-l3); outline-offset:-1px; }
.dsh-activity-cell[data-selected="true"], button.dsh-activity-cell:focus-visible { outline:2px solid var(--dsw-alias-label-primary); outline-offset:1px; }
button.dsh-activity-cell:is(:hover,:focus-visible) { box-shadow:0 0 0 1px var(--dsw-alias-label-secondary); }
.dsh-activity-spacer { visibility:hidden; }
.dsh-activity-filters { display:flex; align-items:center; gap:10px; min-width:0; flex-wrap:wrap; flex:none; margin-inline-start:auto; }
.dsh-activity-filters .dsh-quiet-select { max-width:160px; }
.dsh-activity-legend { display:flex; align-items:center; justify-content:flex-start; gap:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-legend .dsh-activity-cell { width:12px; height:12px; }
.dsh-activity > .dsh-muted { margin:0; overflow-wrap:anywhere; }
.dsh-activity-detail { display:flex; flex-direction:column; gap:6px; height:100%; min-height:0; padding:2px; font:var(--dsw-font-xs-13); }
.dsh-activity-detail-head { flex:none; display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.dsh-activity-detail-head strong { color:var(--dsw-alias-label-primary); font-weight:600; }
.dsh-activity-back { flex:none; }
.dsh-activity-days { flex:1 1 auto; min-height:0; overflow:hidden; }
.dsh-settings-field { display:flex; flex-direction:column; gap:6px; font:var(--dsw-font-xs-13); }
.dsh-settings-field select { max-width:100%; padding:8px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-primary); background:var(--dsw-specific-input-major); font:inherit; }
@media (prefers-reduced-motion: reduce) { button.dsh-activity-cell { transition:none; } }
`;
		//#endregion
		//#region src/client/personal-styles.ts
		/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
		const personalStyles = `
.dsh-personal-clock{min-width:0;max-width:100%;color:var(--dsw-alias-label-primary)}
/* 便笺：直接写在卡片上。首行是标题（加粗），其余是正文；没有弹窗、没有引号装饰。 */
.dsh-note{display:flex;flex-direction:column;gap:6px;min-width:0;min-height:100%;color:var(--dsw-alias-label-primary)}
.dsh-note[data-editable="true"]{cursor:text}
.dsh-note[data-editable="true"]:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsh-accent));outline-offset:2px;border-radius:var(--dsw-radius-sm)}
.dsh-note-title{margin:0;font:var(--dsw-font-s-strong-14);font-weight:600;font-size:15px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.dsh-note-title[data-placeholder="true"]{font-weight:400;color:var(--dsw-alias-label-tertiary)}
.dsh-note-body{margin:0;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;color:var(--dsw-alias-label-secondary)}
.dsh-note[data-editing="true"]{height:100%}
.dsh-note-input{flex:1 1 auto;box-sizing:border-box;width:100%;min-height:100%;margin:0;padding:0;border:0;outline:none;resize:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-note-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-note-error{margin:0;color:var(--dsh-danger);font:var(--dsw-font-xxs-12)}
.dsh-personal-label{margin:0;font:var(--dsw-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-hint{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere}
/* 时钟：大号时间 + 日期牌 + 一行时区选择。没有标题、没有整行日期、没有设置弹窗，
   4×4 的卡片里也不再需要滚动。 */
.dsh-personal-clock{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:8px;height:100%;min-height:0;color:var(--dsw-alias-label-primary)}
.dsh-personal-clock-display{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dsh-personal-clock-time{display:block;min-width:0;max-width:100%;font-family:var(--dsw-font-family);font-size:clamp(34px,16cqi,58px);font-weight:600;line-height:1;letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-personal-clock-time [data-part="literal"]{letter-spacing:-.08em}
.dsh-personal-clock-time [data-part="dayPeriod"]{font-size:.26em;font-weight:500;letter-spacing:0}
.dsh-personal-clock-date{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:0 0 52px;min-height:58px;max-width:70px;margin:0;padding:6px 4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.dsh-personal-clock-day{font-family:var(--dsw-font-family);font-size:24px;font-weight:600;line-height:1;letter-spacing:-.04em}
.dsh-personal-clock-month{max-width:100%;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);text-align:center;overflow-wrap:anywhere}
.dsh-personal-clock-zone{display:flex;min-width:0}
@container widget (max-width:260px){
  .dsh-personal-clock-display{gap:8px}
  .dsh-personal-clock-time{font-size:clamp(28px,17cqi,44px)}
  .dsh-personal-clock-date{flex-basis:44px;min-height:52px;padding:5px 3px}
  .dsh-personal-clock-day{font-size:21px}
}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:is(:hover,:focus-visible){border-color:var(--dsw-alias-border-l3)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--dsh-accent);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-error{margin:0;color:var(--dsh-danger);font:var(--dsw-font-xs-13)}
`;
		//#endregion
		//#region src/client/planner-styles.ts
		/**
		* 计划 / 计时 / 用量 / 装饰类组件的样式。
		*
		* 设计约束（对齐宿主既有卡片）：
		* - 只用 `--dsw-alias-*` token；柔和底色一律用 `color-mix(... 10–14%, transparent)` 派生，
		*   不出现大块实心填充（日历选中、勾选、打点都是「浅底 + 亮字」）。
		* - 数字用 26–32px / 600 / tabular-nums；说明文字 11px；卡片内边距 10–12px。
		* - 图表：环（conic-gradient + 内圆遮罩）、甜甜圈、圆角柱、胶囊 chip。
		*/
		const plannerStyles = `
/* ---------- 共用 ---------- */
/* 颜色、字号与共用小部件（胶囊 / chip / quiet select / 悬停气泡）只在 design-system.ts
   定义；本模块只写排版与状态，不再声明第二套色板。 */
.dsh-chip b { color:inherit; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-chip-dot { width:6px; height:6px; border-radius:50%; clip-path:circle(50%); background:var(--dsh-part, currentColor); flex:none; }
.dsh-muted { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsh-muted b { color:var(--dsw-alias-label-secondary); font-weight:600; font-variant-numeric:tabular-nums; }

/* 环：conic-gradient 画进度，内圆用底色遮出圆环。 */
.dsh-ring { --ring-size:132px; position:relative; width:var(--ring-size); height:var(--ring-size); flex:none; display:grid; place-items:center; }
.dsh-ring-svg { position:absolute; inset:0; width:100%; height:100%; }
.dsh-ring-track { fill:none; stroke:var(--dsh-accent-soft); stroke-width:14; }
.dsh-ring-progress { fill:none; stroke:var(--dsh-accent); stroke-width:14; stroke-linecap:round; transition:stroke-dasharray .4s ease; }
/* 休息阶段用成功绿：它表示「这一轮完成了，现在休息」，不是一个新色相。 */
.dsh-pomodoro[data-phase="break"] .dsh-ring-track { stroke:var(--dsh-positive-soft); }
.dsh-pomodoro[data-phase="break"] .dsh-ring-progress { stroke:var(--dsh-positive); }
.dsh-ring-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
.dsh-ring-value { color:var(--dsw-alias-label-primary); font-size:22px; font-weight:600; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.dsh-ring-caption { color:var(--dsw-alias-label-tertiary); font-size:10px; }
.dsh-ring[data-running="true"] .dsh-ring-value { color:var(--dsh-accent); }

/* ---------- 待办 ---------- */
.dsh-todo { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-todo-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:10px; padding-inline-end:2px; scrollbar-width:thin; }
.dsh-todo-group { display:flex; flex-direction:column; gap:2px; }
.dsh-todo-heading { display:flex; align-items:center; gap:6px; margin:0; padding:0 2px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:14px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
.dsh-todo-count { color:var(--dsw-alias-label-caption); font-variant-numeric:tabular-nums; font-weight:500; letter-spacing:0; }
.dsh-todo-list { display:flex; flex-direction:column; gap:1px; margin:0; padding:0; list-style:none; }
.dsh-todo-item { display:flex; align-items:flex-start; gap:8px; padding:3px 6px; border-radius:8px; }
.dsh-todo-item:hover { background:var(--dsw-alias-bg-skeleton); }
.dsh-todo-check { flex:none; width:17px; height:17px; margin-top:2px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:1.5px solid var(--dsw-alias-border-l4); border-radius:5px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary-foreground); cursor:pointer; transition:background .12s ease, border-color .12s ease; }
.dsh-todo-check:hover { border-color:var(--dsh-accent); }
.dsh-todo-check[aria-checked="true"] { border-color:var(--dsh-accent); background:var(--dsh-accent); }
.dsh-todo-check:disabled { cursor:default; opacity:.55; }
.dsh-todo-tick { width:7px; height:4px; border-left:1.6px solid currentColor; border-bottom:1.6px solid currentColor; transform:rotate(-45deg) translateY(-1px); opacity:0; }
.dsh-todo-check[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-todo-main { flex:1 1 auto; min-width:0; display:flex; align-items:baseline; gap:8px; padding:0; border:0; background:transparent; text-align:start; cursor:pointer; color:var(--dsw-alias-label-primary); font-size:13px; line-height:20px; }
.dsh-todo-main:disabled { cursor:default; }
.dsh-todo-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-todo-item[data-done="true"] .dsh-todo-title { color:var(--dsw-alias-label-caption); text-decoration:line-through; }
.dsh-todo-meta { flex:none; display:inline-flex; align-items:baseline; gap:6px; font-size:11px; line-height:16px; color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
.dsh-todo-day { color:var(--dsw-alias-label-caption); }
.dsh-todo-empty { margin:4px 2px; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-todo-add { flex:none; display:flex; align-items:center; gap:6px; padding-top:6px; border-top:0; }
.dsh-todo-add input { flex:1 1 auto; min-width:0; height:30px; padding:0 11px; border:1.5px solid transparent; border-radius:9px; background:var(--dsw-alias-bg-skeleton); color:var(--dsw-alias-label-primary); font-size:12px; }
.dsh-todo-add input::placeholder { color:var(--dsw-alias-label-caption); }
.dsh-todo-add input:focus { outline:none; border-color:var(--dsh-accent); background:var(--dsw-alias-bg-layer-1); }
.dsh-todo-add-button { flex:none; width:30px; height:30px; padding:0; border:0; border-radius:9px; background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); font-size:16px; line-height:1; cursor:pointer; }
.dsh-todo-add-button:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover); }
.dsh-todo-add-button:disabled { opacity:.45; cursor:default; }

/* ---------- 今日计划 ---------- */
.dsh-plan, .dsh-calendar, .dsh-habit { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-plan-scroll, .dsh-habit-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:10px; scrollbar-width:thin; }
.dsh-plan-list { display:flex; flex-direction:column; gap:2px; margin:0; padding:0; list-style:none; }
.dsh-plan-block { display:flex; align-items:flex-start; gap:10px; padding:2px 0; }
.dsh-plan-time { flex:0 0 78px; padding-top:3px; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:18px; font-variant-numeric:tabular-nums; }
.dsh-plan-block .dsh-todo-list { flex:1 1 auto; min-width:0; }
.dsh-plan-block[data-done="true"] .dsh-plan-time { color:var(--dsw-alias-label-caption); }
.dsh-plan-rule { display:none; }
.dsh-plan-now { display:flex; align-items:center; gap:10px; padding:2px 0; }
.dsh-plan-now-time { flex:0 0 78px; color:var(--dsh-accent); font-size:11px; line-height:14px; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-plan-now-rule { flex:1 1 auto; height:2px; border-radius:1px; background:var(--dsh-accent); }
.dsh-plan-now-rule::before { content:''; display:block; width:7px; height:7px; margin-top:-2.5px; clip-path:circle(50%); border-radius:50%; background:var(--dsh-accent); }
.dsh-plan-hint { margin:0 2px; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-plan-add { flex:none; align-self:flex-start; display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border:0; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); font-size:11px; line-height:18px; font-weight:600; cursor:pointer; }
.dsh-plan-add:hover { background:var(--dsh-accent-soft); color:var(--dsh-accent); }

/* ---------- 日程 ---------- */
.dsh-calendar-head { flex:none; display:flex; align-items:center; gap:6px; }
.dsh-calendar-title { flex:1 1 auto; min-width:0; color:var(--dsw-alias-label-primary); font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-calendar-nav { flex:none; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); font-size:15px; line-height:1; cursor:pointer; }
.dsh-calendar-nav:hover { background:var(--dsw-alias-bg-skeleton); color:var(--dsw-alias-label-primary); }
.dsh-calendar-today { flex:none; padding:3px 10px; border:0; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); font-size:11px; line-height:16px; font-weight:600; cursor:pointer; }
.dsh-calendar-today:hover { background:var(--dsh-accent-soft); color:var(--dsh-accent); }
.dsh-calendar-weekdays { flex:none; display:grid; grid-template-columns:repeat(7,1fr); gap:2px; color:var(--dsw-alias-label-caption); font-size:10px; line-height:14px; text-align:center; }
.dsh-calendar-grid { flex:none; display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); gap:2px; }
.dsh-calendar-cell { position:relative; display:flex; align-items:center; justify-content:center; min-height:28px; padding:0; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-secondary); font-size:11px; font-variant-numeric:tabular-nums; cursor:pointer; transition:background .12s ease, color .12s ease; }
.dsh-calendar-date { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; clip-path:circle(50%); }
.dsh-calendar-cell:hover .dsh-calendar-date { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-calendar-cell[data-outside="true"] { color:var(--dsw-alias-label-caption); }
.dsh-calendar-cell[data-today="true"] { color:var(--dsh-accent); font-weight:700; }
.dsh-calendar-cell[data-today="true"] .dsh-calendar-date { background:var(--dsh-accent-soft); }
.dsh-calendar-cell[data-selected="true"] { color:var(--dsw-alias-label-primary-foreground); font-weight:700; }
.dsh-calendar-cell[data-selected="true"] .dsh-calendar-date { background:var(--dsh-accent); }
.dsh-calendar-dot { position:absolute; bottom:2px; left:50%; width:4px; height:4px; clip-path:circle(50%); margin-left:-2px; border-radius:50%; background:var(--dsh-accent); }
.dsh-calendar-cell[data-selected="true"] .dsh-calendar-dot { display:none; }
.dsh-calendar-day { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:2px; padding-top:6px; border-top:0; }
.dsh-calendar-day-head { flex:none; display:flex; align-items:baseline; gap:6px; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:16px; }
.dsh-calendar-list { flex:1 1 auto; min-height:0; overflow:auto; scrollbar-width:thin; }

/* ---------- 打卡 ---------- */
.dsh-habit-list { display:flex; flex-direction:column; gap:2px; margin:0; padding:0; list-style:none; }
.dsh-habit-row { display:flex; align-items:center; gap:10px; padding:5px 6px; border-radius:10px; }
.dsh-habit-row:hover { background:var(--dsw-alias-bg-skeleton); }
.dsh-habit-row[data-due="false"] { opacity:.55; }
.dsh-habit-mark { flex:none; width:24px; height:24px; clip-path:circle(50%); padding:0; display:inline-flex; align-items:center; justify-content:center; border:2px solid var(--dsw-alias-border-l4); border-radius:50%; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary-foreground); cursor:pointer; transition:background .12s ease, border-color .12s ease; }
.dsh-habit-mark:hover { border-color:color-mix(in srgb, var(--dsh-positive) 55%, transparent); }
.dsh-habit-mark[aria-checked="true"] { border-color:var(--dsh-positive); background:var(--dsh-positive); }
.dsh-habit-mark .dsh-todo-tick { opacity:0; }
.dsh-habit-mark[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-habit-text { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
.dsh-habit-title { color:var(--dsw-alias-label-primary); font-size:13px; line-height:18px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-row[data-marked="true"] .dsh-habit-title { color:var(--dsw-alias-label-tertiary); }
.dsh-habit-meta { color:var(--dsw-alias-label-caption); font-size:10px; line-height:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-streak { flex:none; padding:1px 8px; border-radius:999px; background:var(--dsw-alias-interactive-bg-active); color:var(--dsw-alias-label-secondary); font-size:10px; line-height:16px; font-variant-numeric:tabular-nums; }
.dsh-habit-streak[data-zero="true"] { background:transparent; color:var(--dsw-alias-label-caption); }
.dsh-habit-streak[data-zero="false"] { background:var(--dsh-positive-soft); color:var(--dsh-positive); }
.dsh-habit-delete { flex:none; width:18px; height:18px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-caption); font-size:14px; line-height:1; cursor:pointer; opacity:0; }
.dsh-habit-row:hover .dsh-habit-delete, .dsh-habit-delete:focus-visible { opacity:1; }
.dsh-habit-delete:hover { color:var(--dsh-danger); }

/* ---------- 计时器 ---------- */
.dsh-timer-wrap, .dsh-countdown-wrap, .dsh-picture-wrap, .dsh-quote-wrap { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-timer { position:relative; flex:1 1 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:100%; min-height:0; }
/* 右侧快捷键：点一下就是 5 / 10 / 15 / 25 / 45 / 60 分钟。 */
.dsh-timer-presets { position:absolute; right:0; top:50%; transform:translateY(-50%); display:grid; grid-template-columns:repeat(2,auto); gap:3px; }
.dsh-timer-preset { min-width:32px; height:20px; padding:0 6px; border:0; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); font:inherit; font-size:10px; font-weight:600; line-height:20px; cursor:pointer; font-variant-numeric:tabular-nums; }
.dsh-timer-preset:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-active); color:var(--dsw-alias-label-primary); }
.dsh-timer-preset:disabled { opacity:.4; cursor:default; }
.dsh-timer-preset[data-active="true"] { background:var(--dsw-alias-label-primary); color:var(--dsw-alias-label-primary-foreground); }
/* 圆盘就是设置器：拖动圆环设定时长，中间是倒计时数字。 */
.dsh-timer-dial { position:relative; flex:none; height:min(120px, calc(100% - 40px)); aspect-ratio:1; max-width:100%; border-radius:50%; touch-action:none; user-select:none; }
.dsh-timer-dial[data-draggable="true"] { cursor:grab; }
.dsh-timer-dial[data-draggable="true"]:active { cursor:grabbing; }
.dsh-timer-dial:focus-visible { outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsh-accent)); outline-offset:3px; }
.dsh-timer-dial svg { display:block; width:100%; height:100%; overflow:visible; }
.dsh-dial-track { fill:none; stroke:var(--dsw-alias-bg-skeleton); stroke-width:7; }
.dsh-dial-arc { fill:none; stroke:var(--dsh-accent); stroke-width:7; stroke-linecap:round; transition:stroke-dasharray 220ms linear; }
.dsh-timer[data-reached="true"] .dsh-dial-arc { stroke:var(--dsh-warning); }
.dsh-dial-handle { fill:var(--dsw-alias-label-primary-foreground); stroke:var(--dsh-accent); stroke-width:2.4; }
.dsh-timer[data-reached="true"] .dsh-dial-handle { stroke:var(--dsh-warning); }
.dsh-timer-face { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; pointer-events:none; }
.dsh-dial-value { color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family); font-size:22px; font-weight:650; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.dsh-dial-note { color:var(--dsh-warning); font-size:10px; line-height:12px; font-weight:600; }
.dsh-timer-alert { position:absolute; left:0; top:0; padding:1px 6px; border-radius:var(--dsw-radius-xs); background:var(--dsh-warning-soft); color:var(--dsh-warning); font-size:10px; line-height:16px; font-weight:600; cursor:help; }
.dsh-timer-actions { display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; flex:none; }
.dsh-timer-button { padding:4px 12px; border:0; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); font-size:11px; line-height:18px; font-weight:600; cursor:pointer; }
.dsh-timer-button:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-active); color:var(--dsw-alias-label-primary); }
.dsh-timer-button:disabled { opacity:.45; cursor:default; }
.dsh-timer-primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
.dsh-timer-primary:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover); color:var(--dsw-alias-label-primary-foreground); }


/* ---------- 番茄钟 ---------- */
.dsh-pomodoro { display:flex; flex-direction:column; align-items:center; gap:10px; height:100%; min-height:0; padding-top:2px; }
.dsh-pomodoro-head { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dsh-pomodoro-rounds { color:var(--dsw-alias-label-tertiary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-pomodoro .dsh-timer-actions { justify-content:center; }

/* ---------- 倒计时 ---------- */
.dsh-countdown { display:flex; flex-direction:column; gap:6px; flex:1 1 auto; min-height:0; justify-content:center; }
.dsh-countdown-title { color:var(--dsw-alias-label-secondary); font-size:12px; line-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-countdown-clock { display:flex; align-items:baseline; gap:6px; color:var(--dsw-alias-label-primary); font-variant-numeric:tabular-nums; }
.dsh-countdown-days { letter-spacing:-.02em; }
.dsh-countdown-unit { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsh-countdown-rest { color:var(--dsw-alias-label-tertiary); font-size:13px; font-variant-numeric:tabular-nums; }
.dsh-countdown-date { color:var(--dsw-alias-label-caption); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-countdown-expired { color:var(--dsh-warning); font-size:22px; font-weight:600; }
.dsh-countdown-hint { color:var(--dsw-alias-label-caption); font-size:11px; }
.dsh-countdown-row { display:flex; align-items:flex-end; gap:6px; }
.dsh-countdown-row .dsh-item-field:first-child { flex:1 1 auto; }
.dsh-countdown-row .dsh-item-field:nth-child(2) { flex:0 0 130px; }

/* ---------- Token 用量 ---------- */
.dsh-usage { display:flex; flex-direction:column; gap:8px; height:100%; min-height:0; overflow:hidden; }
.dsh-usage-hero { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.dsh-usage-figure { display:flex; flex-direction:column; gap:0; min-width:0; }
.dsh-usage-total { color:var(--dsw-alias-label-primary); }
.dsh-usage-unit { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsh-usage-donut { position:relative; width:58px; height:58px; border-radius:50%; clip-path:circle(50%); flex:none; }
.dsh-usage-donut-hole { position:absolute; inset:14px; border-radius:50%; clip-path:circle(50%); background:var(--dsw-alias-bg-layer-1); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; }
.dsh-usage-donut-hole b { color:var(--dsw-alias-label-primary); font-size:11px; line-height:14px; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-usage-donut-hole i { color:var(--dsw-alias-label-caption); font-size:7px; line-height:9px; letter-spacing:.02em; font-style:normal; }
.dsh-usage-chips { display:flex; flex-wrap:wrap; gap:4px; }
.dsh-usage-bars { display:flex; align-items:flex-end; gap:4px; flex:0 0 44px; margin-top:auto; }
.dsh-usage-col { flex:1 1 0; display:flex; align-items:flex-end; justify-content:center; height:100%; min-width:0; }
.dsh-usage-bar { width:100%; max-width:26px; min-height:3px; border-radius:5px 5px 2px 2px; background:var(--dsh-accent); }
.dsh-usage-col:last-child .dsh-usage-bar { background:var(--dsh-accent); opacity:1; }
.dsh-usage-foot { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.dsh-usage[data-compact="true"] .dsh-usage-total { font-size:24px; }
.dsh-usage[data-compact="true"] .dsh-usage-donut { width:48px; height:48px; }
.dsh-usage[data-compact="true"] .dsh-usage-donut-hole { inset:12px; }

/* ---------- 余额 ---------- */
.dsh-balance { display:flex; flex-direction:column; gap:4px; height:100%; min-height:0; }
.dsh-balance-label { color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:16px; }
.dsh-balance-amount { color:var(--dsw-alias-label-primary); }
.dsh-balance-amount[data-unknown="true"] { color:var(--dsw-alias-label-caption); }
.dsh-balance-reason { color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-balance-detail { display:flex; gap:12px; color:var(--dsw-alias-label-tertiary); font-size:10px; font-variant-numeric:tabular-nums; }
.dsh-balance .dsh-timer-button { margin-top:auto; align-self:flex-start; }

/* ---------- 图片 / 一句话 ---------- */
.dsh-picture { position:relative; flex:1 1 auto; min-height:0; margin:0; border-radius:12px; overflow:hidden; background:var(--dsw-alias-bg-skeleton); }
.dsh-picture img { width:100%; height:100%; display:block; }
.dsh-picture-caption { position:absolute; inset-inline:0; bottom:0; padding:6px 10px; color:var(--dsw-alias-label-primary-foreground); font-size:11px; line-height:16px; font-weight:600; background:rgb(0 0 0 / 55%); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-picture-empty { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; border:.5px dashed var(--dsw-alias-border-l2); border-radius:12px; color:var(--dsw-alias-label-tertiary); font-size:11px; text-align:center; padding:10px; }
.dsh-picture-empty-glyph { color:var(--dsw-alias-label-caption); font-size:22px; line-height:1; }
.dsh-picture-path { max-width:100%; color:var(--dsw-alias-label-caption); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
.dsh-quote { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:6px; justify-content:center; padding:2px 4px; }
.dsh-quote-mark { color:var(--dsh-accent); font-size:34px; line-height:.8; font-weight:600; }
.dsh-quote-text { margin:0; color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.6; overflow:auto; scrollbar-width:thin; }
.dsh-quote-hint { color:var(--dsw-alias-label-caption); font-size:10px; }

/* ---------- 共用表单 ---------- */
.dsh-planner-loading, .dsh-planner-fallback { margin:0; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-planner-fallback { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
.dsh-planner-detail { margin:0; color:var(--dsw-alias-label-caption); font-size:11px; }
.dsh-planner-retry { padding:3px 10px; border:.5px solid var(--dsw-alias-border-l3); border-radius:999px; background:transparent; color:var(--dsw-alias-label-secondary); font-size:11px; cursor:pointer; }
.dsh-item-editor { display:flex; flex-direction:column; gap:6px; width:100%; padding:8px; border:0; border-radius:12px; background:var(--dsw-alias-bg-skeleton); }
.dsh-item-field { display:flex; flex-direction:column; gap:2px; min-width:0; }
.dsh-item-label { color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:14px; }
.dsh-item-field input, .dsh-item-field textarea, .dsh-item-field select { width:100%; min-width:0; padding:4px 8px; border:1.5px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-size:12px; line-height:18px; font-family:var(--dsw-font-family); }
.dsh-item-field input:focus, .dsh-item-field textarea:focus, .dsh-item-field select:focus { outline:none; border-color:var(--dsh-accent); }
.dsh-item-field textarea { resize:vertical; min-height:36px; }
.dsh-item-row { display:flex; gap:6px; }
.dsh-item-row .dsh-item-field { flex:1 1 0; }
.dsh-item-actions { display:flex; align-items:center; gap:6px; }
.dsh-item-hint { flex:1 1 auto; min-width:0; color:var(--dsh-warning); font-size:11px; line-height:16px; }
.dsh-item-button { padding:4px 12px; border:0; border-radius:8px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); font-size:12px; font-weight:600; cursor:pointer; }
.dsh-item-button:hover { background:var(--dsw-alias-interactive-bg-active); }
.dsh-item-save { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
.dsh-item-save:hover { background:var(--dsw-alias-button-primary-hover); }
.dsh-item-save:disabled { opacity:.45; cursor:default; }
.dsh-item-delete { margin-inline-end:auto; color:var(--dsh-danger); border-color:transparent; background:transparent; }

/* 优先级：重要=琥珀，紧急=红，普通不显示。 */
.dsh-priority { flex:none; width:6px; height:6px; margin-top:7px; clip-path:circle(50%); border-radius:50%; background:var(--dsh-warning); }
.dsh-priority[data-priority="2"] { background:var(--dsh-danger); }
.dsh-item-priority { display:flex; gap:4px; }
.dsh-item-priority-pill { padding:2px 9px; border:0; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:16px; cursor:pointer; }
.dsh-item-priority-pill[data-level="1"][aria-pressed="true"] { background:var(--dsh-warning-soft); color:var(--dsh-warning); }
.dsh-item-priority-pill[data-level="2"][aria-pressed="true"] { background:color-mix(in srgb, var(--dsh-danger) 12%, transparent); color:var(--dsh-danger); }
.dsh-item-priority-pill[data-level="0"][aria-pressed="true"] { background:var(--dsh-accent-soft); color:var(--dsh-accent); }

/* 日历圆点：当天未完成越多，同一色相的档位越深。 */
.dsh-calendar-dot { background:var(--dsh-accent); }
.dsh-calendar-dot[data-density="2"] { background:var(--dsh-ramp-3); }
.dsh-calendar-dot[data-density="3"] { background:var(--dsh-ramp-4); }

/* 会话状态：三个视图共用同一种胶囊；选中态是墨色，状态含义由文字承担。 */
.dsh-session-status { display:flex; flex-direction:column; gap:8px; min-height:0; min-width:0; }
.dsh-status-filter { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.dsh-status-rows { margin:0; }
.dsh-status-empty { margin:0; }

`;
		//#endregion
		//#region src/client/quick-styles.ts
		/** Append to the home stylesheet; only host tokens, no independent light/dark theme. */
		const quickStyles = `
.dsh-quick-widget, .dsh-quick-widget-links, .dsh-quick-settings {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.dsh-quick-widget .dsh-quick-widget-action {
  width: 100%;
  min-width: 0;
  justify-content: space-between;
  gap: 8px;
  text-align: start;
  font: var(--dsw-font-s-14);
}
.dsh-quick-widget > .dsh-quick-widget-action:first-child { font-weight: 600; }
.dsh-quick-widget > .dsh-quick-widget-action:first-child .dsh-key {
  color: inherit;
  opacity: .72;
}
.dsh-quick-widget > .dsh-quick-widget-action:not(:first-child) { color: var(--dsw-alias-label-secondary); }
.dsh-quick-widget > .dsh-muted { overflow-wrap: anywhere; }
.dsh-quick-widget > .dsh-widget-own-editor {
  margin-top: 0;
  padding-top: 4px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.dsh-quick-widget :is(.dsh-quick-widget-action,.dsh-quick-widget-link) {
  transition: background-color 120ms ease-out, color 120ms ease-out;
}
.dsh-quick-widget-action > span:first-child, .dsh-quick-widget-link > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-quick-widget-kind {
  flex-shrink: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
}
.dsh-quick-widget-links {
  gap: 4px;
  padding-block-start: 4px;
  border-block-start: .5px solid var(--dsw-alias-border-l2);
}
/* A web destination is a native anchor, not a button pretending to navigate. */
.dsh-quick-widget-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-link);
  font: var(--dsw-font-s-14);
  text-decoration: none;
  box-sizing: border-box;
}
.dsh-quick-widget-link:is(:hover,:focus-visible):not([aria-disabled=true]) { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-quick-widget-link:active { background: var(--dsw-alias-interactive-bg-active); }
.dsh-quick-widget-link:focus-visible { outline: 2px solid var(--dsw-alias-link); outline-offset: 2px; }
.dsh-quick-widget-link[aria-disabled=true] { opacity: .5; cursor: default; }
.dsh-quick-widget-error {
  margin: 0;
  color: var(--dsh-danger);
  font: var(--dsw-font-xs-13);
  overflow-wrap: anywhere;
}
.dsh-quick-settings { gap: 12px; }
.dsh-quick-settings-row {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 12px 0;
  border: 0;
  border-block-start: .5px solid var(--dsw-alias-border-l2);
}
.dsh-quick-settings-row legend {
  padding-inline-end: 8px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
}
.dsh-quick-settings-field {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
}
.dsh-quick-settings-field input { width: 100%; min-width: 0; box-sizing: border-box; }
.dsh-quick-settings-row > button, .dsh-quick-settings > button { justify-self: start; }
@media (prefers-reduced-motion: reduce) {
  .dsh-quick-widget :is(.dsh-quick-widget-action,.dsh-quick-widget-link) { transition: none; }
}
`;
		//#endregion
		//#region src/client/gallery-styles.ts
		const galleryStyles = `
.dsh-manager-nav { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.dsh-gallery-hint { font:var(--dsw-font-xs-13); color:var(--dsw-alias-label-secondary); margin:0 0 14px; }
.dsh-gallery-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.dsh-gallery-search { flex:1 1 260px; min-width:0; max-width:480px; }
.dsh-gallery-filters { display:flex; align-items:center; gap:4px; }
.dsh-gallery-filters button[aria-pressed="true"], .dsh-manager-nav button[aria-pressed="true"] { background:var(--dsw-alias-interactive-bg-active); }
.dsh-widget-directory { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr)); gap:16px; max-height:min(680px,65vh); overflow-y:auto; padding:2px 4px 4px 2px; }
.dsh-directory-item { display:flex; flex-direction:column; align-items:stretch; flex-wrap:nowrap; gap:0; padding:0; min-width:0; overflow:hidden; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg); background:var(--dsw-alias-bg-layer-1); }
.dsh-directory-preview { display:flex; align-items:center; justify-content:center; flex:none; height:150px; width:calc(100% - 24px); min-width:0; margin:12px 12px 0; padding:14px; border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary); overflow:hidden; pointer-events:none; user-select:none; }
.dsh-gallery-sample { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); text-align:center; padding:6px 8px; }
.dsh-gallery-card-footer { display:flex; align-items:flex-start; gap:12px; width:100%; padding:10px 14px 6px; }
.dsh-gallery-card-footer .dsh-manager-info { flex:1; min-width:0; }
.dsh-gallery-card-footer .dsh-manager-info > strong { font:var(--dsw-font-s-strong-14); }
.dsh-gallery-card-footer button { flex:none; }
.dsh-gallery-card-footer .dsh-manager-description { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; font:var(--dsw-font-xs-13); min-height:40px; }
.dsh-gallery-source { padding:0 14px 12px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-gallery-empty { display:flex; flex-direction:column; align-items:center; gap:12px; padding:36px 12px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xs-13); }
/* Gallery previews are the real card body at its real pixel size, scaled only visually. */
.dsh-card-preview { width:100%; min-width:0; }
.dsh-card-preview-frame { position:relative; overflow:hidden; }
.dsh-card-preview-body { position:absolute; top:0; left:0; transform-origin:top left; }
@media(max-width:720px) { .dsh-widget-directory { grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); } .dsh-gallery-toolbar { gap:8px; } }
`;
		//#endregion
		//#region src/client/library-styles.ts
		const libraryStyles = `
/* A floating window, not a docked column: JS moves it by writing left/top, and a
   null preference falls back to this corner. The height cap leaves room to park it. */
.dsh-library-panel { position:fixed; z-index:80; top:92px; right:20px; height:min(720px,calc(100vh - 132px)); width:min(480px,calc(100vw - 96px)); padding:16px; border:.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-xl); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); box-shadow:var(--dsw-shadow-lv3); display:flex; flex-direction:column; min-height:0; }
.dsh-library-heading { display:flex; align-items:center; gap:8px; margin:0 0 8px; cursor:grab; touch-action:none; user-select:none; }
.dsh-library-heading h2 { font:var(--dsw-font-s-strong-14); margin:0; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-tool.dsh-library-grip { flex:none; cursor:grab; }
.dsh-library-panel[data-moving="true"] { user-select:none; }
.dsh-library-panel[data-moving="true"] .dsh-library-heading, .dsh-library-panel[data-moving="true"] .dsh-library-grip { cursor:grabbing; }
.dsh-library-panel .dsh-gallery-toolbar { flex-direction:column; align-items:stretch; gap:8px; }
.dsh-library-panel .dsh-widget-directory { display:flex; flex-direction:column; gap:12px; max-height:none; overflow-y:auto; min-height:0; padding:2px 6px 8px 2px; }
.dsh-library-panel .dsh-directory-item { flex:none; padding:12px; height:auto; overflow:hidden; background:var(--dsw-alias-settings-card-fill); transition:box-shadow 120ms ease; cursor:grab; touch-action:none; user-select:none; }
.dsh-library-panel .dsh-directory-item:hover,.dsh-library-panel .dsh-directory-item:focus-within { box-shadow:var(--dsw-shadow-lv2); border-color:var(--dsw-alias-border-l4); }
.dsh-library-panel .dsh-w-head { touch-action:none; cursor:grab; flex:none; }
.dsh-library-panel .dsh-w-title { flex:1; }
.dsh-library-preview { position:relative; width:100%; flex:1 1 auto; min-height:0; overflow:hidden; margin-top:10px; pointer-events:none; }
.dsh-library-ghost { position:fixed; z-index:1000; pointer-events:none; overflow:hidden; margin:0; box-sizing:border-box; box-shadow:var(--dsw-shadow-lv3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); opacity:.9; }
.dsh-library-ghost[data-inside="false"] { opacity:.55; }
.dsh-library-outline {position:fixed;z-index:70;pointer-events:none;border:2px solid var(--dsh-accent);border-radius:var(--dsw-radius-xl);background:var(--dsh-accent-soft);opacity:.4;box-sizing:border-box}
.dsh-library-outline[data-pending="true"]{border-style:dashed;background:transparent}
.dsh-library-ghost .dsh-w-head { flex:none; }
@media(prefers-reduced-motion:reduce){.dsh-library-panel .dsh-directory-item{transition:none}}
@media(max-width:720px){.dsh-library-panel { width:calc(100vw - 40px); } }
`;
		//#endregion
		//#region src/client/widget-refinement-styles.ts
		/** Final, content-scoped refinement layer. Geometry, instance layout and business
		* state remain owned by the existing shell/registry; all surfaces use DSH aliases. */
		const widgetRefinementStyles = `
/* A readable heading, then primary content, then quiet metadata. */
.dsh-home .dsh-w-title { font:var(--dsw-font-s-strong-14); font-weight:600; color:var(--dsw-alias-label-primary); letter-spacing:0; min-width:0; overflow-wrap:anywhere; }
.dsh-home .dsh-w-glyph { color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-row-title { font:var(--dsw-font-s-strong-14); }
.dsh-home-widget :is(.dsh-row-meta,.dsh-label) { font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-muted { color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget :is(.dsh-row,.dsh-session-row,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button) { transition:background-color 120ms ease-out,color 120ms ease-out; }
.dsh-home-widget .dsh-row:focus-visible { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-row-static:focus-visible { background:transparent; }
.dsh-home-widget:focus-within { border-color:var(--dsw-alias-border-l4); }
/* Existing scroll containers still own overflow. Reserve space for focus rings
   and never flex-shrink an editor into an unusable sliver in a short card. */
.dsh-home .dsh-home-widget-content { scroll-padding-block:4px; }
.dsh-home-widget .dsh-widget-own-editor { flex-shrink:0; padding-inline:2px; padding-bottom:2px; }
.dsh-home-widget .dsh-widget-own-editor > button { flex-shrink:0; }

/* A quiet outer surface, not a stack of decorated nested cards. Content owns
   its responsive structure; the shell must retain overflow as a safety net. */
.dsh-home .dsh-home-widget { background:color-mix(in srgb,var(--dsw-alias-bg-module-platform) 65%,var(--dsw-alias-bg-layer-1)); }
.dsh-home .dsh-widget-viewport { container-type:inline-size; container-name:widget; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { display:flex; flex-direction:column; gap:4px; min-width:0; height:100%; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) > * { flex-shrink:0; }
.dsh-home-widget .dsh-band-track { height:12px; margin-top:4px; background:var(--dsw-alias-bg-skeleton); }
.dsh-home-widget .dsh-band-seg { opacity:.55; }
.dsh-home-widget .dsh-band-seg[data-now="true"] { opacity:.9; }
.dsh-home-widget .dsh-band-seg:hover { opacity:1; }
.dsh-home-widget .dsh-band-scale { margin-top:0; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-today-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding-top:6px; margin-top:2px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-today-stats > span { display:flex; flex-direction:column; min-width:0; gap:1px; }
.dsh-home-widget .dsh-today-stats > span + span { padding-inline-start:8px; border-inline-start:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-xs-strong-13); font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.dsh-home-widget .dsh-today-stats span > span { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-today-longest { margin-top:1px; }
/* Workspace bars encode the real per-workspace duration, relative to the largest
   row (not a share of wall-clock time; concurrent session clusters may overlap). */
.dsh-home-widget .dsh-area-rows { gap:2px; height:100%; min-height:0; overflow:hidden; }
.dsh-home-widget .dsh-area-rows .dsh-row { gap:2px; padding-block:4px; }
.dsh-home-widget .dsh-area-rows .dsh-row-top { gap:6px; }
.dsh-home-widget .dsh-area-duration { margin-inline-start:auto; flex:none; font:var(--dsw-font-xs-strong-13); font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-area-track { display:block; width:100%; height:4px; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-skeleton); overflow:hidden; }
.dsh-home-widget .dsh-area-track > span { display:block; height:100%; border-radius:inherit; background:var(--dsh-accent); opacity:.65; }
.dsh-home-widget .dsh-area-rows .dsh-row-meta { font:var(--dsw-font-xxxs-11); }
/* Stable proportions, rounded neutral tracks and a clear current-day accent.
   Taller cards gain useful chart height instead of only empty space. */
.dsh-home-widget .dsh-rhythm { flex:1 1 64px; min-height:48px; max-height:160px; gap:5px; margin-top:4px; }
.dsh-home-widget .dsh-rhythm-col { background:var(--dsw-alias-bg-skeleton); border-radius:var(--dsw-radius-sm); overflow:hidden; }
.dsh-home-widget .dsh-rhythm-bar { border-radius:var(--dsw-radius-sm); opacity:.55; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-rhythm-days { gap:5px; margin-top:0; font:var(--dsw-font-xxxs-11); }
@container widget (min-width:560px) {
  .dsh-today-content .dsh-number,.dsh-rhythm-content .dsh-number { font-size:32px; line-height:36px; }
  .dsh-area-rows .dsh-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(120px,1fr); column-gap:16px; }
  .dsh-area-rows .dsh-row-top { grid-column:1; }
  .dsh-area-rows .dsh-area-track { grid-column:2; grid-row:1 / span 2; align-self:center; }
  .dsh-area-rows .dsh-row-meta { grid-column:1; }
}

/* Resume keeps its actual snippet, dismiss and continuation actions. */
.dsh-home-widget .dsh-focus { gap:8px; position:relative; min-height:100%; }
.dsh-home-widget .dsh-focus-eyebrow-row { position:absolute; top:0; right:0; }
.dsh-home-widget .dsh-focus-title { padding-inline-end:28px; }
.dsh-home-widget .dsh-focus-actions { padding-top:6px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-focus > * { flex-shrink:0; }
.dsh-home-widget .dsh-focus-title { font-size:18px; line-height:26px; }
.dsh-home-widget .dsh-focus-snippet { font-size:var(--dsh-content-font-size-secondary,13px); line-height:1.6; }
.dsh-home-widget .dsh-focus-meta { gap:4px 8px; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-focus-actions { flex-wrap:wrap; }
.dsh-home-widget .dsh-focus-primary:focus-visible { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget :is(.dsh-focus-secondary,.dsh-icon-button):focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

/* Queue status is present in the data already: a quiet row and a colored dot,
   with the real reason retained as text rather than an invented status. */

/* Recent card: filters and footer stay fixed, the row list shows exactly the rows that
   fit (see fit-rows.ts) and never scrolls. Session row styling lives next to its
   component in styles.ts under .dsh-session-row. */
.dsh-home-widget .dsh-recent { gap:8px; height:100%; min-height:0; }
.dsh-home-widget .dsh-recent > :is(.dsh-recent-filters,.dsh-recent-footer) { flex:none; }
.dsh-home-widget .dsh-recent > .dsh-rows { flex:1 1 auto; min-height:0; overflow:hidden; margin-inline:0; padding:2px; }
.dsh-home-widget .dsh-recent-filters > :is(input,select) { background:var(--dsw-alias-bg-layer-1); }
.dsh-home-widget .dsh-recent-filters input::placeholder { color:var(--dsw-alias-label-tertiary); opacity:1; }
.dsh-home-widget .dsh-recent-footer { padding-top:4px; border-top:.5px solid var(--dsw-alias-border-l2); }

/* Native pins: newest-first, cut to what fits, total count still stated. */
.dsh-pinned { display:flex; flex-direction:column; height:100%; min-height:0; gap:8px; }
.dsh-pinned-summary { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 12px; flex:none; font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-tertiary); }
.dsh-pinned-summary strong { color:var(--dsw-alias-label-secondary); font-weight:500; }
.dsh-pinned > .dsh-empty { flex:1 1 auto; }
.dsh-pinned-rows { flex:1 1 auto; min-height:0; overflow:hidden; margin:0; padding:2px; }
.dsh-pinned-rows .dsh-row { flex:none; }
.dsh-pinned-rows .dsh-row + .dsh-row { border-top:.5px solid var(--dsw-alias-border-l1); }

/* Task choices remain choices; the only primary action still prepares a draft. */
.dsh-home-widget .dsh-quick-widget-links { background:var(--dsw-alias-bg-layer-1); border:0; border-radius:var(--dsw-radius-md); padding:4px; }
.dsh-home-widget .dsh-quick-widget > .dsh-widget-own-editor { justify-content:flex-start; padding-top:6px; }
.dsh-home-widget .dsh-personal-clock { min-height:100%; }
.dsh-home-widget .dsh-activity-secondary { font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-activity-legend { padding-top:2px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-activity-footer { display:flex; gap:4px 12px; justify-content:space-between; align-items:center; flex-wrap:wrap; }
.dsh-home-widget .dsh-activity-footer > .dsh-muted { flex:1 1 200px; }
.dsh-home-widget .dsh-activity-footer > .dsh-widget-own-editor { margin:0; padding:0; flex:none; }
@container widget (max-width:480px) {
  .dsh-personal-clock .dsh-personal-label { font:var(--dsw-font-xs-13); }
  .dsh-rhythm-days span:last-child { white-space:nowrap; }
}

/* Local feedback only; no entrance choreography or changes to placement. */
.dsh-home .dsh-w { animation:none; }
.dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition-duration:150ms; }
@media (prefers-reduced-motion: reduce) {
  .dsh-home-widget :is(.dsh-row,.dsh-row-arrow,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button),
  .dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition:none; }
}
`;
		//#endregion
		//#region src/client/widget-expression-styles.ts
		/** BoardUI-inspired content grammar. Accents follow semantic landmarks, never type IDs. */
		const widgetExpressionStyles = `
.dsh-home { --dsh-home-canvas-fill:color-mix(in srgb,var(--dsw-alias-bg-module-platform) 72%,var(--dsw-alias-bg-base)); background:var(--dsh-home-canvas-fill); }
/* Sticky chrome is part of the canvas, not a white rectangular card. */
.dsh-home .dsh-home-head { background:var(--dsh-home-canvas-fill); }
.dsh-home .dsh-home-widget-content > .dsh-widget-viewport > .dsh-empty:only-child { min-height:100%; }
.dsh-home .dsh-home-widget { background:var(--dsw-alias-bg-layer-1); border-color:var(--dsw-alias-border-l2); }
/* Headings share one left slot: the glyph is a quiet mark, not a tinted tile.
   Cards without a glyph start at the same edge as the ones with one. */
.dsh-home-widget .dsh-w-head { gap:9px; position:relative; padding-inline-start:20px; }
.dsh-widget-symbol { position:absolute; inset-inline-start:0; top:50%; transform:translateY(-50%); display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:var(--dsw-alias-label-tertiary); background:transparent; }
.dsh-widget-symbol svg { width:14px; height:14px; color:inherit; }
.dsh-home .dsh-widget-symbol .dsh-w-glyph { color:inherit; }
.dsh-home-widget .dsh-w-title { letter-spacing:-.015em; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { gap:2px; }
.dsh-today-hero { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.dsh-today-hero .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; min-width:0; }
.dsh-day-dial { width:48px; height:48px; flex:none; overflow:visible; }
.dsh-day-dial circle { fill:none; }
.dsh-day-dial-track { stroke:var(--dsw-alias-border-l2); stroke-width:4; }
.dsh-day-dial-arc { stroke:var(--dsh-accent); stroke-width:5; stroke-linecap:butt; }
.dsh-day-dial .dsh-day-dial-now { fill:var(--dsh-warning); }
.dsh-day-dial text { fill:var(--dsw-alias-label-tertiary); font:10px var(--dsw-font-family); }
.dsh-home-widget .dsh-band-track { height:8px; margin-top:1px; }
.dsh-home-widget .dsh-band-seg { opacity:.8; min-width:0; border-radius:var(--dsw-radius-xs); }
.dsh-home-widget .dsh-today-stats { padding-top:4px; margin-top:1px; }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-s-strong-14); color:var(--dsw-alias-label-primary); }
.dsh-home-widget .dsh-today-longest { font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-rhythm-content .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; }
.dsh-home-widget .dsh-rhythm-col { background:var(--dsh-track); }
.dsh-home-widget .dsh-rhythm-bar { background:var(--dsh-accent); opacity:.65; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-area-track { height:7px; }
.dsh-home-widget .dsh-area-track > span { background:var(--dsh-accent); opacity:.8; }
.dsh-area-rows .dsh-ws-pill { max-width:72%; }
.dsh-home-widget .dsh-pinned-summary { padding-bottom:6px; border-bottom:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-pinned-summary strong { color:var(--dsw-alias-label-primary); font:var(--dsw-font-xs-strong-13); }
.dsh-home-widget .dsh-focus-snippet { border-inline-start:3px solid var(--dsh-accent); padding-inline-start:12px; margin-block:0; color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-focus-primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
.dsh-home-widget .dsh-focus-primary:is(:hover,:focus-visible) { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget .dsh-quick-widget-links { padding:0; background:transparent; }
.dsh-home-widget .dsh-quick-widget-link { background:var(--dsw-alias-bg-module-platform); }
/* Content adapts within saved rectangles; whitespace is not an excuse to
   clip text, invent data or resize the widget. */
.dsh-home-widget .dsh-focus-title { white-space:normal; overflow-wrap:anywhere; }
.dsh-home-widget .dsh-focus-snippet { -webkit-line-clamp:4; }
.dsh-home-widget .dsh-focus-actions { margin-top:auto; }
.dsh-home-widget .dsh-today-timeline { min-width:0; }
.dsh-home-widget .dsh-today-content[data-roomy="true"] { gap:8px; justify-content:space-between; }
.dsh-today-content[data-roomy="true"] .dsh-day-dial { width:72px; height:72px; }
.dsh-home-widget .dsh-quick-widget { display:flex; flex-direction:column; min-height:100%; }
.dsh-home-widget .dsh-quick-widget > .dsh-widget-own-editor { margin-top:auto; }
.dsh-home-widget .dsh-quick-widget > .dsh-muted { margin-top:4px; }
@container widget (min-width:560px) {
  .dsh-home-widget .dsh-today-content { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); grid-template-rows:auto auto; gap:6px 24px; align-content:center; }
  .dsh-today-content .dsh-today-hero { grid-column:1; grid-row:1 / span 2; }
  .dsh-today-content .dsh-today-timeline { grid-column:2; grid-row:1; align-self:end; }
  .dsh-home-widget .dsh-today-content .dsh-today-stats { grid-column:2; grid-row:2; align-self:start; }
  .dsh-today-content .dsh-today-longest { grid-column:1 / -1; }
  .dsh-home-widget .dsh-quick-widget-links { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@container widget (max-width:280px) {
  .dsh-day-dial { width:48px; height:48px; }
}
`;
		//#endregion
		//#region src/client/styles.ts
		/**
		* 首页样式：一段注入到 `<head>` 的样式表（前缀 `dsh-home-`）。
		*
		* 只消费语义 token（`--dsw-alias-*` / `--dsw-specific-*` / `--dsw-radius-*`），
		* 不写死颜色、不定义第二套主题——深色模式由宿主在 `<body>` 上切 alias 自动成立。
		* 圆角按角色取档：独立内容卡 R20（`--dsw-radius-xl`），行/芯片 R8/R12，胶囊 999px
		* 并显式 `corner-shape: round`。
		*
		* @module @vlln/dsh-home/client/styles
		*/
		/** 样式表元素 id（重复挂载时复用同一份）。 */
		const STYLE_ID = "dsh-home-styles";
		const CSS$1 = `
.dsh-home {
  /* Fixed-pixel board width (cols*84 + (cols-1)*12); the handles rewrite it directly. */
  --dsh-home-board-width: 1140px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  /* A board wider than the window scrolls here; the document itself never overflows.
     A board that still fits is centred by the auto margins on .dsh-home-inner. */
  overflow-x: auto;
  overflow-y: auto;
  background: var(--dsw-alias-bg-base);
  /* No padding here: the sticky header's containing block would start below it and
     let card content show through above the header while scrolled. The clearance
     lives in the header's own padding instead (see .dsh-home-head). */
  padding-top: 0;
  padding-right: 24px;
  padding-bottom: 40px;
  padding-left: max(24px, var(--dsh-frame-leading-clearance, 0px));
  color: var(--dsw-alias-label-primary);
  scrollbar-color: var(--dsw-alias-scrollbar-thumb, var(--dsw-alias-border-l3)) transparent;
}
.dsh-home * { box-sizing: border-box; }
/* A fixed-pixel board, centred when the window is wider. Widget width never depends
   on this box: a wider board fits more columns, it does not stretch a card. */
.dsh-home-inner { position: relative; width: var(--dsh-home-board-width, 1140px); max-width: none; margin-inline: auto; min-width: 0; flex: none; }

.dsh-home-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dsh-home-heading { min-width: 0; }
.dsh-home-title-row { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.dsh-home-updated { font-size: 11px; color: var(--dsw-alias-label-caption); }
.dsh-home-title {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}
.dsh-home-sub {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-home-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--dsw-alias-label-caption); flex: none; }
.dsh-home-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
/* Drag-to-delete target. Fixed to the top of the viewport so it stays reachable no
   matter how far the board is scrolled or how wide it is; it exists only while a card
   is being dragged, and the grid arms it from the live pointer position. */
.dsh-home-delete-zone { position: fixed; top: calc(var(--dsh-frame-top-clearance, 0px) + 12px); left: 50%; transform: translateX(-50%); z-index: 70; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px dashed var(--dsw-alias-border-l4); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); box-shadow: var(--dsw-shadow-lv2); font: var(--dsw-font-xs-13); pointer-events: none; user-select: none; }
.dsh-home-delete-zone svg { flex: none; }
.dsh-home-delete-zone[data-armed="true"] { border-style: solid; border-color: var(--dsh-danger); background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--dsh-danger); }
.dsh-home-delete-zone-armed { display: none; }
.dsh-home-delete-zone[data-armed="true"] .dsh-home-delete-zone-idle { display: none; }
.dsh-home-delete-zone[data-armed="true"] .dsh-home-delete-zone-armed { display: inline; }
/* Delete puff: one fixed, pointer-transparent layer over where the card was, holding a
   soft halo and a cloud of small sampled particles. The card itself is already gone. */
.dsh-debris { position: fixed; z-index: 90; pointer-events: none; user-select: none; }
.dsh-debris-particle { position: absolute; display: block; border-radius: 50%; will-change: transform, opacity; }
.dsh-debris-halo { position: absolute; border-radius: 50%; transform-origin: center; will-change: transform, opacity; }

.dsh-home-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.dsh-w {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px 16px;
  border-radius: var(--dsw-radius-xl);
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
}
.dsh-w[data-size="m"] { grid-column: span 2; }
.dsh-w[data-size="l"] { grid-column: span 3; }
.dsh-w[data-dragging="true"] { opacity: 0.5; }
.dsh-w[data-droptarget="true"] { box-shadow: inset 0 0 0 1.5px var(--dsh-accent); }

.dsh-w-head { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.dsh-w-glyph { width: 14px; height: 14px; flex: none; color: var(--dsw-alias-label-tertiary); }
.dsh-w-title {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  letter-spacing: 0.02em;
}
.dsh-w-extra { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-caption); white-space: nowrap; }
.dsh-w-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.dsh-number {
  font-size: 22px;
  line-height: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
}
.dsh-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dsh-muted { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-metric { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }

.dsh-rows { display: flex; flex-direction: column; gap: 2px; }
.dsh-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  margin: 0;
  padding: 7px 8px;
  border: none;
  border-radius: var(--dsw-radius-md);
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.dsh-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-row:active { background: var(--dsw-alias-interactive-bg-active); }
.dsh-row:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-row-static { cursor: default; }
.dsh-row-static:hover { background: transparent; }
.dsh-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-row-arrow {
  flex: none;
  margin-left: auto;
  font-size: 12px;
  color: var(--dsw-alias-label-caption);
  opacity: 0;
  transform: translateX(-2px);
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.dsh-row:hover .dsh-row-arrow,
.dsh-row:focus-visible .dsh-row-arrow { opacity: 1; transform: none; }
.dsh-row-title {
  font-size: 13px;
  line-height: 19px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.dsh-row-meta { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dsh-row-live { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsh-accent); }

.dsh-band-track {
  position: relative;
  height: 26px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-skeleton);
  overflow: hidden;
}
.dsh-band-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  border-radius: 4px;
  background: var(--dsh-accent);
  opacity: 0.5;
}
.dsh-band-seg[data-now="true"] { opacity: 0.95; }
.dsh-band-now {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  border-radius: 1px;
  background: var(--dsh-warning);
}
.dsh-band-scale {
  display: flex;
  justify-content: space-between;
  margin-top: -2px;
  font-size: 9px;
  line-height: 12px;
  color: var(--dsw-alias-label-caption);
  font-variant-numeric: tabular-nums;
}

.dsh-rhythm { display: flex; align-items: flex-end; gap: 4px; height: 56px; }
.dsh-rhythm-col { display: flex; align-items: flex-end; flex: 1 1 0; min-width: 0; height: 100%; }
.dsh-rhythm-bar {
  display: block;
  width: 100%;
  border-radius: 3px;
  background: var(--dsh-accent);
  opacity: 0.5;
}
.dsh-rhythm-bar[data-today="true"] { opacity: 0.95; }
.dsh-rhythm-days {
  display: flex;
  gap: 4px;
  margin-top: -2px;
  font-size: 9px;
  line-height: 12px;
  color: var(--dsw-alias-label-caption);
}
.dsh-rhythm-days span { flex: 1 1 0; min-width: 0; text-align: center; overflow: hidden; }

.dsh-quick { display: flex; flex-direction: column; gap: 8px; }
.dsh-quick-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.dsh-quick-button:hover { background: var(--dsw-alias-interactive-bg-hover-solid); }
.dsh-quick-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-quick-primary {
  background: var(--dsw-alias-button-primary-fill);
  border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground);
}
.dsh-quick-primary:hover { background: var(--dsw-alias-button-primary-hover); }
.dsh-key { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dsh-quick-primary .dsh-key { color: var(--dsw-alias-label-primary-foreground); opacity: 0.72; }

.dsh-edit-bar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.dsh-edit-hint { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dsh-edit-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.dsh-tray {
  margin-top: 12px;
  padding: 12px 14px 14px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-tray-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.dsh-tray-title { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-secondary); }
.dsh-tray-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px; }
.dsh-tray-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.dsh-tray-item:hover { background: var(--dsw-alias-interactive-bg-hover-solid); }
.dsh-tray-item[data-hidden="true"] { opacity: 0.55; }
.dsh-tray-item:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-tray-glyph { display: inline-flex; }
.dsh-tray-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-tray-state { font-size: 11px; color: var(--dsw-alias-label-tertiary); }

.dsh-w-facts { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dsh-empty-action {
  align-self: center;
  height: 24px;
  padding: 0 11px;
  border: none;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsh-empty-action:hover { background: var(--dsw-alias-button-primary-hover); }
.dsh-empty-action:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}

.dsh-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.dsh-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-icon-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
@keyframes dsh-home-spin { to { transform: rotate(360deg); } }
.dsh-spin { animation: dsh-home-spin 900ms linear infinite; }

.dsh-w-skeleton { min-height: 132px; }
.dsh-w-skeleton .dsh-skeleton { height: 12px; }
@keyframes dsh-home-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.dsh-w { animation: dsh-home-rise 200ms ease-out both; }
.dsh-w:hover { border-color: var(--dsw-alias-border-l4); }
.dsh-band-seg { transition: opacity 120ms ease-out; }
.dsh-band-seg:hover { opacity: 1; }
.dsh-rhythm-col:hover .dsh-rhythm-bar { opacity: 1; }
/* 最近活跃：同一个量换窗口看。范围切换在卡片顶部，图表填满剩余高度。 */
.dsh-active { display: flex; flex-direction: column; gap: 6px; height: 100%; min-height: 0; }
.dsh-active-toolbar { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.dsh-active-range { height: 22px; padding: 0 10px; font-size: 11px; line-height: 22px; }
.dsh-active-col { outline: none; cursor: default; }
.dsh-active-col:is(:hover, :focus-visible) .dsh-active-bar:not([data-zero="true"]) { opacity: 1; box-shadow: inset 0 0 0 1px var(--dsw-alias-label-secondary); }
.dsh-active-col:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent)); outline-offset: 2px; border-radius: var(--dsw-radius-xs); }
.dsh-home-widget .dsh-active .dsh-active-bar[data-zero="true"] { opacity: 0; }
/* 零活动的那一天不画柱子，也不留底色：只剩可悬停的列与日期标签。 */
.dsh-home-widget .dsh-active .dsh-rhythm-col, .dsh-home-widget .dsh-active .dsh-rhythm-col:hover { background: transparent; }
.dsh-active-hero { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.dsh-active-bars { flex: 1 1 auto; min-height: 40px; max-height: 72px; }
.dsh-active-days { margin-top: -2px; }
.dsh-active-band { margin-top: 2px; }
.dsh-active-band-empty { flex: 1 1 auto; display: flex; align-items: center; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dsh-focus-item { position: relative; }
.dsh-focus-item[data-dragging="true"] { opacity: 0.5; }
.dsh-focus-item[data-drop="before"]::before,
.dsh-focus-item[data-drop="after"]::after {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsh-accent);
}
.dsh-focus-item[data-drop="before"]::before { top: -6px; }
.dsh-focus-item[data-drop="after"]::after { bottom: -6px; }
.dsh-w[data-drop="before"]::before,
.dsh-w[data-drop="after"]::after {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 2px;
  border-radius: 2px;
  background: var(--dsh-accent);
}
.dsh-w[data-drop="before"]::before { left: -7px; }
.dsh-w[data-drop="after"]::after { right: -7px; }
@media (prefers-reduced-motion: reduce) {
  .dsh-w { animation: none; }
  .dsh-spin { animation: none; }
  .dsh-band-seg { transition: none; }
}
.dsh-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: inset 0 0 0 0.5px var(--dsw-alias-border-l2);
}
.dsh-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 24px;
  padding: 0 6px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsh-tool:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-tool:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-tool[data-active="true"] {
  background: var(--dsw-alias-button-ghost-active-fill);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border);
}
.dsh-drag { cursor: grab; touch-action: none; }
/* 阅读态常显一个半透明把手（曾经做成"悬停才出现"，用户根本没发现）；
   悬停/聚焦/编辑态全显。 */
.dsh-w-head .dsh-tools { opacity: 0.5; transition: opacity 120ms ease-out; }
.dsh-w:hover .dsh-tools,
.dsh-w:focus-within .dsh-tools,
.dsh-w[data-editing="true"] .dsh-tools { opacity: 1; }
@media (hover: none) { .dsh-w-head .dsh-tools { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .dsh-w-head .dsh-tools { transition: none; } }
.dsh-drag:active { cursor: grabbing; }

.dsh-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 96px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-error {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--dsw-radius-lg);
  background: color-mix(in srgb, var(--dsh-danger) 10%, transparent);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsh-skeleton {
  height: 12px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-skeleton);
  animation: dsh-home-pulse 1.4s ease-in-out infinite;
}
@keyframes dsh-home-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) {
  .dsh-skeleton { animation: none; }
}


/* Registry directory, instance management and host-owned settings drafts. */
.dsh-workbench-notice {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0;
  padding: 12px 14px; border-radius: var(--dsw-radius-lg);
  background: var(--dsh-warning-soft); color: var(--dsw-alias-label-secondary);
  font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 1.6;
}
.dsh-workbench-notice > span { overflow-wrap: anywhere; }
.dsh-manager-heading { margin: 14px 0 8px; font: var(--dsw-font-s-strong-14); color: var(--dsw-alias-label-primary); }
.dsh-widget-directory, .dsh-instance-list { display: flex; flex-direction: column; }
.dsh-directory-item, .dsh-instance-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.dsh-manager-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 160px; overflow-wrap: anywhere; }
.dsh-manager-info > strong { font: var(--dsw-font-xs-strong-13); }
.dsh-manager-description { color: var(--dsw-alias-label-secondary); font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 1.6; }
.dsh-manager-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.dsh-widget-own-editor { display: flex; justify-content: flex-end; margin-top: 8px; }
.dsh-widget-config-modal .dsh-widget-settings { margin: 0; padding: 0; border: 0; }
.dsh-widget-settings { margin-top: 16px; padding-top: 4px; border-top: 0.5px solid var(--dsw-alias-border-l3); }
.dsh-settings-fields { margin: 12px 0; min-width: 0; }
/* Fill only the content flex box, excluding the shell header and padding. The
   observer reports this available viewport, independent of overflowing children. */
.dsh-widget-viewport { flex: 1 1 auto; width: 100%; min-width: 0; min-height: 0; }
.dsh-widget-settings > .dsh-manager-actions { justify-content: flex-end; }
.dsh-home [inert] { cursor: default; }
.dsh-home .dsh-tool:disabled { opacity: 0.4; cursor: default; }

/* ---- 工作台：原生搜索 / 目录选择，继承宿主语义 token ---- */
.dsh-recent { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dsh-recent-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.dsh-recent-search, .dsh-recent-cwd, .dsh-home-select {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-specific-input-major);
  font: inherit;
  font-size: var(--dsh-content-font-size-secondary, 13px);
}
.dsh-recent-search { flex: 2 1 180px; }
.dsh-recent-cwd { flex: 1 1 140px; }
.dsh-recent-search::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-recent-search:focus-visible, .dsh-recent-cwd:focus-visible, .dsh-home-select:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 2px;
}
/* One-line session row: state dot, workspace capsule, session title, time.
   The dot leads so a column can be scanned by state before reading a word. */
.dsh-session-line { position: relative; display: flex; align-items: center; min-width: 0; }
.dsh-session-row { flex: 1 1 auto; flex-direction: row; align-items: center; gap: 8px; padding: 4px 8px; min-width: 0; }
.dsh-session-line[data-dismissible="true"] .dsh-session-row { padding-inline-end: 26px; }
.dsh-session-status { order: -1; flex: none; display: inline-flex; align-items: center; }
.dsh-session-title { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-session-trailing { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsh-session-reason { flex: none; }
.dsh-session-dismiss { position: absolute; inset-inline-end: 2px; top: 50%; transform: translateY(-50%); opacity: 0; transition: opacity 120ms ease-out; }
.dsh-session-line:hover .dsh-session-dismiss,
.dsh-session-line:focus-within .dsh-session-dismiss { opacity: 1; }
.dsh-recent-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
.dsh-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-home-grid + .dsh-focus-stack { margin-top: 20px; }
.dsh-home-grid > .dsh-w + .dsh-w { margin-top: 0; }

/* Unified mobile-widget editing surface. Only the editing shell owns gestures. */
/* The clearance is inside the sticky box, so nothing can slide above the header. */
.dsh-home-head { position: sticky; top: 0; z-index: 8; background: var(--dsw-alias-bg-base); padding: calc(var(--dsh-frame-top-clearance, 0px) + 20px) 0 12px; }
/* Edit-only board width handles, mirroring the host Conversation tab: a 10px
   col-resize strip on each side of the centred column, with a 2px glow that follows
   the captured pointer. They resize the whole board, never a widget, so they stay
   outside the "no user resize" rule that governs cards. When the board is wider than
   the window the strips travel with it and the board scrolls horizontally. */
.dsh-canvas-grip { position: absolute; top: 0; bottom: 0; z-index: 9; width: 10px; cursor: col-resize; touch-action: none; user-select: none; }
.dsh-canvas-grip[data-side="left"] { right: 100%; }
.dsh-canvas-grip[data-side="right"] { left: 100%; }
.dsh-canvas-grip::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 2px; border-radius: 2px; pointer-events: none; opacity: 0;
  background: linear-gradient(to bottom,
    transparent calc(var(--dsh-canvas-grip-y, 50%) - 36px),
    var(--dsw-alias-scrollbar-bg-l1) calc(var(--dsh-canvas-grip-y, 50%) - 8px),
    var(--dsw-alias-scrollbar-bg-l1) calc(var(--dsh-canvas-grip-y, 50%) + 8px),
    transparent calc(var(--dsh-canvas-grip-y, 50%) + 36px));
  transition: opacity 120ms ease-out;
}
.dsh-canvas-grip[data-side="left"]::after { right: 3px; }
.dsh-canvas-grip[data-side="right"]::after { left: 3px; }
.dsh-canvas-grip[data-dragging]::after { opacity: 1; }
.dsh-canvas-grip[data-dragging] { z-index: 10; }
.dsh-canvas-grip:focus-visible { outline: 2px solid var(--dsh-accent); outline-offset: -2px; border-radius: var(--dsw-radius-sm); }
@media (hover: hover) { .dsh-canvas-grip:hover::after { opacity: 1; } }
/* The edge must track the pointer exactly, so the board does not ease into a new width. */
.dsh-home[data-resizing] .react-grid-layout,
.dsh-home[data-resizing] .react-grid-item { transition: none !important; }
@media (prefers-reduced-motion: reduce) { .dsh-canvas-grip::after { transition: none; } }
.dsh-home-widget { min-width: 0; }
/* The retired focus stack is gone; only the legacy reorder handle keeps its class. */
.dsh-home-widget .dsh-focus-item, .dsh-home-widget .dsh-focus-empty {
  border: 0; background: transparent; padding: 0; border-radius: 0; animation: none; margin: 0;
}
.dsh-home-widget-content { position: relative; }
.dsh-home[data-editing="true"] .dsh-home-widget { border-style: dashed; border-color: var(--dsh-accent); animation: none; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-w-head { cursor: grab; touch-action: none; position: relative; z-index: 3; flex-wrap: wrap; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-tools { opacity: 1; }
.dsh-home[data-editing="true"] .dsh-home-widget-content { opacity: 0.65; pointer-events: none; user-select: none; }
.dsh-widget-drag-cover { position: absolute; inset: 52px 0 0; z-index: 2; cursor: grab; touch-action: none; border-radius: inherit; }
.dsh-home-widget[data-dragging="true"] { opacity: 0.5; outline: 2px solid var(--dsh-accent); }
.dsh-edit-footnote { margin-top: 16px; }
.dsh-remove-widget { color: var(--dsh-danger); }
.dsh-home[data-editing="false"] .dsh-home-widget .dsh-w-head { cursor: default; }

/* React Grid Layout 2.2.3 / MIT: scoped structural rules adapted from its css/styles.css.
   Source: https://github.com/react-grid-layout/react-grid-layout (license in THIRD_PARTY_NOTICES). */
.dsh-spatial-container { width: 100%; min-width: 0; margin-top: 20px; }
.dsh-home .react-grid-layout { position: relative; transition: height 180ms ease; }
.dsh-home .react-grid-item { transition: transform 180ms ease, width 180ms ease, height 180ms ease; }
.dsh-home .react-grid-item.dsh-home-widget { margin: 0; animation: none; overflow: hidden; display: flex; flex-direction: column; }
.dsh-home .react-grid-item > .dsh-w-head { flex: none; min-height: 28px; }
.dsh-home .react-grid-item > .dsh-home-widget-content { flex: 1 1 auto; min-height: 0; overflow: auto; }
.dsh-home .react-grid-item.react-draggable-dragging,
.dsh-home .react-grid-item.resizing { transition: none; z-index: 10; will-change: transform; }
.dsh-home .react-grid-item.react-draggable-dragging { box-shadow: var(--dsw-shadow-lv3, 0 8px 24px var(--dsw-alias-border-l3)); border-color: var(--dsh-accent); opacity: 0.96; }
.dsh-home .react-grid-item.react-grid-placeholder { background: color-mix(in srgb, var(--dsh-accent) 14%, transparent); border: 2px dashed var(--dsh-accent); border-radius: var(--dsw-radius-xl); z-index: 1; pointer-events: none; transition: none; }
.dsh-home .dsh-spatial-grid[data-hover-pending="true"] .react-grid-placeholder {
  border-color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 8%, transparent);
}
.dsh-home .dsh-spatial-grid[data-drop-rejected="true"] .react-grid-placeholder {
  border-color: var(--dsh-danger);
  background: color-mix(in srgb, var(--dsh-danger) 10%, transparent);
}
/* Widget dimensions are not user-editable. RGL resizing stays disabled. */
.dsh-home-widget .dsh-tools { flex:none; }
.dsh-home-widget .dsh-w-head .dsh-w-title { flex:1 1 100px; }
.dsh-home[data-editing="true"] .dsh-home-widget { border-style: solid; border-color: var(--dsw-alias-border-l3); }
.dsh-home[data-editing="true"] .dsh-home-widget-content { opacity: 1; }
.dsh-home[data-editing="true"] .dsh-widget-grip { touch-action: none; cursor: grab; }
.dsh-home[data-editing="true"] .dsh-spatial-grid { background-image: radial-gradient(circle, var(--dsw-alias-border-l3) 1px, transparent 1px); background-size: 16px 16px; }
.dsh-home .dsh-tools { background: transparent; box-shadow: none; }
@media (prefers-reduced-motion: reduce) { .dsh-home .react-grid-layout, .dsh-home .react-grid-item { transition: none; } }

/* ---- 三件事（默认视图） ---- */
.dsh-focus-stack { display: flex; flex-direction: column; gap: 12px; }
.dsh-home-head + .dsh-focus,
.dsh-home-head + .dsh-focus-stack { margin-top: 20px; }
.dsh-w + .dsh-w { margin-top: 12px; }
/* 拖动期间禁掉文本选择：否则用户一按一拖选中的是标题文字，看起来像"拖不动"。 */
body.dsh-home-dragging { user-select: none; cursor: grabbing; }
body.dsh-home-dragging * { cursor: grabbing !important; }
.dsh-w-head, .dsh-focus-eyebrow-row, .dsh-focus-title { user-select: none; }
/* 标题行本身就是拖拽面：用户会先试着拖标题，而不是先找把手。 */
.dsh-drag-surface { cursor: grab; }
.dsh-drag-surface:active { cursor: grabbing; }

.dsh-focus {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 22px 18px;
  border-radius: var(--dsw-radius-xl);
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
}
.dsh-focus-eyebrow-row { display: flex; align-items: center; gap: 8px; }
.dsh-focus-eyebrow-row .dsh-icon-button { margin-left: auto; }
.dsh-focus-eyebrow {
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-focus-title {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-focus-snippet {
  margin: 0;
  font-size: 13px;
  line-height: 21px;
  color: var(--dsw-alias-label-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dsh-focus-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-focus-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.dsh-focus-primary,
.dsh-focus-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  border-radius: var(--dsw-radius-md);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  border: 0.5px solid transparent;
}
.dsh-focus-primary {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.dsh-focus-primary:hover { background: var(--dsw-alias-button-primary-hover); }
.dsh-focus-secondary {
  background: transparent;
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-secondary);
}
.dsh-focus-secondary:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-focus-primary:focus-visible,
.dsh-focus-secondary:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-focus-empty { align-items: flex-start; gap: 8px; }
.dsh-focus-empty-text { margin: 0; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dsh-duo { color: var(--dsw-alias-label-caption); }

.dsh-expand {
  margin-top: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 0.5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-expand:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-expand:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsh-accent));
  outline-offset: 1px;
}
.dsh-edit-bar { margin-top: 12px; }

@media (max-width: 1100px) {
  .dsh-home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dsh-w[data-size="l"] { grid-column: span 2; }
}
@media (max-width: 720px) {
  .dsh-home { padding-right: 16px; padding-left: max(16px, var(--dsh-frame-leading-clearance, 0px)); }
  /* Narrow gutters: the 10px strips still fit inside the 16px padding. */
  .dsh-canvas-grip { width: 8px; }
  .dsh-home-grid { grid-template-columns: minmax(0, 1fr); }
  .dsh-w, .dsh-w[data-size="m"], .dsh-w[data-size="l"] { grid-column: span 1; }
}
`;
		/**
		* 幂等注入样式表（同一个 document 只留一份）。
		* @returns 撤销函数（仅当这次调用真的插入了元素时才移除）
		*/
		function injectStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.getElementById("dsh-home-styles") !== null) return () => {};
			const element = document.createElement("style");
			element.id = STYLE_ID;
			element.textContent = designSystemStyles + CSS$1 + activityStyles + personalStyles + plannerStyles + quickStyles + galleryStyles + libraryStyles + widgetRefinementStyles + widgetExpressionStyles;
			document.head.append(element);
			return () => {
				element.remove();
			};
		}
		//#endregion
		//#region src/client/activity-locales.ts
		const zhActivity = {
			"activity.title": "工作足迹",
			"activity.description": "按浏览器时区查看人工消息记录，通过「筛选范围」选择目录与时间段；不含子代理和自动续轮。",
			"activity.metric": "人工消息",
			"activity.summary": "近 {days} 天 · {active} 天有记录 · {messages} 条消息",
			"activity.activeDays": "天有记录",
			"activity.period": "近 {days} 天",
			"activity.block": "{first} 至 {last}",
			"activity.mon": "一",
			"activity.tue": "二",
			"activity.wed": "三",
			"activity.thu": "四",
			"activity.fri": "五",
			"activity.sat": "六",
			"activity.sun": "日",
			"activity.day": "{date} · {messages} 条人工消息 · {sessions} 个会话",
			"activity.partialDay": "{date} · 已整理 {messages} 条人工消息（历史未完整）",
			"activity.less": "少",
			"activity.more": "多",
			"activity.loading": "正在读取工作足迹…",
			"activity.error": "工作足迹未能读取，请重试。",
			"activity.retry": "重试",
			"activity.indexing": "整理中 {done}/{total}",
			"activity.back": "返回日历",
			"activity.unavailable": "此宿主未提供会话历史，暂时无法统计。",
			"activity.empty": "这段时间还没有人工消息记录。",
			"activity.dateEmpty": "这一天没有对应记录。",
			"activity.dateUnknown": "这一天暂未整理出对应记录；历史尚未完整，不能确认没有活动。",
			"activity.detail": "{date} 的会话",
			"activity.detailCount": "最多显示 100 个，共 {count} 个会话",
			"activity.messages": "{count} 条消息",
			"activity.cwd": "工作目录",
			"activity.all": "全部工作目录",
			"activity.range": "显示范围",
			"activity.auto": "自动",
			"activity.quarter": "12 周",
			"activity.year": "一年"
		};
		const enActivity = {
			"activity.title": "Work footprints",
			"activity.description": "Human messages by browser time zone; use Filter range to choose a directory and period. Excludes subagents and automatic continuation.",
			"activity.metric": "Human messages",
			"activity.summary": "Last {days} days · {active} recorded days · {messages} messages",
			"activity.activeDays": "recorded days",
			"activity.period": "Last {days} days",
			"activity.block": "{first} to {last}",
			"activity.mon": "M",
			"activity.tue": "T",
			"activity.wed": "W",
			"activity.thu": "T",
			"activity.fri": "F",
			"activity.sat": "S",
			"activity.sun": "S",
			"activity.day": "{date} · {messages} human messages · {sessions} sessions",
			"activity.partialDay": "{date} · {messages} indexed human messages (history incomplete)",
			"activity.less": "Less",
			"activity.more": "More",
			"activity.loading": "Loading work footprints…",
			"activity.error": "Could not load work footprints. Please retry.",
			"activity.retry": "Retry",
			"activity.indexing": "Indexing {done}/{total}",
			"activity.back": "Back to calendar",
			"activity.unavailable": "Session history is unavailable on this host.",
			"activity.empty": "No human messages recorded in this period.",
			"activity.dateEmpty": "No matching records for this day.",
			"activity.dateUnknown": "No matching records indexed yet. History is incomplete, so inactivity is not confirmed.",
			"activity.detail": "Sessions on {date}",
			"activity.detailCount": "Showing up to 100 of {count} sessions",
			"activity.messages": "{count} messages",
			"activity.cwd": "Working directory",
			"activity.all": "All working directories",
			"activity.range": "Display range",
			"activity.auto": "Auto",
			"activity.quarter": "12 weeks",
			"activity.year": "1 year"
		};
		//#endregion
		//#region src/client/personal-locales.ts
		/** Merge into the home client's zh/en dictionaries; date locale is explicit UI state. */
		const zhPersonal = {
			"widget.notes.title": "便笺",
			"widget.notes.description": "直接在卡片上写；首行自动作为加粗标题，其余是正文，停笔即保存。",
			"notes.edit": "编辑便笺",
			"notes.empty": "第一行是标题，下面写正文。点一下就能写。",
			"notes.placeholder": "第一行是标题，下面写正文…",
			"notes.limitError": "内容超过 8 KiB，没有保存。请缩短后再试。",
			"notes.saveError": "没能保存这次修改，卡片上仍是草稿；移开焦点时会再试一次。",
			"widget.clock.title": "时钟与日期",
			"widget.clock.description": "时间、日期与一个时区选项；每分钟更新。时区从列表里选，不需要输入。",
			"clock.timeZone": "时区",
			"clock.followBrowser": "跟随浏览器",
			"clock.dateLocale": "zh-CN"
		};
		const enPersonal = {
			"widget.notes.title": "Notes",
			"widget.notes.description": "Write straight on the card; the first line becomes the bold title, the rest is the body, and pausing saves it.",
			"notes.edit": "Edit note",
			"notes.empty": "First line is the title, then the body. Click to write.",
			"notes.placeholder": "First line is the title, then the body…",
			"notes.limitError": "Over 8 KiB, so it was not saved. Shorten it and try again.",
			"notes.saveError": "This edit could not be saved yet; the card keeps it as a draft and retries when you click away.",
			"widget.clock.title": "Clock & date",
			"widget.clock.description": "Time, date and one time-zone option, updated every minute. Pick the zone from a list; no typing.",
			"clock.timeZone": "Time zone",
			"clock.followBrowser": "Follow browser",
			"clock.dateLocale": "en-US"
		};
		//#endregion
		//#region src/client/quick-locales.ts
		/** Merge into the home locale namespace; keys match in both languages. */
		const enQuick = {
			"quick.description": "New sessions, your latest conversation, and up to 8 personal shortcuts through Manage shortcuts.",
			"quick.edit": "Manage shortcuts",
			"quick.hint": "Use Manage shortcuts to add session, web, or working-directory links.",
			"quick.settings.hint": "Up to 8 shortcuts per widget. Working directories open an unsent draft and keep any existing draft; nothing is sent automatically.",
			"quick.settings.empty": "No custom shortcuts yet.",
			"quick.kind": "Destination type",
			"quick.kind.session": "Session",
			"quick.kind.url": "Web address",
			"quick.kind.workdir": "Working directory",
			"quick.label": "Label",
			"quick.target.session": "Session ID",
			"quick.target.url": "HTTP(S) address",
			"quick.target.workdir": "Directory path",
			"quick.placeholder.session": "session-…",
			"quick.placeholder.url": "https://example.com",
			"quick.placeholder.workdir": "/path/to/project",
			"quick.add": "Add shortcut",
			"quick.remove": "Remove",
			"quick.removeLabel": "Remove shortcut {n}",
			"quick.linkNumber": "Shortcut {n}",
			"quick.newLabel": "New shortcut",
			"quick.preparing": "Preparing draft…",
			"quick.actionError": "Could not open this shortcut. Please try again.",
			"quick.sessionMissing": "This session is not in the session directory. Use Manage shortcuts to check the session ID.",
			"quick.workdirUnavailable": "Working-directory drafts are unavailable in this host.",
			"quick.error.config": "Invalid shortcut configuration.",
			"quick.error.limit": "Use at most 8 shortcuts.",
			"quick.error.kind": "Choose a session, web address, or working directory.",
			"quick.error.label": "Enter a label of at most 80 characters without control characters.",
			"quick.error.url": "Enter an absolute HTTP(S) address without credentials, spaces, or control characters.",
			"quick.error.session": "Enter a session ID of at most 200 letters, digits, dots, hyphens, or underscores.",
			"quick.error.workdir": "Enter a local directory path of at most 4096 characters, not a URL or network share."
		};
		const zhQuick = {
			"quick.description": "新建会话、回到上次会话，并通过「管理入口」维护最多 8 个自定义快捷入口。",
			"quick.edit": "管理入口",
			"quick.hint": "点击「管理入口」，添加会话、网页或工作目录入口。",
			"quick.settings.hint": "每个组件最多 8 个入口。工作目录只打开未发送草稿并保留已有草稿，不会自动发送。",
			"quick.settings.empty": "还没有自定义入口。",
			"quick.kind": "目标类型",
			"quick.kind.session": "会话",
			"quick.kind.url": "网页",
			"quick.kind.workdir": "工作目录",
			"quick.label": "标签",
			"quick.target.session": "会话 ID",
			"quick.target.url": "HTTP(S) 地址",
			"quick.target.workdir": "目录路径",
			"quick.placeholder.session": "session-…",
			"quick.placeholder.url": "https://example.com",
			"quick.placeholder.workdir": "/path/to/project",
			"quick.add": "添加入口",
			"quick.remove": "移除",
			"quick.removeLabel": "移除第 {n} 个入口",
			"quick.linkNumber": "入口 {n}",
			"quick.newLabel": "新入口",
			"quick.preparing": "正在准备草稿…",
			"quick.actionError": "无法打开此入口，请重试。",
			"quick.sessionMissing": "会话目录中没有此会话，请点击「管理入口」核对会话 ID。",
			"quick.workdirUnavailable": "当前宿主不支持工作目录草稿。",
			"quick.error.config": "快捷入口配置无效。",
			"quick.error.limit": "最多添加 8 个入口。",
			"quick.error.kind": "请选择会话、网页或工作目录。",
			"quick.error.label": "请输入不含控制字符且不超过 80 个字符的标签。",
			"quick.error.url": "请输入完整的 HTTP(S) 地址，不含账号密码、空白或控制字符。",
			"quick.error.session": "会话 ID 只支持字母、数字、点、连字符或下划线，最多 200 个字符。",
			"quick.error.workdir": "请输入不超过 4096 个字符的本地目录路径，不支持网址或网络共享路径。"
		};
		//#endregion
		//#region src/client/gallery-locales.ts
		const zhGallery = {
			"gallery.description.pinned": "按原生置顶顺序列出全部置顶会话，点击继续。",
			"library.edit": "编辑内容",
			"library.close": "关闭组件库",
			"library.hint": "拖动卡片到桌面即可添加。悬停稳定 0.5 秒让位，Esc 取消；拖动本窗口标题可移动，双击复位。",
			"library.move": "移动窗口",
			"library.moveHint": "拖动标题移动窗口，双击复位位置",
			"gallery.description.recent": "跨工作目录找回最近的会话。",
			"gallery.description.tasks": "预填常用任务草稿，由你确认发送。",
			"gallery.description.today": "用时间带回顾今天的在场活动。",
			"gallery.description.running": "查看当前正在运行的会话。",
			"gallery.description.areas": "看看今天在哪些工作目录投入时间。",
			"gallery.description.rhythm": "近两周每日活跃时长的变化。",
			"gallery.description.resume": "带着上次的上下文继续工作。",
			"gallery.description.queue": "集中查看需要你处理的会话。",
			"gallery.addTab": "添加小组件",
			"gallery.desktopTab": "桌面组件",
			"gallery.search": "搜索小组件",
			"gallery.filter": "按来源筛选",
			"gallery.all": "全部",
			"gallery.builtin": "内置",
			"gallery.extension": "扩展",
			"gallery.count": "{shown} / {total} 个组件",
			"gallery.sample": "效果示例",
			"gallery.noPreview": "此扩展暂未提供效果预览",
			"gallery.defaultDescription": "添加到桌面后可独立移动，尺寸固定。",
			"gallery.noMatch": "没有找到匹配的小组件",
			"gallery.trySearch": "试试其他名称、来源或关键词。",
			"gallery.clear": "清除筛选",
			"gallery.hint": "先看效果，再添加到桌面。预览使用示例内容，不会运行任务。",
			"gallery.sample.noteTitle": "下次从这里开始",
			"gallery.sample.noteText": "记住关键思路，回来继续。",
			"gallery.sample.date": "1 月 27 日 星期一",
			"gallery.sample.project": "项目工作台",
			"gallery.sample.continue": "回到上次停下的地方",
			"gallery.sample.review": "审查改动",
			"gallery.sample.plan": "整理下一步",
			"gallery.sample.duration": "1 小时 24 分钟"
		};
		const enGallery = {
			"gallery.description.pinned": "All native pinned sessions in pin order. Select one to continue.",
			"library.edit": "Edit content",
			"library.close": "Close widget library",
			"library.hint": "Drag a card onto the desktop to add it. Hold 0.5s to make room; Esc cancels. Drag this title to move the window; double-click to reset.",
			"library.move": "Move window",
			"library.moveHint": "Drag the title to move this window, double-click to reset",
			"gallery.description.recent": "Find recent conversations across working directories.",
			"gallery.description.tasks": "Prepare a task draft, then review and send yourself.",
			"gallery.description.today": "Review today’s activity on a timeline.",
			"gallery.description.running": "See which sessions are running right now.",
			"gallery.description.areas": "See where you spent time across working directories.",
			"gallery.description.rhythm": "Daily activity over the last two weeks.",
			"gallery.description.resume": "Continue with the context you left behind.",
			"gallery.description.queue": "See the conversations that need your attention.",
			"gallery.addTab": "Add widgets",
			"gallery.desktopTab": "On desktop",
			"gallery.search": "Search widgets",
			"gallery.filter": "Filter by source",
			"gallery.all": "All",
			"gallery.builtin": "Built-in",
			"gallery.extension": "Extensions",
			"gallery.count": "{shown} / {total} widgets",
			"gallery.sample": "Sample preview",
			"gallery.noPreview": "This extension has no preview yet",
			"gallery.defaultDescription": "Add to your desktop and move independently at a fixed size.",
			"gallery.noMatch": "No matching widgets",
			"gallery.trySearch": "Try another name, source, or keyword.",
			"gallery.clear": "Clear filters",
			"gallery.hint": "Preview first, then add to your desktop. Samples do not run tasks.",
			"gallery.sample.noteTitle": "Start here next time",
			"gallery.sample.noteText": "Keep the key idea, then pick up where you left off.",
			"gallery.sample.date": "Monday, January 27",
			"gallery.sample.project": "Project workspace",
			"gallery.sample.continue": "Pick up where you left off",
			"gallery.sample.review": "Review changes",
			"gallery.sample.plan": "Plan the next step",
			"gallery.sample.duration": "1h 24m"
		};
		//#endregion
		//#region src/client/planner-locales.ts
		/** 计划/日程类组件的文案（zh 是键集事实来源）。 */
		const zhPlanner = {
			"widget.todo.title": "待办",
			"widget.plan.title": "今日计划",
			"widget.calendar.title": "日程",
			"widget.habit.title": "打卡",
			"gallery.description.todo": "按今天、本周、无日期分组的待办清单；勾选与日程、计划表同步。",
			"gallery.description.plan": "今天的时间轴：有时间的排成块，没时间的挂「待安排」。",
			"gallery.description.calendar": "月视图 + 当天条目；点某天可以直接新建。",
			"gallery.description.habit": "今天该做的习惯，点一下打点，右侧是连续天数。",
			"plan.today": "今天",
			"plan.tomorrow": "明天",
			"plan.yesterday": "昨天",
			"planner.loading": "正在读取…",
			"planner.retry": "重试",
			"planner.unavailable": "计划数据不可用",
			"planner.emptyList": "还没有内容",
			"planner.add": "添加",
			"planner.saveError": "没能保存，请重试",
			"planner.field.title": "标题",
			"planner.field.titlePlaceholder": "要做什么？",
			"planner.field.day": "日期",
			"planner.field.start": "开始",
			"planner.field.end": "结束",
			"planner.field.note": "备注",
			"planner.field.priority": "优先级",
			"planner.priority.0": "普通",
			"planner.priority.1": "重要",
			"planner.priority.2": "紧急",
			"planner.action.save": "保存",
			"planner.action.cancel": "取消",
			"planner.action.delete": "删除",
			"planner.action.edit": "编辑",
			"planner.action.mark": "打点",
			"planner.action.unmark": "取消打点",
			"planner.error.title": "标题不能为空",
			"planner.error.dayRequired": "有时间就必须有日期",
			"planner.error.startRequired": "结束时间需要开始时间",
			"planner.error.endAfterStart": "结束要晚于开始",
			"planner.error.tooMany": "条目已达上限",
			"todo.group.today": "今天",
			"todo.group.week": "本周",
			"todo.group.later": "更远",
			"todo.group.undated": "无日期",
			"todo.group.done": "已完成",
			"todo.addPlaceholder": "加一条今天要做的事，回车保存",
			"todo.empty": "今天还没有待办",
			"todo.showDone": "显示已完成",
			"todo.hideDone": "隐藏已完成",
			"todo.completed": "{count} 项已完成",
			"todo.openCount": "{count} 项未完成",
			"plan.empty": "今天还没有安排",
			"plan.emptyHint": "添加一条，或在日程里点某一天",
			"plan.unscheduled": "待安排",
			"plan.now": "现在",
			"plan.addAt": "在这个时段添加",
			"calendar.prev": "上个月",
			"calendar.next": "下个月",
			"calendar.today": "回到今天",
			"calendar.empty": "这天还没有安排",
			"calendar.back": "返回月视图",
			"calendar.addOn": "在 {day} 添加",
			"calendar.doneHint": "已完成",
			"calendar.weekday.1": "一",
			"calendar.weekday.2": "二",
			"calendar.weekday.3": "三",
			"calendar.weekday.4": "四",
			"calendar.weekday.5": "五",
			"calendar.weekday.6": "六",
			"calendar.weekday.7": "日",
			"habit.empty": "还没有习惯",
			"habit.addPlaceholder": "例如：跑步",
			"habit.streak": "连续 {count} 天",
			"habit.noStreak": "还没开始",
			"habit.everyday": "每天",
			"habit.weekdays": "每周 {days}",
			"habit.todayDone": "今天已打卡",
			"habit.todayOpen": "今天还没打卡",
			"habit.delete": "删除习惯",
			"widget.timer.title": "计时器",
			"widget.pomodoro.title": "番茄钟",
			"widget.countdown.title": "倒计时",
			"gallery.description.timer": "倒计时圆盘：没启动时拖动圆环设定时长，中间是剩余时间；启动后只有 Pause / Reset。",
			"gallery.description.pomodoro": "25 分钟专注 + 5 分钟休息，今日完成轮数；独立的，不挂会话。",
			"gallery.description.countdown": "多个目标日期里最近的一个，显示还剩几天几小时。",
			"timer.start": "开始",
			"timer.pause": "暂停",
			"timer.resume": "继续",
			"timer.reset": "归零",
			"timer.dial": "倒计时圆盘",
			"timer.presets": "快捷时长",
			"timer.preset": "{n} 分",
			"timer.minutes": "{n} 分钟",
			"timer.restart": "重新开始",
			"timer.reached": "到点",
			"timer.readOnly": "只读",
			"timer.writeFailed": "未能保存",
			"timer.writeHint": "宿主没有接受这次写入；重启 DSH 后再试。",
			"pomodoro.focus": "专注",
			"pomodoro.break": "休息",
			"pomodoro.rounds": "今天 {count} 轮",
			"pomodoro.start": "开始专注",
			"pomodoro.skip": "跳过",
			"countdown.title": "标题",
			"countdown.date": "日期",
			"countdown.add": "添加目标",
			"countdown.remove": "删除目标",
			"countdown.hint": "最多 {max} 个；只显示最近的一个未到期目标。",
			"countdown.empty": "还没有倒计时目标",
			"countdown.pickOne": "所有目标都已到期",
			"countdown.expired": "已到期",
			"countdown.days": "天",
			"countdown.hours": "小时",
			"countdown.addHint": "在设置里添加一个日期",
			"countdown.settings": "倒计时选项",
			"widget.usage.title": "Token 用量",
			"gallery.description.usage": "今天用了多少 token、最近七天走势、缓存命中率与输出速率。",
			"usage.today": "今日",
			"usage.unit": "tokens",
			"usage.input": "输入",
			"usage.output": "输出",
			"usage.cache": "缓存",
			"usage.hit": "命中",
			"usage.rate": "速率",
			"usage.perSecond": "tok/s",
			"usage.week": "最近七天",
			"usage.weekTotal": "七天合计",
			"usage.loading": "正在读取用量…",
			"usage.split": "输入 / 缓存 / 输出的构成",
			"usage.sevenDays": "7 天",
			"widget.quote.title": "一句话",
			"widget.picture.title": "图片",
			"gallery.description.quote": "内置语录按日期轮换，也可以换成自己的清单；不联网。",
			"gallery.description.picture": "一张图 + 可选标题；支持 http(s) 地址与本地路径。",
			"quote.daily": "每天一句",
			"quote.lines": "自定义清单（每行一句）",
			"quote.placeholder": "留空则使用内置语录",
			"quote.hint": "最多 {max} 行；按日期确定性取一句，同一天不会变。",
			"quote.settings": "语录选项",
			"picture.src": "来源",
			"picture.titleField": "标题",
			"picture.alt": "图片",
			"picture.fit": "填充方式",
			"picture.fitCover": "裁剪填满",
			"picture.fitContain": "完整显示",
			"picture.empty": "还没有选图片",
			"picture.failed": "图片加载失败",
			"picture.hint": "http(s) 地址直接加载；本地路径由宿主读取（仅 png / jpg / webp / gif / avif，≤ 20 MB）。",
			"picture.settings": "图片选项",
			"widget.balance.title": "余额",
			"gallery.description.balance": "DeepSeek 平台账户余额；key 只在宿主侧使用，失败时不显示旧值。",
			"balance.title": "账户余额",
			"balance.notConfigured": "未配置 API key",
			"balance.unavailable": "暂不可用",
			"balance.timeout": "请求超时",
			"balance.loading": "正在查询…",
			"balance.idle": "还没查过",
			"balance.query": "查询余额",
			"balance.refresh": "刷新",
			"balance.toppedUp": "充值",
			"balance.granted": "赠送"
		};
		const enPlanner = {
			"widget.todo.title": "To-do",
			"widget.plan.title": "Today",
			"widget.calendar.title": "Calendar",
			"widget.habit.title": "Habits",
			"gallery.description.todo": "To-dos grouped by today, this week and undated; stays in sync with the plan and calendar.",
			"gallery.description.plan": "Today's timeline: timed work becomes blocks, the rest waits below.",
			"gallery.description.calendar": "Month grid plus the selected day; add something on any day.",
			"gallery.description.habit": "Today's habits with a one-tap mark and a streak count.",
			"plan.today": "Today",
			"plan.tomorrow": "Tomorrow",
			"plan.yesterday": "Yesterday",
			"planner.loading": "Loading…",
			"planner.retry": "Retry",
			"planner.unavailable": "Plan data unavailable",
			"planner.emptyList": "Nothing yet",
			"planner.add": "Add",
			"planner.saveError": "Could not save; try again",
			"planner.field.title": "Title",
			"planner.field.titlePlaceholder": "What needs doing?",
			"planner.field.day": "Date",
			"planner.field.start": "Start",
			"planner.field.end": "End",
			"planner.field.note": "Note",
			"planner.field.priority": "Priority",
			"planner.priority.0": "Normal",
			"planner.priority.1": "Important",
			"planner.priority.2": "Urgent",
			"planner.action.save": "Save",
			"planner.action.cancel": "Cancel",
			"planner.action.delete": "Delete",
			"planner.action.edit": "Edit",
			"planner.action.mark": "Mark",
			"planner.action.unmark": "Unmark",
			"planner.error.title": "A title is required",
			"planner.error.dayRequired": "A time needs a date",
			"planner.error.startRequired": "An end needs a start",
			"planner.error.endAfterStart": "The end must be after the start",
			"planner.error.tooMany": "The list is full",
			"todo.group.today": "Today",
			"todo.group.week": "This week",
			"todo.group.later": "Later",
			"todo.group.undated": "Undated",
			"todo.group.done": "Done",
			"todo.addPlaceholder": "Add something for today, press Enter",
			"todo.empty": "Nothing for today",
			"todo.showDone": "Show finished",
			"todo.hideDone": "Hide finished",
			"todo.completed": "{count} finished",
			"todo.openCount": "{count} open",
			"plan.empty": "Nothing planned today",
			"plan.emptyHint": "Add one here, or pick a day in the calendar",
			"plan.unscheduled": "Unscheduled",
			"plan.now": "Now",
			"plan.addAt": "Add in this slot",
			"calendar.prev": "Previous month",
			"calendar.next": "Next month",
			"calendar.today": "Back to today",
			"calendar.empty": "Nothing on this day",
			"calendar.back": "Back to the month",
			"calendar.addOn": "Add on {day}",
			"calendar.doneHint": "Finished",
			"calendar.weekday.1": "M",
			"calendar.weekday.2": "T",
			"calendar.weekday.3": "W",
			"calendar.weekday.4": "T",
			"calendar.weekday.5": "F",
			"calendar.weekday.6": "S",
			"calendar.weekday.7": "S",
			"habit.empty": "No habits yet",
			"habit.addPlaceholder": "e.g. Run",
			"habit.streak": "{count}-day streak",
			"habit.noStreak": "Not started",
			"habit.everyday": "Every day",
			"habit.weekdays": "Weekly on {days}",
			"habit.todayDone": "Marked today",
			"habit.todayOpen": "Not marked yet",
			"habit.delete": "Delete habit",
			"widget.timer.title": "Timer",
			"widget.pomodoro.title": "Pomodoro",
			"widget.countdown.title": "Countdown",
			"gallery.description.timer": "Countdown dial: drag the ring to set the duration, the centre shows the time left; after starting only Pause / Reset remain.",
			"gallery.description.pomodoro": "25 minutes of focus plus a 5-minute break, with today's rounds; standalone.",
			"gallery.description.countdown": "The nearest of several target dates, in days and hours.",
			"timer.start": "Start",
			"timer.pause": "Pause",
			"timer.resume": "Resume",
			"timer.reset": "Reset",
			"timer.dial": "Countdown dial",
			"timer.presets": "Quick durations",
			"timer.preset": "{n}m",
			"timer.minutes": "{n} minutes",
			"timer.restart": "Start over",
			"timer.reached": "Time is up",
			"timer.readOnly": "Read only",
			"timer.writeFailed": "Not saved",
			"timer.writeHint": "The host did not accept this write. Restart DSH and try again.",
			"pomodoro.focus": "Focus",
			"pomodoro.break": "Break",
			"pomodoro.rounds": "{count} rounds today",
			"pomodoro.start": "Start focus",
			"pomodoro.skip": "Skip",
			"countdown.title": "Title",
			"countdown.date": "Date",
			"countdown.add": "Add target",
			"countdown.remove": "Remove target",
			"countdown.hint": "Up to {max}; only the nearest unexpired target is shown.",
			"countdown.empty": "No countdown yet",
			"countdown.pickOne": "Every target has passed",
			"countdown.expired": "Passed",
			"countdown.days": "days",
			"countdown.hours": "hours",
			"countdown.addHint": "Add a date in the options",
			"countdown.settings": "Countdown options",
			"widget.usage.title": "Tokens",
			"gallery.description.usage": "Tokens used today, the last seven days, cache hit rate and output speed.",
			"usage.today": "today",
			"usage.unit": "tokens",
			"usage.input": "in",
			"usage.output": "out",
			"usage.cache": "cached",
			"usage.hit": "hit",
			"usage.rate": "rate",
			"usage.perSecond": "tok/s",
			"usage.week": "Last seven days",
			"usage.weekTotal": "seven-day total",
			"usage.loading": "Loading usage…",
			"usage.split": "Input, cache and output split",
			"usage.sevenDays": "7d",
			"widget.quote.title": "Quote",
			"widget.picture.title": "Picture",
			"gallery.description.quote": "A built-in line that rotates by date, or your own list; offline.",
			"gallery.description.picture": "One image plus an optional caption; http(s) or a local path.",
			"quote.daily": "One a day",
			"quote.lines": "Your list (one per line)",
			"quote.placeholder": "Leave empty to use the built-in lines",
			"quote.hint": "Up to {max} lines; picked deterministically by date, so it stays put all day.",
			"quote.settings": "Quote options",
			"picture.src": "Source",
			"picture.titleField": "Caption",
			"picture.alt": "Picture",
			"picture.fit": "Fit",
			"picture.fitCover": "Crop to fill",
			"picture.fitContain": "Show all",
			"picture.empty": "No picture chosen",
			"picture.failed": "The picture failed to load",
			"picture.hint": "http(s) loads directly; a local path is read by the host (png / jpg / webp / gif / avif, up to 20 MB).",
			"picture.settings": "Picture options",
			"widget.balance.title": "Balance",
			"gallery.description.balance": "The DeepSeek platform balance; the key stays on the host and failures show nothing stale.",
			"balance.title": "Account balance",
			"balance.notConfigured": "No API key configured",
			"balance.unavailable": "Unavailable",
			"balance.timeout": "The request timed out",
			"balance.loading": "Checking…",
			"balance.idle": "Not checked yet",
			"balance.query": "Check balance",
			"balance.refresh": "Refresh",
			"balance.toppedUp": "Topped up",
			"balance.granted": "Granted"
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* 首页文案字典（客户端）。键一律点分小写、至少两段——官方门禁靠这个形状把
		* `t('label.x')` 认作键，一段式会被当成文案。
		*
		* @module @vlln/dsh-home/client/locales
		*/
		/** 中文文案（键集的事实来源）。 */
		const zh = {
			...zhActivity,
			...zhPersonal,
			...zhQuick,
			...zhGallery,
			...zhPlanner,
			"workbench.loading": "正在加载桌面配置…",
			"workbench.readOnly": "桌面配置当前为只读，已停用所有编辑操作。原始数据会保留。",
			"workbench.writeError": "桌面配置未能保存；编辑仍保留，请重试保存。",
			"widget.unavailable": "小组件不可用（{typeId}）。配置和位置已保留。",
			"manager.directory": "可添加的小组件",
			"manager.codeOnly": "扩展由已安装的代码插件注册；此处不执行文本或远程脚本。",
			"manager.instances": "桌面上的小组件",
			"manager.source": "来源：{source}",
			"manager.add": "添加",
			"manager.duplicate": "复制",
			"manager.settings": "设置",
			"manager.deleteConfirm": "删除「{title}」及其配置？",
			"action.compact": "整理布局",
			"action.compactHint": "保留组件和尺寸，向左上方紧密排列；仅整理当前屏幕布局。",
			"manager.error": "未能更新小组件，请重试。",
			"settings.title": "设置：{title}",
			"settings.cancel": "取消",
			"settings.save": "保存",
			"settings.invalid": "配置无效，请检查后重试。",
			"settings.saveError": "配置未能保存，草稿已保留，请重试。",
			"settings.renderError": "设置界面未能显示；现有配置未改变。",
			"settings.unavailable": "此小组件的设置当前不可用，现有配置未改变。",
			"edit.mode": "正在编辑桌面",
			"edit.saving": "正在保存…",
			"edit.saveError": "布局未能保存，请点完成重试。",
			"edit.keyboard": "把手聚焦后用方向键逐格移动，按 Delete 删除组件（需确认）；组件尺寸固定，Esc 先取消移动，再退出编辑。",
			"edit.deleteZone": "拖到这里删除组件",
			"edit.deleteZoneArmed": "松手即删除",
			"canvas.width": "画布宽度",
			"canvas.widthLeft": "画布宽度（左边缘）",
			"canvas.widthRight": "画布宽度（右边缘）",
			"canvas.widthHint": "拖动改变画布宽度；方向键微调，双击恢复默认。只影响整个画布的宽度，不改变任何组件的尺寸或位置。",
			"edit.resize": "调整{title}的尺寸",
			"edit.resizeHint": "拖动以吸附到组件允许的尺寸；方向键切换，Esc 取消",
			"edit.presetLabel": "{title}：网格尺寸",
			"edit.presetLegacy": "原有尺寸 {w} × {h}",
			"edit.presetBlocked": "此尺寸在当前位置放不下，或布局已变化。请先移动组件，再拖动缩放；原布局未改变。",
			"widget.pinned.title": "置顶会话",
			"pinned.count": "{count} 个置顶会话",
			"pinned.visible": "显示 {shown} / {total} 个",
			"pinned.order": "最近置顶在前",
			"pinned.empty": "还没有置顶会话",
			"pinned.hint": "在原生侧栏的会话菜单中置顶，会自动显示在这里。",
			"pinned.loading": "正在加载原生置顶会话…",
			"pinned.error": "原生置顶状态暂时无法同步，连接恢复后会自动更新。",
			"pinned.unavailable": "此宿主未提供原生置顶会话服务。",
			"widget.recent.title": "最近活跃会话",
			"recent.search": "搜索标题、目录或会话 ID",
			"recent.cwd": "工作目录",
			"recent.allCwds": "全部工作目录",
			"recent.unknownCwd": "工作目录未知",
			"recent.untitled": "未命名会话",
			"recent.unknownActivity": "活动时间未知",
			"recent.status.approval": "待审批",
			"recent.status.plan": "待审阅计划",
			"recent.status.question": "待回答",
			"recent.status.running": "运行中",
			"recent.status.unread": "已完成，未读",
			"recent.status.idle": "空闲",
			"recent.status.unknown": "状态未知",
			"recent.empty": "还没有会话",
			"recent.noMatch": "没有匹配的会话",
			"recent.indexing": "正在整理会话…",
			"recent.count": "最近 {shown} / {total} 个会话",
			"empty.noMoreWidgets": "没有其他可见组件，可在组件清单中恢复。",
			"panel.title": "首页",
			"panel.today": "今天 {dur}",
			"panel.notStarted": "今天还没开始",
			"panel.since": "自上次以来 {count} 个会话有新动静",
			"queue.approval": "等你审批",
			"queue.plan": "等你确认计划",
			"queue.question": "等你回答",
			"queue.done": "跑完了，还没看",
			"queue.dismiss": "标记为已看过",
			"today.progress": "正在整理 {done}/{total}",
			"expand.show": "更多数据与小组件（{count}）",
			"expand.hide": "收起",
			"error.card": "这张卡没能渲染出来",
			"action.newSession": "新会话",
			"action.widgets": "小组件",
			"action.widgetsCount": "小组件（{count} 隐藏）",
			"action.resetConfirm": "确认恢复默认？",
			"action.refresh": "刷新",
			"tray.title": "小组件",
			"tray.hint": "点一下显示 / 隐藏",
			"tray.show": "显示",
			"tray.hide": "隐藏",
			"empty.restore": "全部显示",
			"action.edit": "编辑布局",
			"action.done": "完成",
			"action.reset": "恢复默认",
			"action.back": "返回会话",
			"action.rescan": "重建账本",
			"summary.scanning": "正在扫描历史会话…",
			"summary.updated": "账本更新于 {time}",
			"widget.today.title": "今天",
			"widget.today.run": "agent 运行 {dur}",
			"widget.today.waiting": "其余时间在等你在想",
			"widget.today.focused": "活动时长",
			"widget.today.sessionsLabel": "会话",
			"widget.today.turnsLabel": "轮",
			"widget.today.runLabel": "Agent 运行",
			"widget.today.stats": "{sessions} 个会话 · {turns} 轮",
			"widget.today.longest": "最长一段 {dur}",
			"widget.today.empty": "今天还没开始——按 {shortcut} 开一个新会话",
			"widget.sessionStatus.title": "会话状态",
			"sessionStatus.description": "按状态看会话：在跑 / 在等你 / 未读。点顶部的状态切换视图，选择会记在这张卡上。",
			"sessionStatus.filter": "会话状态筛选",
			"sessionStatus.group.running": "在跑",
			"sessionStatus.group.waiting": "在等你",
			"sessionStatus.group.done": "未读",
			"sessionStatus.empty.running": "现在没有在跑的会话",
			"sessionStatus.empty.waiting": "没有在等你的会话",
			"sessionStatus.empty.done": "没有未读结果",
			"sessionStatus.noStatus": "当前宿主没有提供会话状态，只能看到在跑的会话。",
			"widget.areas.title": "今天按工作区",
			"widget.areas.empty": "今天还没有工作区活动",
			"widget.rhythm.empty": "还没有足够的数据",
			"widget.areas.row": "{dur} · {sessions} 个会话",
			"widget.areas.others": "其他 {count} 个工作区",
			"widget.empty.action": "开个新会话",
			"widget.rhythm.title": "近两周",
			"widget.active.title": "最近活跃",
			"gallery.description.active": "最近一段时间每天投入的时长；顶部切换 7 天 / 14 天 / 30 天，切换的是同一个量的窗口。悬停或聚焦柱子看当天详情。",
			"active.range": "统计窗口",
			"active.7d": "7 天",
			"active.14d": "14 天",
			"active.30d": "30 天",
			"active.total": "{range}的活跃时长",
			"active.chart": "每日活跃时长",
			"widget.rhythm.totalLabel": "合计",
			"widget.rhythm.peak": "最高 {dur}（{day}）",
			"widget.quick.title": "快捷",
			"widget.quick.new": "开个新会话",
			"widget.quick.resume": "回到上次会话",
			"widget.quick.hint": "点左上角的 logo 随时回到这一页",
			"widget.unknown": "未命名小组件",
			"edit.hint": "停留约 0.5 秒沿碰撞轴撑开：上面的向上、下面的向下，左右同理。同排同列不重排，Esc 取消。",
			"edit.size.s": "小",
			"edit.size.m": "中",
			"edit.size.l": "大",
			"edit.size": "尺寸：{size}",
			"edit.hide": "隐藏这张卡",
			"edit.moveUp": "前移",
			"edit.moveDown": "后移",
			"edit.drag": "拖动排序",
			"empty.noWidgets": "还没有小组件",
			"error.load": "数据没能加载出来",
			"error.retry": "重试",
			"time.justNow": "刚刚",
			"time.now": "刚刚",
			"time.minutes": "{n}分钟",
			"time.hours": "{n}小时",
			"time.days": "{n}天",
			"time.months": "{n}个月",
			"time.years": "{n}年",
			"time.minutesAgo": "{n} 分钟前",
			"time.hoursAgo": "{n} 小时前",
			"time.daysAgo": "{n} 天前",
			"dur.none": "0 分钟",
			"dur.lessThanMinute": "<1 分钟",
			"dur.minutes": "{n} 分钟",
			"dur.hours": "{h} 小时",
			"dur.hoursMinutes": "{h} 小时 {m} 分",
			"unit.unknown": "未知",
			"aria.widget": "小组件 {title}",
			"aria.actions": "首页操作",
			"aria.band": "今天的活跃时间带",
			"aria.rhythm": "近两周每日活跃时长"
		};
		/** 英文文案（键集必须与 {@link zh} 完全相同）。 */
		const en = {
			...enActivity,
			...enPersonal,
			...enQuick,
			...enGallery,
			...enPlanner,
			"workbench.loading": "Loading workspace configuration…",
			"workbench.readOnly": "Workspace configuration is read-only. All editing is disabled; original data is preserved.",
			"workbench.writeError": "Could not save workspace configuration. Your edits are retained; retry saving.",
			"widget.unavailable": "Widget unavailable ({typeId}). Its configuration and position are preserved.",
			"manager.directory": "Available widgets",
			"manager.codeOnly": "Extensions are registered by installed code plugins. This directory does not execute text or remote scripts.",
			"manager.instances": "Widgets on your workspace",
			"manager.source": "Source: {source}",
			"manager.add": "Add",
			"manager.duplicate": "Duplicate",
			"manager.settings": "Settings",
			"manager.deleteConfirm": "Delete “{title}” and its configuration?",
			"action.compact": "Tidy layout",
			"action.compactHint": "Keep widgets and sizes; pack toward the top left in this screen layout only.",
			"manager.error": "Could not update the widget. Please retry.",
			"settings.title": "Settings: {title}",
			"settings.cancel": "Cancel",
			"settings.save": "Save",
			"settings.invalid": "Invalid configuration. Check your changes and retry.",
			"settings.saveError": "Could not save configuration. Your draft is retained; please retry.",
			"settings.renderError": "Could not display settings. Existing configuration has not changed.",
			"settings.unavailable": "Settings for this widget are unavailable. Existing configuration has not changed.",
			"edit.mode": "Editing your workspace",
			"edit.saving": "Saving…",
			"edit.saveError": "Could not save the layout. Select Done to retry.",
			"edit.keyboard": "Focus a move grip and use arrow keys to move one cell; press Delete to remove the widget (confirmation required). Widget sizes are fixed. Esc cancels a move first, then finishes editing.",
			"edit.deleteZone": "Drag here to delete",
			"edit.deleteZoneArmed": "Release to delete",
			"canvas.width": "Canvas width",
			"canvas.widthLeft": "Canvas width (left edge)",
			"canvas.widthRight": "Canvas width (right edge)",
			"canvas.widthHint": "Drag to change the canvas width; arrow keys fine-tune, double-click restores the default. This changes the board width only, never a widget size or position.",
			"edit.resize": "Resize {title}",
			"edit.resizeHint": "Drag to snap to allowed widget sizes; arrow keys to switch, Esc to cancel",
			"edit.presetLabel": "{title}: grid size",
			"edit.presetLegacy": "Original size {w} × {h}",
			"edit.presetBlocked": "This size does not fit here, or the layout changed. Move the widget first, then resize it. The original layout is unchanged.",
			"widget.pinned.title": "Pinned sessions",
			"pinned.count": "{count} pinned",
			"pinned.visible": "{shown} of {total} shown",
			"pinned.order": "Most recently pinned first",
			"pinned.empty": "No pinned sessions yet",
			"pinned.hint": "Pin a session from its native sidebar menu to show it here automatically.",
			"pinned.loading": "Loading native pinned sessions…",
			"pinned.error": "Native pins cannot sync right now. They will update when the connection recovers.",
			"pinned.unavailable": "This host does not provide the native pinned session service.",
			"widget.recent.title": "Recent sessions",
			"recent.search": "Search title, directory or session ID",
			"recent.cwd": "Working directory",
			"recent.allCwds": "All working directories",
			"recent.unknownCwd": "Unknown working directory",
			"recent.untitled": "Untitled session",
			"recent.unknownActivity": "Activity time unknown",
			"recent.status.approval": "Awaiting approval",
			"recent.status.plan": "Awaiting plan review",
			"recent.status.question": "Awaiting answer",
			"recent.status.running": "Running",
			"recent.status.unread": "Completed, unread",
			"recent.status.idle": "Idle",
			"recent.status.unknown": "Status unknown",
			"recent.empty": "No sessions yet",
			"recent.noMatch": "No matching sessions",
			"recent.indexing": "Indexing sessions…",
			"recent.count": "Latest {shown} of {total} sessions",
			"empty.noMoreWidgets": "No other visible widgets. Restore them from the widget list.",
			"panel.title": "Home",
			"panel.today": "{dur} today",
			"panel.notStarted": "Nothing today yet",
			"panel.since": "{count} sessions since your last visit",
			"queue.approval": "needs approval",
			"queue.plan": "plan to confirm",
			"queue.question": "needs an answer",
			"queue.done": "finished, unread",
			"queue.dismiss": "Mark as seen",
			"today.progress": "indexing {done}/{total}",
			"expand.show": "More data and widgets ({count})",
			"expand.hide": "Collapse",
			"error.card": "This card failed to render",
			"action.newSession": "New session",
			"action.widgets": "Widgets",
			"action.widgetsCount": "Widgets ({count} hidden)",
			"action.resetConfirm": "Confirm reset?",
			"action.refresh": "Refresh",
			"tray.title": "Widgets",
			"tray.hint": "Click to show or hide",
			"tray.show": "Show",
			"tray.hide": "Hide",
			"empty.restore": "Show all",
			"action.edit": "Edit layout",
			"action.done": "Done",
			"action.reset": "Reset",
			"action.back": "Back to conversation",
			"action.rescan": "Rebuild ledger",
			"summary.scanning": "Scanning session history…",
			"summary.updated": "Ledger updated {time}",
			"widget.today.title": "Today",
			"widget.today.run": "Agent ran {dur}",
			"widget.today.waiting": "The rest was waiting on you",
			"widget.today.focused": "Activity time",
			"widget.today.sessionsLabel": "Sessions",
			"widget.today.turnsLabel": "Turns",
			"widget.today.runLabel": "Agent runtime",
			"widget.today.stats": "{sessions} sessions · {turns} turns",
			"widget.today.longest": "Longest stretch {dur}",
			"widget.today.empty": "Nothing yet today — press {shortcut} to start",
			"widget.sessionStatus.title": "Session status",
			"sessionStatus.description": "Sessions by state: running / waiting on you / unread. Click a state at the top to switch the view; the choice is saved on this card.",
			"sessionStatus.filter": "Session state filter",
			"sessionStatus.group.running": "Running",
			"sessionStatus.group.waiting": "Waiting",
			"sessionStatus.group.done": "Unread",
			"sessionStatus.empty.running": "Nothing is running right now",
			"sessionStatus.empty.waiting": "Nothing is waiting on you",
			"sessionStatus.empty.done": "No unread results",
			"sessionStatus.noStatus": "This host does not provide session state; only running sessions are shown.",
			"widget.areas.title": "Today by workspace",
			"widget.areas.empty": "No workspace activity today",
			"widget.rhythm.empty": "Not enough data yet",
			"widget.areas.row": "{dur} · {sessions} sessions",
			"widget.areas.others": "Other {count} workspaces",
			"widget.empty.action": "Start a session",
			"widget.rhythm.title": "Last two weeks",
			"widget.active.title": "Recent activity",
			"gallery.description.active": "Time spent per day over a recent window; switch between 7 days / 14 days / 30 days at the top — same quantity, different window. Hover or focus a bar for that day.",
			"active.range": "Window",
			"active.7d": "7 days",
			"active.14d": "14 days",
			"active.30d": "30 days",
			"active.total": "Active time, {range}",
			"active.chart": "Active time per day",
			"widget.rhythm.totalLabel": "Total",
			"widget.rhythm.peak": "Peak {dur} ({day})",
			"widget.quick.title": "Quick",
			"widget.quick.new": "Start a new session",
			"widget.quick.resume": "Back to last session",
			"widget.quick.hint": "Click the top-left logo to come back here anytime",
			"widget.unknown": "Unnamed widget",
			"edit.hint": "Hold about 0.5 seconds to split along the collision axis: upper widgets go up, lower ones down; likewise left/right. Rows and columns stay intact. Esc cancels.",
			"edit.size.s": "S",
			"edit.size.m": "M",
			"edit.size.l": "L",
			"edit.size": "Size: {size}",
			"edit.hide": "Hide this card",
			"edit.moveUp": "Move earlier",
			"edit.moveDown": "Move later",
			"edit.drag": "Drag to reorder",
			"empty.noWidgets": "No widgets yet",
			"error.load": "Could not load data",
			"error.retry": "Retry",
			"time.justNow": "just now",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y",
			"time.minutesAgo": "{n} min ago",
			"time.hoursAgo": "{n} h ago",
			"time.daysAgo": "{n} d ago",
			"dur.none": "0 min",
			"dur.lessThanMinute": "<1 min",
			"dur.minutes": "{n} min",
			"dur.hours": "{h} h",
			"dur.hoursMinutes": "{h} h {m} min",
			"unit.unknown": "unknown",
			"aria.widget": "Widget {title}",
			"aria.actions": "Home actions",
			"aria.band": "Today's activity band",
			"aria.rhythm": "Daily active time over the last two weeks"
		};
		//#endregion
		//#region src/client/index.tsx
		/**
		* dsh-home 的浏览器 half：首页面板 + 侧栏条目 + 「点左上角 logo 回首页」。
		*
		* 三件事：
		* 1. **面板**：往 `main` keyed 槽注册 `key = 'home'`，并声明子槽 `home.widget`
		*    （list/root），第三方插件把自己的卡片注册进来；面板按用户布局逐个渲染
		*    （`renderSlot(..., { only: id })`，与官方侧栏 panellist 同一用法）。
		* 2. **侧栏条目**：`sidebar.panellist` 一个图标行（给不点 logo 的人、也给快捷键留位）。
		* 3. **logo 入口**：不去占 `sidebar.brand.mark`——那个槽被官方品牌包占着（同优先级
		*    再注册会抛），占低优先级又会把官方 logo 的视觉换掉。改为在捕获阶段识别「展开态
		*    品牌按钮」（它内部有 `brandIdentity`，折叠态是 `railMark`），命中就拦下官方
		*    的 new-session 点击并打开首页。识别失败时什么都不做 ⇒ 退化回官方行为，
		*    不会把折叠态的展开按钮弄坏。
		*
		* @module @vlln/dsh-home/client
		*/
		/** 文案命名空间。 */
		const NS = "home";
		/** 面板 key：同时是侧栏条目的 id。 */
		const PANEL_ID = "home";
		/** 客户端严格注入：四件都是外壳核心服务。 */
		const inject = [
			"slots",
			"locale",
			"layout"
		];
		/** 侧栏/品牌用的首页图形（14/16/18 自适应）。 */
		function HomePanelIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.2",
						y: "2.6",
						width: "5",
						height: "4.6",
						rx: "1.5",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "8.9",
						y: "2.6",
						width: "4.9",
						height: "2",
						rx: "1",
						fill: "currentColor",
						opacity: "0.62"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "8.9",
						y: "6.2",
						width: "4.9",
						height: "1.4",
						rx: "0.7",
						fill: "currentColor",
						opacity: "0.62"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.2",
						y: "9",
						width: "11.6",
						height: "4.2",
						rx: "1.6",
						fill: "currentColor",
						opacity: "0.85"
					})
				]
			});
		}
		/** 把槽标签（字符串或取词函数）读成可展示的标题。 */
		function labelText(label, fallback) {
			if (typeof label === "string" && label !== "") return label;
			if (typeof label === "function") try {
				const value = label();
				if (typeof value === "string" && value !== "") return value;
			} catch {}
			return fallback;
		}
		const LegacyRenderContext = (0, react.createContext)(() => null);
		/** Compatibility bridge only; v1 extensions register through the injected homeWidgets service. */
		function bridgeLegacySlots(ctx, registry) {
			const entries = /* @__PURE__ */ new Map();
			const sync = () => {
				const present = /* @__PURE__ */ new Set();
				for (const entry of ctx.slots.entries("home.widget")) {
					const id = entry.options.id;
					if (typeof id !== "string" || id === "" || registry.get(`@vlln/dsh-home:${id}`)) continue;
					present.add(id);
					if (entries.has(id)) continue;
					const typeId = `legacy:${id}`;
					const Content = ({ size }) => {
						return (0, react.useContext)(LegacyRenderContext)("home.widget", { size }, { only: id });
					};
					try {
						const off = registry.register({
							typeId,
							apiVersion: 1,
							title: () => labelText(entry.options.label, id),
							source: "home.widget (legacy)",
							configVersion: 1,
							defaultConfig: () => ({}),
							validateConfig: () => true,
							Content
						}, { internalLegacyTypeId: true });
						entries.set(id, {
							entry,
							off
						});
					} catch (error) {
						console.error("[dsh-home] legacy widget registration failed", id, error);
					}
				}
				for (const [id, record] of entries) if (!present.has(id)) {
					record.off();
					entries.delete(id);
				}
			};
			const off = ctx.slots.subscribe("home.widget", sync);
			sync();
			return () => {
				off();
				for (const record of entries.values()) record.off();
				entries.clear();
			};
		}
		/**
		* 点左上角 logo 打开首页。
		*
		* 只在「展开态品牌按钮」上生效：官方那个 `<button aria-label="New Session">` 里
		* 包着 `brandIdentity`；折叠态 rail 的 logo 包在 `railMark` 里，是"展开侧栏"按钮，
		* 必须原样放行。捕获阶段拦下（React 的委托监听在容器上，捕获更早），并
		* `stopPropagation` 让官方的 startSession 不执行。
		* @returns 撤销函数
		*/
		function installBrandEntry(ctx) {
			if (typeof document === "undefined") return () => {};
			const onClick = (event) => {
				if (event.defaultPrevented || event.button !== 0) return;
				if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				const button = target.closest("button");
				if (button === null) return;
				if (button.querySelector("[class*=\"brandIdentity\"]") === null) return;
				event.preventDefault();
				event.stopPropagation();
				ctx.layout.selectPanel(PANEL_ID);
			};
			document.addEventListener("click", onClick, true);
			return () => {
				document.removeEventListener("click", onClick, true);
			};
		}
		/**
		* 浏览器端 entry。
		* @param ctx 客户端上下文
		*/
		function apply(ctx) {
			ctx.effect(injectStyles, "dsh-home: styles");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-home: dictionaries");
			const store = new HomeStore();
			ctx.effect(() => () => {
				store.dispose();
			}, "dsh-home: store");
			/** 导航动作先占位，服务到位后就地替换（面板可能比 ui-workspace 先挂）。 */
			const navigation = {
				openSession: (_id) => {},
				startSession: () => {}
			};
			const actions = {
				openSession: (id) => navigation.openSession(id),
				startSession: () => navigation.startSession(),
				leave: () => {
					ctx.layout.selectPanel(null);
				}
			};
			ctx.inject(["uiWorkspace"], (scoped) => {
				const workspace = scoped.get("uiWorkspace");
				if (workspace === void 0) return;
				navigation.openSession = (id) => workspace.openSession(id);
				navigation.startSession = () => workspace.startSession();
				scoped.effect(() => () => {
					navigation.openSession = () => {};
					navigation.startSession = () => {};
					store.notifyActionsChanged();
				}, "dsh-home: release navigation");
			});
			ctx.inject(["uiWorkspace", "workspaces"], (scoped) => {
				const workspace = scoped.get("uiWorkspace");
				const workspaces = scoped.get("workspaces");
				if (workspace === void 0 || workspaces === void 0) return;
				let active = true;
				actions.pickDirectory = () => workspace.pickDirectory();
				actions.startTask = async ({ cwd, prompt, signal }) => {
					const target = cwd === void 0 ? void 0 : await workspaces.create({ path: cwd });
					if (!active || signal?.aborted) return;
					workspace.startSession(target?.workspaceId, {
						prompt,
						whenDraftExists: "append"
					});
				};
				store.notifyActionsChanged();
				scoped.effect(() => () => {
					active = false;
					delete actions.startTask;
					delete actions.pickDirectory;
					store.notifyActionsChanged();
				}, "dsh-home: task navigation");
			});
			ctx.inject(["sessions"], (scoped) => {
				const sessions = scoped.get("sessions");
				if (sessions === void 0) return;
				scoped.effect(() => {
					store.attachSessions(sessions.list);
					return () => {
						store.detachSessions();
					};
				}, "dsh-home: session catalog");
			});
			ctx.inject(["workspaces"], (scoped) => {
				const workspaces = scoped.get("workspaces");
				if (workspaces === void 0) return;
				scoped.effect(() => {
					store.attachWorkspaces(workspaces.list);
					return () => store.detachWorkspaces();
				}, "dsh-home: native pinned sessions");
			});
			const registry = new HomeWidgetRegistry();
			ctx.provide("homeWidgets", registry);
			ctx.effect(() => registerBuiltins(registry, (key, params) => ctx.locale.bind(NS)(key, params)), "dsh-home: builtins");
			ctx.effect(() => bridgeLegacySlots(ctx, registry), "dsh-home: legacy widget bridge");
			ctx.effect(() => registry.subscribe(() => store.reconcileDefinitions(registry)), "dsh-home: config migration");
			store.reconcileDefinitions(registry);
			function Page(pageProps) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LegacyRenderContext.Provider, {
					value: pageProps.renderSlot,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BuiltinProvider, {
						store,
						t: pageProps.t,
						actions,
						useSessionStatus: pageProps.useSessionStatus,
						language: pageProps.locale(),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomePage, { ...pageProps })
					})
				});
			}
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
				children: { "home.widget": {
					kind: "list",
					scope: "root"
				} },
				inject: () => ({
					store,
					registry,
					actions,
					locale: () => ctx.locale.getSnapshot().active,
					rescan: () => {
						requestRescan().then(() => store.refresh()).catch(() => {});
					}
				})
			}, Page));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: -10,
				label: () => ctx.locale.bind(NS)("panel.title"),
				locale: NS
			}, HomePanelIcon));
			ctx.effect(() => installBrandEntry(ctx), "dsh-home: brand entry");
		}
		//#endregion
		exports.NS = NS;
		exports.PANEL_ID = PANEL_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
