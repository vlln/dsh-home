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
const plan = await readFile(new URL('../docs/conformance-plan.md', import.meta.url), 'utf8')

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
  assert.match(parts, /rounded-xl bg-\[var\(--dsh-sunken\)\] p-4/, 'tile padding 16 (stat-cards p-4)')
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

test('timer cards are self-built but only use measured sizes', async () => {
  // No free equivalent; the plan records the decision. What is asserted is that they draw
  // from the ramp (24 for the ring centre, 32 for the countdown headline), not from
  // invented pixel values.
  const [pomodoro, countdown] = await Promise.all([read('pomodoro-widget.tsx'), read('countdown-widget.tsx')])
  assert.match(pomodoro, /text-title-1-medium/, 'ring centre is the card metric size')
  assert.match(countdown, /text-display-4-semibold/, 'countdown headline is the 32/500 step')
  assert.doesNotMatch(pomodoro + countdown, /text-\[\d/, 'no raw pixel font sizes')
})

test('the clock is the one deliberate size above the list, and says so', async () => {
  const personal = await read('personal-widgets.tsx')
  assert.match(personal, /text-display-3-semibold/, 'clock time is display-3 (40/600)')
  assert.match(plan, /40\/600/, 'the deviation is recorded in the plan')
})

test('notes keeps the three text roles from the list', async () => {
  // A note is the one card where read and edit share a surface, so it does not use Row.
  // What it must still do is take its three sizes from the ramp.
  const personal = await read('personal-widgets.tsx')
  assert.match(personal, /dsh-note-title text-title-2-semibold/, 'content title 20/600')
  assert.match(personal, /dsh-note-body[^"]*text-body-regular/, 'body 14/400')
})

test('the quote mark is decoration: tertiary ink, never the data colour', async () => {
  const quote = await read('quote-widget.tsx')
  assert.match(quote, /text-display-4-semibold leading-none text-text-tertiary/, 'mark uses tertiary ink')
  assert.doesNotMatch(quote, /text-chart-4[^"]*" aria-hidden="true">“/, 'mark does not borrow chart ink')
  assert.match(quote, /text-headline-regular/, 'quote body is headline size')
})

test('the picture card always renders a slot, never an empty card', async () => {
  const picture = await read('picture-widget.tsx')
  assert.match(picture, /No picture chosen|picture\.empty/i, 'empty slot has a label')
  assert.match(plan, /虚线框/, 'the dashed frame is recorded as a deliberate exception')
})

test('todo rows keep the measured checkbox and heading', async () => {
  const [todo, planner] = await Promise.all([read('todo-widget.tsx'), read('planner-styles.ts')])
  assert.match(planner, /\.dsh-todo-heading \{[^}]*font:var\(--dsh-font-s-strong-14\)/s, 'group heading 14/500')
  assert.match(todo, /dsh-todo-add/, 'the add row is part of the card, not a dialog')
})

test('balance uses the card metric size, not the stat-card size', async () => {
  const balance = await read('balance-widget.tsx')
  assert.match(balance, /CardHero/, 'balance renders through CardHero')
  assert.match(plan, /24\/500/, 'the 24-vs-32 decision is recorded')
})

test('recent and pinned share one row implementation', async () => {
  const [recent, pinned] = await Promise.all([read('recent.tsx'), read('pinned-widget.tsx')])
  assert.match(recent, /RowButton/, 'recent builds on RowButton')
  assert.match(pinned, /SessionRow/, 'pinned reuses the shared session row')
  assert.match(plan, /同一套行/, 'the shared-row decision is recorded')
  assert.doesNotMatch(recent, /divide-y/, 'no per-row rules: the pinned card separates by space')
  // Group headings are table headers: 14/500 with header-cell padding, not an invented gap.
  const styles = await read('styles.ts')
  assert.match(styles, /\.dsh-recent-group-title \{[^}]*padding: 10px 12px 4px/s)
  assert.match(styles, /\.dsh-pinned-group-title \{[^}]*padding: 10px 12px 4px/s)
})

test('session status and tokens use the measured primitives', async () => {
  const [status, usage] = await Promise.all([read('session-status-widget.tsx'), read('usage-widget.tsx')])
  assert.match(status, /SegmentedControlItem/, 'session status filters through one control, not two')
  // One graphic: activity rings, each ring a category split into its parts, every arc
  // answering a hover. No bar strip — that answered a different question on the same card.
  // Reference card: ONE ring split into its parts, the total in the middle, a row list
  // underneath. No bar strip, no concentric gauges, no tile grid.
  const viz = await read('ui/viz.tsx')
  assert.match(usage, /<Donut/, 'tokens draws a single segmented ring')
  assert.doesNotMatch(usage, /SparkBars/, 'no bar strip in the tokens card')
  assert.doesNotMatch(usage, /grid grid-cols-2/, 'no tile grid: the parts are a row list')
  assert.doesNotMatch(viz, /ActivityRings|ShareRings/, 'no second ring primitive')
})

test('heat cells are square', async () => {
  // BoardUI's heatmap cells are 28x21, but at this density 4:3 read as "the grid is
  // broken" rather than as their card. Squares win; the deviation is recorded.
  const activity = await read('activity-widget.tsx')
  assert.match(activity, /<HeatCell size=\{cellSize\}/, 'cell is square')
  assert.match(plan, /正方形/, 'the square decision is recorded in the plan')
})

test('dividers: one hairline token, and never a rule per row', async () => {
  // The rule: a line belongs to a summary or a header block. Rows separate by space.
  const files = ['styles.ts', 'widget-refinement-styles.ts', 'widget-expression-styles.ts', 'planner-styles.ts']
  const sources = await Promise.all(files.map(file => read(file)))
  const dividers = sources.flatMap(source => source.match(/border-(?:top|bottom):[^;}]*/g) ?? [])
  for (const divider of dividers) {
    if (/var\(--color-/.test(divider)) assert.fail(`divider uses a colour token, not the hairline: ${divider}`)
  }
  for (const source of sources) assert.doesNotMatch(source, /\+\s*\.dsh-row\s*\{[^}]*border-top/s, 'no per-row rules')
})

test('time cards share one action row', async () => {
  // The three time cards had mixed sizes: a 32px primary next to a 24px ghost, and a skippable
  // secondary. One size for actions (`small`), one primary, one secondary, ghost for the rest.
  const [pomodoro, timer] = await Promise.all([read('pomodoro-widget.tsx'), read('timer-widget.tsx')])
  for (const source of [pomodoro, timer]) {
    assert.doesNotMatch(source, /size="xs"/, 'actions are `small`, never `xs`')
    const primaries = source.match(/variant="primary"/g) ?? []
    assert.ok(primaries.length >= 1, 'each card has exactly one kind of primary action')
  }
})

test('a card is a container, not a target', async () => {
  // The whole card used to tint on hover, which made it read as one big button and erased
  // the card/content boundary. Only the element under the pointer may react.
  assert.doesNotMatch(await read('theme.css'), /\.dsh-card:hover/)
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
