/**
 * 倒计时：多个目标日期，显示最近的一个还剩多久。
 *
 * 数据只在组件配置里（目标不超过 8 个），到点显示「已到期」但不自动删除、不弹窗。
 * 不联网、不请求；时间由 `useNow` 每分钟重算。
 *
 * @module @vlln/dsh-home/client/countdown-widget
 */

import { useId } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { useBuiltin } from './builtin-registration.tsx'
import { useNow } from './home-data.ts'
import { countdownLeft, nextTarget, parseDayKey } from './focus-model.ts'
import { CardEmpty } from './ui/index.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'
import { IconCountdown } from './widget-glyphs.tsx'

export type CountdownTarget = { id: string; title: string; date: string }
export type CountdownConfig = { targets: CountdownTarget[] }

const MAX_TARGETS = 8
const MAX_TITLE = 60

function defaultCountdownConfig(): CountdownConfig {
  return { targets: [] }
}

function validTarget(value: unknown): value is CountdownTarget {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const target = value as Record<string, unknown>
  return Object.keys(target).sort().join(',') === 'date,id,title'
    && typeof target.id === 'string' && target.id !== '' && target.id.length <= 40
    && typeof target.title === 'string' && target.title.trim() !== '' && target.title.length <= MAX_TITLE
    && typeof target.date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(target.date) && Number.isFinite(parseDayKey(target.date))
}

function validateCountdownConfig(value: unknown): value is CountdownConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  if (!Object.keys(config).every(key => key === 'targets')) return false
  if (!Array.isArray(config.targets) || config.targets.length > MAX_TARGETS) return false
  const ids = new Set<string>()
  for (const target of config.targets) {
    if (!validTarget(target) || ids.has(target.id)) return false
    ids.add(target.id)
  }
  return true
}

function createId(seed: number): string {
  return `t_${seed.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

const PREVIEW_CONFIG: CountdownConfig = {
  targets: [
    { id: 't_1', title: '发布 1.0', date: '2026-12-01' },
    { id: 't_2', title: '团队旅行', date: '2027-01-15' },
  ],
}

function CountdownSettings({ config, onConfigChange }: WidgetSettingsProps<CountdownConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  const update = (targets: CountdownTarget[]): void => onConfigChange({ targets: targets.slice(0, MAX_TARGETS) })
  return <div className="dsh-modal-form">
    {config.targets.map((target, index) => <div key={target.id} className="dsh-modal-field">
      <div className="dsh-modal-grid">
        {/* The first row carries the column labels; the rest keep the same grid so the
            inputs stay aligned without repeating a label per row. */}
        <label className="dsh-modal-subfield" htmlFor={`${id}-title-${index}`}>
          {index === 0 && <span className="dsh-modal-label">{t('countdown.title')}</span>}
          <input className="dsh-modal-input" id={`${id}-title-${index}`} type="text" maxLength={MAX_TITLE} value={target.title}
            aria-label={index === 0 ? undefined : t('countdown.title')}
            onChange={event => update(config.targets.map(entry => entry.id === target.id ? { ...entry, title: event.target.value } : entry))} />
        </label>
        <label className="dsh-modal-subfield" htmlFor={`${id}-date-${index}`}>
          {index === 0 && <span className="dsh-modal-label">{t('countdown.date')}</span>}
          <input className="dsh-modal-input" id={`${id}-date-${index}`} type="date" value={target.date}
            aria-label={index === 0 ? undefined : t('countdown.date')}
            onChange={event => update(config.targets.map(entry => entry.id === target.id ? { ...entry, date: event.target.value } : entry))} />
        </label>
        <Button variant="ghost" size="md" aria-label={t('countdown.remove')} title={t('countdown.remove')}
          onClick={() => update(config.targets.filter(entry => entry.id !== target.id))}>×</Button>
      </div>
    </div>)}
    <div className="dsh-modal-actions">
      <Button variant="outline" size="sm" disabled={config.targets.length >= MAX_TARGETS}
        onClick={() => update([...config.targets, { id: createId(Date.now()), title: '', date: new Date().toISOString().slice(0, 10) }])}>
        + {t('countdown.add')}
      </Button>
      <p className="dsh-modal-hint">{t('countdown.hint', { max: MAX_TARGETS })}</p>
    </div>
  </div>
}

function CountdownBody({ config, now, t, readOnly }: { config: CountdownConfig; now: number; t: Translate; readOnly: boolean }): ReactNode {
  const target = nextTarget(config.targets.filter(validTarget), now)
  if (target === null) return <CardEmpty title={t(config.targets.length === 0 ? 'countdown.empty' : 'countdown.pickOne')} />
  const left = countdownLeft(target.date, now)
  return <div className="dsh-countdown flex h-full min-h-0 flex-col justify-center gap-1.5" data-expired={left.expired ? 'true' : 'false'}>
    <span className="dsh-countdown-title truncate text-body-medium text-text-secondary">{target.title}</span>
    {left.expired
      ? <span className="dsh-countdown-expired text-display-4-semibold tracking-tight text-text-error-primary">{t('countdown.expired')}</span>
      : left.days > 0
        ? <span className="dsh-countdown-clock flex items-baseline gap-1.5">
          <span className="dsh-countdown-days text-display-4-semibold leading-none tabular-nums tracking-tight text-text-primary">{left.days}</span>
          <span className="dsh-countdown-unit text-caption-1-medium text-text-tertiary">{t('countdown.days')}</span>
          <span className="dsh-countdown-rest text-caption-1-semibold tabular-nums text-text-secondary">{String(left.hours).padStart(2, '0')}:{String(left.minutes).padStart(2, '0')}</span>
        </span>
        : <span className="dsh-countdown-clock flex items-baseline gap-1.5">
          <span className="dsh-countdown-days text-display-4-semibold leading-none tabular-nums tracking-tight text-text-primary">{String(left.hours).padStart(2, '0')}:{String(left.minutes).padStart(2, '0')}</span>
          <span className="dsh-countdown-unit text-caption-1-medium text-text-tertiary">{t('countdown.hours')}</span>
        </span>}
    <span className="dsh-countdown-date text-caption-1-medium tabular-nums text-text-tertiary">{target.date}</span>
    {!readOnly && config.targets.length === 0 && <span className="dsh-countdown-hint">{t('countdown.addHint')}</span>}
  </div>
}

function ConnectedCountdown(props: WidgetContentProps<CountdownConfig>): ReactNode {
  const { t } = useBuiltin()
  const now = useNow(60_000)
  return <div className="dsh-countdown-wrap">
    <CountdownBody config={props.config} now={now} t={t} readOnly={props.editing} />
    <WidgetConfigEditor t={t} widgetProps={props} title={t('widget.countdown.title')} label={t('countdown.settings')}
      Fields={CountdownSettings} validate={validateCountdownConfig} />
  </div>
}

export function CountdownContent(props: WidgetContentProps<CountdownConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) {
    return <CountdownBody config={PREVIEW_CONFIG} now={Date.now()} t={t} readOnly />
  }
  return <ConnectedCountdown {...props} />
}

export function registerCountdownWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<CountdownConfig>({
    typeId: '@vlln/dsh-home:countdown', apiVersion: 1,
    title: () => t('widget.countdown.title'), description: () => t('gallery.description.countdown'), source: '@vlln/dsh-home', icon: IconCountdown,
    preview: { config: () => PREVIEW_CONFIG },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }] },
    configVersion: 1, defaultConfig: defaultCountdownConfig,
    validateConfig: (config): config is CountdownConfig => validateCountdownConfig(config),
    Content: CountdownContent,
  })
}
