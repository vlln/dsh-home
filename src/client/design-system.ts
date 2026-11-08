/**
 * 首页的旧视觉词表（**正在退场**）。
 *
 * 2026-11-07 起，配色、字号阶梯、圆角与动效归 `src/client/theme.css`（BoardUI 语义
 * token + 复合字阶），见 `decisions/0006-boardui-visual-language.md`。本文件仍然定义
 * `--dsh-*` 角色色，是因为尚未迁移的卡片与 `dsh-legacy` 样式层还引用它们；新卡片不许
 * 再用这里的 token，`scripts/check-assets.mjs` 会在构建时挡住绕过收口的新代码。
 *
 * 迁移完之后，这个文件应该只剩 `FONT` 这类 JS 侧需要的常量，`--dsh-*` 全部删除。
 *
 * 首页唯一的视觉标准：语义色、字号、圆角与共用小部件。
 *
 * 规则（详见 `docs/design-system.md`）：
 * - 墨色 / 表面 / 描边直接取宿主 alias（`--dsw-alias-label-*`、`bg-*`、`border-*`），
 *   深浅主题由宿主切换；本文件不再定义第二套主题。
 * - 产品自己的颜色只有三种角色：强调（accent）、注意（warning）、错误（danger）。
 *   全部落在 `--dsh-*` 上，组件样式只准引用这些变量，不准直接写语义色或十六进制。
 * - 数据图形只用同一种强调色的四档浓淡（`--dsh-ramp-1…4`），不按组件换色相。
 * - 工作区胶囊只有一个中性色：它标识「这是一个工作区」，不标识「哪一个」。
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
  white-space: pre-line;
  pointer-events: none;
  box-shadow: var(--dsw-shadow-lv2);
}

/* 数据轨道：所有条形图共用同一条中性轨道。 */
.dsh-track { background: var(--dsh-track); border-radius: var(--dsh-radius-xs); overflow: hidden; }
.dsh-track > span { display: block; height: 100%; border-radius: inherit; background: var(--dsh-accent); }

@media (prefers-reduced-motion: reduce) {
  .dsh-quiet-select { transition: none; }
}
`
