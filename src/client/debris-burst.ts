/**
 * Visual half of the delete gesture: the card is gone the moment it is dropped, and a
 * small puff of debris lifts off around its footprint — the same read as deleting an app
 * on a phone, not a picture of the card breaking apart.
 *
 * The layer is imperative and self-cleaning: one absolutely positioned root over the old
 * card rect, a soft halo, a cloud of small translucent particles sampled from the card's
 * own colours, and removal once the last animation lands. Reduced motion deletes silently.
 */
import { debrisLifetime, debrisPuff, seededRandom } from './debris.ts'

const prefersReducedMotion = (): boolean => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Sample the card's own material so the dust does not look like generic confetti. */
function cardTones(node: HTMLElement): string[] {
  const style = getComputedStyle(node)
  const label = style.color
  const border = style.borderTopColor
  // The data hue is the only accent left (0006 retired the --dsh-* roles).
  const accent = style.getPropertyValue('--color-chart-4').trim()
  return [label, border !== '' ? border : label, accent !== '' ? accent : label].filter(tone => tone !== '')
}

/**
 * @param node card element, still in place (drag position is fine)
 * @returns whether a burst was started; `false` means "reduce motion" or nothing to show
 */
export function scatterDebris(node: HTMLElement, options: { seed?: number; reducedMotion?: boolean } = {}): boolean {
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
  document.body.append(layer)
  const random = seededRandom(options.seed ?? Math.floor(performance.now() * 1000) % 2147483647)
  const puff = debrisPuff(box.width, box.height, random)
  const tones = cardTones(node)
  const animations: Animation[] = []
  const halo = document.createElement('div')
  halo.className = 'dsh-debris-halo'
  halo.style.left = `${Math.round((box.width - puff.halo) / 2)}px`
  halo.style.top = `${Math.round((box.height - puff.halo) / 2)}px`
  halo.style.width = `${puff.halo}px`
  halo.style.height = `${puff.halo}px`
  // A gradient instead of a solid disc: a hard-edged circle reads as a coloured spotlight.
  halo.style.background = `radial-gradient(circle, ${tones[tones.length - 1]} 0%, transparent 68%)`
  layer.append(halo)
  animations.push(halo.animate([
    { transform: 'scale(.65)', opacity: .5 },
    { transform: 'scale(1.05)', opacity: 0 },
  ], { duration: puff.haloDuration, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }))
  if (tones.length > 0) {
    for (const particle of puff.particles) {
      const element = document.createElement('i')
      element.className = 'dsh-debris-particle'
      element.style.left = `${particle.x}px`
      element.style.top = `${particle.y}px`
      element.style.width = `${particle.size}px`
      element.style.height = `${particle.size}px`
      element.style.background = tones[particle.tone % tones.length]
      layer.append(element)
      animations.push(element.animate([
        { transform: 'translate3d(0,0,0) scale(1)', opacity: particle.opacity },
        { transform: `translate3d(${particle.dx}px,${particle.dy}px,0) scale(.7)`, opacity: 0 },
      ], { duration: particle.duration, delay: particle.delay, easing: 'cubic-bezier(.25,.55,.4,1)', fill: 'forwards' }))
    }
  }
  const remove = (): void => { layer.remove() }
  const timer = setTimeout(remove, debrisLifetime(puff) + 240)
  void Promise.allSettled(animations.map(animation => animation.finished))
    .then(() => { clearTimeout(timer); remove() })
  return true
}
