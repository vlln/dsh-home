<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/preview/home-dark.png">
    <img src="docs/preview/home.png" alt="dsh-home 的桌面：左栏是最近活跃会话，中间是今天的时间带与最近活跃柱状，右栏是置顶会话、计时器与工作足迹" width="100%">
  </picture>
</p>

<h1 align="center">dsh-home</h1>

<p align="center"><b>把 DSH 点 logo 打开的空白页换成一张可编排的桌面：内置 19 张卡，支持自定义小组件。</b></p>

<p align="center"><a href="#功能">功能</a> · <a href="#组件目录">组件目录</a> · <a href="#安装">安装</a></p>

<p align="center">
  <a href="package.json"><img alt="需要 dsh 0.2.0 或更高" src="https://img.shields.io/badge/dsh-%E2%89%A50.2.0-111?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT 许可" src="https://img.shields.io/badge/license-MIT-111?style=flat-square"></a>
</p>

<br>

https://github.com/user-attachments/assets/336a74e4-e08e-4713-abda-6f5b95dc329e

<br>

## 功能

- **编排**：拖动卡片，拖到页面顶部删除，布局按屏幕断点分别保存。
- **会话**：最近活跃会话、原生置顶、在跑 / 在等你 / 未读三档状态。
- **时间**：今天 24 小时时间带、每日在场时长（7 / 14 / 30 天）、人工消息热力图、Token 用量。
- **计划**：待办、今日时间轴、月视图日程、打卡；四张卡共用一份计划数据。
- **专注**：倒计时圆盘、番茄钟、目标日期倒计时。
- **内容与数据**：余额、图片、一句话、便笺、时钟与日期。
- **自定义小组件**：第三方插件注入 `homeWidgets` 注册自己的卡，共用同一套外壳、预览与尺寸声明。

<br>

## 组件目录

十九种卡，尺寸是声明的：只有列出的形状存在。`4` 约等于 372px。

| 卡 | 它回答什么 | 默认 |
|---|---|---|
| 最近活跃会话 | 今天刚动过哪几个会话 | 4×8 |
| 置顶会话 | 全局置顶的会话，点进去回到原会话 | 4×8 |
| 会话状态 | 在跑 / 在等你 / 未读，以及等你在等什么 | 4×6 |
| 今天 | 24 小时时间带加一个主数字 | 8×4 |
| 最近活跃 | 每天投入的时长 | 8×4 |
| 工作足迹 | 人工消息热力图 | 8×6 |
| 待办 | 按今天 / 本周 / 更远 / 无日期 / 已完成分组 | 4×6 |
| 今日计划 | 今天的时间轴与「现在」线 | 4×6 |
| 日程 | 月视图与所选日期的条目 | 4×8 |
| 打卡 | 今天该做的习惯与连续天数 | 4×6 |
| 计时器 | 拖动或滚轮设定时长的倒计时圆盘 | 4×4 |
| 番茄钟 | 25 分钟专注、5 分钟休息 | 4×6 |
| 倒计时 | 最近一个目标日期还剩多久 | 4×4 |
| Token 用量 | 今日用量、七天走势、缓存命中率、输出速率 | 4×6 |
| 余额 | DeepSeek 平台余额与今日花费 | 4×4 |
| 图片 | 一张图加可选标题 | 4×4 |
| 一句话 | 按日轮换的语录，可换成自己的清单 | 4×4 |
| 便笺 | 直接在卡上写的便条 | 4×6 |
| 时钟与日期 | 时间、日期与时区 | 4×4 |

数据写在 `$DSH_HOME/data/dsh-home/`：`state.json` 布局，`planner.json` 计划，`focus.json` 计时，`ledger.json` 账本，`pictures/` 图片。

<br>

## 安装

> **前提：** 本机已安装 DSH（`dsh` 命令可用）与 Node ≥ 22.19。

1. 装进 web profile：

   ```sh
   dsh plugin --profile web add @vlln/dsh-home
   ```

2. 硬刷新浏览器（Cmd/Ctrl+Shift+R）。只有 Node 半边改动时才需要重启 DSH。

3. 点左上角 logo 进入工作台。

| 安装方式 | 适用环境 | 入口 | 额外条件 |
|---|---|---|---|
| npm | 日常使用 | `dsh plugin --profile web add @vlln/dsh-home` | 能装公共 npm 包 |
| 本地 tarball | 改代码 | `npm run build && npm pack`，再 `dsh plugin --profile web add ./vlln-dsh-home-<version>.tgz` | 独立的 `DSH_HOME` |

卸载：`dsh plugin --profile web remove @vlln/dsh-home`。数据留在 `$DSH_HOME/data/dsh-home/`。

<br>

## 自定义小组件

第三方卡是独立的代码插件，注册到 `homeWidgets` 服务，不需要改这个仓库：

```ts
import type { WidgetDefinition } from '@vlln/dsh-home/widgets'

// definition: WidgetDefinition<YourConfig>
ctx.inject(['homeWidgets'], scoped => {
  scoped.effect(() => scoped.homeWidgets.register(definition))
})
```

注册后出现在组件库，由用户添加实例。契约与打包方式见[小组件开发指南](docs/widget-development.md)，可安装的示例见[计数器插件](examples/widget-counter/README.md)。只安装可信来源的插件。

<br>

## 兼容性

| 依赖 | 状态 |
|---|---|
| dsh `>= 0.2.0` | 声明在 `package.json` 的 `engines` |
| Node `>= 22.19` | 同上 |
| dsh `0.2.1-rc.5` | 本版实测：单测、类型检查、构建、隔离宿主 16 项 |

宿主服务改名时的症状：

| 症状 | 多半是 |
|---|---|
| 面板还在，数字全是 0 | `sessionPersistence` 服务改名 |
| 侧栏「首页」行消失 | `main` / `sidebar.panellist` 槽改名 |
| 会话状态只有「在跑」 | `sessionStatus` 根钩子改名 |

<br>

## 开发

```sh
npm run build      # 主题 CSS → 资产校验 → 打包 client/host → 类型检查
npm test           # 单测：纯逻辑、契约、静态门禁
npm run check      # 上面两件事加资产校验，提交前的门
npm run test:host  # 隔离宿主验收：先 npm pack，再传 --tarball
```

| 入口 | 读它做什么 |
|---|---|
| [docs/README.md](docs/README.md) | 文档索引：改卡片、改能力、发布各读哪份 |
| [docs/widget-development.md](docs/widget-development.md) | 扩展契约、预览、尺寸声明、打包 |
| [docs/release.md](docs/release.md) | 发布前的检查清单 |

<br>

## License

[MIT](LICENSE)。vendored 组件与第三方依赖的条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
