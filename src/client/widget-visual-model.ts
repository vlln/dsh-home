/** Small presentation-only projections. Never a goal, completion score or status authority. */
export function directoryMark(cwd?: string): { label: string; tone: 'business' | 'success' | 'warn' } {
  const name = cwd?.split(/[\\/]/).filter(Boolean).pop() ?? ''
  const label = Array.from(name.replace(/^[._-]+/, ''))[0]?.toLocaleUpperCase() ?? '·'
  let hash = 0
  for (const char of cwd ?? '') hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return { label, tone: (['business', 'success', 'warn'] as const)[hash % 3]! }
}

/** Local calendar boundary, not a fixed 24-hour offset (DST days may be 23/25h). */
export function localDayWindow(now: number): { start: number; end: number } {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  const start = date.getTime()
  date.setDate(date.getDate() + 1)
  return { start, end: date.getTime() }
}

/** Union visible normalized day intervals before drawing; concurrent sessions must
 * not look like extra progress. This dial is temporal coverage, not summed activeMs. */
export function dayCoverage(intervals: readonly { left: number; width: number }[]): { from: number; to: number }[] {
  const sorted = intervals.filter(i => Number.isFinite(i.left) && Number.isFinite(i.width) && i.width > 0)
    .map(i => ({ from: Math.max(0, i.left), to: Math.min(100, i.left + i.width) }))
    .filter(i => i.to > i.from).sort((a, b) => a.from - b.from)
  const merged: { from: number; to: number }[] = []
  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to)
    else merged.push({ ...range })
  }
  return merged
}
