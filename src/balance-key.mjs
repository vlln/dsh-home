/**
 * 余额 key 的候选凭据引用。
 *
 * settings.describe() 的行是 `{ ns, schema, value, ... }`（dsh-settings 0.2.2-rc.1 起
 * 形状），`apiKeyEnv` 在 `value` 里；更早的宿主把 `apiKeyEnv` 平铺在行上——两种形状都认。
 * 凭据只在宿主侧解析，这里只产出引用名。
 *
 * @module @vlln/dsh-home/balance-key
 */

/**
 * describe() 行 → 候选凭据引用（去重；ns 含 deepseek 的行优先）。
 * @param {unknown} rows settings.describe() 的结果
 * @returns {string[]} 凭据引用；空数组表示没有声明
 */
export function platformKeyRefs(rows) {
  const seen = new Set()
  const refs = []
  const push = value => {
    const ref = plainRef(value)
    if (typeof ref !== 'string' || ref === '' || seen.has(ref)) return
    seen.add(ref)
    refs.push(ref)
  }
  const ordered = (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(b.row) - rank(a.row) || a.index - b.index)
  for (const { row } of ordered) {
    push(row?.apiKeyEnv)
    push(row?.value?.apiKeyEnv)
    const providers = row?.value?.providers
    if (providers === null || typeof providers !== 'object') continue
    for (const provider of Object.values(providers)) push(provider?.apiKeyEnv)
  }
  return refs
}

/** volatile 叶子（`{ get() }`）解引用；其余原样返回。 */
function plainRef(value) {
  if (value === null || typeof value !== 'object' || typeof value.get !== 'function') return value
  try {
    return value.get()
  } catch {
    return undefined
  }
}

/** deepseek 的行优先：别拿别的 provider 的 key 去查余额。 */
function rank(row) {
  return typeof row?.ns === 'string' && /deepseek/i.test(row.ns) ? 1 : 0
}
