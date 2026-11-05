/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
export const personalStyles = `
.dsh-personal-notes,.dsh-personal-clock{min-width:0;max-width:100%;color:var(--dsw-alias-label-primary)}
/* One paper edge, not another card inside the widget. The quote is decoration,
   never invented note content or an extra action. */
.dsh-personal-notes{box-sizing:border-box;position:relative;isolation:isolate;display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;padding:4px 4px 0 18px;border-inline-start:3px solid var(--dsw-alias-state-warn-primary);background:linear-gradient(100deg,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 6%,transparent),transparent 70%)}
.dsh-personal-note-quote{flex:none;height:28px;overflow:hidden;color:var(--dsw-alias-state-warn-primary);font-family:var(--dsw-font-family);font-size:52px;font-weight:600;line-height:1;pointer-events:none;user-select:none}
.dsh-personal-notes > .dsh-personal-label,.dsh-personal-notes > .dsh-personal-hint{flex:none}
.dsh-personal-notes > .dsh-personal-note-text{flex:1 1 auto;min-height:1.6em;overflow:auto;scroll-padding-block:4px;padding:0 4px 0 0;border:0;border-radius:0;background:transparent}
.dsh-personal-notes > .dsh-widget-own-editor{flex:none;justify-content:flex-start;margin-top:auto;padding-top:6px;border:0}
.dsh-personal-label{margin:0;font:var(--dsw-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-note-text{font-size:var(--dsh-content-font-size);line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-personal-hint{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere}
/* The fixed h4 viewport has room for a time/date row and existing editor,
   not an additional weekday strip. Keep typography responsive to card width. */
.dsh-personal-clock{box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;gap:2px;min-height:100%}
.dsh-personal-clock > *{flex:none}
.dsh-personal-clock > .dsh-personal-label{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
.dsh-personal-clock-display{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex:1 0 auto;padding-block:2px}
.dsh-personal-clock-meta{display:flex;align-items:center;justify-content:space-between;gap:4px 8px;width:100%;flex-wrap:wrap;margin-top:auto;padding-top:0;border:0}
.dsh-personal-clock-meta .dsh-widget-own-editor{margin-top:0;flex:none}
.dsh-personal-clock-meta .dsh-personal-hint{flex:1 1 100px;min-width:0;font:var(--dsw-font-xxxs-11)}
.dsh-personal-clock-time{display:block;min-width:0;max-width:100%;font-family:var(--dsw-font-family);font-size:clamp(36px,16cqi,64px);font-weight:600;line-height:1;letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-personal-clock-time [data-part="literal"]{letter-spacing:-.08em}
.dsh-personal-clock-time [data-part="dayPeriod"]{font-size:.26em;font-weight:500;letter-spacing:0}
.dsh-personal-clock[data-hour12="true"] .dsh-personal-clock-time{font-size:clamp(30px,15cqi,64px)}
.dsh-personal-clock-date{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:0 0 58px;min-height:66px;max-width:76px;margin:0;padding:8px 5px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.dsh-personal-clock-day{font-family:var(--dsw-font-family);font-size:28px;font-weight:600;line-height:1;letter-spacing:-.04em}
.dsh-personal-clock-full-date{margin:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-personal-clock-month{max-width:100%;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);text-align:center;overflow-wrap:anywhere}
@container widget (max-width:260px){
  .dsh-personal-clock-display{gap:8px}
  .dsh-personal-clock-time{font-size:clamp(30px,17cqi,44px)}
  .dsh-personal-clock[data-hour12="true"] .dsh-personal-clock-time{font-size:clamp(26px,14cqi,36px)}
  .dsh-personal-clock-date{flex-basis:48px;min-height:58px;padding:6px 4px}
  .dsh-personal-clock-day{font-size:24px}
}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:is(:hover,:focus-visible){border-color:var(--dsw-alias-border-l3)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xs-13)}
`
