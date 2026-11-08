/**
 * 卡片内容语法：只放"某张卡内部怎么排"的规则。
 *
 * 页面底色、卡片表面、标题行的几何都属于外壳（theme.css 的 .dsh-card 与 styles.ts），
 * 不在这一层重写——这一层以前就是靠重写它们把上面那套盖掉的，结果同一个页面里有两份
 * 互相打架的卡片定义。
 */
export const widgetExpressionStyles = `
.dsh-home .dsh-home-widget-content > .dsh-widget-viewport > .dsh-empty:only-child { min-height:100%; }
.dsh-home-widget :is(.dsh-today-content,.dsh-rhythm-content) { gap:2px; }
.dsh-today-hero { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.dsh-today-hero .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; min-width:0; }
.dsh-day-dial { width:clamp(52px, 15cqi, 96px); height:auto; aspect-ratio:1; flex:none; overflow:visible; }
.dsh-day-dial circle { fill:none; }
.dsh-day-dial-track { stroke:var(--dsw-alias-border-l2); stroke-width:4; }
.dsh-day-dial-arc { stroke:var(--color-chart-4); stroke-width:5; stroke-linecap:butt; }
.dsh-day-dial .dsh-day-dial-now { fill:var(--color-status-yellow-text); }
.dsh-day-dial text { fill:var(--dsw-alias-label-tertiary); font:14px var(--dsw-font-family); }
.dsh-home-widget .dsh-band-track { height:10px; margin-top:1px; }
.dsh-home-widget .dsh-band-seg { opacity:.8; min-width:0; border-radius:var(--dsw-radius-xs); }
.dsh-home-widget .dsh-today-stats { padding-top:4px; margin-top:1px; }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsw-font-s-strong-14); color:var(--dsw-alias-label-primary); }
.dsh-home-widget .dsh-today-longest { font:var(--dsw-font-xxxs-11); }
.dsh-home-widget .dsh-rhythm-content .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; }
.dsh-home-widget .dsh-rhythm-col { background:var(--color-chart-track); }
.dsh-home-widget .dsh-rhythm-bar { background:var(--color-chart-4); opacity:.65; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-area-track { height:7px; }
.dsh-home-widget .dsh-area-track > span { background:var(--color-chart-4); opacity:.8; }
.dsh-home-widget .dsh-pinned-summary { padding-bottom:6px; border-bottom:.5px solid var(--dsw-alias-border-l2); }
.dsh-home-widget .dsh-pinned-summary strong { color:var(--dsw-alias-label-primary); font:var(--dsw-font-xs-strong-13); }
.dsh-home-widget .dsh-focus-snippet { border-inline-start:3px solid var(--color-chart-4); padding-inline-start:12px; margin-block:0; color:var(--dsw-alias-label-secondary); }
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
