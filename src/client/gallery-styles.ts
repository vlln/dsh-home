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
/* Gallery previews are the real card body at its real pixel size, scaled only visually. */
.dsh-card-preview { width:100%; min-width:0; }
.dsh-card-preview-frame { position:relative; overflow:hidden; }
.dsh-card-preview-body { position:absolute; top:0; left:0; transform-origin:top left; }
@media(max-width:720px) { .dsh-widget-directory { grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); } .dsh-gallery-toolbar { gap:8px; } }
`
