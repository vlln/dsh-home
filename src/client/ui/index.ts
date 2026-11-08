/**
 * dsh-home 的控件收口层。
 *
 * **widget 只准从这里 import。** 直接 import `./boardui/*` 会让下一次换皮变成
 * 十几处改动；这一层是唯一允许跟 vendors 打交道的地方，也是「换成别家组件库」
 * 时唯一需要重写的内容。
 *
 * 约定：
 * - 组件只吃 Tailwind 语义类（`text-text-secondary`、`bg-background-secondary-default`），
 *   不写十六进制、不写 `--dsw-*`。
 * - 图标传组件引用（`leadingIcon={RiAddLine}`），不传元素。
 * - **不要给这些组件传 `ref`**：BoardUI 用 React 19 的 ref-as-prop 写法，宿主是
 *   React 18，`ref` 会被 React 丢掉。需要 DOM 时包一层 div 再挂 ref。
 * - 文案由调用方给（组件不读 locale）。
 *
 * @module @vlln/dsh-home/client/ui
 */

export { Button, ButtonLink, buttonStyles } from './boardui/button.tsx'
export type { ButtonProps, ButtonLinkProps } from './boardui/button.tsx'
export { ButtonGroup, ButtonGroupItem } from './boardui/button-group.tsx'
export { Chip, CHIP_COLORS } from './boardui/chip.tsx'
export { Badge } from './boardui/badge.tsx'
export { Avatar } from './boardui/avatar.tsx'
export { Switch, SwitchTrack } from './boardui/switch.tsx'
export { SegmentedControl, SegmentedControlItem } from './boardui/segmented-control.tsx'
export { Tooltip, TooltipTrigger } from './boardui/tooltip.tsx'
export { Skeleton, SkeletonText } from './boardui/skeleton.tsx'
export { Spinner, SpinnerGlyph } from './boardui/spinner.tsx'
export { ProgressBar, ProgressCircle, ProgressTrack } from './boardui/progress.tsx'
export { StatCards } from './boardui/stat-cards.tsx'
export { Select, SelectItem } from './boardui/select.tsx'
export { TextField, Input, InputBase } from './boardui/input.tsx'
export {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownGroup,
  DropdownItem,
  DropdownDivider,
} from './boardui/dropdown.tsx'

/** 类名合并（tailwind-merge，认识 BoardUI 的复合字号类）。 */
export { cx } from './lib/cx.ts'

/** 卡片内部的四段结构（主值 / 说明 / 空态 / 骨架）。 */
export { CardBody, CardHero, CardMeta, CardFooter, CardEmpty, CardSkeleton } from './parts.tsx'

/** 图形原语（柱、轨道）；读数由调用方用 Tooltip 负责。 */
export { SparkBars, Meter } from './viz.tsx'
export type { VizItem } from './viz.tsx'

/** 动效原语：入场错峰与数字滚动（只动 opacity/filter，把 transform 留给网格）。 */
export { Reveal, CountUp, useCountUp, motionEnabled } from './motion.tsx'
