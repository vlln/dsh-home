/** Final, content-scoped refinement layer. Geometry, instance layout and business
 * state remain owned by the existing shell/registry; all surfaces use DSH aliases. */
export const widgetRefinementStyles = `
/* A readable heading, then primary content, then quiet metadata. */
.dsh-home .dsh-w-title { font:var(--dsw-font-s-strong-14); font-weight:600; color:var(--dsw-alias-label-primary); letter-spacing:0; min-width:0; overflow-wrap:anywhere; }
.dsh-home .dsh-w-glyph { color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-row-title { font:var(--dsw-font-s-strong-14); }
.dsh-home-widget :is(.dsh-row-meta,.dsh-label) { font:var(--dsw-font-xxs-12); }
.dsh-home-widget .dsh-muted { color:var(--dsw-alias-label-tertiary); }
.dsh-home-widget :is(.dsh-row,.dsh-session-row,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button) { transition:background-color 120ms ease-out,color 120ms ease-out; }
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
.dsh-home-widget .dsh-area-rows { gap:2px; height:100%; min-height:0; overflow:hidden; }
.dsh-home-widget .dsh-area-rows .dsh-row { gap:2px; padding-block:4px; }
.dsh-home-widget .dsh-area-rows .dsh-row-top { gap:6px; }
.dsh-home-widget .dsh-area-duration { margin-inline-start:auto; flex:none; font:var(--dsw-font-xs-strong-13); font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-area-track { display:block; width:100%; height:4px; border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-bg-skeleton); overflow:hidden; }
.dsh-home-widget .dsh-area-track > span { display:block; height:100%; border-radius:inherit; background:var(--dsh-accent); opacity:.65; }
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

/* Recent card: five tall entries share the card height, so the list reads as a stack of
   targets instead of a strip of one-line rows. The list never scrolls; the footer states
   the real total. Entry styling lives next to the component in styles.ts. */
.dsh-home-widget .dsh-recent { gap:6px; height:100%; min-height:0; }
.dsh-home-widget .dsh-recent > .dsh-recent-footer { flex:none; padding-top:4px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-recent > .dsh-empty { flex:1 1 auto; }
.dsh-home-widget .dsh-recent-list { flex:1 1 auto; min-height:0; overflow:hidden; }
.dsh-home-widget .dsh-recent-item { transition:background-color 120ms ease-out; }
.dsh-home-widget .dsh-recent-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-home-widget .dsh-recent-item:active { background:var(--dsw-alias-interactive-bg-active); }
.dsh-home-widget .dsh-recent-item:focus-visible {
  background:var(--dsw-alias-interactive-bg-hover);
  outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsh-accent));
  outline-offset:-2px;
}

/* Native pins: newest-first, cut to what fits, total count still stated. */
.dsh-pinned { display:flex; flex-direction:column; height:100%; min-height:0; gap:8px; }
.dsh-pinned-summary { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 12px; flex:none; font:var(--dsw-font-xxs-12); color:var(--dsw-alias-label-tertiary); }
.dsh-pinned-summary strong { color:var(--dsw-alias-label-secondary); font-weight:500; }
.dsh-pinned > .dsh-empty { flex:1 1 auto; }
.dsh-pinned-rows { flex:1 1 auto; min-height:0; overflow:hidden; margin:0; padding:2px; }
.dsh-pinned-rows .dsh-row { flex:none; }
.dsh-pinned-rows .dsh-row + .dsh-row { border-top:.5px solid var(--dsw-alias-border-l1); }

/* Task choices remain choices; the only primary action still prepares a draft. */
.dsh-home-widget .dsh-quick-widget-links { background:var(--dsw-alias-bg-layer-1); border:0; border-radius:var(--dsw-radius-md); padding:4px; }
.dsh-home-widget .dsh-quick-widget > .dsh-widget-own-editor { justify-content:flex-start; padding-top:6px; }
.dsh-home-widget .dsh-personal-clock { min-height:100%; }
.dsh-home-widget .dsh-activity-secondary { font-variant-numeric:tabular-nums; }
.dsh-home-widget .dsh-activity-legend { padding-top:2px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-activity-footer { display:flex; gap:4px 12px; justify-content:space-between; align-items:center; flex-wrap:wrap; }
.dsh-home-widget .dsh-activity-footer > .dsh-muted { flex:1 1 200px; }
.dsh-home-widget .dsh-activity-footer > .dsh-widget-own-editor { margin:0; padding:0; flex:none; }
@container widget (max-width:480px) {
  .dsh-personal-clock .dsh-personal-label { font:var(--dsw-font-xs-13); }
  .dsh-rhythm-days span:last-child { white-space:nowrap; }
}

/* Local feedback only; no entrance choreography or changes to placement. */
.dsh-home .dsh-w { animation:none; }
.dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition-duration:150ms; }
@media (prefers-reduced-motion: reduce) {
  .dsh-home-widget :is(.dsh-row,.dsh-row-arrow,.dsh-recent-item,.dsh-focus-primary,.dsh-focus-secondary,.dsh-icon-button),
  .dsh-home .react-grid-layout,.dsh-home .react-grid-item { transition:none; }
}
`
