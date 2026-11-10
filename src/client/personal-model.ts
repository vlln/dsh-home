/** Pure per-instance personal widget models; no store, DOM, or React dependencies. */
/** v2: 便笺就是一个文本块，首行即标题；旧配置里的 title 合并进第一行。 */
export type NotesConfig = { text: string }
/**
 * v4：12/24 制回来了，但不再是设置项——点一下时间就切换。
 * `hour12: null` 表示「跟随语言环境的默认」，这也是迁移默认值。
 */
export type ClockConfig = { timeZone: string; hour12: boolean | null }

export const PERSONAL_CONFIG_MAX_BYTES = 8 * 1024
export const PERSONAL_LABEL_MAX_LENGTH = 120
export const CLOCK_ZONE_MAX_LENGTH = 100

/** 下拉里提供的时区：常见的几档 + 浏览器时区；用户手改的时区也会作为一项保留。 */
export const CLOCK_ZONES: readonly string[] = [
  'UTC',
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Seoul',
  'Asia/Singapore', 'Asia/Bangkok', 'Asia/Kolkata', 'Asia/Dubai',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'Pacific/Honolulu',
]
const encoder = new TextEncoder()

/** Count serialized UTF-8, including JSON escaping and property names, not JS code units. */
export function personalConfigBytes(config: NotesConfig | ClockConfig): number {
  return encoder.encode(JSON.stringify(config)).byteLength
}

/** Require exactly this version's data fields; never invoke accessors or normalize saved input. */
function fields(value: unknown, names: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto: unknown = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  const keys = Reflect.ownKeys(value)
  return keys.length === names.length && names.every(name => {
    const property = Object.getOwnPropertyDescriptor(value, name)
    return property !== undefined && property.enumerable && 'value' in property
  })
}

export function defaultNotesConfig(): NotesConfig { return { text: '' } }
export function defaultClockConfig(): ClockConfig { return { timeZone: '', hour12: null } }

export function validateNotesConfig(config: unknown): config is NotesConfig {
  if (!fields(config, ['text'])) return false
  if (typeof config.text !== 'string' || config.text.length > PERSONAL_CONFIG_MAX_BYTES) return false
  return personalConfigBytes(config as NotesConfig) <= PERSONAL_CONFIG_MAX_BYTES
}

/** v1 → v2: 旧便笺的标题变成第一行，内容跟在空行之后；不会静默丢字。 */
export function migrateNotesConfig(config: unknown, fromVersion: number): NotesConfig {
  if (fromVersion >= 2) return validateNotesConfig(config) ? config : defaultNotesConfig()
  if (config === null || typeof config !== 'object' || Array.isArray(config)) return defaultNotesConfig()
  const old = config as { title?: unknown; text?: unknown }
  const title = typeof old.title === 'string' ? old.title.trim() : ''
  const text = typeof old.text === 'string' ? old.text.trim() : ''
  const merged = title === '' ? text : text === '' ? title : `${title}\n\n${text}`
  return { text: merged }
}

/** An empty zone deliberately omits Intl's timeZone option, following the browser's zone. */
export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || zone.length > CLOCK_ZONE_MAX_LENGTH || zone !== zone.trim()) return false
  if (zone === '') return true
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true } catch { return false }
}

/** A missing cycle is v3 data; `migrateClockConfig` turns it into `null`, validation stays exact. */
export function isValidHour12(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean'
}

export function validateClockConfig(config: unknown): config is ClockConfig {
  return fields(config, ['timeZone', 'hour12']) && isValidTimeZone(config.timeZone)
    && isValidHour12(config.hour12)
    && personalConfigBytes(config as ClockConfig) <= PERSONAL_CONFIG_MAX_BYTES
}

/**
 * v2/v3 → v4：保留时区（非法时区退回浏览器时区），把 12/24 制补成一个可空值。
 * v2 的 `hour12` 是个布尔开关，v3 丢掉了它；迁移时如果还在就接住，否则跟随语言环境。
 */
export function migrateClockConfig(config: unknown, fromVersion: number): ClockConfig {
  if (fromVersion >= 4) return validateClockConfig(config) ? config : defaultClockConfig()
  if (config === null || typeof config !== 'object' || Array.isArray(config)) return defaultClockConfig()
  const old = config as { timeZone?: unknown; hour12?: unknown }
  return {
    timeZone: isValidTimeZone(old.timeZone) ? old.timeZone : '',
    hour12: typeof old.hour12 === 'boolean' ? old.hour12 : null,
  }
}

/** Intl option for the chosen cycle; omitting it leaves the hour cycle to the locale. */
function hour12Option(config: ClockConfig): { hour12?: boolean } {
  return typeof config.hour12 === 'boolean' ? { hour12: config.hour12 } : {}
}

/** What the reader is actually looking at: the chosen cycle, or the locale's own. */
export function clockHour12(config: ClockConfig, locale: string): boolean {
  if (typeof config.hour12 === 'boolean') return config.hour12
  const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions()
  return resolved.hour12 === true || resolved.hourCycle === 'h11' || resolved.hourCycle === 'h12'
}

/** The caller supplies an explicit translated locale tag, never language guessed from prose. */
export function formatPersonalClock(now: number, config: ClockConfig, locale: string): { time: string; date: string } {
  const zone = config.timeZone === '' ? {} : { timeZone: config.timeZone }
  return {
    // The locale owns the hour cycle (en-US 12h, zh-CN 24h) until the reader flips it.
    time: new Intl.DateTimeFormat(locale, { ...zone, ...hour12Option(config), hour: '2-digit', minute: '2-digit' }).format(now),
    date: new Intl.DateTimeFormat(locale, { ...zone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now),
  }
}

export function millisecondsToNextMinute(now: number): number {
  return 60_000 - ((now % 60_000 + 60_000) % 60_000)
}

/** Minimal injectable scheduler makes visibility/resume/cleanup deterministic in standalone tests. */
export interface MinuteClockEnvironment {
  now: () => number
  hidden: () => boolean
  schedule: (callback: () => void, delay: number) => unknown
  cancel: (handle: unknown) => void
  subscribeVisibility: (callback: () => void) => () => void
}

/** Update immediately and at minute boundaries; hidden tabs have no pending timer. */
export function startMinuteClock(onTick: (now: number) => void, environment: MinuteClockEnvironment): () => void {
  let stopped = false
  let timer: unknown
  let scheduled = false
  const clear = (): void => {
    if (scheduled) environment.cancel(timer)
    scheduled = false
  }
  const tick = (): void => {
    clear()
    if (stopped || environment.hidden()) return
    onTick(environment.now())
    if (stopped) return
    timer = environment.schedule(tick, millisecondsToNextMinute(environment.now()))
    scheduled = true
  }
  const unsubscribe = environment.subscribeVisibility(tick)
  tick()
  return () => { stopped = true; clear(); unsubscribe() }
}
