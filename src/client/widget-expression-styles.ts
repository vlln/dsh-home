/** BoardUI-inspired content grammar. Accents follow semantic landmarks, never type IDs. */
export const widgetExpressionStyles = `
.dsh-home { background:color-mix(in srgb,var(--dsw-alias-bg-module-platform) 72%,var(--dsw-alias-bg-base)); }
.dsh-home .dsh-home-widget { background:var(--dsw-alias-bg-layer-1); border-color:var(--dsw-alias-border-l2); }
.dsh-home-widget { --dsh-widget-accent:var(--dsw-alias-state-business-primary); }
.dsh-home-widget:has(:is(.dsh-rhythm-content,.dsh-area-rows,.dsh-activity)) { --dsh-widget-accent:var(--dsw-alias-state-success-primary); }
.dsh-home-widget:has(:is(.dsh-pinned,.dsh-personal-notes,.dsh-queue)) { --dsh-widget-accent:var(--dsw-alias-state-warn-primary); }
.dsh-widget-symbol { display:inline-flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; border-radius:var(--dsw-radius-sm); color:var(--dsh-widget-accent,var(--dsw-alias-state-business-primary)); background:color-mix(in srgb,var(--dsh-widget-accent,var(--dsw-alias-state-business-primary)) 10%,transparent); }
.dsh-widget-symbol svg { width:16px; height:16px; color:inherit; }
.dsh-home .dsh-widget-symbol .dsh-w-glyph { color:inherit; }
.dsh-home-widget .dsh-w-head { gap:9px; }
.dsh-home-widget .dsh-w-title { letter-spacing:-.015em; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { gap:2px; }
.dsh-today-hero { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.dsh-today-hero .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; min-width:0; }
.dsh-home-widget .dsh-today-content .dsh-number { font-size:clamp(26px,8cqi,30px); line-height:1.1; letter-spacing:-.04em; overflow-wrap:anywhere; }
.dsh-day-dial { width:48px; height:48px; flex:none; overflow:visible; }
.dsh-day-dial circle { fill:none; }
.dsh-day-dial-track { stroke:var(--dsw-alias-border-l2); stroke-width:4; }
.dsh-day-dial-arc { stroke:var(--dsw-alias-state-business-primary); stroke-width:5; stroke-linecap:butt; }
.dsh-day-dial .dsh-day-dial-now { fill:var(--dsw-alias-state-warn-primary); }
.dsh-day-dial text { fill:var(--dsw-alias-label-tertiary); font:10px var(--dsw-font-family); }
.dsh-home-widget .dsh-band-track { height:8px; margin-top:1px; }
.dsh-home-widget .dsh-band-seg { opacity:.8; min-width:0; border-radius:var(--dsw-radius-xs); }
.dsh-home-widget .dsh-today-stats { padding-top:4px; margin-top:1px; }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-s-strong-14); color:var(--dsw-alias-state-business-primary); }
.dsh-home-widget .dsh-today-stats > span:nth-child(2) strong { color:var(--dsw-alias-state-success-primary); }
.dsh-home-widget .dsh-today-stats > span:nth-child(3) strong { color:var(--dsw-alias-state-warn-primary); }
.dsh-home-widget .dsh-today-longest { font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-rhythm-content .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; }
.dsh-home-widget .dsh-rhythm-content .dsh-number { font-size:32px; line-height:36px; letter-spacing:-.04em; }
.dsh-home-widget .dsh-rhythm-col { background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 7%,var(--dsw-alias-bg-module-platform)); }
.dsh-home-widget .dsh-rhythm-bar { background:var(--dsw-alias-state-success-primary); opacity:.65; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-area-track { height:7px; }
.dsh-home-widget .dsh-area-track > span { background:var(--dsw-alias-state-success-primary); opacity:.8; }
.dsh-home-widget .dsh-area-rows .dsh-row { gap:5px; padding-block:7px; }
.dsh-area-rows .dsh-directory-badge { width:24px; height:24px; font:var(--dsw-font-xxs-strong-12); }
.dsh-directory-badge { display:flex; align-items:center; justify-content:center; flex:none; width:32px; height:32px; border-radius:var(--dsw-radius-sm); font:var(--dsw-font-s-strong-14); --dsh-mark-color:var(--dsw-alias-state-business-primary); color:var(--dsh-mark-color); background:color-mix(in srgb,var(--dsh-mark-color) 12%,transparent); }
.dsh-directory-badge[data-tone="success"] { --dsh-mark-color:var(--dsw-alias-state-success-primary); }
.dsh-directory-badge[data-tone="warn"] { --dsh-mark-color:var(--dsw-alias-state-warn-primary); }
.dsh-home-widget .dsh-recent-row { display:grid; grid-template-columns:32px minmax(0,1fr); column-gap:10px; row-gap:3px; }
.dsh-recent-row > .dsh-directory-badge { grid-row:1 / span 2; align-self:center; }
.dsh-recent-row > :is(.dsh-row-top,.dsh-row-meta) { grid-column:2; min-width:0; }
.dsh-home-widget .dsh-recent-row .dsh-row-title { flex:1 1 auto; }
.dsh-home-widget .dsh-recent-row .dsh-chip { flex:none; }
.dsh-home-widget .dsh-pinned-summary { padding-bottom:6px; border-bottom:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-pinned-summary strong { color:var(--dsw-alias-label-primary); font:var(--dsw-font-xs-strong-13); }
.dsh-home-widget .dsh-focus-snippet { border-inline-start:3px solid var(--dsw-alias-state-business-primary); padding-inline-start:12px; margin-block:0; color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-focus-primary { background:var(--dsw-alias-button-info-fill); color:var(--dsw-alias-label-primary-foreground); }
.dsh-home-widget .dsh-focus-primary:is(:hover,:focus-visible) { background:var(--dsw-alias-button-info-hover); }
.dsh-home-widget .dsh-queue-main { border:0; background:var(--dsw-alias-bg-module-platform); border-inline-start:3px solid var(--dsw-alias-state-warn-primary); }
.dsh-home-widget .dsh-task-preview { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 5%,var(--dsw-alias-bg-module-platform)); border-inline-start:3px solid var(--dsw-alias-state-business-primary); }
.dsh-home-widget .dsh-task-options > button[aria-pressed="true"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent); color:var(--dsw-alias-state-business-primary); }
.dsh-home-widget .dsh-quick-widget-links { padding:0; background:transparent; }
.dsh-home-widget .dsh-quick-widget-link { background:var(--dsw-alias-bg-module-platform); }
@container widget (max-width:280px) {
  .dsh-day-dial { width:48px; height:48px; }
  .dsh-home-widget .dsh-recent-row { grid-template-columns:24px minmax(0,1fr); column-gap:6px; }
  .dsh-recent-row > .dsh-directory-badge { width:24px; height:28px; font:var(--dsw-font-xxs-strong-12); }
}
`
