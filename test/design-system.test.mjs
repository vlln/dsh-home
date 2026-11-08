/** 视觉标准只有一份：styles.ts 定义共享小部件，docs/design-system.md 解释用法。
 * 这组断言防止下一次改动又把颜色写回组件样式里。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const client = new URL('../src/client/', import.meta.url)
const files = (await readdir(client)).filter(name => name.endsWith('.ts') || name.endsWith('.tsx'))
const read = (name) => readFile(new URL(name, client), 'utf8')
const standard = await read('styles.ts')
const theme = await read('theme.css')
const page = await read('page.tsx')
const doc = await readFile(new URL('../docs/design-system.md', import.meta.url), 'utf8')
const styleModules = files.filter(name => name.includes('styles') && name !== 'styles.ts')

test('every colour role is defined once, in design-system.ts', async () => {
  for (const name of files) {
    const source = await read(name)
    // Picture's placeholder is an SVG image, not UI paint.
    if (name !== 'picture-widget.tsx') {
      assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${name} must not hardcode a colour`)
    }
    if (name !== 'styles.ts') {
      assert.doesNotMatch(source, /--dsw-alias-state-/, `${name} must use --dsh-* roles, not raw state hues`)
      assert.doesNotMatch(source, /--dsh-(hue|pill)-(blue|teal|green|amber|violet|pink)/, `${name} must not keep a rainbow palette`)
    }
  }
  // Shared primitives live in one place; modules only style their own layout.
  const primitives = ['\\.dsh-chip', '\\.dsh-quiet-select', '\\.dsh-hover-tip', '\\.dsh-status-chip']
  for (const name of styleModules) {
    const source = await read(name)
    for (const primitive of primitives) {
      assert.doesNotMatch(source, new RegExp(`^${primitive} \\{`, 'm'), `${name} must not redefine ${primitive}`)
    }
  }
  for (const primitive of primitives) {
    assert.match(standard, new RegExp(`^${primitive} \\{`, 'm'), `design-system.ts must define ${primitive}`)
  }
})

test('the standard owns geometry only: the colour vocabulary lives in theme.css', () => {
  // 0006 moved every colour role into `src/client/theme.css`. What must stay true is
  // that the shared classes name one accent, one capsule fill and one data hue —
  // and that design-system.ts stops inventing roles of its own.
  assert.doesNotMatch(standard, /--dsh-(accent|warning|danger|positive|ramp|track|pill|hero)[a-z-]*:/,
    'design-system.ts must not define colour roles any more')
  assert.match(standard, /--color-chart-4/, 'the accent is the data hue')
  assert.doesNotMatch(standard, /--color-chart-[1235]/, 'the standard must not pick a second data hue')
  assert.match(standard, /--dsh-dot-color/)
})

test('digest cards never scroll and never page', async () => {
  const recent = await read('recent.tsx')
  const pinned = await read('pinned-widget.tsx')
  const activity = await read('activity-widget.tsx')
  const refinement = await read('widget-refinement-styles.ts')
  const activityCss = await read('activity-styles.ts')
  assert.doesNotMatch(recent, /extraPages|recent\.more/)
  // No search box, no directory select, and a hard five-entry cap.
  assert.doesNotMatch(recent, /dsh-recent-filters|dsh-recent-search|type="search"|<select/)
  assert.match(recent, /slice\(0, RECENT_ROW_LIMIT\)/)
  assert.match(pinned, /useVisibleRows\(rowsRef/)
  assert.match(refinement, /dsh-recent-list[^}]*overflow:hidden/)
  assert.match(refinement, /dsh-pinned-rows[^}]*overflow:hidden/)
  assert.match(activityCss, /\.dsh-activity-scroll \{[^}]*overflow:hidden/s)
  assert.doesNotMatch(activityCss, /\.dsh-activity-scroll \{[^}]*overflow-y:auto/s)
  // The time zone line and the "empty cells are not inactivity" paragraph are gone.
  assert.doesNotMatch(activity, /activity\.zone|activity\.partial'|activity\.incomplete/)
})

test('the shared widget classes are defined once and documented', () => {
  // After B4 the stylesheet is styles.ts, which also carries layout rules, so
  // this pins the handful of classes the document actually owns.
  const shared = ['dsh-chip', 'dsh-status-dot', 'dsh-status-chip', 'dsh-status-count', 'dsh-quiet-select', 'dsh-hover-tip', 'dsh-track']
  for (const name of shared) {
    assert.ok(standard.includes('.' + name), `styles.ts must define .${name}`)
    assert.ok(doc.includes(name), `docs/design-system.md must document .${name}`)
  }
  assert.match(doc, /theme\.css/u)
  assert.match(doc, /滚动条/u)
  assert.match(doc, /胶囊/u)
})

test('the board surface ladder keeps the card above the canvas, in both themes', () => {
  // The first version of this board had cards DARKER than the page they sat on (#272727
  // on #2c2d2f), because the card borrowed a host token while the page borrowed another.
  // Every card then read as a grey box sunk into grey. The ladder is a design constant —
  // canvas < card < track, in both themes — and it must be declared in one place.
  const blocks = (selector) => [...theme.matchAll(new RegExp(`${selector} \\{([^}]*)\\}`, 'g'))]
    .map(match => match[1])
    .filter(body => body.includes('--dsh-canvas'))
  const steps = (body) => Object.fromEntries([...body.matchAll(/(--dsh-(?:canvas|card|sunken)):\s*#([0-9a-f]{6})/g)]
    .map(match => [match[1], Number.parseInt(match[2], 16)]))
  const light = blocks(':root')
  const dark = blocks('body\\[data-ds-dark-theme\\]')
  assert.equal(light.length, 1, 'exactly one light surface block')
  assert.equal(dark.length, 1, 'exactly one dark surface block')
  // Dark lifts the card over a near-black canvas and puts the track above the card;
  // light does the mirror: the track is a shade *under* a white card, over a grey page.
  const ladders = {
    light: { body: light[0], order: ['--dsh-sunken', '--dsh-canvas', '--dsh-card'] },
    dark: { body: dark[0], order: ['--dsh-canvas', '--dsh-card', '--dsh-sunken'] },
  }
  for (const [name, { body, order }] of Object.entries(ladders)) {
    const ladder = steps(body)
    for (const step of order) assert.ok(ladder[step] !== undefined, `${name} declares ${step}`)
    // 6-bit hex space is monotone enough for steps this small.
    for (let index = 1; index < order.length; index += 1) {
      assert.ok(ladder[order[index - 1]] < ladder[order[index]], `${name}: ${order[index - 1]} must sit below ${order[index]}`)
    }
  }
  // Dark lifts a card without an edge; light needs one, because white on #fafafa
  // has nothing else to separate them. The line is a token, and it is transparent
  // in dark — so "no cage" holds there while the light card keeps its edge.
  assert.match(theme, /\.dsh-card \{[^}]*border: 1px solid var\(--dsh-card-line\)/s)
  assert.match(theme, /body\[data-ds-dark-theme\] \{[^}]*--dsh-card-line: transparent/s)
  assert.match(theme, /\.dsh-card \{[^}]*border-radius: var\(--dsh-card-radius\)/s)
  // The page markup must not restate the surface with utilities, or the ladder splits again.
  assert.match(page, /className="dsh-card dsh-home-widget dsh-enter"/)
  assert.doesNotMatch(page, /dsh-home-widget[^`"]*\bbg-background-primary-default\b/)
})
