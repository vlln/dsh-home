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
import { Button, CardBody, CardHero, CardMeta, CardFooter, CardSkeleton, CountUp } from './ui/index.ts'

export type BalanceConfig = { auto: boolean }

export interface BalanceState {
  available: boolean
  reason?: string
  currency?: string
  total?: number
  granted?: number | null
  toppedUp?: number | null
}

function defaultBalanceConfig(): BalanceConfig {
  return { auto: true }
}

function validateBalanceConfig(value: unknown): value is BalanceConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'auto') && typeof config.auto === 'boolean'
}

const PREVIEW_STATE: BalanceState = { available: true, currency: 'CNY', total: 128.5, granted: 0, toppedUp: 128.5 }

function reasonKey(reason: string | undefined): string {
  if (reason === undefined) return 'balance.unavailable'
  if (reason === 'not-configured') return 'balance.notConfigured'
  if (reason === 'timeout') return 'balance.timeout'
  return 'balance.unavailable'
}

function BalanceBody({ state, t, loading, onRefresh, readOnly }: {
  state: BalanceState
  t: Translate
  loading: boolean
  onRefresh: () => void
  readOnly: boolean
}): ReactNode {
  const refresh = readOnly ? undefined : (
    <Button variant="secondary" size="xs" disabled={loading} onClick={onRefresh}>
      {t('balance.refresh')}
    </Button>
  )
  if (!state.available) {
    return <CardBody>
      <CardHero value="¥ —" tone="muted" />
      <CardMeta>{t(reasonKey(state.reason))}</CardMeta>
      <CardFooter>{refresh}</CardFooter>
    </CardBody>
  }
  const currency = state.currency === 'CNY' ? '¥' : state.currency === 'USD' ? '$' : `${state.currency ?? ''} `
  return <CardBody>
    <CardHero value={<CountUp value={state.total ?? 0} format={total => `${currency}${total.toFixed(2)}`} />} />
    <CardMeta>
      {state.toppedUp !== null && state.toppedUp !== undefined && <span>{t('balance.toppedUp')} {state.toppedUp.toFixed(2)}</span>}
      {state.granted !== null && state.granted !== undefined && state.granted > 0 && <span>{t('balance.granted')} {state.granted.toFixed(2)}</span>}
    </CardMeta>
    <CardFooter>{refresh}</CardFooter>
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
    // 只在实例挂载时拉一次；之后由按钮触发（宿主另有 5 分钟缓存）。
  }, [props.config.auto, readOnly])
  if (failed) {
    return <CardBody>
      <CardHero value="¥ —" tone="muted" />
      <CardMeta>{t('balance.unavailable')}</CardMeta>
      <CardFooter>{readOnly ? undefined : <Button variant="secondary" size="xs" onClick={() => void load()}>{t('balance.refresh')}</Button>}</CardFooter>
    </CardBody>
  }
  if (state === null) {
    if (loading) return <CardSkeleton />
    return <CardBody>
      <CardHero value="¥ —" tone="muted" />
      <CardMeta>{t('balance.idle')}</CardMeta>
      <CardFooter>{readOnly ? undefined : <Button variant="secondary" size="xs" onClick={() => void load()}>{t('balance.query')}</Button>}</CardFooter>
    </CardBody>
  }
  return <BalanceBody state={state} t={t} loading={loading} readOnly={readOnly} onRefresh={() => void load()} />
}

export function BalanceContent(props: WidgetContentProps<BalanceConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) return <BalanceBody state={PREVIEW_STATE} t={t} loading={false} readOnly onRefresh={() => {}} />
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
