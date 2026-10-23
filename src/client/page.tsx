/**
 * 首页面板（`main` 槽，key = `home`）。
 *
 * 两块，都可排序（拖拽自 `reorder.tsx`，window 级监听 + 保留落点 + 边缘自动滚动）：
 * - **三件事**（`focus.tsx`）：回到现场 / 在等我 / 今天，纵向排列，顺序存在 `layout.focusOrder`；
 * - **更多数据与小组件**（opt-in）：网格，顺序/尺寸/隐藏存在 `layout` 的其余字段。
 *
 * 拖拽在阅读态就能用（把手常显），编辑态只负责尺寸 / 隐藏 / 清单 / 重置。
 * 记忆放在 `prefs`：`lastSeenAt` 支持"自上次以来"，`dismissed` 让"看过了"不等于
 * "永远别看"（会话有新活动就复活）。
 *
 * @module @vlln/dsh-home/client/page
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { formatAgo, formatDay, formatDuration, type Translate } from './format.ts'
import { BUILTIN_WIDGETS, type WidgetActions, type WidgetProps } from './widgets.tsx'
import { FocusQueue, FocusResume, FocusToday, type SessionStatusMap } from './focus.tsx'
import { CardBoundary } from './boundary.tsx'
import { DragHandle, useReorder } from './reorder.tsx'
import type { HomeStore } from './store.ts'
import type { WidgetSize } from './api.ts'

/** 一个 widget 的元信息（内置或外部贡献）。 */
export interface WidgetMeta {
  id: string
  order: number
  defaultSize: WidgetSize
  title: string
  Glyph?: () => ReactNode
  builtin?: (typeof BUILTIN_WIDGETS)[number]
}

/** 外部 widget 列表的可订阅来源（槽注册会实时变化）。 */
export interface WidgetSource {
  getSnapshot: () => WidgetMeta[]
  subscribe: (listener: () => void) => () => void
}

/** 面板组件 props。 */
export interface HomePageProps {
  t: Translate
  renderSlot: (name: string, props?: Record<string, unknown>, options?: Record<string, unknown>) => ReactNode
  store: HomeStore
  widgets: WidgetSource
  actions: WidgetActions
  locale: () => string
  rescan: () => void
  /** 官方 sessionStatus 根钩子（缺席时队列为空）。 */
  useSessionStatus?: (selector: (snapshot: SessionStatusMap) => unknown) => unknown
}

const EMPTY_STATUSES: SessionStatusMap = new Map()

/** 「三件事」的固定成员与默认顺序。 */
const FOCUS_FALLBACK = ['resume', 'queue', 'today']

/** 固定在三件事里、不进网格的内置卡。 */
const FOCUS_IDS = new Set(['today'])

function sizeLabel(size: WidgetSize, t: Translate): string {
  return t(`edit.size.${size}`)
}

function RefreshGlyph({ spinning }: { spinning: boolean }) {
  return (
    <svg className={spinning ? 'dsh-spin' : undefined} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.5-3.57M13 3v2.6h-2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease-out' }}
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FocusSkeleton() {
  return (
    <div className="dsh-focus-stack" aria-hidden="true">
      <div className="dsh-focus dsh-w-skeleton">
        <div className="dsh-skeleton" style={{ width: '18%' }} />
        <div className="dsh-skeleton" style={{ width: '52%', height: 24 }} />
        <div className="dsh-skeleton" style={{ width: '76%' }} />
      </div>
      <div className="dsh-w dsh-w-skeleton">
        <div className="dsh-skeleton" style={{ width: '26%' }} />
        <div className="dsh-skeleton" style={{ width: '64%' }} />
      </div>
    </div>
  )
}

/** 一张卡的正文：必须作为**子组件**渲染，错误边界才捕得到。 */
function WidgetBody({ meta, widgetProps, renderSlot, size }: {
  meta: WidgetMeta
  widgetProps: WidgetProps
  renderSlot: HomePageProps['renderSlot']
  size: WidgetSize
}): ReactNode {
  if (meta.builtin === undefined) return renderSlot('home.widget', { size }, { only: meta.id })
  const Body = meta.builtin.body
  return <Body {...widgetProps} />
}

/**
 * 渲染首页。
 * @param props 面板 props
 */
export function HomePage(props: HomePageProps): ReactNode {
  const { t, store, renderSlot, widgets, actions, locale, rescan } = props
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const external = useSyncExternalStore(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot)

  // 官方根钩子：待审批 / 跑完没看。缺席时用常量 Map 兜底（同一个调用点，不条件调用）。
  const readStatus = props.useSessionStatus
    ?? ((selector: (snapshot: SessionStatusMap) => unknown) => selector(EMPTY_STATUSES))
  const statuses = readStatus(snapshot => snapshot) as SessionStatusMap

  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resumeIndex, setResumeIndex] = useState(0)
  const [sinceCount, setSinceCount] = useState<number | null>(null)
  const seenRef = useRef(false)

  useEffect(() => { void store.refresh() }, [store])

  // "自上次以来"：只在拿到偏好与数据后算一次，然后把这次看到的时间记下来。
  useEffect(() => {
    if (seenRef.current || state.ledger === null) return
    const previous = state.prefs.lastSeenAt
    if (previous !== null) {
      const count = state.ledger.sessions.filter(session => (
        session.parentSessionId === undefined && session.turns > 0 && session.lastAt > previous
      )).length
      setSinceCount(count)
    }
    seenRef.current = true
    store.markSeen()
  }, [state.ledger, state.prefs.lastSeenAt, store])

  useEffect(() => {
    if (!confirmReset) return
    const timer = setTimeout(() => { setConfirmReset(false) }, 4000)
    return () => { clearTimeout(timer) }
  }, [confirmReset])

  const gridMetas = useMemo(() => {
    const list: WidgetMeta[] = BUILTIN_WIDGETS
      .filter(widget => !FOCUS_IDS.has(widget.id))
      .map(widget => ({
        id: widget.id,
        order: widget.order,
        defaultSize: widget.defaultSize,
        title: widget.title(t),
        Glyph: widget.Glyph,
        builtin: widget,
      }))
    for (const widget of external) {
      if (list.some(meta => meta.id === widget.id)) continue
      list.push({ ...widget, title: widget.title === '' ? t('widget.unknown') : widget.title })
    }
    return list.sort((left, right) => left.order - right.order)
  }, [external, t])

  const fallbackOrder = useMemo(() => gridMetas.map(meta => meta.id), [gridMetas])
  const order = store.ordered(fallbackOrder)
  const visible = order.filter(id => !state.layout.hidden.includes(id))
  const hiddenCount = order.length - visible.length
  const focusOrder = store.orderedFocus(FOCUS_FALLBACK)

  const commitGrid = useCallback((id: string, target: string, side: 'before' | 'after') => {
    store.moveRelative(id, target, side, fallbackOrder)
  }, [fallbackOrder, store])
  const commitFocus = useCallback((id: string, target: string, side: 'before' | 'after') => {
    store.moveFocusRelative(id, target, side, FOCUS_FALLBACK)
  }, [store])

  const gridDrag = useReorder('data-widget-id', commitGrid)
  const focusDrag = useReorder('data-focus-id', commitFocus)

  const nudge = useCallback((id: string, delta: number, focus: boolean) => {
    const current = focus ? store.orderedFocus(FOCUS_FALLBACK) : store.ordered(fallbackOrder)
    const index = current.indexOf(id)
    const target = current[index + delta]
    if (target === undefined) return
    const after = current[index + delta + 1]
    if (focus) {
      store.moveFocusRelative(id, delta < 0 ? target : after ?? target, delta < 0 || after !== undefined ? 'before' : 'after', FOCUS_FALLBACK)
      return
    }
    store.moveBefore(id, delta < 0 ? target : after, fallbackOrder)
  }, [fallbackOrder, store])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (gridDrag.dragging !== null) { gridDrag.cancel(); return }
      if (focusDrag.dragging !== null) { focusDrag.cancel(); return }
      if (trayOpen) { setTrayOpen(false); return }
      if (editing) { setEditing(false); setConfirmReset(false); return }
      if (expanded) setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [editing, expanded, focusDrag, gridDrag, trayOpen])

  const data = state.ledger
  const focusProps = {
    t,
    data,
    sessions: state.sessions,
    statuses,
    dismissed: state.prefs.dismissed,
    now: state.now,
    actions,
    statusSource: props.useSessionStatus === undefined ? 'none' as const : 'runtime' as const,
  }
  const showSkeleton = data === null && state.loading && state.error === null
  const todayLabel = data === null
    ? undefined
    : (data.today.activeMs === 0 ? t('panel.notStarted') : t('panel.today', { dur: formatDuration(data.today.activeMs, t) }))

  const dismiss = useCallback((id: string) => { store.dismiss(id) }, [store])

  const focusHandle = (id: string): ReactNode => (
    <DragHandle
      label={t('edit.drag')}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        focusDrag.begin(id)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') { event.preventDefault(); nudge(id, -1, true) }
        if (event.key === 'ArrowDown') { event.preventDefault(); nudge(id, 1, true) }
      }}
    />
  )

  return (
    <div className="dsh-home">
      <div className="dsh-home-inner">
        <div className="dsh-home-head">
          <div className="dsh-home-heading">
            <div className="dsh-home-title-row">
              <h1 className="dsh-home-title">{t('panel.title')}</h1>
              <button
                type="button"
                className="dsh-icon-button"
                aria-label={t('action.refresh')}
                title={t('action.refresh')}
                onClick={() => { void store.refresh() }}
              >
                <RefreshGlyph spinning={state.refreshing} />
              </button>
              <span className="dsh-home-updated">
                {state.lastLoadedAt === null
                  ? t('summary.scanning')
                  : t('summary.updated', { time: formatAgo(state.lastLoadedAt, state.now, t) })}
              </span>
            </div>
            <div className="dsh-home-sub" aria-live="polite">
              <span>{formatDay(state.now, locale())}</span>
              {todayLabel !== undefined && (
                <>
                  <span className="dsh-home-dot" aria-hidden="true" />
                  <span>{todayLabel}</span>
                </>
              )}
              {sinceCount !== null && sinceCount > 0 && (
                <>
                  <span className="dsh-home-dot" aria-hidden="true" />
                  <span>{t('panel.since', { count: sinceCount })}</span>
                </>
              )}
            </div>
          </div>
          <div className="dsh-home-actions" role="group" aria-label={t('aria.actions')}>
            <Button variant="primary" size="sm" onClick={() => { actions.startSession() }}>
              {t('action.newSession')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { actions.leave() }}>
              {t('action.back')}
            </Button>
          </div>
        </div>

        {state.error !== null && (
          <div className="dsh-error" role="alert">
            <span>{t('error.load')}</span>
            <Button variant="ghost" size="sm" onClick={() => { void store.refresh() }}>
              {t('error.retry')}
            </Button>
          </div>
        )}

        {showSkeleton ? <FocusSkeleton /> : (
          <div className="dsh-focus-stack">
            {focusOrder.map((id) => {
              const dragging = focusDrag.dragging === id
              const drop = focusDrag.dropTarget === id ? focusDrag.dropSide ?? 'true' : 'false'
              const common = {
                key: id,
                className: 'dsh-focus-item',
                'data-focus-id': id,
                'data-dragging': dragging ? 'true' : 'false',
                'data-drop': drop,
              } as const
              if (id === 'resume') {
                return (
                  <div {...common}>
                    <CardBoundary fallback={<div className="dsh-error">{t('error.card')}</div>}>
                      <FocusResume
                        {...focusProps}
                        index={resumeIndex}
                        onNext={() => { setResumeIndex(index => index + 1) }}
                        onDismiss={dismiss}
                        handle={focusHandle(id)}
                      />
                    </CardBoundary>
                  </div>
                )
              }
              if (id === 'queue') {
                return (
                  <div {...common}>
                    <CardBoundary fallback={<div className="dsh-error">{t('error.card')}</div>}>
                      <FocusQueue {...focusProps} onDismiss={dismiss} handle={focusHandle(id)} />
                    </CardBoundary>
                  </div>
                )
              }
              if (id === 'today') {
                return (
                  <div {...common}>
                    <CardBoundary fallback={<div className="dsh-error">{t('error.card')}</div>}>
                      <FocusToday {...focusProps} handle={focusHandle(id)} />
                    </CardBoundary>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}

        <button
          type="button"
          className="dsh-expand"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded)
            if (expanded) { setEditing(false); setTrayOpen(false) }
          }}
        >
          <span>{expanded ? t('expand.hide') : t('expand.show', { count: Math.max(0, gridMetas.length - hiddenCount) })}</span>
          <Chevron open={expanded} />
        </button>

        {expanded && (
          <>
            <div className="dsh-edit-bar">
              <span className="dsh-edit-hint">{t('edit.hint')}</span>
              <div className="dsh-edit-actions">
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={editing}
                  onClick={() => {
                    setEditing(!editing)
                    if (editing) { setTrayOpen(false); setConfirmReset(false) }
                  }}
                >
                  {editing ? t('action.done') : t('action.edit')}
                </Button>
                {editing && (
                  <>
                    <Button
                      variant={trayOpen ? 'outline' : 'ghost'}
                      size="sm"
                      aria-expanded={trayOpen}
                      onClick={() => { setTrayOpen(!trayOpen) }}
                    >
                      {hiddenCount > 0 ? t('action.widgetsCount', { count: hiddenCount }) : t('action.widgets')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={confirmReset ? { color: 'var(--dsw-alias-state-error-primary)' } : undefined}
                      onClick={() => {
                        if (!confirmReset) { setConfirmReset(true); return }
                        store.reset()
                        setConfirmReset(false)
                      }}
                    >
                      {confirmReset ? t('action.resetConfirm') : t('action.reset')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={rescan}>{t('action.rescan')}</Button>
                  </>
                )}
              </div>
            </div>

            {editing && trayOpen && (
              <section className="dsh-tray" aria-label={t('tray.title')}>
                <div className="dsh-tray-head">
                  <span className="dsh-tray-title">{t('tray.title')}</span>
                  <span className="dsh-muted">{t('tray.hint')}</span>
                </div>
                <div className="dsh-tray-list">
                  {gridMetas.map((meta) => {
                    const hidden = state.layout.hidden.includes(meta.id)
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        className="dsh-tray-item"
                        data-hidden={hidden ? 'true' : 'false'}
                        aria-pressed={!hidden}
                        onClick={() => { store.toggleHidden(meta.id) }}
                      >
                        <span className="dsh-tray-glyph">{meta.Glyph !== undefined ? <meta.Glyph /> : null}</span>
                        <span className="dsh-tray-name">{meta.title}</span>
                        <span className="dsh-tray-state">{hidden ? t('tray.show') : t('tray.hide')}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {visible.length === 0 ? (
              <div className="dsh-empty">
                <span>{t('empty.noWidgets')}</span>
                <Button variant="ghost" size="sm" onClick={() => { store.showAll(); setTrayOpen(false) }}>
                  {t('empty.restore')}
                </Button>
              </div>
            ) : (
              <div className="dsh-home-grid">
                {visible.map((id) => {
                  const meta = gridMetas.find(item => item.id === id)
                  if (meta === undefined) return null
                  const size = state.layout.size[id] ?? meta.defaultSize
                  const widgetProps: WidgetProps = {
                    t,
                    data,
                    sessions: state.sessions,
                    now: state.now,
                    actions,
                    size,
                  }
                  return (
                    <CardBoundary key={id} fallback={<div className="dsh-w dsh-error">{t('error.card')}</div>}>
                      <section
                        className="dsh-w"
                        data-widget-id={id}
                        data-size={size}
                        data-dragging={gridDrag.dragging === id ? 'true' : 'false'}
                        data-drop={gridDrag.dropTarget === id ? gridDrag.dropSide ?? 'true' : 'false'}
                        data-editing={editing ? 'true' : 'false'}
                        aria-label={t('aria.widget', { title: meta.title })}
                      >
                        <div className="dsh-w-head">
                          {meta.Glyph !== undefined && <meta.Glyph />}
                          <h2 className="dsh-w-title">{meta.title}</h2>
                          <div className="dsh-tools">
                            <DragHandle
                              label={t('edit.drag')}
                              onPointerDown={(event) => {
                                if (event.button !== 0) return
                                event.preventDefault()
                                gridDrag.begin(id)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(id, -1, false) }
                                if (event.key === 'ArrowRight') { event.preventDefault(); nudge(id, 1, false) }
                              }}
                            />
                            {editing && (['s', 'm', 'l'] as const).map(option => (
                              <button
                                key={option}
                                type="button"
                                className="dsh-tool"
                                data-active={size === option ? 'true' : 'false'}
                                aria-label={t('edit.size', { size: sizeLabel(option, t) })}
                                aria-pressed={size === option}
                                onClick={() => { store.setSize(id, option) }}
                              >
                                {sizeLabel(option, t)}
                              </button>
                            ))}
                            {editing && (
                              <button
                                type="button"
                                className="dsh-tool"
                                aria-label={t('edit.hide')}
                                title={t('edit.hide')}
                                onClick={() => { store.hide(id) }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="dsh-w-body">
                          <WidgetBody meta={meta} widgetProps={widgetProps} renderSlot={renderSlot} size={size} />
                        </div>
                      </section>
                    </CardBoundary>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
