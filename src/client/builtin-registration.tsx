/** Internal adapters: builtins use the same public registry; no business dispatch lives in the page. */
import { createContext, useContext, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { BUILTIN_WIDGETS, type WidgetActions, type WidgetProps } from './widgets.tsx'
import { registerActivityWidget } from './activity-widget.tsx'
import { registerPersonalWidgets } from './personal-widgets.tsx'
import { registerQuickWidget } from './quick-widget.tsx'
import { builtinPreview } from './widget-previews.tsx'
import { FocusQueue, FocusResume, type SessionStatusMap } from './focus.tsx'
import type { HomeStore } from './store.ts'
import type { Translate } from './format.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'

const Runtime = createContext<{
  store: HomeStore; t: Translate; actions: WidgetActions; statuses: SessionStatusMap; statusSource: 'runtime' | 'none'
} | null>(null)
const EMPTY: SessionStatusMap = new Map()
export function BuiltinProvider({ store, t, actions, useSessionStatus, children }: {
  store: HomeStore; t: Translate; actions: WidgetActions; children: ReactNode
  useSessionStatus?: (selector: (snapshot: SessionStatusMap) => unknown) => unknown
}) {
  const readStatus = useSessionStatus ?? ((selector: (snapshot: SessionStatusMap) => unknown) => selector(EMPTY))
  const statuses = readStatus(snapshot => snapshot) as SessionStatusMap
  return <Runtime.Provider value={{ store, t, actions, statuses, statusSource: useSessionStatus ? 'runtime' : 'none' }}>{children}</Runtime.Provider>
}
export function useBuiltin() {
  const runtime = useContext(Runtime)
  if (!runtime) throw new Error('Builtin widget requires its home runtime')
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot, runtime.store.getSnapshot)
  return { ...runtime, state }
}
function ResumeContent() {
  const { state, store, t, actions, statuses, statusSource } = useBuiltin()
  const [index, setIndex] = useState(0)
  return <FocusResume t={t} data={state.ledger} sessions={state.sessions} statuses={statuses}
    dismissed={state.prefs.dismissed} now={state.now} actions={actions} statusSource={statusSource} embedded
    index={index} onNext={() => setIndex(i => i + 1)} onDismiss={id => store.dismiss(id)} />
}
function QueueContent() {
  const { state, store, t, actions, statuses, statusSource } = useBuiltin()
  return <FocusQueue t={t} data={state.ledger} sessions={state.sessions} statuses={statuses}
    dismissed={state.prefs.dismissed} now={state.now} actions={actions} statusSource={statusSource} embedded
    onDismiss={id => store.dismiss(id)} />
}
export function registerBuiltins(registry: HomeWidgetRegistry, t: Translate): () => void {
  const disposers = BUILTIN_WIDGETS.map(widget => {
    function Content({ size }: WidgetContentProps) {
      const { state, t, actions, statuses, statusSource } = useBuiltin()
      const Body = widget.body
      const props: WidgetProps = { t, data: state.ledger, sessions: state.sessions, now: state.now, actions, size,
        statuses, statusSource, loading: state.loading, loadError: state.error !== null }
      return <Body {...props} />
    }
    return registry.register({
      typeId: `@vlln/dsh-home:${widget.id}`, apiVersion: 1, title: () => widget.title(t), description: () => t(`gallery.description.${widget.id}`),
      source: '@vlln/dsh-home', icon: widget.Glyph, Preview: builtinPreview(widget.id, t),
      defaults: { size: widget.defaultSize, height: widget.defaultHeight },
      configVersion: 1, defaultConfig: () => ({}), validateConfig: () => true, Content,
    })
  })
  for (const widget of [
    { id: 'resume', title: 'resume.eyebrow', size: 'm' as const, Content: ResumeContent },
    { id: 'queue', title: 'queue.title', size: 's' as const, Content: QueueContent },
  ]) disposers.push(registry.register({
    typeId: `@vlln/dsh-home:${widget.id}`, apiVersion: 1, title: () => t(widget.title as Parameters<Translate>[0]), description: () => t(`gallery.description.${widget.id}`),
    source: '@vlln/dsh-home', Preview: builtinPreview(widget.id, t), defaults: { size: widget.size, height: 4 }, configVersion: 1,
    defaultConfig: () => ({}), validateConfig: () => true, Content: widget.Content,
  }))
  disposers.push(registerActivityWidget(registry, t), registerPersonalWidgets(registry, t), registerQuickWidget(registry, t))
  return () => { for (const off of disposers.reverse()) off() }
}
