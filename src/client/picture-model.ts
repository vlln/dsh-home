/**
 * 图片卡：把用户填的来源翻译成 `<img src>`，并在本地路径上走宿主的只读路由。
 *
 * 纯函数，可单测：不发请求、不读文件。
 *
 * @module @vlln/dsh-home/client/picture-model
 */

export type PictureConfig = { src: string; title: string; fit: 'cover' | 'contain' }

export const PICTURE_SRC_MAX = 1024
export const PICTURE_TITLE_MAX = 80

export function defaultPictureConfig(): PictureConfig {
  return { src: '', title: '', fit: 'cover' }
}

export function validatePictureConfig(value: unknown): value is PictureConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Record<string, unknown>
  return Object.keys(config).every(key => key === 'src' || key === 'title' || key === 'fit')
    && typeof config.src === 'string' && config.src.length <= PICTURE_SRC_MAX
    && typeof config.title === 'string' && config.title.length <= PICTURE_TITLE_MAX
    && (config.fit === 'cover' || config.fit === 'contain')
}

/** 宿主的本地图片路由（与 `src/index.mjs` 的 `IMAGE_PATH` 同源）。 */
export const IMAGE_PATH = '/api/dsh-home/image'

export type PictureSource =
  | { kind: 'none' }
  | { kind: 'remote'; url: string }
  | { kind: 'local'; url: string }

/**
 * 把配置里的来源翻译成可渲染的 URL。
 * @param src 用户填写的地址或路径
 * @returns 远程地址直出；本地路径走宿主路由；空值与不认识的协议视为无来源
 */
export function pictureSource(src: string): PictureSource {
  const value = src.trim()
  if (value === '') return { kind: 'none' }
  if (/^https?:\/\//iu.test(value)) return { kind: 'remote', url: value }
  if (/^[a-z][a-z\d+.-]*:/iu.test(value)) return { kind: 'none' }
  if (!value.startsWith('/') && !value.startsWith('~/')) return { kind: 'none' }
  return { kind: 'local', url: `${IMAGE_PATH}?path=${encodeURIComponent(value)}` }
}
