/** Pure per-instance personal widget models; no store, DOM, or React dependencies. */
export type NotesConfig = { title: string; text: string }
export type ClockConfig = { label: string; timeZone: string; hour12: boolean }

export const PERSONAL_CONFIG_MAX_BYTES = 8 * 1024
export const PERSONAL_LABEL_MAX_LENGTH = 120
export const CLOCK_ZONE_MAX_LENGTH = 100
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

export function defaultNotesConfig(): NotesConfig { return { title: '', text: '' } }
export function defaultClockConfig(): ClockConfig { return { label: '', timeZone: '', hour12: false } }

export function validateNotesConfig(config: unknown): config is NotesConfig {
  if (!fields(config, ['title', 'text'])) return false
  if (typeof config.title !== 'string' || config.title.length > PERSONAL_LABEL_MAX_LENGTH
    || typeof config.text !== 'string' || config.text.length > PERSONAL_CONFIG_MAX_BYTES) return false
  return personalConfigBytes(config as NotesConfig) <= PERSONAL_CONFIG_MAX_BYTES
}

/** An empty zone deliberately omits Intl's timeZone option, following the browser's zone. */
export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || zone.length > CLOCK_ZONE_MAX_LENGTH || zone !== zone.trim()) return false
  if (zone === '') return true
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true } catch { return false }
}

export function validateClockConfig(config: unknown): config is ClockConfig {
  return fields(config, ['label', 'timeZone', 'hour12'])
    && typeof config.label === 'string' && config.label.length <= PERSONAL_LABEL_MAX_LENGTH
    && typeof config.hour12 === 'boolean' && isValidTimeZone(config.timeZone)
    && personalConfigBytes(config as ClockConfig) <= PERSONAL_CONFIG_MAX_BYTES
}

/** The caller supplies an explicit translated locale tag, never language guessed from prose. */
export function formatPersonalClock(now: number, config: ClockConfig, locale: string): { time: string; date: string } {
  const zone = config.timeZone === '' ? {} : { timeZone: config.timeZone }
  return {
    time: new Intl.DateTimeFormat(locale, { ...zone, hour: '2-digit', minute: '2-digit', hour12: config.hour12 }).format(now),
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
