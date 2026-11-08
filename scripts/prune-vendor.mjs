#!/usr/bin/env node
/**
 * Drop vendored BoardUI files that nothing in the client uses, before packing.
 *
 * `files` in package.json ships `lib/`, so the tarball never carried the source
 * tree — but the repository did, and every `vendor` run brings it all back. A
 * source tree full of components nobody imports is how a vendored layer rots:
 * the next reader cannot tell what is load-bearing.
 *
 * Usage is decided by *names*, not by the index file: `ui/index.ts` is generated
 * from whatever modules exist, so following its re-exports would mark everything
 * reachable. Instead each vendored module's exported names are read from its own
 * source, and a name counts as used when a file outside `ui/` imports it from
 * `./ui/index.ts`.
 *
 *   node scripts/prune-vendor.mjs           # remove unused files
 *   node scripts/prune-vendor.mjs --check   # fail if anything is unused (CI)
 */
import { readFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT = path.join(ROOT, 'src/client')
const UI = path.join(CLIENT, 'ui')
const PRUNABLE = [path.join(UI, 'boardui'), path.join(UI, 'lib')]

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry)
    if (statSync(abs).isDirectory()) walk(abs, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(abs)
  }
  return out
}

const resolveImport = (from, spec) => {
  if (!spec.startsWith('.')) return null
  const base = path.resolve(path.dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Names a module offers through the收口. */
function exportedNames(file) {
  const source = readFileSync(file, 'utf8')
  const names = new Set()
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/g)) names.add(match[1])
  for (const match of source.matchAll(/export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/g)) names.add(match[1])
  return names
}

/** Every name the client asks for from the收口. */
function usedNames() {
  const used = new Set()
  for (const file of walk(CLIENT)) {
    if (file.startsWith(UI + path.sep)) continue
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'\.\/ui\/index\.ts'/g)) {
      for (const raw of match[1].split(',')) {
        const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()
        if (name !== '' && name !== undefined) used.add(name)
      }
    }
  }
  return used
}

/** Modules reachable *inside* ui/ from the used ones (their own imports). */
function reachable(seeds) {
  const seen = new Set()
  const queue = [...seeds]
  while (queue.length > 0) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    let source
    try { source = readFileSync(file, 'utf8') } catch { continue }
    for (const spec of [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1])) {
      const target = resolveImport(file, spec)
      if (target !== null && !seen.has(target)) queue.push(target)
    }
  }
  return seen
}

const prunable = PRUNABLE.flatMap(dir => (existsSync(dir) ? walk(dir) : []))
const used = usedNames()
const seeds = prunable.filter(file => [...exportedNames(file)].some(name => used.has(name)))
const reachableFiles = reachable(seeds)
const unused = prunable.filter(file => !reachableFiles.has(file))

const check = process.argv.includes('--check')
const rel = file => path.relative(ROOT, file)
if (unused.length === 0) {
  console.log(`vendored tree is minimal (${prunable.length} files, all reachable)`)
  process.exit(0)
}
if (check) {
  console.error(`${unused.length} unused vendored file(s) — run \`pnpm run prune:vendor\`:`)
  for (const file of unused) console.error(`  ${rel(file)}`)
  process.exit(1)
}

for (const file of unused) { rmSync(file); console.log(`  removed ${rel(file)}`) }
execFileSync(process.execPath, [path.join(ROOT, 'scripts/gen-ui-index.mjs')], { cwd: ROOT, stdio: 'inherit' })
console.log(`pruned ${unused.length} file(s)`)

// Pruning must leave a tree that still compiles; otherwise it removed something
// reachable through a path this script does not model.
try {
  execFileSync(path.join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit'], { cwd: ROOT, stdio: 'pipe' })
  console.log('typecheck still passes')
} catch (error) {
  console.error('typecheck failed after pruning — restore with `pnpm run vendor`\n')
  console.error(error.stdout?.toString() ?? '')
  process.exit(1)
}
