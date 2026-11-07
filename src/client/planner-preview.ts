/**
 * 计划类组件的预览数据：合成、固定、与任何真实数据无关。
 *
 * 预览必须零副作用：这些内容只喂给 Content 的 `preview.data`，组件在预览分支里
 * 不订阅 store、不发请求、不起计时（见 home-data.ts 的说明）。
 *
 * @module @vlln/dsh-home/client/planner-preview
 */

import type { PlannerHabit, PlannerItem } from './api.ts'

/** 预览用固定「今天」：2026-11-06（周五）。 */
export const PREVIEW_DAY = '2026-11-06'

/** 预览时刻：当天 10:24（本地时区，跟用户看到的一致）。 */
export const PREVIEW_NOW = new Date(2026, 10, 6, 10, 24).getTime()

const base = { priority: 0 as const, note: '', doneAt: null, createdAt: PREVIEW_NOW, updatedAt: PREVIEW_NOW }

function item(id: string, title: string, overrides: Partial<PlannerItem> = {}): PlannerItem {
  return { id, kind: 'task', title, day: PREVIEW_DAY, start: null, end: null, done: false, ...base, ...overrides }
}

export function previewItems(): PlannerItem[] {
  return [
    item('it_1', 'review 组件契约', { start: '09:00', end: '09:45' }),
    item('it_2', '写首页周报', { start: '14:00' }),
    item('it_3', '整理插件文档'),
    item('it_4', '回复设计评审', { day: '2026-11-09' }),
    item('it_5', '续期域名', { day: null, kind: 'task' }),
    item('it_6', '合并发布分支', { start: '08:10', done: true, doneAt: PREVIEW_NOW - 3_600_000 }),
  ]
}

export function previewHabits(): PlannerHabit[] {
  return [
    { id: 'hb_1', title: '跑步', weekdays: null, createdAt: PREVIEW_NOW, marks: { '2026-11-06': true, '2026-11-05': true, '2026-11-04': true } },
    { id: 'hb_2', title: '读 20 页', weekdays: null, createdAt: PREVIEW_NOW, marks: { '2026-11-05': true } },
    { id: 'hb_3', title: '周报复盘', weekdays: [5], createdAt: PREVIEW_NOW, marks: {} },
  ]
}

/** 预览数据（每个组件把它塞进自己的 `preview.data`）。 */
export function plannerPreview(): { day: string; now: number; items: PlannerItem[]; habits: PlannerHabit[] } {
  return { day: PREVIEW_DAY, now: PREVIEW_NOW, items: previewItems(), habits: previewHabits() }
}
