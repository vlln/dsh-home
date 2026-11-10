/**
 * 余额：DeepSeek 平台账户余额。
 *
 * key 只在宿主侧使用（设置里的 `apiKeyEnv` 引用 → 凭据服务，或 `DEEPSEEK_API_KEY`），
 * 浏览器只拿数字。没有配置或平台不可达时显示原因，不显示旧值、不重试。
 * 请求由用户点击触发，或挂载后拉一次（宿主缓存 5 分钟）。
 *
 * @module @vlln/dsh-home/client/balance-widget
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { BALANCE_PATH } from './api.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps } from './widget-contract.ts'
import { IconBalance } from './widget-glyphs.tsx'
import { CardBody, CardEmpty, CardError, CardHero, CardMeta, CardSkeleton, CountUp } from './ui/index.ts'

export type BalanceConfig = { auto: boolean }

export interface BalanceState {
  available: boolean
  reason?: string
  currency?: string
  total?: number
  granted?: number | null
  toppedUp?: number | null
  /** 今日消费：平台没有这个数，是宿主按余额差值算的（见 balance-history.mjs）。 */
  todaySpent?: number | null
}

/** 自动刷新间隔：宿主把平台读数缓存 5 分钟，跟着它的节奏就够了。 */
export const BALANCE_REFRESH_MS = 5 * 60_000

function defaultBalanceConfig(): BalanceConfig {
  return { auto: true }
}

function validateBalanceConfig(value: unknown): value is BalanceConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'auto') && typeof config.auto === 'boolean'
}

const PREVIEW_STATE: BalanceState = { available: true, currency: 'CNY', total: 128.5, granted: 0, toppedUp: 128.5, todaySpent: 0.42 }

function reasonKey(reason: string | undefined): string {
  if (reason === undefined) return 'balance.unavailable'
  if (reason === 'not-configured') return 'balance.notConfigured'
  if (reason === 'timeout') return 'balance.timeout'
  return 'balance.unavailable'
}

function BalanceBody({ state, t }: {
  state: BalanceState
  t: Translate
}): ReactNode {
  // 没有数字就不画数字：`¥ —` 那种占位主值曾经是卡上最大的东西，却什么也没说。
  if (!state.available) {
    return <CardBody className="justify-center">
      <CardEmpty title={t(reasonKey(state.reason))} />
    </CardBody>
  }
  const currency = state.currency === 'CNY' ? '¥' : state.currency === 'USD' ? '$' : `${state.currency ?? ''} `
  const split = [
    state.toppedUp !== null && state.toppedUp !== undefined ? `${t('balance.toppedUp')} ${state.toppedUp.toFixed(2)}` : null,
    state.granted !== null && state.granted !== undefined && state.granted > 0 ? `${t('balance.granted')} ${state.granted.toFixed(2)}` : null,
  ].filter(part => part !== null)
  return <CardBody className="justify-center">
    <CardHero value={<CountUp value={state.total ?? 0} format={total => `${currency}${total.toFixed(2)}`} />} />
    {/* 今日消费紧贴主值：它是这张卡除了余额之外唯一会动的数，也是「今天还能不能跑」的答案。 */}
    {typeof state.todaySpent === 'number' && <CardMeta>
      <span>{t('balance.todaySpent')} <span className="tabular-nums">{`${currency}${state.todaySpent.toFixed(2)}`}</span></span>
    </CardMeta>}
    {split.length > 0 && <CardMeta><span>{split.join(' · ')}</span></CardMeta>}
  </CardBody>
}

function ConnectedBalance(props: WidgetContentProps<BalanceConfig>): ReactNode {
  const { t } = useBuiltin()
  const [state, setState] = useState<BalanceState | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const readOnly = props.editing
  const load = async (): Promise<void> => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch(BALANCE_PATH, { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error(`balance: HTTP ${response.status}`)
      setState(await response.json() as BalanceState)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!props.config.auto || readOnly) return
    void load()
    // 自动刷新，没有按钮：跟着宿主的 5 分钟缓存走，多打一次也只是命中缓存。
    const timer = window.setInterval(() => { void load() }, BALANCE_REFRESH_MS)
    return () => { window.clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.config.auto, readOnly])
  if (failed) {
    return <CardError title={t('balance.unavailable')} />
  }
  if (state === null) {
    if (loading) return <CardSkeleton />
    return <CardBody className="justify-center"><CardEmpty title={t('balance.idle')} /></CardBody>
  }
  return <BalanceBody state={state} t={t} />
}

export function BalanceContent(props: WidgetContentProps<BalanceConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) return <BalanceBody state={PREVIEW_STATE} t={t} />
  return <ConnectedBalance {...props} />
}

export function registerBalanceWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<BalanceConfig>({
    typeId: '@vlln/dsh-home:balance', apiVersion: 1,
    title: () => t('widget.balance.title'), description: () => t('gallery.description.balance'), source: '@vlln/dsh-home', icon: IconBalance,
    preview: { config: () => ({ auto: true }) },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }] },
    configVersion: 1, defaultConfig: defaultBalanceConfig,
    validateConfig: (config): config is BalanceConfig => validateBalanceConfig(config),
    Content: BalanceContent,
  })
}
