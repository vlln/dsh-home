/** Discrete two-dimensional snapping, measured in pixels to avoid tall/wide bias. */
import type { WidgetPreset } from './widget-contract.ts'
export function nearestResizeChoice(options: readonly { preset: WidgetPreset; w: number; h: number }[], width: number, height: number, columnPixels: number, previous?: { w: number; h: number }) {
  let best = options[0]
  let distance = Infinity
  for (const option of options) {
    const d = ((option.w - width) * columnPixels) ** 2 + ((option.h - height) * 56) ** 2
    if (d < distance || (d === distance && option.w === previous?.w && option.h === previous?.h)) { best = option; distance = d }
  }
  return best
}
