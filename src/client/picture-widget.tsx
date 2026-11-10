/**
 * 图片卡：一张图 + 可选标题。来源可以是 http(s) 地址，也可以是本地绝对路径。
 *
 * 本地路径由宿主的只读路由读出（`<img>` 无法直接读文件），限制图片扩展名与 20 MB；
 * 加载失败只显示占位块和路径，不留破图。无网络请求的预览用内联 SVG。
 *
 * @module @vlln/dsh-home/client/picture-widget
 */

import { useState } from 'react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { Button, Input, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { pictureSource, validatePictureConfig, type PictureConfig } from './picture-model.ts'
import type { Translate } from './format.ts'
import type { HomeWidgetRegistry } from './widget-registry.ts'
import type { WidgetContentProps, WidgetSettingsProps } from './widget-contract.ts'
import { WidgetConfigEditor } from './widget-settings.tsx'
import { IconPicture } from './widget-glyphs.tsx'

/** 预览用内联图：不联网、不读盘。 */
const PREVIEW_SRC = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">'
  + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8eef7"/><stop offset="1" stop-color="#d7e2f2"/></linearGradient></defs>'
  + '<rect width="320" height="180" fill="url(#g)"/><circle cx="250" cy="52" r="26" fill="#f7fafc"/>'
  + '<path d="M0 180 L96 92 L168 150 L232 108 L320 180 Z" fill="#b9cbe4"/></svg>')

function PictureSettings({ config, onConfigChange }: WidgetSettingsProps<PictureConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  return <div className="dsh-personal-settings">
    <label className="dsh-item-field" htmlFor={`${id}-src`}>
      <span className="dsh-item-label">{t('picture.src')}</span>
      <input id={`${id}-src`} type="text" maxLength={1024} value={config.src} placeholder="https://… 或 /Users/…"
        onChange={event => onConfigChange({ ...config, src: event.target.value })} />
    </label>
    <label className="dsh-item-field" htmlFor={`${id}-title`}>
      <span className="dsh-item-label">{t('picture.title')}</span>
      <input id={`${id}-title`} type="text" maxLength={80} value={config.title}
        onChange={event => onConfigChange({ ...config, title: event.target.value })} />
    </label>
    <div className="dsh-item-field">
      <span className="dsh-item-label">{t('picture.pick')}</span>
      {/* A text path is unusable on a machine you cannot browse: open the file manager instead
          and embed the chosen image. */}
      <label className="dsh-picture-pick">
        <input type="file" accept="image/*" className="sr-only"
          onChange={event => {
            const file = event.target.files?.[0]
            if (file === undefined) return
            if (file.size > 400_000) { onConfigChange({ ...config, src: `too-large:${file.name}` }); return }
            const reader = new FileReader()
            reader.onload = () => { if (typeof reader.result === 'string') onConfigChange({ ...config, src: reader.result }) }
            reader.readAsDataURL(file)
          }} />
        <Button variant="outline" size="sm">{t('picture.choose')}</Button>
      </label>
      {config.src.startsWith('too-large:') && <p className="dsh-personal-hint">{t('picture.tooLarge')}</p>}
    </div>
    <div className="dsh-picture-toggle">
      <Switch checked={config.bleed === true} label={t('picture.bleed')} title={t('picture.bleed')}
        onChange={value => onConfigChange({ ...config, bleed: value })} />
      <span>{t('picture.bleed')}</span>
    </div>
    <div className="dsh-item-field">
      <span className="dsh-item-label">{t('picture.fit')}</span>
      <SegmentedControl id={`${id}-fit`} label={t('picture.fit')} value={config.fit}
        options={[{ value: 'cover', label: t('picture.fitCover') }, { value: 'contain', label: t('picture.fitContain') }]}
        onChange={value => onConfigChange({ ...config, fit: value === 'contain' ? 'contain' : 'cover' })} />
    </div>
  </div>
}

function PictureBody({ config, t, fallback, onOpen }: { config: PictureConfig; t: Translate; fallback?: string; onOpen?: () => void }): ReactNode {
  const [failed, setFailed] = useState<string | null>(null)
  const source = pictureSource(fallback ?? config.src)
  if (source.kind === 'none') {
    return <button type="button" className="dsh-picture-hit" onClick={onOpen} aria-label={t('picture.settings')}>
      <span className="dsh-picture-empty flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-button-default text-caption-1-medium text-text-tertiary">
        <span className="dsh-picture-empty-glyph" aria-hidden="true">▧</span>
        <span>{t('picture.empty')}</span>
      </span>
    </button>
  }
  if (failed === source.url) {
    return <div className="dsh-picture-empty flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-button-default text-caption-1-medium text-text-tertiary" role="status">
      <span className="dsh-picture-empty-glyph" aria-hidden="true">▧</span>
      <span>{t('picture.failed')}</span>
      {source.kind === 'local' && <span className="dsh-picture-path">{config.src}</span>}
    </div>
  }
  const frame = <figure className={config.bleed === true ? 'dsh-picture dsh-picture-bleed' : 'dsh-picture'}>
    <img src={source.url} alt={config.title === '' ? t('picture.alt') : config.title}
      style={{ objectFit: config.fit }} loading="lazy" decoding="async" onError={() => setFailed(source.url)} />
    {config.title !== '' && <figcaption className="dsh-picture-caption text-caption-1-medium">{config.title}</figcaption>}
  </figure>
  if (onOpen === undefined) return frame
  return <button type="button" className="dsh-picture-hit" onClick={onOpen} aria-label={t('picture.settings')}>{frame}</button>
}

export function PictureContent(props: WidgetContentProps<PictureConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) {
    return <PictureBody t={t} config={{ ...props.config, title: props.config.title === '' ? t('widget.picture.title') : props.config.title }} fallback={PREVIEW_SRC} />
  }
  return <div className="dsh-picture-wrap">
    <WidgetConfigEditor t={t} widgetProps={props} title={t('widget.picture.title')} label={t('picture.settings')}
      Fields={PictureSettings} validate={validatePictureConfig}
      renderTrigger={open => <PictureBody t={t} config={props.config} onOpen={open} />} />
  </div>
}

export function registerPictureWidget(registry: HomeWidgetRegistry, t: Translate): () => void {
  return registry.register<PictureConfig>({
    typeId: '@vlln/dsh-home:picture', apiVersion: 1,
    title: () => t('widget.picture.title'), description: () => t('gallery.description.picture'), source: '@vlln/dsh-home', icon: IconPicture,
    preview: { config: () => ({ src: '', title: '', fit: 'cover' as const }) },
    sizing: { default: { w: 4, h: 4 }, supported: [{ w: 4, h: 4 }, { w: 8, h: 4 }, { w: 8, h: 6 }] },
    configVersion: 1, defaultConfig: () => ({ src: '', title: '', fit: 'cover' as const }),
    validateConfig: (config): config is PictureConfig => validatePictureConfig(config),
    Content: PictureContent,
  })
}
