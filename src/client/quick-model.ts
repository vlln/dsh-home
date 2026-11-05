/** Pure, JSON-only configuration and navigation validation for each quick widget instance. */
import type { JsonValue } from './widget-contract.ts'

export const QUICK_TYPE_ID = '@vlln/dsh-home:quick'
export const QUICK_CONFIG_VERSION = 2
export const QUICK_LIMITS = Object.freeze({ links: 8, label: 80, url: 2048, session: 200, workdir: 4096 })
export const QUICK_KINDS = ['session', 'url', 'workdir'] as const
export type QuickKind = typeof QUICK_KINDS[number]
export type QuickLink = { kind: QuickKind; label: string; target: string }
export type QuickConfig = { links: QuickLink[] }
export type QuickError = 'config' | 'limit' | 'kind' | 'label' | 'url' | 'session' | 'workdir'

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u
const SCHEME = /^[a-z][a-z\d+.-]*:/iu
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() !== '' && !CONTROL.test(value)
}

/** Absolute HTTP(S) only: no protocol-relative URLs, credentials, control characters or scheme guessing. */
export function isSafeQuickUrl(value: unknown): value is string {
  if (!text(value, QUICK_LIMITS.url) || value !== value.trim() || !/^https?:\/\/[^/\\]/iu.test(value) || /\s|\\/u.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname !== '' && url.username === '' && url.password === ''
  } catch { return false }
}

/** Session identifiers are opaque host IDs, never paths, URIs or external navigation targets. */
export function isSafeQuickSession(value: unknown): value is string {
  return text(value, QUICK_LIMITS.session) && /^[a-z\d][a-z\d_.-]*$/iu.test(value)
}

/** Pass a bounded local path to the host workspace API; never resolve or execute it in the browser. */
export function isSafeQuickWorkdir(value: unknown): value is string {
  if (!text(value, QUICK_LIMITS.workdir) || value !== value.trim() || value.includes('://')) return false
  // Accept local POSIX/home/relative paths and Windows drive paths; reject URIs and network shares.
  if (/^[a-z]:[\\/]/iu.test(value)) return true
  return !SCHEME.test(value) && !value.startsWith('//') && !value.startsWith('\\\\') && !value.includes('://')
}

export function quickLinkError(value: unknown): QuickError | null {
  if (!record(value)) return 'config'
  if (!QUICK_KINDS.includes(value.kind as QuickKind)) return 'kind'
  if (!text(value.label, QUICK_LIMITS.label)) return 'label'
  if (Object.keys(value).some(key => !['kind', 'label', 'target'].includes(key))) return 'config'
  if (value.kind === 'url' && !isSafeQuickUrl(value.target)) return 'url'
  if (value.kind === 'session' && !isSafeQuickSession(value.target)) return 'session'
  if (value.kind === 'workdir' && !isSafeQuickWorkdir(value.target)) return 'workdir'
  return null
}

export function quickConfigError(value: unknown): QuickError | null {
  if (!record(value) || Object.keys(value).some(key => key !== 'links') || !Array.isArray(value.links)) return 'config'
  if (value.links.length > QUICK_LIMITS.links) return 'limit'
  for (const link of value.links) {
    const error = quickLinkError(link)
    if (error !== null) return error
  }
  return null
}

/** Prepare-only payload for the host action: an empty prompt never submits or replaces draft text. */
export function quickWorkdirDraft(target: string): { cwd: string; prompt: '' } {
  if (!isSafeQuickWorkdir(target)) throw new Error('Invalid quick working directory')
  return { cwd: target, prompt: '' }
}

/** Fresh arrays on every call, with no shared per-instance config. */
export function defaultQuickConfig(): QuickConfig { return { links: [] } }
export function validateQuickConfig(value: unknown): boolean { return quickConfigError(value) === null }

/** Keep the legacy instance and layout: only replace its formerly empty config. */
export function migrateQuickConfig(value: JsonValue, fromVersion: number, toVersion: number): QuickConfig {
  if (fromVersion !== 1 || toVersion !== QUICK_CONFIG_VERSION || !record(value) || Object.keys(value).length !== 0) {
    throw new Error('Unsupported quick widget configuration migration')
  }
  return defaultQuickConfig()
}
