# BoardUI 一致性清单

> 这份文件解决一个具体问题：**我们用着 BoardUI 的 token 和组件，做出来的东西却不像 BoardUI。**
> 原因不是色值，是构图——凡是没有被 vendor 进来的东西，我都是"凭眼睛看着像"，而不是量出来的。
> 所以这里的每一条都必须带**实测值**和**我们的实现位置**。没有实测值的条目不许写"对齐 BoardUI"。

## 协议：看 → 量 → 记 → 做 → 断言

1. **看**：需要一张新卡时，先去 BoardUI 的组件清单里找同类。
   `https://www.boardui.com/components/<name>`，常见的有 `stat-cards`、`bar-chart-card`、
   `line-chart-card`、`area-chart-card`、`heatmap-chart-card`、`data-table`、`data-grid`、
   `activity-rings-card`、`project-board`。
2. **优先采用**：能找到同类就照它做——结构、间距、字号、圆角都从它来，不再自己发明。
   免费注册表里的组件直接 `vendor`；Pro 组件不进仓库，但**可以量**。
3. **量**：在他们渲染出的 DOM / SVG 上读 `getComputedStyle` 与几何，记成数字。
   量的是**计算后的值**（px、行高、圆角），不是 class 名——class 会随版本变，数字不会。
4. **记**：把数字写进本文件对应小节，并标注量于哪一天、哪个组件。
5. **做**：实现只允许用这些数字，或者用能推出这些数字的 token。
6. **断言**：`test/conformance.test.mjs` 会检查这些数字确实出现在实现里。改了实现却没改这里，
   或者改了这里却没改实现，测试都会红。

## 1. 卡片（`.dsh-card`）

量于 2026-11-09，`components/earnings-chart-card`、`components/stat-cards`。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 圆角 | 16px（`rounded-2xl`） | `--dsh-card-radius: 16px` |
| 内边距 | 16 / 16 / 12（`px-4 pt-4 pb-3`） | `--dsh-card-pad: 16px` |
| 边框 | **无**（靠底色抬升） | 深色 `transparent`；浅色 1px `--dsh-card-line` |
| 底色 | `background-secondary-default`（深色近黑） | `--dsh-card`（深 `#161618` / 浅 `#fff`） |
| 卡片标题 | **14/500**，`text-secondary` | `.dsh-card-title` |
| 主值 | **24/500**，tabular，`text-primary` | `.dsh-metric-value` 或 `.dsh-number` |
| 单位 | 12/500 `text-tertiary`，与主值**同一基线** | `.dsh-metric-unit` |
| 涨幅/状态 | chip：14/500，圆角 6，`px-1.5 py-0.5` | `Chip variant="caption"` |

> 统计卡的例外：`stat-cards` 的主值是 **32/500**，因为那张卡只有"一个数 + 一行说明"。
> 我们的 `StatGrid` 是卡内的三格小读数，用 `title-2`（20/500）是对的，别照搬 32。

## 2. 柱状图（`SparkBars`）

量于 2026-11-09，`components/earnings-chart-card` 的 SVG。

| 元素 | BoardUI | 我们 |
|---|---|---|
| 轨道 | 32 宽、整列高、**rx 10**、`chart-track` | `w-full max-w-[38px]` 内 32 宽、`rounded-[10px]` |
| 数值柱 | 与轨道**同宽**、**rx 10**、数据色 | 同宽同圆角、`bg-chart-4` |
| 悬停盒 | **38 宽**（左右各 +3）、高 +6、**rx 13** | 按钮 `p-[3px]`、`rounded-[13px]`、`ring-1 ring-chart-4/60` |
| 轨道间距 | 列槽约 46（38 盒 + 8 gap） | `gap-1.5` + `flex-1` 均分 |
| 轴标签 | 淡色小字，居中于列 | 12/500 `text-tertiary`，每列居中 |

> 圆角是宽度的**三分之一**，这是柱子看起来像胶囊而不是方块的原因。改成 4px 就立刻不像。

## 3. 分段控件 / 按钮 / chip

量于 2026-11-09，`earnings-chart-card` 的 Weekly/Monthly/Yearly 与按钮。

| 控件 | BoardUI | 我们 |
|---|---|---|
| 分段项 | 高 28、圆角 6、14/500，选中 `text-primary` | `SegmentedControl`（vendor） |
| 主按钮 | 高 32、圆角 8、14/500、accent 渐变 | `Button size="small"`（vendor） |
| chip | 圆角 6、14/500、`px-1.5 py-0.5` | `Chip`（vendor） |

## 3.5 热力格（`HeatCell`）

量于 2026-11-09，`components/heatmap-chart-card`。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 圆角 | **4px** | `rounded-[4px]` ✅ |
| 格子形状 | **28 × 21**（4:3，不是正方形） | 正方形（`size × size`）⚠️ |
| 浓淡 | 同色相按透明度分档 | `level 0…4` 五档 ✅ |

> 唯一不一致的是比例：他们的格子是横向的 4:3，我们是正方形。改成 4:3 会让一屏能排下的
> 周数变化，动之前要先确认卡片宽度预算。

## 3.6 列表行（`Row*`）

量于 2026-11-09，`components/data-table`。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 单元格内边距 | **10 / 12** | `px-3 py-1.5`（12 / 6） |
| 字号 | **14/500** | `text-body-medium`（14/500）✅ |
| 行高 | 表头 45、数据行 **59** | **32** ⚠️ |
| 行分隔 | 1px 底边（`border-table`） | `divide-y` + `--dsh-hairline` |
| 表头 | 14/500，`text-tertiary` | 分组标题同样式 ✅ |

> 59 是**整页表格**的行高，塞不进一张摘要卡：5 行就 295px。摘要卡刻意用 32，
> 只采用它的内边距、字号和分隔线。这是清单里唯一一处有意的密度偏差。

## 3.7 环形图（`Donut` / 计时环）

量于 2026-11-09，`components/activity-rings-card`。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 描边宽度 | 18，直径 176 → **约直径的 10%** | `thickness` 默认按 10% 取（44 直径 → 4–5） |
| 端头 | **round** | `strokeLinecap="round"` ✅ |
| 轨道 | 整圈、无 dash | 整圈 `stroke-chart-track` ✅ |
| 同心环间距 | 半径差 24 − 描边 18 = **6px** | 单环，无此项 |
| 中心读数 | 小字、tabular | `text-caption-1-semibold tabular-nums` ✅ |

> 环的粗细**随直径走**，不是固定像素：同一个组件在 44 和 96 上都能用，靠的是比例。

## 4. 我们的卡片 → BoardUI 的同类

| 我们的卡 | BoardUI 里最接近 | 状态 |
|---|---|---|
| Tokens / Recent activity | `bar-chart-card`（Pro，量了柱子） | 结构照做，柱状图按第 2 节；环按 3.7 |
| Work footprints | `heatmap-chart-card`（Pro，量了格子） | 见第 3.5 节；圆角一致，比例待定 |
| Session status | `stat-cards`（Pro，量了字号与圆角） | 用 `StatGrid` |
| Recent sessions / Pinned | `data-table` 的行 | 用 `RowButton`；见 3.6（内边距/字号/分隔照做，行高刻意 32） |
| Today（24 小时轨） | 无同类（自研） | 用 track 色 + 数据色，保持第 1 节字体 |
| Clock / Notes / Quote | 无同类 | 自研，字体与圆角一律取第 1 节 |

**判断规则**：表里没有同类的，才允许自研；自研的卡也必须只使用第 1–3 节里已有的数字。

## 5. 已知还没量的

- `data-grid` 的列头样式
- 浅色模式下 `stat-cards` 的底色层级

这些在动到对应卡片前必须补量，不许"看着差不多"。
