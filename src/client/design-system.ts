/**
 * 首页的**共享小部件**词表（不是颜色词表）。
 *
 * 2026-11-07 起配色、字号阶梯、圆角与动效归 `src/client/theme.css`（BoardUI 语义
 * token + 复合字阶 + `@theme`），见 `decisions/0006-boardui-visual-language.md`。
 * 本文件只保留三件事：
 *
 * 1. JS 侧需要的排版常量（`FONT`、`RAMP_LEVELS`）；
 * 2. 几个仍被内置卡复用的类（`.dsh-chip`、`.dsh-ws-pill`、`.dsh-quiet-select`、
 *    `.dsh-track`、`.dsh-status-dot` 等）的**几何**规则；
 * 3. 这些类与图表之间的对齐约定。
 *
 * 规则：这里只准引用 `theme.css` 的语义 token（`--color-text-*`、`--color-chart-*`、
 * `--color-status-*`、`--color-background-*`），**不再定义任何颜色角色**。
 * 新卡片不要用这里的类，用 `src/client/ui/`。
 *
 * @module @vlln/dsh-home/client/design-system
 */

/** 单个数字/主值的排版（JS 侧需要时引用，避免各组件各写一套）。 */
export const FONT = {
  heroSize: 30,
  heroLine: 34,
  numberSize: 22,
  numberLine: 28,
  bodySize: 13,
  metaSize: 11,
} as const

/** 图表四档浓淡；索引与 `[data-level="1…4"]` 对齐。 */
export const RAMP_LEVELS = [1, 2, 3, 4] as const

export const designSystemStyles = `
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
  color: var(--dsw-alias-label-primary);
}

/* 工作区胶囊：统一中性色。颜色不编码目录身份，只有文字说明它是哪个工作区。 */
.dsh-ws-pill {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 38%;
  padding: 1px 8px;
  border-radius: 999px;
  corner-shape: round;
  background: var(--color-background-tertiary-default);
  color: var(--color-text-secondary);
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
  border-radius: 999px;
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
.dsh-chip:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4)); outline-offset: 1px; }
.dsh-chip[data-tone="warn"] { background: color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color: var(--color-status-yellow-text); }
.dsh-chip[data-tone="danger"] { background: color-mix(in srgb, var(--color-text-error-primary) 12%, transparent); color: var(--color-text-error-primary); }
.dsh-chip[data-tone="accent"] { background: color-mix(in srgb, var(--color-chart-4) 12%, transparent); color: var(--color-chart-4); }

/* 会话状态筛选：与其它 chip 同一语法；选中态为墨色，状态含义由小圆点承担：
   在跑=绿、在等你=琥珀、未读=蓝。颜色按语义固定，不按组件分配。 */
.dsh-status-chip[data-group="running"] { --dsh-dot-color: var(--color-status-lime-text); }
.dsh-status-chip[data-group="waiting"] { --dsh-dot-color: var(--color-status-yellow-text); }
.dsh-status-chip[data-group="done"] { --dsh-dot-color: var(--color-chart-4); }
.dsh-status-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; clip-path: circle(50%); background: var(--dsh-dot-color, var(--dsw-alias-label-tertiary)); }
.dsh-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
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
.dsh-quiet-select:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--color-chart-4)); outline-offset: 2px; border-radius: var(--dsw-radius-xs); }
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
  white-space: pre-line;
  pointer-events: none;
  box-shadow: var(--dsw-shadow-lv2);
}

/* 数据轨道：所有条形图共用同一条中性轨道。 */
.dsh-track { background: var(--color-chart-track); border-radius: 6px; overflow: hidden; }
.dsh-track > span { display: block; height: 100%; border-radius: inherit; background: var(--color-chart-4); }

@media (prefers-reduced-motion: reduce) {
  .dsh-quiet-select { transition: none; }
}
`
