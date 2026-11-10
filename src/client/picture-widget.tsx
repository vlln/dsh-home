/**
 * 图片卡：一张图 + 可选标题。来源可以是 http(s) 地址，也可以是本地绝对路径。
 *
 * 本地路径由宿主的只读路由读出（`<img>` 无法直接读文件），限制图片扩展名与 20 MB；
 * 加载失败只显示占位块和路径，不留破图。无网络请求的预览用内联 SVG。
 *
 * 卡片正文本身就是入口：点图片（或空槽）打开宿主的 Modal，里面只放宿主的表单规格
 * （`dsh-modal-*`，与宿主 settings-form 同尺）和宿主的控件。
 *
 * @module @vlln/dsh-home/client/picture-widget
 */

import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useBuiltin } from './builtin-registration.tsx'
import { Button, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { pictureSource, validatePictureConfig, PICTURE_UPLOAD_MAX, PICTURE_UPLOAD_PATH, type PictureConfig } from './picture-model.ts'
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

/** 文本来源的上限：足够放下任何地址或路径，又不会把几十兆塞进输入框。 */
const SRC_TEXT_MAX = 1024

function PictureSettings({ config, onConfigChange }: WidgetSettingsProps<PictureConfig>): ReactNode {
  const { t } = useBuiltin()
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState<'idle' | 'busy' | 'too-large' | 'failed'>('idle')
  // The picked file never becomes a config value: a widget config is capped at 8 KiB, so a
  // data URL made every save invalid. The host stores the bytes and hands back a short path.
  const pick = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    if (file.size > PICTURE_UPLOAD_MAX) { setFailure('too-large'); return }
    setFailure('busy')
    try {
      const response = await fetch(PICTURE_UPLOAD_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: await file.arrayBuffer(),
      })
      if (!response.ok) { setFailure(response.status === 413 ? 'too-large' : 'failed'); return }
      const stored: unknown = await response.json()
      const path = stored !== null && typeof stored === 'object' ? (stored as { path?: unknown }).path : undefined
      if (typeof path !== 'string' || path === '') { setFailure('failed'); return }
      setFailure('idle')
      onConfigChange({ ...config, src: path })
    } catch { setFailure('failed') }
  }
  return <div className="dsh-modal-form">
    <div className="dsh-modal-field">
      <div className="dsh-modal-head">
        <label className="dsh-modal-label" htmlFor={`${id}-src`}>{t('picture.src')}</label>
        {/* A text path is unusable on a machine you cannot browse: the picker sits on the
            label line, the input keeps the whole column. The Button opens the hidden
            input itself: a click on a nested button never forwards to a label. */}
        <span className="dsh-picture-pick">
          <input ref={fileRef} type="file" accept="image/*" className="sr-only"
            onChange={event => { void pick(event.target.files?.[0]); event.target.value = '' }} />
          <Button variant="outline" size="sm" disabled={failure === 'busy'} onClick={() => fileRef.current?.click()}>
            {t(failure === 'busy' ? 'picture.uploading' : 'picture.choose')}
          </Button>
        </span>
      </div>
      <input id={`${id}-src`} className="dsh-modal-input" type="text" maxLength={SRC_TEXT_MAX}
        value={config.src}
        placeholder={t('picture.srcPlaceholder')}
        onChange={event => { setFailure('idle'); onConfigChange({ ...config, src: event.target.value }) }} />
      {failure === 'too-large' && <p className="dsh-modal-error" role="alert">{t('picture.tooLarge')}</p>}
      {failure === 'failed' && <p className="dsh-modal-error" role="alert">{t('picture.saveFailed')}</p>}
    </div>
    <div className="dsh-modal-field">
      <label className="dsh-modal-label" htmlFor={`${id}-title`}>{t('picture.title')}</label>
      <input id={`${id}-title`} className="dsh-modal-input" type="text" maxLength={80} value={config.title}
        onChange={event => onConfigChange({ ...config, title: event.target.value })} />
    </div>
    <div className="dsh-modal-field">
      <span className="dsh-modal-label">{t('picture.fit')}</span>
      <SegmentedControl id={`${id}-fit`} label={t('picture.fit')} value={config.fit}
        options={[{ value: 'cover', label: t('picture.fitCover') }, { value: 'contain', label: t('picture.fitContain') }]}
        onChange={value => onConfigChange({ ...config, fit: value === 'contain' ? 'contain' : 'cover' })} />
    </div>
    <div className="dsh-modal-field" data-row="true">
      <span className="dsh-modal-label" aria-hidden="true">{t('picture.bleed')}</span>
      <Switch checked={config.bleed === true} label={t('picture.bleed')}
        onChange={value => onConfigChange({ ...config, bleed: value })} />
    </div>
  </div>
}

function PictureEmpty({ label, detail }: { label: string; detail?: string }): ReactNode {
  return <span className="dsh-picture-empty">
    <span className="dsh-picture-empty-glyph" aria-hidden="true">▧</span>
    <span>{label}</span>
    {detail !== undefined && <span className="dsh-picture-path">{detail}</span>}
  </span>
}

function PictureBody({ config, t, fallback, onOpen }: { config: PictureConfig; t: Translate; fallback?: string; onOpen?: () => void }): ReactNode {
  const [failed, setFailed] = useState<string | null>(null)
  const source = pictureSource(fallback ?? config.src)
  const empty = source.kind === 'none'
    ? <PictureEmpty label={t('picture.empty')} />
    : failed === source.url
      ? <PictureEmpty label={t('picture.failed')} detail={source.kind === 'local' ? config.src : undefined} />
      : <figure className={config.bleed === true ? 'dsh-picture dsh-picture-bleed' : 'dsh-picture'}>
        <img src={source.url} alt={config.title === '' ? t('picture.alt') : config.title}
          style={{ objectFit: config.fit }} loading="lazy" decoding="async" onError={() => setFailed(source.url)} />
        {config.title !== '' && <figcaption className="dsh-picture-caption text-caption-1-medium">{config.title}</figcaption>}
      </figure>
  if (onOpen === undefined) return empty
  return <button type="button" className="dsh-picture-hit" onClick={onOpen} aria-label={t('picture.settings')}>{empty}</button>
}

export function PictureContent(props: WidgetContentProps<PictureConfig>): ReactNode {
  const { t } = useBuiltin()
  if (props.preview !== undefined) {
    return <PictureBody t={t} config={{ ...props.config, title: props.config.title === '' ? t('widget.picture.title') : props.config.title }} fallback={PREVIEW_SRC} />
  }
  // While the board is being arranged the card must still show its picture: the body IS
  // the trigger, and an editor that renders nothing left an empty card in edit mode.
  if (props.editing) return <div className="dsh-picture-wrap"><PictureBody t={t} config={props.config} /></div>
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
