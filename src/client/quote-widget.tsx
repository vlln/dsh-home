/**
 * 一句话：内置语录按日期确定性轮换，也可以换成自己的清单。
 *
 * 同一天、同一种语言永远是同一句（用日键做种子），不联网、不请求、不随机。
 *
 * @module @vlln/dsh-home/client/quote-widget
 */

import { useId } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { todayKey } from './home-data.ts'
import { MAX_LINE, MAX_LINES, pickQuote, type QuoteConfig } from './quote-model.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { JsonValue, WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'
import { IconQuote } from './widget-glyphs.tsx'

function defaultQuoteConfig(): QuoteConfig {
  return { lines: [] }
}

function validateQuoteConfig(value: unknown): value is QuoteConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  if (!Object.keys(config).every(key => key === 'lines')) return false
  return Array.isArray(config.lines) && config.lines.length <= MAX_LINES
    && config.lines.every(line => typeof line === 'string' && line.length <= MAX_LINE)
}

function QuoteSettings({ config, onConfigChange }: WidgetSettingsProps<QuoteConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  return <div className="dsh-modal-form">
    <div className="dsh-modal-field">
      <label className="dsh-modal-label" htmlFor={`${id}-lines`}>{t('quote.lines')}</label>
      <textarea className="dsh-modal-textarea" id={`${id}-lines`} rows={8} value={config.lines.join('\n')} placeholder={t('quote.placeholder')}
        onChange={event => onConfigChange({ lines: event.target.value.split('\n').slice(0, MAX_LINES).map(line => line.slice(0, MAX_LINE)) })} />
      <p className="dsh-modal-hint">{t('quote.hint', { max: MAX_LINES })}</p>
    </div>
  </div>
}

function QuoteBody({ text, t }: { text: string; t: Translate }): ReactNode {
  return <div className="dsh-quote flex h-full min-h-0 flex-col justify-center gap-2 px-1">
    <span className="text-display-4-semibold leading-none text-text-tertiary" aria-hidden="true">“</span>
    <p className="dsh-quote-text m-0 line-clamp-[10] text-headline-regular leading-relaxed text-text-primary">{text}</p>
    <span className="text-caption-1-medium text-text-tertiary">{t('quote.daily')}</span>
  </div>
}

export function QuoteContent(props: WidgetContentProps<QuoteConfig>): ReactNode {
  const { t, language } = useBuiltin()
  if (props.preview !== undefined) return <QuoteBody t={t} text={pickQuote({ lines: [] }, '2026-11-06', language)} />
  return <div className="dsh-quote-wrap">
    <QuoteBody t={t} text={pickQuote(props.config, todayKey(), language)} />
    <WidgetConfigEditor t={t} widgetProps={props} title={t('widget.quote.title')} label={t('quote.settings')}
      Fields={QuoteSettings} validate={validateQuoteConfig} />
  </div>
}

export function registerQuoteWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<QuoteConfig>({
    typeId: '@vlln/dsh-home:quote', apiVersion: 1,
    title: () => t('widget.quote.title'), description: () => t('gallery.description.quote'), source: '@vlln/dsh-home', icon: IconQuote,
    preview: { config: () => ({ lines: [] }) },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 4, h: 6 }] },
    configVersion: 1, defaultConfig: defaultQuoteConfig, validateConfig: (config): config is QuoteConfig => validateQuoteConfig(config),
    Content: QuoteContent,
  })
}
