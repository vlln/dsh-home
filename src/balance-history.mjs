/**
 * 今日消费：平台只给余额，不给消费明细。
 *
 * `GET /user/balance` 只有三个数（总额 / 赠送 / 充值），没有「今天花了多少」，也没有
 * 按天的账单接口。所以消费只能拿余额自己算：**今天的余额和今天之前最后一次读到的余额
 * 做差**，再把今天新增的充值补回去（充值会让余额变大，不补的话会把充值算成负消费）。
 *
 * 口径写死在这里，因为它决定了数字的误差：
 *
 * - 每次真去平台读一次，就记一条 `{ at, total, toppedUp }`。
 * - 今日消费 = `(基线.total + max(0, 最新.toppedUp - 基线.toppedUp)) - 最新.total`，
 *   小于 0 时记 0（赠送额度到账、或平台调整都会让差值失真，只夹到 0，不改符号）。
 * - 基线 = **今天之前**的最后一条读数；今天之前一条都没有时，退到今天的第一次读数，
 *   这时它只是「自今天首次读数以来」，`partial` 会标出来。
 * - 赠送额度过期、以及跨设备/换 key 的账户变动，都会被算进这个差值——这是这条口径
 *   已知的偏差，宁可记在这里，也不假装精确。
 *
 * 读数要按天裁剪：一天里每 5 分钟读一次，45 天就是一万多条。每天留首尾两条就够
 * 撑住上面的差值（当天的首条是基线，尾条是当日最新）。
 *
 * @module @vlln/dsh-home/balance-history
 */

/** 最多留多少天的读数。超过就丢最早的天。 */
export const SPENT_DAYS = 45

/**
 * 本地时区的日键（和账本、日历同一口径）。
 * @param at 时间戳
 * @returns `YYYY-MM-DD`
 */
export function localDayKey(at) {
  const date = new Date(at)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 一条读数：读到的时刻与三个钱数。 */
function toRead(input) {
  const at = Number(input?.at)
  const total = Number(input?.total)
  if (!Number.isFinite(at) || !Number.isFinite(total)) return null
  const toppedUp = Number(input?.toppedUp)
  return { at, total, toppedUp: Number.isFinite(toppedUp) ? toppedUp : null }
}

/**
 * 追加一条读数，并按天裁剪、按时间排序。
 *
 * 同一条读数（同一个 `at`）只留一次：宿主每读一次平台才会记一条，重复调用是调用方的错，
 * 但账不该被它污染。
 * @param reads 现有读数（可以是任意顺序）
 * @param read 新读数 `{ at, total, toppedUp }`
 * @returns 新的读数数组（升序）
 */
export function appendRead(reads, read) {
  const next = toRead(read)
  const list = (Array.isArray(reads) ? reads : []).map(toRead).filter(entry => entry !== null)
  if (next !== null && !list.some(entry => entry.at === next.at)) list.push(next)
  list.sort((left, right) => left.at - right.at)
  // 每天只留首尾两条：当天的首条是基线，尾条是当天最新。
  const first = new Map()
  const last = new Map()
  for (const entry of list) {
    const day = localDayKey(entry.at)
    if (!first.has(day)) first.set(day, entry)
    last.set(day, entry)
  }
  const days = [...first.keys()].sort().slice(-SPENT_DAYS)
  const trimmed = []
  for (const day of days) {
    trimmed.push(first.get(day))
    const tail = last.get(day)
    if (tail !== first.get(day)) trimmed.push(tail)
  }
  return trimmed
}

/** 钱数只留到分：平台本身就是两位小数，多余的小数位是浮点算出来的。 */
function toCents(value) {
  return Math.round(value * 100) / 100
}

/**
 * 今日消费。
 * @param reads 按时间升序的读数
 * @param now 现在（默认取系统时间）
 * @returns `{ spent, baselineAt, partial }`；今天还没有读数时返回 null
 */
export function spentToday(reads, now = Date.now()) {
  const list = (Array.isArray(reads) ? reads : []).map(toRead).filter(entry => entry !== null)
    .sort((left, right) => left.at - right.at)
  const today = localDayKey(now)
  const todayReads = list.filter(entry => localDayKey(entry.at) === today)
  if (todayReads.length === 0) return null
  const latest = todayReads[todayReads.length - 1]
  const earlier = list.filter(entry => entry.at < todayReads[0].at)
  const partial = earlier.length === 0
  const baseline = partial ? todayReads[0] : earlier[earlier.length - 1]
  // 充值让余额变大：不补回来，一次充值就会把当天已经花掉的钱抹掉。
  const paidIn = latest.toppedUp !== null && baseline.toppedUp !== null
    ? Math.max(0, latest.toppedUp - baseline.toppedUp)
    : 0
  return {
    spent: toCents(Math.max(0, baseline.total + paidIn - latest.total)),
    baselineAt: baseline.at,
    partial,
  }
}
