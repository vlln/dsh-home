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

import { designSystemStyles } from './design-system.ts'
import { activityStyles } from './activity-styles.ts'
import { personalStyles } from './personal-styles.ts'
import { plannerStyles } from './planner-styles.ts'
import { quickStyles } from './quick-styles.ts'
import { galleryStyles } from './gallery-styles.ts'
import { libraryStyles } from './library-styles.ts'
import { widgetRefinementStyles } from './widget-refinement-styles.ts'
import { widgetExpressionStyles } from './widget-expression-styles.ts'
import { themeCss } from './ui/generated/theme-css.ts'

/** 样式表元素 id（重复挂载时复用同一份）。 */
export const STYLE_ID = 'dsh-home-styles'

export const CSS = `
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
.dsh-home-delete-zone[data-armed="true"] { border-style: solid; border-color: var(--color-text-error-primary); background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--color-text-error-primary); }
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
.dsh-w[data-droptarget="true"] { box-shadow: inset 0 0 0 1.5px var(--color-chart-4); }

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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
.dsh-row-live { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--color-chart-4); }

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
  background: var(--color-chart-4);
  opacity: 0.5;
}
.dsh-band-seg[data-now="true"] { opacity: 0.95; }
.dsh-band-now {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  border-radius: 1px;
  background: var(--color-status-yellow-text);
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
  background: var(--color-chart-4);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
/* 零活动的那一天不画柱子，也不留底色：只剩可悬停的列与日期标签。 */
.dsh-focus-item[data-drop="before"]::before,
.dsh-w[data-drop="before"]::before,
.dsh-w[data-drop="after"]::after {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 2px;
  border-radius: 2px;
  background: var(--color-chart-4);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
  background: color-mix(in srgb, var(--color-text-error-primary) 10%, transparent);
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
  background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--dsw-alias-label-secondary);
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

/* ---- 工作台：原生输入控件，继承宿主语义 token ---- */
.dsh-home-select {
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
.dsh-home-select:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
  outline-offset: 2px;
}
/* Recent sessions: five tall entries. Line one carries the title and the time, line
   two the workspace capsule and (only when it matters) the waiting state. The dot
   leads so the list can be scanned by state before reading a word. The type is set on
   a 43px budget so five entries still fit an undeclared 6-row card; a taller card
   gives each entry air instead of scaling the text. */
.dsh-recent { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-recent-list {
  display: flex; flex-direction: column; justify-content: center; gap: 2px; flex: 1 1 auto;
  min-height: 0; margin: 0; padding: 0; list-style: none;
}
/* 43px is the two-line content budget (18 + 3 + 18 + 4): five of them, plus gaps, still
   fit a grandfathered 6-row card. A taller card hands the extra space to the entries,
   capped at 86px so a 10-row card gets air instead of a stretched list. */
.dsh-recent-list > li { display: flex; flex: 1 1 0; min-height: 42px; max-height: 86px; }
.dsh-recent-item {
  display: flex; flex-direction: column; justify-content: center; gap: 3px;
  box-sizing: border-box; width: 100%; min-width: 0;
  margin: 0; padding: 2px 10px; border: 0; border-radius: var(--dsw-radius-md);
  background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer;
}
.dsh-recent-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dsh-recent-dot { flex: none; display: inline-flex; align-items: center; }
.dsh-recent-title {
  flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-s-strong-14); line-height: 18px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsh-recent-time { flex: none; font: var(--dsw-font-xxxs-11); color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsh-recent-meta { display: flex; align-items: center; gap: 6px; min-width: 0; padding-inline-start: 14px; }
.dsh-recent-meta .dsh-ws-pill { max-width: 62%; }
.dsh-recent-state {
  flex: none; padding: 1px 8px; border-radius: 999px; corner-shape: round;
  background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--color-status-yellow-text);
  font: var(--dsw-font-xxxs-11); font-weight: 600; white-space: nowrap;
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
.dsh-canvas-grip:focus-visible { outline: 2px solid var(--color-chart-4); outline-offset: -2px; border-radius: var(--dsw-radius-sm); }
@media (hover: hover) { .dsh-canvas-grip:hover::after { opacity: 1; } }
/* The edge must track the pointer exactly, so the board does not ease into a new width. */
.dsh-home[data-resizing] .react-grid-layout,
.dsh-home[data-resizing] .react-grid-item { transition: none !important; }
@media (prefers-reduced-motion: reduce) { .dsh-canvas-grip::after { transition: none; } }
.dsh-home-widget { min-width: 0; }
/* The retired focus stack is gone; only the legacy reorder handle keeps its class. */
.dsh-home-widget-content { position: relative; }
.dsh-home[data-editing="true"] .dsh-home-widget { border-style: dashed; border-color: var(--color-chart-4); animation: none; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-w-head { cursor: grab; touch-action: none; position: relative; z-index: 3; flex-wrap: wrap; }
.dsh-home[data-editing="true"] .dsh-home-widget .dsh-tools { opacity: 1; }
.dsh-home[data-editing="true"] .dsh-home-widget-content { opacity: 0.65; pointer-events: none; user-select: none; }
.dsh-widget-drag-cover { position: absolute; inset: 52px 0 0; z-index: 2; cursor: grab; touch-action: none; border-radius: inherit; }
.dsh-home-widget[data-dragging="true"] { opacity: 0.5; outline: 2px solid var(--color-chart-4); }
.dsh-edit-footnote { margin-top: 16px; }
.dsh-remove-widget { color: var(--color-text-error-primary); }
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
.dsh-home .react-grid-item.react-draggable-dragging { box-shadow: var(--dsw-shadow-lv3, 0 8px 24px var(--dsw-alias-border-l3)); border-color: var(--color-chart-4); opacity: 0.96; }
.dsh-home .react-grid-item.react-grid-placeholder { background: color-mix(in srgb, var(--color-chart-4) 14%, transparent); border: 2px dashed var(--color-chart-4); border-radius: var(--dsw-radius-xl); z-index: 1; pointer-events: none; transition: none; }
.dsh-home .dsh-spatial-grid[data-hover-pending="true"] .react-grid-placeholder {
  border-color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 8%, transparent);
}
.dsh-home .dsh-spatial-grid[data-drop-rejected="true"] .react-grid-placeholder {
  border-color: var(--color-text-error-primary);
  background: color-mix(in srgb, var(--color-text-error-primary) 10%, transparent);
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
.dsh-home-head + .dsh-focus,
.dsh-w + .dsh-w { margin-top: 12px; }
/* 拖动期间禁掉文本选择：否则用户一按一拖选中的是标题文字，看起来像"拖不动"。 */
body.dsh-home-dragging { user-select: none; cursor: grabbing; }
body.dsh-home-dragging * { cursor: grabbing !important; }
/* 标题行本身就是拖拽面：用户会先试着拖标题，而不是先找把手。 */
.dsh-drag-surface { cursor: grab; }
.dsh-drag-surface:active { cursor: grabbing; }

.dsh-focus-primary,
.dsh-focus-primary:focus-visible,
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4));
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
`

/**
 * 幂等注入样式表（同一个 document 只留一份）。
 *
 * 层序有含义：`dsh-legacy` 排在最前，Tailwind 的 utilities 排在最后。新写的
 * 组件用工具类（`text-text-secondary`）时总能盖掉旧的手写规则，迁移期不必
 * 一边改一边删；旧规则只为还没迁移的卡片保底。Tailwind 产物本身不含
 * preflight（见 `theme.css`），不会重置宿主页面。
 *
 * @returns 撤销函数（仅当这次调用真的插入了元素时才移除）
 */
export function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const element = document.createElement('style')
  element.id = STYLE_ID
  const legacy = designSystemStyles + CSS + activityStyles + personalStyles + plannerStyles + quickStyles + galleryStyles + libraryStyles + widgetRefinementStyles + widgetExpressionStyles
  element.textContent =
    '@layer dsh-reset, dsh-legacy, theme, base, components, utilities;\n' +
    themeCss +
    '\n@layer dsh-legacy {\n' +
    legacy +
    '\n}\n'
  document.head.append(element)
  return () => { element.remove() }
}
