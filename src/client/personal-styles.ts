/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
export const personalStyles = `
.dsh-personal-notes,.dsh-personal-clock{min-width:0;max-width:100%;color:var(--dsw-alias-label-primary)}
.dsh-personal-notes{display:flex;flex-direction:column;gap:12px}
.dsh-personal-label{margin:0;font:var(--dsw-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-note-text{font-size:var(--dsh-content-font-size);line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-personal-hint{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere}
.dsh-personal-clock{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.dsh-personal-clock-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;flex-wrap:wrap}
.dsh-personal-clock-meta .dsh-widget-own-editor{margin-top:0}
.dsh-personal-clock-time{font-family:var(--dsw-font-family);font-size:clamp(28px,6vw,48px);font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;max-width:100%}
.dsh-personal-clock-date{margin:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:hover{border-color:var(--dsw-alias-border-l3)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xs-13)}
`
