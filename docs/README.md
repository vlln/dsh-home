# 文档索引

仓库根的 [README](../README.md) 面向使用者；这里面向改代码的人。按你要改的东西挑一条路。

## 改卡片之前

| 文档 | 读它做什么 |
|---|---|
| [boardui-conformance.md](boardui-conformance.md) | 视觉标准的实测数字：卡片圆角与内边距、字阶、图表原语，以及层序陷阱（整卡级覆盖只能写 `theme.css` 的 `components` 层） |
| [conformance-plan.md](conformance-plan.md) | 每张卡的取舍与验收标准：什么算过关、哪些方案被否掉、为什么 |
| [design-system.md](design-system.md) | 共享小部件（chip、状态点、安静下拉、悬停气泡、轨道）的用法与表面阶梯；由 `test/design-system.test.mjs` 守着 |

## 改能力之前

| 文档 | 读它做什么 |
|---|---|
| [widget-development.md](widget-development.md) | 扩展契约：注入 `homeWidgets` 注册、预览数据、尺寸声明、打包方式 |
| [decisions/](decisions/) | 七个架构决策记录 |

## 发布

| 文档 | 读它做什么 |
|---|---|
| [release.md](release.md) | 发布前检查清单：版本、代码门、产物、安装面、发布、发布后一周 |
| [style-orphans.md](style-orphans.md) | 样式表里的死规则清到哪儿了，剩多少候选 |

## 过程记录

| 文档 | 读它做什么 |
|---|---|
| [workbench-development.md](workbench-development.md) | 逐轮开发流水：每轮改了什么、怎么验的 |
| [archive/widget-design.md](archive/widget-design.md) | 历史：0.21–0.53 的视觉语法与设计研究，已被 [0006](decisions/0006-boardui-visual-language.md) 取代 |

## 决策记录

| 编号 | 结论 |
|---|---|
| [0001](decisions/0001-brand-entry-capture.md) | logo 入口用捕获监听，不占 `sidebar.brand.mark` |
| [0002](decisions/0002-ledger-source.md) | 活动账本读 `ctx.sessionPersistence`，不直接读日志文件 |
| [0003](decisions/0003-layout-overrides.md) | 布局只存覆盖，不存完整排布 |
| [0004](decisions/0004-edit-layers.md) | 阅读态与编辑态分离，删除走两步 |
| [0005](decisions/0005-focus-first.md) | 首页默认形态：三件事加更多，不做报表 |
| [0006](decisions/0006-boardui-visual-language.md) | 视觉层改用 BoardUI 的语言 |
| [0007](decisions/0007-today-spend.md) | 今日消费用余额差值算，不用 token 估算 |
