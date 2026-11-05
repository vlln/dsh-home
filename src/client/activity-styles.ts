export const activityStyles = `
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
`
