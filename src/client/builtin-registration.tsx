/** Internal adapters: builtins use the same public registry; no business dispatch lives in the page. */
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { BUILTIN_WIDGETS, type WidgetActions, type WidgetProps } from './widgets.tsx'
import { registerActivityWidget } from './activity-widget.tsx'
import { registerActiveWidget } from './active-widget.tsx'
import { registerPersonalWidgets } from './personal-widgets.tsx'
import { registerQuickWidget } from './quick-widget.tsx'
import { registerTodoWidget } from './todo-widget.tsx'
import { registerPlanWidget } from './plan-widget.tsx'
import { registerCalendarWidget } from './calendar-widget.tsx'
import { registerHabitWidget } from './habit-widget.tsx'
import { registerTimerWidget } from './timer-widget.tsx'
import { registerPomodoroWidget } from './pomodoro-widget.tsx'
import { registerCountdownWidget } from './countdown-widget.tsx'
import { registerUsageWidget } from './usage-widget.tsx'
import { registerQuoteWidget } from './quote-widget.tsx'
import { registerPictureWidget } from './picture-widget.tsx'
import { registerBalanceWidget } from './balance-widget.tsx'
import { registerSessionStatusWidget } from './session-status-widget.tsx'
import type { SessionStatusMap } from './session-model.ts'
import type { HomeState, HomeStore } from './store.ts'
import { emptyLayout, emptyPrefs } from './api.ts'
import type { LedgerSnapshot } from './api.ts'
import type { Translate } from './format.ts'
import type { JsonValue, WidgetContentProps, WidgetSizing } from './widget-contract.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'

const Runtime = createContext<{
  store: Pick<HomeStore, 'getSnapshot' | 'subscribe' | 'dismiss'>; t: Translate; actions: WidgetActions; statuses: SessionStatusMap; statusSource: 'runtime' | 'none'
  /** 当前界面语言（`zh-CN` / `en`…），供按语言取内置文本的组件使用。 */
  language: string
} | null>(null)
const EMPTY: SessionStatusMap = new Map()
export function BuiltinProvider({ store, t, actions, useSessionStatus, language = 'en', children }: {
  store: HomeStore; t: Translate; actions: WidgetActions; children: ReactNode
  useSessionStatus?: (selector: (snapshot: SessionStatusMap) => unknown) => unknown
  language?: string
}) {
  const readStatus = useSessionStatus ?? ((selector: (snapshot: SessionStatusMap) => unknown) => selector(EMPTY))
  const statuses = readStatus(snapshot => snapshot) as SessionStatusMap
  return <Runtime.Provider value={{ store, t, actions, statuses, statusSource: useSessionStatus ? 'runtime' : 'none', language }}>{children}</Runtime.Provider>
}
const PREVIEW_NOW = Date.UTC(2026, 9, 20, 10, 24)
const inert = () => {}
const PREVIEW_ACTIONS: WidgetActions = {
  openSession: inert, startSession: inert, leave: inert,
  startTask: async () => {}, pickDirectory: async () => null,
}

/** Synthetic data only. Never derives from the live store, runtime session catalog or user config. */
export function builtinPreviewData(t: Translate): JsonValue {
  const sessions = [0, 1, 2].map(index => ({
    id: `sample-${index}`, cwd: `sample/${['project', 'review', 'plan'][index]}`,
    createdAt: PREVIEW_NOW - 7_200_000, firstAt: PREVIEW_NOW - 3_600_000,
    lastAt: PREVIEW_NOW - index * 600_000, turns: 5 - index, runMs: 600_000,
    activeMs: 1_500_000, todayMs: 1_500_000, todayTurns: 5 - index,
    clusters: [[PREVIEW_NOW - (index + 1) * 1_800_000, PREVIEW_NOW - index * 1_800_000 - 300_000]],
    lastUserText: t('gallery.sample.continue'),
  }))
  const totals = { activeMs: 4_500_000, runMs: 1_800_000, turns: 12, sessions: 3 }
  return {
    now: PREVIEW_NOW,
    nativePins: { ids: ['sample-0', 'sample-1', 'sample-2'], archived: [], status: 'ready' },
    ledger: { generatedAt: PREVIEW_NOW, scannedAt: PREVIEW_NOW, scanning: false, progress: { done: 3, total: 3 },
      sessionCount: 3, today: totals, week: totals, sessions,
      days: Array.from({ length: 14 }, (_, i) => ({ key: new Date(PREVIEW_NOW - (13 - i) * 86_400_000).toISOString().slice(0, 10),
        activeMs: (i % 5 + 1) * 900_000, runMs: 600_000, turns: i + 1, sessions: 2 })),
    },
    sessions: Object.fromEntries(sessions.map((session, i) => [session.id, { id: session.id, cwd: session.cwd,
      title: t(['gallery.sample.project', 'gallery.sample.review', 'gallery.sample.plan'][i]), running: i === 0, updatedAt: session.lastAt }])),
    statuses: [['sample-0', { running: true }], ['sample-1', { pendingInteraction: 'approval' }], ['sample-2', { completionUnread: true }]],
  }
}

/** An isolated runtime shadows any surrounding live provider. No HomeStore is constructed. */
export function BuiltinPreviewProvider({ t, data, language = 'en', children }: { t: Translate; data: JsonValue; language?: string; children: ReactNode }) {
  const runtime = useMemo(() => {
    // Only our private fixture producer supplies runtime fields. Third-party preview JSON is not a HomeState.
    const sample: Record<string, JsonValue> = data !== null && !Array.isArray(data) && typeof data === 'object' ? data : {}
    const hasLedger = sample.ledger !== null && typeof sample.ledger === 'object' && !Array.isArray(sample.ledger)
      && Array.isArray(sample.ledger.sessions) && Array.isArray(sample.ledger.days) && sample.ledger.today !== undefined
    const state: HomeState = {
      ledger: hasLedger ? sample.ledger as unknown as LedgerSnapshot : null,
      layout: emptyLayout(), prefs: emptyPrefs(), prefsLoaded: false, instances: [],
      workbenchLoaded: false, workbenchBusy: false, storage: { writable: false, status: 'read-only', error: null },
      sessions: hasLedger && sample.sessions !== null && typeof sample.sessions === 'object' && !Array.isArray(sample.sessions)
        ? sample.sessions as unknown as HomeState['sessions'] : {},
      nativePins: hasLedger && sample.nativePins !== null && typeof sample.nativePins === 'object' && !Array.isArray(sample.nativePins)
        ? sample.nativePins as unknown as HomeState['nativePins'] : { ids: [], archived: [], status: 'ready' },
      actionRevision: 0, loading: false, refreshing: false, error: null, lastLoadedAt: null,
      now: typeof sample.now === 'number' ? sample.now : PREVIEW_NOW,
    }
    const statuses: SessionStatusMap = new Map()
    if (hasLedger && Array.isArray(sample.statuses)) for (const entry of sample.statuses) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && entry[1] !== null && typeof entry[1] === 'object' && !Array.isArray(entry[1])) {
        statuses.set(entry[0], entry[1] as unknown as Parameters<SessionStatusMap['set']>[1])
      }
    }
    return { store: { getSnapshot: () => state, subscribe: () => inert, dismiss: inert }, t,
      actions: PREVIEW_ACTIONS, statuses, statusSource: hasLedger ? 'runtime' as const : 'none' as const, language }
  }, [t, data, language])
  return <Runtime.Provider value={runtime}>{children}</Runtime.Provider>
}

export function useBuiltin() {
  const runtime = useContext(Runtime)
  if (!runtime) throw new Error('Builtin widget requires its home runtime')
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot, runtime.store.getSnapshot)
  return { ...runtime, state }
}
const BUILTIN_SIZING: Record<string, WidgetSizing> = {
  pinned: { default: { w:4,h:8 }, supported: [{w:4,h:8},{w:8,h:8}] },
  recent: { default: { w:8,h:8 }, supported: [{w:4,h:8},{w:8,h:8},{w:8,h:10},{w:12,h:10}] },
  today: { default: { w:8,h:4 }, supported: [{w:4,h:4},{w:8,h:4}] },
  areas: { default: { w:4,h:6 }, supported: [{w:4,h:6},{w:8,h:6},{w:8,h:8}] },
  rhythm: { default: { w:8,h:4 }, supported: [{w:4,h:4},{w:8,h:4},{w:12,h:6}] },
}
export function registerBuiltins(registry: HomeWidgetRegistry, t: Translate): () => void {
  const disposers = BUILTIN_WIDGETS.map(widget => {
    function Content({ size, width, height }: WidgetContentProps) {
      const { state, t, actions, statuses, statusSource } = useBuiltin()
      const Body = widget.body
      const props: WidgetProps = { t, data: state.ledger, sessions: state.sessions, now: state.now, actions, size, width, height,
        statuses, statusSource, loading: state.loading, loadError: state.error !== null }
      return <Body {...props} />
    }
    return registry.register({
      typeId: `@vlln/dsh-home:${widget.id}`, apiVersion: 1, title: () => widget.title(t), description: () => t(`gallery.description.${widget.id}`),
      source: '@vlln/dsh-home', icon: widget.Glyph, preview: { data: builtinPreviewData(t) },
      sizing: BUILTIN_SIZING[widget.id],
      configVersion: 1, defaultConfig: () => ({}), validateConfig: () => true, Content,
    })
  })
  disposers.push(registerActivityWidget(registry, t), registerActiveWidget(registry, t), registerPersonalWidgets(registry, t), registerQuickWidget(registry, t), registerSessionStatusWidget(registry, t), registerTodoWidget(registry, t), registerPlanWidget(registry, t), registerCalendarWidget(registry, t), registerHabitWidget(registry, t), registerTimerWidget(registry, t), registerPomodoroWidget(registry, t), registerCountdownWidget(registry, t), registerUsageWidget(registry, t), registerQuoteWidget(registry, t), registerPictureWidget(registry, t), registerBalanceWidget(registry, t))
  return () => { for (const off of disposers.reverse()) off() }
}
