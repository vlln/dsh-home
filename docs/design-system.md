# 首页视觉标准

> 唯一实现：[`src/client/design-system.ts`](../src/client/design-system.ts)。本文件是规则、词表与
> 检查清单；两者由 [`test/design-system.test.mjs`](../test/design-system.test.mjs) 绑定，
> 改动不同步会直接测试失败。

## 1. 三层颜色，只有一层属于我们

| 层 | 来源 | 用法 |
|---|---|---|
| 宿主 alias | `--dsw-alias-label-*`、`--dsw-alias-bg-*`、`--dsw-alias-border-*`、`--dsw-alias-interactive-*` | 墨色、表面、描边、悬停底。深浅主题由宿主切换，组件不判断 |
| 产品角色 | `--dsh-*`（本文件第 3 节） | 强调、注意、错误、数据梯度、胶囊、主值字号 |
| 组件样式 | 只写 `var(--dsh-*)` 与宿主 alias | 不写十六进制、不写 `--dsw-alias-state-*`、不定义第二套主题 |

组件样式里出现 `#rrggbb` 或 `--dsw-alias-state-*` 都算违规（图片占位 SVG 除外）。
需要新颜色时，先问「它是强调、注意、错误，还是数据梯度」，然后在 `design-system.ts`
加一个角色，而不是在组件里就地取色。

## 2. 一条强调色，状态色只表达状态

- **强调色**（`--dsh-accent`）：今天标记、全部数据图形、图标底板、选中态。全站只有这一种蓝。
  主操作按钮不占用强调色，一律用宿主的 `--dsw-alias-button-primary-fill`（墨色），
  `Start`、`添加`、`保存` 与页首按钮因此是同一个颜色。
- **注意 / 错误**（`--dsh-warning`、`--dsh-danger`）：只在真的需要注意时出现——计时到点、
  待审批原因、删除、保存失败。不做装饰、不按组件分配。
- 会话的状态点（在跑 / 在等你 / 未读 / 空闲）直接用宿主的 `StateDot`，它的绿 / 琥珀 / 灰
  是有语义的宿主状态，不属于本插件的色板；插件自己不另外定义「成功绿」。习惯打卡、余额、
  图表一律用强调色。
- 数据图形（热力图、柱状、轨道条、token 环）只用同色相的四档 `--dsh-ramp-1…4`；
  不按组件换色相，也不为分类另起一套彩色。

## 3. 词表

| Token | 值 | 用途 |
|---|---|---|
| `--dsh-accent` | 宿主 business-primary | 唯一强调色 |
| `--dsh-accent-soft` | 强调色 12% | 图标底板、选中底、浅色填充 |
| `--dsh-accent-hover` | 强调色 86% 混墨色 | 实心按钮悬停（深色主题自动变亮） |
| `--dsh-warning` | 宿主 warn-primary | 需要注意 |
| `--dsh-warning-soft` | 注意色 12% | 注意态浅底 |
| `--dsh-danger` | 宿主 error-primary | 错误、删除 |
| `--dsh-danger-soft` | 错误色 12% | 错误态浅底 |
| `--dsh-ramp-1` | 强调色 18% 混卡片底 | 数据最浅档 |
| `--dsh-ramp-2` | 强调色 44% | 数据第二档 |
| `--dsh-ramp-3` | 强调色 72% | 数据第三档 |
| `--dsh-ramp-4` | 强调色 | 数据最深档 / 满格 |
| `--dsh-track` | 宿主 bg-skeleton | 进度轨道、空槽、未填格 |
| `--dsh-pill-bg` | 宿主 interactive-bg-active | 工作区胶囊唯一底色 |
| `--dsh-pill-ink` | 宿主 label-secondary | 工作区胶囊唯一字色 |
| `--dsh-hero-size` | 30px | 卡片主值字号 |
| `--dsh-hero-line` | 34px | 卡片主值行高 |
| `--dsh-radius-pill` | 999px | 胶囊圆角（配合 `corner-shape: round`） |

## 4. 共用小部件（只在 design-system.ts 定义）

| 类名 | 规则 |
|---|---|
| `.dsh-ws-pill` | 工作区胶囊。**一个中性色**，颜色不编码目录身份；未知目录用描边而非填色 |
| `.dsh-chip` | 22px 胶囊。默认浅底；`data-active="true"` 为墨色实心；`data-tone` 只允许 warn / danger / accent |
| `.dsh-status-chip` | 会话状态的三个视图；选中态一律墨色，状态含义由文字承担 |
| `.dsh-quiet-select` | 安静的文本下拉：无边框、无底色、11px、自带箭头。筛选只用它 |
| `.dsh-hover-tip` | 悬停提示气泡，Portal 到 `body`，不被卡片裁剪 |
| `.dsh-track` | 数据轨道：中性底 + 强调色填充 |

组件样式不得重新定义这些类，只能加布局约束（例如 `.dsh-area-rows .dsh-ws-pill { max-width:72% }`）。

## 5. 排版、圆角、间距

- 卡片主值：一律 `var(--dsh-hero-size)` / `var(--dsh-hero-line)`、600、`-0.03em`、等宽数字。
  今天、近两周、token、余额、倒计时都是同一个尺寸；不再出现 26/28/32/36 混用。
- 卡片标题：宿主 `--dsw-font-s-strong-14`，墨色。说明与次要信息用 11–13px 的 label-secondary / tertiary。
- 圆角：卡片 20（`--dsw-radius-xl`），内部表面 8–12，胶囊 `--dsh-radius-pill`。
- 间距：4 / 8 / 12 / 16 四档；卡片内边距 14–16，段落间距 8，区块间距 12。

## 6. 卡片里不出现滚动条

摘要卡（最近活跃、置顶、工作足迹）的正文必须**装进**卡片：

- 行数不用常量猜。`useVisibleRows` 量一次容器高度和真实行高，决定放几行；
  最近活跃取最近的 N 个并在页脚写清 `最近 N / M 个会话`，置顶写 `显示 N / M 个`。
- 热力图按**实测的图表区高度**算格子大小（`activityWeeks(..., height)`），高度不足先缩格子，
  `overflow-y` 永远是 `hidden`；只有显式「一年」的窄卡允许横向浏览。
- 不再提供「再显示 N 个」翻页按钮：摘要卡只回答「现在的情况」，不承担浏览器的职责。

例外（不进摘要卡的编辑面，允许局部滚动）：待办 / 计划 / 打卡 / 日历当天的列表、便笺编辑区、
长引文、以及「工作足迹」点开某一天后的会话明细。新增例外必须写进本节。

## 7. 新增一个组件时

1. 颜色只用第 3 节的 token；需要新角色先改 `design-system.ts` 与本文件。
2. 主值用 `--dsh-hero-size`，标题交给外壳；不要在卡片里再画标题。
3. 图形只用 `--dsh-ramp-*` 与 `--dsh-track`；不要为「好看」引入第二个色相。
4. 内容必须装进声明的默认尺寸：先量容器，再决定行数 / 格子大小；不要靠滚动条兜底。
5. 用户可见文案走 i18n；筛选控件用 `.dsh-quiet-select`，不要做带边框的胶囊。
6. 跑 `npx tsc --noEmit`、`npm test`、`pnpm run build`，再在验证站看真实卡片。

## 8. 变更记录

- 2026-11-07：建立本文件与 `design-system.ts`；取消每个组件一套色相、工作区胶囊彩虹配色、
  会话状态筛选的三色实心；统一主值字号；最近活跃 / 置顶 / 工作足迹改为按实测高度截取，
  工作足迹删除时区与「空格不代表无活动」说明。
