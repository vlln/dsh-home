# BoardUI 一致性清单

> 普查与逐卡验收：[`conformance-plan.md`](conformance-plan.md)。
>
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
| 格子形状 | **28 × 21**（4:3，不是正方形） | **已采用 4:3**：宽度 = 槽宽，高度 = 0.75 × 槽宽 |
| 浓淡 | 同色相按透明度分档 | `level 0…4` 五档 ✅ |

> 4:3 的做法：**槽宽不变**，把格子的高度改成槽宽的 3/4（而不是把格子放大到槽外）。这样
> 网格数学（`activityWeeks` 的 gap / gridWidth）完全不用改，也不会横向溢出。

## 3.6 列表行（`Row*`）

量于 2026-11-09，`components/data-table`。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 单元格内边距 | **10 / 12** | `px-3 py-1.5`（12 / 6） |
| 字号 | **14/500** | `text-body-medium`（14/500）✅ |
| 行高 | 表头 45、数据行 **59** | **32** ⚠️ |
| 行分隔 | 1px 底边（`border-table`） | `divide-y` + `--dsh-hairline` |
| 表头 | 45 高，14/500，**不大写、不加字距**，`text-tertiary` | `.dsh-todo-heading` 已对齐；原为 10px 大写 + 0.04em（差一档） |

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

> **方法修正（2026-11-09）**：统计卡的内边距我先前"量"成 8，读注册表源码才发现是 `p-4`（16）——
> 那个 8 是内层包裹的 padding。**优先读 `https://www.boardui.com/r/<name>.json` 的源码，
> 拿不到（Pro）才回到截图/测量。** 这是本清单第一条被测量方法自身搞错的数据。

## 3.8 勾选框（habit 行）

量于 2026-11-09，`components/checkbox`（**`r/checkbox.json` 返回 200，说明它也在免费注册表里**，
未来若要统一控件可以直接 vendor，不必手写）。

| 属性 | BoardUI | 我们 |
|---|---|---|
| 尺寸 | **16 × 16** | 16 ✅ |
| 圆角 | **4px** | `rounded-[4px]` ✅ |
| 未选中 | 1px 边框（`border-button-default`），底色为卡面 | 同 ✅ |
| 选中 | 填充数据色 + 白色对勾 | 同 ✅ |

> 这条是量出来的巧合：先按 16/4 写的，量完发现正好对上。巧合也要记，否则下次改就没人知道它对过。

## 3.9 宿主弹窗里的表单（配置对话框）

配置对话框渲染在宿主的 `Modal` 里（portal 到 `body`，不在 `.dsh-home` 之内），所以卡片规则一条也用不上。
规格只能来自宿主自己的 settings-form（`packages/client/ui-primitives settings-form/fields.module.css`，
量于 2026-11-09）：

| 属性 | 宿主 settings-form | 我们的 `.dsh-modal-*` |
|---|---|---|
| 标签 | **13px / 500 / 1.5**，`label-primary` | `--dsh-font-xs-strong-13` + `text-primary` ✅ |
| 控件高度 | **34px**（`height: 34px`） | 34 ✅ |
| 控件文字 | **13px / 1.5** | `--dsh-font-xs-13` ✅ |
| 控件描边 | 0.5px `border-l4`，圆角 `radius-md` | 0.5px hairline + `--dsh-radius-md` ✅（宿主 token 换成本板的；`check:assets` 禁止 `--dsw-*`） |
| 控件底色 | `bg-layer-3` | `--dsh-sunken` ✅ |
| 行距 | `padding: 12px 0`，行间 0.5px 分隔线 | 同 ✅ |
| 提示 / 错误 | 12px，tertiary / error | `--dsh-font-xxs-12` ✅ |
| 底部动作 | 右对齐，gap 8，host Button | host `Button`（`outline` / `primary`）✅ |

**这一段是补的洞**：在改用宿主规格之前，同一个对话框里同时存在 10、12、13、14、16px 五种字号，
标签是 10px 灰、输入框 26px、开关文字因为 `font: var(--dsh-font-s-medium-14)` 变量根本不存在而落到 16px。
"不统一"不是审美问题，是没有规格。

> 规则：**在宿主的容器里，只用宿主的尺**。要么用宿主的组件（`Button` / `SegmentedControl` / `Switch`），
> 要么照宿主量出来的数字写自己的类（`.dsh-modal-*`），不要顺手拿卡片的 `.dsh-item-*`。

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
