/**
 * 计划 / 日程 / 习惯组件的样式。只用宿主 token，配色沿用现有中性色，
 * 行高与字号对齐 `.dsh-session-row`，让首页看起来是一套东西。
 */
export const plannerStyles = `
.dsh-todo, .dsh-plan, .dsh-calendar, .dsh-habit { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-todo-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:8px; scrollbar-width:thin; }
.dsh-todo-group { display:flex; flex-direction:column; gap:2px; }
.dsh-todo-heading { display:flex; align-items:center; gap:6px; margin:0; padding:0 2px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xxs-strong-12); font-weight:600; letter-spacing:.02em; }
.dsh-todo-count { color:var(--dsw-alias-label-quaternary); font-variant-numeric:tabular-nums; font-weight:400; }
.dsh-todo-list { display:flex; flex-direction:column; gap:1px; margin:0; padding:0; list-style:none; }
.dsh-todo-item { display:flex; align-items:flex-start; gap:6px; border-radius:var(--dsw-radius-md); padding:2px 4px; }
.dsh-todo-item:hover { background:var(--dsw-alias-bg-layer-2); }
.dsh-todo-check { flex:none; width:18px; height:18px; margin-top:1px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-sm); background:transparent; color:var(--dsw-alias-label-quaternary); cursor:pointer; }
.dsh-todo-check:hover { border-color:var(--dsw-alias-border-l4); }
.dsh-todo-check[aria-checked="true"] { border-color:var(--dsw-alias-state-business-primary); background:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-label-inverse, #fff); }
.dsh-todo-check:disabled { cursor:default; opacity:.6; }
.dsh-todo-tick { width:8px; height:4px; border-left:1.5px solid currentColor; border-bottom:1.5px solid currentColor; transform:rotate(-45deg) translateY(-1px); opacity:0; }
.dsh-todo-check[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-todo-main { flex:1 1 auto; min-width:0; display:flex; align-items:baseline; gap:8px; padding:0; border:0; background:transparent; text-align:start; cursor:pointer; color:var(--dsw-alias-label-primary); font-size:13px; line-height:18px; }
.dsh-todo-main:disabled { cursor:default; }
.dsh-todo-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-todo-item[data-done="true"] .dsh-todo-title { color:var(--dsw-alias-label-tertiary); text-decoration:line-through; }
.dsh-todo-meta { flex:none; display:inline-flex; align-items:baseline; gap:6px; font-size:11px; line-height:16px; color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
.dsh-todo-day { color:var(--dsw-alias-label-quaternary); }
.dsh-todo-empty { margin:4px 2px; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-todo-add { flex:none; display:flex; align-items:center; gap:6px; padding-top:4px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-todo-add input { flex:1 1 auto; min-width:0; height:26px; padding:0 8px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-size:12px; }
.dsh-todo-add input:focus { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:-1px; }
.dsh-todo-add-button { flex:none; width:26px; height:26px; padding:0; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font-size:15px; line-height:1; cursor:pointer; }
.dsh-todo-add-button:disabled { opacity:.45; cursor:default; }
.dsh-planner-loading, .dsh-planner-fallback { margin:0; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-planner-fallback { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.dsh-planner-detail { margin:0; color:var(--dsw-alias-label-quaternary); font-size:11px; }
.dsh-planner-retry { padding:2px 8px; border:.5px solid var(--dsw-alias-border-l3); border-radius:var(--dsw-radius-md); background:transparent; color:var(--dsw-alias-label-secondary); font-size:11px; cursor:pointer; }
.dsh-item-editor { display:flex; flex-direction:column; gap:6px; width:100%; padding:6px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-2); }
.dsh-item-field { display:flex; flex-direction:column; gap:2px; min-width:0; }
.dsh-item-label { color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:14px; }
.dsh-item-field input, .dsh-item-field textarea { width:100%; min-width:0; padding:3px 6px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-sm); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-size:12px; line-height:18px; font-family:var(--dsw-font-family); }
.dsh-item-field textarea { resize:vertical; min-height:36px; }
.dsh-item-row { display:flex; gap:6px; }
.dsh-item-row .dsh-item-field { flex:1 1 0; }
.dsh-item-actions { display:flex; align-items:center; gap:6px; }
.dsh-item-hint { flex:1 1 auto; min-width:0; color:var(--dsw-alias-state-warn-primary); font-size:11px; line-height:16px; }
.dsh-item-button { padding:3px 10px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font-size:12px; cursor:pointer; }
.dsh-item-save { border-color:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-state-business-primary); }
.dsh-item-save:disabled { opacity:.45; cursor:default; }
.dsh-item-delete { margin-inline-end:auto; color:var(--dsw-alias-state-error-primary); border-color:transparent; background:transparent; }

.dsh-plan, .dsh-calendar, .dsh-habit { display:flex; flex-direction:column; height:100%; min-height:0; gap:4px; }
.dsh-plan-scroll, .dsh-habit-scroll { flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:8px; scrollbar-width:thin; }
.dsh-plan-list { display:flex; flex-direction:column; gap:0; margin:0; padding:0; list-style:none; }
.dsh-plan-block { position:relative; display:flex; align-items:flex-start; gap:8px; padding:2px 0 2px 0; }
.dsh-plan-time { flex:0 0 74px; padding-top:2px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:18px; font-variant-numeric:tabular-nums; }
.dsh-plan-block .dsh-todo-list { flex:1 1 auto; min-width:0; }
.dsh-plan-block .dsh-todo-item { padding-inline-start:2px; }
.dsh-plan-block[data-done="true"] .dsh-plan-time { color:var(--dsw-alias-label-quaternary); }
.dsh-plan-rule { display:none; }
.dsh-plan-now { display:flex; align-items:center; gap:8px; padding:2px 0; }
.dsh-plan-now-time { flex:0 0 74px; color:var(--dsw-alias-state-business-primary); font-size:11px; line-height:14px; font-variant-numeric:tabular-nums; }
.dsh-plan-now-rule { flex:1 1 auto; height:1px; background:var(--dsw-alias-state-business-primary); opacity:.5; }
.dsh-plan-hint { margin:0 2px; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-plan-add, .dsh-calendar-today { flex:none; align-self:flex-start; padding:2px 8px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:transparent; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:18px; cursor:pointer; }
.dsh-plan-add:hover, .dsh-calendar-today:hover { background:var(--dsw-alias-bg-layer-2); }
.dsh-calendar-head { flex:none; display:flex; align-items:center; gap:6px; }
.dsh-calendar-title { flex:1 1 auto; min-width:0; color:var(--dsw-alias-label-primary); font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-calendar-nav { flex:none; width:22px; height:22px; padding:0; border:0; border-radius:var(--dsw-radius-sm); background:transparent; color:var(--dsw-alias-label-secondary); font-size:15px; line-height:1; cursor:pointer; }
.dsh-calendar-nav:hover { background:var(--dsw-alias-bg-layer-2); }
.dsh-calendar-weekdays { flex:none; display:grid; grid-template-columns:repeat(7,1fr); gap:2px; color:var(--dsw-alias-label-quaternary); font-size:10px; line-height:14px; text-align:center; }
.dsh-calendar-grid { flex:none; display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); gap:2px; }
.dsh-calendar-cell { position:relative; display:flex; align-items:center; justify-content:center; min-height:22px; padding:0; border:0; border-radius:var(--dsw-radius-sm); background:transparent; color:var(--dsw-alias-label-secondary); font-size:11px; font-variant-numeric:tabular-nums; cursor:pointer; }
.dsh-calendar-cell:hover { background:var(--dsw-alias-bg-layer-2); }
.dsh-calendar-cell[data-outside="true"] { color:var(--dsw-alias-label-quaternary); }
.dsh-calendar-cell[data-today="true"] { box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l4); color:var(--dsw-alias-label-primary); }
.dsh-calendar-cell[data-selected="true"] { background:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-label-inverse, #fff); }
.dsh-calendar-dot { position:absolute; bottom:3px; left:50%; width:3px; height:3px; margin-left:-1.5px; border-radius:50%; background:var(--dsw-alias-state-business-primary); }
.dsh-calendar-cell[data-selected="true"] .dsh-calendar-dot { background:currentColor; }
.dsh-calendar-day { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:2px; padding-top:4px; border-top:.5px solid var(--dsw-alias-border-l2); }
.dsh-calendar-day-head { flex:none; display:flex; align-items:baseline; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:16px; }
.dsh-calendar-list { flex:1 1 auto; min-height:0; overflow:auto; scrollbar-width:thin; }
.dsh-habit-list { display:flex; flex-direction:column; gap:2px; margin:0; padding:0; list-style:none; }
.dsh-habit-row { display:flex; align-items:center; gap:8px; padding:3px 4px; border-radius:var(--dsw-radius-md); }
.dsh-habit-row:hover { background:var(--dsw-alias-bg-layer-2); }
.dsh-habit-row[data-due="false"] { opacity:.6; }
.dsh-habit-mark { flex:none; width:20px; height:20px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--dsw-alias-border-l3); border-radius:50%; background:transparent; color:var(--dsw-alias-label-inverse, #fff); cursor:pointer; }
.dsh-habit-mark[aria-checked="true"] { border-color:var(--dsw-alias-state-business-primary); background:var(--dsw-alias-state-business-primary); }
.dsh-habit-mark .dsh-todo-tick { opacity:0; }
.dsh-habit-mark[aria-checked="true"] .dsh-todo-tick { opacity:1; }
.dsh-habit-text { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:0; }
.dsh-habit-title { color:var(--dsw-alias-label-primary); font-size:13px; line-height:18px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-row[data-marked="true"] .dsh-habit-title { color:var(--dsw-alias-label-tertiary); }
.dsh-habit-meta { color:var(--dsw-alias-label-quaternary); font-size:10px; line-height:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-habit-streak { flex:none; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:16px; font-variant-numeric:tabular-nums; }
.dsh-habit-streak[data-zero="true"] { color:var(--dsw-alias-label-quaternary); }
.dsh-habit-delete { flex:none; width:18px; height:18px; padding:0; border:0; border-radius:var(--dsw-radius-sm); background:transparent; color:var(--dsw-alias-label-quaternary); font-size:14px; line-height:1; cursor:pointer; opacity:0; }
.dsh-habit-row:hover .dsh-habit-delete, .dsh-habit-delete:focus-visible { opacity:1; }
.dsh-habit-delete:hover { color:var(--dsw-alias-state-error-primary); }

.dsh-timer-wrap, .dsh-countdown-wrap { display:flex; flex-direction:column; height:100%; min-height:0; gap:6px; }
.dsh-timer { display:flex; flex-direction:column; justify-content:space-between; height:100%; min-height:0; gap:8px; }
.dsh-timer-face { display:flex; flex-direction:column; gap:2px; }
.dsh-timer-label { color:var(--dsw-alias-label-secondary); font-size:12px; line-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-timer-clock { color:var(--dsw-alias-label-primary); font-size:34px; font-weight:600; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.dsh-timer-clock[data-running="true"] { color:var(--dsw-alias-state-business-primary); }
.dsh-timer-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.dsh-timer-button { padding:3px 10px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font-size:12px; cursor:pointer; }
.dsh-timer-button:disabled { opacity:.45; cursor:default; }
.dsh-timer-primary { border-color:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-state-business-primary); }
.dsh-pomodoro { display:flex; flex-direction:column; gap:6px; height:100%; min-height:0; }
.dsh-pomodoro-head { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.dsh-pomodoro-phase { color:var(--dsw-alias-label-secondary); font-size:11px; }
.dsh-pomodoro-rounds { color:var(--dsw-alias-label-quaternary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-pomodoro-clock { color:var(--dsw-alias-label-primary); font-size:40px; font-weight:600; line-height:1.05; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.dsh-pomodoro[data-phase="break"] .dsh-pomodoro-clock { color:var(--dsw-alias-label-secondary); }
.dsh-pomodoro-track { display:block; height:3px; border-radius:2px; background:var(--dsw-alias-border-l2); overflow:hidden; }
.dsh-pomodoro-fill { display:block; height:100%; background:var(--dsw-alias-state-business-primary); }
.dsh-pomodoro[data-phase="break"] .dsh-pomodoro-fill { background:var(--dsw-alias-label-tertiary); }
.dsh-countdown { display:flex; flex-direction:column; gap:2px; }
.dsh-countdown-title { color:var(--dsw-alias-label-secondary); font-size:12px; line-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-countdown-clock { display:flex; align-items:baseline; gap:4px; color:var(--dsw-alias-label-primary); font-variant-numeric:tabular-nums; }
.dsh-countdown-days { font-size:34px; font-weight:600; line-height:1.05; }
.dsh-countdown-unit { color:var(--dsw-alias-label-secondary); font-size:12px; }
.dsh-countdown-rest { color:var(--dsw-alias-label-tertiary); font-size:13px; }
.dsh-countdown-date { color:var(--dsw-alias-label-quaternary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-countdown-expired { color:var(--dsw-alias-state-warn-primary); font-size:20px; font-weight:600; }
.dsh-countdown-hint { color:var(--dsw-alias-label-quaternary); font-size:11px; }
.dsh-countdown-row { display:flex; align-items:flex-end; gap:6px; }
.dsh-countdown-row .dsh-item-field:first-child { flex:1 1 auto; }
.dsh-countdown-row .dsh-item-field:nth-child(2) { flex:0 0 130px; }


.dsh-usage { display:flex; flex-direction:column; gap:6px; height:100%; min-height:0; overflow:hidden; }
.dsh-usage-hero { display:flex; align-items:baseline; gap:8px; }
.dsh-usage-total { color:var(--dsw-alias-label-primary); font-size:30px; font-weight:600; line-height:1.1; font-variant-numeric:tabular-nums; }
.dsh-usage-unit { color:var(--dsw-alias-label-tertiary); font-size:11px; white-space:nowrap; }
.dsh-usage-detail { display:flex; flex-wrap:wrap; gap:4px 12px; color:var(--dsw-alias-label-tertiary); font-size:11px; font-variant-numeric:tabular-nums; }
.dsh-usage-detail b { color:var(--dsw-alias-label-secondary); font-weight:600; }
.dsh-usage-bars { display:flex; align-items:flex-end; gap:3px; flex:none; height:40px; }
.dsh-usage-col { flex:1 1 0; display:flex; align-items:flex-end; justify-content:center; height:100%; min-width:0; }
.dsh-usage-bar { width:100%; max-width:26px; min-height:1px; border-radius:2px 2px 0 0; background:var(--dsw-alias-state-business-primary); opacity:.55; }
.dsh-usage-col:last-child .dsh-usage-bar { opacity:1; }
.dsh-usage-foot { display:flex; align-items:baseline; justify-content:space-between; gap:8px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsh-usage-foot b { color:var(--dsw-alias-label-secondary); font-weight:600; font-variant-numeric:tabular-nums; }
.dsh-usage[data-compact="true"] .dsh-usage-total { font-size:24px; }


.dsh-picture-wrap, .dsh-quote-wrap { display:flex; flex-direction:column; height:100%; min-height:0; gap:4px; }
.dsh-picture { position:relative; flex:1 1 auto; min-height:0; margin:0; border-radius:var(--dsw-radius-md); overflow:hidden; background:var(--dsw-alias-bg-layer-2); }
.dsh-picture img { width:100%; height:100%; display:block; }
.dsh-picture-caption { position:absolute; inset-inline:0; bottom:0; padding:14px 8px 6px; color:#fff; font-size:11px; line-height:16px; background:linear-gradient(transparent, rgba(0,0,0,.55)); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-picture-empty { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border:.5px dashed var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-tertiary); font-size:11px; text-align:center; padding:8px; }
.dsh-picture-empty-glyph { color:var(--dsw-alias-label-quaternary); font-size:22px; line-height:1; }
.dsh-picture-path { max-width:100%; color:var(--dsw-alias-label-quaternary); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
.dsh-quote { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:6px; justify-content:center; padding:2px 4px; }
.dsh-quote-mark { color:var(--dsw-alias-state-warn-primary); font-size:34px; line-height:.8; font-weight:600; }
.dsh-quote-text { margin:0; color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.55; overflow:auto; scrollbar-width:thin; }
.dsh-quote-hint { color:var(--dsw-alias-label-quaternary); font-size:10px; }
.dsh-item-field select { width:100%; padding:3px 6px; border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-sm); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-size:12px; line-height:18px; }


.dsh-balance { display:flex; flex-direction:column; gap:2px; height:100%; min-height:0; }
.dsh-balance-label { color:var(--dsw-alias-label-secondary); font-size:11px; line-height:16px; }
.dsh-balance-amount { color:var(--dsw-alias-label-primary); font-size:30px; font-weight:600; line-height:1.1; font-variant-numeric:tabular-nums; }
.dsh-balance-reason { color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dsh-balance-detail { display:flex; gap:10px; color:var(--dsw-alias-label-tertiary); font-size:10px; font-variant-numeric:tabular-nums; }
.dsh-balance .dsh-timer-button { margin-top:auto; align-self:flex-start; }

`
