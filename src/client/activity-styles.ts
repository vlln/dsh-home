export const activityStyles = `
.dsh-activity { display:flex; flex-direction:column; gap:10px; min-width:0; }
.dsh-activity-summary { font:var(--dsw-font-xs-13); color:var(--dsw-alias-label-secondary); }
.dsh-activity-scroll { overflow-x:auto; padding:2px; }
.dsh-activity-grid { display:grid; gap:3px; min-width:max-content; }
.dsh-activity-week { display:grid; grid-template-rows:16px repeat(7, 12px); gap:3px; min-width:9px; }
.dsh-activity-month { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); overflow:visible; }
.dsh-activity-cell { display:block; width:100%; min-width:9px; height:12px; padding:0; border:0; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-module-platform); }
button.dsh-activity-cell { cursor:pointer; }
.dsh-activity-cell[data-level="1"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="2"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 44%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="3"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-bg-module-platform)); }
.dsh-activity-cell[data-level="4"] { background:var(--dsw-alias-state-business-primary); }
.dsh-activity-cell[data-unknown="true"] { background:transparent; outline:1px dashed var(--dsw-alias-border-l3); outline-offset:-1px; }
.dsh-activity-cell[data-selected="true"], button.dsh-activity-cell:focus-visible { outline:2px solid var(--dsw-alias-label-primary); outline-offset:1px; }
button.dsh-activity-cell:hover { box-shadow:0 0 0 1px var(--dsw-alias-label-secondary); }
.dsh-activity-spacer { visibility:hidden; }
.dsh-activity-legend { display:flex; align-items:center; justify-content:flex-end; gap:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-activity-legend .dsh-activity-cell { width:12px; }
.dsh-activity-detail { display:flex; flex-direction:column; gap:6px; border-top:0.5px solid var(--dsw-alias-border-l2); padding-top:10px; font:var(--dsw-font-xs-13); }
.dsh-settings-field { display:flex; flex-direction:column; gap:6px; font:var(--dsw-font-xs-13); }
.dsh-settings-field select { max-width:100%; padding:8px; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-primary); background:var(--dsw-specific-input-major); font:inherit; }
`
