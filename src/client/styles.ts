/**
 * 首页样式：一段注入到 `<head>` 的样式表（前缀 `dsh-home-`）。
 *
 * 只消费 `theme.css` 的语义 token 与本文件的 `.dsh-*` 类，
 * 不写死颜色、不定义第二套主题——深色模式由宿主在 `<body>` 上切 alias 自动成立。
 * 圆角按角色取档：独立内容卡 R20（`--dsh-radius-xl`），行/芯片 R8/R12，胶囊 999px
 * 并显式 `corner-shape: round`。
 *
 * @module @vlln/dsh-home/client/styles
 */

import { activityStyles } from './activity-styles.ts'
import { personalStyles } from './personal-styles.ts'
import { plannerStyles } from './planner-styles.ts'
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
  background: var(--dsh-canvas, var(--dsh-canvas));
  /* No padding here: the sticky header's containing block would start below it and
     let card content show through above the header while scrolled. The clearance
     lives in the header's own padding instead (see .dsh-home-head). */
  padding-top: 0;
  padding-right: 24px;
  padding-bottom: 40px;
  padding-left: max(24px, var(--dsh-frame-leading-clearance, 0px));
  color: var(--color-text-primary);
  scrollbar-color: var(--color-border-button-hover, var(--color-border-button-default)) transparent;
}
.dsh-home * { box-sizing: border-box; }
/* A fixed-pixel board, centred when the window is wider. Widget width never depends
   on this box: a wider board fits more columns, it does not stretch a card. */
.dsh-home-inner { position: relative; width: var(--dsh-home-board-width, 1140px); max-width: none; margin-inline: auto; min-width: 0; flex: none; }

.dsh-home-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  /* The header is chrome, not a band: 16 above, 16 below, and the first card
     starts right after it. A larger top pad reads as a missing element.
     It is sticky so scrolled cards never show through above it; the clearance
     lives inside the sticky box, so nothing can slide above the header. */
  position: sticky;
  top: 0;
  z-index: 8;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 16px) 0 16px;
  background: var(--dsh-canvas, var(--dsh-canvas));
}
.dsh-home-title-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex-wrap: wrap; }
.dsh-home-updated { font-size: 13px; line-height: 20px; color: var(--color-text-tertiary); }
.dsh-home-title {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}
.dsh-home-sub {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-tertiary);
}
.dsh-home-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
/* Drag-to-delete target. Fixed to the top of the viewport so it stays reachable no
   matter how far the board is scrolled or how wide it is; it exists only while a card
   is being dragged, and the grid arms it from the live pointer position. */
.dsh-home-delete-zone { position: fixed; top: calc(var(--dsh-frame-top-clearance, 0px) + 12px); left: 50%; transform: translateX(-50%); z-index: 70; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px dashed var(--color-border-button-hover); background: var(--dsh-card); color: var(--color-text-secondary); box-shadow: var(--dsh-shadow-lv2); font: var(--dsh-font-xs-13); pointer-events: none; user-select: none; }
.dsh-home-delete-zone svg { flex: none; }
.dsh-home-delete-zone[data-armed="true"] { border-style: solid; border-color: var(--color-text-error-primary); background: var(--dsh-hover-danger); color: var(--color-text-error-primary); }
.dsh-home-delete-zone-armed { display: none; }
.dsh-home-delete-zone[data-armed="true"] .dsh-home-delete-zone-idle { display: none; }
.dsh-home-delete-zone[data-armed="true"] .dsh-home-delete-zone-armed { display: inline; }
/* Delete puff: one fixed, pointer-transparent layer over where the card was, holding a
   soft halo and a cloud of small sampled particles. The card itself is already gone. */
.dsh-debris { position: fixed; z-index: 90; pointer-events: none; user-select: none; }
.dsh-debris-particle { position: absolute; display: block; border-radius: 50%; will-change: transform, opacity; }
.dsh-debris-halo { position: absolute; border-radius: 50%; transform-origin: center; will-change: transform, opacity; }

/* Card shell. dsh-card (in theme.css) is the real definition; this rule only
   exists so the library drag ghost — which carries .dsh-w — inherits the same
   surface without also being grid-positioned. */
.dsh-w {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: var(--dsh-card-pad);
  border: 0;
  border-radius: var(--dsh-card-radius);
  background: var(--dsh-card);
}
.dsh-w[data-size="m"] { grid-column: span 2; }
.dsh-w[data-size="l"] { grid-column: span 3; }
.dsh-w[data-dragging="true"] { opacity: 0.5; }
.dsh-w[data-droptarget="true"] { box-shadow: inset 0 0 0 1.5px var(--color-chart-4); }

/* Aliases of the card-head anatomy in theme.css, kept for the widgets that still
   write these class names directly. */
.dsh-w-head { display: flex; align-items: center; gap: 8px; min-height: 20px; }
.dsh-w-glyph { width: 16px; height: 16px; flex: none; color: var(--color-text-tertiary); }
.dsh-w-title {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.dsh-w-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }

.dsh-number {
  font-size: 24px;
  line-height: 32px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}
.dsh-label { font-size: 12px; line-height: 16px; color: var(--color-text-tertiary); }
.dsh-muted { font-size: 11px; line-height: 16px; color: var(--color-text-tertiary); }
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
  border-radius: var(--dsh-radius-md);
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.dsh-row:hover { background: var(--dsh-hover); }
.dsh-row:active { background: var(--dsh-active); }
.dsh-row:focus-visible {
  outline: var(--dsh-focus-ring-width, 2px) solid var(--dsh-focus-ring-color, var(--color-chart-4));
  outline-offset: 1px;
}
.dsh-row-static { cursor: default; }
.dsh-row-static:hover { background: transparent; }
.dsh-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-row-title {
  font-size: 13px;
  line-height: 19px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.dsh-row-meta { font-size: 11px; line-height: 16px; color: var(--color-text-tertiary); }
.dsh-band-track {
  position: relative;
  height: 26px;
  border-radius: var(--dsh-radius-sm);
  background: var(--dsh-sunken);
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
  color: var(--color-text-tertiary);
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
  color: var(--color-text-tertiary);
}
.dsh-rhythm-days span { flex: 1 1 0; min-width: 0; text-align: center; overflow: hidden; }

.dsh-key { font-size: 11px; color: var(--color-text-tertiary); }

.dsh-edit-bar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.dsh-edit-hint { font-size: 12px; color: var(--color-text-tertiary); }
.dsh-edit-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

@keyframes dsh-home-spin { to { transform: rotate(360deg); } }
@keyframes dsh-home-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.dsh-w { animation: dsh-home-rise 200ms ease-out both; }
.dsh-w:hover { border-color: var(--color-border-button-hover); }
.dsh-band-seg { transition: opacity 120ms ease-out; }
.dsh-band-seg:hover { opacity: 1; }
.dsh-rhythm-col:hover .dsh-rhythm-bar { opacity: 1; }
/* 最近活跃：同一个量换窗口看。范围切换在卡片顶部，图表填满剩余高度。 */
/* 零活动的那一天不画柱子，也不留底色：只剩可悬停的列与日期标签。 */
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
  .dsh-band-seg { transition: none; }
}
.dsh-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: var(--dsh-radius-md);
  background: var(--dsh-card-hover);
  box-shadow: inset 0 0 0 0.5px var(--dsh-hairline);
}
.dsh-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 24px;
  padding: 0 6px;
  border: none;
  border-radius: var(--dsh-radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsh-tool:hover { background: var(--dsh-hover); color: var(--color-text-primary); }
.dsh-tool:focus-visible {
  outline: var(--dsh-focus-ring-width, 2px) solid var(--dsh-focus-ring-color, var(--color-chart-4));
  outline-offset: 1px;
}
.dsh-tool[data-active="true"] {
  background: var(--dsh-hover-strong);
  color: var(--color-text-primary);
  box-shadow: inset 0 0 0 1px var(--color-border-button-hover);
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
  color: var(--color-text-tertiary);
}
.dsh-error {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--dsh-radius-lg);
  background: color-mix(in srgb, var(--color-text-error-primary) 10%, transparent);
  color: var(--color-text-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
@keyframes dsh-home-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) {
}


/* Registry directory, instance management and host-owned settings drafts. */
.dsh-workbench-notice {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0;
  padding: 12px 14px; border-radius: var(--dsh-radius-lg);
  background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--color-text-secondary);
  font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 1.6;
}
.dsh-workbench-notice > span { overflow-wrap: anywhere; }
.dsh-widget-own-editor { display: flex; justify-content: flex-end; margin-top: 8px; }
.dsh-widget-config-modal .dsh-widget-settings { margin: 0; padding: 0; border: 0; }
.dsh-widget-settings { margin-top: 16px; padding-top: 4px; border-top: 0.5px solid var(--color-border-button-default); }
.dsh-settings-fields { margin: 12px 0; min-width: 0; }
/* Fill only the content flex box, excluding the shell header and padding. The
   observer reports this available viewport, independent of overflowing children. */
.dsh-widget-viewport { flex: 1 1 auto; width: 100%; min-width: 0; min-height: 0; overflow: hidden; }
.dsh-home [inert] { cursor: default; }
.dsh-home .dsh-tool:disabled { opacity: 0.4; cursor: default; }

/* ---- 工作台：原生输入控件，继承宿主语义 token ---- */
.dsh-home-select {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  border: 0.5px solid var(--color-border-button-default);
  border-radius: var(--dsh-radius-md);
  color: var(--color-text-primary);
  background: var(--dsh-sunken);
  font: inherit;
  font-size: var(--dsh-content-font-size-secondary, 13px);
}
.dsh-home-select:focus-visible {
  outline: var(--dsh-focus-ring-width, 2px) solid var(--dsh-focus-ring-color, var(--color-chart-4));
  outline-offset: 2px;
}
/* Recent sessions: five tall entries. Line one carries the title and the time, line
   two the workspace capsule and (only when it matters) the waiting state. The dot
   leads so the list can be scanned by state before reading a word. The type is set on
   a 43px budget so five entries still fit an undeclared 6-row card; a taller card
   gives each entry air instead of scaling the text. */
.dsh-recent { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-recent-list {
  display: flex; flex-direction: column; justify-content: flex-start; gap: 2px; flex: 1 1 auto;
  min-height: 0; margin: 0; padding: 0; list-style: none;
}
/* 43px is the two-line content budget (18 + 3 + 18 + 4): five of them, plus gaps, still
   fit a grandfathered 6-row card. A taller card hands the extra space to the entries,
   capped at 86px so a 10-row card gets air instead of a stretched list. */
.dsh-recent-list > li { display: flex; flex: 0 0 auto; min-height: 32px; }
/* Workspace groups: a quiet heading, then its rows. Same size as the table header. */
.dsh-pinned-group { display: flex; flex-direction: column; gap: 2px; padding-top: 6px; }
.dsh-pinned-group:first-child { padding-top: 0; }
.dsh-pinned-group-title { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0 12px; font: var(--dsh-font-s-strong-14); color: var(--color-text-tertiary); }
.dsh-recent-group { display: flex; flex-direction: column; gap: 2px; padding-top: 6px; }
.dsh-recent-group:first-child { padding-top: 0; }
.dsh-recent-group-title { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0 12px; font: var(--dsh-font-s-strong-14); color: var(--color-text-tertiary); }
.dsh-recent-group-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
/* In a narrow card the title is the only thing worth keeping: the workspace name is
   context the sidebar already shows, and two truncated labels read worse than one. */
.dsh-home-widget[data-size="s"] :is(.dsh-recent-workspace, .dsh-session-workspace) { display: none; }
.dsh-recent-item {
  display: flex; flex-direction: column; justify-content: center; gap: 3px;
  box-sizing: border-box; width: 100%; min-width: 0;
  margin: 0; padding: 2px 10px; border: 0; border-radius: var(--dsh-radius-md);
  background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer;
}
.dsh-recent-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dsh-recent-dot { flex: none; display: inline-flex; align-items: center; }
.dsh-recent-title {
  flex: 1 1 auto; min-width: 0; color: var(--color-text-primary);
  font: var(--dsh-font-s-strong-14); line-height: 18px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsh-recent-time { flex: none; font: var(--dsh-font-xxxs-11); color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }
.dsh-recent-meta { display: flex; align-items: center; gap: 6px; min-width: 0; padding-inline-start: 14px; }
.dsh-recent-state {
  flex: none; padding: 1px 8px; border-radius: 999px; corner-shape: round;
  background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--color-status-yellow-text);
  font: var(--dsh-font-xxxs-11); font-weight: 600; white-space: nowrap;
}
/* One-line session row: state dot, workspace capsule, session title, time.
   The dot leads so a column can be scanned by state before reading a word. */
.dsh-session-line { position: relative; display: flex; align-items: center; min-width: 0; }
.dsh-session-row { flex: 1 1 auto; flex-direction: row; align-items: center; gap: 8px; padding: 4px 8px; min-width: 0; }
.dsh-session-line[data-dismissible="true"] .dsh-session-row { padding-inline-end: 26px; }
.dsh-session-status { order: -1; flex: none; display: inline-flex; align-items: center; }
.dsh-session-title { flex: 1 1 auto; min-width: 0; color: var(--color-text-primary); font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-session-trailing { flex: none; font-size: 11px; line-height: 16px; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }
.dsh-session-dismiss { position: absolute; inset-inline-end: 2px; top: 50%; transform: translateY(-50%); opacity: 0; transition: opacity 120ms ease-out; }
.dsh-session-line:hover .dsh-session-dismiss,
.dsh-session-line:focus-within .dsh-session-dismiss { opacity: 1; }
.dsh-recent-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; justify-content: space-between; }

/* Unified mobile-widget editing surface. Only the editing shell owns gestures. */
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
    var(--dsh-sunken) calc(var(--dsh-canvas-grip-y, 50%) - 8px),
    var(--dsh-sunken) calc(var(--dsh-canvas-grip-y, 50%) + 8px),
    transparent calc(var(--dsh-canvas-grip-y, 50%) + 36px));
  transition: opacity 120ms ease-out;
}
.dsh-canvas-grip[data-side="left"]::after { right: 3px; }
.dsh-canvas-grip[data-side="right"]::after { left: 3px; }
.dsh-canvas-grip[data-dragging]::after { opacity: 1; }
.dsh-canvas-grip[data-dragging] { z-index: 10; }
.dsh-canvas-grip:focus-visible { outline: 2px solid var(--color-chart-4); outline-offset: -2px; border-radius: var(--dsh-radius-sm); }
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
.dsh-home-widget[data-dragging="true"] { opacity: 0.5; outline: 2px solid var(--color-chart-4); }
.dsh-edit-footnote { margin-top: 16px; }
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
.dsh-home .react-grid-item.react-draggable-dragging { box-shadow: var(--dsh-shadow-lv3, 0 8px 24px var(--color-border-button-default)); border-color: var(--color-chart-4); opacity: 0.96; }
.dsh-home .react-grid-item.react-grid-placeholder { background: color-mix(in srgb, var(--color-chart-4) 14%, transparent); border: 2px dashed var(--color-chart-4); border-radius: var(--dsh-radius-xl); z-index: 1; pointer-events: none; transition: none; }
.dsh-home .dsh-spatial-grid[data-hover-pending="true"] .react-grid-placeholder {
  border-color: var(--color-text-tertiary);
  background: color-mix(in srgb, var(--color-text-tertiary) 8%, transparent);
}
.dsh-home .dsh-spatial-grid[data-drop-rejected="true"] .react-grid-placeholder {
  border-color: var(--color-text-error-primary);
  background: color-mix(in srgb, var(--color-text-error-primary) 10%, transparent);
}
/* Widget dimensions are not user-editable. RGL resizing stays disabled. */
.dsh-home-widget .dsh-tools { flex:none; }
.dsh-home-widget .dsh-w-head .dsh-w-title { flex:1 1 100px; }
.dsh-home[data-editing="true"] .dsh-home-widget { border-style: solid; border-color: var(--color-border-button-default); }
.dsh-home[data-editing="true"] .dsh-home-widget-content { opacity: 1; }
.dsh-home[data-editing="true"] .dsh-widget-grip { touch-action: none; cursor: grab; }
.dsh-home[data-editing="true"] .dsh-spatial-grid { background-image: radial-gradient(circle, var(--color-border-button-default) 1px, transparent 1px); background-size: 16px 16px; }
.dsh-home .dsh-tools { background: transparent; box-shadow: none; }
@media (prefers-reduced-motion: reduce) { .dsh-home .react-grid-layout, .dsh-home .react-grid-item { transition: none; } }

/* ---- 三件事（默认视图） ---- */
.dsh-w + .dsh-w { margin-top: 12px; }
/* 拖动期间禁掉文本选择：否则用户一按一拖选中的是标题文字，看起来像"拖不动"。 */
body.dsh-home-dragging { user-select: none; cursor: grabbing; }
body.dsh-home-dragging * { cursor: grabbing !important; }
/* 标题行本身就是拖拽面：用户会先试着拖标题，而不是先找把手。 */
.dsh-edit-bar { margin-top: 12px; }

@media (max-width: 1100px) {
  .dsh-w[data-size="l"] { grid-column: span 2; }
}
@media (max-width: 720px) {
  .dsh-home { padding-right: 16px; padding-left: max(16px, var(--dsh-frame-leading-clearance, 0px)); }
  /* Narrow gutters: the 10px strips still fit inside the 16px padding. */
  .dsh-canvas-grip { width: 8px; }
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
  const legacy = designSystemStyles + CSS + activityStyles + personalStyles + plannerStyles + galleryStyles + libraryStyles + widgetRefinementStyles + widgetExpressionStyles
  element.textContent =
    '@layer dsh-reset, dsh-legacy, theme, base, components, utilities;\n' +
    themeCss +
    '\n@layer dsh-legacy {\n' +
    legacy +
    '\n}\n'
  document.head.append(element)
  return () => { element.remove() }
}

/* ---- 共享小部件的几何规则（原 design-system.ts；颜色早已不在这一层）---- */
const designSystemStyles = `
/* 颜色与字号不再在这里定义：语义 token 与复合字阶在 \`src/client/theme.css\`
 * （BoardUI 词表，编译产物见 ui/generated/theme-css.ts）。本文件只保留共享小部件
 * 的几何与排版规则，且一律引用 semantic token，不再引入任何 \`--dsh-*\` 颜色角色。
 */

/* 主值：所有卡片同一个字号，不再各卡 26/28/32/36 混用。 */
.dsh-home-widget .dsh-number,
.dsh-home-widget .dsh-activity-number,
.dsh-home-widget .dsh-rhythm-hero,
.dsh-home-widget .dsh-usage-total,
.dsh-home-widget .dsh-balance-amount,
.dsh-home-widget .dsh-countdown-days {
  font-size: 2rem;
  line-height: 2.5rem;
  font-weight: 600;
  letter-spacing: -.03em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

/* 工作区胶囊：统一中性色。颜色不编码目录身份，只有文字说明它是哪个工作区。 */
/* 安静的状态胶囊：选中用墨色，未选中只是浅底；状态含义由文字承担。 */
.dsh-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border: none;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsh-hover);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.dsh-chip:hover { background: var(--dsh-active); color: var(--color-text-primary); }
.dsh-chip[data-active="true"] { background: var(--color-text-primary); color: var(--color-text-white); }
.dsh-chip:focus-visible { outline: var(--dsh-focus-ring-width, 2px) solid var(--dsh-focus-ring-color, var(--color-chart-4)); outline-offset: 1px; }
.dsh-chip[data-tone="warn"] { background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--color-status-yellow-text); }
.dsh-chip[data-tone="danger"] { background: color-mix(in srgb, var(--color-text-error-primary) 12%, transparent); color: var(--color-text-error-primary); }
.dsh-chip[data-tone="accent"] { background: color-mix(in srgb, var(--color-chart-4) 12%, transparent); color: var(--color-chart-4); }

/* 会话状态筛选：与其它 chip 同一语法；选中态为墨色，状态含义由小圆点承担：
   在跑=绿、在等你=琥珀、未读=蓝。颜色按语义固定，不按组件分配。 */
.dsh-status-chip[data-group="running"] { --dsh-dot-color: var(--color-status-lime-text); }
.dsh-status-chip[data-group="waiting"] { --dsh-dot-color: var(--color-status-yellow-text); }
.dsh-status-chip[data-group="done"] { --dsh-dot-color: var(--color-chart-4); }
.dsh-status-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; clip-path: circle(50%); background: var(--dsh-dot-color, var(--color-text-tertiary)); }
.dsh-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsh-hover);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  cursor: pointer;
}
.dsh-status-chip:hover:not(:disabled) { background: var(--dsh-active); color: var(--color-text-primary); }
.dsh-status-chip:disabled { cursor: default; }
.dsh-status-chip[data-active="true"] { background: var(--color-text-primary); color: var(--color-text-white); }
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
  color: var(--color-text-tertiary);
  font-family: var(--font-sans);
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
.dsh-quiet-select:is(:hover, :focus-visible) { color: var(--color-text-secondary); }
.dsh-quiet-select:focus-visible { outline: var(--dsh-focus-ring-width, 2px) solid var(--dsh-focus-ring-color, var(--color-chart-4)); outline-offset: 2px; border-radius: var(--dsh-radius-xs); }
.dsh-quiet-select:disabled { opacity: .7; cursor: default; }

/* 悬停提示：跟随指针的小气泡，Portal 到 body，不被卡片裁剪。 */
.dsh-tip { background: var(--dsh-tip-bg); color: var(--dsh-tip-fg); }
.dsh-hover-tip {
  position: fixed;
  z-index: 1000;
  max-width: 240px;
  padding: 4px 8px;
  border-radius: var(--dsh-radius-sm);
  background: var(--dsh-tip-bg);
  color: var(--dsh-tip-fg);
  border: 1px solid var(--dsh-hairline);
  font: var(--dsh-font-xxxs-11);
  line-height: 16px;
  white-space: pre-line;
  pointer-events: none;
  box-shadow: var(--dsh-shadow-lv2);
}

/* 数据轨道：所有条形图共用同一条中性轨道。 */
.dsh-track { background: var(--color-chart-track); border-radius: 6px; overflow: hidden; }
.dsh-track > span { display: block; height: 100%; border-radius: inherit; background: var(--color-chart-4); }

@media (prefers-reduced-motion: reduce) {
  .dsh-quiet-select { transition: none; }
}
`
