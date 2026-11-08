#!/usr/bin/env node
/**
 * Vendor BoardUI component source into `src/client/ui/`.
 *
 * BoardUI is source-distributed (shadcn-style registry): every item is a JSON
 * document at `https://www.boardui.com/r/<name>.json` carrying the complete
 * source of its files plus `registryDependencies`. This script resolves those
 * dependencies, copies the component sources, rewrites their `@/` imports to
 * local relative paths, and writes `ui/VENDOR.md` recording what came from
 * where, so a future `add` can be diffed instead of silently clobbering our
 * edits.
 *
 * Only component/util items are copied. Stylesheet items (`globals`, `theme`,
 * `typography`) are skipped on purpose: dsh-home owns its Tailwind entry
 * (`src/client/theme.css`) and must never write a second `styles/globals.css`.
 *
 *   node scripts/vendor-boardui.mjs            # write files
 *   node scripts/vendor-boardui.mjs --check    # fail if the tree is stale
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UI_DIR = path.join(ROOT, 'src/client/ui')
const BOARDUI_DIR = path.join(UI_DIR, 'boardui')
const LIB_DIR = path.join(UI_DIR, 'lib')
const CSS_DIR = path.join(UI_DIR, 'vendor-css')
const REGISTRY = process.env.BOARDUI_REGISTRY_URL ?? 'https://www.boardui.com/r'

/** Components the rebuild needs. Everything else is pulled in as a dependency. */
const ITEMS = [
  'button',
  'button-group',
  'chip',
  'badge',
  'avatar',
  'input',
  'select',
  'dropdown',
  'tooltip',
  'switch',
  'segmented-control',
  'skeleton',
  'spinner',
  'progress',
  'stat-cards',
]

/**
 * Stylesheet items. These are vendored as a *starting point*, not imported
 * blindly: dsh-home compiles its own Tailwind entry (`src/client/theme.css`)
 * and must never ship a second preflight. `theme` carries every semantic
 * token the components reference; `typography` carries the composite type
 * ramp (`text-title-1-medium` …). Both are transformed below.
 */
const CSS_ITEMS = ['theme', 'typography']


/** Stylesheet/documentation items: dsh-home supplies its own. */
const SKIP = new Set(['globals', 'theme', 'typography', 'rules', 'skill', 'agent-runtime', 'logo'])

const claim = new Map()

const sha = text => createHash('sha256').update(text).digest('hex')

async function fetchItem(name) {
  const url = `${REGISTRY}/${name}.json`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  const json = await response.json()
  return { url, json }
}

function rewrite(source, from) {
  return source
    // foundations and same-level components all live in boardui/.
    .replaceAll('@/components/foundations/icons/chevrons', './chevrons')
    .replaceAll('@/components/foundations/brand/logo', './logo')
    .replaceAll('@/components/foundations/template-copy/template-copy', './template-copy')
    .replaceAll('@/components/foundations/direction/direction', './direction')
    .replace(/@\/components\/(base|application)\/[^'"]*\/([a-z0-9-]+)(['"])/g, './$2$3')
    .replaceAll('@/utils/cx', '../lib/cx')
    .replaceAll('@/utils/directional-icon', '../lib/directional-icon')
    .replaceAll('@/utils/use-dismiss-on-outside-press', '../lib/use-dismiss-on-outside-press')
    .replaceAll('@/utils/scroll-direction', '../lib/scroll-direction')
    .replaceAll('@/styles/globals.css', './theme.css')
}

/** `components/base/buttons/button.tsx` -> `button.tsx`; `utils/cx.ts` -> lib/cx.ts */
function targetFor(file, itemName) {
  const base = path.basename(file.target)
  const isUtil = file.target.startsWith('utils/')
  if (isUtil) return path.join('lib', base)
  const stem = base.replace(/\.(tsx?|css)$/, '')
  const ext = base.slice(stem.length)
  const owner = claim.get(stem)
  // Two items shipping the same basename: keep the first, prefix later ones.
  const name = owner === undefined || owner === itemName ? stem : `${itemName}-${stem}`
  claim.set(name, itemName)
  return path.join('boardui', `${name}${ext}`)
}

async function resolve(names) {
  const resolved = new Map()
  async function visit(name) {
    if (SKIP.has(name) || resolved.has(name)) return
    const { url, json } = await fetchItem(name)
    resolved.set(name, { url, json })
    for (const dep of json.registryDependencies ?? []) await visit(dep)
  }
  for (const name of names) await visit(name)
  return [...resolved.values()]
}

const items = await resolve(ITEMS)
const writes = new Map()
const provenance = []

for (const { url, json } of items) {
  const name = json.name
  for (const file of json.files ?? []) {
    if (file.target.endsWith('.css')) continue
    const rel = targetFor(file, name)
    const content = rewrite(file.content, file.target)
    const header = `/* Vendored from BoardUI \`${name}\` (${path.basename(file.target)}). Local edits belong in ui/index.ts wrappers. */\n`
    writes.set(rel, header + content)
    provenance.push({ item: name, file: path.basename(file.target), rel, sha256: sha(content) })
  }
}

// --- stylesheets -----------------------------------------------------------
// The host flips dark mode on `body[data-ds-dark-theme]`, not on a `.dark`
// class. Rewriting BoardUI's dark overrides to that selector is the one change
// that lets one palette follow the host's theme switch.
const DARK_SELECTOR = 'body[data-ds-dark-theme]'
const transformSelector = css =>
  css.replace(/^\.dark\[data-accent\]/gm, `${DARK_SELECTOR}[data-accent]`).replace(/^\.dark\b/gm, DARK_SELECTOR)

for (const name of CSS_ITEMS) {
  const { url, json } = await fetchItem(name)
  for (const file of json.files ?? []) {
    if (!file.target.endsWith('.css')) continue
    const base = path.basename(file.target) // theme.css | typography.css
    const local = `vendor-css/boardui-${base}`
    const content = `/* Vendored from BoardUI \`${name}\` (${path.basename(file.target)}).
 * Selector rewrite: \`.dark\` → \`${DARK_SELECTOR}\`.
 * Regenerate with \`node scripts/vendor-boardui.mjs\`; do not edit by hand. */
${transformSelector(file.content)}`
    writes.set(local, content)
    provenance.push({ item: name, file: path.basename(file.target), rel: local, sha256: sha(content) })
  }
}

const vendorDoc = `# Vendored BoardUI source
Generated by \`scripts/vendor-boardui.mjs\`. Do not edit these files by hand:
wrap what you need in \`src/client/ui/index.ts\` instead, so the next vendor run
stays a clean diff.

Registry: ${REGISTRY}
Fetched: ${new Date().toISOString()}
Items: ${items.map(i => i.json.name).join(', ')}

| item | upstream file | local path | sha256 |
|---|---|---|---|
${provenance.map(p => `| ${p.item} | ${p.file} | ${p.rel} | \`${p.sha256.slice(0, 16)}\` |`).join('\n')}

## Known differences from upstream

- Imports rewritten from \`@/\` to relative paths.
- Stylesheet items (\`globals\`, \`theme\`, \`typography\`) are not vendored: dsh-home
  owns its Tailwind entry at \`src/client/theme.css\`.
- BoardUI declares \`ref\` as a plain prop (React 19 semantics). The host runs
  React 18, where React strips \`ref\` from function-component props. So **do not
  pass \`ref\` to a vendored component**; attach the ref to a wrapper element
  instead. Nothing inside the vendored source relies on an incoming \`ref\`.
`

const check = process.argv.includes('--check')
const drift = []
for (const [rel, content] of writes) {
  const abs = path.join(UI_DIR, rel)
  const current = existsSync(abs) ? await readFile(abs, 'utf8') : null
  if (current !== content) drift.push(rel)
}
const vendorPath = path.join(UI_DIR, 'VENDOR.md')
const vendorCurrent = existsSync(vendorPath) ? await readFile(vendorPath, 'utf8') : null
// Timestamp changes every run; compare without it.
const strip = text => text?.replace(/^Fetched: .*$/m, 'Fetched: <run>')
if (strip(vendorCurrent) !== strip(vendorDoc)) drift.push('VENDOR.md')

if (check) {
  if (drift.length > 0) {
    console.error(`vendor drift in ${drift.length} file(s):\n${drift.map(d => `  ${d}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`vendor tree matches the registry (${writes.size} files)`)
  process.exit(0)
}

await mkdir(BOARDUI_DIR, { recursive: true })
await mkdir(LIB_DIR, { recursive: true })
await mkdir(CSS_DIR, { recursive: true })
for (const [rel, content] of writes) {
  await writeFile(path.join(UI_DIR, rel), content)
}
await writeFile(vendorPath, vendorDoc)
console.log(`vendored ${writes.size} files from ${items.length} items into src/client/ui/`)
