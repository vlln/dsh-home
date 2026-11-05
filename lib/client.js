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
			x = clamp$2(x, 0, cols - w);
			y = clamp$2(y, 0, maxRows - h);
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
		function clamp$2(num, lowerBound, upperBound) {
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
		function clamp$1(value, min, max) {
			return Math.max(min, Math.min(max, value));
		}
		var defaultConstraints = [{
			name: "gridBounds",
			constrainPosition(item, x, y, { cols, maxRows }) {
				return {
					x: clamp$1(x, 0, Math.max(0, cols - item.w)),
					y: clamp$1(y, 0, Math.max(0, maxRows - item.h))
				};
			},
			constrainSize(item, w, h, handle, { cols, maxRows }) {
				const maxW = handle === "w" || handle === "nw" || handle === "sw" ? item.x + item.w : cols - item.x;
				const maxH = handle === "n" || handle === "nw" || handle === "ne" ? item.y + item.h : maxRows - item.y;
				return {
					w: clamp$1(w, 1, Math.max(1, maxW)),
					h: clamp$1(h, 1, Math.max(1, maxH))
				};
			}
		}, {
			name: "minMaxSize",
			constrainSize(item, w, h) {
				return {
					w: clamp$1(w, item.minW ?? 1, item.maxW ?? Infinity),
					h: clamp$1(h, item.minH ?? 1, item.maxH ?? Infinity)
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
		//#region node_modules/.pnpm/react-grid-layout@2.2.3_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/react-grid-layout/dist/chunk-PZLKKWSX.mjs
		function useContainerWidth(options = {}) {
			const { measureBeforeMount = false, initialWidth = 1280 } = options;
			const [width, setWidth] = (0, react.useState)(initialWidth);
			const [mounted, setMounted] = (0, react.useState)(!measureBeforeMount);
			const containerRef = (0, react.useRef)(null);
			const observerRef = (0, react.useRef)(null);
			const measureWidth = (0, react.useCallback)(() => {
				const node = containerRef.current;
				if (node) {
					const newWidth = node.offsetWidth;
					setWidth(newWidth);
					if (!mounted) setMounted(true);
				}
			}, [mounted]);
			(0, react.useEffect)(() => {
				const node = containerRef.current;
				if (!node) return;
				measureWidth();
				if (typeof ResizeObserver !== "undefined") {
					let rafId = null;
					observerRef.current = new ResizeObserver((entries) => {
						const entry = entries[0];
						if (entry) {
							const newWidth = entry.contentRect.width;
							if (rafId !== null) cancelAnimationFrame(rafId);
							rafId = requestAnimationFrame(() => {
								setWidth(newWidth);
								rafId = null;
							});
						}
					});
					observerRef.current.observe(node);
					return () => {
						if (rafId !== null) cancelAnimationFrame(rafId);
						if (observerRef.current) {
							observerRef.current.disconnect();
							observerRef.current = null;
						}
					};
				}
				return () => {
					if (observerRef.current) {
						observerRef.current.disconnect();
						observerRef.current = null;
					}
				};
			}, [measureWidth]);
			return {
				width,
				mounted,
				containerRef,
				measureWidth
			};
		}
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
						top = clamp$2(top, 0, bottomBoundary);
						const colWidth2 = calcGridColWidth(positionParams);
						const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth2, margin[0]);
						left = clamp$2(left, 0, rightBoundary);
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
			listen(targets.window, "blur", (event) => end(event, false));
			listen(targets.document, "mouseleave", (event) => {
				if ((event.target === targets.document || event.target === targets.documentElement) && event.relatedTarget == null) end(event, false);
			});
			return clear;
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
		//#region src/client/spatial-model.ts
		const SPATIAL_MAX_Y = 1e4;
		function columns(cols) {
			return Number.isInteger(cols) && cols >= 1 && cols <= 12 ? cols : 12;
		}
		function record$1(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function isRect(value, cols) {
			if (!record$1(value)) return false;
			const { x, y, w, h } = value;
			return typeof x === "number" && Number.isInteger(x) && x >= 0 && typeof y === "number" && Number.isInteger(y) && y >= 0 && y <= 1e4 && typeof w === "number" && Number.isInteger(w) && w >= Math.min(3, cols) && w <= cols && typeof h === "number" && Number.isInteger(h) && h >= 3 && h <= 30 && x + w <= cols;
		}
		function overlaps$1(a, b) {
			return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
		}
		function bounded(value, fallback, min, max) {
			return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
		}
		/** Legacy width buckets: 12 -> 4/8/12, 6 -> 3/6/6, 2 -> 2/2/2. */
		function widthFromSize(size, cols) {
			cols = columns(cols);
			if (cols <= 2) return cols;
			if (cols <= 6) return size === "s" ? Math.min(3, cols) : cols;
			return size === "s" ? 4 : size === "l" ? cols : Math.min(8, cols);
		}
		/** Width-only compatibility bucket (6-column m/l and all 2-column sizes coincide). */
		function sizeFromRect(rect, cols) {
			cols = columns(cols);
			if (cols <= 2 || rect.w <= widthFromSize("s", cols)) return "s";
			return rect.w <= widthFromSize("m", cols) ? "m" : "l";
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
			if (![
				2,
				6,
				12
			].includes(cols)) throw new Error("Invalid grid columns");
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
		/**
		* Project registered, visible cards in homeOrder order, without mutating layout.
		* All legal saved rectangles are reserved before missing/invalid cards are
		* first-fit placed, so migration cannot steal a later card's saved position.
		* For conflicting saved data, the earlier ordered card wins; only the loser is
		* relocated. Hidden/unregistered cards never collide and their data is untouched.
		* Each breakpoint is independent: missing breakpoint data uses legacy first-fit,
		* never a write or a compaction of another breakpoint. viewportCols distinguishes
		* widget resize bounds from the actual viewport for implicit keyboard movement.
		*/
		function buildSpatialLayout(layout, metas, cols) {
			cols = columns(cols);
			const byId = /* @__PURE__ */ new Map();
			for (const meta of metas) if (!byId.has(meta.id)) byId.set(meta.id, meta);
			const hidden = new Set(layout.hidden);
			const available = [...byId.keys()];
			const order = (layout.instanceLayout ? [.../* @__PURE__ */ new Set([...layout.order, ...available])].filter((id) => byId.has(id)) : homeOrder(layout, available)).filter((id) => !hidden.has(id));
			const breakpoint = layout.positions?.[String(cols)];
			const saved = record$1(breakpoint) ? breakpoint : {};
			const occupied = [];
			const items = /* @__PURE__ */ new Map();
			const itemFrom = (id, rect) => {
				const meta = byId.get(id);
				return {
					i: id,
					x: rect.x,
					y: rect.y,
					w: rect.w,
					h: rect.h,
					minW: Math.min(meta.minWidth ?? 3, cols),
					minH: meta.minHeight ?? 3,
					maxW: Math.min(meta.maxWidth ?? cols, cols),
					...(meta.maxWidth ?? cols) < cols ? { viewportCols: cols } : {},
					...meta.maxHeight === void 0 ? {} : { maxH: meta.maxHeight }
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
				const rect = findSpatialSpace(occupied, {
					x: 0,
					y: 0,
					w: bounded(raw.w, Math.max(minW, Math.min(maxW, widthFromSize(size, cols))), minW, maxW),
					h: bounded(raw.h, meta.defaultHeight ?? legacySpatialHeight(id), minH, maxH)
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
		/**
		* 首页与宿主之间的那条路由（`POST /plugins/dsh-home/api`）。
		* 信封：`{ ok: true, value }` / `{ ok: false, error: { code, message } }`。
		*
		* @module @vlln/dsh-home/client/api
		*/
		/** 与 src/index.mjs 的 API_PATH 同源。 */
		const API_PATH = "/plugins/dsh-home/api";
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
			storage;
			constructor(message, code, storage) {
				super(message);
				this.name = "HomeApiError";
				this.code = code;
				this.storage = storage;
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
			const response = await fetch(API_PATH, {
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
				throw new Error(`home api: HTTP ${response.status} without JSON`);
			}
			if (!response.ok || envelope.ok !== true) throw new HomeApiError(envelope.error?.message ?? `home api: HTTP ${response.status}`, envelope.error?.code ?? "http-error", storageStatus(envelope.storage));
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
		/** 取首页偏好。 */
		async function fetchPrefs() {
			const prefs = (await post("prefs.get"))?.prefs;
			if (!prefs || prefs.lastSeenAt !== null && (typeof prefs.lastSeenAt !== "number" || !Number.isFinite(prefs.lastSeenAt)) || prefs.dismissed === null || typeof prefs.dismissed !== "object" || Array.isArray(prefs.dismissed) || Object.values(prefs.dismissed).some((at) => typeof at !== "number" || !Number.isFinite(at))) throw new HomeApiError("Invalid saved preferences response", "bad-prefs-response");
			return prefs;
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
		//#region src/client/collision-preview.ts
		function validColumns(cols) {
			return Number.isInteger(cols) && cols >= 1 && cols <= 12;
		}
		function clamp(value, max) {
			return Math.max(0, Math.min(max, value));
		}
		function snapAxis(raw, max, targets, previous) {
			const bounded = clamp(raw, max);
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
			return clamp(result, max);
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
			if (![
				2,
				6,
				12
			].includes(cols) || layout.some((item) => item.i === id)) throw new Error("Invalid library drag identity or columns");
			if (layout.some((item) => ![
				item.x,
				item.y,
				item.w,
				item.h
			].every(Number.isInteger) || item.x < 0 || item.y < 0 || item.w < 1 || item.h < 3)) throw new Error("Invalid peer geometry");
			const d = definition.defaults;
			const item = buildSpatialLayout(emptyLayout(), [{
				id,
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
			if (axis !== "x" && axis !== "y" || !Number.isInteger(cols) || cols < 1 || cols > 12 || activeIndex < 0 || !canPlace([], id, rect, cols) || pointer !== void 0 && (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y))) return;
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
		//#region src/client/spatial-grid.tsx
		/** RGL supplies pixel dragging/resize; a snapshot-based compactor previews local displacement. */
		const items = (value, cols) => value.map((item) => ({
			...item,
			minW: item.minW ?? Math.min(3, cols),
			minH: item.minH ?? 3,
			maxW: Math.min(item.maxW ?? cols, cols)
		}));
		function SpatialGrid({ width, cols, layout, editing, onCommit, onActive, children, libraryDrag, libraryGhost, onLibraryDrop, onLibraryEnd }) {
			const [libraryVisual, setLibraryVisual] = (0, react.useState)(null);
			const [libraryOutline, setLibraryOutline] = (0, react.useState)(null);
			const libraryRef = (0, react.useRef)(libraryDrag);
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
			const clearHover = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				hoverTimer.current = null;
				if (root.current) {
					delete root.current.dataset.hoverPending;
					delete root.current.dataset.dropRejected;
				}
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
				if (root.current) root.current.style.paddingBottom = "";
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
				desktopRelease.current?.();
				cancelled.current = true;
				active.current = false;
				gesture.current = null;
				pointer.current = null;
				if (root.current) root.current.style.paddingBottom = "";
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
				const scroll = () => {
					const p = pointer.current;
					const container = root.current?.closest(".dsh-home");
					if (active.current && gesture.current?.kind === "drag" && p && !p.touch && container) {
						const bounds = container.getBoundingClientRect();
						const edge = 72;
						let dy = 0;
						if (p.y > bounds.bottom - edge) dy = Math.min(16, Math.ceil((p.y - bounds.bottom + edge) / 5));
						else if (p.y < bounds.top + edge + 80) dy = -Math.min(16, Math.ceil((bounds.top + edge + 80 - p.y) / 5));
						if (dy !== 0) {
							if (dy > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 24 && root.current) root.current.style.paddingBottom = `${Math.min(2e3, Number.parseFloat(root.current.style.paddingBottom || "0") + 56)}px`;
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
				frame = requestAnimationFrame(scroll);
				return () => {
					document.removeEventListener("mousemove", track, true);
					document.removeEventListener("touchmove", track, true);
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
				setDragHeight(root.current?.getBoundingClientRect().height ?? 0);
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
				const visualBottom = Math.max(session.candidate.y + session.candidate.h, ...session.preview.filter((entry) => !libraryRef.current || entry.i !== session.id).map((entry) => entry.y + entry.h)) * 56 - 12;
				setDragHeight((previous) => Math.max(previous, visualBottom));
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
				desktopRelease.current?.();
				const session = gesture.current;
				const result = session?.preview ?? items(value, cols);
				const restoreEngine = session?.pending || session?.rejected;
				clearHover();
				active.current = false;
				gesture.current = null;
				pointer.current = null;
				if (root.current) root.current.style.paddingBottom = "";
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
				setDragHeight(root.current?.getBoundingClientRect().height ?? 900);
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
					if (root.current) root.current.style.paddingBottom = "";
					setCurrent(latestLayout.current);
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
					active.current = false;
					gesture.current = null;
					pointer.current = null;
					if (root.current) root.current.style.paddingBottom = "";
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
						enabled: editing,
						handles: ["se"]
					},
					style: { minHeight: editing ? Math.max(900, dragHeight) : void 0 },
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
				const defaults = defaultsFor(definition.defaults);
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
		/** Strip the standard prefix before shortening UUIDs; the full id remains the identity. */
		function shortSessionId(id) {
			const bare = id.startsWith("session-") ? id.slice(8) : id;
			return bare.length > 8 ? `${bare.slice(0, 8)}…` : bare || id;
		}
		/** Indexing is not a claim that the account has no sessions or no search results yet. */
		function recentEmptyState(total, matched, indexing) {
			if (matched > 0) return null;
			if (indexing) return "indexing";
			return total === 0 ? "empty" : "noMatch";
		}
		//#endregion
		//#region src/client/recent.tsx
		/** Recent sessions: catalog + activity ledger, independent of focus/dismiss preferences. */
		/** Body only: registry/page supplies the standard widget shell and heading. */
		function RecentBody({ t, data, sessions, now, actions, size, statuses, statusSource, loading, loadError }) {
			const [query, setQuery] = (0, react.useState)("");
			const [directory, setDirectory] = (0, react.useState)("");
			const [extraPages, setExtraPages] = (0, react.useState)(0);
			const all = (0, react.useMemo)(() => mergeRecentSessions(sessions, data?.sessions), [sessions, data?.sessions]);
			const labels = (0, react.useMemo)(() => cwdLabels(all.map((session) => session.cwd)), [all]);
			const directories = (0, react.useMemo)(() => [...labels].sort(([leftPath, left], [rightPath, right]) => left < right ? -1 : left > right ? 1 : leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0), [labels]);
			const hasUnknownCwd = all.some((session) => session.cwd === void 0);
			const matched = (0, react.useMemo)(() => filterRecentSessions(all, query, directory), [
				all,
				query,
				directory
			]);
			const pageSize = recentPageSize(size);
			const shown = matched.slice(0, pageSize * (1 + extraPages));
			const remaining = matched.length - shown.length;
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
								setExtraPages(0);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "dsh-recent-cwd",
							"aria-label": t("recent.cwd"),
							value: directory,
							title: directory.startsWith(":") ? directory.slice(1) : t("recent.cwd"),
							onChange: (event) => {
								setDirectory(event.currentTarget.value);
								setExtraPages(0);
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
						children: shown.map((session) => {
							const status = recentSessionStatus(session, source === "runtime" ? statuses?.get(session.id) : void 0);
							const title = session.title ?? t("recent.untitled");
							const cwd = session.cwd === void 0 ? t("recent.unknownCwd") : labels.get(session.cwd) ?? session.cwd;
							const activity = session.lastAt === null ? t("recent.unknownActivity") : t("recent.activity", { time: formatAgo(session.lastAt, now, t) });
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-row dsh-recent-row",
								"data-session-id": session.id,
								"data-status": status,
								onClick: () => {
									actions.openSession(session.id);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-row-top",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-row-title",
										title,
										children: title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-chip",
										"data-tone": status === "approval" || status === "plan" || status === "question" ? "warn" : "info",
										children: t(`recent.status.${status}`)
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-row-meta dsh-recent-meta",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-recent-path",
											title: session.cwd ?? t("recent.unknownCwd"),
											children: cwd
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-recent-id",
											title: session.id,
											children: shortSessionId(session.id)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											title: session.lastAt === null ? void 0 : new Date(session.lastAt).toISOString(),
											children: activity
										})
									]
								})]
							}, session.id);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-recent-footer",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-muted",
								role: "status",
								children: t("recent.count", {
									shown: shown.length,
									total: matched.length
								})
							}),
							remaining > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									setExtraPages((pages) => pages + 1);
								},
								children: t("recent.more", { count: Math.min(pageSize, remaining) })
							}),
							indexing && shown.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-muted",
								role: "status",
								children: t("recent.indexing")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/tasks.tsx
		/** Task starters only prepare an unsent draft through the Host navigation API. */
		const TASK_IDS = [
			"develop",
			"debug",
			"review",
			"summarize"
		];
		function TasksBody({ t, sessions, data, actions }) {
			const [cwd, setCwd] = (0, react.useState)("");
			const [task, setTask] = (0, react.useState)("develop");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(false);
			const pending = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				pending.current?.abort();
			}, []);
			const directories = [...new Set([
				...Object.values(sessions).map((session) => session.cwd),
				...(data?.sessions ?? []).map((session) => session.cwd),
				cwd
			].filter((path) => typeof path === "string" && path.trim() !== ""))].sort();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-tasks",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("tasks.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-label",
							children: t("tasks.cwd")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "dsh-home-select",
							value: cwd,
							onChange: (event) => {
								setCwd(event.target.value);
								setError(false);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("tasks.current")
							}), directories.map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: path,
								children: path
							}, path))]
						})]
					}),
					actions.pickDirectory !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						size: "sm",
						disabled: busy,
						onClick: () => {
							const pick = actions.pickDirectory;
							if (pick === void 0) return;
							setBusy(true);
							setError(false);
							pick().then((path) => {
								if (path !== null) setCwd(path);
							}).catch(() => {
								setError(true);
							}).finally(() => {
								setBusy(false);
							});
						},
						children: t("tasks.pick")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-task-options",
						role: "group",
						"aria-label": t("widget.tasks.title"),
						children: TASK_IDS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: task === id ? "outline" : "ghost",
							size: "sm",
							"aria-pressed": task === id,
							onClick: () => {
								setTask(id);
								setError(false);
							},
							children: t(`tasks.${id}.title`)
						}, id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-task-preview",
						children: t(`tasks.${task}.prompt`)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						size: "sm",
						disabled: busy || actions.startTask === void 0,
						onClick: () => {
							if (busy || actions.startTask === void 0) return;
							setBusy(true);
							setError(false);
							pending.current?.abort();
							const controller = new AbortController();
							pending.current = controller;
							actions.startTask({
								cwd: cwd || void 0,
								prompt: t(`tasks.${task}.prompt`),
								signal: controller.signal
							}).catch(() => {
								setError(true);
							}).finally(() => {
								setBusy(false);
							});
						},
						children: t(busy ? "tasks.preparing" : "tasks.open")
					}),
					actions.startTask === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("tasks.unavailable")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-task-error",
						role: "alert",
						children: t("tasks.error")
					})
				]
			});
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
				id: "tasks",
				order: 10,
				defaultSize: "s",
				defaultHeight: 8,
				Glyph: IconQuick,
				title: (t) => t("widget.tasks.title"),
				body: TasksBody
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
				id: "running",
				order: 30,
				defaultSize: "s",
				defaultHeight: 4,
				Glyph: IconRunning,
				title: (t) => t("widget.running.title"),
				body: RunningBody
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
		function activityWeeks(days, today, width, range) {
			const count = range === "year" || range === "auto" && width >= 640 ? 365 : 84;
			const first = shiftCalendarDay(today, 1 - count);
			const start = shiftCalendarDay(first, -(((/* @__PURE__ */ new Date(`${first}T12:00:00Z`)).getUTCDay() + 6) % 7));
			const values = new Map(days.map((day) => [day.key, day]));
			const weeks = [];
			for (let key = start; key <= today;) {
				const week = [];
				for (let i = 0; i < 7; i++) {
					week.push(key < first || key > today ? null : values.get(key) ?? {
						key,
						messages: 0,
						sessions: 0
					});
					key = shiftCalendarDay(key, 1);
				}
				weeks.push(week);
			}
			return {
				weeks,
				count,
				first
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
			const { t } = useBuiltin();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityBody, { ...props }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
				t,
				widgetProps: props,
				title: t("activity.title"),
				label: t("activity.edit"),
				Fields: ActivitySettings,
				validate: validateActivityConfig
			})] });
		}
		function ActivityBody({ config, width, preview }) {
			const { t, state, actions } = useBuiltin();
			const [date, setDate] = (0, react.useState)();
			const { result, error, loading, detailReady, retry } = useActivity(config.cwd, date, preview);
			const calendar = (0, react.useRef)(null);
			const ready = result !== null && result.available;
			(0, react.useEffect)(() => {
				if (preview) return;
				const node = calendar.current;
				if (ready && node) node.scrollLeft = node.scrollWidth;
			}, [
				ready,
				config.cwd,
				config.range,
				width,
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
			const { weeks, count, first } = activityWeeks(result.days, result.today, width, config.range);
			const days = result.days.filter((day) => day.key >= first);
			const active = days.filter((day) => day.messages > 0).length;
			const messages = days.reduce((n, day) => n + day.messages, 0);
			const dayLabel = (day) => t(result.complete ? "activity.day" : "activity.partialDay", {
				date: day.key,
				messages: day.messages,
				sessions: day.sessions
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-activity",
				"data-activity-complete": result.complete,
				"data-activity-range": count === 365 ? "year" : "quarter",
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.period", { days: count }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("activity.messages", { count: messages }) })]
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
						tabIndex: 0,
						"aria-label": t("activity.metric"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-activity-grid",
							style: { gridTemplateColumns: `repeat(${weeks.length}, var(--dsh-activity-cell-size))` },
							children: weeks.map((week, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-activity-week",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-activity-month",
									"aria-hidden": "true",
									children: week.find((day) => day?.key.endsWith("-01"))?.key.slice(5, 7) ?? ""
								}), week.map((day, j) => day ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-activity-cell",
									"data-date": day.key,
									"data-level": activityLevel(day.messages),
									"data-selected": date === day.key,
									"data-unknown": !result.complete && day.messages === 0,
									"aria-label": dayLabel(day),
									"aria-pressed": date === day.key,
									title: dayLabel(day),
									onClick: () => setDate(day.key)
								}, day.key) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-activity-cell dsh-activity-spacer" }, `pad${j}`))]
							}, i))
						})
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
					!result.complete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						role: "status",
						children: t(result.scanning ? "activity.partial" : "activity.incomplete", result.progress)
					}),
					result.complete && messages === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-muted",
						children: t("activity.empty")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-muted",
						children: t("activity.zone", { zone: result.timeZone })
					}),
					date && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsh-activity-detail",
						"aria-label": t("activity.detail", { date }),
						"aria-busy": loading || !detailReady && !error,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("activity.detail", { date }) }),
							!detailReady ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-muted",
								role: "status",
								children: t(error ? "activity.error" : "activity.loading")
							}) : result.sessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-muted",
								children: t(result.complete ? "activity.dateEmpty" : "activity.dateUnknown")
							}) : result.sessions.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
							}, session.id)),
							detailReady && result.matchedSessions > 100 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-muted",
								children: t("activity.detailCount", { count: result.matchedSessions })
							})
						]
					})
				]
			});
		}
		function ActivitySettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const { result, error, retry } = useActivity("");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dsh-settings-field",
					children: [t("activity.cwd"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						value: config.cwd,
						onChange: (event) => onConfigChange({
							...config,
							cwd: event.target.value
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("activity.all")
							}),
							config.cwd && !result?.workspaces.includes(config.cwd) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: config.cwd,
								children: config.cwd
							}),
							result?.workspaces.map((cwd) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: cwd,
								children: cwd
							}, cwd))
						]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dsh-settings-field",
					children: [t("activity.range"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						value: config.range,
						onChange: (event) => onConfigChange({
							...config,
							range: event.target.value
						}),
						children: [
							"auto",
							"quarter",
							"year"
						].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value,
							children: t(`activity.${value}`)
						}, value))
					})]
				})
			] });
		}
		function registerActivityWidget(registry, t) {
			return registry.register({
				typeId: "@vlln/dsh-home:activity",
				apiVersion: 1,
				title: () => t("activity.title"),
				description: () => t("activity.description"),
				source: "@vlln/dsh-home",
				preview: { data: {
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
				} },
				defaults: {
					size: "m",
					height: 6,
					minHeight: 5
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
		//#region src/client/personal-model.ts
		const PERSONAL_CONFIG_MAX_BYTES = 8 * 1024;
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
			return {
				title: "",
				text: ""
			};
		}
		function defaultClockConfig() {
			return {
				label: "",
				timeZone: "",
				hour12: false
			};
		}
		function validateNotesConfig(config) {
			if (!fields(config, ["title", "text"])) return false;
			if (typeof config.title !== "string" || config.title.length > 120 || typeof config.text !== "string" || config.text.length > 8192) return false;
			return personalConfigBytes(config) <= PERSONAL_CONFIG_MAX_BYTES;
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
			return fields(config, [
				"label",
				"timeZone",
				"hour12"
			]) && typeof config.label === "string" && config.label.length <= 120 && typeof config.hour12 === "boolean" && isValidTimeZone(config.timeZone) && personalConfigBytes(config) <= 8192;
		}
		/** The caller supplies an explicit translated locale tag, never language guessed from prose. */
		function formatPersonalClock(now, config, locale) {
			const zone = config.timeZone === "" ? {} : { timeZone: config.timeZone };
			return {
				time: new Intl.DateTimeFormat(locale, {
					...zone,
					hour: "2-digit",
					minute: "2-digit",
					hour12: config.hour12
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
		//#region src/client/personal-widgets.tsx
		/** Personal builtins use only the public widget registry; the host owns drafts and persistence. */
		function textFieldLabels(t) {
			return {
				overridden: false,
				overriddenLabel: t("personal.edited"),
				resetLabel: t("personal.reset"),
				disabled: false
			};
		}
		function NotesContent(props) {
			const { config } = props;
			const { t } = useBuiltin();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-notes",
				children: [
					config.title !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "dsh-personal-label",
						children: config.title
					}),
					config.text === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-personal-hint",
						children: t("notes.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-personal-note-text",
						children: config.text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
						t,
						widgetProps: props,
						title: t("widget.notes.title"),
						label: t("notes.edit"),
						Fields: NotesSettings,
						validate: validateNotesConfig
					})
				]
			});
		}
		function NotesSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const id = (0, react.useId)();
			const [tooLong, setTooLong] = (0, react.useState)(false);
			const update = (next) => {
				if (!validateNotesConfig(next)) {
					setTooLong(true);
					return;
				}
				setTooLong(false);
				onConfigChange(next);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-settings",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						...textFieldLabels(t),
						id: `${id}-title`,
						label: t("notes.title"),
						text: config.title,
						invalid: false,
						hint: t("personal.labelLimit"),
						invalidLabel: t("personal.labelLimit"),
						onEdit: (title) => update({
							...config,
							title
						}),
						onReset: () => update({
							...config,
							title: ""
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-personal-field",
						htmlFor: `${id}-text`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("notes.text") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							id: `${id}-text`,
							className: "dsh-personal-textarea",
							rows: 7,
							value: config.text,
							"aria-describedby": `${id}-hint ${id}-bytes${tooLong ? ` ${id}-error` : ""}`,
							onChange: (event) => update({
								...config,
								text: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						id: `${id}-hint`,
						className: "dsh-personal-hint",
						children: [
							t("notes.plainText"),
							" ",
							t("notes.limit")
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						id: `${id}-bytes`,
						className: "dsh-personal-hint",
						children: t("notes.bytes", {
							used: personalConfigBytes(config),
							max: PERSONAL_CONFIG_MAX_BYTES
						})
					}),
					tooLong && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						id: `${id}-error`,
						className: "dsh-personal-error",
						role: "alert",
						children: t("notes.limitError")
					})
				]
			});
		}
		function ClockContent(props) {
			const { config, visible, preview } = props;
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
			const { time, date } = formatPersonalClock(now, config, t("clock.dateLocale"));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-clock",
				children: [
					config.label !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "dsh-personal-label",
						children: config.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
						className: "dsh-personal-clock-time",
						dateTime: new Date(now).toISOString(),
						children: time
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-personal-clock-date",
						children: date
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-personal-clock-meta",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-personal-hint",
							children: config.timeZone || t("clock.browserZone")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetConfigEditor, {
							t,
							widgetProps: props,
							title: t("widget.clock.title"),
							label: t("clock.edit"),
							Fields: ClockSettings,
							validate: validateClockConfig
						})]
					})
				]
			});
		}
		function ClockSettings({ config, onConfigChange }) {
			const { t } = useBuiltin();
			const id = (0, react.useId)();
			const [labelTooLong, setLabelTooLong] = (0, react.useState)(false);
			const [zoneTooLong, setZoneTooLong] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-personal-settings",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						...textFieldLabels(t),
						id: `${id}-label`,
						label: t("clock.label"),
						text: config.label,
						invalid: labelTooLong,
						invalidLabel: t("personal.labelLimit"),
						hint: t("personal.labelLimit"),
						onEdit: (label) => {
							setLabelTooLong(label.length > 120);
							if (label.length <= 120) onConfigChange({
								...config,
								label
							});
						},
						onReset: () => {
							setLabelTooLong(false);
							onConfigChange({
								...config,
								label: ""
							});
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						...textFieldLabels(t),
						id: `${id}-zone`,
						label: t("clock.timeZone"),
						text: config.timeZone,
						invalid: zoneTooLong || !isValidTimeZone(config.timeZone),
						invalidLabel: t("clock.zoneInvalid"),
						placeholder: "Asia/Shanghai",
						hint: t("clock.zoneHint"),
						onEdit: (timeZone) => {
							setZoneTooLong(timeZone.length > 100);
							if (timeZone.length <= 100) onConfigChange({
								...config,
								timeZone
							});
						},
						onReset: () => {
							setZoneTooLong(false);
							onConfigChange({
								...config,
								timeZone: ""
							});
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-personal-switch-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("clock.hour12") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
							checked: config.hour12,
							label: t("clock.hour12"),
							onChange: (hour12) => onConfigChange({
								...config,
								hour12
							})
						})]
					})
				]
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
					configVersion: 1,
					source: "@vlln/dsh-home",
					title: () => t("widget.notes.title"),
					description: () => t("widget.notes.description"),
					icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular,
					preview: { config: () => ({
						title: t("gallery.sample.noteTitle"),
						text: t("gallery.sample.noteText")
					}) },
					defaults: {
						size: "s",
						height: 6,
						minHeight: 4
					},
					defaultConfig: defaultNotesConfig,
					validateConfig: validateNotesConfig,
					Content: NotesContent
				}));
				disposers.push(registry.register({
					typeId: "@vlln/dsh-home:clock",
					apiVersion: 1,
					configVersion: 1,
					source: "@vlln/dsh-home",
					title: () => t("widget.clock.title"),
					description: () => t("widget.clock.description"),
					icon: _deepseek_ai_dsh_client_ui_primitives.IconClockOutlineRegular,
					preview: {
						config: () => ({
							...defaultClockConfig(),
							timeZone: "UTC"
						}),
						data: { now: Date.UTC(2026, 9, 20, 10, 24) }
					},
					defaults: {
						size: "s",
						height: 4,
						minHeight: 4
					},
					defaultConfig: defaultClockConfig,
					validateConfig: validateClockConfig,
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
				defaults: {
					size: "s",
					height: 4
				},
				configVersion: 2,
				defaultConfig: defaultQuickConfig,
				validateConfig: validateQuickConfig,
				migrateConfig: migrateQuickConfig,
				Content: QuickContent
			});
		}
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
			const interaction = typeof status?.pendingInteraction === "string" ? status.pendingInteraction : status?.pendingInteraction?.kind;
			if (interaction === "approval") return t("queue.approval");
			if (interaction === "plan-review") return t("queue.plan");
			if (interaction === "question") return t("queue.question");
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
					!props.embedded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
							!props.embedded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
				children: [!props.embedded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
		//#endregion
		//#region src/client/builtin-registration.tsx
		/** Internal adapters: builtins use the same public registry; no business dispatch lives in the page. */
		const Runtime = (0, react.createContext)(null);
		const EMPTY = /* @__PURE__ */ new Map();
		function BuiltinProvider({ store, t, actions, useSessionStatus, children }) {
			const statuses = (useSessionStatus ?? ((selector) => selector(EMPTY)))((snapshot) => snapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Runtime.Provider, {
				value: {
					store,
					t,
					actions,
					statuses,
					statusSource: useSessionStatus ? "runtime" : "none"
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
		function BuiltinPreviewProvider({ t, data, children }) {
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
					statusSource: hasLedger ? "runtime" : "none"
				};
			}, [t, data]);
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
		function ResumeContent() {
			const { state, store, t, actions, statuses, statusSource } = useBuiltin();
			const [index, setIndex] = (0, react.useState)(0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusResume, {
				t,
				data: state.ledger,
				sessions: state.sessions,
				statuses,
				dismissed: state.prefs.dismissed,
				now: state.now,
				actions,
				statusSource,
				embedded: true,
				index,
				onNext: () => setIndex((i) => i + 1),
				onDismiss: (id) => store.dismiss(id)
			});
		}
		function QueueContent() {
			const { state, store, t, actions, statuses, statusSource } = useBuiltin();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusQueue, {
				t,
				data: state.ledger,
				sessions: state.sessions,
				statuses,
				dismissed: state.prefs.dismissed,
				now: state.now,
				actions,
				statusSource,
				embedded: true,
				onDismiss: (id) => store.dismiss(id)
			});
		}
		function registerBuiltins(registry, t) {
			const disposers = BUILTIN_WIDGETS.map((widget) => {
				function Content({ size }) {
					const { state, t, actions, statuses, statusSource } = useBuiltin();
					const Body = widget.body;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Body, {
						t,
						data: state.ledger,
						sessions: state.sessions,
						now: state.now,
						actions,
						size,
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
					defaults: {
						size: widget.defaultSize,
						height: widget.defaultHeight
					},
					configVersion: 1,
					defaultConfig: () => ({}),
					validateConfig: () => true,
					Content
				});
			});
			for (const widget of [{
				id: "resume",
				title: "resume.eyebrow",
				size: "m",
				Content: ResumeContent
			}, {
				id: "queue",
				title: "queue.title",
				size: "s",
				Content: QueueContent
			}]) disposers.push(registry.register({
				typeId: `@vlln/dsh-home:${widget.id}`,
				apiVersion: 1,
				title: () => t(widget.title),
				description: () => t(`gallery.description.${widget.id}`),
				source: "@vlln/dsh-home",
				preview: { data: builtinPreviewData(t) },
				defaults: {
					size: widget.size,
					height: 4
				},
				configVersion: 1,
				defaultConfig: () => ({}),
				validateConfig: () => true,
				Content: widget.Content
			}));
			disposers.push(registerActivityWidget(registry, t), registerPersonalWidgets(registry, t), registerQuickWidget(registry, t));
			return () => {
				for (const off of disposers.reverse()) off();
			};
		}
		//#endregion
		//#region src/client/widget-preview.tsx
		/** The gallery renders the registered Content, never an independent illustration or live instance. */
		function WidgetPreview({ definition, t, size, width, height }) {
			const sample = (0, react.useMemo)(() => createWidgetPreviewProps(definition, {
				size: definition.defaults.size,
				width: 0,
				height: 0
			}), [definition]);
			const Content = definition.Content;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BuiltinPreviewProvider, {
				t,
				data: sample.preview.data,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					inert: true,
					"aria-hidden": "true",
					"data-widget-content-preview": definition.typeId,
					style: {
						width,
						height,
						pointerEvents: "none"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content, {
						...sample,
						size,
						width,
						height
					})
				})
			});
		}
		//#endregion
		//#region src/client/widget-frame.tsx
		function WidgetFrameHeader({ title, t, editing, icon, onDelete, onPointerDown, onNudge, disabled = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-w-head${editing ? " dsh-widget-grip" : ""}`,
				onPointerDown,
				children: [
					icon,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: "dsh-w-title",
						children: title
					}),
					editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tools",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-tool dsh-widget-grip",
							disabled,
							"aria-label": t("edit.drag"),
							title: t("edit.drag"),
							onKeyDown: (event) => {
								if (onNudge && event.key.startsWith("Arrow")) {
									event.preventDefault();
									onNudge(event.key);
								}
							},
							children: "⠿"
						}), onDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-tool dsh-delete-widget",
							disabled,
							"aria-label": t("manager.delete"),
							title: t("manager.delete"),
							onClick: onDelete,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 16 })
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/widget-gallery.tsx
		/** A library of ordinary widget shells: real Content previews and the same title/grip drag affordance. */
		function WidgetGallery({ definitions, t, disabled, onDrag, onClose }) {
			const [search, setSearch] = (0, react.useState)(""), [source, setSource] = (0, react.useState)("all");
			const pending = (0, react.useRef)(null);
			const [dragSource, setDragSource] = (0, react.useState)(null);
			const sourceRelease = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				pending.current?.();
				sourceRelease.current?.();
			}, []);
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
				className: "dsh-library-panel",
				"aria-label": t("gallery.addTab"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-library-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("gallery.addTab") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							"aria-label": t("library.close"),
							onClick: onClose,
							children: "×"
						})]
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
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetFrameHeader, {
										title,
										t,
										editing: true,
										disabled: disabled && dragSource !== definition.typeId,
										icon: Icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 14 }) : void 0,
										onPointerDown: (event) => begin(definition, event)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-library-preview",
										inert: true,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
											fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-empty",
												children: t("error.card")
											}),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-library-preview-scale",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPreview, {
													definition,
													t,
													size: definition.defaults.size,
													width: 480,
													height: 260
												})
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
		//#region src/client/page.tsx
		/** Registry-driven widget instances. The page owns layout, not widget business logic. */
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
		function contentProps(instance, rect, width, cols, editing, visible) {
			return {
				instance,
				config: instance.config,
				size: rect === void 0 ? "m" : sizeFromRect(rect, cols),
				width: rect === void 0 ? width : (width - 12 * (cols - 1)) / cols * rect.w + 12 * (rect.w - 1),
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
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(null);
			const [sinceCount, setSinceCount] = (0, react.useState)(null);
			const [saving, setSaving] = (0, react.useState)(false);
			const [saveError, setSaveError] = (0, react.useState)(false);
			const [managementError, setManagementError] = (0, react.useState)(false);
			const [interacting, setInteracting] = (0, react.useState)(false);
			const seenRef = (0, react.useRef)(false);
			const writable = state.workbenchLoaded && state.storage.writable;
			const busy = saving || state.workbenchBusy;
			const editable = editing && writable && !busy && confirmDelete === null;
			(0, react.useEffect)(() => {
				store.refresh();
			}, [store]);
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
					defaultSize: defaults?.size ?? "m",
					defaultHeight: defaults?.height ?? 4,
					...defaults === void 0 ? {} : {
						minWidth: defaults.minWidth,
						maxWidth: defaults.maxWidth,
						minHeight: defaults.minHeight,
						maxHeight: defaults.maxHeight
					}
				};
			}), [state.instances, byType]);
			const { width, containerRef, mounted } = useContainerWidth({
				measureBeforeMount: true,
				initialWidth: 1100
			});
			const cols = width >= 950 ? 12 : width >= 580 ? 6 : 2;
			(0, react.useEffect)(() => {
				setLibraryDrag(null);
			}, [cols, width]);
			(0, react.useEffect)(() => {
				if (!editing || !writable || busy) setLibraryDrag(null);
			}, [
				editing,
				writable,
				busy
			]);
			const geometry = (0, react.useMemo)(() => state.workbenchLoaded ? buildSpatialLayout(state.layout, metas, cols) : [], [
				state.workbenchLoaded,
				state.layout,
				metas,
				cols
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
				if (interacting || busy || !writable || confirmDelete !== null) return;
				setSaving(true);
				setSaveError(false);
				try {
					store.setSpatialLayout(geometry, cols);
					await store.flushLayout();
					setEditing(false);
					setTrayOpen(false);
					setConfirmDelete(null);
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
				confirmDelete,
				store
			]);
			(0, react.useEffect)(() => {
				const keydown = (event) => {
					if (event.defaultPrevented || event.key !== "Escape" || interacting || busy) return;
					if (confirmDelete !== null) return;
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
				interacting,
				confirmDelete
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
			const deleteInstance = confirmDelete === null ? void 0 : instancesById.get(confirmDelete);
			const deleteTitle = deleteInstance ? widgetText(byType.get(deleteInstance.typeId)?.title, deleteInstance.typeId) : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-home",
				"data-editing": editing ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
									disabled: !writable || busy || interacting || confirmDelete !== null,
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
							definitions,
							t,
							disabled: !writable || busy || interacting || confirmDelete !== null,
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
											x: grab.x * ((width + 12) / cols * item.w - 12),
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
							ref: containerRef,
							className: "dsh-spatial-container",
							"data-layout-surface": "spatial",
							"data-cols": cols,
							children: state.workbenchLoaded && mounted && width > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpatialGrid, {
								width,
								cols,
								layout: geometry,
								editing: editable,
								onCommit: commit,
								onActive: activeChanged,
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPreview, {
										definition: libraryDrag.definition,
										t,
										size: libraryDrag.definition.defaults.size,
										width: Math.max(0, (width + 12) / cols * libraryDrag.item.w - 44),
										height: Math.max(0, libraryDrag.item.h * 56 - 80)
									})
								})] }),
								children: geometry.map((rect) => {
									const instance = instancesById.get(rect.i);
									if (instance === void 0) return null;
									const definition = byType.get(instance.typeId);
									const title = widgetText(definition?.title, instance.typeId);
									const widgetProps = {
										...contentProps(instance, rect, width, cols, editing, true),
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
											icon: definition?.icon !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBoundary, {
												fallback: null,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetIcon, { definition })
											}, definitionIds.current.get(definition)),
											onDelete: () => {
												setManagementError(false);
												setConfirmDelete(instance.instanceId);
											},
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
						})
					]
				}), deleteInstance && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: true,
					title: t("manager.deleteTitle", { title: deleteTitle }),
					description: t("manager.deleteDescription"),
					closeLabel: t("settings.cancel"),
					onClose: () => {
						if (!busy) setConfirmDelete(null);
					},
					className: "dsh-home-delete-modal",
					footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						"data-modal-autofocus": true,
						disabled: busy,
						onClick: () => setConfirmDelete(null),
						children: t("settings.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						className: "dsh-home-danger-button",
						disabled: busy || !writable,
						onClick: () => {
							if (busy || !writable || interacting) return;
							store.removeInstanceDurably(deleteInstance.instanceId).then(() => setConfirmDelete(null)).catch(() => setManagementError(true));
						},
						children: t("manager.confirmDelete")
					})] }),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-home-delete-target",
						children: deleteTitle
					}), managementError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-error",
						role: "alert",
						children: t("manager.error")
					})]
				})]
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
							...typeof item.title === "string" ? { title: item.title } : {},
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
				registry.register(definition, definition.typeId.startsWith("legacy:") ? { internalLegacyTypeId: true } : void 0);
				const instance = registry.createInstance(definition.typeId, crypto.randomUUID());
				this.insertInstance(instance, definition, current, cols);
			}
			/** Publish one accepted library drop and every displaced peer atomically; no first-fit intermediate. */
			dropInstance(definition, id, accepted, cols) {
				this.assertEditable();
				if (![
					2,
					6,
					12
				].includes(cols)) throw new Error("Invalid grid columns");
				if (this.state.instances.length >= 64 || this.state.instances.some((item) => item.instanceId === id)) throw new Error("Invalid new instance");
				const registry = new HomeWidgetRegistry();
				registry.register(definition, definition.typeId.startsWith("legacy:") ? { internalLegacyTypeId: true } : void 0);
				const instance = registry.createInstance(definition.typeId, id);
				const visible = this.state.instances.filter((item) => !this.state.layout.hidden.includes(item.instanceId)).map((item) => item.instanceId);
				if (accepted.length !== visible.length + 1 || new Set(accepted.map((item) => item.i)).size !== accepted.length || !accepted.some((item) => item.i === id) || visible.some((key) => !accepted.some((item) => item.i === key))) throw new Error("Stale drop layout");
				for (const item of accepted) if (![
					item.x,
					item.y,
					item.w,
					item.h
				].every(Number.isInteger) || item.x < 0 || item.y < 0 || item.w < 1 || item.h < 3 || item.x + item.w > cols || item.y + item.h > 10003 || !canPlace(accepted, item.i, item, cols)) throw new Error("Invalid drop geometry");
				const active = accepted.find((item) => item.i === id), defaults = registry.get(definition.typeId).defaults;
				if (active.w < Math.min(defaults.minWidth, cols) || active.w > Math.min(defaults.maxWidth, cols) || active.h < defaults.minHeight || active.h > defaults.maxHeight) throw new Error("Widget bounds exceeded");
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
				this.insertInstance(instance, definition, current, cols);
			}
			insertInstance(instance, definition, current, cols) {
				const defaults = definition.defaults;
				const meta = {
					id: instance.instanceId,
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
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
				this.listeners.clear();
			}
		};
		//#endregion
		//#region src/client/activity-styles.ts
		const activityStyles = `
.dsh-activity { --dsh-activity-cell-size:16px; display:flex; flex-direction:column; gap:8px; min-width:0; }
.dsh-activity[data-activity-range="year"] { --dsh-activity-cell-size:12px; }
.dsh-activity-summary { display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 16px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xs-13); }
.dsh-activity-primary { display:flex; align-items:baseline; gap:6px; }
.dsh-activity-number { color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family); font-size:32px; font-weight:600; line-height:1.15; letter-spacing:-.025em; font-variant-numeric:tabular-nums; }
.dsh-activity-secondary { display:flex; flex-wrap:wrap; gap:4px 12px; }
.dsh-activity-secondary > span + span { padding-inline-start:12px; border-inline-start:.5px solid var(--dsw-alias-border-l2); }
/* Fixed square columns keep wide cards from stretching days into bars. Narrow
   cards scroll locally; explicit/automatic year windows retain their 12px cells. */
.dsh-activity-scroll { overflow-x:auto; max-width:100%; padding:3px; border-radius:var(--dsw-radius-xs); scroll-padding-inline:3px; }
.dsh-activity-scroll:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:-2px; }
.dsh-activity-grid { display:grid; gap:3px; width:max-content; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, var(--dsh-activity-cell-size)); gap:3px; min-width:0; }
.dsh-activity-month { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); overflow:visible; }
.dsh-activity-cell { display:block; flex:none; width:var(--dsh-activity-cell-size); height:var(--dsh-activity-cell-size); aspect-ratio:1; padding:0; border:0; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-module-platform); }
button.dsh-activity-cell { cursor:pointer; transition:box-shadow 120ms ease-out; }
.dsh-activity-cell[data-level="1"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="2"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 44%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="3"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="4"] { background:var(--dsw-alias-state-business-primary); }
.dsh-activity-cell[data-unknown="true"] { background:transparent; outline:1px dashed var(--dsw-alias-border-l3); outline-offset:-1px; }
.dsh-activity-cell[data-selected="true"], button.dsh-activity-cell:focus-visible { outline:2px solid var(--dsw-alias-label-primary); outline-offset:1px; }
button.dsh-activity-cell:is(:hover,:focus-visible) { box-shadow:0 0 0 1px var(--dsw-alias-label-secondary); }
.dsh-activity-spacer { visibility:hidden; }
.dsh-activity-legend { display:flex; align-items:center; justify-content:flex-start; gap:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-legend .dsh-activity-cell { width:12px; height:12px; }
.dsh-activity > .dsh-muted { margin:0; overflow-wrap:anywhere; }
.dsh-activity-detail { display:flex; flex-direction:column; gap:6px; border-top:0.5px solid var(--dsw-alias-border-l2); padding-top:10px; font:var(--dsw-font-xs-13); }
.dsh-settings-field { display:flex; flex-direction:column; gap:6px; font:var(--dsw-font-xs-13); }
.dsh-settings-field select { max-width:100%; padding:8px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-primary); background:var(--dsw-specific-input-major); font:inherit; }
@media (prefers-reduced-motion: reduce) { button.dsh-activity-cell { transition:none; } }
`;
		//#endregion
		//#region src/client/personal-styles.ts
		/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
		const personalStyles = `
.dsh-personal-notes,.dsh-personal-clock{min-width:0;max-width:100%;color:var(--dsw-alias-label-primary)}
.dsh-personal-notes{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0}
.dsh-personal-notes > .dsh-personal-label,.dsh-personal-notes > .dsh-personal-hint{flex:none}
.dsh-personal-notes > .dsh-personal-note-text{flex:1 1 auto;min-height:1.6em;overflow:auto;scroll-padding-block:4px;padding-inline-end:4px}
.dsh-personal-notes > .dsh-widget-own-editor{flex:none;justify-content:flex-start;margin-top:0;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2)}
.dsh-personal-label{margin:0;font:var(--dsw-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-note-text{font-size:var(--dsh-content-font-size);line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-personal-hint{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere}
.dsh-personal-clock{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.dsh-personal-clock > *{flex:none}
.dsh-personal-clock-meta{display:flex;align-items:center;justify-content:space-between;gap:4px 8px;width:100%;flex-wrap:wrap;padding-top:4px}
.dsh-personal-clock-meta .dsh-widget-own-editor{margin-top:0;flex:none}
.dsh-personal-clock-meta .dsh-personal-hint{flex:1 1 100px;min-width:0}
.dsh-personal-clock-time{font-family:var(--dsw-font-family);font-size:clamp(32px,6vw,48px);font-weight:600;line-height:1.1;letter-spacing:-.035em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;max-width:100%}
.dsh-personal-clock-date{margin:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:is(:hover,:focus-visible){border-color:var(--dsw-alias-border-l3)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xs-13)}
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
  color: var(--dsw-alias-state-error-primary);
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
.dsh-preview-fallback { display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; font:var(--dsw-font-s-14); }
.dsh-preview-fallback svg { width:36px; height:36px; color:var(--dsw-alias-label-tertiary); }
.dsh-preview-heatmap { display:grid; grid-auto-flow:column; grid-template-rows:repeat(7,10px); grid-template-columns:repeat(13,minmax(7px,1fr)); gap:4px; width:100%; max-width:270px; }
.dsh-preview-heatmap i { border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-border-l2); }
.dsh-preview-heatmap i[data-level="1"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="2"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="3"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 65%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="4"] { background:var(--dsw-alias-state-business-primary); }
.dsh-preview-note { width:100%; font:var(--dsw-font-xs-13); }
.dsh-preview-note strong { font:var(--dsw-font-s-strong-14); }
.dsh-preview-note p { margin:10px 0; line-height:1.6; }
.dsh-preview-line { display:block; height:5px; width:80%; margin-top:8px; background:var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-xs); }
.dsh-preview-line:last-child { width:55%; }
.dsh-preview-clock { display:flex; flex-direction:column; gap:6px; align-items:center; }
.dsh-preview-clock strong { font-size:38px; line-height:1.2; font-weight:500; font-variant-numeric:tabular-nums; }
.dsh-preview-clock span { font:var(--dsw-font-xs-13); color:var(--dsw-alias-label-secondary); }
.dsh-preview-bars { display:flex; align-items:flex-end; height:90px; gap:6px; width:100%; }
.dsh-preview-bars i { flex:1; min-width:0; border-radius:var(--dsw-radius-xs); background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 48%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-today { width:100%; display:flex; flex-direction:column; gap:14px; font:var(--dsw-font-xs-13); }
.dsh-preview-today strong { font:var(--dsw-font-l-20); }
.dsh-preview-today > div { height:16px; background:var(--dsw-alias-border-l1); display:flex; gap:14px; align-items:stretch; padding-left:15%; }
.dsh-preview-today i { width:18%; background:var(--dsw-alias-state-business-primary); border-radius:var(--dsw-radius-xs); }
.dsh-preview-today span { color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxxs-11); }
.dsh-preview-rows { width:100%; display:flex; flex-direction:column; gap:12px; }
.dsh-preview-rows > div { display:flex; align-items:center; gap:8px; font:var(--dsw-font-xs-13); min-width:0; }
.dsh-preview-rows i { width:6px; height:6px; flex:none; background:var(--dsw-alias-border-l4); border-radius:50%; corner-shape:round; }
.dsh-preview-rows i[data-live="true"] { background:var(--dsw-alias-state-success-primary); }
.dsh-preview-rows span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.dsh-preview-rows small { color:var(--dsw-alias-label-tertiary); }
@media(max-width:720px) { .dsh-widget-directory { grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); } .dsh-gallery-toolbar { gap:8px; } }
`;
		//#endregion
		//#region src/client/library-styles.ts
		const libraryStyles = `
.dsh-library-panel { position:fixed; z-index:80; top:92px; right:20px; bottom:24px; width:min(400px,calc(100vw - 96px)); padding:16px; border:.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-xl); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); box-shadow:var(--dsw-shadow-lv3); display:flex; flex-direction:column; min-height:0; }
.dsh-library-heading { display:flex; align-items:center; justify-content:space-between; }
.dsh-library-heading h2 { font:var(--dsw-font-s-strong-14); margin:0 0 8px; }
.dsh-library-panel .dsh-gallery-toolbar { flex-direction:column; align-items:stretch; gap:8px; }
.dsh-library-panel .dsh-widget-directory { display:flex; flex-direction:column; gap:12px; max-height:none; overflow-y:auto; min-height:0; padding:2px 6px 8px 2px; }
.dsh-library-panel .dsh-directory-item { flex:none; padding:12px; height:220px; overflow:visible; background:var(--dsw-alias-settings-card-fill); transition:box-shadow 120ms ease; }
.dsh-library-panel .dsh-directory-item:hover,.dsh-library-panel .dsh-directory-item:focus-within { box-shadow:var(--dsw-shadow-lv2); border-color:var(--dsw-alias-border-l4); }
.dsh-library-panel .dsh-w-head { touch-action:none; cursor:grab; flex:none; }
.dsh-library-panel .dsh-w-title { flex:1; }
.dsh-library-preview { position:relative; width:100%; flex:1; min-height:0; overflow:hidden; margin-top:8px; pointer-events:none; }
.dsh-library-preview-scale { transform:scale(.68); transform-origin:top left; width:480px; height:260px; }
.dsh-library-ghost { position:fixed; z-index:1000; pointer-events:none; overflow:hidden; margin:0; box-sizing:border-box; box-shadow:var(--dsw-shadow-lv3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); opacity:.9; }
.dsh-library-ghost[data-inside="false"] { opacity:.55; }
.dsh-library-outline {position:fixed;z-index:70;pointer-events:none;border:2px solid var(--dsw-alias-state-business-primary);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-state-business-tertiary);opacity:.4;box-sizing:border-box}
.dsh-library-outline[data-pending="true"]{border-style:dashed;background:transparent}
.dsh-library-ghost .dsh-w-head { flex:none; }
@media(prefers-reduced-motion:reduce){.dsh-library-panel .dsh-directory-item{transition:none}}
@media(max-width:720px){.dsh-library-panel { top:auto; height:360px; bottom:16px; right:16px; width:calc(100vw - 88px); } .dsh-library-preview-scale {transform:scale(.6)} }
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
.dsh-home-widget :is(.dsh-row,.dsh-queue-main,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button) { transition:background-color 120ms ease-out,color 120ms ease-out; }
.dsh-home-widget .dsh-row:focus-visible { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-row-static:focus-visible { background:transparent; }
.dsh-home-widget:focus-within { border-color:var(--dsw-alias-border-l4); }
/* Existing scroll containers still own overflow. Reserve space for focus rings
   and never flex-shrink an editor into an unusable sliver in a short card. */
.dsh-home .dsh-home-widget-content { scroll-padding-block:4px; }
.dsh-home-widget .dsh-widget-own-editor { flex-shrink:0; padding-inline:2px; padding-bottom:2px; }
.dsh-home-widget .dsh-widget-own-editor > button { flex-shrink:0; }

/* Today is selected by its real time-strip content, not a page business ID. */
.dsh-home-widget .dsh-widget-viewport:has(> .dsh-band-track) > .dsh-metric { gap:6px 10px; }
.dsh-home-widget .dsh-widget-viewport:has(> .dsh-band-track) .dsh-number { font-size:34px; line-height:40px; letter-spacing:-.025em; }
.dsh-home-widget .dsh-band-track { height:18px; margin-top:6px; background:var(--dsw-alias-bg-module-platform); }
.dsh-home-widget .dsh-band-seg { opacity:.4; }
.dsh-home-widget .dsh-band-seg[data-now="true"] { opacity:.8; }
.dsh-home-widget .dsh-band-seg:hover { opacity:1; }
.dsh-home-widget .dsh-band-scale { margin-top:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-w-facts { gap:4px 12px; margin-top:8px; font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-secondary); }

/* Resume keeps its actual snippet, dismiss and continuation actions. */
.dsh-home-widget .dsh-focus { gap:8px; }
.dsh-home-widget .dsh-focus-title { font-size:18px; line-height:26px; }
.dsh-home-widget .dsh-focus-snippet { font-size:var(--dsh-content-font-size-secondary,13px); line-height:1.6; }
.dsh-home-widget .dsh-focus-meta { gap:4px 8px; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-focus-actions { flex-wrap:wrap; }
.dsh-home-widget .dsh-focus-primary:focus-visible { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget :is(.dsh-focus-secondary,.dsh-icon-button):focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

/* Queue status is present in the data already: a quiet row and a colored dot,
   with the real reason retained as text rather than an invented status. */
.dsh-home-widget .dsh-queue-row { margin:0; gap:4px; }
.dsh-home-widget .dsh-queue-main { gap:5px; padding:8px; background:var(--dsw-alias-bg-module-platform); }
.dsh-home-widget .dsh-queue-main:is(:hover,:focus-visible) { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-queue-meta { gap:6px 10px; }
.dsh-home-widget .dsh-queue-meta .dsh-chip { display:inline-flex; align-items:center; gap:5px; height:auto; min-height:18px; padding:0; border-radius:0; background:transparent; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-queue-meta .dsh-chip::before { content:''; width:6px; height:6px; flex:none; border-radius:50%; corner-shape:round; background:currentColor; }

/* Compact recent rows: strong title, recognizable directory, quieter ID/time.
   Unknown/idle must remain neutral and must never imply a completed session. */
.dsh-home-widget .dsh-recent { gap:10px; }
.dsh-home-widget .dsh-recent-row { gap:4px; padding-block:8px; }
.dsh-home-widget .dsh-recent-row + .dsh-recent-row { border-top:.5px solid var(--dsw-alias-border-l1); }
.dsh-home-widget .dsh-recent-meta { gap:2px 10px; }
.dsh-home-widget .dsh-recent-path { color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-recent-id { font-size:11px; color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-recent-row .dsh-chip { height:20px; padding-inline:6px; font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-recent-row:is([data-status="idle"],[data-status="unknown"]) .dsh-chip { background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-recent-row[data-status="running"] .dsh-chip { background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent); color:var(--dsw-alias-state-success-primary); }

/* Task choices remain choices; the only primary action still prepares a draft. */
.dsh-home-widget .dsh-tasks { gap:10px; }
.dsh-home-widget .dsh-tasks > .dsh-muted { line-height:1.5; }
.dsh-home-widget .dsh-task-options { gap:4px; }
.dsh-home-widget .dsh-task-options > button[aria-pressed="true"] { background:var(--dsw-alias-button-ghost-active-fill); color:var(--dsw-alias-label-primary); }
.dsh-home-widget .dsh-task-preview { padding-block:8px; border-block:.5px solid var(--dsw-alias-border-l2); }

/* Local feedback only; no entrance choreography or changes to placement. */
.dsh-home .dsh-w { animation:none; }
.dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition-duration:150ms; }
@media (prefers-reduced-motion: reduce) {
  .dsh-home-widget :is(.dsh-row,.dsh-row-arrow,.dsh-queue-main,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button),
  .dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition:none; }
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
.dsh-home-inner { width: 100%; max-width: none; min-width: 0; flex: none; }

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


/* Registry directory, instance management and host-owned settings drafts. */
.dsh-workbench-notice {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0;
  padding: 12px 14px; border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-state-warn-tertiary); color: var(--dsw-alias-label-secondary);
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
.dsh-tool.dsh-delete-widget { color: var(--dsw-alias-state-error-primary); }
.dsh-tool.dsh-delete-widget:hover { color: var(--dsw-alias-state-error-primary); background: var(--dsw-alias-interactive-bg-hover-danger); }
/* Button has no danger variant; preserve the official control geometry, override semantic colors only. */
.dsh-home-danger-button { background: var(--dsw-alias-state-error-primary) !important; color: var(--dsw-alias-label-primary-foreground) !important; }
.dsh-home-danger-button:hover { filter: brightness(.92); }
.dsh-home-delete-target { margin: 0; overflow-wrap: anywhere; font: var(--dsw-font-s-strong-14); color: var(--dsw-alias-label-primary); }
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
.dsh-recent, .dsh-tasks { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.dsh-recent-row { gap: 6px; padding-top: 10px; padding-bottom: 10px; }
.dsh-recent-row .dsh-row-top { justify-content: space-between; }
.dsh-recent-row .dsh-chip { display: inline-flex; align-items: center; cursor: inherit; flex: none; white-space: nowrap; }
.dsh-recent-meta { display: flex; align-items: center; gap: 6px 12px; flex-wrap: wrap; }
.dsh-recent-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.dsh-recent-id { font-family: var(--ds-font-family-code); }
.dsh-recent-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
.dsh-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-task-options { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-tasks p { margin: 0; }
.dsh-task-preview { font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.dsh-task-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; }
.dsh-home-grid + .dsh-focus-stack { margin-top: 20px; }
.dsh-home-grid > .dsh-w + .dsh-w { margin-top: 0; }

/* Unified mobile-widget editing surface. Only the editing shell owns gestures. */
.dsh-home-head { position: sticky; top: 0; z-index: 8; background: var(--dsw-alias-bg-base); padding: 8px 0 12px; }
.dsh-home-widget { min-width: 0; }
.dsh-home-widget .dsh-focus, .dsh-home-widget .dsh-queue {
  border: 0; background: transparent; padding: 0; border-radius: 0; animation: none; margin: 0;
}
.dsh-home-widget .dsh-focus-eyebrow-row:empty { display: none; }
.dsh-home-widget-content { position: relative; }
.dsh-home[data-editing="true"] .dsh-home-widget { border-style: dashed; border-color: var(--dsw-alias-state-business-primary); animation: none; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-w-head { cursor: grab; touch-action: none; position: relative; z-index: 3; flex-wrap: wrap; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-tools { opacity: 1; }
.dsh-home[data-editing="true"] .dsh-home-widget-content { opacity: 0.65; pointer-events: none; user-select: none; }
.dsh-widget-drag-cover { position: absolute; inset: 52px 0 0; z-index: 2; cursor: grab; touch-action: none; border-radius: inherit; }
.dsh-home-widget[data-dragging="true"] { opacity: 0.5; outline: 2px solid var(--dsw-alias-state-business-primary); }
.dsh-edit-footnote { margin-top: 16px; }
.dsh-remove-widget { color: var(--dsw-alias-state-error-primary); }
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
.dsh-home .react-grid-item.react-draggable-dragging { box-shadow: var(--dsw-shadow-lv3, 0 8px 24px var(--dsw-alias-border-l3)); border-color: var(--dsw-alias-state-business-primary); opacity: 0.96; }
.dsh-home .react-grid-item.react-grid-placeholder { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); border: 2px dashed var(--dsw-alias-state-business-primary); border-radius: var(--dsw-radius-xl); z-index: 1; pointer-events: none; transition: none; }
.dsh-home .dsh-spatial-grid[data-hover-pending="true"] .react-grid-placeholder {
  border-color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 8%, transparent);
}
.dsh-home .dsh-spatial-grid[data-drop-rejected="true"] .react-grid-placeholder {
  border-color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.dsh-home .react-grid-item > .react-resizable-handle { position: absolute; width: 24px; height: 24px; z-index: 6; touch-action: none; }
.dsh-home .react-grid-item > .react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
.dsh-home .react-grid-item > .react-resizable-handle::after { content: ''; position: absolute; right: 7px; bottom: 7px; width: 7px; height: 7px; border-right: 2px solid var(--dsw-alias-label-tertiary); border-bottom: 2px solid var(--dsw-alias-label-tertiary); }
.dsh-home .react-resizable-hide > .react-resizable-handle { display: none; }
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
			element.textContent = CSS + activityStyles + personalStyles + quickStyles + galleryStyles + libraryStyles + widgetRefinementStyles;
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
			"activity.edit": "筛选范围",
			"activity.metric": "人工消息",
			"activity.summary": "近 {days} 天 · {active} 天有记录 · {messages} 条消息",
			"activity.activeDays": "天有记录",
			"activity.period": "近 {days} 天",
			"activity.day": "{date} · {messages} 条人工消息 · {sessions} 个会话",
			"activity.partialDay": "{date} · 已整理 {messages} 条人工消息（历史未完整）",
			"activity.less": "少",
			"activity.more": "多",
			"activity.loading": "正在读取工作足迹…",
			"activity.error": "工作足迹未能读取，请重试。",
			"activity.retry": "重试",
			"activity.partial": "历史尚未完整：正在整理 {done}/{total}。空格不代表已确认无活动。",
			"activity.incomplete": "部分历史不可用。空格不代表已确认无活动。",
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
			"activity.auto": "自动（随宽度调整）",
			"activity.quarter": "最近 12 周",
			"activity.year": "最近一年",
			"activity.zone": "时区：{zone} · 仅统计顶层会话的人工消息"
		};
		const enActivity = {
			"activity.title": "Work footprints",
			"activity.description": "Human messages by browser time zone; use Filter range to choose a directory and period. Excludes subagents and automatic continuation.",
			"activity.edit": "Filter range",
			"activity.metric": "Human messages",
			"activity.summary": "Last {days} days · {active} recorded days · {messages} messages",
			"activity.activeDays": "recorded days",
			"activity.period": "Last {days} days",
			"activity.day": "{date} · {messages} human messages · {sessions} sessions",
			"activity.partialDay": "{date} · {messages} indexed human messages (history incomplete)",
			"activity.less": "Less",
			"activity.more": "More",
			"activity.loading": "Loading work footprints…",
			"activity.error": "Could not load work footprints. Please retry.",
			"activity.retry": "Retry",
			"activity.partial": "History incomplete: indexing {done}/{total}. Empty cells are not confirmed inactivity.",
			"activity.incomplete": "Some history is unavailable. Empty cells are not confirmed inactivity.",
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
			"activity.auto": "Automatic (fits width)",
			"activity.quarter": "Last 12 weeks",
			"activity.year": "Last year",
			"activity.zone": "Time zone: {zone} · Human messages in top-level sessions only"
		};
		//#endregion
		//#region src/client/personal-locales.ts
		/** Merge into the home client's zh/en dictionaries; date locale is explicit UI state. */
		const zhPersonal = {
			"widget.notes.title": "便笺",
			"widget.notes.description": "保存一段纯文本；通过「编辑便笺」独立修改标题与内容。",
			"notes.edit": "编辑便笺",
			"notes.title": "标题（可选）",
			"notes.text": "内容",
			"notes.empty": "还没有内容。点击「编辑便笺」，写下想记住的事。",
			"notes.plainText": "仅保存纯文本，不解析 HTML 或 Markdown。",
			"notes.limit": "标题与内容的 JSON 配置合计最多 8 KiB（UTF-8）。",
			"notes.bytes": "已用 {used} / {max} 字节",
			"notes.limitError": "内容过长，未加入草稿。请缩短标题或内容后重试。",
			"personal.labelLimit": "最多 120 个字符。",
			"personal.reset": "清空",
			"personal.edited": "已编辑",
			"widget.clock.title": "时钟与日期",
			"widget.clock.description": "显示时间与日期，每分钟更新；通过「时间选项」修改标签、时区与制式。",
			"clock.edit": "时间选项",
			"clock.label": "标签（可选）",
			"clock.timeZone": "时区",
			"clock.zoneHint": "留空使用浏览器时区；也可填写 Asia/Shanghai 或 America/Los_Angeles 等时区。",
			"clock.zoneInvalid": "请输入 Intl 支持的有效时区，或留空使用浏览器时区。",
			"clock.browserZone": "浏览器时区",
			"clock.hour12": "使用 12 小时制",
			"clock.dateLocale": "zh-CN"
		};
		const enPersonal = {
			"widget.notes.title": "Notes",
			"widget.notes.description": "Keep plain text; use Edit note to change each note’s title and text.",
			"notes.edit": "Edit note",
			"notes.title": "Title (optional)",
			"notes.text": "Text",
			"notes.empty": "Nothing here yet. Choose Edit note to write something to remember.",
			"notes.plainText": "Plain text only; HTML and Markdown are not rendered.",
			"notes.limit": "Title and text together must fit in 8 KiB of UTF-8 JSON configuration.",
			"notes.bytes": "{used} / {max} bytes used",
			"notes.limitError": "Too long to add to the draft. Shorten the title or text and try again.",
			"personal.labelLimit": "Up to 120 characters.",
			"personal.reset": "Clear",
			"personal.edited": "Edited",
			"widget.clock.title": "Clock & date",
			"widget.clock.description": "Time and date, updated every minute; use Time options to change the label, zone, and hour format.",
			"clock.edit": "Time options",
			"clock.label": "Label (optional)",
			"clock.timeZone": "Time zone",
			"clock.zoneHint": "Leave blank for the browser’s zone, or enter a zone such as Asia/Shanghai or America/Los_Angeles.",
			"clock.zoneInvalid": "Enter a valid time zone supported by Intl, or leave blank for the browser’s zone.",
			"clock.browserZone": "Browser time zone",
			"clock.hour12": "Use 12-hour time",
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
			"library.edit": "编辑内容",
			"library.close": "关闭组件库",
			"library.hint": "拖动标题或把手到桌面。悬停稳定 0.5 秒让位，Esc 取消。",
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
			"gallery.defaultDescription": "添加到桌面后可独立移动和调整尺寸。",
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
			"library.edit": "Edit content",
			"library.close": "Close widget library",
			"library.hint": "Drag a title or grip onto the desktop. Hold 0.5s to make room; Esc cancels.",
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
			"gallery.defaultDescription": "Add to your desktop, then move and resize independently.",
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
			"manager.delete": "删除",
			"manager.deleteConfirm": "删除「{title}」及其配置？",
			"manager.deleteTitle": "删除「{title}」？",
			"manager.deleteDescription": "此操作会移除此组件及其已保存配置，无法撤销。不会删除原始会话或其他组件。",
			"action.compact": "整理布局",
			"action.compactHint": "保留组件和尺寸，向左上方紧密排列；仅整理当前屏幕布局。",
			"manager.confirmDelete": "确认删除",
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
			"edit.keyboard": "把手聚焦后用方向键逐格移动；Esc 先取消正在进行的拖动或缩放，再退出编辑。",
			"tasks.pick": "选择其他目录…",
			"widget.recent.title": "最近活跃会话",
			"widget.tasks.title": "常用任务",
			"recent.search": "搜索标题、目录或会话 ID",
			"recent.cwd": "工作目录",
			"recent.allCwds": "全部工作目录",
			"recent.unknownCwd": "工作目录未知",
			"recent.untitled": "未命名会话",
			"recent.activity": "最近活动：{time}",
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
			"recent.more": "再显示 {count} 个",
			"recent.count": "已显示 {shown}/{total} 个会话",
			"tasks.hint": "选择任务，预填草稿；由你确认后发送，已有草稿会保留。",
			"tasks.cwd": "任务工作目录",
			"tasks.current": "沿用当前 / 最近工作目录",
			"tasks.open": "打开任务草稿",
			"tasks.preparing": "正在准备…",
			"tasks.unavailable": "此宿主暂不支持任务草稿入口",
			"tasks.error": "未能准备任务，请检查目录或在侧栏重试。",
			"tasks.develop.title": "开发功能",
			"tasks.debug.title": "排查问题",
			"tasks.review.title": "审查改动",
			"tasks.summarize.title": "整理进展",
			"tasks.develop.prompt": "请先阅读当前项目约定和相关实现，与我确认要开发的功能和验收标准，再给出最小实现方案。暂不修改文件，先问我具体需求。",
			"tasks.debug.prompt": "请帮我排查当前项目的问题。先向我索取错误现象、复现步骤和预期行为，再检查相关实现与测试；不要未经确认执行破坏性操作。",
			"tasks.review.prompt": "请只读审查当前项目的未提交代码改动，关注正确性、回归风险和测试缺口。给出带文件位置的具体发现，不修改文件；若没有改动，先问我审查范围。",
			"tasks.summarize.prompt": "请阅读当前项目的说明、任务记录和 Git 状态，区分已完成、待验证与下一步，整理一份简短进展摘要。不修改文件，不把推测当作完成事实。",
			"empty.noMoreWidgets": "没有其他可见组件，可在组件清单中恢复。",
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
			"manager.delete": "Delete",
			"manager.deleteConfirm": "Delete “{title}” and its configuration?",
			"manager.deleteTitle": "Delete “{title}”?",
			"manager.deleteDescription": "This removes the widget and its saved configuration and cannot be undone. Original sessions and other widgets are not deleted.",
			"action.compact": "Tidy layout",
			"action.compactHint": "Keep widgets and sizes; pack toward the top left in this screen layout only.",
			"manager.confirmDelete": "Confirm delete",
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
			"edit.keyboard": "Focus a handle and use arrow keys to move one cell. Esc cancels an active drag or resize first, then finishes editing.",
			"tasks.pick": "Choose another directory…",
			"widget.recent.title": "Recent sessions",
			"widget.tasks.title": "Task starters",
			"recent.search": "Search title, directory or session ID",
			"recent.cwd": "Working directory",
			"recent.allCwds": "All working directories",
			"recent.unknownCwd": "Unknown working directory",
			"recent.untitled": "Untitled session",
			"recent.activity": "Last active: {time}",
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
			"recent.more": "Show {count} more",
			"recent.count": "Showing {shown} of {total} sessions",
			"tasks.hint": "Prepare an unsent task draft. You review and send it; existing drafts are preserved.",
			"tasks.cwd": "Task working directory",
			"tasks.current": "Use current / most recent workspace",
			"tasks.open": "Open task draft",
			"tasks.preparing": "Preparing…",
			"tasks.unavailable": "Task drafts are unavailable in this Host",
			"tasks.error": "Could not prepare the task. Check the directory or retry from the sidebar.",
			"tasks.develop.title": "Build a feature",
			"tasks.debug.title": "Debug a problem",
			"tasks.review.title": "Review changes",
			"tasks.summarize.title": "Summarize progress",
			"tasks.develop.prompt": "Read the project instructions and relevant implementation first. Ask me for the feature requirements and acceptance criteria, then propose a minimal implementation plan. Do not modify files yet.",
			"tasks.debug.prompt": "Help debug this project. Ask me for the observed error, reproduction steps and expected behavior first, then inspect relevant code and tests. Do not perform destructive operations without confirmation.",
			"tasks.review.prompt": "Read-only review the uncommitted code changes in this project for correctness, regressions and missing tests. Report concrete findings with file locations; do not modify files. If there are no changes, ask me for the review scope.",
			"tasks.summarize.prompt": "Read this project’s documentation, task records and Git status. Summarize completed work, unverified items and next steps concisely. Do not modify files or present assumptions as completed facts.",
			"empty.noMoreWidgets": "No other visible widgets. Restore them from the widget list.",
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
