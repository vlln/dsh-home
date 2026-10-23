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
export const STYLE_ID = 'dsh-home-styles'

export const CSS = `
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
.dsh-focus + .dsh-w,
.dsh-w + .dsh-w,
.dsh-focus + .dsh-focus { margin-top: 12px; }

.dsh-focus {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 22px 18px;
  border-radius: var(--dsw-radius-xl);
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
}
.dsh-focus-eyebrow-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
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
  element.textContent = CSS
  document.head.append(element)
  return () => { element.remove() }
}
