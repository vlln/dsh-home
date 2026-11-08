import { ACTIVITY_NATURAL_CELL, ACTIVITY_GAP, ACTIVITY_SCROLL_PADDING, ACTIVITY_BLOCK_GAP } from './activity-model.ts'

export const activityStyles = `
.dsh-activity { --dsh-activity-cell-size:${ACTIVITY_NATURAL_CELL}px; display:flex; flex-direction:column; gap:8px; min-width:0; height:100%; min-height:0; }
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
.dsh-activity-scroll { flex:1 1 auto; min-height:0; overflow:hidden; max-width:100%; padding:${ACTIVITY_SCROLL_PADDING}px; border-radius:var(--dsw-radius-xs); scroll-padding-inline:${ACTIVITY_SCROLL_PADDING}px; }
.dsh-activity-scroll:focus-visible { outline:2px solid var(--color-chart-4); outline-offset:-2px; }
.dsh-activity-grid { display:grid; gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); width:max-content; margin-inline:auto; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); min-width:0; }
.dsh-activity-blocks { display:flex; align-items:start; gap:${ACTIVITY_BLOCK_GAP}px; width:max-content; margin-inline:auto; }
.dsh-activity-block { display:flex; flex-direction:column; gap:6px; }
.dsh-activity-block-label { font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
.dsh-activity-weekdays, .dsh-activity-block-days { display:grid; grid-template-columns:repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); }
.dsh-activity-weekdays { text-align:center; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-caption { display:flex; align-items:center; flex-wrap:wrap; gap:2px 12px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
.dsh-activity-range { flex:none; }
.dsh-activity-legend { margin-inline-start:auto; }
.dsh-activity-month { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); overflow:visible; }
.dsh-activity-cell { display:block; flex:none; width:var(--dsh-activity-cell-size); height:var(--dsh-activity-cell-size); aspect-ratio:1; padding:0; border:0; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-module-platform); }
button.dsh-activity-cell { cursor:pointer; transition:box-shadow 120ms ease-out; }
.dsh-activity-cell[data-level="1"] { background:color-mix(in srgb, var(--color-chart-4) 22%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="2"] { background:color-mix(in srgb, var(--color-chart-4) 44%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="3"] { background:color-mix(in srgb, var(--color-chart-4) 70%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="4"] { background:var(--color-chart-4); }
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
`
