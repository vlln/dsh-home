/** Final, content-scoped refinement layer. Geometry, instance layout and business
 * state remain owned by the existing shell/registry; all surfaces use DSH aliases. */
export const widgetRefinementStyles = `
/* A readable heading, then primary content, then quiet metadata. */
.dsh-home .dsh-w-title { font:var(--dsw-font-s-strong-14); font-weight:600; color:var(--dsw-alias-label-primary); letter-spacing:0; min-width:0; overflow-wrap:anywhere; }
.dsh-home .dsh-w-glyph { color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-row-title { font:var(--dsw-font-s-strong-14); }
.dsh-home-widget :is(.dsh-row-meta,.dsh-label) { font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-muted { color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget :is(.dsh-row,.dsh-queue-main,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button) { transition:background-color 120ms ease-out,color 120ms ease-out; }
.dsh-home-widget .dsh-row:focus-visible { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-row-static:focus-visible { background:transparent; }
.dsh-home-widget:focus-within { border-color:var(--dsw-alias-border-l4); }
/* Existing scroll containers still own overflow. Reserve space for focus rings
   and never flex-shrink an editor into an unusable sliver in a short card. */
.dsh-home .dsh-home-widget-content { scroll-padding-block:4px; }
.dsh-home-widget .dsh-widget-own-editor { flex-shrink:0; padding-inline:2px; padding-bottom:2px; }
.dsh-home-widget .dsh-widget-own-editor > button { flex-shrink:0; }

/* A quiet outer surface, not a stack of decorated nested cards. Content owns
   its responsive structure; the shell must retain overflow as a safety net. */
.dsh-home .dsh-home-widget { background:color-mix(in srgb,var(--dsw-alias-bg-module-platform) 65%,var(--dsw-alias-bg-layer-1)); }
.dsh-home .dsh-widget-viewport { container-type:inline-size; container-name:widget; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { display:flex; flex-direction:column; gap:4px; min-width:0; height:100%; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) > * { flex-shrink:0; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) .dsh-number { font-size:28px; line-height:32px; letter-spacing:-.025em; }
.dsh-home-widget .dsh-band-track { height:12px; margin-top:4px; background:var(--dsw-alias-bg-skeleton); }
.dsh-home-widget .dsh-band-seg { opacity:.55; }
.dsh-home-widget .dsh-band-seg[data-now="true"] { opacity:.9; }
.dsh-home-widget .dsh-band-seg:hover { opacity:1; }
.dsh-home-widget .dsh-band-scale { margin-top:0; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-today-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding-top:6px; margin-top:2px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-today-stats > span { display:flex; flex-direction:column; min-width:0; gap:1px; }
.dsh-home-widget .dsh-today-stats > span + span { padding-inline-start:8px; border-inline-start:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-xs-strong-13); font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.dsh-home-widget .dsh-today-stats span > span { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-today-longest { margin-top:1px; }
/* Workspace bars encode the real per-workspace duration, relative to the largest
   row (not a share of wall-clock time; concurrent session clusters may overlap). */
.dsh-home-widget .dsh-area-rows { gap:2px; }
.dsh-home-widget .dsh-area-rows .dsh-row { gap:3px; padding-block:5px; }
.dsh-home-widget .dsh-area-duration { margin-inline-start:auto; flex:none; font:var(--dsw-font-xs-strong-13); font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-area-track { display:block; width:100%; height:4px; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-skeleton); overflow:hidden; }
.dsh-home-widget .dsh-area-track > span { display:block; height:100%; border-radius:inherit; background:var(--dsw-alias-state-business-primary); opacity:.65; }
.dsh-home-widget .dsh-area-rows .dsh-row-meta { font:var(--dsw-font-xxxs-11); }
/* Stable proportions, rounded neutral tracks and a clear current-day accent.
   Taller cards gain useful chart height instead of only empty space. */
.dsh-home-widget .dsh-rhythm { flex:1 1 64px; min-height:48px; max-height:160px; gap:5px; margin-top:4px; }
.dsh-home-widget .dsh-rhythm-col { background:var(--dsw-alias-bg-skeleton); border-radius:var(--dsw-radius-sm); overflow:hidden; }
.dsh-home-widget .dsh-rhythm-bar { border-radius:var(--dsw-radius-sm); opacity:.55; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-rhythm-days { gap:5px; margin-top:0; font:var(--dsw-font-xxxs-11); }
@container widget (min-width:560px) {
  .dsh-today-content .dsh-number,.dsh-rhythm-content .dsh-number { font-size:32px; line-height:36px; }
  .dsh-area-rows .dsh-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(120px,1fr); column-gap:16px; }
  .dsh-area-rows .dsh-row-top { grid-column:1; }
  .dsh-area-rows .dsh-area-track { grid-column:2; grid-row:1 / span 2; align-self:center; }
  .dsh-area-rows .dsh-row-meta { grid-column:1; }
}

/* Resume keeps its actual snippet, dismiss and continuation actions. */
.dsh-home-widget .dsh-focus { gap:8px; position:relative; min-height:100%; }
.dsh-home-widget .dsh-focus-eyebrow-row { position:absolute; top:0; right:0; }
.dsh-home-widget .dsh-focus-title { padding-inline-end:28px; }
.dsh-home-widget .dsh-focus-actions { padding-top:6px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-focus > * { flex-shrink:0; }
.dsh-home-widget .dsh-focus-title { font-size:18px; line-height:26px; }
.dsh-home-widget .dsh-focus-snippet { font-size:var(--dsh-content-font-size-secondary,13px); line-height:1.6; }
.dsh-home-widget .dsh-focus-meta { gap:4px 8px; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-focus-actions { flex-wrap:wrap; }
.dsh-home-widget .dsh-focus-primary:focus-visible { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget :is(.dsh-focus-secondary,.dsh-icon-button):focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

/* Queue status is present in the data already: a quiet row and a colored dot,
   with the real reason retained as text rather than an invented status. */
.dsh-home-widget .dsh-queue-row { margin:0; gap:4px; }
.dsh-home-widget .dsh-queue-main { gap:5px; padding:8px 10px; background:var(--dsw-alias-bg-layer-1); border:.5px solid var(--dsw-alias-border-l1); }
.dsh-home-widget .dsh-queue .dsh-w-body { gap:6px; }
.dsh-home-widget .dsh-queue-main:is(:hover,:focus-visible) { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-queue-meta { gap:6px 10px; }
.dsh-home-widget .dsh-queue-meta .dsh-chip { display:inline-flex; align-items:center; gap:5px; height:auto; min-height:18px; padding:0; border-radius:0; background:transparent; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-queue-meta .dsh-chip::before { content:''; width:6px; height:6px; flex:none; border-radius:50%; corner-shape:round; background:currentColor; }

/* Compact recent rows: strong title, recognizable directory, quieter ID/time.
   Unknown/idle must remain neutral and must never imply a completed session. */
.dsh-home-widget .dsh-recent { gap:8px; height:100%; min-height:0; }
.dsh-home-widget .dsh-recent > :is(.dsh-recent-filters,.dsh-recent-footer) { flex:none; }
.dsh-home-widget .dsh-recent > .dsh-rows { flex:1 1 auto; min-height:60px; overflow-y:auto; margin-inline:0; scroll-padding-block:3px; padding:2px; }
.dsh-home-widget .dsh-recent .dsh-recent-row { flex:none; }
.dsh-home-widget .dsh-recent-filters > :is(input,select) { background:var(--dsw-alias-bg-layer-1); }
.dsh-home-widget .dsh-recent-filters input::placeholder { color:var(--dsw-alias-label-tertiary); opacity:1; }
.dsh-home-widget .dsh-recent-footer { padding-top:4px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-recent-row { gap:4px; padding-block:8px; }
.dsh-home-widget .dsh-recent-row + .dsh-recent-row { border-top:.5px solid var(--dsw-alias-border-l1); }
.dsh-home-widget .dsh-recent-meta { gap:2px 10px; }
.dsh-home-widget .dsh-recent-path { color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-recent-id { font-size:11px; color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-recent-row .dsh-chip { height:20px; padding-inline:6px; font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-recent-row:is([data-status="idle"],[data-status="unknown"]) .dsh-chip { background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-recent-row[data-status="running"] .dsh-chip { background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent); color:var(--dsw-alias-state-success-primary); }

/* Task choices remain choices; the only primary action still prepares a draft. */
.dsh-home-widget .dsh-tasks { gap:10px; }
.dsh-home-widget .dsh-tasks > .dsh-muted { line-height:1.5; }
.dsh-home-widget .dsh-task-options { gap:4px; }
.dsh-home-widget .dsh-task-options > button[aria-pressed="true"] { background:var(--dsw-alias-button-ghost-active-fill); color:var(--dsw-alias-label-primary); }
.dsh-home-widget .dsh-task-preview { padding:10px 12px; border:0; border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); }
.dsh-home-widget .dsh-task-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; }
.dsh-home-widget .dsh-task-options > button { min-width:0; height:auto; min-height:28px; white-space:normal; }
.dsh-home-widget .dsh-tasks > button { flex-shrink:0; }
.dsh-home-widget .dsh-tasks > button:last-of-type { width:100%; }
.dsh-home-widget .dsh-quick-widget-links { background:var(--dsw-alias-bg-layer-1); border:0; border-radius:var(--dsw-radius-md); padding:4px; }
.dsh-home-widget .dsh-quick-widget > .dsh-widget-own-editor { justify-content:flex-start; padding-top:6px; }
.dsh-home-widget .dsh-personal-notes > .dsh-personal-note-text { padding:10px 12px; border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); }
.dsh-home-widget .dsh-personal-clock { min-height:100%; }
.dsh-home-widget .dsh-personal-clock-meta { margin-top:auto; padding-top:8px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-personal-clock-time { font-size:clamp(30px,12cqi,48px); }
.dsh-home-widget .dsh-activity-secondary { font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-activity { gap:4px; }
.dsh-home-widget .dsh-activity-legend { padding-top:2px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-activity-footer { display:flex; gap:4px 12px; justify-content:space-between; align-items:center; flex-wrap:wrap; }
.dsh-home-widget .dsh-activity-footer > .dsh-muted { flex:1 1 200px; }
.dsh-home-widget .dsh-activity-footer > .dsh-widget-own-editor { margin:0; padding:0; flex:none; }
@container widget (max-width:480px) {
  .dsh-personal-clock { gap:4px; }
  .dsh-personal-clock .dsh-personal-label { font:var(--dsw-font-xs-13); }
  .dsh-personal-clock .dsh-personal-clock-time { font-size:clamp(28px,10cqi,40px); }
  .dsh-personal-clock .dsh-personal-clock-date { font:var(--dsw-font-xs-13); }
  .dsh-personal-clock .dsh-personal-clock-meta { padding-top:4px; }
  .dsh-rhythm-days span:last-child { white-space:nowrap; }
}

/* Local feedback only; no entrance choreography or changes to placement. */
.dsh-home .dsh-w { animation:none; }
.dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition-duration:150ms; }
@media (prefers-reduced-motion: reduce) {
  .dsh-home-widget :is(.dsh-row,.dsh-row-arrow,.dsh-queue-main,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button),
  .dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition:none; }
}
`
