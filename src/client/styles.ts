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

import { activityStyles } from './activity-styles.ts'
import { personalStyles } from './personal-styles.ts'
import { quickStyles } from './quick-styles.ts'
import { galleryStyles } from './gallery-styles.ts'
import { libraryStyles } from './library-styles.ts'
import { widgetRefinementStyles } from './widget-refinement-styles.ts'
import { widgetExpressionStyles } from './widget-expression-styles.ts'

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
.dsh-canvas-grip:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; border-radius: var(--dsw-radius-sm); }
@media (hover: hover) { .dsh-canvas-grip:hover::after { opacity: 1; } }
/* The edge must track the pointer exactly, so the board does not ease into a new width. */
.dsh-home[data-resizing] .react-grid-layout,
.dsh-home[data-resizing] .react-grid-item { transition: none !important; }
@media (prefers-reduced-motion: reduce) { .dsh-canvas-grip::after { transition: none; } }
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
  /* Narrow gutters: the 10px strips still fit inside the 16px padding. */
  .dsh-canvas-grip { width: 8px; }
  .dsh-home-grid { grid-template-columns: minmax(0, 1fr); }
  .dsh-w, .dsh-w[data-size="m"], .dsh-w[data-size="l"] { grid-column: span 1; }
}
`

/**
 * 幂等注入样式表（同一个 document 只留一份）。
 * @returns 撤销函数（仅当这次调用真的插入了元素时才移除）
 */
export function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = CSS + activityStyles + personalStyles + quickStyles + galleryStyles + libraryStyles + widgetRefinementStyles + widgetExpressionStyles
  document.head.append(element)
  return () => { element.remove() }
}
