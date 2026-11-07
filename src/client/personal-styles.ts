/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
export const personalStyles = `
.dsh-personal-clock{min-width:0;max-width:100%;color:var(--dsw-alias-label-primary)}
/* 便笺：直接写在卡片上。首行是标题（加粗），其余是正文；没有弹窗、没有引号装饰。 */
.dsh-note{display:flex;flex-direction:column;gap:6px;min-width:0;min-height:100%;color:var(--dsw-alias-label-primary)}
.dsh-note[data-editable="true"]{cursor:text}
.dsh-note[data-editable="true"]:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:var(--dsw-radius-sm)}
.dsh-note-title{margin:0;font:var(--dsw-font-s-strong-14);font-weight:600;font-size:15px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.dsh-note-title[data-placeholder="true"]{font-weight:400;color:var(--dsw-alias-label-tertiary)}
.dsh-note-body{margin:0;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;color:var(--dsw-alias-label-secondary)}
.dsh-note[data-editing="true"]{height:100%}
.dsh-note-input{flex:1 1 auto;box-sizing:border-box;width:100%;min-height:100%;margin:0;padding:0;border:0;outline:none;resize:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-note-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-note-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12)}
.dsh-personal-label{margin:0;font:var(--dsw-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-hint{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere}
/* 时钟：大号时间 + 日期牌 + 一行时区选择。没有标题、没有整行日期、没有设置弹窗，
   4×4 的卡片里也不再需要滚动。 */
.dsh-personal-clock{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:8px;height:100%;min-height:0;color:var(--dsw-alias-label-primary)}
.dsh-personal-clock-display{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dsh-personal-clock-time{display:block;min-width:0;max-width:100%;font-family:var(--dsw-font-family);font-size:clamp(34px,16cqi,58px);font-weight:600;line-height:1;letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-personal-clock-time [data-part="literal"]{letter-spacing:-.08em}
.dsh-personal-clock-time [data-part="dayPeriod"]{font-size:.26em;font-weight:500;letter-spacing:0}
.dsh-personal-clock-date{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:0 0 52px;min-height:58px;max-width:70px;margin:0;padding:6px 4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.dsh-personal-clock-day{font-family:var(--dsw-font-family);font-size:24px;font-weight:600;line-height:1;letter-spacing:-.04em}
.dsh-personal-clock-month{max-width:100%;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);text-align:center;overflow-wrap:anywhere}
.dsh-personal-clock-zone{display:flex;min-width:0}
.dsh-clock-zone{box-sizing:border-box;max-width:100%;height:24px;padding:0 20px 0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-skeleton);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family);font-size:11px;line-height:22px;cursor:pointer;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--dsw-alias-label-tertiary) 50%),linear-gradient(135deg,var(--dsw-alias-label-tertiary) 50%,transparent 50%);background-position:calc(100% - 12px) 10px,calc(100% - 8px) 10px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}
.dsh-clock-zone:is(:hover,:focus-visible){border-color:var(--dsw-alias-border-l4);color:var(--dsw-alias-label-primary)}
.dsh-clock-zone:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dsh-clock-zone:disabled{opacity:.75;cursor:default}
@container widget (max-width:260px){
  .dsh-personal-clock-display{gap:8px}
  .dsh-personal-clock-time{font-size:clamp(28px,17cqi,44px)}
  .dsh-personal-clock-date{flex-basis:44px;min-height:52px;padding:5px 3px}
  .dsh-personal-clock-day{font-size:21px}
}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:is(:hover,:focus-visible){border-color:var(--dsw-alias-border-l3)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.dsh-personal-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xs-13)}
`
