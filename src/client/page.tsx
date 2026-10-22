/**
 * 首页面板（`main` 槽，key = `home`）：标题行 + 小组件网格 + 编辑态。
 *
 * 网格是 3 列（窄屏 2/1 列），每张卡按 `data-size` 跨列。编辑态下每张卡的标题行
 * 右侧长出工具条：拖动把手（指针拖拽 + 方向键）、S/M/L 尺寸、隐藏、恢复默认。
 * 布局只存覆盖（order / size / hidden），默认排布由内置组件表 + `home.widget`
 * 槽的注册顺序合成——所以卸载一个 widget 包不会把别人的布局弄坏。
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
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // 每次进入首页都拉一次最新数字（点 logo → 立刻是新的）。
  useEffect(() => { void store.refresh() }, [store])

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

  const dragEnd = useCallback(() => {
    if (dragging !== null && dropTarget !== null && dragging !== dropTarget) {
      store.moveBefore(dragging, dropTarget, fallbackOrder)
    }
    setDragging(null)
    setDropTarget(null)
  }, [dragging, dropTarget, fallbackOrder, store])

  const onPointerMove = useCallback((event: { clientX: number; clientY: number }) => {
    if (dragging === null) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const card = element?.closest('[data-widget-id]') as HTMLElement | null
    const id = card?.dataset.widgetId ?? null
    if (id !== null && id !== dragging) setDropTarget(id)
  }, [dragging])

  const nudge = useCallback((id: string, delta: number) => {
    const current = store.ordered(fallbackOrder)
    const index = current.indexOf(id)
    const target = current[index + delta]
    if (target === undefined) return
    // 往左：插到目标之前；往右：插到目标之后（= 目标的下一个元素之前）。
    store.moveBefore(id, delta < 0 ? target : current[index + delta + 1], fallbackOrder)
  }, [fallbackOrder, store])

  const data = state.ledger
  const todaySummary = data === null
    ? (state.loading ? t('summary.scanning') : t('summary.empty'))
    : t('summary.today', {
      active: formatDuration(data.today.activeMs, t),
      sessions: data.today.sessions,
      turns: data.today.turns,
    })

  return (
    <div className="dsh-home">
      <div className="dsh-home-inner">
        <div className="dsh-home-head">
          <div className="dsh-home-heading">
            <h1 className="dsh-home-title">{t('panel.title')}</h1>
            <div className="dsh-home-sub" aria-live="polite">
              <span>{t('panel.subtitle', { date: formatDay(state.now, locale()) })}</span>
              <span className="dsh-home-dot" aria-hidden="true" />
              <span>{todaySummary}</span>
              {data !== null && data.week.sessions > 0 && (
                <>
                  <span className="dsh-home-dot" aria-hidden="true" />
                  <span>
                    {t('summary.week', {
                      active: formatDuration(data.week.activeMs, t),
                      sessions: data.week.sessions,
                    })}
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
              onClick={() => { setEditing(!editing) }}
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
          <div className="dsh-edit-hint">
            <span>{t('edit.hint')}</span>
            <Button variant="ghost" size="sm" onClick={() => { store.reset() }}>{t('action.reset')}</Button>
            <Button variant="ghost" size="sm" onClick={rescan}>{t('action.rescan')}</Button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="dsh-empty">{t('empty.noWidgets')}</div>
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
                  data-droptarget={dropTarget === id ? 'true' : 'false'}
                  aria-label={t('aria.widget', { title: meta.title })}
                >
                  <div className="dsh-w-head">
                    {meta.Glyph !== undefined && <meta.Glyph />}
                    <span className="dsh-w-title">{meta.title}</span>
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
                          }}
                          onPointerMove={onPointerMove}
                          onPointerUp={dragEnd}
                          onPointerCancel={dragEnd}
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

        {editing && hiddenCount > 0 && (
          <div className="dsh-hidden-tray">
            <span>{t('edit.hidden', { count: hiddenCount })}</span>
            <Button variant="ghost" size="sm" onClick={() => { store.showAll() }}>
              {t('edit.showAll')}
            </Button>
          </div>
        )}

        {data !== null && data.scannedAt !== null && (
          <div className="dsh-muted" style={{ marginTop: 18 }}>
            {t('summary.updated', { time: formatAgo(data.scannedAt, state.now, t) })}
            {data.scanning ? ` · ${t('summary.scanning')}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
