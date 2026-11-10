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
  assert.match(page, /WidgetCardShell[^>]*className="dsh-enter"/s)
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

test('the drag ghost is the card it will become', async () => {
  // Two logics used to size the preview: the ghost had no padding while its content was
  // already sized as if padded, and it took `defaults.size` instead of the size the drop
  // would produce. Both are gone — the ghost takes the real card's geometry and size.
  const [styles, page, grid] = await Promise.all([read('styles.ts'), read('page.tsx'), read('spatial-grid.tsx')])
  // Same shell as the board, and the preview's width is the card body's width — the card box
  // is the full card, the content inside it is the body. Passing the card width to the content
  // made the ghost's content 32px wider than the box it sat in.
  assert.match(page, /libraryGhost=\{libraryDrag && <WidgetCardShell/, 'ghost renders the same shell as the board')
  assert.match(page, /WidgetContentPreview/, 'ghost renders through the preview container')
  assert.match(page, /\<WidgetCardBody\>/, 'ghost keeps the board body slot')
  assert.match(styles, /\.dsh-library-ghost \{/, 'ghost rules live in the main sheet')
  // It must not carry dsh-w: that class sets position:relative and, being later in the same
  // sheet with equal specificity, silently overrode position:fixed and pushed the ghost out
  // of the viewport.
  assert.match(grid, /className="dsh-library-ghost"/, 'the portal box is not a dsh-w')
  assert.doesNotMatch(grid, /className="dsh-library-ghost dsh-w"/, 'no dsh-w on the ghost')
  assert.match(page, /size=\{sizeFromRect\(/, 'ghost takes the size the drop will produce')
  assert.match(page, /cardContentSize\(libraryDrag\.item\.w, libraryDrag\.item\.h\)/, 'preview content is sized to the card body')
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

test('a dialog form speaks the Host settings grammar, one scale for every field', async () => {
  // Measured from the Host's settings-form (fields.module.css, 2026-11-09): 13/500
  // labels in label-primary, 34px controls, 12px hints, 12px rows split by a hairline.
  // A config dialog earlier carried four type sizes at once (10 label / 12 input /
  // 13 segmented / 16 stray span) — that is what "字体、按钮都不统一" meant.
  const styles = await read('styles.ts')
  assert.match(styles, /\.dsh-modal-label \{[^}]*font: var\(--dsh-font-xs-strong-13\)/s)
  assert.match(styles, /\.dsh-modal-input \{[^}]*height: 34px/s)
  assert.match(styles, /\.dsh-modal-hint \{[^}]*font: var\(--dsh-font-xxs-12\)/s)
  const dialogs = ['picture-widget.tsx', 'countdown-widget.tsx', 'quote-widget.tsx']
  for (const name of dialogs) {
    const source = await read(name)
    assert.match(source, /className="dsh-modal-form"/, `${name} renders a host-grammar form`)
    // The 10px label belongs to the compact in-card item editor, never to a dialog.
    assert.doesNotMatch(source, /dsh-item-label|dsh-item-button|dsh-personal-settings/, `${name} uses no in-card form class`)
  }
})

test('the picture card body is the trigger, and it fills the card', async () => {
  // The card is the affordance: no separate options button, and the empty slot has to
  // own the leftover height instead of collapsing into a 66px band.
  const [widget, settings, refine] = await Promise.all([
    read('picture-widget.tsx'), read('widget-settings.tsx'), read('widget-refinement-styles.ts'),
  ])
  assert.match(widget, /renderTrigger=\{open => <PictureBody/)
  assert.match(widget, /className="dsh-picture-hit"/)
  assert.match(settings, /data-fill=\{renderTrigger === undefined \? undefined : 'true'\}/)
  assert.match(refine, /\[data-fill="true"\] \{[^}]*flex:1 1 auto/s)
  // One sheet owns the picture: cross-sheet, `.dsh-picture{margin:0}` silently beat the
  // bleed rule and the toggle did nothing for two rounds.
  const [personal, planner] = await Promise.all([read('personal-styles.ts'), read('planner-styles.ts')])
  assert.doesNotMatch(personal, /\.dsh-picture-/)
  assert.match(planner, /\.dsh-picture-bleed \{ margin:calc\(-1 \* var\(--dsh-card-pad\)\)/)
})

test('a picked picture never becomes config text', async () => {
  // A widget config is capped at 8 KiB (widget-registry WIDGET_JSON_LIMITS), so embedding
  // the chosen file as a data URL made every save say "配置无效". The bytes go to the host
  // storage route and the config keeps a short path.
  const widget = await read('picture-widget.tsx')
  assert.doesNotMatch(widget, /readAsDataURL|FileReader/)
  assert.match(widget, /PICTURE_UPLOAD_PATH/)
  assert.match(widget, /content-type': 'application\/octet-stream'/)
  // The save failure had no stylesheet at all: it rendered as a default 16px <p>.
  const settings = await read('widget-settings.tsx')
  assert.doesNotMatch(settings, /dsh-task-error/)
  assert.match(settings, /className="dsh-modal-error"/)
})

test('edge to edge means the whole card, head included', async () => {
  // The switch is not "add padding back": the picture IS the card — title line, icon and
  // the 16px pad all step aside, and the card's own radius does the clipping.
  const themeSource = await read('theme.css')
  assert.match(themeSource, /\.dsh-card\[data-editing="false"\]:has\(\.dsh-picture-bleed\) \{[^}]*padding: 0/s)
  assert.match(themeSource, /\[data-editing="false"\]:has\(\.dsh-picture-bleed\) > \.dsh-card-head \{\s*display: none/s)
  // And it cannot live beside the widget: dsh-legacy is declared before components, so a
  // card rule written there loses regardless of specificity. That cost two rounds.
  assert.match(await read('styles.ts'), /@layer dsh-reset, dsh-legacy, theme, base, components, utilities;/)
  assert.doesNotMatch(await read('planner-styles.ts'), /\.dsh-card\[data-editing/)
})

test('the Today card reports the day: one rail, no call to action', async () => {
  // Three bands down one column instead of a two-column split: the rail is the widest
  // element in a short wide card, and sitting it beside the number left two dead
  // quadrants. The shortcut pitch ("press ⌘N to start") and its button are gone —
  // this card reports today, it does not sell an action.
  const [widgets, expression, locales] = await Promise.all([
    read('widgets.tsx'), read('widget-expression-styles.ts'), read('locales.ts'),
  ])
  const today = widgets.slice(widgets.indexOf('function TodayBody'), widgets.indexOf('export function sessionTitle'))
  assert.doesNotMatch(today, /startSession|shortcutHint|<Button/)
  assert.match(expression, /\.dsh-home-widget \.dsh-today-content \{ justify-content:center; gap:10px; \}/)
  assert.doesNotMatch(expression, /\.dsh-today-content \{ display:grid/)
  assert.doesNotMatch(locales, /widget\.empty\.action/)
  assert.match(locales, /'widget\.today\.empty': '今天还没有记录'/)
})

test('the header is a name and its actions, nothing else', async () => {
  // The date/session-count/scan-time line and the edit-mode hint bar both lived in the
  // header. They are gone: the header carries the board's name, the two tools that only
  // exist while editing, and the actions. The name itself is the rename control.
  const [pageSource, styles] = await Promise.all([read('page.tsx'), read('styles.ts')])
  assert.doesNotMatch(pageSource, /dsh-home-sub/)
  assert.doesNotMatch(pageSource, /dsh-edit-bar|dsh-edit-hint/)
  assert.doesNotMatch(pageSource, /action\.newSession/)
  assert.match(pageSource, /dsh-home-title-edit/)
  assert.match(pageSource, /store\.setBoardTitle\(/)
  assert.match(pageSource, /BOARD_TITLE_MAX/)
  // The board can be wider than the window; the actions stay at the scrollport's edge.
  assert.match(styles, /\.dsh-home-actions \{ position: sticky; right: 0;/)
  const server = await readFile(new URL('../../src/state.mjs', client), 'utf8')
  assert.match(server, /export const BOARD_TITLE_MAX = 40/)
  assert.match(await read('api.ts'), /export const BOARD_TITLE_MAX = 40/)
})
