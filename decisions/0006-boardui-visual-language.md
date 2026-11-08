# 0006 — 视觉层改用 BoardUI 的语言（放弃「只借结构、不引第二套 UI」）

- 日期：2026-11-07
- 状态：采纳
- 推翻：`docs/widget-design.md` 第 55、66 行（“不为外观引入另一套 UI 框架”“不引入固定色板”）与 `design-system.md` 的 0.45 单色板结论

## 背景

0.53 的界面是**自建的一层皮肤**：语义 token 用宿主 alias，产品色只有强调 / 注意 / 错误三色，数据图形用同一色相四档，字号靠手写 px，动效只有 3 个 keyframes（spin / rise / pulse）。

用户给了两张对照截图（当前实现 vs BoardUI 官网）并明确要求：**丰富的交互动效、更统一的组件族（按钮 / 按钮组 / 框）、更具感染力的色彩**；同时解除两个约束——不必遵守宿主的配色主题（只要不冲突），不必为现有测试与实现保留兼容。

对照结论：差距不在“有没有 token”，在四件事——
1. 取值（灰阶与数据色的强弱关系）；
2. 复合字号阶梯（`text-title-1-medium` 一次定 size/weight/leading/tracking，而手写样式只能定 size）；
3. 控件族的几何一致性（同一个按钮在三处出现应当长得一样）；
4. 动效与图形的“第二层信息”（值在涨、图在变、悬停能读）。

自建一层皮肤意味着**每加一张卡都要重新决定这四件事**，这正是“粗糙”的来源。

## 决定

浏览器半边改用 BoardUI 的视觉与交互语言，并且**把它的源码作为我们自己的代码**（源码分发，不是运行时依赖）：

- `src/client/ui/boardui/`：vendored 组件源码（`scripts/vendor-boardui.mjs` 拉取、改写 import、记 `VENDOR.md`）。
- `src/client/ui/vendor-css/`：vendored token 表与字阶。唯一改写是 `.dark` → `body[data-ds-dark-theme]`：一套色板跟着宿主的明暗切换，但仍然是我们自己的取值。
- `src/client/theme.css`：唯一的 Tailwind 入口，编译成字符串注入（`scripts/build-css.mjs`），**不引 preflight**。
- `src/client/ui/index.ts`：唯一收口，widget 只准从这里 import。
- `src/client/ui/parts.tsx` / `viz.tsx` / `motion.tsx`：卡片四段式、图形原语、动效原语。

三条工程约束是为 dsh 插件场景付的代价，都记在 `ui/VENDOR.md` 与 `theme.css` 注释里：

1. **跳过 preflight**：会重置宿主页面。改为 `.dsh-home` 作用域内的 `dsh-reset` 层，且排在 `dsh-legacy` **之前**——旧手写规则仍然压得住它，工具类又压得住旧规则，迁移期不需要一边改一边删。
2. **React 18**：BoardUI 用 React 19 的 ref-as-prop 语义，宿主是 React 18（`Symbol.for("react.element")`，无 `react.transitional.element`）。抽样 17 个组件确认没有 React 19 专属 API，代价只是**不要给这些组件传 ref**。
3. **动效不能碰 transform**：卡片位置由 React Grid Layout 用 transform 写，所以入场只动 opacity / filter，错峰用 `animation-delay`；需要一个总开关（`html[data-motion="off"]`）给截图与回归脚本用。

## 代价

- **不是“装个库就走”**：Builder 侧多了两步（vendor、编译 CSS），bundle 从 730KB 涨到 1.18MB（gzip 后约 240KB），因为 React Aria 与图标进了 client half。
- **一次性的迁移面很大**：8 个样式模块 + 825 行 `styles.ts` 里的具体规则要么被工具类取代，要么留在 `dsh-legacy` 层里等下一轮清理。
- **上游变了要人工合并**：`ui/VENDOR.md` 记录来源与 sha256，`node scripts/vendor-boardui.mjs` 是 diff 而不是覆盖；我们改过的只有 import 路径与 `.dark` 选择器。

## 换来什么

- 一张新卡只需要**数据 + 信息设计 + 选哪个图形**；颜色、字号、圆角、间距、动效都由 `ui/` 决定，并且有 `scripts/check-assets.mjs` 在 CI 里挡着（不许绕过收口、不许写字面色值、注册必须带 icon/sizing/Content）。
- 首页的视觉不再是“每个组件各决定一次”，而是**一次决定，处处一致**。
