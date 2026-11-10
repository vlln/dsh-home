export const galleryStyles = `
.dsh-gallery-hint { font:var(--dsh-font-xs-13); color:var(--color-text-secondary); margin:0 0 14px; }
.dsh-gallery-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.dsh-gallery-filters { display:flex; align-items:center; gap:4px; }
.dsh-gallery-filters button[aria-pressed="true"], .dsh-manager-nav button[aria-pressed="true"] { background:var(--dsh-active); }
.dsh-widget-directory { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr)); gap:16px; max-height:min(680px,65vh); overflow-y:auto; padding:2px 4px 4px 2px; }
.dsh-directory-item { display:flex; flex-direction:column; align-items:stretch; flex-wrap:nowrap; gap:0; padding:0; min-width:0; overflow:hidden; border:0.5px solid var(--color-border-button-default); border-radius:var(--dsh-radius-lg); background:var(--dsh-card); }
.dsh-directory-preview { display:flex; align-items:center; justify-content:center; flex:none; height:150px; width:calc(100% - 24px); min-width:0; margin:12px 12px 0; padding:14px; border-radius:var(--dsh-radius-md); background:var(--dsh-card); color:var(--color-text-primary); overflow:hidden; pointer-events:none; user-select:none; }
.dsh-gallery-card-footer .dsh-manager-info { flex:1; min-width:0; }
.dsh-gallery-card-footer .dsh-manager-info > strong { font:var(--dsh-font-s-strong-14); }
.dsh-gallery-empty { display:flex; flex-direction:column; align-items:center; gap:12px; padding:36px 12px; color:var(--color-text-secondary); font:var(--dsh-font-xs-13); }
/* Gallery previews are the real card body at its real pixel size, scaled only visually. */
.dsh-card-preview { display:flex; justify-content:center; width:100%; min-width:0; }
.dsh-card-preview-frame { position:relative; overflow:hidden; }
.dsh-card-preview-body { position:absolute; top:0; left:0; transform-origin:top left; }
@media(max-width:720px) { .dsh-widget-directory { grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); } .dsh-gallery-toolbar { gap:8px; } }
`
