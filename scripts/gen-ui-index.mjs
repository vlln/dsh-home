#!/usr/bin/env node
/**
 * Regenerate the generated half of `src/client/ui/index.ts`.
 *
 * The收口 has two parts: a hand-written one (card parts, viz, motion, `cx`) and a
 * generated one listing the vendored components that currently exist. Keeping the
 * list generated means `vendor` (full catalogue) and `prune` (packaging set) can
 * never leave a stale export behind.
 *
 *   node scripts/gen-ui-index.mjs           # write
 *   node scripts/gen-ui-index.mjs --check   # fail when stale
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UI = path.join(ROOT, 'src/client/ui')
const INDEX = path.join(UI, 'index.ts')
const BOARDUI = path.join(UI, 'boardui')

/** Modules that are implementation details of another component, never a surface. */
const INTERNAL = new Set(['hint-text', 'label', 'menu-styles', 'dropdown-menu-styles', 'template-copy', 'direction', 'chevrons'])

const START = '// <generated:surface>'
const END = '// </generated:surface>'

const files = existsSync(BOARDUI) ? readdirSync(BOARDUI).filter(name => name.endsWith('.tsx') || name.endsWith('.ts')) : []
const surface = files
  .map(name => name.replace(/\.(tsx?|ts)$/, ''))
  .filter(name => !INTERNAL.has(name))
  .sort()

const block = [START, ...surface.map(name => `export * from './boardui/${name}.tsx'`), END].join('\n')

const source = readFileSync(INDEX, 'utf8')
const start = source.indexOf(START)
const end = source.indexOf(END)
const next = start >= 0 && end > start
  ? source.slice(0, start) + block + source.slice(end + END.length)
  : `${source.trimEnd()}\n\n${block}\n`

if (process.argv.includes('--check')) {
  if (next !== source) {
    console.error('ui/index.ts surface is stale — run `pnpm run gen:ui`')
    process.exit(1)
  }
  console.log(`ui/index.ts surface is current (${surface.length} modules)`)
  process.exit(0)
}

if (next !== source) writeFileSync(INDEX, next)
console.log(`ui/index.ts surface: ${surface.length} modules`)
