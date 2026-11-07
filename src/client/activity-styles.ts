import { ACTIVITY_NATURAL_CELL, ACTIVITY_GAP, ACTIVITY_SCROLL_PADDING, ACTIVITY_BLOCK_GAP } from './activity-model.ts'

export const activityStyles = `
.dsh-activity { --dsh-activity-cell-size:${ACTIVITY_NATURAL_CELL}px; display:flex; flex-direction:column; gap:8px; min-width:0; }
/* Align text to the chart only for the centred three-block layout. A narrow chart
   must not squeeze its summary/legend into wrapped lines that overflow the card. */
.dsh-activity-summary, .dsh-activity-caption { width:100%; max-width:100%; box-sizing:border-box; margin-inline:auto; }
.dsh-activity[data-activity-layout="blocks"] :is(.dsh-activity-summary, .dsh-activity-caption) { width:var(--dsh-activity-chart-width); }
.dsh-activity-summary { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 16px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xs-13); }
.dsh-activity-primary { display:flex; align-items:baseline; gap:6px; }
.dsh-activity-number { color:var(--dsw-alias-label-primary); font-family:var(--dsw-font-family); font-size:32px; font-weight:600; line-height:1.15; letter-spacing:-.025em; font-variant-numeric:tabular-nums; }
.dsh-activity-secondary { display:flex; flex-wrap:wrap; gap:4px 12px; }
.dsh-activity-secondary > span + span { padding-inline-start:12px; border-inline-start:.5px solid var(--dsw-alias-border-l2); }
.dsh-activity[data-activity-sidebar="true"] { display:grid; grid-template-columns:140px minmax(0, 1fr); column-gap:16px; align-items:start; }
.dsh-activity[data-activity-sidebar="true"] > * { grid-column:1 / -1; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-summary { grid-column:1; grid-row:1 / 3; width:auto; margin:0; padding-top:22px; flex-direction:column; align-items:flex-start; gap:12px; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-primary { flex-direction:column; align-items:flex-start; gap:2px; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-secondary { flex-direction:column; gap:4px; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-secondary > span + span { padding:0; border:0; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-scroll { grid-column:2; grid-row:1; min-width:0; }
.dsh-activity[data-activity-sidebar="true"] .dsh-activity-caption { grid-column:2; grid-row:2; }
/* Both axes use the same bounded cell size. Auto adds natural weeks as width
   grows; only explicit year (or exceptionally tiny cards) needs local scrolling. */
.dsh-activity-scroll { overflow-x:auto; max-width:100%; padding:${ACTIVITY_SCROLL_PADDING}px; border-radius:var(--dsw-radius-xs); scroll-padding-inline:${ACTIVITY_SCROLL_PADDING}px; }
.dsh-activity-scroll:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:-2px; }
.dsh-activity-grid { display:grid; gap:${ACTIVITY_GAP}px; width:max-content; margin-inline:auto; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, var(--dsh-activity-cell-size)); gap:${ACTIVITY_GAP}px; min-width:0; }
.dsh-activity-blocks { display:flex; align-items:start; gap:${ACTIVITY_BLOCK_GAP}px; width:max-content; margin-inline:auto; }
.dsh-activity-block { display:flex; flex-direction:column; gap:6px; }
.dsh-activity-block-label { font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }
.dsh-activity-weekdays, .dsh-activity-block-days { display:grid; grid-template-columns:repeat(7, var(--dsh-activity-cell-size)); gap:${ACTIVITY_GAP}px; }
.dsh-activity-weekdays { text-align:center; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-caption { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px 16px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
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
.dsh-activity-filters { display:flex; align-items:center; gap:10px; min-width:0; flex-wrap:wrap; }
.dsh-activity-filters .dsh-quiet-select { max-width:160px; }
.dsh-activity-legend { display:flex; align-items:center; justify-content:flex-start; gap:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-legend .dsh-activity-cell { width:12px; height:12px; }
.dsh-activity > .dsh-muted { margin:0; overflow-wrap:anywhere; }
.dsh-activity-detail { display:flex; flex-direction:column; gap:6px; border-top:0.5px solid var(--dsw-alias-border-l2); padding-top:10px; font:var(--dsw-font-xs-13); }
.dsh-settings-field { display:flex; flex-direction:column; gap:6px; font:var(--dsw-font-xs-13); }
.dsh-settings-field select { max-width:100%; padding:8px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-primary); background:var(--dsw-specific-input-major); font:inherit; }
@media (prefers-reduced-motion: reduce) { button.dsh-activity-cell { transition:none; } }
`
