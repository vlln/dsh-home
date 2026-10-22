/**
 * 首页面板（`main` 槽，key = `home`）：标题行 + 小组件网格 + 编辑态。
 *
 * 交互分三层：
 * - **阅读态**：卡片只是数据；行可点（回到那个会话），时间带/柱状可悬停看明细。
 * - **编辑态**（"编辑布局"）：每张卡长出工具条（拖动把手 / S·M·L / 隐藏），顶部出现
 *   小组件清单（逐张显隐）、两步确认的「恢复默认」与「重建账本」；Esc 退出。
 * - **拖拽**：把手按下后按落点左右半边决定插到目标前还是后，目标卡显示一条插入线；
 *   键盘聚焦把手可用 ← → 调序。
 *
 * 布局只存覆盖（order / size / hidden），默认排布由内置表 + `home.widget` 槽的注册
 * 顺序合成——卸载一个 widget 包不会把别人的布局弄坏。
 *
 * @module @vlln/dsh-home/client/page
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { formatAgo, formatDay, formatDuration, type Translate } from './format.ts'
import { BUILTIN_WIDGETS, type WidgetActions, type WidgetProps } from './widgets.tsx'
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
}

/** 三档尺寸的展示名。 */
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

/** 首屏骨架：三块卡片的形状，避免"暂无数据"闪一下。 */
function SkeletonGrid() {
  return (
    <div className="dsh-home-grid" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <div key={index} className="dsh-w dsh-w-skeleton" data-size={index === 0 ? 'm' : 's'}>
          <div className="dsh-skeleton" style={{ width: '32%' }} />
          <div className="dsh-skeleton" style={{ width: '64%', height: 22 }} />
          <div className="dsh-skeleton" style={{ width: '88%' }} />
          <div className="dsh-skeleton" style={{ width: '72%' }} />
        </div>
      ))}
    </div>
  )
}

/**
 * 渲染首页。
 * @param props 面板 props
 */
export function HomePage(props: HomePageProps): ReactNode {
  const { t, renderSlot, store, widgets, actions, locale, rescan } = props
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const external = useSyncExternalStore(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot)

  // 编辑态是这一屏的临时状态：面板卸载即消失，不会跟着用户回到会话里。
  const [editing, setEditing] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropSide, setDropSide] = useState<'before' | 'after' | null>(null)

  // 每次进入首页都拉一次最新数字（点 logo → 立刻是新的）。
  useEffect(() => { void store.refresh() }, [store])

  // 恢复默认要两次：第一次只把按钮变成"确认恢复？"，4 秒后自动取消。
  useEffect(() => {
    if (!confirmReset) return
    const timer = setTimeout(() => { setConfirmReset(false) }, 4000)
    return () => { clearTimeout(timer) }
  }, [confirmReset])

  const metas = useMemo(() => {
    const list: WidgetMeta[] = BUILTIN_WIDGETS.map(widget => ({
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

  const fallbackOrder = useMemo(() => metas.map(meta => meta.id), [metas])
  const order = store.ordered(fallbackOrder)
  const visible = order.filter(id => !state.layout.hidden.includes(id))
  const hiddenCount = order.length - visible.length

  const endDrag = useCallback(() => {
    if (dragging !== null && dropTarget !== null && dropSide !== null && dragging !== dropTarget) {
      store.moveRelative(dragging, dropTarget, dropSide, fallbackOrder)
    }
    setDragging(null)
    setDropTarget(null)
    setDropSide(null)
  }, [dragging, dropTarget, dropSide, fallbackOrder, store])

  const onPointerMove = useCallback((event: { clientX: number; clientY: number }) => {
    if (dragging === null) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const card = element?.closest('[data-widget-id]') as HTMLElement | null
    const id = card?.dataset.widgetId ?? null
    if (card === null || id === null || id === dragging) {
      setDropTarget(null)
      setDropSide(null)
      return
    }
    const rect = card.getBoundingClientRect()
    setDropTarget(id)
    setDropSide(event.clientX > rect.left + rect.width / 2 ? 'after' : 'before')
  }, [dragging])

  const nudge = useCallback((id: string, delta: number) => {
    const current = store.ordered(fallbackOrder)
    const index = current.indexOf(id)
    const target = current[index + delta]
    if (target === undefined) return
    store.moveBefore(id, delta < 0 ? target : current[index + delta + 1], fallbackOrder)
  }, [fallbackOrder, store])

  // Esc：先取消拖拽，再关清单，最后退出编辑。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (dragging !== null) { endDrag(); return }
      if (trayOpen) { setTrayOpen(false); return }
      if (editing) { setEditing(false); setConfirmReset(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [dragging, endDrag, editing, trayOpen])

  const data = state.ledger
  const todaySummary = data === null
    ? (state.loading ? t('summary.scanning') : t('summary.empty'))
    : t('summary.today', {
      active: formatDuration(data.today.activeMs, t),
      sessions: data.today.sessions,
      turns: data.today.turns,
    })
  const showSkeleton = data === null && state.loading && state.error === null

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
                {data !== null && data.scanning ? ` · ${t('summary.scanning')}` : ''}
              </span>
            </div>
            <div className="dsh-home-sub" aria-live="polite">
              <span>{formatDay(state.now, locale())}</span>
              <span className="dsh-home-dot" aria-hidden="true" />
              <span>{todaySummary}</span>
              {data !== null && data.week.sessions > 0 && (
                <>
                  <span className="dsh-home-dot" aria-hidden="true" />
                  <span>
                    {t('summary.week', { active: formatDuration(data.week.activeMs, t) })}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="dsh-home-actions" role="group" aria-label={t('aria.actions')}>
            <Button variant="primary" size="sm" onClick={() => { actions.startSession() }}>
              {t('action.newSession')}
            </Button>
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

        {editing && (
          <div className="dsh-edit-bar">
            <span className="dsh-edit-hint">{t('edit.hint')}</span>
            <div className="dsh-edit-actions">
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
            </div>
          </div>
        )}

        {editing && trayOpen && (
          <section className="dsh-tray" aria-label={t('tray.title')}>
            <div className="dsh-tray-head">
              <span className="dsh-tray-title">{t('tray.title')}</span>
              <span className="dsh-muted">{t('tray.hint')}</span>
            </div>
            <div className="dsh-tray-list">
              {metas.map((meta) => {
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

        {showSkeleton ? <SkeletonGrid /> : visible.length === 0 ? (
          <div className="dsh-empty">
            <span>{t('empty.noWidgets')}</span>
            <Button variant="ghost" size="sm" onClick={() => { store.showAll(); setTrayOpen(false) }}>
              {t('empty.restore')}
            </Button>
          </div>
        ) : (
          <div className="dsh-home-grid">
            {visible.map((id) => {
              const meta = metas.find(item => item.id === id)
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
              const content = meta.builtin !== undefined
                ? meta.builtin.body(widgetProps)
                : renderSlot('home.widget', { size }, { only: id })
              return (
                <section
                  key={id}
                  className="dsh-w"
                  data-widget-id={id}
                  data-size={size}
                  data-dragging={dragging === id ? 'true' : 'false'}
                  data-drop={dropTarget === id ? dropSide ?? 'true' : 'false'}
                  aria-label={t('aria.widget', { title: meta.title })}
                >
                  <div className="dsh-w-head">
                    {meta.Glyph !== undefined && <meta.Glyph />}
                    <h2 className="dsh-w-title">{meta.title}</h2>
                    {editing && (
                      <div className="dsh-tools">
                        <button
                          type="button"
                          className="dsh-tool dsh-drag"
                          aria-label={t('edit.drag')}
                          title={t('edit.drag')}
                          onPointerDown={(event) => {
                            if (event.button !== 0) return
                            event.preventDefault()
                            event.currentTarget.setPointerCapture(event.pointerId)
                            setDragging(id)
                            setDropTarget(null)
                            setDropSide(null)
                          }}
                          onPointerMove={onPointerMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(id, -1) }
                            if (event.key === 'ArrowRight') { event.preventDefault(); nudge(id, 1) }
                          }}
                        >
                          ⠿
                        </button>
                        {(['s', 'm', 'l'] as const).map(option => (
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
                        <button
                          type="button"
                          className="dsh-tool"
                          aria-label={t('edit.hide')}
                          title={t('edit.hide')}
                          onClick={() => { store.hide(id) }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="dsh-w-body">{content}</div>
                </section>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
