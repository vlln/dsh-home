/**
 * BoardUI 一致性：把"看起来像"变成可执行的东西。
 *
 * 这份测试守的是 docs/boardui-conformance.md 里的实测数字：那些值是从 BoardUI 渲染出的
 * DOM/SVG 上量出来的，不是设计出来的。改实现却不同步清单会红，反过来也一样——因为
 * 上一轮"用了 BoardUI 的 token 就不像 BoardUI"的根因，正是没人比较过渲染结果。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const client = new URL('../src/client/', import.meta.url)
const read = (name) => readFile(new URL(name, client), 'utf8')
const doc = await readFile(new URL('../docs/boardui-conformance.md', import.meta.url), 'utf8')

const [theme, viz, parts, page] = await Promise.all([
  read('theme.css'), read('ui/viz.tsx'), read('ui/parts.tsx'), read('page.tsx'),
])

test('bars use BoardUI\'s measured geometry, not an approximation', () => {
  // Measured from boardui.com/components/earnings-chart-card (2026-11-09):
  // track 32/rx10, hover box 38/rx13, 3px padding. The pill look comes from
  // radius = one third of the width; 4px reads as a square.
  assert.match(viz, /max-w-\[38px\]/, 'hover box is 38 wide')
  assert.match(viz, /p-\[3px\]/, '3px padding between hover box and track')
  assert.match(viz, /rounded-\[10px\]/, 'track and value radius 10')
  assert.match(viz, /rounded-\[13px\]/, 'hover outline radius 13')
  assert.match(viz, /ring-1 ring-chart-4/, 'hover shows the column outline')
})

test('the card keeps the measured numbers: 16 radius, 16 pad, no dark border', () => {
  assert.match(theme, /--dsh-card-radius: 16px/)
  assert.match(theme, /--dsh-card-pad: 16px/)
  assert.match(theme, /\.dsh-card \{[^}]*padding: var\(--dsh-card-pad\)/s)
  assert.match(theme, /body\[data-ds-dark-theme\] \{[^}]*--dsh-card-line: transparent/s)
  // 14/500 label, 24/500 metric — the two type sizes the whole board hangs on.
  assert.match(theme, /\.dsh-card-title \{[^}]*font: 500 14px\/20px/s)
  assert.match(theme, /\.dsh-metric-value \{[^}]*font: 500 24px\/32px/s)
})

test('a card is composed from the shared parts, never hand-rolled again', () => {
  assert.match(page, /className="dsh-card dsh-home-widget dsh-enter"/)
  // 24px corners were the previous card; a card never declares its own radius now.
  assert.doesNotMatch(page, /rounded-3xl/)
  // Stat tiles are the stat-card values, not an invented size.
  assert.match(parts, /text-title-2-medium/)
})

test('heat cells keep BoardUI\'s 4px radius', () => {
  // Measured from components/heatmap-chart-card: 28x21 cells, radius 4. We are square
  // (recorded as a known deviation) but the corner radius is theirs.
  const viz = read('ui/viz.tsx')
  return viz.then(source => assert.match(source, /rounded-\[4px\]/))
})

test('list rows keep BoardUI\'s cell metrics', () => {
  // data-table: 14/500 cells, 10/12 padding, 1px separators. Height is the one
  // deliberate deviation (32 not 59) and is recorded in the doc.
  const row = read('ui/row.tsx')
  return row.then(source => {
    assert.match(source, /px-3/, 'horizontal cell padding 12')
    assert.match(source, /text-body-medium/, 'cell text 14/500')
  })
})

test('stat tiles keep the measured padding and label size', async () => {
  // stat-cards (2026-11-09): padding 8, label 14/500, radius 16. The value is 32/500
  // on a standalone stat card; our three-up tile uses 20/500 (recorded deviation).
  const parts = await read('ui/parts.tsx')
  assert.match(parts, /rounded-xl bg-\[var\(--dsh-sunken\)\] p-2/, 'tile padding 8')
  assert.match(parts, /text-body-medium text-text-tertiary/, 'tile label 14/500')
})

test('group headings are table headers, not overline labels', async () => {
  // data-table header: 14/500, normal case, no tracking. The board used 10px uppercase
  // with 0.04em, which reads as a different product's overline.
  const planner = await read('planner-styles.ts')
  assert.match(planner, /\.dsh-todo-heading \{[^}]*font:var\(--dsh-font-s-strong-14\)/s)
  assert.match(planner, /\.dsh-todo-heading \{[^}]*text-transform:none/s)
})

test('habit checkbox keeps the measured 16px / 4px box', async () => {
  // components/checkbox (2026-11-09): 16x16, radius 4, 1px border.
  const habit = await read('habit-widget.tsx')
  assert.match(habit, /size-4/, '16px box')
  assert.match(habit, /rounded-\[4px\]/, '4px radius')
})

test('rings keep BoardUI\'s ratio and caps', async () => {
  // activity-rings-card: stroke 18 on a 176 diameter (~10%), round caps, full track.
  const viz = await read('ui/viz.tsx')
  assert.match(viz, /strokeLinecap="round"/)
  assert.match(doc, /约直径的 10%/)
})

test('every primitive we implement is recorded in the conformance doc', () => {
  // If a primitive is not in the doc, it was not measured, and "looks like BoardUI"
  // is a guess. Keep this list in step with docs/boardui-conformance.md.
  for (const section of ['卡片', '柱状图', '分段控件', '我们的卡片']) {
    assert.match(doc, new RegExp(`## .*${section}`), `doc has a "${section}" section`)
  }
  for (const measured of ['32 宽', 'rx 10', '38 宽', 'rx 13', '14/500', '24/500']) {
    assert.ok(doc.includes(measured), `doc records the measured value: ${measured}`)
  }
  assert.match(doc, /优先采用/, 'the doc states: prefer BoardUI\'s implementation')
})
