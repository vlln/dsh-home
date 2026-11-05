# 小组件视觉语法与设计参考

本次调整只改变内容表达，不重排用户桌面、不改变尺寸、不增造能力或统计口径。外部站点只作设计研究，不引入其依赖或复制付费源码。

## 公开参考与边界（2026-11-05）

- [BoardUI](https://www.boardui.com/zh-hans)：首页与公开目录包含指标卡、任务列表、贡献记录等；借鉴主值 / 上下文 / 分项的层级。具体 Pro 组件正文未完整获取，不声称复刻其像素设计。
- [Bencho](https://bencho.dev)：[进度跟踪](https://bencho.dev/blocks/progress-tracker)、[世界时钟](https://bencho.dev/blocks/world-clock)等公开描述展示局部操作反馈；借鉴短促反馈，不添加循环动画、假进度或时区拖动能力。
- [HeroUI Pro](https://heroui.pro)：公开首页强调一致的 typography / spacing / token 与多主题；借鉴统一 Widget / List / KPI 的结构纪律，不替换 DSH 控件。
- [beUI Pro](https://pro.beui.dev)：公开展示 AI Workspace / KPI / Approval Queue 类目与 reduced-motion 约束；借鉴运行、待处理与统计的语义分工，未读取收费源码。
- [Libraries.dev](https://libraries.dev/accessibility)：公开可访问性说明强调 reduced-motion、真实按钮与焦点、文本状态；不将边框光束或 WebGL 作为工作台常驻装饰。
- [Watermelon UI](https://ui.watermelon.sh)：公开 [dashboard 目录](https://ui.watermelon.sh/api/catalog/entries?kind=dashboards)给出概览、流转、复核类场景描述；具体页面只得到通用介绍，不据此声称已核对其视觉细节。

另生成一张独立设计参考并分析：深色清晰标题、单一主行动、平静列表、时钟主数字、便笺分隔编辑区、方形热图；仅采用这些视觉规则，未采用图中的虚构功能或数据。

## 落地

- 标题从浅色小字提高为清晰的主题主文字；内容最多三层，数字使用等宽数字。
- 最近会话用更紧凑的行与分隔，运行 / 待处理有语义色；未知和空闲保持中性。
- 今天强化主值，时间带弱化；回到现场强调继续操作，队列保留真实原因文字。
- 便笺正文与编辑入口分区，长内容局部滚动；时钟保留时区 / 日期及自己的时间选项。
- 快捷仅一个主要操作，其他行和编辑入口降低权重；任务仍然只准备未发送草稿。
- 工作足迹把活跃天数作为主值，范围与人工消息作为上下文；12 周使用固定 16px 方格，一年使用 12px，窄卡内部横滚，不再拉伸为长条。
- 仅消费 DSH 语义 token，保持宿主浅深主题；微反馈为 120ms，网格过渡为 150ms，reduced-motion 关闭过渡。普通拖拽、保存、配置与数据 API 不受视觉层修改。

## 证据

真实安装 UI 的浏览器脚本为 `scripts/verify-widget-visuals.mjs`。数据是明确合成的 snapshot / activity 路由夹具，不是用户历史完整性审计；布局与配置写入走真实隔离宿主，finally 恢复。暗色使用临时 DOM 属性触发宿主主题别名，并不等于持久设置切换链路验收。
