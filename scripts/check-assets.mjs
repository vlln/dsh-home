#!/usr/bin/env node
/**
 * Asset-layer gate.
 *
 * The rebuild is only worth anything if the next widget cannot quietly opt out
 * of it. These checks are what "opt out" looks like in source:
 *
 *   1. 收口 — nothing outside `src/client/ui/` imports a vendored BoardUI file
 *      directly. One import surface means one place to change when the vendor
 *      changes.
 *   2. No literal colour — no `#rrggbb`, `rgb(`, `oklch(` in widget code. Colour
 *      arrives through the semantic tokens in `theme.css`.
 *   3. Registration contract — every `registry.register` declares an `icon`, a
 *      `sizing` and `Content`.
 *
 *   node scripts/check-assets.mjs
 *   node scripts/check-assets.mjs --compiled   # also verify the compiled theme is current
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT = path.join(ROOT, 'src/client')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry)
    if (statSync(abs).isDirectory()) {
      if (entry === 'node_modules' || entry === 'generated') continue
      walk(abs, out)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(abs)
    }
  }
  return out
}

/** Vendored code is allowed to be vendored; everything else must go through the收口. */
function checkSingleEntry(files) {
  const failures = []
  for (const file of files) {
    const rel = path.relative(ROOT, file)
    if (rel.startsWith('src/client/ui/')) continue
    const source = readFileSync(file, 'utf8')
    const direct = [...source.matchAll(/from\s+['"]\.\/ui\/boardui\/[^'"]+['"]/g)]
    if (direct.length > 0) {
      failures.push(`${rel}: imports the vendored tree directly — use './ui/index.ts' (${direct[0][0]})`)
    }
  }
  return failures
}

const COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/gi

function checkNoLiteralColour(files) {
  const failures = []
  for (const file of files) {
    const rel = path.relative(ROOT, file)
    if (rel.startsWith('src/client/ui/boardui/')) continue // vendored, upstream colours stay
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(COLOUR)) {
      const lineStart = source.lastIndexOf('\n', match.index) + 1
      const lineEnd = source.indexOf('\n', match.index)
      const line = source.slice(lineStart, lineEnd < 0 ? undefined : lineEnd)
      // Inline SVG artwork is an image, not a theme decision. The data: prefix can
      // sit a few lines above the literal it opens, so look back a window.
      const window = source.slice(Math.max(0, match.index - 600), match.index)
      if (line.includes('data:image/svg+xml') || window.includes('data:image/svg+xml')) continue
      const number = source.slice(0, match.index).split('\n').length
      failures.push(`${rel}:${number}: literal colour ${match[0]} — use a semantic token`)
    }
  }
  return failures
}

/** The retired role vocabulary (0006). Geometry variables keep their --dsh- name. */
const RETIRED_TOKEN = /--dsh-(accent|warning|danger|positive|ramp|track|pill|hero|status-color)([a-z-]*)/g

function checkNoRetiredTokens(files) {
  const failures = []
  for (const file of files) {
    const rel = path.relative(ROOT, file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(RETIRED_TOKEN)) {
      const line = source.slice(0, match.index).split('\n').length
      failures.push(`${rel}:${line}: ${match[0]} was retired in 0006 — use a semantic token from theme.css`)
    }
  }
  return failures
}

function checkRegistrationContract(files) {
  const failures = []
  for (const file of files) {
    const rel = path.relative(ROOT, file)
    if (rel.startsWith('src/client/ui/')) continue
    // Only files that define widgets; registry plumbing lives elsewhere.
    if (!/-(widget|widgets)\.tsx$/.test(rel) && !rel.endsWith('widgets.tsx')) continue
    const source = readFileSync(file, 'utf8')
    let index = 0
    while (true) {
      index = source.indexOf('registry.register', index)
      if (index < 0) break
      // A registration block ends at the next `})` at the same nesting depth; good
      // enough for this file style, and it fails loudly rather than silently passing.
      const end = source.indexOf('\n  })\n', index)
      const block = source.slice(index, end < 0 ? index + 2000 : end)
      for (const field of ['icon:', 'sizing:', 'Content:']) {
        if (!block.includes(field)) failures.push(`${rel}: a registry.register block is missing ${field}`)
      }
      index = end < 0 ? index + 12 : end + 6
    }
  }
  return failures
}

/**
 * The host's token vocabulary is not the board's.
 *
 * The board used to read `var(--dsw-*)` from the host while also carrying BoardUI's
 * own tokens. Two vocabularies meant two palettes: cards ended up darker than the
 * page they sat on, and every new card had to guess which one to speak. The bridge
 * that translated them was removed with the last reader; this rule keeps it removed.
 */
function checkNoHostTokens(files) {
  const failures = []
  for (const file of files) {
    if (file.endsWith('.md')) continue
    const source = readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    for (const line of source.split('\n')) {
      if (line.includes('var(--dsw-') || line.includes('var(--dsw-')) {
        failures.push(`${rel}: host token "${line.trim().slice(0, 80)}" — use a board token from theme.css`)
      }
    }
  }
  return failures
}

export function runChecks({ compiled = false } = {}) {
  const files = walk(CLIENT)
  const groups = {
    'single entry point': checkSingleEntry(files),
    'no literal colour': checkNoLiteralColour(files),
    'registration contract': checkRegistrationContract(files),
    'retired token vocabulary': checkNoRetiredTokens(files),
    'no host token vocabulary': checkNoHostTokens(files),
  }
  const failures = Object.values(groups).flat()

  if (compiled) {
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-css.mjs'), '--check'], { cwd: ROOT, stdio: 'pipe' })
    } catch (error) {
      failures.push(`compiled theme is stale: run \`pnpm run build:css\`\n${error.stdout?.toString() ?? ''}`)
    }
  }

  return { groups, failures, scanned: files.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { groups, failures, scanned } = runChecks({ compiled: process.argv.includes('--compiled') })
  for (const [name, list] of Object.entries(groups)) {
    console.log(`${list.length === 0 ? 'PASS' : 'FAIL'}  ${name}${list.length === 0 ? '' : ` (${list.length})`}`)
    for (const line of list) console.log(`      ${line}`)
  }
  console.log(`\nscanned ${scanned} files`)
  if (failures.length > 0) {
    console.error(`\n${failures.length} asset-layer violation(s)`)
    process.exit(1)
  }
  console.log('asset layer is intact')
}
