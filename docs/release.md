# 发布清单

从「开发版」转向「发布版」时按顺序走一遍。每条都要有结论：通过，或者写清楚为什么不做。

## 0. 版本

- [ ] `package.json` 的 `version` 是这次要发的号。npm 上的 `latest` 目前是 `0.3.2`，仓库领先它很多；`0.x` 期间 minor 表示**形状或契约有变更**，补丁号表示行为修正。
- [ ] `CHANGELOG.md` 顶部有这一版的条目，写的是用户能看见的变化，不是提交列表。
- [ ] `git status` 干净；`lib/` 是**这次源码构建出来的**（发布包里的 `lib/client.js` 就是它，别再单独构建一次）。

## 1. 代码门（本地，全绿才继续）

```sh
npm run check                    # build:css + check:assets + tsc --noEmit + 单测
npm run build
npm pack --pack-destination ../.work/dsh-home
npm run test:host -- --tarball ../.work/dsh-home/vlln-dsh-home-<version>.tgz
```

- 端口 **3186** 必须空着：`test:host` 会起一个固定端口的隔离宿主，跑完自己收尾。
- 宿主门禁要**重置夹具到标准卡片**再跑；手调过的桌面会让它失败在「first-run board is packed」这类断言上——那不是回归，是夹具漂移。
- 门禁红了就停下，不要带着红门禁发版。

## 2. 产物

- [ ] `npm pack` 的清单里只有：`lib/`、`cordis.patch.yml`、`icon.svg`、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`docs/`、`examples/widget-counter`。
- [ ] 没有 `test/`、`scripts/`、`src/`、`.work/`、tarball、截图、`.env`。
- [ ] `docs/preview/*.png` 是**当前界面**的截图（视觉一改就要重拍，这张图是 README 的第一屏）。它**不进包**（`files` 里的 `!docs/preview`）：npm 会把 README 里的相对图片改写成 `raw.githubusercontent.com/<repo>/HEAD/...`，所以这两个文件要在仓库里、仓库要先推上去。
- [ ] `THIRD_PARTY_NOTICES.md` 覆盖 vendored 的 BoardUI 组件；`npm run check:assets` 里的 `prune-vendor --check` 会挡住没用到的 vendored 文件。

## 3. 安装面（真机，不是隔离站）

1. 在**独立 `DSH_HOME`** 里装本地 tarball，硬刷新浏览器；
2. 点左上角 logo 能进工作台；侧栏「首页」同上；
3. 编辑布局 → 拖一张卡 → 完成 → 刷新后位置还在；
4. 小组件库 → 搜索 → 拖一张新卡上去 → 删除（拖到「拖到这里删除」）；
5. 数据目录 `$DSH_HOME/data/dsh-home/` 出现 `state.json` / `planner.json` / `focus.json`，写入后不出现「未能保存」；
6. 语言 / 主题各切一次（中英 × 深浅），卡片没有溢出、没有横向滚动条。

## 4. 发布

```sh
git tag v<version> && git push --tags
npm publish          # prepublishOnly 会再跑一次 build + test
```

- 发布后**装一次 npm 上的包**（不是本地 tarball）：

  ```sh
  DSH_HOME=<fresh-home> dsh plugin --profile web add @vlln/dsh-home
  ```

  能装上、能渲染、`dsh plugin list` 里的版本号对得上，才算发布完成。
- 版本号一旦发出去就不回收：有问题发补丁号。

## 5. 这一版不覆盖的

写在 README 的「已知限制」里，发布说明要照抄，不要含糊：

- 触摸手势（只有单测与合成数据）；
- 中英文 × 深浅主题的**矩阵**验收（宿主门禁覆盖了四档，但不含窄屏 × 主题的组合）；
- 真实历史完整性（夹具是合成的，账本口径只在单测里验证）；
- `sessionStatus` / `sessionPersistence` 等宿主服务的旧版本行为。

## 6. 发布后一周

- 看有没有人报「面板在但数字全 0」——那是宿主服务改名，README 的症状表已经写了怎么查。
- 退出前的临时状态清一次：`.work/` 下的验证站与夹具可以留（不进包），仓库根目录不留 tarball 和截图。
