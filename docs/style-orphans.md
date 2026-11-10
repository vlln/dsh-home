# 样式表里的死规则：清到哪儿了

统计口径：抓各个 `*-styles.ts` / `styles.ts` 里的 `.dsh-*` 选择器，减去**消费者**里的出现——消费者包括
`src/client/**/*.ts` 与 `*.tsx`（排除样式表自身，否则定义即被算作使用）。

## 已清（2026-11-10，发布前整理）

**54 条**单行规则被删掉：定义过的 `.dsh-*` 类从 339 个降到 313 个，其中没有消费者的从 56 个降到 30 个。
删的都是整条规则的选择器全部为孤儿的情况，逐行删除、不动缩进与文件结构：

- `styles.ts` 11 条：`dsh-row-static` / `dsh-row-top` / `dsh-key` / `dsh-band-seg` / `dsh-rhythm-*` / `dsh-session-trailing` 等旧卡片残骸；
- `planner-styles.ts` 24 条：`dsh-timer-button*`（早已换成宿主 `Button`）、`dsh-usage-hero/figure/unit/bars`、`dsh-balance-*`、`dsh-quote-mark/hint`、`dsh-habit-text/meta/delete`、`dsh-countdown-row`、`dsh-chip-dot`、`dsh-status-filter`；
- `personal-styles.ts` 8 条：`dsh-personal-label/hint/field/textarea/switch-row/error`；
- `gallery-styles.ts` 7 条：旧托盘时代的 `dsh-gallery-search/sample/card-footer/source`、`dsh-manager-nav`；
- `activity-styles.ts` 1 条、`widget-expression-styles.ts` 2 条、`widget-refinement-styles.ts` 1 条。

做法与验收：只删「选择器里每个 `.dsh-*` 都是孤儿」的整行规则（多行块与共用选择器一律不动），删完跑
`npm run check` + 构建 + 桌面截图对比。没有类名是运行时拼出来的（全仓库没有 `` `dsh-${...}` `` 这种写法）。

## 还剩 30 个候选

它们不是「忘了删」，而是删起来需要动结构：

| 为什么还在 | 例子 |
|---|---|
| 多行块（`@media` / 分组规则里的缩进块） | `.dsh-band-track` / `.dsh-band-seg` / `.dsh-rhythm-col` 在 `widget-refinement-styles.ts` 的媒体查询里 |
| 与在用选择器共用一条规则（`:is(...)` 或逗号列表） | `.dsh-gallery-filters button[…], .dsh-manager-nav button[…]`；`.dsh-home-widget :is(.dsh-row, .dsh-row-arrow, …)` |
| 旧卡片整组残留 | `dsh-focus-*`（12 个）、`dsh-band-*`、`dsh-rhythm-*`、`dsh-usage-donut-hole`、`dsh-icon-button`、`dsh-home-select` |

下一轮的做法：按前缀整组删（`dsh-focus-*` 一起、`dsh-band-*` 一起），而不是逐个选择器抠——它们属于
同一批已下线的组件，整组消失后 `:is(...)` 列表自然变短。

**仍是候选，不是判决**：删之前按组核对，删完跑四项验证（`npm run check`、构建、桌面截图、隔离宿主门禁）。
