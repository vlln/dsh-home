/** BoardUI-inspired content grammar. Accents follow semantic landmarks, never type IDs. */
export const widgetExpressionStyles = `
.dsh-home { --dsh-home-canvas-fill:color-mix(in srgb,var(--dsw-alias-bg-module-platform) 72%,var(--dsw-alias-bg-base)); background:var(--dsh-home-canvas-fill); }
/* Sticky chrome is part of the canvas, not a white rectangular card. */
.dsh-home .dsh-home-head { background:var(--dsh-home-canvas-fill); }
.dsh-home .dsh-home-widget-content > .dsh-widget-viewport > .dsh-empty:only-child { min-height:100%; }
.dsh-home .dsh-home-widget { background:var(--dsw-alias-bg-layer-1); border-color:var(--dsw-alias-border-l2); }
/* Headings share one left slot: the glyph is a quiet mark, not a tinted tile.
   Cards without a glyph start at the same edge as the ones with one. */
.dsh-w-head { gap:9px; position:relative; padding-inline-start:20px; }
.dsh-widget-symbol { position:absolute; inset-inline-start:0; top:50%; transform:translateY(-50%); display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:var(--dsw-alias-label-tertiary); background:transparent; }
.dsh-widget-symbol svg { width:14px; height:14px; color:inherit; }
.dsh-home .dsh-widget-symbol .dsh-w-glyph { color:inherit; }
.dsh-home-widget .dsh-w-title { letter-spacing:-.015em; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { gap:2px; }
.dsh-today-hero { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.dsh-today-hero .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; min-width:0; }
.dsh-day-dial { width:clamp(52px, 15cqi, 96px); height:auto; aspect-ratio:1; flex:none; overflow:visible; }
.dsh-day-dial circle { fill:none; }
.dsh-day-dial-track { stroke:var(--dsw-alias-border-l2); stroke-width:4; }
.dsh-day-dial-arc { stroke:var(--dsh-accent); stroke-width:5; stroke-linecap:butt; }
.dsh-day-dial .dsh-day-dial-now { fill:var(--dsh-warning); }
.dsh-day-dial text { fill:var(--dsw-alias-label-tertiary); font:14px var(--dsw-font-family); }
.dsh-home-widget .dsh-band-track { height:10px; margin-top:1px; }
.dsh-home-widget .dsh-band-seg { opacity:.8; min-width:0; border-radius:var(--dsw-radius-xs); }
.dsh-home-widget .dsh-today-stats { padding-top:4px; margin-top:1px; }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-s-strong-14); color:var(--dsw-alias-label-primary); }
.dsh-home-widget .dsh-today-longest { font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-rhythm-content .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; }
.dsh-home-widget .dsh-rhythm-col { background:var(--dsh-track); }
.dsh-home-widget .dsh-rhythm-bar { background:var(--dsh-accent); opacity:.65; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-area-track { height:7px; }
.dsh-home-widget .dsh-area-track > span { background:var(--dsh-accent); opacity:.8; }
.dsh-area-rows .dsh-ws-pill { max-width:72%; }
.dsh-home-widget .dsh-pinned-summary { padding-bottom:6px; border-bottom:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-pinned-summary strong { color:var(--dsw-alias-label-primary); font:var(--dsw-font-xs-strong-13); }
.dsh-home-widget .dsh-focus-snippet { border-inline-start:3px solid var(--dsh-accent); padding-inline-start:12px; margin-block:0; color:var(--dsw-alias-label-secondary); }
.dsh-home-widget .dsh-focus-primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
.dsh-home-widget .dsh-focus-primary:is(:hover,:focus-visible) { background:var(--dsw-alias-button-primary-hover); }
.dsh-home-widget .dsh-quick-widget-links { padding:0; background:transparent; }
.dsh-home-widget .dsh-quick-widget-link { background:var(--dsw-alias-bg-module-platform); }
/* Content adapts within saved rectangles; whitespace is not an excuse to
   clip text, invent data or resize the widget. */
.dsh-home-widget .dsh-focus-title { white-space:normal; overflow-wrap:anywhere; }
.dsh-home-widget .dsh-focus-snippet { -webkit-line-clamp:4; }
.dsh-home-widget .dsh-focus-actions { margin-top:auto; }
.dsh-home-widget .dsh-today-timeline { min-width:0; }
.dsh-home-widget .dsh-today-content[data-roomy="true"] { gap:8px; justify-content:space-between; }
.dsh-home-widget .dsh-quick-widget { display:flex; flex-direction:column; min-height:100%; }
.dsh-home-widget .dsh-quick-widget > .dsh-widget-own-editor { margin-top:auto; }
.dsh-home-widget .dsh-quick-widget > .dsh-muted { margin-top:4px; }
@container widget (min-width:560px) {
  .dsh-home-widget .dsh-today-content { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); grid-template-rows:auto auto; gap:6px 24px; align-content:center; }
  .dsh-today-content .dsh-today-hero { grid-column:1; grid-row:1 / span 2; }
  .dsh-today-content .dsh-today-timeline { grid-column:2; grid-row:1; align-self:end; }
  .dsh-home-widget .dsh-today-content .dsh-today-stats { grid-column:2; grid-row:2; align-self:start; }
  .dsh-today-content .dsh-today-longest { grid-column:1 / -1; }
  .dsh-home-widget .dsh-quick-widget-links { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@container widget (max-width:280px) {
  .dsh-day-dial { width:48px; }
}
`
