# dsh-home — 工程备忘录（本地，不入 npm 包）

> 读者是**改这个插件的人**。用户向的内容在 `README.md`；这里的机制细节、验证证据、
> 踩过的坑不进 README。

## 定位

把 DSH 左上角 logo 的点击从「开新会话」改成「打开首页」。首页 = `main` 面板（key `home`）：
默认是三件事（回到现场 / 在等我 / 今天），可编排的网格在「更多数据与小组件」里
（内置 4 张 + 第三方经 `home.widget` 贡献的卡）。

## 结构

```
src/index.mjs        Node half：活动账本 + 同源围栏路由 /plugins/dsh-home/api
src/ledger.mjs       纯折叠：事件 → 天桶 + 活动簇（单测覆盖）
src/state.mjs        state.json（布局/偏好，写得勤）+ ledger.json（会话聚合，写得少）
src/trust.mjs        Origin/Host 同源围栏（照 dsh-pr-inbox）
src/client/index.tsx apply：字典、面板、侧栏条目、logo 入口
src/client/page.tsx  三件事 + 「更多」网格 + 编辑态 + 拖拽
src/client/focus.tsx 回到现场 / 在等我 / 今天（默认视图；排序由 page 包一层）
src/client/reorder.tsx 拖拽排序（window 监听 + 保留落点 + rAF 滚动 + 禁选中）
src/client/boundary.tsx 单卡错误边界（第三方 widget 抛错只坏一张）
src/client/widgets.tsx 内置卡（只画卡内，外壳由 page 提供）
src/client/store.ts  快照/会话目录/布局/编辑态，useSyncExternalStore 契约
src/client/api.ts    POST 信封 + 类型
src/client/styles.ts 注入式样式表（前缀 dsh-home，只用 --dsw-* token）
```

## 三个关键决定

1. **logo 用捕获监听，不占 `sidebar.brand.mark`**：该槽被官方品牌包以 priority 0 占着，
   同优先级再注册会抛；占低优先级（如 -1）会顶掉官方 logo 的视觉。捕获监听只认
   「展开态品牌按钮」（其内部有 `brandIdentity`；折叠态 rail 是 `railMark`），命中就
   `stopPropagation` + `selectPanel('home')`。识别失败 ⇒ 什么都不做，退化回官方行为。
   代价：键盘 Enter 与 aria 仍按官方"新会话"。详见 `decisions/0001`。
2. **账本读 `ctx.sessionPersistence`，不直接解压 `sessions/**.jsonl.zstd`**：日志是
   多帧 zstd + v0→v4 迁移 + 撕裂尾部，全归官方后端管。实测 `zstdDecompressSync`
   只解第一帧（一条 60KB 的日志解出 167 字节），绕过官方就是自找格式债。
3. **布局只存覆盖**：`{ order, size, hidden }` 里只出现用户动过的项；默认排布由内置表
   + `home.widget` 注册顺序合成，所以卸载一个 widget 包不会毁掉别人的布局。
4. **默认是三件事，网格是 opt-in**（decisions/0005）：报表会衰减、N=1 时六张卡五张空、
   布局编辑器维护成本最高而使用频率最低。首页先解决"接着干什么"。
5. **记忆是首页的一部分**：`prefs.lastSeenAt` 支撑「自上次以来」，`prefs.dismissed`
   让 dismiss 只静音到下一次有新活动。没有记忆的 home 只是海报。
6. **折叠口径带版本号**（`FOLD_VERSION`）：改口径 → 整个账本重折；否则 revision 没变的旧
   聚合会永远留着错数。
7. **扫描有上界**：真实机器 974 条会话 / 2.1 GB 日志，按创建时间从新到旧、每批 4 条并发、
   批间让出事件循环、每 1.5 秒落盘；`progress` 随快照下发，前端显示「正在整理 N/M」。

## 验证记录（2026-10-22，dsh 0.2.1-rc.1）

隔离实例：`DSH_HOME=/tmp/dsh-home-verify/home`，`dsh web --port 0`（不复用 3080）。
为了有真实数据，把 `~/.dsh/sessions` 里最近的 9 个 workspace 目录**只读复制**进隔离
home（源不动）。

| 证据 | 结果 |
|---|---|
| boot 日志 | 干净（无 pending / did not activate） |
| `__DSH_BOOT__` | 含 `{"id":"@vlln/dsh-home","url":"plugins/??@vlln/dsh-home/client.js…"}` |
| 路由 | `POST /api {op:"snapshot"}` → `ok:true`；跨站 Origin → `forbidden` |
| 渲染（playwright + 系统 Chrome） | 点 logo → `.dsh-home` 出现；6 张卡都有内容；console 0 error 0 warning |
| 编辑 | 切 L → `data-size=l`；清单里隐藏 → 5 张、状态变「显示」；恢复 → 6；完成 |
| 持久化 | 重进首页尺寸仍是 L；`layout.get` 返回同一份 |
| 返回 | 「返回会话」后面板消失；点「继续」首行回到那个会话 |
| 折叠态 | 点 rail 上的 logo → 展开侧栏，**不进首页** |
| 窄屏 760px | 2 列，无横向溢出 |
| 小组件清单 | 6 项；隐藏「在跑」→ 5 张卡、条目状态变「显示」；再点恢复 6 张 |
| 拖拽 | 把手拖到「近两周」右半 → 落下后顺序为 `today,running,areas,rhythm,continue,quick`，过程中有 1 个插入线标记 |
| 两步重置 | 第一次点只出现「确认恢复默认？」，第二次才生效：尺寸回 `m`、顺序回默认 |
| Esc 分层 | 第一次关清单，第二次退出编辑（`tray=0`、`tools=0`） |
| 刷新 | 标题旁 `↻` 存在；`账本更新于 刚刚` 文案随取数更新 |
| 时间带 tooltip | `11:26–11:28 · 2 分钟 · default-workspace` |
| 隐藏持久化 | 隐藏「快捷」→ 刷新页面 → 仍 5 张 |
| 负控 | 把 `inject` 改成 `['webServer','definitelyMissingService']` 重打包装进另一个 home → `dsh: warning: 1 entry did not activate` + `pending (waiting for service: …)` |
| 三件事（0.3） | 默认只渲染 `.dsh-focus` + 队列 + 今天；`[data-widget-id]` 为 0；展开后 4 张 |
| 记忆 | 「换一个」改变标题；dismiss 后当前会话不再出现；`prefs.dismissed` 落盘；同日再进页面不重复计入 |
| sessionStatus | 队列节点带 `data-status-source="runtime"`（确认根钩子真的送到了 `main` 面板组件） |
| 扫描进度 | 快照里 `progress.done/total` 随批量推进；`今日` 卡在扫描中显示「正在整理 N/M」 |
| 错误边界（负控） | 把 `AreasBody` 改成 `throw` 另打一个 9.9.9 → 首页仍在、焦点卡仍在、3 张网格卡正常、只有那一张显示 `dsh-error`，console 有一条 `[dsh-home] widget failed` |

截图：`docs/preview/home.png`、`docs/preview/edit.png`（2880×1800 @2x）。

## 命令

```sh
pnpm install          # 只装 tsdown/typescript/@types/react
pnpm run build        # lib/index.mjs + lib/client.js（banner/footer 已配）
node --test           # 账本口径 7 个用例
pnpm pack             # vlln-dsh-home-<ver>.tgz → 装进隔离 home
```

重装到隔离实例（**Node 半边改动必须重启进程**；client 半边装完刷新即可）：

```sh
DSH_HOME=/tmp/dsh-home-verify/home dsh plugin --profile web add ./vlln-dsh-home-<ver>.tgz
# 重启 dsh web --port 0 --no-open，再跑 ui-check
```

## 踩过的坑

- `lsof -ti tcp:<port>` 在 mac 上可能返回 **两个** pid（v4/v6），`kill` 要循环。
- 全新 `DSH_HOME` 会弹「Get started」模态，遮罩拦截所有点击；自动化前先 Esc / 点关闭。
- Playwright 缓存的 chromium 版本可能和包要求的 build 不一致（1243 vs 1248）——用
  `channel: 'chrome'` 走系统 Chrome。
- 同一个 widget id 既在内置表又在 `home.widget` 里时，内置优先（`metas` 去重）。
- **拖拽别用 pointer capture**：手柄在拖动中会被重渲染、指针也会离开元素，capture 一丢
  就没有 pointermove；更隐蔽的是"最后一次 pointermove 落在空白/视口外 → 落点被清空 →
  松手什么都不发生"。现在用 window 监听、**保留最后一个有效落点**、rAF 按帧自动滚动。
  回归信号：`[data-widget-id]` / `[data-focus-id]` 顺序 + 拖动中 `[data-drop]` 的出现/消失。
- **拖动期间必须禁文本选择**：`body.dsh-home-dragging { user-select: none }` + 卡片标题/眉标
  行常驻 `user-select: none`。用户看到的"拖不动"其实是"选中了标题文字"——这是最容易被
  误判成 bug 的表现。把手也要**常显**（0.5 透明度），悬停才出现等于没有。
- 回归断言里不要用 `.dsh-tools` 数量当"编辑态"信号：阅读态每张卡也有一个把手。用
  `[data-editing="true"]`。
- 安装后 `dsh plugin add` 同一版本号**可能复用缓存副本**（`Already up to date`），产物没换。
  判据用 sha256 对比 `lib/client.js` 与 profile 里的副本，别信 mtime；换了产物必须**重启**
  host 再验（否则浏览器拿到的还是旧 bundle，会得到假阴性——本插件就在这上面栽过一次）。

## 第二轮（UX 打磨）的设计取舍

- **编辑态与阅读态彻底分开**：阅读态没有任何编辑控件（卡片只有数据 + 行可点）；一切编辑
  都从「编辑布局」进入，Esc 退出。比"常驻 kebab 菜单"更干净，也让拖拽不会误触。
- **"恢复默认"用两步确认，不用 Modal**：清布局是低频动作，弹模态太重；按钮变红 + 文案变
  「确认恢复默认？」+ 4 秒自动取消，代价小、误触可恢复。
- **小组件清单（tray）取代「全部显示」**：只给"显示全部"没法单独找回一张卡；清单让每张卡
  都有明确的显示/隐藏开关，也是将来"添加第三方 widget"的入口。
- **刷新放标题行，不放页脚**：六张卡时页脚在首屏之外，状态与刷新必须常驻可见。
- **拖拽按落点左右半边决定前后**：只判断"落在哪张卡上"无法表达"插到它前面还是后面"，
  插入线让结果可预期；键盘用 ← → 作为等价路径；拖到视口上下 64px 内自动滚动。
- **「今天动过」换成「今天按工作区」**：原来的会话列表与「继续」几乎同构（同一屏两份列表），
  改成按 cwd 归因的时长后才提供新信息，也顺手把"工时表"这条线接上。子代理会话的时长并入
  其工作区，让这张卡的和能对上「今天」的总数；超过 5 个工作区时补一行「其他 N 个工作区」。
- **扫描中补拉**：首屏取数时账本可能还在扫（`scanning: true`），store 3 秒后自动补一次，
  否则用户要等 60 秒才看到完整数字。

## 第三轮（形态 pivot，0.3.0）的取舍

- **删掉「继续 / 今天动过」**：「回到现场」替掉前者；后者与侧栏列表同构，信息重复。
- **「今天按工作区」移进「更多」**：它是有用的第二层数据，但不该占首屏。
- **空态要安静**：一天还没开始时不再摆"0 分钟 / 0 个会话 / agent 运行 0 分钟"三行零。
- **队列依赖官方 `sessionStatus`**：`useSessionStatus` 是根标准钩子，`main` 面板组件能拿到
  （用 `data-status-source` 断言过）。组合里没有它时只有空态。
- **dismiss 语义是"静音到下次活动"**，不是永久隐藏：`dismissed[id] < lastAt` 就复活。
- **卡内容必须作为子组件渲染**（`WidgetBody`），不能在 HomePage 的 render 里直接调
  `body(props)`：错误边界只捕**子孙**，直接调用会把异常抛在 HomePage 自己的 render 里，
  于是被宿主的槽边界接住、整块面板消失。这条是负控逼出来的（首版确实是这样坏的）。
- **拖拽在阅读态就要可用**，编辑态只负责尺寸/隐藏/清单。把拖动藏在"编辑布局"后面，
  用户的第一反应是"这些组件根本不能动"（0.3.0 的真实反馈）。
- **三件事也允许排序**（0.3.2）：用户第二次反馈"每个组件都不能改变位置"时，指的是这三张。
  原设计把它们当固定产品面，代价是"顺序永远可预期"；现在改为可排序 + 恢复默认一起复位。
  把手放在眉标行（回到现场）或标题行（在等我 / 今天），顺序存 `layout.focusOrder`。

## 待办

- `conversation.hero.body` 上游提案（在空白会话输入框上方给一个官方槽）——有了它首页
  就能内嵌，而不只是一个面板。
- 「未完成」卡：待审批 / 未发送草稿 / 未读子结果（需要 `ctx.status` 一类的接口）。
- 周报导出（按工作区的工时表）。
- snooze（"两小时后再提醒"）与"批量标记已读"。
- logo 入口做成配置项（首页 / 新会话），并配一个快捷键入口。
