export const galleryStyles = `
.dsh-manager-nav { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.dsh-gallery-hint { font:var(--dsw-font-xs-13); color:var(--dsw-alias-label-secondary); margin:0 0 14px; }
.dsh-gallery-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.dsh-gallery-search { flex:1 1 260px; min-width:0; max-width:480px; }
.dsh-gallery-filters { display:flex; align-items:center; gap:4px; }
.dsh-gallery-filters button[aria-pressed="true"], .dsh-manager-nav button[aria-pressed="true"] { background:var(--dsw-alias-interactive-bg-active); }
.dsh-widget-directory { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr)); gap:16px; max-height:min(680px,65vh); overflow-y:auto; padding:2px 4px 4px 2px; }
.dsh-directory-item { display:flex; flex-direction:column; align-items:stretch; flex-wrap:nowrap; gap:0; padding:0; min-width:0; overflow:hidden; border:0.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-lg); background:var(--dsw-alias-bg-layer-1); }
.dsh-directory-preview { display:flex; align-items:center; justify-content:center; flex:none; height:150px; width:calc(100% - 24px); min-width:0; margin:12px 12px 0; padding:14px; border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary); overflow:hidden; pointer-events:none; user-select:none; }
.dsh-gallery-sample { font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); text-align:center; padding:6px 8px; }
.dsh-gallery-card-footer { display:flex; align-items:flex-start; gap:12px; width:100%; padding:10px 14px 6px; }
.dsh-gallery-card-footer .dsh-manager-info { flex:1; min-width:0; }
.dsh-gallery-card-footer .dsh-manager-info > strong { font:var(--dsw-font-s-strong-14); }
.dsh-gallery-card-footer button { flex:none; }
.dsh-gallery-card-footer .dsh-manager-description { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; font:var(--dsw-font-xs-13); min-height:40px; }
.dsh-gallery-source { padding:0 14px 12px; font:var(--dsw-font-xxxs-11); color:var(--dsw-alias-label-tertiary); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-gallery-empty { display:flex; flex-direction:column; align-items:center; gap:12px; padding:36px 12px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xs-13); }
.dsh-preview-fallback { display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; font:var(--dsw-font-s-14); }
.dsh-preview-fallback svg { width:36px; height:36px; color:var(--dsw-alias-label-tertiary); }
.dsh-preview-heatmap { display:grid; grid-auto-flow:column; grid-template-rows:repeat(7,10px); grid-template-columns:repeat(13,minmax(7px,1fr)); gap:4px; width:100%; max-width:270px; }
.dsh-preview-heatmap i { border-radius:var(--dsw-radius-xs); background:var(--dsw-alias-border-l2); }
.dsh-preview-heatmap i[data-level="1"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="2"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="3"] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 65%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-heatmap i[data-level="4"] { background:var(--dsw-alias-state-business-primary); }
.dsh-preview-note { width:100%; font:var(--dsw-font-xs-13); }
.dsh-preview-note strong { font:var(--dsw-font-s-strong-14); }
.dsh-preview-note p { margin:10px 0; line-height:1.6; }
.dsh-preview-line { display:block; height:5px; width:80%; margin-top:8px; background:var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-xs); }
.dsh-preview-line:last-child { width:55%; }
.dsh-preview-clock { display:flex; flex-direction:column; gap:6px; align-items:center; }
.dsh-preview-clock strong { font-size:38px; line-height:1.2; font-weight:500; font-variant-numeric:tabular-nums; }
.dsh-preview-clock span { font:var(--dsw-font-xs-13); color:var(--dsw-alias-label-secondary); }
.dsh-preview-bars { display:flex; align-items:flex-end; height:90px; gap:6px; width:100%; }
.dsh-preview-bars i { flex:1; min-width:0; border-radius:var(--dsw-radius-xs); background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 48%,var(--dsw-alias-bg-module-platform)); }
.dsh-preview-today { width:100%; display:flex; flex-direction:column; gap:14px; font:var(--dsw-font-xs-13); }
.dsh-preview-today strong { font:var(--dsw-font-l-20); }
.dsh-preview-today > div { height:16px; background:var(--dsw-alias-border-l1); display:flex; gap:14px; align-items:stretch; padding-left:15%; }
.dsh-preview-today i { width:18%; background:var(--dsw-alias-state-business-primary); border-radius:var(--dsw-radius-xs); }
.dsh-preview-today span { color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxxs-11); }
.dsh-preview-rows { width:100%; display:flex; flex-direction:column; gap:12px; }
.dsh-preview-rows > div { display:flex; align-items:center; gap:8px; font:var(--dsw-font-xs-13); min-width:0; }
.dsh-preview-rows i { width:6px; height:6px; flex:none; background:var(--dsw-alias-border-l4); border-radius:50%; corner-shape:round; }
.dsh-preview-rows i[data-live="true"] { background:var(--dsw-alias-state-success-primary); }
.dsh-preview-rows span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.dsh-preview-rows small { color:var(--dsw-alias-label-tertiary); }
@media(max-width:720px) { .dsh-widget-directory { grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); } .dsh-gallery-toolbar { gap:8px; } }
`
