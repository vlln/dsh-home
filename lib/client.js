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
		//#region src/client/widgets.tsx
		const DAY_MS = 864e5;
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
		function TodayBody({ t, data, sessions, now, actions }) {
			const start = startOfToday(now);
			const end = start + DAY_MS;
			const segments = [];
			let longest = 0;
			for (const session of data?.sessions ?? []) for (const [from, to] of session.clusters) {
				const begin = Math.max(from, start);
				const finish = Math.min(to, end);
				if (finish <= begin) continue;
				longest = Math.max(longest, finish - begin);
				segments.push({
					left: (begin - start) / DAY_MS * 100,
					width: Math.max(.4, (finish - begin) / DAY_MS * 100),
					live: finish >= now - 10 * 6e4,
					label: `${hhmm(begin)}–${hhmm(finish)} · ${formatDuration(finish - begin, t)} · ${sessionTitle(session, sessions, t)}`
				});
			}
			const nowFraction = Math.min(100, Math.max(0, (now - start) / DAY_MS * 100));
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
				hasActivity ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-band-track",
					"aria-label": t("aria.band"),
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-band-scale",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "00" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "06" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "12" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "18" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "24" })
					]
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, {
					action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StartAction, {
						t,
						actions
					}),
					children: t("widget.today.empty", { shortcut: shortcutHint() })
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-w-facts",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("widget.today.stats", {
						sessions: data?.today.sessions ?? 0,
						turns: data?.today.turns ?? 0
					}) }), longest > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["· ", t("widget.today.longest", { dur: formatDuration(longest, t) })] })]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-muted",
					children: [
						t("widget.today.run", { dur: formatDuration(run, t) }),
						" · ",
						t("widget.today.waiting")
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
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-row-live" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-row-title",
									children: sessionTitle(ledger ?? {
										id: session.id,
										cwd: session.cwd
									}, sessions, t)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-row-arrow",
									"aria-hidden": "true",
									children: "→"
								})
							]
						}), ledger !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-meta",
							children: t("widget.running.open", { time: formatAgo(ledger.lastAt, now, t) })
						})]
					}, session.id);
				})
			})] });
		}
		function AreasBody({ t, data, actions }) {
			const groups = /* @__PURE__ */ new Map();
			for (const session of data?.sessions ?? []) {
				if (session.todayMs <= 0 && session.todayTurns <= 0) continue;
				const key = session.cwd ?? "";
				const name = key.split("/").filter(Boolean).pop() ?? t("unit.unknown");
				const group = groups.get(key) ?? {
					name,
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
			const rows = sorted.slice(0, 5);
			const rest = sorted.slice(5);
			if (rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, {
				action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StartAction, {
					t,
					actions
				}),
				children: t("widget.areas.empty")
			});
			const restMs = rest.reduce((sum, group) => sum + group.ms, 0);
			const restSessions = rest.reduce((sum, group) => sum + group.sessions, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-rows",
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-title",
							children: group.name
						}), group.topLevelId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-row-arrow",
							"aria-hidden": "true",
							children: "→"
						})]
					});
					return group.topLevelId === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-row dsh-row-static",
						children: [title, meta]
					}, group.name) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-row",
						onClick: () => {
							actions.openSession(group.topLevelId);
						},
						children: [title, meta]
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
				id: "areas",
				order: 40,
				defaultSize: "s",
				Glyph: IconSessions,
				title: (t) => t("widget.areas.title"),
				body: AreasBody
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
		//#region src/client/focus.tsx
		function isTopLevel(session) {
			return session.parentSessionId === void 0 && session.origin !== "subagent";
		}
		/**
		* 「回到现场」的候选：顶层、真有对话、且没被 dismiss（或在 dismiss 之后又有新活动）。
		* 按最近活动倒序——最近的那个最可能就是你要接的。
		*/
		function resumeCandidates(data, dismissed) {
			return (data?.sessions ?? []).filter(isTopLevel).filter((session) => session.turns > 0 || session.lastUserText !== void 0).filter((session) => (dismissed[session.id] ?? 0) < session.lastAt).sort((left, right) => right.lastAt - left.lastAt);
		}
		function interactionText(status, t) {
			if (status?.pendingInteraction === "approval") return t("queue.approval");
			if (status?.pendingInteraction === "plan-review") return t("queue.plan");
			if (status?.pendingInteraction === "question") return t("queue.question");
			if (status?.completionUnread === true) return t("queue.done");
		}
		/** 一张"回到现场"卡：标题 + 最后一句人话 + 停在哪 + 一个动作。 */
		function FocusResume(props) {
			const { t, data, sessions, statuses, dismissed, now, actions, index, onNext, onDismiss, handle } = props;
			const candidates = resumeCandidates(data, dismissed);
			const candidate = candidates.length === 0 ? void 0 : candidates[index % candidates.length];
			if (candidate === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-focus dsh-focus-empty",
				"aria-label": t("aria.resume"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-focus-eyebrow",
						children: t("resume.eyebrow")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-focus-empty-text",
						children: t("resume.empty")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-focus-primary",
						onClick: () => {
							actions.startSession();
						},
						children: t("resume.emptyAction")
					})
				]
			});
			const waiting = interactionText(statuses.get(candidate.id), t);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-focus",
				"aria-label": t("aria.resume"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-focus-eyebrow-row",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-focus-eyebrow",
								children: t("resume.eyebrow")
							}),
							handle,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-icon-button",
								"aria-label": t("resume.dismiss"),
								title: t("resume.dismiss"),
								onClick: () => {
									onDismiss(candidate.id);
								},
								children: "×"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: "dsh-focus-title",
						children: sessionTitle(candidate, sessions, t)
					}),
					candidate.lastUserText !== void 0 && candidate.lastUserText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "dsh-focus-snippet",
						children: [
							"“",
							candidate.lastUserText,
							"”"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-focus-meta",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("resume.paused", { time: formatAgo(candidate.lastAt, now, t) }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-duo",
								"aria-hidden": "true",
								children: "·"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: candidate.todayMs > 0 ? t("resume.today", { dur: formatDuration(candidate.todayMs, t) }) : t("resume.total", { dur: formatDuration(candidate.activeMs, t) }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-duo",
								"aria-hidden": "true",
								children: "·"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("resume.turns", { count: candidate.turns }) }),
							waiting !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-chip",
								"data-tone": "warn",
								children: waiting
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-focus-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-focus-primary",
							onClick: () => {
								actions.openSession(candidate.id);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("resume.open") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "→"
							})]
						}), candidates.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-focus-secondary",
							onClick: onNext,
							children: t("resume.next")
						})]
					})
				]
			});
		}
		/** 「在等我」：官方 sessionStatus 给的待审批 / 待回答 / 跑完没看。 */
		function FocusQueue(props) {
			const { t, data, sessions, statuses, dismissed, now, actions, onDismiss, handle } = props;
			const lastAt = new Map((data?.sessions ?? []).map((session) => [session.id, session.lastAt]));
			const items = [];
			for (const [id, status] of statuses) {
				const reason = interactionText(status, t);
				if (reason === void 0) continue;
				const activity = lastAt.get(id) ?? sessions[id]?.updatedAt ?? now;
				if ((dismissed[id] ?? 0) >= activity) continue;
				items.push({
					id,
					reason,
					tone: status.pendingInteraction === void 0 ? "info" : "warn",
					at: activity
				});
			}
			items.sort((left, right) => right.at - left.at);
			const shown = items.slice(0, 6);
			const rest = items.length - shown.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-w dsh-queue",
				"data-empty": items.length === 0 ? "true" : "false",
				"aria-label": t("aria.queue"),
				"data-status-source": props.statusSource,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-w-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(QueueGlyph, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: "dsh-w-title",
							children: t("queue.title")
						}),
						items.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-w-extra",
							children: items.length
						}),
						handle
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-w-body",
					children: items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted dsh-queue-empty",
						children: t("queue.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [shown.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-queue-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-queue-main",
							onClick: () => {
								actions.openSession(item.id);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-row-title",
								children: sessionTitle({
									id: item.id,
									cwd: sessions[item.id]?.cwd
								}, sessions, t)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-queue-meta",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-chip",
									"data-tone": item.tone,
									children: item.reason
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-muted",
									children: formatAgo(item.at, now, t)
								})]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-icon-button",
							"aria-label": t("queue.dismiss"),
							title: t("queue.dismiss"),
							onClick: () => {
								onDismiss(item.id);
							},
							children: "×"
						})]
					}, item.id)), rest > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("queue.more", { count: rest })
					})] })
				})]
			});
		}
		/** 「今天」：一条时间带 + 一个主数字 + 两句事实，不上数字墙。 */
		function FocusToday(props) {
			const { t, data, sessions, now, actions, handle } = props;
			const widget = BUILTIN_WIDGETS.find((item) => item.id === "today");
			const widgetProps = {
				t,
				data,
				sessions,
				now,
				actions,
				size: "l"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-w dsh-today",
				"aria-label": t("widget.today.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-w-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodayGlyph, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: "dsh-w-title",
							children: t("widget.today.title")
						}),
						handle,
						data !== null && data.scanning && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-w-extra",
							children: t("today.progress", {
								done: data.progress.done,
								total: data.progress.total
							})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-w-body",
					children: widget?.body(widgetProps)
				})]
			});
		}
		function QueueGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dsh-w-glyph",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 4.5h11M2.5 8h7M2.5 11.5h4.5",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round"
				})
			});
		}
		function TodayGlyph() {
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
		//#region src/client/reorder.tsx
		/**
		* 可排序列表的拖拽逻辑（网格与"三件事"共用）。
		*
		* 三条经验都写在这里：
		* 1. **不用 pointer capture**：手柄会被重渲染、指针也会离开元素，capture 一丢就没有
		*    pointermove。改用 window 级监听。
		* 2. **指针在空白处时保留上一个有效落点**：否则在两张卡之间的缝里松手等于什么都没发生。
		* 3. **拖动期间禁掉文本选择**（`body.dsh-home-dragging`），否则鼠标一拖就选中的是标题文字
		*    ——用户会以为"拖不动"。
		*
		* @module @vlln/dsh-home/client/reorder
		*/
		/**
		* 把一组 `[attribute=<id>]` 元素变成可拖拽排序的列表。
		* @param attribute 元素上的 id 属性名（`data-widget-id` / `data-focus-id`）
		* @param commit 落点确定后调用（id、目标、前/后）
		*/
		function useReorder(attribute, commit) {
			const [dragging, setDragging] = (0, react.useState)(null);
			const [dropTarget, setDropTarget] = (0, react.useState)(null);
			const [dropSide, setDropSide] = (0, react.useState)(null);
			const dropRef = (0, react.useRef)({
				target: null,
				side: null
			});
			const cancel = (0, react.useCallback)(() => {
				dropRef.current = {
					target: null,
					side: null
				};
				setDragging(null);
				setDropTarget(null);
				setDropSide(null);
			}, []);
			const begin = (0, react.useCallback)((id) => {
				dropRef.current = {
					target: null,
					side: null
				};
				setDragging(id);
				setDropTarget(null);
				setDropSide(null);
			}, []);
			(0, react.useEffect)(() => {
				if (dragging === null) return;
				const container = document.querySelector(".dsh-home");
				let lastX = 0;
				let lastY = 0;
				let frame = 0;
				document.body.classList.add("dsh-home-dragging");
				const hit = () => {
					if (container === null) return;
					const item = document.elementFromPoint(lastX, lastY)?.closest(`[${attribute}]`);
					const id = item?.getAttribute(attribute) ?? null;
					if (item === null || id === null || id === dragging) return;
					const rect = item.getBoundingClientRect();
					const side = lastX > rect.left + rect.width / 2 ? "after" : "before";
					dropRef.current = {
						target: id,
						side
					};
					setDropTarget(id);
					setDropSide(side);
				};
				const onMove = (event) => {
					lastX = event.clientX;
					lastY = event.clientY;
					hit();
				};
				const tick = () => {
					if (container !== null && (lastX !== 0 || lastY !== 0)) {
						const rect = container.getBoundingClientRect();
						const edge = 80;
						let delta = 0;
						if (lastY < rect.top + edge) delta = -Math.min(18, Math.ceil((rect.top + edge - lastY) / 5));
						else if (lastY > rect.bottom - edge) delta = Math.min(18, Math.ceil((lastY - (rect.bottom - edge)) / 5));
						if (delta !== 0) {
							container.scrollTop += delta;
							hit();
						}
					}
					frame = requestAnimationFrame(tick);
				};
				const onUp = () => {
					const { target, side } = dropRef.current;
					if (target !== null && side !== null) commit(dragging, target, side);
					cancel();
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
				window.addEventListener("pointercancel", onUp);
				frame = requestAnimationFrame(tick);
				return () => {
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
					window.removeEventListener("pointercancel", onUp);
					cancelAnimationFrame(frame);
					document.body.classList.remove("dsh-home-dragging");
				};
			}, [
				attribute,
				cancel,
				commit,
				dragging
			]);
			return {
				dragging,
				dropTarget,
				dropSide,
				begin,
				cancel
			};
		}
		/** 统一的拖拽把手（28px 命中区 + `⠿` + 键盘可聚焦）。 */
		function DragHandle({ label, onPointerDown, onKeyDown }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-tool dsh-drag",
				"aria-label": label,
				title: label,
				onPointerDown,
				onKeyDown,
				children: "⠿"
			});
		}
		//#endregion
		//#region src/client/page.tsx
		/**
		* 首页面板（`main` 槽，key = `home`）。
		*
		* 两块，都可排序（拖拽自 `reorder.tsx`，window 级监听 + 保留落点 + 边缘自动滚动）：
		* - **三件事**（`focus.tsx`）：回到现场 / 在等我 / 今天，纵向排列，顺序存在 `layout.focusOrder`；
		* - **更多数据与小组件**（opt-in）：网格，顺序/尺寸/隐藏存在 `layout` 的其余字段。
		*
		* 拖拽在阅读态就能用（把手常显），编辑态只负责尺寸 / 隐藏 / 清单 / 重置。
		* 记忆放在 `prefs`：`lastSeenAt` 支持"自上次以来"，`dismissed` 让"看过了"不等于
		* "永远别看"（会话有新活动就复活）。
		*
		* @module @vlln/dsh-home/client/page
		*/
		const EMPTY_STATUSES = /* @__PURE__ */ new Map();
		/** 「三件事」的固定成员与默认顺序。 */
		const FOCUS_FALLBACK = [
			"resume",
			"queue",
			"today"
		];
		/** 固定在三件事里、不进网格的内置卡。 */
		const FOCUS_IDS = /* @__PURE__ */ new Set(["today"]);
		function sizeLabel(size, t) {
			return t(`edit.size.${size}`);
		}
		function RefreshGlyph({ spinning }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: spinning ? "dsh-spin" : void 0,
				width: "14",
				height: "14",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M13 8a5 5 0 1 1-1.5-3.57M13 3v2.6h-2.6",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function Chevron({ open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				style: {
					transform: open ? "rotate(180deg)" : void 0,
					transition: "transform 160ms ease-out"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m4 6 4 4 4-4",
					stroke: "currentColor",
					strokeWidth: "1.4",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function FocusSkeleton() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-focus-stack",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-focus dsh-w-skeleton",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-skeleton",
							style: { width: "18%" }
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-skeleton",
							style: {
								width: "52%",
								height: 24
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-skeleton",
							style: { width: "76%" }
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-w dsh-w-skeleton",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-skeleton",
						style: { width: "26%" }
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-skeleton",
						style: { width: "64%" }
					})]
				})]
			});
		}
		/** 一张卡的正文：必须作为**子组件**渲染，错误边界才捕得到。 */
		function WidgetBody({ meta, widgetProps, renderSlot, size }) {
			if (meta.builtin === void 0) return renderSlot("home.widget", { size }, { only: meta.id });
			const Body = meta.builtin.body;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Body, { ...widgetProps });
		}
		/**
		* 渲染首页。
		* @param props 面板 props
		*/
		function HomePage(props) {
			const { t, store, renderSlot, widgets, actions, locale, rescan } = props;
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
			const external = (0, react.useSyncExternalStore)(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot);
			const statuses = (props.useSessionStatus ?? ((selector) => selector(EMPTY_STATUSES)))((snapshot) => snapshot);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [editing, setEditing] = (0, react.useState)(false);
			const [trayOpen, setTrayOpen] = (0, react.useState)(false);
			const [confirmReset, setConfirmReset] = (0, react.useState)(false);
			const [resumeIndex, setResumeIndex] = (0, react.useState)(0);
			const [sinceCount, setSinceCount] = (0, react.useState)(null);
			const seenRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				store.refresh();
			}, [store]);
			(0, react.useEffect)(() => {
				if (seenRef.current || state.ledger === null) return;
				const previous = state.prefs.lastSeenAt;
				if (previous !== null) {
					const count = state.ledger.sessions.filter((session) => session.parentSessionId === void 0 && session.turns > 0 && session.lastAt > previous).length;
					setSinceCount(count);
				}
				seenRef.current = true;
				store.markSeen();
			}, [
				state.ledger,
				state.prefs.lastSeenAt,
				store
			]);
			(0, react.useEffect)(() => {
				if (!confirmReset) return;
				const timer = setTimeout(() => {
					setConfirmReset(false);
				}, 4e3);
				return () => {
					clearTimeout(timer);
				};
			}, [confirmReset]);
			const gridMetas = (0, react.useMemo)(() => {
				const list = BUILTIN_WIDGETS.filter((widget) => !FOCUS_IDS.has(widget.id)).map((widget) => ({
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
			const fallbackOrder = (0, react.useMemo)(() => gridMetas.map((meta) => meta.id), [gridMetas]);
			const order = store.ordered(fallbackOrder);
			const visible = order.filter((id) => !state.layout.hidden.includes(id));
			const hiddenCount = order.length - visible.length;
			const focusOrder = store.orderedFocus(FOCUS_FALLBACK);
			const commitGrid = (0, react.useCallback)((id, target, side) => {
				store.moveRelative(id, target, side, fallbackOrder);
			}, [fallbackOrder, store]);
			const commitFocus = (0, react.useCallback)((id, target, side) => {
				store.moveFocusRelative(id, target, side, FOCUS_FALLBACK);
			}, [store]);
			const gridDrag = useReorder("data-widget-id", commitGrid);
			const focusDrag = useReorder("data-focus-id", commitFocus);
			const nudge = (0, react.useCallback)((id, delta, focus) => {
				const current = focus ? store.orderedFocus(FOCUS_FALLBACK) : store.ordered(fallbackOrder);
				const index = current.indexOf(id);
				const target = current[index + delta];
				if (target === void 0) return;
				const after = current[index + delta + 1];
				if (focus) {
					store.moveFocusRelative(id, delta < 0 ? target : after ?? target, delta < 0 || after !== void 0 ? "before" : "after", FOCUS_FALLBACK);
					return;
				}
				store.moveBefore(id, delta < 0 ? target : after, fallbackOrder);
			}, [fallbackOrder, store]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					if (gridDrag.dragging !== null) {
						gridDrag.cancel();
						return;
					}
					if (focusDrag.dragging !== null) {
						focusDrag.cancel();
						return;
					}
					if (trayOpen) {
						setTrayOpen(false);
						return;
					}
					if (editing) {
						setEditing(false);
						setConfirmReset(false);
						return;
					}
					if (expanded) setExpanded(false);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [
				editing,
				expanded,
				focusDrag,
				gridDrag,
				trayOpen
			]);
			const data = state.ledger;
			const focusProps = {
				t,
				data,
				sessions: state.sessions,
				statuses,
				dismissed: state.prefs.dismissed,
				now: state.now,
				actions,
				statusSource: props.useSessionStatus === void 0 ? "none" : "runtime"
			};
			const showSkeleton = data === null && state.loading && state.error === null;
			const todayLabel = data === null ? void 0 : data.today.activeMs === 0 ? t("panel.notStarted") : t("panel.today", { dur: formatDuration(data.today.activeMs, t) });
			const dismiss = (0, react.useCallback)((id) => {
				store.dismiss(id);
			}, [store]);
			const focusHandle = (id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DragHandle, {
				label: t("edit.drag"),
				onPointerDown: (event) => {
					if (event.button !== 0) return;
					event.preventDefault();
					focusDrag.begin(id);
				},
				onKeyDown: (event) => {
					if (event.key === "ArrowUp") {
						event.preventDefault();
						nudge(id, -1, true);
					}
					if (event.key === "ArrowDown") {
						event.preventDefault();
						nudge(id, 1, true);
					}
				}
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-home-title-row",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
											className: "dsh-home-title",
											children: t("panel.title")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-icon-button",
											"aria-label": t("action.refresh"),
											title: t("action.refresh"),
											onClick: () => {
												store.refresh();
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshGlyph, { spinning: state.refreshing })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-home-updated",
											children: state.lastLoadedAt === null ? t("summary.scanning") : t("summary.updated", { time: formatAgo(state.lastLoadedAt, state.now, t) })
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-home-sub",
									"aria-live": "polite",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatDay(state.now, locale()) }),
										todayLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-home-dot",
											"aria-hidden": "true"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: todayLabel })] }),
										sinceCount !== null && sinceCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-home-dot",
											"aria-hidden": "true"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.since", { count: sinceCount }) })] })
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-home-actions",
								role: "group",
								"aria-label": t("aria.actions"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
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
								})]
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
						showSkeleton ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusSkeleton, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-focus-stack",
							children: focusOrder.map((id) => {
								const dragging = focusDrag.dragging === id;
								const drop = focusDrag.dropTarget === id ? focusDrag.dropSide ?? "true" : "false";
								const common = {
									key: id,
									className: "dsh-focus-item",
									"data-focus-id": id,
									"data-dragging": dragging ? "true" : "false",
									"data-drop": drop
								};
								if (id === "resume") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									...common,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-error",
											children: t("error.card")
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusResume, {
											...focusProps,
											index: resumeIndex,
											onNext: () => {
												setResumeIndex((index) => index + 1);
											},
											onDismiss: dismiss,
											handle: focusHandle(id)
										})
									})
								});
								if (id === "queue") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									...common,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-error",
											children: t("error.card")
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusQueue, {
											...focusProps,
											onDismiss: dismiss,
											handle: focusHandle(id)
										})
									})
								});
								if (id === "today") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									...common,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-error",
											children: t("error.card")
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusToday, {
											...focusProps,
											handle: focusHandle(id)
										})
									})
								});
								return null;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-expand",
							"aria-expanded": expanded,
							onClick: () => {
								setExpanded(!expanded);
								if (expanded) {
									setEditing(false);
									setTrayOpen(false);
								}
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: expanded ? t("expand.hide") : t("expand.show", { count: Math.max(0, gridMetas.length - hiddenCount) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chevron, { open: expanded })]
						}),
						expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-edit-bar",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-edit-hint",
									children: t("edit.hint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-edit-actions",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										"aria-pressed": editing,
										onClick: () => {
											setEditing(!editing);
											if (editing) {
												setTrayOpen(false);
												setConfirmReset(false);
											}
										},
										children: editing ? t("action.done") : t("action.edit")
									}), editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: trayOpen ? "outline" : "ghost",
											size: "sm",
											"aria-expanded": trayOpen,
											onClick: () => {
												setTrayOpen(!trayOpen);
											},
											children: hiddenCount > 0 ? t("action.widgetsCount", { count: hiddenCount }) : t("action.widgets")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											style: confirmReset ? { color: "var(--dsw-alias-state-error-primary)" } : void 0,
											onClick: () => {
												if (!confirmReset) {
													setConfirmReset(true);
													return;
												}
												store.reset();
												setConfirmReset(false);
											},
											children: confirmReset ? t("action.resetConfirm") : t("action.reset")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											onClick: rescan,
											children: t("action.rescan")
										})
									] })]
								})]
							}),
							editing && trayOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-tray",
								"aria-label": t("tray.title"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-tray-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-tray-title",
										children: t("tray.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-muted",
										children: t("tray.hint")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-tray-list",
									children: gridMetas.map((meta) => {
										const hidden = state.layout.hidden.includes(meta.id);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-tray-item",
											"data-hidden": hidden ? "true" : "false",
											"aria-pressed": !hidden,
											onClick: () => {
												store.toggleHidden(meta.id);
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-tray-glyph",
													children: meta.Glyph !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(meta.Glyph, {}) : null
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-tray-name",
													children: meta.title
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-tray-state",
													children: hidden ? t("tray.show") : t("tray.hide")
												})
											]
										}, meta.id);
									})
								})]
							}),
							visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-empty",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("empty.noWidgets") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										store.showAll();
										setTrayOpen(false);
									},
									children: t("empty.restore")
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-home-grid",
								children: visible.map((id) => {
									const meta = gridMetas.find((item) => item.id === id);
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
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-w dsh-error",
											children: t("error.card")
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: "dsh-w",
											"data-widget-id": id,
											"data-size": size,
											"data-dragging": gridDrag.dragging === id ? "true" : "false",
											"data-drop": gridDrag.dropTarget === id ? gridDrag.dropSide ?? "true" : "false",
											"data-editing": editing ? "true" : "false",
											"aria-label": t("aria.widget", { title: meta.title }),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-w-head",
												children: [
													meta.Glyph !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(meta.Glyph, {}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
														className: "dsh-w-title",
														children: meta.title
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-tools",
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DragHandle, {
																label: t("edit.drag"),
																onPointerDown: (event) => {
																	if (event.button !== 0) return;
																	event.preventDefault();
																	gridDrag.begin(id);
																},
																onKeyDown: (event) => {
																	if (event.key === "ArrowLeft") {
																		event.preventDefault();
																		nudge(id, -1, false);
																	}
																	if (event.key === "ArrowRight") {
																		event.preventDefault();
																		nudge(id, 1, false);
																	}
																}
															}),
															editing && [
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
															editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetBody, {
													meta,
													widgetProps,
													renderSlot,
													size
												})
											})]
										})
									}, id);
								})
							})
						] })
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
		/** 空偏好。 */
		function emptyPrefs() {
			return {
				lastSeenAt: null,
				dismissed: {}
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
		/** 取用户布局。 */
		async function fetchLayout() {
			return (await post("layout.get")).layout ?? null;
		}
		/** 写用户布局。 */
		function saveLayout(layout) {
			return post("layout.set", { layout }).then((value) => value.layout);
		}
		/** 取首页偏好。 */
		async function fetchPrefs() {
			return (await post("prefs.get")).prefs;
		}
		/** 写首页偏好。 */
		function savePrefs(prefs) {
			return post("prefs.set", { prefs }).then((value) => value.prefs);
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
				prefs: emptyPrefs(),
				sessions: {},
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
			disposed = false;
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
				if (this.state.refreshing) return;
				this.set({ refreshing: true });
				try {
					const ledger = await fetchSnapshot();
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
					this.set({ prefs: await fetchPrefs() });
				} catch {}
			}
			/** 记下"这次看到了"，下次进首页就能算"自上次以来"。 */
			markSeen() {
				if (this.state.prefs.lastSeenAt !== null && Date.now() - this.state.prefs.lastSeenAt < 6e4) return;
				this.set({ prefs: {
					...this.state.prefs,
					lastSeenAt: Date.now()
				} });
				this.persistPrefsSoon();
			}
			/** "这条我看过了"：记下时间；会话有新活动后会重新出现。 */
			dismiss(id) {
				this.set({ prefs: {
					...this.state.prefs,
					dismissed: {
						...this.state.prefs.dismissed,
						[id]: Date.now()
					}
				} });
				this.persistPrefsSoon();
			}
			persistPrefsSoon() {
				if (this.prefsTimer !== null) clearTimeout(this.prefsTimer);
				this.prefsTimer = setTimeout(() => {
					this.prefsTimer = null;
					savePrefs(this.state.prefs).catch(() => {});
				}, SAVE_DEBOUNCE_MS);
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
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				this.layoutTimer = setTimeout(() => {
					this.layoutTimer = null;
					saveLayout(this.state.layout).catch(() => {});
				}, SAVE_DEBOUNCE_MS);
			}
			dispose() {
				this.disposed = true;
				if (this.timer !== null) clearInterval(this.timer);
				if (this.tick !== null) clearInterval(this.tick);
				if (this.followUp !== null) clearTimeout(this.followUp);
				if (this.layoutTimer !== null) clearTimeout(this.layoutTimer);
				if (this.prefsTimer !== null) clearTimeout(this.prefsTimer);
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
.dsh-w[data-droptarget="true"] { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-state-business-primary); }

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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
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
  background: var(--dsw-alias-state-business-primary);
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
  background: var(--dsw-alias-state-business-primary);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
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


/* ---- 三件事（默认视图） ---- */
.dsh-focus-stack { display: flex; flex-direction: column; gap: 12px; }
.dsh-home-head + .dsh-focus,
.dsh-home-head + .dsh-focus-stack { margin-top: 20px; }
.dsh-w + .dsh-w { margin-top: 12px; }
/* 拖动期间禁掉文本选择：否则用户一按一拖选中的是标题文字，看起来像"拖不动"。 */
body.dsh-home-dragging { user-select: none; cursor: grabbing; }
body.dsh-home-dragging * { cursor: grabbing !important; }
.dsh-w-head, .dsh-focus-eyebrow-row, .dsh-focus-title { user-select: none; }

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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-focus-empty { align-items: flex-start; gap: 8px; }
.dsh-focus-empty-text { margin: 0; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dsh-duo { color: var(--dsw-alias-label-caption); }

.dsh-queue-row { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.dsh-queue-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
  border: none;
  border-radius: var(--dsw-radius-md);
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.dsh-queue-main:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-queue-main:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-queue-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dsh-queue-empty { margin: 0; padding: 0; }
.dsh-queue[data-empty="true"] { padding: 12px 16px 13px; gap: 6px; }

.dsh-chip[data-tone="warn"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}
.dsh-chip[data-tone="info"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
  color: var(--dsw-alias-state-business-primary);
}

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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-edit-bar { margin-top: 12px; }

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
			"panel.today": "今天 {dur}",
			"panel.notStarted": "今天还没开始",
			"panel.since": "自上次以来 {count} 个会话有新动静",
			"resume.eyebrow": "回到现场",
			"resume.open": "回到现场",
			"resume.next": "换一个",
			"resume.dismiss": "先不看这个",
			"resume.paused": "停在 {time}",
			"resume.today": "今天 {dur}",
			"resume.total": "累计 {dur}",
			"resume.turns": "{count} 轮",
			"resume.empty": "最近没有可以接上的会话",
			"resume.emptyAction": "开个新会话",
			"queue.title": "在等我",
			"queue.empty": "没有在等你的事",
			"queue.approval": "等你审批",
			"queue.plan": "等你确认计划",
			"queue.question": "等你回答",
			"queue.done": "跑完了，还没看",
			"queue.dismiss": "标记为已看过",
			"queue.more": "还有 {count} 条",
			"today.progress": "正在整理 {done}/{total}",
			"expand.show": "更多数据与小组件（{count}）",
			"expand.hide": "收起",
			"error.card": "这张卡没能渲染出来",
			"aria.resume": "回到现场",
			"aria.queue": "在等我的事",
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
			"widget.today.focused": "专注",
			"widget.today.stats": "{sessions} 个会话 · {turns} 轮",
			"widget.today.longest": "最长一段 {dur}",
			"widget.today.empty": "今天还没开始——按 {shortcut} 开一个新会话",
			"widget.running.title": "在跑",
			"widget.running.empty": "现在没有在跑的会话",
			"widget.running.count": "{count} 个会话在跑",
			"widget.running.open": "过去 {time} 有动静",
			"widget.areas.title": "今天按工作区",
			"widget.areas.empty": "今天还没有工作区活动",
			"widget.rhythm.empty": "还没有足够的数据",
			"widget.areas.row": "{dur} · {sessions} 个会话",
			"widget.areas.others": "其他 {count} 个工作区",
			"widget.empty.action": "开个新会话",
			"widget.rhythm.title": "近两周",
			"widget.rhythm.totalLabel": "合计",
			"widget.rhythm.peak": "最高 {dur}（{day}）",
			"widget.quick.title": "快捷",
			"widget.quick.new": "开个新会话",
			"widget.quick.resume": "回到上次会话",
			"widget.quick.hint": "点左上角的 logo 随时回到这一页",
			"widget.unknown": "未命名小组件",
			"edit.hint": "拖动卡片左上角的把手排序，点右上角切尺寸",
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
			"panel.title": "Home",
			"panel.today": "{dur} today",
			"panel.notStarted": "Nothing today yet",
			"panel.since": "{count} sessions since your last visit",
			"resume.eyebrow": "Pick up where you left",
			"resume.open": "Resume",
			"resume.next": "Next one",
			"resume.dismiss": "Not now",
			"resume.paused": "paused {time}",
			"resume.today": "{dur} today",
			"resume.total": "{dur} total",
			"resume.turns": "{count} turns",
			"resume.empty": "Nothing to pick up right now",
			"resume.emptyAction": "Start a session",
			"queue.title": "Waiting on you",
			"queue.empty": "Nothing is waiting on you",
			"queue.approval": "needs approval",
			"queue.plan": "plan to confirm",
			"queue.question": "needs an answer",
			"queue.done": "finished, unread",
			"queue.dismiss": "Mark as seen",
			"queue.more": "{count} more",
			"today.progress": "indexing {done}/{total}",
			"expand.show": "More data and widgets ({count})",
			"expand.hide": "Collapse",
			"error.card": "This card failed to render",
			"aria.resume": "Pick up where you left",
			"aria.queue": "Waiting on you",
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
			"widget.today.focused": "Focused",
			"widget.today.stats": "{sessions} sessions · {turns} turns",
			"widget.today.longest": "Longest stretch {dur}",
			"widget.today.empty": "Nothing yet today — press {shortcut} to start",
			"widget.running.title": "Running",
			"widget.running.empty": "Nothing running right now",
			"widget.running.count": "{count} sessions running",
			"widget.running.open": "Active {time}",
			"widget.areas.title": "Today by workspace",
			"widget.areas.empty": "No workspace activity today",
			"widget.rhythm.empty": "Not enough data yet",
			"widget.areas.row": "{dur} · {sessions} sessions",
			"widget.areas.others": "Other {count} workspaces",
			"widget.empty.action": "Start a session",
			"widget.rhythm.title": "Last two weeks",
			"widget.rhythm.totalLabel": "Total",
			"widget.rhythm.peak": "Peak {dur} ({day})",
			"widget.quick.title": "Quick",
			"widget.quick.new": "Start a new session",
			"widget.quick.resume": "Back to last session",
			"widget.quick.hint": "Click the top-left logo to come back here anytime",
			"widget.unknown": "Unnamed widget",
			"edit.hint": "Drag the handle to reorder, click the size chips",
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
