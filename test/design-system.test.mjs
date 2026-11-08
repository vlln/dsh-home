/** 视觉标准只有一份：design-system.ts 定义颜色角色，docs/design-system.md 解释用法。
 * 这组断言防止下一次改动又把颜色写回组件样式里。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const client = new URL('../src/client/', import.meta.url)
const files = (await readdir(client)).filter(name => name.endsWith('.ts') || name.endsWith('.tsx'))
const read = (name) => readFile(new URL(name, client), 'utf8')
const standard = await read('design-system.ts')
const doc = await readFile(new URL('../docs/design-system.md', import.meta.url), 'utf8')
const styleModules = files.filter(name => name.includes('styles') && name !== 'design-system.ts')

test('every colour role is defined once, in design-system.ts', async () => {
  for (const name of files) {
    const source = await read(name)
    // Picture's placeholder is an SVG image, not UI paint.
    if (name !== 'picture-widget.tsx') {
      assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${name} must not hardcode a colour`)
    }
    if (name !== 'design-system.ts') {
      assert.doesNotMatch(source, /--dsw-alias-state-/, `${name} must use --dsh-* roles, not raw state hues`)
      assert.doesNotMatch(source, /--dsh-(hue|pill)-(blue|teal|green|amber|violet|pink)/, `${name} must not keep a rainbow palette`)
    }
  }
  // Shared primitives live in one place; modules only style their own layout.
  const primitives = ['\\.dsh-ws-pill', '\\.dsh-chip', '\\.dsh-quiet-select', '\\.dsh-hover-tip', '\\.dsh-status-chip']
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

test('the capsule, the accent and the chart ramp are single-valued', () => {
  assert.match(standard, /--dsh-pill-bg: var\(--dsw-alias-interactive-bg-active\)/)
  assert.match(standard, /--dsh-accent: var\(--dsw-alias-state-business-primary\)/)
  for (const level of [1, 2, 3, 4]) assert.match(standard, new RegExp(`--dsh-ramp-${level}:`))
  assert.equal(standard.match(/--dsh-pill-bg:/g)?.length, 1)
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

test('the standard document names every token it owns', () => {
  const defined = new Set([...standard.matchAll(/(--dsh-[a-z0-9-]+):/gu)].map(match => match[1]))
  assert.ok(defined.size >= 15)
  for (const token of defined) assert.ok(doc.includes(token), `docs/design-system.md must document ${token}`)
  assert.match(doc, /滚动条/u)
  assert.match(doc, /胶囊/u)
})
