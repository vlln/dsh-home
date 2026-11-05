export const libraryStyles=`
.dsh-library-panel { position:fixed; z-index:80; top:92px; right:20px; bottom:24px; width:min(400px,calc(100vw - 96px)); padding:16px; border:.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-xl); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); box-shadow:var(--dsw-shadow-lv3); display:flex; flex-direction:column; min-height:0; }
.dsh-library-heading { display:flex; align-items:center; justify-content:space-between; }
.dsh-library-heading h2 { font:var(--dsw-font-s-strong-14); margin:0 0 8px; }
.dsh-library-panel .dsh-gallery-toolbar { flex-direction:column; align-items:stretch; gap:8px; }
.dsh-library-panel .dsh-widget-directory { display:flex; flex-direction:column; gap:12px; max-height:none; overflow-y:auto; min-height:0; padding:2px 6px 8px 2px; }
.dsh-library-panel .dsh-directory-item { flex:none; padding:12px; height:220px; overflow:visible; background:var(--dsw-alias-settings-card-fill); transition:box-shadow 120ms ease; }
.dsh-library-panel .dsh-directory-item:hover,.dsh-library-panel .dsh-directory-item:focus-within { box-shadow:var(--dsw-shadow-lv2); border-color:var(--dsw-alias-border-l4); }
.dsh-library-tooltip {display:none;position:absolute;bottom:calc(100% + 6px);left:0;right:0;z-index:5;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);color:var(--dsw-alias-label-primary-foreground);font:var(--dsw-font-xs-13);pointer-events:none;box-shadow:var(--dsw-shadow-lv2)}
.dsh-library-tooltip small{display:block;margin-top:4px;font:var(--dsw-font-xxxs-11)}
.dsh-directory-item:hover>.dsh-library-tooltip,.dsh-directory-item:focus-within>.dsh-library-tooltip{display:block}
body.dsh-home-dragging .dsh-library-tooltip{display:none}
.dsh-library-panel .dsh-w-head { touch-action:none; cursor:grab; flex:none; }
.dsh-library-panel .dsh-w-title { flex:1; }
.dsh-library-preview { position:relative; width:100%; flex:1; min-height:0; overflow:hidden; margin-top:8px; pointer-events:none; }
.dsh-library-preview-scale { transform:scale(.68); transform-origin:top left; width:480px; height:260px; }
.dsh-library-ghost { position:fixed; z-index:1000; pointer-events:none; overflow:hidden; margin:0; box-sizing:border-box; box-shadow:var(--dsw-shadow-lv3); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); opacity:.9; }
.dsh-library-ghost[data-inside="false"] { opacity:.55; }
.dsh-library-outline {position:fixed;z-index:70;pointer-events:none;border:2px solid var(--dsw-alias-state-business-primary);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-state-business-tertiary);opacity:.4;box-sizing:border-box}
.dsh-library-outline[data-pending="true"]{border-style:dashed;background:transparent}
.dsh-library-ghost .dsh-w-head { flex:none; }
@media(prefers-reduced-motion:reduce){.dsh-library-panel .dsh-directory-item{transition:none}}
@media(max-width:720px){.dsh-library-panel { top:auto; height:360px; bottom:16px; right:16px; width:calc(100vw - 88px); } .dsh-library-preview-scale {transform:scale(.6)} }
`
