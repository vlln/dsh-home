/**
 * 语录的纯计算：内置清单、每日确定性索引、自定义优先。
 *
 * @module @vlln/dsh-home/client/quote-model
 */

export type QuoteConfig = { lines: string[] }

export const MAX_LINES = 50
export const MAX_LINE = 120
const BUILTIN_ZH = [
  '把今天该做的做完，剩下的交给明天。',
  '慢慢来，但别停。',
  '先让它跑起来，再让它跑得好。',
  '写下来，就已经解决了一半。',
  '一次只做一件事，做完再抬头。',
  '不确定的时候，先做那个可逆的。',
  '把复杂留给自己，把简单留给别人。',
  '能删掉的代码，才是好代码。',
  '休息不是偷懒，是为了下一段专注。',
  '今天的进度，比昨天的计划重要。',
  '少一点犹豫，多一点提交。',
  '做完比做完美更接近完成。',
]
const BUILTIN_EN = [
  'Finish what today asks for; leave the rest for tomorrow.',
  'Go slowly, but do not stop.',
  'Make it run first, then make it run well.',
  'Writing it down solves half of it.',
  'One thing at a time, then look up.',
  'When unsure, pick the reversible move.',
  'Keep the complexity; hand over the simple part.',
  'Good code is code you can delete.',
  'A rest is not laziness; it funds the next focus.',
  "Today's progress beats yesterday's plan.",
  'Less hesitation, more commits.',
  'Done is closer to finished than perfect.',
]

/** 稳定的每日索引：同一句在一天里不会跳。 */
export function quoteIndex(day: string, count: number, salt = ''): number {
  if (count <= 0) return 0
  let hash = 2166136261
  for (const char of `${day}|${salt}`) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash % count
}

/** 今天该显示哪一句；自定义清单优先。 */
export function pickQuote(config: QuoteConfig, day: string, language: string): string {
  const words = config.lines.filter(line => line.trim() !== '')
  if (words.length > 0) return words[quoteIndex(day, words.length, 'custom')]!
  const builtin = language.startsWith('zh') ? BUILTIN_ZH : BUILTIN_EN
  return builtin[quoteIndex(day, builtin.length, language)]!
}
