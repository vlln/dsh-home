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

/* Today is selected by its real time-strip content, not a page business ID. */
.dsh-home-widget .dsh-widget-viewport:has(> .dsh-band-track) > .dsh-metric { gap:6px 10px; }
.dsh-home-widget .dsh-widget-viewport:has(> .dsh-band-track) .dsh-number { font-size:34px; line-height:40px; letter-spacing:-.025em; }
.dsh-home-widget .dsh-band-track { height:18px; margin-top:6px; background:var(--dsw-alias-bg-module-platform); }
.dsh-home-widget .dsh-band-seg { opacity:.4; }
.dsh-home-widget .dsh-band-seg[data-now="true"] { opacity:.8; }
.dsh-home-widget .dsh-band-seg:hover { opacity:1; }
.dsh-home-widget .dsh-band-scale { margin-top:4px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget .dsh-w-facts { gap:4px 12px; margin-top:8px; font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-secondary); }

/* Resume keeps its actual snippet, dismiss and continuation actions. */
.dsh-home-widget .dsh-focus { gap:8px; }
.dsh-home-widget .dsh-focus-title { font-size:18px; line-height:26px; }
.dsh-home-widget .dsh-focus-snippet { font-size:var(--dsh-content-font-size-secondary,13px); line-height:1.6; }
.dsh-home-widget .dsh-focus-meta { gap:4px 8px; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-focus-actions { flex-wrap:wrap; }
.dsh-home-widget .dsh-focus-primary:focus-visible { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget :is(.dsh-focus-secondary,.dsh-icon-button):focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

/* Queue status is present in the data already: a quiet row and a colored dot,
   with the real reason retained as text rather than an invented status. */
.dsh-home-widget .dsh-queue-row { margin:0; gap:4px; }
.dsh-home-widget .dsh-queue-main { gap:5px; padding:8px; background:var(--dsw-alias-bg-module-platform); }
.dsh-home-widget .dsh-queue-main:is(:hover,:focus-visible) { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-queue-meta { gap:6px 10px; }
.dsh-home-widget .dsh-queue-meta .dsh-chip { display:inline-flex; align-items:center; gap:5px; height:auto; min-height:18px; padding:0; border-radius:0; background:transparent; font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-queue-meta .dsh-chip::before { content:''; width:6px; height:6px; flex:none; border-radius:50%; corner-shape:round; background:currentColor; }

/* Compact recent rows: strong title, recognizable directory, quieter ID/time.
   Unknown/idle must remain neutral and must never imply a completed session. */
.dsh-home-widget .dsh-recent { gap:10px; }
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
.dsh-home-widget .dsh-task-preview { padding-block:8px; border-block:.5px solid var(--dsw-alias-border-l2); }

/* Local feedback only; no entrance choreography or changes to placement. */
.dsh-home .dsh-w { animation:none; }
.dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition-duration:150ms; }
@media (prefers-reduced-motion: reduce) {
  .dsh-home-widget :is(.dsh-row,.dsh-row-arrow,.dsh-queue-main,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button),
  .dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition:none; }
}
`
