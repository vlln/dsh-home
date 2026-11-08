#!/usr/bin/env node
/**
 * Scaffold a builtin widget.
 *
 *   pnpm run new:widget -- stock-value --title "Stock value"
 *
 * Writes `src/client/<name>-widget.tsx` containing only the parts that are the
 * author's job — the data it reads, the figure it draws, the sentence its empty
 * state says. Type, colour, radius, spacing and motion come from `ui/`, so the
 * generated file has no style to copy and nothing to keep in sync.
 *
 * It deliberately does **not** edit `builtin-registration.tsx` or the locale
 * files: those are two-line edits the author should see in a diff, and the
 * printer below says exactly which lines to add.
 */
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const name = argv.find(arg => !arg.startsWith('--'))
const flag = key => { const i = argv.indexOf(`--${key}`); return i < 0 ? undefined : argv[i + 1] }

if (name === undefined || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('usage: pnpm run new:widget -- <kebab-name> [--title "Human title"] [--w 4] [--h 4]')
  process.exit(2)
}

const title = flag('title') ?? name.replace(/-/g, ' ')
const width = Number(flag('w') ?? 4)
const height = Number(flag('h') ?? 4)
const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
const pascal = camel[0].toUpperCase() + camel.slice(1)
const file = path.join(ROOT, `src/client/${name}-widget.tsx`)

if (existsSync(file)) {
  console.error(`${path.relative(ROOT, file)} already exists`)
  process.exit(1)
}

const source = `/**
 * ${title}。
 *
 * 这张卡只回答一个问题：______。数据从 \`useBuiltin()\` 的 state 取，图形从
 * \`ui/\` 取，样式一个都不要写——颜色、字号、圆角、间距、动效都由外壳和原语决定。
 *
 * @module @vlln/dsh-home/client/${name}-widget
 */

import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import { Button, CardBody, CardEmpty, CardHero, CardMeta, CardSkeleton } from './ui/index.ts'
import { IconBars } from './widget-glyphs.tsx'

export type ${pascal}Config = { enabled: boolean }

function default${pascal}Config(): ${pascal}Config {
  return { enabled: true }
}

function validate${pascal}Config(value: unknown): value is ${pascal}Config {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'enabled') && typeof config.enabled === 'boolean'
}

export function ${pascal}Content(props: WidgetContentProps<${pascal}Config>): ReactNode {
  const { t, state } = useBuiltin()
  // Preview state must not touch live data: it comes from the registry entry below.
  const loading = props.preview === undefined && state.ledger === null
  if (loading) return <CardSkeleton />
  const value = 0 // TODO: read the number this card is about.
  return <CardBody>
    {value === 0
      ? <CardEmpty title={t('widget.${name}.empty')} className="flex-1" />
      : <>
        <CardHero value={value} />
        <CardMeta>{t('widget.${name}.meta')}</CardMeta>
      </>}
    {/* A card may own at most one primary action; everything else is a ghost button. */}
    <div className="mt-auto flex items-center gap-1">
      <Button variant="ghost" size="xs" disabled={props.saveConfig === undefined}
        onClick={() => { void props.saveConfig?.({ enabled: !props.config.enabled }) }}>
        {t('widget.${name}.action')}
      </Button>
    </div>
  </CardBody>
}

export function register${pascal}Widget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<${pascal}Config>({
    typeId: '@vlln/dsh-home:${name}', apiVersion: 1,
    title: () => t('widget.${name}.title'), description: () => t('widget.${name}.description'),
    source: '@vlln/dsh-home', icon: IconBars,
    preview: { config: default${pascal}Config },
    sizing: { default: { w: ${width}, h: ${height} }, supported: [{ w: ${width}, h: ${height} }] },
    configVersion: 1, defaultConfig: default${pascal}Config,
    validateConfig: (config): config is ${pascal}Config => validate${pascal}Config(config),
    Content: ${pascal}Content,
  })
}
`

await writeFile(file, source)

console.log(`created ${path.relative(ROOT, file)}

Three edits left, all of them visible in a diff:

1. src/client/builtin-registration.tsx
   import { register${pascal}Widget } from './${name}-widget.tsx'
   …and add register${pascal}Widget(registry, t) to the disposers.push(...) list.

2. src/client/locales.ts — add, to both the zh and en tables:
   'widget.${name}.title': '${title}',
   'widget.${name}.description': '…',
   'widget.${name}.empty': '…',
   'widget.${name}.meta': '…',
   'widget.${name}.action': '…',

3. pnpm run check:assets && pnpm run typecheck && pnpm test && pnpm run build

Then look at the card in the isolated host (it appears in the widget library).`)
