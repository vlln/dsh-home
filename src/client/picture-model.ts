/**
 * 图片卡：把用户填的来源翻译成 `<img src>`，并在本地路径上走宿主的只读路由。
 *
 * 纯函数，可单测：不发请求、不读文件。
 *
 * @module @vlln/dsh-home/client/picture-model
 */

export type PictureConfig = { src: string; title: string; fit: 'cover' | 'contain'; bleed?: boolean }

// A picked file is embedded as a data URL: there is no host call that copies a file into the
// DSH home, and a bare path from a <input type=file> is not readable. 400 KB keeps the
// workbench document small; anything larger is meant to be referenced by path.
export const PICTURE_SRC_MAX = 560_000
export const PICTURE_TITLE_MAX = 80

export function defaultPictureConfig(): PictureConfig {
  return { src: '', title: '', fit: 'cover' }
}

export function validatePictureConfig(value: unknown): value is PictureConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'src' || key === 'title' || key === 'fit' || key === 'bleed')
    && typeof config.src === 'string' && config.src.length <= PICTURE_SRC_MAX
    && typeof config.title === 'string' && config.title.length <= PICTURE_TITLE_MAX
    && (config.fit === 'cover' || config.fit === 'contain')
    && (config.bleed === undefined || typeof config.bleed === 'boolean')
}

/** 宿主的本地图片路由（与 `src/index.mjs` 的 `IMAGE_PATH` 同源）。 */
export const IMAGE_PATH = '/api/dsh-home/image'

/** 选图上传路由（与 `src/index.mjs` 的 `PICTURE_PATH` 同源）。 */
export const PICTURE_UPLOAD_PATH = '/api/dsh-home/picture'

/**
 * 一张上传图片的上限，与宿主侧一致。
 *
 * 整份 widget 配置只有 8 KiB，图片字节永远进不了配置；选中的文件先由宿主落到
 * 插件数据目录，配置里只记一条短路径。
 */
export const PICTURE_UPLOAD_MAX = 8 * 1024 * 1024

export type PictureSource =
  | { kind: 'none' }
  | { kind: 'remote'; url: string }
  | { kind: 'local'; url: string }
  | { kind: 'embedded'; url: string }

/**
 * 把配置里的来源翻译成可渲染的 URL。
 * @param src 用户填写的地址或路径
 * @returns 远程地址直出；本地路径走宿主路由；空值与不认识的协议视为无来源
 */
export function pictureSource(src: string): PictureSource {
  const value = src.trim()
  if (value === '') return { kind: 'none' }
  if (/^https?:\/\//iu.test(value)) return { kind: 'remote', url: value }
  // A picked file is embedded as a data URL (see PICTURE_SRC_MAX); it is the one
  // scheme a user can produce from inside the dialog, so it must survive here.
  if (/^data:image\/[a-z+]+(;[a-z\d=.-]+)*,/iu.test(value)) return { kind: 'embedded', url: value }
  if (/^[a-z][a-z\d+.-]*:/iu.test(value)) return { kind: 'none' }
  if (!value.startsWith('/') && !value.startsWith('~/')) return { kind: 'none' }
  return { kind: 'local', url: `${IMAGE_PATH}?path=${encodeURIComponent(value)}` }
}
