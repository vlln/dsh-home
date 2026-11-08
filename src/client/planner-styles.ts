/**
 * 计划 / 计时 / 用量 / 装饰类组件的样式。
 *
 * 设计约束（对齐宿主既有卡片）：
 * - 只用本项目的 token；柔和底色一律用 `color-mix(... 10–14%, transparent)` 派生，
 *   不出现大块实心填充（日历选中、勾选、打点都是「浅底 + 亮字」）。
 * - 数字用 26–32px / 600 / tabular-nums；说明文字 11px；卡片内边距 10–12px。
 * - 图表：环（conic-gradient + 内圆遮罩）、甜甜圈、圆角柱、胶囊 chip。
 */
export const plannerStyles = `
/* ---------- 共用 ---------- */
/* 颜色、字号与共用小部件（胶囊 / chip / quiet select / 悬停气泡）只在 design-system.ts
   定义；本模块只写排版与状态，不再声明第二套色板。 */
.dsh-chip b { color:inherit; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-chip-dot { width:6px; height:6px; border-radius:50%; clip-path:circle(50%); background:var(--dsh-part, currentColor); flex:none; }
.dsh-muted { color:var(--color-text-tertiary); font-size:11px; }
.dsh-muted b { color:var(--color-text-secondary); font-weight:600; font-variant-numeric:tabular-nums; }

/* 环：conic-gradient 画进度，内圆用底色遮出圆环。 */
.dsh-ring { --ring-size:132px; position:relative; width:var(--ring-size); height:var(--ring-size); flex:none; display:grid; place-items:center; }
.dsh-ring-svg { position:absolute; inset:0; width:100%; height:100%; }
.dsh-ring-track { fill:none; stroke:color-mix(in srgb, var(--color-chart-4) 12%, transparent); stroke-width:14; }
.dsh-ring-progress { fill:none; stroke:var(--color-chart-4); stroke-width:14; stroke-linecap:round; transition:stroke-dasharray .4s ease; }
/* 休息阶段用成功绿：它表示「这一轮完成了，现在休息」，不是一个新色相。 */
.dsh-pomodoro[data-phase="break"] .dsh-ring-track { stroke:color-mix(in srgb, var(--color-status-lime-text) 12%, transparent); }
.dsh-pomodoro[data-phase="break"] .dsh-ring-progress { stroke:var(--color-status-lime-text); }
.dsh-ring-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
.dsh-ring-value { color:var(--color-text-primary); font-size:22px; font-weight:600; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.dsh-ring-caption { color:var(--color-text-tertiary); font-size:10px; }
.dsh-ring[data-running="true"] .dsh-ring-value { color:var(--color-chart-4); }

/* ---------- 待办 ---------- */
.dsh-todo { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-todo-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:10px; padding-inline-end:2px; scrollbar-width:thin; }
.dsh-todo-group { display:flex; flex-direction:column; gap:2px; }
.dsh-todo-heading { display:flex; align-items:center; gap:6px; margin:0; padding:0 2px; color:var(--color-text-tertiary); font-size:10px; line-height:14px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
.dsh-todo-count { color:var(--color-text-tertiary); font-variant-numeric:tabular-nums; font-weight:500; letter-spacing:0; }
.dsh-todo-list { display:flex; flex-direction:column; gap:1px; margin:0; padding:0; list-style:none; }
.dsh-todo-item { display:flex; align-items:flex-start; gap:8px; padding:3px 6px; border-radius:8px; }
.dsh-todo-item:hover { background:var(--dsh-sunken); }
.dsh-todo-check { flex:none; width:17px; height:17px; margin-top:2px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:1.5px solid var(--color-border-button-hover); border-radius:5px; background:var(--dsh-card); color:var(--color-text-white); cursor:pointer; transition:background .12s ease, border-color .12s ease; }
.dsh-todo-check:hover { border-color:var(--color-chart-4); }
.dsh-todo-check[aria-checked="true"] { border-color:var(--color-chart-4); background:var(--color-chart-4); }
.dsh-todo-check:disabled { cursor:default; opacity:.55; }
.dsh-todo-tick { width:7px; height:4px; border-left:1.6px solid currentColor; border-bottom:1.6px solid currentColor; transform:rotate(-45deg) translateY(-1px); opacity:0; }
.dsh-todo-check[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-todo-main { flex:1 1 auto; min-width:0; display:flex; align-items:baseline; gap:8px; padding:0; border:0; background:transparent; text-align:start; cursor:pointer; color:var(--color-text-primary); font-size:13px; line-height:20px; }
.dsh-todo-main:disabled { cursor:default; }
.dsh-todo-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-todo-item[data-done="true"] .dsh-todo-title { color:var(--color-text-tertiary); text-decoration:line-through; }
.dsh-todo-meta { flex:none; display:inline-flex; align-items:baseline; gap:6px; font-size:11px; line-height:16px; color:var(--color-text-tertiary); font-variant-numeric:tabular-nums; }
.dsh-todo-day { color:var(--color-text-tertiary); }
.dsh-todo-empty { margin:4px 2px; color:var(--color-text-tertiary); font-size:12px; line-height:18px; }
.dsh-todo-add { flex:none; display:flex; align-items:center; gap:6px; padding-top:6px; border-top:0; }
.dsh-todo-add input { flex:1 1 auto; min-width:0; height:30px; padding:0 11px; border:1.5px solid transparent; border-radius:9px; background:var(--dsh-sunken); color:var(--color-text-primary); font-size:12px; }
.dsh-todo-add input::placeholder { color:var(--color-text-tertiary); }
.dsh-todo-add input:focus { outline:none; border-color:var(--color-chart-4); background:var(--dsh-card); }
.dsh-todo-add-button { flex:none; width:30px; height:30px; padding:0; border:0; border-radius:9px; background:var(--color-accent-500); color:var(--color-text-white); font-size:16px; line-height:1; cursor:pointer; }
.dsh-todo-add-button:hover:not(:disabled) { background:var(--color-accent-400); }
.dsh-todo-add-button:disabled { opacity:.45; cursor:default; }

/* ---------- 今日计划 ---------- */
.dsh-plan, .dsh-calendar, .dsh-habit { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-plan-scroll, .dsh-habit-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:10px; scrollbar-width:thin; }
.dsh-plan-list { display:flex; flex-direction:column; gap:2px; margin:0; padding:0; list-style:none; }
.dsh-plan-block { display:flex; align-items:flex-start; gap:10px; padding:2px 0; }
.dsh-plan-time { flex:0 0 78px; padding-top:3px; color:var(--color-text-tertiary); font-size:11px; line-height:18px; font-variant-numeric:tabular-nums; }
.dsh-plan-block .dsh-todo-list { flex:1 1 auto; min-width:0; }
.dsh-plan-block[data-done="true"] .dsh-plan-time { color:var(--color-text-tertiary); }
.dsh-plan-rule { display:none; }
.dsh-plan-now { display:flex; align-items:center; gap:10px; padding:2px 0; }
.dsh-plan-now-time { flex:0 0 78px; color:var(--color-chart-4); font-size:11px; line-height:14px; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-plan-now-rule { flex:1 1 auto; height:2px; border-radius:1px; background:var(--color-chart-4); }
.dsh-plan-now-rule::before { content:''; display:block; width:7px; height:7px; margin-top:-2.5px; clip-path:circle(50%); border-radius:50%; background:var(--color-chart-4); }
.dsh-plan-hint { margin:0 2px; color:var(--color-text-tertiary); font-size:12px; line-height:18px; }
.dsh-plan-add { flex:none; align-self:flex-start; display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border:0; border-radius:999px; background:var(--dsh-hover); color:var(--color-text-secondary); font-size:11px; line-height:18px; font-weight:600; cursor:pointer; }
.dsh-plan-add:hover { background:color-mix(in srgb, var(--color-chart-4) 12%, transparent); color:var(--color-chart-4); }

/* ---------- 日程 ---------- */
.dsh-calendar-head { flex:none; display:flex; align-items:center; gap:6px; }
.dsh-calendar-title { flex:1 1 auto; min-width:0; color:var(--color-text-primary); font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-calendar-nav { flex:none; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--color-text-tertiary); font-size:15px; line-height:1; cursor:pointer; }
.dsh-calendar-nav:hover { background:var(--dsh-sunken); color:var(--color-text-primary); }
.dsh-calendar-today { flex:none; padding:3px 10px; border:0; border-radius:999px; background:var(--dsh-hover); color:var(--color-text-secondary); font-size:11px; line-height:16px; font-weight:600; cursor:pointer; }
.dsh-calendar-today:hover { background:color-mix(in srgb, var(--color-chart-4) 12%, transparent); color:var(--color-chart-4); }
.dsh-calendar-weekdays { flex:none; display:grid; grid-template-columns:repeat(7,1fr); gap:2px; color:var(--color-text-tertiary); font-size:10px; line-height:14px; text-align:center; }
.dsh-calendar-grid { flex:none; display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); gap:2px; }
.dsh-calendar-cell { position:relative; display:flex; align-items:center; justify-content:center; min-height:28px; padding:0; border:0; border-radius:8px; background:transparent; color:var(--color-text-secondary); font-size:11px; font-variant-numeric:tabular-nums; cursor:pointer; transition:background .12s ease, color .12s ease; }
.dsh-calendar-date { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; clip-path:circle(50%); }
.dsh-calendar-cell:hover .dsh-calendar-date { background:var(--dsh-hover); }
.dsh-calendar-cell[data-outside="true"] { color:var(--color-text-tertiary); }
.dsh-calendar-cell[data-today="true"] { color:var(--color-chart-4); font-weight:700; }
.dsh-calendar-cell[data-today="true"] .dsh-calendar-date { background:color-mix(in srgb, var(--color-chart-4) 12%, transparent); }
.dsh-calendar-cell[data-selected="true"] { color:var(--color-text-white); font-weight:700; }
.dsh-calendar-cell[data-selected="true"] .dsh-calendar-date { background:var(--color-chart-4); }
.dsh-calendar-dot { position:absolute; bottom:2px; left:50%; width:4px; height:4px; clip-path:circle(50%); margin-left:-2px; border-radius:50%; background:var(--color-chart-4); }
.dsh-calendar-cell[data-selected="true"] .dsh-calendar-dot { display:none; }
.dsh-calendar-day { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:2px; padding-top:6px; border-top:0; }
.dsh-calendar-day-head { flex:none; display:flex; align-items:baseline; gap:6px; color:var(--color-text-tertiary); font-size:11px; line-height:16px; }
.dsh-calendar-list { flex:1 1 auto; min-height:0; overflow:auto; scrollbar-width:thin; }

/* ---------- 打卡 ---------- */
.dsh-habit-list { display:flex; flex-direction:column; gap:2px; margin:0; padding:0; list-style:none; }
.dsh-habit-row { display:flex; align-items:center; gap:10px; padding:5px 6px; border-radius:10px; }
.dsh-habit-row:hover { background:var(--dsh-sunken); }
.dsh-habit-row[data-due="false"] { opacity:.55; }
.dsh-habit-mark { flex:none; width:24px; height:24px; clip-path:circle(50%); padding:0; display:inline-flex; align-items:center; justify-content:center; border:2px solid var(--color-border-button-hover); border-radius:50%; background:var(--dsh-card); color:var(--color-text-white); cursor:pointer; transition:background .12s ease, border-color .12s ease; }
.dsh-habit-mark:hover { border-color:color-mix(in srgb, var(--color-status-lime-text) 55%, transparent); }
.dsh-habit-mark[aria-checked="true"] { border-color:var(--color-status-lime-text); background:var(--color-status-lime-text); }
.dsh-habit-box .dsh-todo-tick { opacity:0; }
[aria-checked="true"] .dsh-habit-box { background:var(--color-chart-4); border-color:var(--color-chart-4); color:var(--color-text-white); }
[aria-checked="true"] .dsh-habit-box .dsh-todo-tick { opacity:1; }
.dsh-habit-mark[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-habit-text { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
.dsh-habit-title { color:var(--color-text-primary); font-size:13px; line-height:18px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-row[data-marked="true"] .dsh-habit-title { color:var(--color-text-tertiary); }
.dsh-habit-meta { color:var(--color-text-tertiary); font-size:10px; line-height:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-streak { flex:none; padding:1px 8px; border-radius:999px; background:var(--dsh-active); color:var(--color-text-secondary); font-size:10px; line-height:16px; font-variant-numeric:tabular-nums; }
.dsh-habit-streak[data-zero="true"] { background:transparent; color:var(--color-text-tertiary); }
.dsh-habit-streak[data-zero="false"] { background:color-mix(in srgb, var(--color-status-lime-text) 12%, transparent); color:var(--color-status-lime-text); }
.dsh-habit-delete { flex:none; width:18px; height:18px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--color-text-tertiary); font-size:14px; line-height:1; cursor:pointer; opacity:0; }
.dsh-habit-row:hover .dsh-habit-delete, .dsh-habit-delete:focus-visible { opacity:1; }
.dsh-habit-delete:hover { color:var(--color-text-error-primary); }

/* ---------- 计时器 ---------- */
.dsh-timer-wrap, .dsh-countdown-wrap, .dsh-picture-wrap, .dsh-quote-wrap { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-timer { position:relative; flex:1 1 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:100%; min-height:0; }
/* 右侧快捷键：点一下就是 5 / 10 / 15 / 25 / 45 / 60 分钟。 */
.dsh-timer-presets { position:absolute; right:0; top:50%; transform:translateY(-50%); display:grid; grid-template-columns:repeat(2,auto); gap:3px; }
.dsh-timer-preset { min-width:32px; height:20px; padding:0 6px; border:0; border-radius:999px; background:var(--dsh-hover); color:var(--color-text-secondary); font:inherit; font-size:10px; font-weight:600; line-height:20px; cursor:pointer; font-variant-numeric:tabular-nums; }
.dsh-timer-preset:hover:not(:disabled) { background:var(--dsh-active); color:var(--color-text-primary); }
.dsh-timer-preset:disabled { opacity:.4; cursor:default; }
.dsh-timer-preset[data-active="true"] { background:var(--color-text-primary); color:var(--color-text-white); }
/* 圆盘就是设置器：拖动圆环设定时长，中间是倒计时数字。 */
.dsh-timer-dial { position:relative; flex:none; height:min(120px, calc(100% - 40px)); aspect-ratio:1; max-width:100%; border-radius:50%; touch-action:none; user-select:none; }
.dsh-timer-dial[data-draggable="true"] { cursor:grab; }
.dsh-timer-dial[data-draggable="true"]:active { cursor:grabbing; }
.dsh-timer-dial:focus-visible { outline:var(--dsh-focus-ring-width,2px) solid var(--dsh-focus-ring-color,var(--color-chart-4)); outline-offset:3px; }
.dsh-timer-dial svg { display:block; width:100%; height:100%; overflow:visible; }
.dsh-dial-track { fill:none; stroke:var(--dsh-sunken); stroke-width:7; }
.dsh-dial-arc { fill:none; stroke:var(--color-chart-4); stroke-width:7; stroke-linecap:round; transition:stroke-dasharray 220ms linear; }
.dsh-timer[data-reached="true"] .dsh-dial-arc { stroke:var(--color-status-yellow-text); }
.dsh-dial-handle { fill:var(--color-text-white); stroke:var(--color-chart-4); stroke-width:2.4; }
.dsh-timer[data-reached="true"] .dsh-dial-handle { stroke:var(--color-status-yellow-text); }
.dsh-timer-face { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; pointer-events:none; }
.dsh-dial-value { color:var(--color-text-primary); font-family:var(--font-sans); font-size:22px; font-weight:650; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.dsh-dial-note { color:var(--color-status-yellow-text); font-size:10px; line-height:12px; font-weight:600; }
.dsh-timer-alert { position:absolute; left:0; top:0; padding:1px 6px; border-radius:var(--dsh-radius-xs); background:color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color:var(--color-status-yellow-text); font-size:10px; line-height:16px; font-weight:600; cursor:help; }
.dsh-timer-actions { display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; flex:none; }
.dsh-timer-button { padding:4px 12px; border:0; border-radius:999px; background:var(--dsh-hover); color:var(--color-text-secondary); font-size:11px; line-height:18px; font-weight:600; cursor:pointer; }
.dsh-timer-button:hover:not(:disabled) { background:var(--dsh-active); color:var(--color-text-primary); }
.dsh-timer-button:disabled { opacity:.45; cursor:default; }
.dsh-timer-primary { background:var(--color-accent-500); color:var(--color-text-white); }
.dsh-timer-primary:hover:not(:disabled) { background:var(--color-accent-400); color:var(--color-text-white); }


/* ---------- 番茄钟 ---------- */
.dsh-pomodoro { display:flex; flex-direction:column; align-items:center; gap:10px; height:100%; min-height:0; padding-top:2px; }
.dsh-pomodoro-head { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dsh-pomodoro-rounds { color:var(--color-text-tertiary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-pomodoro .dsh-timer-actions { justify-content:center; }

/* ---------- 倒计时 ---------- */
.dsh-countdown { display:flex; flex-direction:column; gap:6px; flex:1 1 auto; min-height:0; justify-content:center; }
.dsh-countdown-title { color:var(--color-text-secondary); font-size:12px; line-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-countdown-clock { display:flex; align-items:baseline; gap:6px; color:var(--color-text-primary); font-variant-numeric:tabular-nums; }
.dsh-countdown-days { letter-spacing:-.02em; }
.dsh-countdown-unit { color:var(--color-text-tertiary); font-size:11px; }
.dsh-countdown-rest { color:var(--color-text-tertiary); font-size:13px; font-variant-numeric:tabular-nums; }
.dsh-countdown-date { color:var(--color-text-tertiary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-countdown-expired { color:var(--color-status-yellow-text); font-size:22px; font-weight:600; }
.dsh-countdown-hint { color:var(--color-text-tertiary); font-size:11px; }
.dsh-countdown-row { display:flex; align-items:flex-end; gap:6px; }
.dsh-countdown-row .dsh-item-field:first-child { flex:1 1 auto; }
.dsh-countdown-row .dsh-item-field:nth-child(2) { flex:0 0 130px; }

/* ---------- Token 用量 ---------- */
.dsh-usage { display:flex; flex-direction:column; gap:8px; height:100%; min-height:0; overflow:hidden; }
.dsh-usage-hero { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.dsh-usage-figure { display:flex; flex-direction:column; gap:0; min-width:0; }
.dsh-usage-total { color:var(--color-text-primary); }
.dsh-usage-unit { color:var(--color-text-tertiary); font-size:11px; }
/* 圆盘跟着卡片走：宽卡里放大到 84px，数字与百分比才读得出来。 */
.dsh-usage-donut { position:relative; width:76px; aspect-ratio:1; border-radius:50%; clip-path:circle(50%); flex:none; }
.dsh-usage-donut-hole { position:absolute; inset:20%; border-radius:50%; clip-path:circle(50%); background:var(--dsh-card); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; }
.dsh-usage-donut-hole b { color:var(--color-text-primary); font-size:14px; line-height:1.15; font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-usage-donut-hole i { color:var(--color-text-tertiary); font-size:9px; line-height:1.2; letter-spacing:.02em; font-style:normal; }
.dsh-usage-chips { display:flex; flex-wrap:wrap; gap:6px; }
/* 柱子填满剩余高度、按列宽取 64%：宽卡里不再是一排小方块夹着大缝。 */
.dsh-usage-bars { display:flex; align-items:flex-end; gap:clamp(4px, 1.2cqi, 10px); flex:1 1 auto; min-height:0; max-height:180px; }
.dsh-usage-col { flex:1 1 0; display:flex; align-items:flex-end; justify-content:center; height:100%; min-width:0; }
.dsh-usage-bar { width:64%; max-width:none; min-height:3px; border-radius:5px 5px 2px 2px; background:var(--color-chart-4); }
.dsh-usage-foot { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.dsh-usage[data-compact="true"] { gap:6px; }
.dsh-usage[data-compact="true"] .dsh-usage-total { font-size:24px; }
.dsh-usage[data-compact="true"] .dsh-usage-donut { width:clamp(52px, 9cqi, 64px); }
.dsh-usage[data-compact="true"] .dsh-usage-donut-hole { inset:20%; }
.dsh-usage[data-compact="true"] .dsh-usage-donut-hole b { font-size:clamp(10px, 3cqi, 12px); }
.dsh-usage[data-compact="true"] .dsh-usage-donut-hole i { font-size:8px; }
.dsh-usage[data-compact="true"] .dsh-usage-chips { gap:4px; }
/* 图表行可以缩到很矮，但页脚（速率与周总量）永远留在卡片里。 */
.dsh-usage-foot { flex:none; }

/* ---------- 余额 ---------- */
.dsh-balance { display:flex; flex-direction:column; gap:4px; height:100%; min-height:0; }
.dsh-balance-label { color:var(--color-text-tertiary); font-size:11px; line-height:16px; }
.dsh-balance-amount { color:var(--color-text-primary); }
.dsh-balance-amount[data-unknown="true"] { color:var(--color-text-tertiary); }
.dsh-balance-reason { color:var(--color-text-tertiary); font-size:12px; line-height:18px; }
.dsh-balance-detail { display:flex; gap:12px; color:var(--color-text-tertiary); font-size:10px; font-variant-numeric:tabular-nums; }
.dsh-balance .dsh-timer-button { margin-top:auto; align-self:flex-start; }

/* ---------- 图片 / 一句话 ---------- */
.dsh-picture { position:relative; flex:1 1 auto; min-height:0; margin:0; border-radius:12px; overflow:hidden; background:var(--dsh-sunken); }
.dsh-picture img { width:100%; height:100%; display:block; }
.dsh-picture-caption { position:absolute; inset-inline:0; bottom:0; padding:6px 10px; color:var(--color-text-white); font-size:11px; line-height:16px; font-weight:600; background:color-mix(in srgb, var(--color-neutral-950) 55%, transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-picture-empty { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; border:.5px dashed var(--dsh-hairline); border-radius:12px; color:var(--color-text-tertiary); font-size:11px; text-align:center; padding:10px; }
.dsh-picture-empty-glyph { color:var(--color-text-tertiary); font-size:22px; line-height:1; }
.dsh-picture-path { max-width:100%; color:var(--color-text-tertiary); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
.dsh-quote { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:6px; justify-content:center; padding:2px 4px; }
.dsh-quote-mark { color:var(--color-chart-4); font-size:34px; line-height:.8; font-weight:600; }
.dsh-quote-text { margin:0; color:var(--color-text-primary); font-size:13px; line-height:1.6; overflow:auto; scrollbar-width:thin; }
.dsh-quote-hint { color:var(--color-text-tertiary); font-size:10px; }

/* ---------- 共用表单 ---------- */
.dsh-planner-loading, .dsh-planner-fallback { margin:0; color:var(--color-text-tertiary); font-size:12px; line-height:18px; }
.dsh-planner-fallback { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
.dsh-planner-detail { margin:0; color:var(--color-text-tertiary); font-size:11px; }
.dsh-planner-retry { padding:3px 10px; border:.5px solid var(--color-border-button-default); border-radius:999px; background:transparent; color:var(--color-text-secondary); font-size:11px; cursor:pointer; }
.dsh-item-editor { display:flex; flex-direction:column; gap:6px; width:100%; padding:8px; border:0; border-radius:12px; background:var(--dsh-sunken); }
.dsh-item-field { display:flex; flex-direction:column; gap:2px; min-width:0; }
.dsh-item-label { color:var(--color-text-tertiary); font-size:10px; line-height:14px; }
.dsh-item-field input, .dsh-item-field textarea, .dsh-item-field select { width:100%; min-width:0; padding:4px 8px; border:1.5px solid var(--dsh-hairline); border-radius:8px; background:var(--dsh-card); color:var(--color-text-primary); font-size:12px; line-height:18px; font-family:var(--font-sans); }
.dsh-item-field input:focus, .dsh-item-field textarea:focus, .dsh-item-field select:focus { outline:none; border-color:var(--color-chart-4); }
.dsh-item-field textarea { resize:vertical; min-height:36px; }
.dsh-item-row { display:flex; gap:6px; }
.dsh-item-row .dsh-item-field { flex:1 1 0; }
.dsh-item-actions { display:flex; align-items:center; gap:6px; }
.dsh-item-hint { flex:1 1 auto; min-width:0; color:var(--color-status-yellow-text); font-size:11px; line-height:16px; }
.dsh-item-button { padding:4px 12px; border:0; border-radius:8px; background:var(--dsh-hover); color:var(--color-text-secondary); font-size:12px; font-weight:600; cursor:pointer; }
.dsh-item-button:hover { background:var(--dsh-active); }
.dsh-item-save { background:var(--color-accent-500); color:var(--color-text-white); }
.dsh-item-save:hover { background:var(--color-accent-400); }
.dsh-item-save:disabled { opacity:.45; cursor:default; }
.dsh-item-delete { margin-inline-end:auto; color:var(--color-text-error-primary); border-color:transparent; background:transparent; }

/* 优先级：重要=琥珀，紧急=红，普通不显示。 */
.dsh-priority { flex:none; width:6px; height:6px; margin-top:7px; clip-path:circle(50%); border-radius:50%; background:var(--color-status-yellow-text); }
.dsh-priority[data-priority="2"] { background:var(--color-text-error-primary); }
.dsh-item-priority { display:flex; gap:4px; }
.dsh-item-priority-pill { padding:2px 9px; border:0; border-radius:999px; background:var(--dsh-hover); color:var(--color-text-tertiary); font-size:11px; line-height:16px; cursor:pointer; }
.dsh-item-priority-pill[data-level="1"][aria-pressed="true"] { background:color-mix(in srgb, var(--color-status-yellow-text) 12%, transparent); color:var(--color-status-yellow-text); }
.dsh-item-priority-pill[data-level="2"][aria-pressed="true"] { background:color-mix(in srgb, var(--color-text-error-primary) 12%, transparent); color:var(--color-text-error-primary); }
.dsh-item-priority-pill[data-level="0"][aria-pressed="true"] { background:color-mix(in srgb, var(--color-chart-4) 12%, transparent); color:var(--color-chart-4); }

/* 日历圆点：当天未完成越多，同一色相的档位越深。 */
.dsh-calendar-dot { background:var(--color-chart-4); }
.dsh-calendar-dot[data-density="2"] { background:color-mix(in srgb, var(--color-chart-4) 72%, var(--color-background-primary-default)); }
.dsh-calendar-dot[data-density="3"] { background:var(--color-chart-4); }

/* 会话状态：三个视图共用同一种胶囊；选中态是墨色，状态含义由文字承担。 */
.dsh-session-status { display:flex; flex-direction:column; gap:8px; min-height:0; min-width:0; }
.dsh-status-filter { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.dsh-status-rows { margin:0; }
.dsh-status-empty { margin:0; }

`
