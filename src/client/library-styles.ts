export const libraryStyles=`
/* A floating window, not a docked column: JS moves it by writing left/top, and a
   null preference falls back to this corner. The height cap leaves room to park it. */
.dsh-library-panel { position:fixed; z-index:80; top:92px; right:20px; height:min(720px,calc(100vh - 132px)); width:min(480px,calc(100vw - 96px)); padding:16px; border:.5px solid var(--color-border-button-default); border-radius:var(--dsh-radius-xl); background:var(--dsh-card); color:var(--color-text-primary); box-shadow:var(--dsh-shadow-lv3); display:flex; flex-direction:column; min-height:0; }
.dsh-library-heading { display:flex; align-items:center; gap:8px; margin:0 0 8px; cursor:grab; touch-action:none; user-select:none; }
.dsh-library-heading h2 { font:var(--dsh-font-s-strong-14); margin:0; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-tool.dsh-library-grip { flex:none; cursor:grab; }
.dsh-library-panel[data-moving="true"] { user-select:none; }
.dsh-library-panel[data-moving="true"] .dsh-library-heading, .dsh-library-panel[data-moving="true"] .dsh-library-grip { cursor:grabbing; }
.dsh-library-panel .dsh-gallery-toolbar { flex-direction:column; align-items:stretch; gap:8px; }
.dsh-library-panel .dsh-widget-directory { display:flex; flex-direction:column; gap:12px; max-height:none; overflow-y:auto; min-height:0; padding:2px 6px 8px 2px; }
.dsh-library-panel .dsh-directory-item { flex:none; padding:12px; height:auto; overflow:hidden; background:var(--dsh-card); transition:box-shadow 120ms ease; cursor:grab; touch-action:none; user-select:none; }
.dsh-library-panel .dsh-directory-item:hover,.dsh-library-panel .dsh-directory-item:focus-within { box-shadow:var(--dsh-shadow-lv2); border-color:var(--color-border-button-hover); }
.dsh-library-panel .dsh-w-head { touch-action:none; cursor:grab; flex:none; }
.dsh-library-panel .dsh-w-title { flex:1; }
.dsh-library-preview { position:relative; width:100%; flex:1 1 auto; min-height:0; overflow:hidden; margin-top:10px; pointer-events:none; }
/* The outer box only positions. Everything visual comes from the real card inside it:
   dragging used to show a dsh-w box with none of the widget's card rules (padding, radius,
   per-size typography), so the ghost was a different component. */
.dsh-library-ghost {
  position:fixed; z-index:1000; pointer-events:none; overflow:hidden; margin:0; box-sizing:border-box;
  border-radius:var(--dsh-card-radius); box-shadow:var(--dsh-shadow-lv3); opacity:.9;
}
/* The card must fill the box the drag sized, with border-box: content-box let the padding
   grow outside the box, so the ghost was 32px narrower than the card it previewed. */
.dsh-library-ghost > .dsh-card { width:100%; height:100%; box-sizing:border-box; box-shadow:none; }
.dsh-library-ghost[data-inside="false"] { opacity:.55; }
.dsh-library-outline {position:fixed;z-index:70;pointer-events:none;border:2px solid var(--color-chart-4);border-radius:var(--dsh-radius-xl);background:color-mix(in srgb, var(--color-chart-4) 12%, transparent);opacity:.4;box-sizing:border-box}
.dsh-library-outline[data-pending="true"]{border-style:dashed;background:transparent}
.dsh-library-ghost .dsh-w-head { flex:none; }
@media(prefers-reduced-motion:reduce){.dsh-library-panel .dsh-directory-item{transition:none}}
@media(max-width:720px){.dsh-library-panel { width:calc(100vw - 40px); } }
`
