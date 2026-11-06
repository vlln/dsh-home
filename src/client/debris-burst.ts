/**
 * Visual half of the delete gesture: dice the card into tiles and throw the pieces away.
 *
 * The layer is imperative and self-cleaning: it appends one absolutely positioned root,
 * clones the card once per tile (clipped by the tile), animates with the Web Animations
 * API and removes itself when the last piece lands. Reduced motion deletes silently —
 * the removal itself never waits for the animation.
 */
import { debrisChips, debrisLifetime, debrisTiles, seededRandom } from './debris.ts'

const prefersReducedMotion = (): boolean => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Sample the card's own material so the chips do not look like generic confetti. */
function cardTones(node: HTMLElement): string[] {
  const style = getComputedStyle(node)
  const label = style.color
  const border = style.borderTopColor
  const background = style.backgroundColor
  const accent = style.getPropertyValue('--dsw-alias-state-business-primary').trim()
  return [
    background !== '' && !background.startsWith('rgba(0, 0, 0, 0') ? background : label,
    border !== '' ? border : label,
    accent !== '' ? accent : border !== '' ? border : label,
  ].filter(tone => tone !== '')
}

/**
 * @param node card element, still in place (drag position is fine)
 * @returns whether a burst was started; `false` means "reduce motion" or nothing to show
 */
export function shatterWidget(node: HTMLElement, options: { seed?: number; reducedMotion?: boolean } = {}): boolean {
  const box = node.getBoundingClientRect()
  if (options.reducedMotion ?? prefersReducedMotion()) return false
  if (!(box.width >= 24 && box.height >= 24) || typeof node.animate !== 'function') return false
  const layer = document.createElement('div')
  layer.className = 'dsh-debris'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.left = `${box.left}px`
  layer.style.top = `${box.top}px`
  layer.style.width = `${box.width}px`
  layer.style.height = `${box.height}px`
  // Inside the board's column when possible: the cloned card keeps its `.dsh-home`
  // scoped paint (editing dashed border, content overflow) instead of half its styles.
  const host = node.closest('.dsh-home-inner') ?? node.ownerDocument.body
  host.append(layer)
  const random = seededRandom(options.seed ?? Math.floor(performance.now() * 1000) % 2147483647)
  const tiles = debrisTiles(box.width, box.height, random)
  const chips = debrisChips(box.width, box.height, random)
  const tones = cardTones(node)
  const animations: Animation[] = []
  const motion = (duration: number, delay: number, easing: string): KeyframeAnimationOptions => ({ duration, delay, easing, fill: 'forwards' })
  for (const tile of tiles) {
    const cell = document.createElement('div')
    cell.className = 'dsh-debris-tile'
    cell.style.clipPath = `inset(${tile.top}px ${Math.round(box.width - tile.left - tile.width)}px ${Math.round(box.height - tile.top - tile.height)}px ${tile.left}px)`
    const clone = node.cloneNode(true) as HTMLElement
    clone.removeAttribute('id')
    // The pieces must never answer a `[data-widget-id]` query: the live card is gone.
    clone.removeAttribute('data-widget-id')
    clone.setAttribute('aria-hidden', 'true')
    // Replace the RGL inline geometry (position/transform/px size) with a static copy.
    clone.style.cssText = `position:absolute;left:0;top:0;margin:0;width:${box.width}px;height:${box.height}px;transform:none;transition:none;animation:none;`
    cell.append(clone)
    layer.append(cell)
    // Move and fade are separate timelines: the tiles stay opaque while they tear away
    // and only fade once they are clearly pieces. A single eased timeline faded them
    // almost immediately, which read as a ghostly dissolve instead of a shatter.
    animations.push(
      cell.animate([{ transform: 'translate3d(0,0,0) rotate(0deg)' },
        { transform: `translate3d(${tile.dx}px,${tile.dy}px,0) rotate(${tile.rotate}deg)` }],
      motion(tile.duration, tile.delay, 'cubic-bezier(.22,.75,.28,1)')),
      cell.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .62 }, { opacity: 0, offset: 1 }],
        motion(tile.duration, tile.delay, 'linear')))
  }
  if (tones.length > 0) {
    for (const chip of chips) {
      const element = document.createElement('i')
      element.className = 'dsh-debris-chip'
      element.style.left = `${chip.left}px`
      element.style.top = `${chip.top}px`
      element.style.width = `${chip.size}px`
      element.style.height = `${chip.size}px`
      element.style.background = tones[chip.tone % tones.length]
      layer.append(element)
      animations.push(
        element.animate([{ transform: 'translate3d(0,0,0) rotate(0deg)' },
          { transform: `translate3d(${chip.dx}px,${chip.dy}px,0) rotate(${chip.rotate}deg)` }],
        motion(chip.duration, chip.delay, 'cubic-bezier(.3,.55,.4,1)')),
        element.animate([{ opacity: .95, offset: 0 }, { opacity: .95, offset: .35 }, { opacity: 0, offset: 1 }],
          motion(chip.duration, chip.delay, 'linear')))
    }
  }
  const remove = (): void => { layer.remove() }
  const timer = setTimeout(remove, debrisLifetime(tiles, chips) + 240)
  void Promise.allSettled(animations.map(animation => animation.finished))
    .then(() => { clearTimeout(timer); remove() })
  return true
}
