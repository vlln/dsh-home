import { ACTIVITY_NATURAL_CELL, ACTIVITY_GAP, ACTIVITY_SCROLL_PADDING, ACTIVITY_BLOCK_GAP } from './activity-model.ts'

export const activityStyles = `
.dsh-activity { --dsh-activity-cell-size:${ACTIVITY_NATURAL_CELL}px; display:flex; flex-direction:column; gap:8px; min-width:0; height:100%; min-height:0; }
/* Align text to the chart only for the centred three-block layout. A narrow chart
   must not squeeze its summary/legend into wrapped lines that overflow the card. */
.dsh-activity-summary, .dsh-activity-caption { flex:none; width:100%; max-width:100%; box-sizing:border-box; margin-inline:auto; }
.dsh-activity[data-activity-layout="blocks"] :is(.dsh-activity-summary, .dsh-activity-caption) { width:var(--dsh-activity-chart-width); }
.dsh-activity-summary { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 16px; color:var(--color-text-secondary); font:var(--dsh-font-xs-13); }
.dsh-activity-primary { display:flex; align-items:baseline; gap:6px; }
.dsh-activity-number { color:var(--color-text-primary); }
.dsh-activity-secondary { display:flex; flex-wrap:wrap; gap:4px 12px; }
.dsh-activity-secondary > span + span { padding-inline-start:12px; border-inline-start:.5px solid var(--dsh-hairline); }
/* Both axes use the same bounded cell size. Auto adds natural weeks as width
   grows; only explicit year (or exceptionally tiny cards) needs local scrolling. */
/* 卡片装不下时先缩格子：竖向与横向都不出现滚动条（一年用 2px 点阵兜底）。 */
.dsh-activity-scroll { flex:1 1 auto; min-height:0; overflow:hidden; max-width:100%; padding:${ACTIVITY_SCROLL_PADDING}px; border-radius:var(--dsh-radius-xs); scroll-padding-inline:${ACTIVITY_SCROLL_PADDING}px; }
.dsh-activity-scroll:focus-visible { outline:2px solid var(--color-chart-4); outline-offset:-2px; }
.dsh-activity-grid { display:grid; gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); width:max-content; margin-inline:auto; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); min-width:0; }
.dsh-activity-blocks { display:flex; align-items:start; gap:${ACTIVITY_BLOCK_GAP}px; width:max-content; margin-inline:auto; }
.dsh-activity-block { display:flex; flex-direction:column; gap:6px; }
.dsh-activity-block-label { font:var(--dsh-font-xxs-12); color:var(--color-text-secondary); font-variant-numeric:tabular-nums; }
.dsh-activity-weekdays, .dsh-activity-block-days { display:grid; grid-template-columns:repeat(7, var(--dsh-activity-cell-size)); gap:var(--dsh-activity-gap,${ACTIVITY_GAP}px); }
.dsh-activity-weekdays { text-align:center; font:var(--dsh-font-xxxs-11); color:var(--color-text-tertiary); }
.dsh-activity-caption { display:flex; align-items:center; flex-wrap:wrap; gap:2px 12px; font:var(--dsh-font-xxxs-11); color:var(--color-text-tertiary); font-variant-numeric:tabular-nums; }
.dsh-activity-range { flex:none; }
.dsh-activity-legend { margin-inline-start:auto; }
.dsh-activity-month { font:var(--dsh-font-xxxs-11); color:var(--color-text-tertiary); overflow:visible; }
.dsh-activity-cell { display:block; flex:none; width:var(--dsh-activity-cell-size); height:var(--dsh-activity-cell-size); aspect-ratio:1; padding:0; border:0; border-radius:var(--dsh-radius-xs); background:var(--dsh-card); }
button.dsh-activity-cell { cursor:pointer; transition:box-shadow 120ms ease-out; }
.dsh-activity-cell[data-level="1"] { background:color-mix(in srgb, var(--color-chart-4) 22%, var(--dsh-card)); }
.dsh-activity-cell[data-level="2"] { background:color-mix(in srgb, var(--color-chart-4) 44%, var(--dsh-card)); }
.dsh-activity-cell[data-level="3"] { background:color-mix(in srgb, var(--color-chart-4) 70%, var(--dsh-card)); }
.dsh-activity-cell[data-level="4"] { background:var(--color-chart-4); }
.dsh-activity-cell[data-unknown="true"] { background:transparent; outline:1px dashed var(--color-border-button-default); outline-offset:-1px; }
.dsh-activity-cell[data-selected="true"], button.dsh-activity-cell:focus-visible { outline:2px solid var(--color-text-primary); outline-offset:1px; }
button.dsh-activity-cell:is(:hover,:focus-visible) { box-shadow:0 0 0 1px var(--color-text-secondary); }
.dsh-activity-spacer { visibility:hidden; }
.dsh-activity-filters { display:flex; align-items:center; gap:10px; min-width:0; flex-wrap:wrap; flex:none; margin-inline-start:auto; }
.dsh-activity-filters .dsh-quiet-select { max-width:160px; }
.dsh-activity-legend { display:flex; align-items:center; justify-content:flex-start; gap:4px; font:var(--dsh-font-xxxs-11); color:var(--color-text-tertiary); }
.dsh-activity-legend .dsh-activity-cell { width:12px; height:12px; }
.dsh-activity > .dsh-muted { margin:0; overflow-wrap:anywhere; }
.dsh-activity-detail { display:flex; flex-direction:column; gap:6px; height:100%; min-height:0; padding:2px; font:var(--dsh-font-xs-13); }
.dsh-activity-detail-head { flex:none; display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.dsh-activity-detail-head strong { color:var(--color-text-primary); font-weight:600; }
.dsh-activity-back { flex:none; }
.dsh-activity-days { flex:1 1 auto; min-height:0; overflow:hidden; }
.dsh-settings-field { display:flex; flex-direction:column; gap:6px; font:var(--dsh-font-xs-13); }
.dsh-settings-field select { max-width:100%; padding:8px; border:0.5px solid var(--color-border-button-default); border-radius:var(--dsh-radius-md); color:var(--color-text-primary); background:var(--dsh-sunken); font:inherit; }
@media (prefers-reduced-motion: reduce) { button.dsh-activity-cell { transition:none; } }
/* The plot is "axis + weeks". The axis is the weekday column the reference card has:
   four labels (Mon/Wed/Fri/Sun) lined up with their rows, one cell each. */
.dsh-activity-plot { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.dsh-activity-axis {
  display: grid; flex: none;
  grid-auto-rows: var(--dsh-activity-cell-size, 12px);
  row-gap: var(--dsh-activity-gap, 2px);
  padding-top: 16px; /* clears the month label row above the weeks */
  font-size: 10px; line-height: var(--dsh-activity-cell-size, 12px);
  color: var(--color-text-tertiary);
}
.dsh-activity-axis span { display: block; white-space: nowrap; }
/* Legend on the left, the exact range on the right: the range used to share space with a
   range picker that no longer exists. */
.dsh-activity-caption { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
`
