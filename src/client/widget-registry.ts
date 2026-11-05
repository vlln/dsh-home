/** Pure widget registry: no React runtime, private store, persistence, or geometry imports. */
import type {
  HomeWidgets, JsonValue, RegisteredWidgetDefinition, WidgetConfigValidation,
  WidgetContentProps, WidgetDefaults, WidgetDefinition, WidgetInstance,
} from './widget-contract.ts'

import { legacyWidgetSizing, normalizeWidgetSizing, sizingDefaults } from './widget-sizing.ts'

export const WIDGET_JSON_LIMITS = Object.freeze({ maxDepth: 8, maxNodes: 4096, maxBytes: 8192, maxKeyLength: 256 })
export const WIDGET_DEFAULTS: Readonly<WidgetDefaults> = Object.freeze({
  size: 'm', height: 4, minWidth: 3, maxWidth: 12, minHeight: 3, maxHeight: 30,
})
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PUBLIC_TYPE_ID = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._/-]*):[a-z0-9][a-z0-9._/-]*$/

function fail(message: string): never { throw new Error(`homeWidgets: ${message}`) }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error) }
function synchronous(value: unknown, field: string): void {
  if (value instanceof Promise) {
    // An accidentally async callback may already have rejected; consume it before rejecting the API call.
    void value.catch(() => {})
    fail(`${field} must return synchronously, not a Promise`)
  }
}
function positiveVersion(value: unknown, field: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 1_000_000) fail(`${field} must be a positive safe integer at most 1000000`)
}
function stableId(value: unknown, field: string): asserts value is string {
  const maxLength = field === 'instanceId' ? 120 : 200
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength
    || value !== value.trim() || /[\s\u0000-\u001f\u007f]/u.test(value) || UNSAFE_KEYS.has(value)) {
    fail(`${field} must be a nonempty stable identifier (at most ${maxLength} characters, no whitespace/control characters)`)
  }
}

/** Validate AND independently clone JSON without invoking getters/toJSON or copying unsafe prototypes. */
export function cloneWidgetConfig(value: unknown): JsonValue {
  synchronous(value, 'config')
  let nodes = 0
  let characters = 0
  const ancestors = new Set<object>()
  const text = (value: string, path: string): void => {
    characters += value.length
    if (characters > WIDGET_JSON_LIMITS.maxBytes) fail(`${path}: config exceeds byte limit (8 KiB)`)
  }
  const visit = (input: unknown, depth: number, path: string): JsonValue => {
    if (++nodes > WIDGET_JSON_LIMITS.maxNodes) fail(`${path}: config exceeds node limit`)
    if (depth > WIDGET_JSON_LIMITS.maxDepth) fail(`${path}: config exceeds depth limit`)
    if (input === null || typeof input === 'boolean') return input
    if (typeof input === 'string') { text(input, path); return input }
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (typeof input !== 'object' || input === null) fail(`${path}: config must contain only finite JSON values`)
    if (ancestors.has(input)) fail(`${path}: config contains a cycle`)
    const array = Array.isArray(input)
    const proto = Object.getPrototypeOf(input)
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) {
      fail(`${path}: config must use plain objects and arrays`)
    }
    const keys = Reflect.ownKeys(input)
    if (keys.length > WIDGET_JSON_LIMITS.maxNodes + 1) fail(`${path}: config exceeds node limit`)
    ancestors.add(input)
    try {
      const result: JsonValue[] | { [key: string]: JsonValue } = array ? [] : {}
      if (array && input.length > WIDGET_JSON_LIMITS.maxNodes) fail(`${path}: config exceeds node limit`)
      for (const key of keys) {
        if (array && key === 'length') continue
        if (typeof key !== 'string') fail(`${path}: config cannot contain symbol keys`)
        if (UNSAFE_KEYS.has(key)) fail(`${path}.${key}: unsafe config key`)
        if (key.length > WIDGET_JSON_LIMITS.maxKeyLength) fail(`${path}: config key exceeds length limit`)
        if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length)) {
          fail(`${path}.${key}: arrays cannot contain named properties`)
        }
        const descriptor = Object.getOwnPropertyDescriptor(input, key)!
        if (!descriptor.enumerable || !('value' in descriptor)) fail(`${path}.${key}: config requires enumerable data properties`)
        if (!array) text(key, path)
        ;(result as { [key: string]: JsonValue })[key] = visit(descriptor.value, depth + 1, `${path}.${key}`)
      }
      if (array && Object.keys(result).length !== input.length) fail(`${path}: config cannot contain sparse arrays`)
      return result
    } finally { ancestors.delete(input) }
  }
  const result = visit(value, 0, 'config')
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > WIDGET_JSON_LIMITS.maxBytes) {
    fail('config exceeds byte limit (8 KiB)')
  }
  return result
}

function validateResult(value: WidgetConfigValidation): void {
  synchronous(value, 'validateConfig')
  if (value === false) fail('validateConfig rejected config')
  if (typeof value === 'string' && value.length > 0) fail(`validateConfig: ${value}`)
  if (value !== undefined && value !== true && typeof value !== 'string') {
    fail('validateConfig must return boolean, string, or undefined synchronously')
  }
}

/** Application-level validation receives its own clone and cannot mutate the accepted value. */
export function validateWidgetConfig<C extends JsonValue>(definition: WidgetDefinition<C>, input: unknown): C {
  const config = cloneWidgetConfig(input) as C
  validateResult(definition.validateConfig(cloneWidgetConfig(config) as C))
  return config
}

function defaultsFor(input: WidgetDefinition['defaults']): Readonly<WidgetDefaults> {
  if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) fail('defaults must be an object')
  const defaults = { ...WIDGET_DEFAULTS, ...input }
  for (const key of Object.keys(defaults)) {
    if (!Object.hasOwn(WIDGET_DEFAULTS, key)) fail(`defaults.${key} is not supported`)
  }
  if (!['s', 'm', 'l'].includes(defaults.size)) fail('defaults.size must be s, m, or l')
  for (const key of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'height'] as const) {
    const value = defaults[key]
    const max = key.endsWith('Width') ? 12 : 30
    const min = 3
    if (!Number.isInteger(value) || value < min || value > max) fail(`defaults.${key} must be an integer between ${min} and ${max}`)
  }
  if (defaults.minWidth > defaults.maxWidth) fail('defaults.minWidth must not exceed maxWidth')
  if (defaults.minHeight > defaults.maxHeight) fail('defaults.minHeight must not exceed maxHeight')
  if (defaults.height < defaults.minHeight || defaults.height > defaults.maxHeight) fail('defaults.height must be within minHeight/maxHeight')
  const width = defaults.size === 's' ? 4 : defaults.size === 'm' ? 8 : 12
  if (width < defaults.minWidth || width > defaults.maxWidth) fail('defaults.size must fit minWidth/maxWidth on the 12-column grid')
  return Object.freeze(defaults)
}

/** Each preview is ephemeral: no registry/store mutation, live instance or persisted data is read. */
export function createWidgetPreviewProps<C extends JsonValue>(
  definition: RegisteredWidgetDefinition<C>,
  dimensions: Pick<WidgetContentProps, 'size' | 'width' | 'height'>,
): WidgetContentProps<C> {
  const config = validateWidgetConfig(definition, (definition.preview?.config ?? definition.defaultConfig)())
  return {
    ...dimensions, config,
    instance: { instanceId: 'home-gallery-preview', typeId: definition.typeId, configVersion: definition.configVersion, config },
    editing: false, visible: true,
    preview: { data: cloneWidgetConfig(definition.preview?.data ?? null) },
  }
}

function freezeJson(value: JsonValue): JsonValue {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child)
    Object.freeze(value)
  }
  return value
}

/** Only the home-owned legacy slot adapter may pass this option, never external public service callers. */
export interface InternalWidgetRegistrationOptions { internalLegacyTypeId: true }

export class HomeWidgetRegistry implements HomeWidgets {
  private entries = new Map<string, RegisteredWidgetDefinition>()
  private snapshot: readonly RegisteredWidgetDefinition[] = Object.freeze([])
  private listeners = new Set<() => void>()

  readonly getSnapshot = (): readonly RegisteredWidgetDefinition[] => this.snapshot
  readonly get = (typeId: string): RegisteredWidgetDefinition | undefined => this.entries.get(typeId)
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    let active = true
    return () => { if (active) { active = false; this.listeners.delete(listener) } }
  }

  /** Example: ctx.effect(() => ctx.homeWidgets.register(definition)). No context is retained. */
  register<C extends JsonValue>(definition: WidgetDefinition<C>, internal?: InternalWidgetRegistrationOptions): () => void {
    if (definition === null || typeof definition !== 'object') fail('widget definition must be an object')
    const typeId = definition.typeId
    stableId(typeId, 'typeId')
    const legacy = internal?.internalLegacyTypeId === true && typeId.startsWith('legacy:')
    if ((!PUBLIC_TYPE_ID.test(typeId) || typeId.startsWith('legacy:')) && !legacy) {
      fail(`typeId "${typeId}" must be namespaced (e.g. @acme/widgets:clock); legacy: is reserved for the internal adapter`)
    }
    if (this.entries.has(typeId)) fail(`duplicate typeId "${typeId}"`)
    if (definition.apiVersion !== 1) fail(`"${typeId}": apiVersion must be 1`)
    positiveVersion(definition.configVersion, 'configVersion')
    for (const key of ['title', 'description'] as const) {
      const value = definition[key]
      if (key === 'description' && value === undefined) continue
      if (typeof value !== 'function' && (typeof value !== 'string' || value.trim() === '')) fail(`"${typeId}": ${key} must be nonempty text or a localized text function`)
    }
    if (definition.source !== undefined && (typeof definition.source !== 'string' || definition.source.trim() === '')) fail('source must be nonempty text')
    for (const key of ['defaultConfig', 'validateConfig', 'migrateConfig'] as const) {
      if (key === 'migrateConfig' && definition[key] === undefined) continue
      if (typeof definition[key] !== 'function') fail(`"${typeId}": ${key} must be a synchronous function`)
    }
    // Function/class components plus React memo/forwardRef objects (identified without importing React).
    for (const key of ['Content', 'Settings', 'icon', 'Preview'] as const) {
      const value = definition[key]
      if (key !== 'Content' && value === undefined) continue
      const wrapped = value !== null && typeof value === 'object' && '$$typeof' in value
        && [Symbol.for('react.memo'), Symbol.for('react.forward_ref'), Symbol.for('react.lazy')].includes((value as { $$typeof: symbol }).$$typeof)
      if (typeof value !== 'function' && !wrapped) fail(`"${typeId}": ${key} must be a React component`)
    }
    if (definition.sizing !== undefined && definition.defaults !== undefined) fail('use sizing or legacy defaults, not both')
    const sizing = definition.sizing === undefined ? legacyWidgetSizing(defaultsFor(definition.defaults)) : normalizeWidgetSizing(definition.sizing)
    const defaults = sizingDefaults(sizing)
    const factory = definition.defaultConfig
    const validator = definition.validateConfig
    const sample = definition.preview
    let preview: WidgetDefinition<C>['preview']
    if (sample !== undefined) {
      if (sample === null || typeof sample !== 'object' || Array.isArray(sample)
        || ![Object.prototype, null].includes(Object.getPrototypeOf(sample))) fail('preview must be a plain object')
      for (const key of Reflect.ownKeys(sample)) {
        if (key !== 'config' && key !== 'data') fail('preview supports only config and data')
        const descriptor = Object.getOwnPropertyDescriptor(sample, key)!
        if (!descriptor.enumerable || !('value' in descriptor)) fail(`preview.${key} must be a data property`)
      }
      const sampleFactory = sample.config
      if (sampleFactory !== undefined && typeof sampleFactory !== 'function') fail('preview.config must be a synchronous function')
      preview = Object.freeze({
        ...(sampleFactory === undefined ? {} : { config: () => {
          try { return validateWidgetConfig({ validateConfig: validator } as WidgetDefinition<C>, sampleFactory()) }
          catch (error) { fail(`"${typeId}" preview.config: ${message(error)}`) }
        } }),
        data: freezeJson(cloneWidgetConfig(sample.data ?? null)),
      })
      preview.config?.()
    }
    const normalized = {
      ...definition, defaults, sizing, preview,
      defaultConfig: () => {
        try { return validateWidgetConfig({ validateConfig: validator } as WidgetDefinition<C>, factory()) }
        catch (error) { fail(`"${typeId}" defaultConfig: ${message(error)}`) }
      },
    }
    normalized.defaultConfig()
    // Callbacks above may reenter registration: never overwrite an entry published in the meantime.
    if (this.entries.has(typeId)) fail(`duplicate typeId "${typeId}"`)
    const entry = Object.freeze(normalized) as unknown as RegisteredWidgetDefinition
    this.entries.set(typeId, entry)
    this.publish()
    let active = true
    return () => {
      if (!active) return
      active = false
      if (this.entries.get(typeId) !== entry) return
      this.entries.delete(typeId)
      this.publish()
    }
  }

  readonly createInstance = (typeId: string, instanceId: string): WidgetInstance => {
    stableId(instanceId, 'instanceId')
    const definition = this.entries.get(typeId)
    if (!definition) fail(`unknown typeId "${typeId}"`)
    return { instanceId, typeId, configVersion: definition.configVersion, config: definition.defaultConfig() }
  }

  private publish(): void {
    this.snapshot = Object.freeze([...this.entries.values()])
    for (const listener of [...this.listeners]) {
      // A broken consumer must not strand a successful registration before its disposer is returned.
      try { listener() }
      catch (error) { console.error('[dsh-home] widget registry subscriber failed', error) }
    }
  }
}

export type WidgetMigrationResult<C extends JsonValue = JsonValue> =
  | { ok: true; instance: WidgetInstance<C>; migrated: boolean }
  | { ok: false; instance: WidgetInstance; error: string }

/** A failed migration returns the exact original instance, including its raw config, without writes. */
export function migrateWidgetInstance<C extends JsonValue>(
  definition: WidgetDefinition<C>, instance: WidgetInstance,
): WidgetMigrationResult<C> {
  try {
    if (instance.typeId !== definition.typeId) fail('instance typeId does not match widget definition')
    stableId(instance.instanceId, 'instanceId')
    positiveVersion(definition.configVersion, 'target configVersion')
    positiveVersion(instance.configVersion, 'instance configVersion')
    if (instance.configVersion > definition.configVersion) fail('instance configVersion is newer than the installed widget')
    let config = cloneWidgetConfig(instance.config)
    const migrated = instance.configVersion < definition.configVersion
    if (migrated) {
      if (!definition.migrateConfig) fail('migrateConfig is required for older configVersion')
      config = definition.migrateConfig(config, instance.configVersion, definition.configVersion)
    }
    const validated = validateWidgetConfig(definition, config)
    return { ok: true, migrated, instance: { instanceId: instance.instanceId, typeId: instance.typeId, configVersion: definition.configVersion, config: validated } }
  } catch (error) {
    return { ok: false, instance, error: `Widget "${instance.typeId}" config: ${message(error)}` }
  }
}
