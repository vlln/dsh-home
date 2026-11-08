/** Append to the host's injected stylesheet; personal widgets never install global CSS effects. */
export const personalStyles = `
.dsh-personal-clock{min-width:0;max-width:100%;color:var(--color-text-primary)}
/* 便笺：直接写在卡片上。首行是标题（加粗），其余是正文；没有弹窗、没有引号装饰。 */
.dsh-note{display:flex;flex-direction:column;gap:6px;min-width:0;min-height:100%;color:var(--color-text-primary)}
.dsh-note[data-editable="true"]{cursor:text}
.dsh-note[data-editable="true"]:focus-visible{outline:var(--dsh-focus-ring-width,2px) solid var(--dsh-focus-ring-color,var(--color-chart-4));outline-offset:2px;border-radius:var(--dsh-radius-sm)}
.dsh-note-title{margin:0;font:var(--dsh-font-s-strong-14);font-weight:600;font-size:15px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--color-text-primary)}
.dsh-note-title[data-placeholder="true"]{font-weight:400;color:var(--color-text-tertiary)}
.dsh-note-body{margin:0;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;color:var(--color-text-secondary)}
.dsh-note[data-editing="true"]{height:100%}
.dsh-note-input{flex:1 1 auto;box-sizing:border-box;width:100%;min-height:100%;margin:0;padding:0;border:0;outline:none;resize:none;background:transparent;color:var(--color-text-primary);font:inherit;font-size:var(--dsh-content-font-size,13px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4}
.dsh-note-input::placeholder{color:var(--color-text-tertiary)}
.dsh-note-error{margin:0;color:var(--color-text-error-primary);font:var(--dsh-font-xxs-12)}
.dsh-personal-label{margin:0;font:var(--dsh-font-s-strong-14);white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-personal-hint{margin:0;color:var(--color-text-tertiary);font:var(--dsh-font-xs-13);overflow-wrap:anywhere}
/* 时钟：大号时间 + 日期牌 + 一行时区选择。没有标题、没有整行日期、没有设置弹窗，
   4×4 的卡片里也不再需要滚动。 */
.dsh-personal-clock{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:8px;height:100%;min-height:0;color:var(--color-text-primary)}
.dsh-personal-clock-display{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dsh-personal-clock-time{display:block;min-width:0;max-width:100%;font-family:var(--font-sans);font-size:clamp(34px,16cqi,58px);font-weight:600;line-height:1;letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-personal-clock-time [data-part="literal"]{letter-spacing:-.08em}
.dsh-personal-clock-time [data-part="dayPeriod"]{font-size:.26em;font-weight:500;letter-spacing:0}
.dsh-personal-clock-date{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:0 0 52px;min-height:58px;max-width:70px;margin:0;padding:6px 4px;border:.5px solid var(--dsh-hairline);border-radius:var(--dsh-radius-lg);background:var(--dsh-card);color:var(--color-text-primary);font-variant-numeric:tabular-nums}
.dsh-personal-clock-day{font-family:var(--font-sans);font-size:24px;font-weight:600;line-height:1;letter-spacing:-.04em}
.dsh-personal-clock-month{max-width:100%;font:var(--dsh-font-xxxs-11);color:var(--color-text-secondary);text-align:center;overflow-wrap:anywhere}
.dsh-personal-clock-zone{display:flex;min-width:0}
@container widget (max-width:260px){
  .dsh-personal-clock-display{gap:8px}
  .dsh-personal-clock-time{font-size:clamp(28px,17cqi,44px)}
  .dsh-personal-clock-date{flex-basis:44px;min-height:52px;padding:5px 3px}
  .dsh-personal-clock-day{font-size:21px}
}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-personal-field{display:flex;flex-direction:column;gap:6px;font:var(--dsh-font-xs-13);color:var(--color-text-primary)}
.dsh-personal-textarea{box-sizing:border-box;width:100%;min-height:120px;padding:8px 12px;resize:vertical;border:.5px solid var(--color-border-button-hover);border-radius:var(--dsh-radius-md);background:var(--dsh-sunken);color:var(--color-text-primary);font-family:var(--font-sans);font-size:var(--dsh-content-font-size);line-height:1.6}
.dsh-personal-textarea:is(:hover,:focus-visible){border-color:var(--color-border-button-default)}
.dsh-personal-textarea:focus-visible{outline:2px solid var(--color-chart-4);outline-offset:2px}
.dsh-personal-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;font:var(--dsh-font-xs-13);color:var(--color-text-primary)}
.dsh-personal-error{margin:0;color:var(--color-text-error-primary);font:var(--dsh-font-xs-13)}
`
