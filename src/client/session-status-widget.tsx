/**
 * 「会话状态」：一个按状态切换的会话列表。
 *
 * Running / Waiting on you / Done 本来就是同一批会话的三个状态；过去它们是两张卡
 * （「在跑」+「在等我」），同一件事被拆成两个入口。现在顶部是状态筛选（带计数），
 * 点一下换一个视图，选择存在该实例的配置里。
 *
 * 数据来自官方 `sessionStatus` 根钩子与官方会话目录；没有该钩子的组合只画「在跑」，
 * 并说明其余两个视图需要宿主状态。
 *
 * @module @vlln/dsh-home/client/session-status-widget
 */
import type { ReactNode } from 'react'
import { builtinPreviewData, useBuiltin } from './builtin-registration.tsx'
import type { Translate } from './format.ts'
import {
  cwdLabels, effectiveGroup, groupCounts, mergeRecentSessions, SESSION_STATUS_GROUPS, statusSessions,
  type SessionStatus, type SessionStatusGroup,
} from './session-model.ts'
import { SessionRow } from './session-row.tsx'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import { CardBody, CardEmpty, SegmentedControl, SegmentedControlItem, StatGrid } from './ui/index.ts'

export type SessionStatusConfig = { status: SessionStatusGroup | null }
const GROUP_TYPE = '@vlln/dsh-home:running'

/** 三个视图的稳定顺序与默认值；旧实例的 `{}` 仍然有效（自动选第一个有内容的视图）。 */
function defaultSessionStatusConfig(): SessionStatusConfig { return { status: null } }

function validateSessionStatusConfig(value: unknown): value is SessionStatusConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  if (!Object.keys(config).every(key => key === 'status')) return false
  return config.status === undefined || config.status === null
    || SESSION_STATUS_GROUPS.includes(config.status as SessionStatusGroup)
}

/** 「在等我」的原因：审批 / 计划评审 / 提问 / 跑完没看。 */
function waitingReason(status: SessionStatus | undefined, t: Translate): string | undefined {
  const interaction = typeof status?.pendingInteraction === 'string'
    ? status.pendingInteraction : status?.pendingInteraction?.kind
  if (interaction === 'approval') return t('queue.approval')
  if (interaction === 'plan-review') return t('queue.plan')
  if (interaction === 'question') return t('queue.question')
  if (status?.completionUnread === true) return t('queue.done')
  return undefined
}

function StatusGlyph() {
  return <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 4.5h6M2 8h9M2 11.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="12.4" cy="4.5" r="1.6" fill="currentColor" />
    <circle cx="13.4" cy="11.5" r="1.6" fill="currentColor" />
  </svg>
}

export function SessionStatusContent(props: WidgetContentProps<SessionStatusConfig>): ReactNode {
  const { state, t, actions, statuses, statusSource, store } = useBuiltin()
  const configured = SESSION_STATUS_GROUPS.includes(props.config.status as SessionStatusGroup)
    ? props.config.status as SessionStatusGroup : null
  const sessions = mergeRecentSessions(state.sessions, state.ledger?.sessions)
  const rows = statusSessions(sessions, statusSource === 'runtime' ? statuses : undefined, state.prefs.dismissed)
  const counts = groupCounts(rows)
  const group = configured ?? effectiveGroup(counts, 'running')
  const labels = cwdLabels(rows.map(row => row.session.cwd))
  const shown = rows.filter(row => row.group === group)
  const canChoose = props.saveConfig !== undefined && props.preview === undefined
  const open = (id: string): void => { actions.openSession(id) }
  return <div className="dsh-session-status flex h-full min-h-0 flex-col" data-status-source={statusSource} data-group={group}>
    <SegmentedControl
      aria-label={t('sessionStatus.filter')}
      selectedKeys={[group]}
      onSelectionChange={keys => {
        const next = [...keys][0]
        if (canChoose && next !== undefined && next !== group) void props.saveConfig?.({ status: next as SessionStatusGroup })
      }}
      isDisabled={!canChoose}
      className="self-start"
    >
      {SESSION_STATUS_GROUPS.map(value => <SegmentedControlItem key={value} id={value}>
        <span className="flex items-center gap-1.5">
          <i className={['size-1.5 flex-none rounded-full', DOT_TONE[value]].join(' ')} aria-hidden="true" />
          <span>{t(`sessionStatus.group.${value}`)}</span>
        </span>
      </SegmentedControlItem>)}
    </SegmentedControl>
    {/* Counts live in their own tiles: a filter's job is to choose a view, not to
        carry the numbers. The tiles also give an empty card structure. */}
    <StatGrid className="mt-2" stats={SESSION_STATUS_GROUPS.map(value => ({
      key: value, label: t(`sessionStatus.group.${value}`), value: counts[value],
      tone: value === 'running' ? 'positive' : value === 'waiting' ? 'warning' : 'accent',
    }))} />
    {shown.length === 0
      ? <CardEmpty title={t(`sessionStatus.empty.${group}`)} className="flex-1 pt-2" />
      : <div className="dsh-rows dsh-status-rows mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {shown.map(row => <SessionRow
          key={row.session.id}
          session={row.session}
          title={row.session.title ?? t('recent.untitled')}
          workspace={row.session.cwd === undefined ? t('recent.unknownCwd') : labels.get(row.session.cwd) ?? row.session.cwd}
          workspaceTitle={row.session.cwd}
          status={row.status}
          reason={group === 'waiting' ? waitingReason(statuses.get(row.session.id), t) : undefined}
          now={state.now}
          t={t}
          onOpen={() => open(row.session.id)}
          onDismiss={group === 'waiting' ? () => { store.dismiss(row.session.id) } : undefined}
        />)}
      </div>}
    {statusSource !== 'runtime' && <p className="dsh-muted mt-1 text-caption-1-medium text-text-tertiary">{t('sessionStatus.noStatus')}</p>}
  </div>
}

/** 三个视图的点色只表示语义：在跑绿、在等你琥珀、未读蓝。 */
const DOT_TONE: Record<SessionStatusGroup, string> = {
  running: 'bg-status-lime-text',
  waiting: 'bg-status-yellow-text',
  done: 'bg-chart-4',
}

export function registerSessionStatusWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<SessionStatusConfig>({
    typeId: GROUP_TYPE, apiVersion: 1,
    title: () => t('widget.sessionStatus.title'), description: () => t('sessionStatus.description'),
    source: '@vlln/dsh-home', icon: StatusGlyph,
    preview: { data: builtinPreviewData(t), config: defaultSessionStatusConfig },
    sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }, { w: 8, h: 6 }, { w: 8, h: 8 }] },
    configVersion: 1, defaultConfig: defaultSessionStatusConfig,
    validateConfig: (config): config is SessionStatusConfig => validateSessionStatusConfig(config),
    Content: SessionStatusContent,
  })
}
