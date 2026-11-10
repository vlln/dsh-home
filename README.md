<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/preview/home-dark.png">
    <img src="docs/preview/home.png" alt="dsh-home 的桌面：左栏是最近活跃会话，中间是今天的时间带与最近活跃柱状，右栏是置顶会话、计时器与工作足迹" width="100%">
  </picture>
</p>

<h1 align="center">dsh-home</h1>

<p align="center"><b>把 DSH 每次点 logo 都会打开的空白页，换成一张能编排的桌面：十九种卡，接着干就行。</b></p>

<p align="center"><a href="#三步上手">开始使用</a> · <a href="#组件目录">组件目录</a> · <a href="#常见问题">常见问题</a></p>

<p align="center">
  <a href="package.json"><img alt="需要 dsh 0.2.0 或更高" src="https://img.shields.io/badge/dsh-%E2%89%A50.2.0-111?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT 许可" src="https://img.shields.io/badge/license-MIT-111?style=flat-square"></a>
</p>

<br>

## 点 logo，得到一张桌面

原来点左上角 logo 会开一次空白会话：一句标语、一个输入框，没有别的。

装上这个插件后，同一次点击打开的是桌面：左栏是你今天动过的会话，中间是今天这条时间带和最近一个月的投入，右栏是置顶、计时器、日程。上面那张截图就是它，卡片可以拖、可以删、可以再来一张。截图截自隔离验证宿主，数据是合成夹具。

<br>

## 编排：拖一张卡，桌面自己让位

<table>
<tr>
<td width="62%">
  <img src="docs/preview/edit.png" alt="编辑布局时的桌面：每张卡右上有一个移动把手，顶栏出现小组件、整理布局与完成" width="100%">
</td>
<td valign="top">
<p><b>拖标题或把手移动，松手才落位。</b></p>
<p>卡片实时跟着指针，预览框吸附网格；拖过已占区域不会立刻挤动，在同一落点停约 0.5 秒才按悬停的那条边让位，多张卡一起碰到时沿同一轴撑开，同排行列不重排。</p>
<p><b>删除是把它拖到页面顶部。</b>目标变红并写「松手即删除」，卡片当场消失、原地腾起一小团碎屑，不可撤销；键盘路径是聚焦把手后按 Delete。</p>
</td>
</tr>
</table>

<br>

## 会话：今天动过什么，不用翻侧栏

<table>
<tr>
<td width="62%">
  <img src="docs/preview/card-sessions.png" alt="最近活跃会话卡：五行，每行是状态点、会话标题、相对时间，第二行是工作区胶囊" width="100%">
</td>
<td valign="top">
<p><b>最近五条，一条两行。</b></p>
<p>第一行状态点、标题、相对时间；第二行工作区胶囊，只有「在等你」才把状态写成文字，其余交给那个点。</p>
<p>要翻历史、要搜索，用侧栏：卡片上不放搜索框和目录下拉，那会把每条压成 28px 的细线。</p>
</td>
</tr>
</table>

<br>

## 时间：这一个月的时间花在哪

<table>
<tr>
<td width="62%">
  <img src="docs/preview/card-time.png" alt="最近活跃卡：主值 1 小时 13 分，下面是 30 根日柱，末端几天是蓝色的实际时长" width="100%">
</td>
<td valign="top">
<p><b>一个数字加一排柱子，窗口就地切换。</b></p>
<p>在场时长按事件聚簇算：五分钟没动静就不算，挂机不虚增。7 / 14 / 30 天是同一个量的三个窗口，所以是一张卡的三种视图，不是三张卡。</p>
<p>「工作足迹」是另一种切面：每条顶层的真人消息算一次，按浏览器时区归日，点某天看当天会话。</p>
</td>
</tr>
</table>

<br>

## 组件目录

十九种卡。尺寸是声明的：只有列出的形状存在，不提供拖边框改尺寸。表里是拖入时的默认形状，`4` 约等于 372px。

| 卡 | 它回答什么 | 默认 |
|---|---|---|
| 最近活跃会话 | 今天刚动过哪几个会话，最近 5 条 | 4×8 |
| 置顶会话 | 原生全局置顶列表，点进去回到原会话 | 4×8 |
| 会话状态 | 在跑 / 在等你 / 未读三档，等你的人写明原因 | 4×6 |
| 今天 | 一条 24 小时时间带加一个主数字 | 8×4 |
| 最近活跃 | 每天投入的时长，7 / 14 / 30 天 | 8×4 |
| 工作足迹 | 人工消息热力图，点某天看当天会话 | 8×6 |
| 待办 | 今天 / 本周 / 更远 / 无日期 / 已完成分组，回车即落今天 | 4×6 |
| 今日计划 | 今天的时间轴，「现在」线插在正确位置 | 4×6 |
| 日程 | 月视图加所选日期的条目，能在那天直接新建 | 4×8 |
| 打卡 | 今天该做的习惯与连续天数 | 4×6 |
| 计时器 | 一个倒计时圆盘，圆盘就是设置器（拖动或滚轮） | 4×4 |
| 番茄钟 | 25 分钟专注、5 分钟休息，记今日轮数 | 4×6 |
| 倒计时 | 最多 8 个目标日期，显示最近一个还剩多久 | 4×4 |
| Token 用量 | 今天用了多少、七天走势、缓存命中率、输出速率 | 4×6 |
| 余额 | DeepSeek 平台余额与今日花费，key 只在宿主侧用 | 4×4 |
| 图片 | 一张图加可选标题，http(s) 或本地路径 | 4×4 |
| 一句话 | 中英文语录按日轮换，也可换成自己的清单 | 4×4 |
| 便笺 | 在卡上直接写，首行即标题，停笔即保存 | 4×6 |
| 时钟与日期 | 大号时间、日期牌、一行安静的时区小字 | 4×4 |

计划、计时、账本、余额都存在本机，写在插件自己的数据目录：`state.json` 存桌面布局，`planner.json` 存待办与日程（四张卡同一份），`focus.json` 存计时，`ledger.json` 是时间账本，`pictures/` 放图片卡上传的文件。写入走 op 式接口：客户端只发操作，宿主在现有文档上应用，两个窗口同时改不会互相覆盖。

<br>

## 三步上手

> **前提：** 需要本机已装 DSH（`dsh` 命令可用）与 Node ≥ 22.19。

1. **装进 web profile。**

   ```sh
   dsh plugin --profile web add @vlln/dsh-home
   ```

2. **硬刷新浏览器**（Cmd/Ctrl+Shift+R）。只有 Node 半边改动时才需要重启 DSH。

3. **点左上角 logo。** 打开的就是上面那张桌面：顶栏右上出现「编辑布局」和「返回会话」就算装好了。

| 安装方式 | 适用环境 | 入口 | 额外条件 |
|---|---|---|---|
| npm | 日常使用 | `dsh plugin --profile web add @vlln/dsh-home` | 能装公共 npm 包 |
| 本地 tarball | 改代码、验证新功能 | `npm run build && npm pack`，再 `dsh plugin --profile web add ./vlln-dsh-home-<version>.tgz` | 用独立的 `DSH_HOME`，别借用日常数据目录 |

卸载：`dsh plugin --profile web remove @vlln/dsh-home`。桌面布局、计划、账本留在 `$DSH_HOME/data/dsh-home/`，不随卸载删除，需要的话手动清掉。

<br>

## 依赖、数据与费用

插件本身不收费，不带账号、不埋点、不上报。下表是它接触外部世界的地方：

| 能力 | 需要什么 | 不配置会怎样 |
|---|---|---|
| 工作台、计划、计时 | 本机 DSH | — |
| 会话列表与时间账本 | 宿主已有的会话历史 | 列表为空、数字为 0，卡片不报错 |
| 余额与今日花费 | DeepSeek 平台 API key（宿主侧解析：设置里的 `apiKeyEnv`，或 `DEEPSEEK_API_KEY`） | 卡片写「未配置 API key」，不显示旧值 |
| 图片 | 本地文件（宿主只读路由读出）或 http(s) 地址 | 空槽显示虚线框 |

> **数据：** 时间、计划、布局、计时全部落在本机 `$DSH_HOME/data/dsh-home/`。除了余额要拿 key 请求 DeepSeek 平台、图片卡可能引用外链，插件不发起对外请求。

<br>

## 兼容性

| 依赖 | 状态 |
|---|---|
| dsh `>= 0.2.0` | 声明在 `package.json` 的 `engines`；不声明 `@deepseek-ai/dsh-*` 的 peer 范围，因此不会被宿主预检按版本整包禁用 |
| Node `>= 22.19` | 同上 |
| dsh `0.2.1-rc.5` | 本版实测：单测、类型检查、构建、隔离宿主 16 项（中英 × 深浅四档、760px 窄屏） |

宿主服务或槽位改名时，症状比版本号好认：

| 症状 | 多半是 |
|---|---|
| 面板还在，数字全是 0 | `sessionPersistence` 服务改名（boot 日志有 `dsh-home: pending (waiting for service: …)`） |
| 侧栏「首页」行消失 | `main` / `sidebar.panellist` 槽改名 |
| 会话状态只有「在跑」 | `sessionStatus` 根钩子改名 |
| 计时器写「未能保存」 | 宿主服务端是旧版本，没有计时写入能力，重启宿主 |

<br>

## 常见问题

<details>
<summary>为什么不能拖边框改尺寸？</summary>

尺寸是组件声明的形状集合，不是自由数值：新建实例用默认形状，旧布局里存过的宽度只会**收窄**到最接近的声明宽度，高度不迁移（可能撞上邻居）。这样同一张卡在任何桌面上都保持同样的比例，不会因为拉宽变成另一种版式。想换形状就从组件库再拖一张。

</details>

<details>
<summary>要联网吗？要账号吗？</summary>

不需要账号。会话、时间、计划、计时都读本机会话历史与本机文件；唯一的外部请求来自余额卡（要你配 key）和图片卡里引用的外链。

</details>

<details>
<summary>卡片多会卡吗？</summary>

每张卡只订阅一份共享数据：数据变了，同一帧一起重渲染。计时器在跑时按帧更新圆盘，暂停后不再重绘；账本首次整理分批在后台折，首屏只显示进度，不阻塞使用。

</details>

<details>
<summary>我想加自己的卡。</summary>

第三方卡是独立的代码插件，注入 `homeWidgets` 服务注册，不用改这个仓库。契约与打包方式见[小组件开发指南](docs/widget-development.md)，可安装的示例见[计数器插件](examples/widget-counter/README.md)。卡片有错误边界，但这**不是安全沙箱**：只装可信来源的代码插件。

</details>

<br>

## 开发

```sh
npm run build      # 主题 CSS → 资产校验 → 打包 client/host → 类型检查
npm test           # 单测：纯逻辑、契约、静态门禁
npm run check      # 上面两件事加资产校验，提交前的门
npm run test:host  # 隔离宿主验收：先 npm pack，再传 --tarball
```

| 文件 | 读它做什么 |
|---|---|
| [docs/widget-development.md](docs/widget-development.md) | 扩展契约、预览、尺寸声明、打包 |
| [docs/boardui-conformance.md](docs/boardui-conformance.md) | 视觉标准的实测数字与层序陷阱 |
| [docs/conformance-plan.md](docs/conformance-plan.md) | 每张卡为什么长这样，以及被否掉的方案 |
| [docs/release.md](docs/release.md) | 发布前的检查清单 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更 |

<br>

## License

[MIT](LICENSE)。vendored 的界面组件与第三方依赖的条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
