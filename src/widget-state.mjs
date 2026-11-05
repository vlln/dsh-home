/** Durable widget identities. Registry availability never determines stored instances. */
export const BUILTIN_WIDGET_IDS = Object.freeze(['recent', 'tasks', 'resume', 'queue', 'today', 'running', 'areas', 'rhythm', 'quick'])
export const MAX_INSTANCES = 64
export const MAX_CONFIG_BYTES = 8 * 1024
export const MAX_WORKBENCH_BYTES = 256 * 1024

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
export const validInstanceId = value => typeof value === 'string' && value.length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/u.test(value)

export function widgetStateError(message, code = 'bad-workbench') {
  return Object.assign(new Error(message), { code })
}

/** Strict JSON, including callers that bypass the HTTP JSON decoder. */
function assertJson(value, depth = 0, ancestors = new Set(), budget = { nodes: 0 }) {
  if (++budget.nodes > 4096 || depth > 8) throw widgetStateError('config exceeds JSON complexity limits')
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'object' || ancestors.has(value)) throw widgetStateError('config must contain finite JSON values only')
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw widgetStateError('config must contain plain JSON objects only')
  }
  if (Object.getOwnPropertySymbols(value).length) throw widgetStateError('config cannot contain symbol keys')
  ancestors.add(value)
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!Object.hasOwn(descriptor, 'value')) throw widgetStateError('config cannot contain accessors')
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw widgetStateError('config arrays must be dense JSON arrays')
    for (const item of value) assertJson(item, depth + 1, ancestors, budget)
  } else {
    for (const [key, item] of Object.entries(value)) {
      if (key.length > 256 || ['__proto__', 'constructor', 'prototype'].includes(key)) throw widgetStateError('config key is invalid')
      assertJson(item, depth + 1, ancestors, budget)
    }
  }
  ancestors.delete(value)
}

export function validateInstances(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_INSTANCES) throw widgetStateError('instances must be an array of at most 64 items')
  if (Object.keys(raw).length !== raw.length) throw widgetStateError('instances must be a dense array')
  const seen = new Set()
  return raw.map(instance => {
    if (!record(instance) || Object.keys(instance).sort().join(',') !== 'config,configVersion,instanceId,typeId') {
      throw widgetStateError('instance fields must be instanceId, typeId, configVersion, config')
    }
    const { instanceId, typeId, configVersion, config } = instance
    if (!validInstanceId(instanceId) || seen.has(instanceId)) throw widgetStateError('invalid or duplicate instanceId')
    if (typeof typeId !== 'string' || typeId.length > 256 || !/^[^\s:]+:[^\s]+$/u.test(typeId)) throw widgetStateError('invalid typeId')
    if (!Number.isSafeInteger(configVersion) || configVersion < 1 || configVersion > 1_000_000) throw widgetStateError('invalid configVersion')
    assertJson(config)
    const json = JSON.stringify(config)
    if (Buffer.byteLength(json) > MAX_CONFIG_BYTES) throw widgetStateError('config exceeds 8 KiB')
    seen.add(instanceId)
    return { instanceId, typeId, configVersion, config: JSON.parse(json) }
  })
}

/** Union includes hidden, size-only and every breakpoint's absent/uninstalled IDs. */
export function layoutInstanceIds(layout) {
  if (!layout) return []
  return [...new Set([
    ...(layout.order ?? []), ...(layout.focusOrder ?? []), ...(layout.hidden ?? []),
    ...Object.keys(layout.size ?? {}),
    ...Object.values(layout.positions ?? {}).flatMap(rows => Object.keys(rows)),
  ])]
}

export function initialInstances(layout = null) {
  const ids = [...new Set([...BUILTIN_WIDGET_IDS, ...layoutInstanceIds(layout)])]
  return validateInstances(ids.map(instanceId => ({
    instanceId,
    typeId: BUILTIN_WIDGET_IDS.includes(instanceId) ? `@vlln/dsh-home:${instanceId}` : `legacy:${instanceId}`,
    configVersion: 1,
    config: {},
  })))
}

/** New workbench writes are strict; the exported legacy normalizer stays permissive. */
export function validateWorkbenchLayout(raw, normalizeLayout) {
  if (raw === null) return null
  if (!record(raw)) throw widgetStateError('layout must be an object or null')
  const keys = new Set(['order', 'focusOrder', 'hidden', 'size', 'positions', 'instanceLayout'])
  if (Object.keys(raw).some(key => !keys.has(key))) throw widgetStateError('unknown layout field')
  if (raw.instanceLayout !== undefined && typeof raw.instanceLayout !== 'boolean') throw widgetStateError('invalid instanceLayout flag')
  for (const key of ['order', 'focusOrder', 'hidden']) {
    if (raw[key] === undefined) continue
    if (!Array.isArray(raw[key]) || raw[key].length > 64 || raw[key].some(id => !validInstanceId(id)) || new Set(raw[key]).size !== raw[key].length) {
      throw widgetStateError(`invalid layout ${key}`)
    }
  }
  if (raw.size !== undefined && (!record(raw.size) || Object.keys(raw.size).length > 64 || Object.entries(raw.size).some(([id, size]) => !validInstanceId(id) || !['s', 'm', 'l'].includes(size)))) {
    throw widgetStateError('invalid layout size')
  }
  if (raw.positions !== undefined) {
    if (!record(raw.positions)) throw widgetStateError('invalid layout positions')
    for (const [columns, rows] of Object.entries(raw.positions)) {
      if (!['12', '6', '2'].includes(columns) || !record(rows) || Object.keys(rows).length > 64) throw widgetStateError('invalid layout breakpoint')
      for (const [id, rect] of Object.entries(rows)) {
        if (!validInstanceId(id) || !record(rect) || Object.keys(rect).sort().join(',') !== 'h,w,x,y') throw widgetStateError('invalid layout rectangle')
        const { x, y, w, h } = rect
        if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || y > 10000 || w < 1 || x + w > Number(columns) || h < 3 || h > 30) throw widgetStateError('invalid layout geometry')
      }
    }
  }
  return normalizeLayout(raw)
}

export function validateWorkbench(raw, normalizeLayout) {
  if (!record(raw)) throw widgetStateError('workbench must be an object')
  const layout = validateWorkbenchLayout(raw.layout, normalizeLayout)
  const instances = validateInstances(raw.instances)
  const ids = new Set(instances.map(instance => instance.instanceId))
  if (layoutInstanceIds(layout).some(id => !ids.has(id))) throw widgetStateError('layout references an unknown instanceId')
  const result = { layout, instances }
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_WORKBENCH_BYTES) throw widgetStateError('workbench exceeds 256 KiB')
  return result
}
