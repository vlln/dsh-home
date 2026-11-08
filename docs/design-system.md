# 首页视觉标准

> **2026-11-07：配色与字阶层已经下沉到 `src/client/theme.css`（BoardUI 语义 token +
> 复合字阶），本文件的第 1–3 节（`--dsh-*` 角色色、单色数据梯度、主值字号变量）只在
> 尚未迁移的卡片上仍然有效。**
>
> 新卡片的规矩在 [`../decisions/0006-boardui-visual-language.md`](../decisions/0006-boardui-visual-language.md)：
> 颜色/字号/圆角/间距/动效一律来自 `src/client/ui/`，卡面只填数据与信息设计，
> `scripts/check-assets.mjs` 会在构建时拦住绕过收口或写死色值的新代码。
> 第 4–11 节（共用小部件、标题图标、可自解释的图表、卡片里不出现滚动条、新增组件清单）
> **继续有效**，它们讲的是信息设计，不是皮肤。

> 唯一实现：[`src/client/design-system.ts`](../src/client/design-system.ts)。本文件是规则、词表与
> 检查清单；两者由 [`test/design-system.test.mjs`](../test/design-system.test.mjs) 绑定，
> 改动不同步会直接测试失败。

## 1. 颜色词表在 `theme.css`，不在这里

2026-11-07 起（[decisions/0006](../decisions/0006-boardui-visual-language.md)），配色、字阶、
圆角与动效全部由 `src/client/theme.css` 提供：BoardUI 的语义 token（`--color-text-primary`、
`--color-background-secondary-default`、`--color-border-button-default`、`--color-chart-1…5`、
`--color-status-*`）加上复合字号阶梯（`text-title-1-medium`、`text-body-medium`…）。

| 层 | 位置 | 谁能用 |
|---|---|---|
| 语义 token / 字阶 | `theme.css`（编译成 `ui/generated/theme-css.ts`） | 新卡片与 `ui/` 组件 |
| 共享小部件的几何 | 本文件 + `src/client/design-system.ts` | 尚未迁移的内置卡 |
| 旧 `--dsh-*` 颜色角色 | **已删除** | 无 |

- 组件样式里不准出现 `#rrggbb`、`rgb(`、`oklch(`；`scripts/check-assets.mjs` 在构建时拦住。
- 深浅主题由宿主在 `body[data-ds-dark-theme]` 上切换，token 自己翻，组件不判断。
- 需要新颜色：先在 `theme.css` 里找一个语义 token；找不到说明**语义没想清楚**，不是缺色。

## 2. 数据图形只用一种色相

图表、热力格、轨道条都从 `--color-chart-4`（数据色）派生浓淡；`HeatCell` 的
`level 0…4` 就是这条规则的实现。不同**含义**（成功 / 注意 / 错误）分别走
`--color-status-lime-text` / `--color-status-yellow-text` / `--color-text-error-primary`，
只在真实状态里出现，不做装饰。

## 3. 排版与几何

- 主值：`text-display-4-semibold`（32/40）+ `tabular-nums`；卡片标题 `text-body-medium`；
  说明 `text-caption-1-medium` + `text-text-tertiary`。新卡片不要手写 px。
- 圆角：卡片 `rounded-3xl`，内部表面 `rounded-lg`/`rounded-xl`，胶囊 `rounded-full`（999px）。
- 间距：4 / 8 / 12 / 16 四档；卡片内边距 `p-4`。

## 4. 共用小部件（只在 design-system.ts 定义）

| 类名 | 规则 |
|---|---|
| `.dsh-ws-pill` | 工作区胶囊。**一个中性色**，颜色不编码目录身份；未知目录用描边而非填色 |
| `.dsh-chip` | 22px 胶囊。默认浅底；`data-active="true"` 为墨色实心；`data-tone` 只允许 warn / danger / accent |
| `.dsh-status-chip` | 会话状态的三个视图；选中态一律墨色，状态含义由文字承担 |
| `.dsh-quiet-select` | 安静的文本下拉：无边框、无底色、11px、自带箭头。筛选只用它 |
| `.dsh-hover-tip` | 悬停提示气泡，Portal 到 `body`，不被卡片裁剪 |
| `.dsh-track` | 数据轨道：中性底（`--color-chart-track`）+ 数据色填充 |
| `.dsh-status-dot` | 6px 状态点；颜色由 `data-group` 注入的 `--dsh-dot-color` 决定 |
| `.dsh-status-count` | 状态胶囊里的计数，等宽数字、次级墨色 |

组件样式不得重新定义这些类，只能加布局约束（例如 `.dsh-area-rows .dsh-ws-pill { max-width:72% }`）。

## 5. 标题图标与读数尺寸

- **每张卡都有标题图标**：`registry.register` 必须声明 `icon`，标题行左侧留 20px 的槽位。
  少一个图标，那一行标题就会比邻居短一截——这不是审美问题，是「缺了一块」的观感。
- **读数跟着卡片走**：日晷、token 环、柱状图都用 `cqi` 随卡片放大，同时有下限
  （日晷 ≥ 52px、token 环 ≥ 52px、柱子 ≥ 列宽的一半）。固定 48px 的圆盘放在 8 列卡里
  字只有 5px，等于没有画。
- 卡片变矮时先缩图形、再缩间距，最后才允许图表变矮；**页脚数字永远留在卡片里**。

## 6. 排版、圆角、间距

- 卡片主值：一律 `var(--dsh-hero-size)` / `var(--dsh-hero-line)`、600、`-0.03em`、等宽数字。
  今天、近两周、token、余额、倒计时都是同一个尺寸；不再出现 26/28/32/36 混用。
- 卡片标题：宿主 `--dsw-font-s-strong-14`，墨色。说明与次要信息用 11–13px 的 label-secondary / tertiary。
- 圆角：卡片 20（`--dsw-radius-xl`），内部表面 8–12，胶囊 `--dsh-radius-pill`。
- 间距：4 / 8 / 12 / 16 四档；卡片内边距 14–16，段落间距 8，区块间距 12。
- 摘要卡的列表条目：**两行**——标题（`--dsw-font-s-strong-14`，单行省略）+ 相对时间，
  下面一行工作区胶囊（+ 必要时一个写成文字的状态）。条目按卡片高度均分，`min-height`
  按两行内容算（18 + 3 + 18 + 4 = 43px），`max-height` 封顶 86px：7 行的卡每条约 57px，
  10 行的卡给的是留白而不是拉伸的字。条目自己就是点击面（整行 hover / focus 有底色），
  不要在一行里塞搜索框、下拉或图钉图标。

## 7. 图表要能自解释

- 每一根柱子、每一个热力格、每一个圆环分段、时间带的每一段，都要能 **hover 出信息**：
  至少包含时间/日期与数值，必要的话给分项明细。
- 统一用 `useHoverTip()`（`hover-tip.tsx`）：Portal 到 body、跟随指针、不被卡片裁剪；
  不要在组件里各写一套坐标与关闭逻辑，也不要用原生 `title` 当作唯一说明。
- 悬停同时要有**图形反馈**：柱子提高不透明度、圆环把其它分段淡出并把洞里的数字换成
  当前分段的占比。键盘可达的元素（圆环、柱子）在 focus 时给出同样的信息。
- 信息只解释已经画出来的数据，不新增口径。

## 8. 组件库预览

- 预览必须是**真的 `Content`**，不许画第二套插图；但不按默认尺寸硬缩。
- 取该类型**最窄的声明尺寸**渲染：8 列卡缩进 400px 的列会把 13px 变成 7px，看起来就是坏的。
- 高度超过 `PREVIEW_MAX_HEIGHT`（236px）时从**底部裁切**，不继续缩小；宽度按列宽等比缩到不超过 1×。

## 9. 卡片里不出现滚动条

摘要卡（最近活跃、置顶、工作足迹）的正文必须**装进**卡片：

- 行数用两种方式之一决定，都必须真的量出来：`useVisibleRows` 量容器高度和真实行高，
  或（最近会话、会话状态这类有固定上限的列表）声明一个硬上限 + 按高度均分的条目，
  再用 `overflow: hidden` 兜底。最近会话固定 5 条，页脚写 `最近 N / M 个会话`，
  置顶写 `显示 N / M 个`。
- 热力图按**实测的图表区高度**算格子大小（`activityWeeks(..., height)`），高度不足先缩格子，
  `overflow` 永远是 `hidden`：横向也不滚动。窄卡里的「一年」把方格缩到 2px、间距收到 1px，
  用点阵兜底，而不是加一条横向滚动条。
- 不再提供「再显示 N 个」翻页按钮：摘要卡只回答「现在的情况」，不承担浏览器的职责。

例外（不进摘要卡的编辑面，允许局部滚动）：待办 / 计划 / 打卡 / 日历当天的列表、便笺编辑区、
长引文、以及「工作足迹」点开某一天后的会话明细。新增例外必须写进本节。

## 10. 新增一个组件时

1. 颜色只用第 3 节的 token；需要新角色先改 `design-system.ts` 与本文件。
2. 声明 `icon`（16px 视框、描边 1.2、`currentColor`），标题会自动对齐。
3. 主值用 `--dsh-hero-size`，标题交给外壳；不要在卡片里再画标题。
4. 图形只用 `--dsh-ramp-*` 与 `--dsh-track`；不要为「好看」引入第二个色相。
5. 内容必须装进声明的默认尺寸：先量容器，再决定行数 / 格子大小；不要靠滚动条兜底。
6. 用户可见文案走 i18n；筛选控件用 `.dsh-quiet-select`，不要做带边框的胶囊。
7. 跑 `npx tsc --noEmit`、`npm test`、`pnpm run build`，再在验证站看真实卡片。

## 11. 变更记录

- 2026-11-07：建立本文件与 `design-system.ts`；取消每个组件一套色相、工作区胶囊彩虹配色、
  会话状态筛选的三色实心；统一主值字号；最近活跃 / 置顶 / 工作足迹改为按实测高度截取，
  工作足迹删除时区与「空格不代表无活动」说明。
- 2026-11-07（0.46）：明确彩色按语义固定（绿=做成、琥珀=注意、红=错误/破坏），会话状态胶囊
  用小圆点承担颜色、底色仍统一；工作足迹「一年」改为缩到 2px 点阵，横向滚动条彻底去掉；
  最近活跃窗口改为 7 / 14 / 30 天。
- 2026-11-07（0.48）：补齐所有组件的标题图标；日晷 / token 环 / 柱子改为跟随卡片尺寸并有
  可读下限；工作足迹只保留尺度下拉（始终全部工作区）。
- 2026-11-07（0.50）：组件库预览按最窄声明尺寸 1:1 渲染、超高从底部裁切；token 环三档
  固定尺寸（52 / 64 / 76）并放大洞与字号。
- 2026-11-07（0.51）：图表统一可 hover（token 每根柱子、圆环分段、时间带每段），
  圆环悬停淡出其它分段并把洞里换成该段占比；组件库标题图标回到卡片内部。
- 2026-11-07（0.53）：摘要卡条目定为两行（14px 标题、胶囊在第二行）；最近会话去掉搜索框
  与目录下拉、固定 5 条、声明成 4 列，旧的 8 列保存矩形按声明收窄；段落列表 `min-height`
  43 / `max-height` 86。
