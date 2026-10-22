window.__ModuleLoader__.load({
	id: "@vlln/dsh-home",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/format.ts
		/**
		* 时长：`0` → "0 分钟"，`<1h` → 分钟，整点 → 小时，其余 → 小时+分。
		* @param ms 毫秒
		* @param t 翻译
		*/
		function formatDuration(ms, t) {
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
		* 今天的日期行：地区化月日 + 星期。
		* @param now 当前时刻
		* @param locale 语言（`ctx.locale` 的 active）
		*/
		function formatDay(now, locale) {
			const tag = locale === "zh" || locale.startsWith("zh") ? "zh-CN" : "en-US";
			try {
				return new Intl.DateTimeFormat(tag, {
					month: "long",
					day: "numeric",
					weekday: "short"
				}).format(now);
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
		//#endregion
		//#region src/client/widgets.tsx
		const DAY_MS = 864e5;
		function IconContinue() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3 8h9M8.5 4.5 12 8l-3.5 3.5",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round",
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
		function IconRunning() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M1.5 8h3l2-4 3 8 2-4h3",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
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
		function IconQuick() {
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
		/** 空的友好态（不画灰框，只给一句话）。 */
		function Empty({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-empty",
				children
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
		/** 顶层会话（排除子代理会话）。 */
		function topLevel(data) {
			return (data?.sessions ?? []).filter((session) => session.parentSessionId === void 0 && session.origin !== "subagent");
		}
		/** 今天 0 点（本地时区，与宿主的分日口径一致）。 */
		function startOfToday(now) {
			const date = new Date(now);
			date.setHours(0, 0, 0, 0);
			return date.getTime();
		}
		function ContinueBody({ t, data, sessions, now, actions }) {
			const rows = topLevel(data).filter((session) => session.turns > 0 && session.lastAt >= now - 14 * DAY_MS).slice(0, 4);
			if (rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.continue.empty") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-rows",
				children: rows.map((session) => {
					const live = sessions[session.id]?.running === true;
					const meta = session.todayMs > 0 ? t("widget.continue.today", { dur: formatDuration(session.todayMs, t) }) : t("widget.continue.total", { dur: formatDuration(session.activeMs, t) });
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-row",
						onClick: () => {
							actions.openSession(session.id);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-row-top",
							children: [live && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-row-live" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-row-title",
								children: sessionTitle(session, sessions, t)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-row-meta",
							children: [
								t("widget.continue.lastAt", { time: formatAgo(session.lastAt, now, t) }),
								" · ",
								meta
							]
						})]
					}, session.id);
				})
			});
		}
		function TodayBody({ t, data, now }) {
			const start = startOfToday(now);
			const end = start + DAY_MS;
			const segments = [];
			for (const session of data?.sessions ?? []) for (const [from, to] of session.clusters) {
				const begin = Math.max(from, start);
				const finish = Math.min(to, end);
				if (finish <= begin) continue;
				segments.push({
					left: (begin - start) / DAY_MS * 100,
					width: Math.max(.4, (finish - begin) / DAY_MS * 100)
				});
			}
			const nowFraction = Math.min(100, Math.max(0, (now - start) / DAY_MS * 100));
			const active = data?.today.activeMs ?? 0;
			const run = data?.today.runMs ?? 0;
			const hasActivity = segments.length > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-metric",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-number",
						children: formatDuration(active, t)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-label",
						children: t("widget.today.focused")
					})]
				}),
				hasActivity ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-band-track",
					"aria-label": t("aria.band"),
					role: "img",
					children: [segments.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-band-seg",
						"data-now": segment.left + segment.width >= nowFraction - .5 ? "true" : "false",
						style: {
							left: `${segment.left}%`,
							width: `${segment.width}%`
						}
					}, index)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-band-now",
						style: { left: `${nowFraction}%` }
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.today.empty", { shortcut: shortcutHint() }) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-muted",
					children: [
						t("widget.today.run", { dur: formatDuration(run, t) }),
						" · ",
						t("widget.today.waiting")
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-band-scale",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "00" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "06" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "12" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "18" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "24" })
					]
				})
			] });
		}
		function RunningBody({ t, data, sessions, now, actions }) {
			const running = Object.values(sessions).filter((session) => session.running === true && session.blank !== true).slice(0, 4);
			if (running.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.running.empty") });
			const byId = new Map((data?.sessions ?? []).map((session) => [session.id, session]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-label",
				children: t("widget.running.count", { count: running.length })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-rows",
				children: running.map((session) => {
					const ledger = byId.get(session.id);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-row",
						onClick: () => {
							actions.openSession(session.id);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-row-top",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-row-live" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-row-title",
								children: sessionTitle(ledger ?? {
									id: session.id,
									cwd: session.cwd
								}, sessions, t)
							})]
						}), ledger !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-meta",
							children: t("widget.running.open", { time: formatAgo(ledger.lastAt, now, t) })
						})]
					}, session.id);
				})
			})] });
		}
		function SessionsBody({ t, data, sessions, now, actions }) {
			const rows = topLevel(data).filter((session) => session.todayMs > 0 || session.todayTurns > 0).slice(0, 5);
			if (rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.sessions.empty") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-rows",
				children: rows.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-row",
					onClick: () => {
						actions.openSession(session.id);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-row-top",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-title",
							children: sessionTitle(session, sessions, t)
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-row-meta",
						children: t("widget.sessions.row", {
							turns: session.todayTurns,
							dur: formatDuration(session.todayMs, t)
						})
					})]
				}, session.id))
			});
		}
		function RhythmBody({ t, data }) {
			const days = data?.days ?? [];
			if (days.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: t("widget.sessions.empty") });
			const peak = Math.max(1, ...days.map((day) => day.activeMs));
			const total = days.reduce((sum, day) => sum + day.activeMs, 0);
			const best = days.reduce((winner, day) => day.activeMs > winner.activeMs ? day : winner, days[0]);
			const todayKey = days[days.length - 1]?.key;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
					children: days.map((day, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index === days.length - 1 ? shortDay(day.key) : day.key.slice(8) }, day.key))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-muted",
					children: t("widget.rhythm.peak", {
						dur: formatDuration(best.activeMs, t),
						day: shortDay(best.key)
					})
				})
			] });
		}
		function QuickBody({ t, data, now, actions }) {
			const last = topLevel(data).find((session) => session.turns > 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-quick",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-quick-button dsh-quick-primary",
						onClick: () => {
							actions.startSession();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.quick.new") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-key",
							children: shortcutHint()
						})]
					}),
					last !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-quick-button",
						onClick: () => {
							actions.openSession(last.id);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.quick.resume") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-key",
							children: formatAgo(last.lastAt, now, t)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted",
						children: t("widget.quick.hint")
					})
				]
			});
		}
		/** 内置小组件表：顺序即默认排布。 */
		const BUILTIN_WIDGETS = [
			{
				id: "continue",
				order: 10,
				defaultSize: "m",
				Glyph: IconContinue,
				title: (t) => t("widget.continue.title"),
				body: ContinueBody
			},
			{
				id: "today",
				order: 20,
				defaultSize: "m",
				Glyph: IconToday,
				title: (t) => t("widget.today.title"),
				body: TodayBody
			},
			{
				id: "running",
				order: 30,
				defaultSize: "s",
				Glyph: IconRunning,
				title: (t) => t("widget.running.title"),
				body: RunningBody
			},
			{
				id: "sessions",
				order: 40,
				defaultSize: "s",
				Glyph: IconSessions,
				title: (t) => t("widget.sessions.title"),
				body: SessionsBody
			},
			{
				id: "rhythm",
				order: 50,
				defaultSize: "m",
				Glyph: IconRhythm,
				title: (t) => t("widget.rhythm.title"),
				body: RhythmBody
			},
			{
				id: "quick",
				order: 60,
				defaultSize: "s",
				Glyph: IconQuick,
				title: (t) => t("widget.quick.title"),
				body: QuickBody
			}
		];
		//#endregion
		//#region src/client/page.tsx
		/**
		* 首页面板（`main` 槽，key = `home`）：标题行 + 小组件网格 + 编辑态。
		*
		* 网格是 3 列（窄屏 2/1 列），每张卡按 `data-size` 跨列。编辑态下每张卡的标题行
		* 右侧长出工具条：拖动把手（指针拖拽 + 方向键）、S/M/L 尺寸、隐藏、恢复默认。
		* 布局只存覆盖（order / size / hidden），默认排布由内置组件表 + `home.widget`
		* 槽的注册顺序合成——所以卸载一个 widget 包不会把别人的布局弄坏。
		*
		* @module @vlln/dsh-home/client/page
		*/
		/** 三档尺寸的展示名。 */
		function sizeLabel(size, t) {
			return t(`edit.size.${size}`);
		}
		/**
		* 渲染首页。
		* @param props 面板 props
		*/
		function HomePage(props) {
			const { t, renderSlot, store, widgets, actions, locale, rescan } = props;
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
			const external = (0, react.useSyncExternalStore)(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot);
			const [editing, setEditing] = (0, react.useState)(false);
			const [dragging, setDragging] = (0, react.useState)(null);
			const [dropTarget, setDropTarget] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				store.refresh();
			}, [store]);
			const metas = (0, react.useMemo)(() => {
				const list = BUILTIN_WIDGETS.map((widget) => ({
					id: widget.id,
					order: widget.order,
					defaultSize: widget.defaultSize,
					title: widget.title(t),
					Glyph: widget.Glyph,
					builtin: widget
				}));
				for (const widget of external) {
					if (list.some((meta) => meta.id === widget.id)) continue;
					list.push({
						...widget,
						title: widget.title === "" ? t("widget.unknown") : widget.title
					});
				}
				return list.sort((left, right) => left.order - right.order);
			}, [external, t]);
			const fallbackOrder = (0, react.useMemo)(() => metas.map((meta) => meta.id), [metas]);
			const order = store.ordered(fallbackOrder);
			const visible = order.filter((id) => !state.layout.hidden.includes(id));
			const hiddenCount = order.length - visible.length;
			const dragEnd = (0, react.useCallback)(() => {
				if (dragging !== null && dropTarget !== null && dragging !== dropTarget) store.moveBefore(dragging, dropTarget, fallbackOrder);
				setDragging(null);
				setDropTarget(null);
			}, [
				dragging,
				dropTarget,
				fallbackOrder,
				store
			]);
			const onPointerMove = (0, react.useCallback)((event) => {
				if (dragging === null) return;
				const id = (document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-widget-id]"))?.dataset.widgetId ?? null;
				if (id !== null && id !== dragging) setDropTarget(id);
			}, [dragging]);
			const nudge = (0, react.useCallback)((id, delta) => {
				const current = store.ordered(fallbackOrder);
				const index = current.indexOf(id);
				const target = current[index + delta];
				if (target === void 0) return;
				store.moveBefore(id, delta < 0 ? target : current[index + delta + 1], fallbackOrder);
			}, [fallbackOrder, store]);
			const data = state.ledger;
			const todaySummary = data === null ? state.loading ? t("summary.scanning") : t("summary.empty") : t("summary.today", {
				active: formatDuration(data.today.activeMs, t),
				sessions: data.today.sessions,
				turns: data.today.turns
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-home",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-home-inner",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-home-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-heading",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
									className: "dsh-home-title",
									children: t("panel.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-home-sub",
									"aria-live": "polite",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.subtitle", { date: formatDay(state.now, locale()) }) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-home-dot",
											"aria-hidden": "true"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: todaySummary }),
										data !== null && data.week.sessions > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-home-dot",
											"aria-hidden": "true"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summary.week", {
											active: formatDuration(data.week.activeMs, t),
											sessions: data.week.sessions
										}) })] })
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-actions",
								role: "group",
								"aria-label": t("aria.actions"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										onClick: () => {
											actions.startSession();
										},
										children: t("action.newSession")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										onClick: () => {
											setEditing(!editing);
										},
										children: editing ? t("action.done") : t("action.edit")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => {
											actions.leave();
										},
										children: t("action.back")
									})
								]
							})]
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
						editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-edit-hint",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("edit.hint") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										store.reset();
									},
									children: t("action.reset")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: rescan,
									children: t("action.rescan")
								})
							]
						}),
						visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-empty",
							children: t("empty.noWidgets")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-home-grid",
							children: visible.map((id) => {
								const meta = metas.find((item) => item.id === id);
								if (meta === void 0) return null;
								const size = state.layout.size[id] ?? meta.defaultSize;
								const widgetProps = {
									t,
									data,
									sessions: state.sessions,
									now: state.now,
									actions,
									size
								};
								const content = meta.builtin !== void 0 ? meta.builtin.body(widgetProps) : renderSlot("home.widget", { size }, { only: id });
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: "dsh-w",
									"data-widget-id": id,
									"data-size": size,
									"data-dragging": dragging === id ? "true" : "false",
									"data-droptarget": dropTarget === id ? "true" : "false",
									"aria-label": t("aria.widget", { title: meta.title }),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-w-head",
										children: [
											meta.Glyph !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(meta.Glyph, {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-w-title",
												children: meta.title
											}),
											editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-tools",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dsh-tool dsh-drag",
														"aria-label": t("edit.drag"),
														title: t("edit.drag"),
														onPointerDown: (event) => {
															if (event.button !== 0) return;
															event.preventDefault();
															event.currentTarget.setPointerCapture(event.pointerId);
															setDragging(id);
															setDropTarget(null);
														},
														onPointerMove,
														onPointerUp: dragEnd,
														onPointerCancel: dragEnd,
														onKeyDown: (event) => {
															if (event.key === "ArrowLeft") {
																event.preventDefault();
																nudge(id, -1);
															}
															if (event.key === "ArrowRight") {
																event.preventDefault();
																nudge(id, 1);
															}
														},
														children: "⠿"
													}),
													[
														"s",
														"m",
														"l"
													].map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dsh-tool",
														"data-active": size === option ? "true" : "false",
														"aria-label": t("edit.size", { size: sizeLabel(option, t) }),
														"aria-pressed": size === option,
														onClick: () => {
															store.setSize(id, option);
														},
														children: sizeLabel(option, t)
													}, option)),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dsh-tool",
														"aria-label": t("edit.hide"),
														title: t("edit.hide"),
														onClick: () => {
															store.hide(id);
														},
														children: "×"
													})
												]
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-w-body",
										children: content
									})]
								}, id);
							})
						}),
						editing && hiddenCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-hidden-tray",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("edit.hidden", { count: hiddenCount }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									store.showAll();
								},
								children: t("edit.showAll")
							})]
						}),
						data !== null && data.scannedAt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-muted",
							style: { marginTop: 18 },
							children: [t("summary.updated", { time: formatAgo(data.scannedAt, state.now, t) }), data.scanning ? ` · ${t("summary.scanning")}` : ""]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/api.ts
		/**
		* 首页与宿主之间的那条路由（`POST /plugins/dsh-home/api`）。
		* 信封：`{ ok: true, value }` / `{ ok: false, error: { code, message } }`。
		*
		* @module @vlln/dsh-home/client/api
		*/
		/** 与 src/index.mjs 的 API_PATH 同源。 */
		const API_PATH = "/plugins/dsh-home/api";
		/** 发一条 op；失败抛带 code 的 Error。 */
		async function post(op, extra = {}) {
			const response = await fetch(API_PATH, {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "same-origin",
				cache: "no-store",
				body: JSON.stringify({
					op,
					...extra
				})
			});
			let envelope;
			try {
				envelope = await response.json();
			} catch {
				throw new Error(`home api: HTTP ${response.status} without JSON`);
			}
			if (!response.ok || envelope.ok !== true) throw new Error(envelope.error?.message ?? `home api: HTTP ${response.status}`);
			return envelope.value;
		}
		/** 空布局。 */
		function emptyLayout() {
			return {
				order: [],
				size: {},
				hidden: []
			};
		}
		/** 取账本快照。 */
		function fetchSnapshot() {
			return post("snapshot");
		}
		/** 取用户布局。 */
		async function fetchLayout() {
			return (await post("layout.get")).layout ?? null;
		}
		/** 写用户布局。 */
		function saveLayout(layout) {
			return post("layout.set", { layout }).then((value) => value.layout);
		}
		/** 触发一次重扫（重建账本）。 */
		function requestRescan() {
			return post("rescan");
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
				sessions: {},
				loading: true,
				error: null,
				now: Date.now()
			};
			listeners = /* @__PURE__ */ new Set();
			timer = null;
			saveTimer = null;
			sessionOff = null;
			disposed = false;
			constructor() {
				this.refresh();
				this.loadLayout();
				if (typeof window !== "undefined") {
					this.timer = setInterval(() => {
						if (typeof document !== "undefined" && document.hidden) return;
						this.refresh();
					}, REFRESH_MS);
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
			/** 接上官方会话目录（标题 / 运行态 / 空白态）。 */
			attachSessions(list) {
				const sync = () => {
					const snapshot = list.getSnapshot();
					const sessions = {};
					for (const [id, summary] of Object.entries(snapshot?.byId ?? {})) {
						const item = summary;
						sessions[id] = {
							id,
							...typeof item.title === "string" ? { title: item.title } : {},
							...typeof item.blank === "boolean" ? { blank: item.blank } : {},
							...typeof item.running === "boolean" ? { running: item.running } : {},
							...typeof item.cwd === "string" ? { cwd: item.cwd } : {},
							...typeof item.updatedAt === "number" ? { updatedAt: item.updatedAt } : {}
						};
					}
					this.set({ sessions });
				};
				sync();
				this.sessionOff = list.subscribe(sync);
			}
			/** 拉一次账本快照。 */
			async refresh() {
				try {
					const ledger = await fetchSnapshot();
					this.set({
						ledger,
						loading: false,
						error: null,
						now: Date.now()
					});
				} catch (error) {
					this.set({
						loading: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			/** 拉用户布局（失败就用默认布局，不拦页面）。 */
			async loadLayout() {
				try {
					const layout = await fetchLayout();
					if (layout !== null) this.set({ layout });
				} catch {}
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
			reset() {
				this.set({ layout: emptyLayout() });
				this.persistSoon();
			}
			persistSoon() {
				if (this.saveTimer !== null) clearTimeout(this.saveTimer);
				this.saveTimer = setTimeout(() => {
					this.saveTimer = null;
					saveLayout(this.state.layout).catch(() => {});
				}, SAVE_DEBOUNCE_MS);
			}
			dispose() {
				this.disposed = true;
				if (this.timer !== null) clearInterval(this.timer);
				if (this.saveTimer !== null) clearTimeout(this.saveTimer);
				this.sessionOff?.();
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
				this.listeners.clear();
			}
		};
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
		const CSS = `
.dsh-home {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: var(--dsw-alias-bg-base);
  padding-top: calc(var(--dsh-frame-top-clearance, 0px) + 20px);
  padding-right: 24px;
  padding-bottom: 40px;
  padding-left: max(24px, var(--dsh-frame-leading-clearance, 0px));
  color: var(--dsw-alias-label-primary);
  scrollbar-color: var(--dsw-alias-scrollbar-thumb, var(--dsw-alias-border-l3)) transparent;
}
.dsh-home * { box-sizing: border-box; }
.dsh-home-inner { width: 100%; max-width: 1180px; min-width: 0; }

.dsh-home-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dsh-home-heading { min-width: 0; }
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

.dsh-home-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
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
.dsh-w[data-droptarget="true"] { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-state-business-primary); }

.dsh-w-head { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.dsh-w-glyph { width: 14px; height: 14px; flex: none; color: var(--dsw-alias-label-tertiary); }
.dsh-w-title {
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

.dsh-rows { display: flex; flex-direction: column; gap: 2px; margin: 0 -8px; }
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
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
.dsh-row-live { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); }

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
  background: var(--dsw-alias-state-business-primary);
  opacity: 0.5;
}
.dsh-band-seg[data-now="true"] { opacity: 0.95; }
.dsh-band-now {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  border-radius: 1px;
  background: var(--dsw-alias-state-warn-primary);
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
  background: var(--dsw-alias-state-business-primary);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
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

.dsh-edit-hint {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-tool[data-active="true"] {
  background: var(--dsw-alias-button-ghost-active-fill);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border);
}
.dsh-drag { cursor: grab; touch-action: none; }
.dsh-drag:active { cursor: grabbing; }

.dsh-hidden-tray {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-chip {
  height: 22px;
  padding: 0 9px;
  border: none;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsh-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-chip[data-active="true"] {
  background: var(--dsw-alias-button-ghost-active-fill);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border);
}
.dsh-chip:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}

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
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
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

@media (max-width: 1100px) {
  .dsh-home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dsh-w[data-size="l"] { grid-column: span 2; }
}
@media (max-width: 720px) {
  .dsh-home { padding-right: 16px; padding-left: max(16px, var(--dsh-frame-leading-clearance, 0px)); }
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
			element.textContent = CSS;
			document.head.append(element);
			return () => {
				element.remove();
			};
		}
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
			"panel.title": "首页",
			"panel.subtitle": "今天 {date}",
			"action.newSession": "新会话",
			"action.edit": "编辑布局",
			"action.done": "完成",
			"action.reset": "恢复默认",
			"action.back": "返回会话",
			"action.rescan": "重建账本",
			"summary.today": "今天 {active} · {sessions} 个会话 · {turns} 轮",
			"summary.week": "近 7 天 {active} · {sessions} 个会话",
			"summary.scanning": "正在扫描历史会话…",
			"summary.updated": "账本更新于 {time}",
			"summary.empty": "还没有活动记录",
			"widget.continue.title": "继续",
			"widget.continue.empty": "最近没有活跃会话",
			"widget.continue.lastAt": "停在 {time}",
			"widget.continue.today": "今天 {dur}",
			"widget.continue.total": "累计 {dur}",
			"widget.today.title": "今天",
			"widget.today.active": "专注 {dur}",
			"widget.today.run": "agent 运行 {dur}",
			"widget.today.waiting": "其余时间在等你在想",
			"widget.today.focused": "专注",
			"widget.today.empty": "今天还没开始——按 {shortcut} 开一个新会话",
			"widget.running.title": "在跑",
			"widget.running.empty": "现在没有在跑的会话",
			"widget.running.count": "{count} 个会话在跑",
			"widget.running.open": "过去 {time} 有动静",
			"widget.sessions.title": "今天动过",
			"widget.sessions.empty": "今天还没有动过的会话",
			"widget.sessions.row": "{turns} 轮 · {dur}",
			"widget.rhythm.title": "近两周",
			"widget.rhythm.total": "合计 {dur}",
			"widget.rhythm.totalLabel": "合计",
			"widget.rhythm.peak": "最高 {dur}（{day}）",
			"widget.quick.title": "快捷",
			"widget.quick.new": "开个新会话",
			"widget.quick.resume": "回到上次会话",
			"widget.quick.hint": "点左上角的 logo 随时回到这一页",
			"widget.unknown": "未命名小组件",
			"edit.hint": "拖动卡片左上角的把手排序，点右上角切尺寸",
			"edit.size": "尺寸：{size}",
			"edit.size.s": "小",
			"edit.size.m": "中",
			"edit.size.l": "大",
			"edit.hide": "隐藏这张卡",
			"edit.hidden": "{count} 张已隐藏",
			"edit.showAll": "全部显示",
			"edit.moveUp": "前移",
			"edit.moveDown": "后移",
			"edit.drag": "拖动排序",
			"empty.noWidgets": "还没有小组件",
			"error.load": "数据没能加载出来",
			"error.retry": "重试",
			"time.justNow": "刚刚",
			"time.minutesAgo": "{n} 分钟前",
			"time.hoursAgo": "{n} 小时前",
			"time.daysAgo": "{n} 天前",
			"dur.none": "0 分钟",
			"dur.minutes": "{n} 分钟",
			"dur.hours": "{h} 小时",
			"dur.hoursMinutes": "{h} 小时 {m} 分",
			"unit.unknown": "未知",
			"aria.page": "首页仪表盘",
			"aria.widget": "小组件 {title}",
			"aria.actions": "首页操作",
			"aria.band": "今天的活跃时间带",
			"aria.rhythm": "近两周每日活跃时长",
			"locale.name": "简体中文"
		};
		/** 英文文案（键集必须与 {@link zh} 完全相同）。 */
		const en = {
			"panel.title": "Home",
			"panel.subtitle": "Today, {date}",
			"action.newSession": "New session",
			"action.edit": "Edit layout",
			"action.done": "Done",
			"action.reset": "Reset",
			"action.back": "Back to conversation",
			"action.rescan": "Rebuild ledger",
			"summary.today": "{active} today · {sessions} sessions · {turns} turns",
			"summary.week": "Last 7 days {active} · {sessions} sessions",
			"summary.scanning": "Scanning session history…",
			"summary.updated": "Ledger updated {time}",
			"summary.empty": "No activity recorded yet",
			"widget.continue.title": "Pick up",
			"widget.continue.empty": "No recent activity",
			"widget.continue.lastAt": "Paused {time}",
			"widget.continue.today": "{dur} today",
			"widget.continue.total": "{dur} total",
			"widget.today.title": "Today",
			"widget.today.active": "Focused {dur}",
			"widget.today.run": "Agent ran {dur}",
			"widget.today.waiting": "The rest was waiting on you",
			"widget.today.focused": "Focused",
			"widget.today.empty": "Nothing yet today — press {shortcut} to start",
			"widget.running.title": "Running",
			"widget.running.empty": "Nothing running right now",
			"widget.running.count": "{count} sessions running",
			"widget.running.open": "Active {time}",
			"widget.sessions.title": "Touched today",
			"widget.sessions.empty": "No session touched today",
			"widget.sessions.row": "{turns} turns · {dur}",
			"widget.rhythm.title": "Last two weeks",
			"widget.rhythm.total": "{dur} total",
			"widget.rhythm.totalLabel": "Total",
			"widget.rhythm.peak": "Peak {dur} ({day})",
			"widget.quick.title": "Quick",
			"widget.quick.new": "Start a new session",
			"widget.quick.resume": "Back to last session",
			"widget.quick.hint": "Click the top-left logo to come back here anytime",
			"widget.unknown": "Unnamed widget",
			"edit.hint": "Drag the handle to reorder, click the size chips",
			"edit.size": "Size: {size}",
			"edit.size.s": "S",
			"edit.size.m": "M",
			"edit.size.l": "L",
			"edit.hide": "Hide this card",
			"edit.hidden": "{count} hidden",
			"edit.showAll": "Show all",
			"edit.moveUp": "Move earlier",
			"edit.moveDown": "Move later",
			"edit.drag": "Drag to reorder",
			"empty.noWidgets": "No widgets yet",
			"error.load": "Could not load data",
			"error.retry": "Retry",
			"time.justNow": "just now",
			"time.minutesAgo": "{n} min ago",
			"time.hoursAgo": "{n} h ago",
			"time.daysAgo": "{n} d ago",
			"dur.none": "0 min",
			"dur.minutes": "{n} min",
			"dur.hours": "{h} h",
			"dur.hoursMinutes": "{h} h {m} min",
			"unit.unknown": "unknown",
			"aria.page": "Home dashboard",
			"aria.widget": "Widget {title}",
			"aria.actions": "Home actions",
			"aria.band": "Today's activity band",
			"aria.rhythm": "Daily active time over the last two weeks",
			"locale.name": "English"
		};
		//#endregion
		//#region src/client/index.tsx
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
		/** 外部 widget 列表：随 `home.widget` 槽的注册变化。 */
		function createWidgetSource(ctx) {
			let snapshot = [];
			const listeners = /* @__PURE__ */ new Set();
			const same = (left, right) => left.length === right.length && left.every((item, index) => item.id === right[index]?.id && item.order === right[index]?.order && item.title === right[index]?.title);
			const sync = () => {
				const next = [];
				for (const entry of ctx.slots.entries("home.widget")) {
					const id = entry.options.id;
					if (typeof id !== "string" || id === "") continue;
					next.push({
						id,
						order: entry.options.order ?? 100,
						defaultSize: "m",
						title: labelText(entry.options.label, id)
					});
				}
				next.sort((left, right) => left.order - right.order);
				if (same(snapshot, next)) return;
				snapshot = next;
				for (const listener of listeners) listener();
			};
			ctx.effect(() => ctx.slots.subscribe("home.widget", sync), "dsh-home: widget ledger");
			sync();
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
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
			});
			ctx.inject(["sessions"], (scoped) => {
				const sessions = scoped.get("sessions");
				if (sessions === void 0) return;
				scoped.effect(() => {
					store.attachSessions(sessions.list);
					return () => {};
				}, "dsh-home: session catalog");
			});
			const widgets = createWidgetSource(ctx);
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
					widgets,
					actions,
					locale: () => ctx.locale.getSnapshot().active,
					rescan: () => {
						requestRescan().then(() => store.refresh()).catch(() => {});
					}
				})
			}, HomePage));
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
