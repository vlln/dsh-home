# dsh-home — 工程备忘录（本地，不入 npm 包）

> 读者是**改这个插件的人**。用户向的内容在 `README.md`；这里的机制细节、验证证据、
> 踩过的坑不进 README。

## 定位

把 DSH 左上角 logo 的点击从「开新会话」改成「打开首页仪表盘」。首页 = `main` 面板
（key `home`），六张内置卡 + 第三方经 `home.widget` 槽贡献的卡，布局可拖动/切尺寸/隐藏。

## 结构

```
src/index.mjs        Node half：活动账本 + 同源围栏路由 /plugins/dsh-home/api
src/ledger.mjs       纯折叠：事件 → 天桶 + 活动簇（单测覆盖）
src/state.mjs        $DSH_HOME/data/dsh-home/state.json 原子读写 + 布局校验
src/trust.mjs        Origin/Host 同源围栏（照 dsh-pr-inbox）
src/client/index.tsx apply：字典、面板、侧栏条目、logo 入口、面板进出钩子
src/client/page.tsx  标题行 + 网格 + 编辑态 + 拖拽
src/client/widgets.tsx 六张内置卡（只画卡内，外壳由 page 提供）
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

## 待办

- `conversation.hero.body` 上游提案（在空白会话输入框上方给一个官方槽）——有了它首页
  就能内嵌，而不只是一个面板。
- 「未完成」卡：待审批 / 未发送草稿 / 未读子结果（需要 `ctx.status` 一类的接口）。
- 周报导出（按工作区的工时表）。
