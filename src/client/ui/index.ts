/**
 * dsh-home 的控件收口层。
 *
 * **widget 只准从这里 import。** 直接 import `./boardui/*` 会让下一次换皮变成
 * 十几处改动；这一层是唯一允许跟 vendors 打交道的地方，也是「换成别家组件库」
 * 时唯一需要重写的内容。
 *
 * 约定：
 * - 组件只吃 Tailwind 语义类（`text-text-secondary`、`bg-background-secondary-default`），
 *   不写十六进制、不写宿主 token（`--dsw-*` 在这里已经不存在）。
 * - 图标传组件引用（`leadingIcon={RiAddLine}`），不传元素。
 * - **不要给这些组件传 `ref`**：BoardUI 用 React 19 的 ref-as-prop 写法，宿主是
 *   React 18，`ref` 会被 React 丢掉。需要 DOM 时包一层 div 再挂 ref。
 * - 文案由调用方给（组件不读 locale）。
 *
 * 中间那段是**生成**的（`scripts/gen-ui-index.mjs`）：它列出当前真正存在的
 * vendored 组件。`prune:vendor` 打包前删掉没人用的组件并重写这段，
 * `vendor` 把整套目录拉回来并重写这段——所以两边都不会留下悬空导出。
 *
 * @module @vlln/dsh-home/client/ui
 */

/* ---------------------------------------------------------------------------
 * Hand-written surface: dsh-home's own primitives. Not generated.
 * ------------------------------------------------------------------------- */

import { cx } from './lib/cx.ts'

/** 类名合并（tailwind-merge，认识 BoardUI 的复合字号类）。 */
export { cx }

/** 卡片内部的四段结构（主值 / 说明 / 空态 / 错误 / 骨架）。 */
export { CardBody, CardHero, CardMeta, CardFooter, CardAction, CardEmpty, CardError, CardSkeleton, StatGrid } from './parts.tsx'

/** 图形原语（柱、轨道、热力格）；读数由调用方用 Tooltip 负责。 */
export { SparkBars, Meter, HeatCell, Donut } from './viz.tsx'
export type { VizItem, HeatLevel } from './viz.tsx'

/** 动效原语：入场错峰与数字滚动（只动 opacity/filter，把 transform 留给网格）。 */
export { Reveal, CountUp, useCountUp, motionEnabled } from './motion.tsx'

/** 无底色图标按钮：标题行里的小图标只在这里出现，不用 ghost 变体。 */
export { IconButton } from './icon-button.tsx'

/** 列表行：主标签 + 右端读数，整行可点；卡片里的"一行一条"一律用它。 */
export { Row, RowButton, RowLink } from './row.tsx'

/* ---------------------------------------------------------------------------
 * Vendored BoardUI surface — generated, do not edit by hand.
 * `prune:vendor` writes the modules that survived; `vendor` writes them all back.
 * ------------------------------------------------------------------------- */

// <generated:surface>
export * from './boardui/button.tsx'
export * from './boardui/chip.tsx'
export * from './boardui/segmented-control.tsx'
// </generated:surface>
