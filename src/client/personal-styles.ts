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
/* 时钟：大号时间 + 日期牌 + 一行时区选择。没有标题、没有整行日期、没有设置弹窗，
   4×4 的卡片里也不再需要滚动。 */
.dsh-personal-clock{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:8px;height:100%;min-height:0;color:var(--color-text-primary)}
.dsh-personal-clock-display{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dsh-personal-clock-time{display:block;min-width:0;max-width:100%;font-family:var(--font-sans);font-size:clamp(34px,16cqi,58px);font-weight:600;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums;white-space:nowrap}
/* 数字本身就是按钮：点一下切 12/24。没有底色、没有边框，只有悬停时浮出的一层表面，
   和时区那行同一套语言；负边距让表面比字宽一圈，字仍然贴着卡片的左边。 */
button.dsh-personal-clock-time{display:block;margin:-4px -8px;padding:4px 8px;border:0;border-radius:var(--dsh-radius-lg);background:transparent;color:inherit;text-align:left;cursor:pointer;transition:background-color .14s}
button.dsh-personal-clock-time:hover{background:var(--dsh-hover)}
button.dsh-personal-clock-time:active{background:var(--dsh-active)}
button.dsh-personal-clock-time:focus-visible{outline:var(--dsh-focus-ring-width,2px) solid var(--dsh-focus-ring-color,var(--color-chart-4));outline-offset:1px}
.dsh-personal-clock-time [data-part="literal"]{letter-spacing:-.08em}
/* 12h 的上下午当单位使：小一号、次级墨、跟在时间后面（顺序由 clockFaceParts 定）。 */
.dsh-personal-clock-time [data-part="dayPeriod"]{margin-inline-start:.14em;font-size:.34em;font-weight:500;letter-spacing:0;color:var(--color-text-tertiary)}
.dsh-personal-clock-date{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:0 0 52px;min-height:58px;max-width:70px;margin:0;padding:6px 4px;border:.5px solid var(--dsh-hairline);border-radius:var(--dsh-radius-lg);background:var(--dsh-card);color:var(--color-text-primary);font-variant-numeric:tabular-nums}
.dsh-personal-clock-day{font-family:var(--font-sans);font-size:24px;font-weight:600;line-height:1;letter-spacing:-.04em}
.dsh-personal-clock-month{max-width:100%;font:var(--dsh-font-xxxs-11);color:var(--color-text-secondary);text-align:center;overflow-wrap:anywhere}
/* 时区：一行不起眼的小字，上面压着一个透明的原生下拉——列表、键盘、读屏都还是原生的，
   但宽度由我们（选中的那一项）决定，箭头不会甩到一百像素以外。 */
.dsh-personal-clock-zone{position:relative;display:inline-flex;align-items:center;align-self:flex-start;max-width:100%;color:var(--color-text-secondary);font:var(--dsh-font-xxs-strong-12)}
.dsh-clock-zone-label{display:inline-flex;align-items:center;gap:4px;min-width:0;padding:2px 6px;margin-left:-6px;border-radius:var(--dsh-radius-sm);white-space:nowrap}
.dsh-personal-clock-zone:not([data-static="true"]):hover .dsh-clock-zone-label{background:var(--dsh-hover);color:var(--color-text-primary)}
.dsh-clock-zone-caret{flex:none;font-size:9px;line-height:1;opacity:.75}
.dsh-clock-zone{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;background:transparent;opacity:0;cursor:pointer;font:inherit;appearance:none}
.dsh-clock-zone:disabled{cursor:default}
.dsh-personal-clock-zone:has(.dsh-clock-zone:focus-visible){outline:var(--dsh-focus-ring-width,2px) solid var(--dsh-focus-ring-color,var(--color-chart-4));outline-offset:2px;border-radius:var(--dsh-radius-xs)}
@container widget (max-width:260px){
  .dsh-personal-clock-display{gap:8px}
  .dsh-personal-clock-time{font-size:clamp(28px,17cqi,44px)}
  .dsh-personal-clock-date{flex-basis:44px;min-height:52px;padding:5px 3px}
  .dsh-personal-clock-day{font-size:21px}
}
.dsh-personal-settings{display:flex;flex-direction:column;gap:8px;min-width:0}
`
