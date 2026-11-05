/**
 * dsh-home 的浏览器 half：首页面板 + 侧栏条目 + 「点左上角 logo 回首页」。
 *
 * 三件事：
 * 1. **面板**：往 `main` keyed 槽注册 `key = 'home'`，并声明子槽 `home.widget`
 *    （list/root），第三方插件把自己的卡片注册进来；面板按用户布局逐个渲染
 *    （`renderSlot(..., { only: id })`，与官方侧栏 panellist 同一用法）。
 * 2. **侧栏条目**：`sidebar.panellist` 一个图标行（给不点 logo 的人、也给快捷键留位）。
 * 3. **logo 入口**：不去占 `sidebar.brand.mark`——那个槽被官方品牌包占着（同优先级
 *    再注册会抛），占低优先级又会把官方 logo 的视觉换掉。改为在捕获阶段识别「展开态
 *    品牌按钮」（它内部有 `brandIdentity`，折叠态是 `railMark`），命中就拦下官方
 *    的 new-session 点击并打开首页。识别失败时什么都不做 ⇒ 退化回官方行为，
 *    不会把折叠态的展开按钮弄坏。
 *
 * @module @vlln/dsh-home/client
 */

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { HomePage } from './page.tsx'
import { HomeWidgetRegistry } from './widget-registry.ts'
import { BuiltinProvider, registerBuiltins } from './builtin-registration.tsx'
import type { WidgetContentProps } from './widget-contract.ts'
import { HomeStore } from './store.ts'
import { injectStyles } from './styles.ts'
import { en, zh, type HomeLocaleKey } from './locales.ts'
import { requestRescan, type WidgetSize } from './api.ts'
import type { WidgetActions } from './widgets.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 首页文案。 */
    home: HomeLocaleKey
  }
  interface SlotMap {
    /** 首页仪表盘的小组件（第三方贡献）。 */
    'home.widget': { kind: 'list'; scope: 'root'; owner: { size: WidgetSize } }
  }
}

/** 文案命名空间。 */
export const NS = 'home'

/** 面板 key：同时是侧栏条目的 id。 */
export const PANEL_ID = 'home'

/** 客户端严格注入：四件都是外壳核心服务。 */
export const inject = ['slots', 'locale', 'layout']

/** 侧栏/品牌用的首页图形（14/16/18 自适应）。 */
function HomePanelIcon({ size = 16 }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="2.6" width="5" height="4.6" rx="1.5" fill="currentColor" />
      <rect x="8.9" y="2.6" width="4.9" height="2" rx="1" fill="currentColor" opacity="0.62" />
      <rect x="8.9" y="6.2" width="4.9" height="1.4" rx="0.7" fill="currentColor" opacity="0.62" />
      <rect x="2.2" y="9" width="11.6" height="4.2" rx="1.6" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** 把槽标签（字符串或取词函数）读成可展示的标题。 */
function labelText(label: SlotLabel | undefined, fallback: string): string {
  if (typeof label === 'string' && label !== '') return label
  if (typeof label === 'function') {
    try {
      const value = (label as () => unknown)()
      if (typeof value === 'string' && value !== '') return value
    } catch {
      // 取词函数依赖的 locale 还没就绪：退回 id。
    }
  }
  return fallback
}

type LegacyRenderer = (name: string, props?: Record<string, unknown>, options?: Record<string, unknown>) => ReactNode
const LegacyRenderContext = createContext<LegacyRenderer>(() => null)
/** Compatibility bridge only; v1 extensions register through the injected homeWidgets service. */
function bridgeLegacySlots(ctx: Context, registry: HomeWidgetRegistry): () => void {
  const entries = new Map<string, { entry: unknown; off: () => void }>()
  const sync = (): void => {
    const present = new Set<string>()
    for (const entry of ctx.slots.entries('home.widget')) {
      const id = entry.options.id
      if (typeof id !== 'string' || id === '' || registry.get(`@vlln/dsh-home:${id}`)) continue
      present.add(id)
      if (entries.has(id)) continue
      const typeId = `legacy:${id}`
      const Content = ({ size }: WidgetContentProps) => {
        const renderSlot = useContext(LegacyRenderContext)
        return renderSlot('home.widget', { size }, { only: id })
      }
      try {
        const off = registry.register({ typeId, apiVersion: 1,
          title: () => labelText(entry.options.label, id), source: 'home.widget (legacy)',
          configVersion: 1, defaultConfig: () => ({}), validateConfig: () => true, Content,
        }, { internalLegacyTypeId: true })
        entries.set(id, { entry, off })
      } catch (error) {
        console.error('[dsh-home] legacy widget registration failed', id, error)
      }
    }
    for (const [id, record] of entries) if (!present.has(id)) { record.off(); entries.delete(id) }
  }
  const off = ctx.slots.subscribe('home.widget', sync)
  sync()
  return () => { off(); for (const record of entries.values()) record.off(); entries.clear() }
}

/**
 * 点左上角 logo 打开首页。
 *
 * 只在「展开态品牌按钮」上生效：官方那个 `<button aria-label="New Session">` 里
 * 包着 `brandIdentity`；折叠态 rail 的 logo 包在 `railMark` 里，是"展开侧栏"按钮，
 * 必须原样放行。捕获阶段拦下（React 的委托监听在容器上，捕获更早），并
 * `stopPropagation` 让官方的 startSession 不执行。
 * @returns 撤销函数
 */
function installBrandEntry(ctx: Context): () => void {
  if (typeof document === 'undefined') return () => {}
  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button')
    if (button === null) return
    const expanded = button.querySelector('[class*="brandIdentity"]')
    if (expanded === null) return
    event.preventDefault()
    event.stopPropagation()
    ctx.layout.selectPanel(PANEL_ID as never)
  }
  document.addEventListener('click', onClick, true)
  return () => { document.removeEventListener('click', onClick, true) }
}

/**
 * 浏览器端 entry。
 * @param ctx 客户端上下文
 */
export function apply(ctx: Context): void {
  ctx.effect(injectStyles, 'dsh-home: styles')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-home: dictionaries')

  const store = new HomeStore()
  ctx.effect(() => () => { store.dispose() }, 'dsh-home: store')

  /** 导航动作先占位，服务到位后就地替换（面板可能比 ui-workspace 先挂）。 */
  const navigation = {
    openSession: (_id: string) => {},
    startSession: () => {},
  }
  const actions: WidgetActions = {
    openSession: id => navigation.openSession(id),
    startSession: () => navigation.startSession(),
    leave: () => { ctx.layout.selectPanel(null) },
  }

  ctx.inject(['uiWorkspace'], (scoped) => {
    const workspace = scoped.get('uiWorkspace')
    if (workspace === undefined) return
    navigation.openSession = id => workspace.openSession(id)
    navigation.startSession = () => workspace.startSession()
    scoped.effect(() => () => {
      navigation.openSession = () => {}
      navigation.startSession = () => {}
      store.notifyActionsChanged()
    }, 'dsh-home: release navigation')
  })

  ctx.inject(['uiWorkspace', 'workspaces'], (scoped) => {
    const workspace = scoped.get('uiWorkspace')
    const workspaces = scoped.get('workspaces')
    if (workspace === undefined || workspaces === undefined) return
    let active = true
    actions.pickDirectory = () => workspace.pickDirectory()
    actions.startTask = async ({ cwd, prompt, signal }) => {
      const target = cwd === undefined ? undefined : await workspaces.create({ path: cwd })
      if (!active || signal?.aborted) return
      workspace.startSession(target?.workspaceId, { prompt, whenDraftExists: 'append' })
    }
    store.notifyActionsChanged()
    scoped.effect(() => () => {
      active = false
      delete actions.startTask
      delete actions.pickDirectory
      store.notifyActionsChanged()
    }, 'dsh-home: task navigation')
  })

  ctx.inject(['sessions'], (scoped) => {
    const sessions = scoped.get('sessions')
    if (sessions === undefined) return
    scoped.effect(() => {
      store.attachSessions(sessions.list)
      return () => { store.detachSessions() }
    }, 'dsh-home: session catalog')
  })

  const registry = new HomeWidgetRegistry()
  ctx.provide('homeWidgets', registry)
  ctx.effect(() => registerBuiltins(registry, (key, params) => ctx.locale.bind(NS)(key as HomeLocaleKey, params)), 'dsh-home: builtins')
  ctx.effect(() => bridgeLegacySlots(ctx, registry), 'dsh-home: legacy widget bridge')
  ctx.effect(() => registry.subscribe(() => store.reconcileDefinitions(registry)), 'dsh-home: config migration')
  store.reconcileDefinitions(registry)
  function Page(pageProps: Parameters<typeof HomePage>[0] & { renderSlot: LegacyRenderer }) {
    return <LegacyRenderContext.Provider value={pageProps.renderSlot}>
      <BuiltinProvider store={store} t={pageProps.t} actions={actions} useSessionStatus={pageProps.useSessionStatus}>
        <HomePage {...pageProps} />
      </BuiltinProvider>
    </LegacyRenderContext.Provider>
  }

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID as never,
    locale: NS,
    children: {
      'home.widget': { kind: 'list', scope: 'root' },
    },
    inject: () => ({
      store,
      registry,
      actions,
      locale: () => ctx.locale.getSnapshot().active,
      rescan: () => { void requestRescan().then(() => store.refresh()).catch(() => {}) },
    }),
  }, Page as never))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID as never,
    order: -10,
    label: () => ctx.locale.bind(NS)('panel.title'),
    locale: NS,
  }, HomePanelIcon as never))

  ctx.effect(() => installBrandEntry(ctx), 'dsh-home: brand entry')
}
