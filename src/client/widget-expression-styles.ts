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
.dsh-day-dial-track { stroke:var(--dsh-hairline); stroke-width:4; }
.dsh-day-dial-arc { stroke:var(--color-chart-4); stroke-width:5; stroke-linecap:butt; }
.dsh-day-dial .dsh-day-dial-now { fill:var(--color-status-yellow-text); }
.dsh-day-dial text { fill:var(--color-text-tertiary); font:14px var(--font-sans); }
.dsh-home-widget .dsh-band-track { height:10px; margin-top:1px; }
.dsh-home-widget .dsh-band-seg { opacity:.8; min-width:0; border-radius:var(--dsh-radius-xs); }
.dsh-home-widget .dsh-today-stats { padding-top:4px; margin-top:1px; }
.dsh-home-widget .dsh-today-stats strong { font:var(--dsh-font-s-strong-14); color:var(--color-text-primary); }
.dsh-home-widget .dsh-today-longest { font:var(--dsh-font-xxxs-11); }
.dsh-home-widget .dsh-rhythm-content .dsh-metric { align-items:flex-start; flex-direction:column; gap:0; }
.dsh-home-widget .dsh-rhythm-col { background:var(--color-chart-track); }
.dsh-home-widget .dsh-rhythm-bar { background:var(--color-chart-4); opacity:.65; }
.dsh-home-widget .dsh-rhythm-bar[data-today="true"] { opacity:1; }
.dsh-home-widget .dsh-area-track { height:7px; }
.dsh-home-widget .dsh-area-track > span { background:var(--color-chart-4); opacity:.8; }
.dsh-home-widget .dsh-pinned-summary { padding-bottom:6px; }
.dsh-home-widget .dsh-pinned-summary strong { color:var(--color-text-primary); font:var(--dsh-font-xs-strong-13); }
.dsh-home-widget .dsh-focus-snippet { border-inline-start:3px solid var(--color-chart-4); padding-inline-start:12px; margin-block:0; color:var(--color-text-secondary); }
.dsh-home-widget .dsh-focus-primary { background:var(--color-accent-500); color:var(--color-text-white); }
.dsh-home-widget .dsh-focus-primary:is(:hover,:focus-visible) { background:var(--color-accent-400); }
/* Content adapts within saved rectangles; whitespace is not an excuse to
   clip text, invent data or resize the widget. */
.dsh-home-widget .dsh-focus-title { white-space:normal; overflow-wrap:anywhere; }
.dsh-home-widget .dsh-focus-snippet { -webkit-line-clamp:4; }
.dsh-home-widget .dsh-focus-actions { margin-top:auto; }
.dsh-home-widget .dsh-today-timeline { min-width:0; }
.dsh-home-widget .dsh-today-note { font:var(--dsh-font-xxs-12); color:var(--color-text-tertiary); text-align:end; }
/* One column, full width, in three bands: the number with its second line, the day's
   rail, then the counts. The rail is the widest thing in the card, so it gets the width;
   sitting it beside the number left two dead quadrants in a short wide card. */
.dsh-home-widget .dsh-today-content { justify-content:center; gap:10px; }
.dsh-home-widget .dsh-today-content[data-roomy="true"] { gap:14px; }
.dsh-home-widget .dsh-today-hero { align-items:flex-end; }
.dsh-today-content .dsh-today-longest { text-align:end; }
@container widget (max-width:280px) {
  .dsh-day-dial { width:48px; }
}
`
