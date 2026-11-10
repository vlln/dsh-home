# 0001 — logo 入口用捕获监听，不占 `sidebar.brand.mark`

- 日期：2026-10-22
- 状态：采纳

## 背景

目标是把「点左上角 logo 开新会话」换成「打开首页」。`sidebar.brand.mark` 是 single 槽，
看起来正好，但两点挡住：

1. 官方品牌包（`dsh-client-ui-brand-official`）以 priority 0 占据它；同优先级再注册会抛
   （`single slot "sidebar.brand.mark" already has a registration at priority 0`）。
2. 槽的影子机制允许低优先级覆盖（最低者渲染），但那样官方 logo 的视觉会消失——为了改一个
   点击动作而换掉品牌，代价太大。

## 决定

不占槽。在 `document` 捕获阶段监听 click，只认「展开态品牌按钮」——它的内部有
`brandIdentity`；折叠态 rail 的 logo 内部是 `railMark`（点击必须保留为"展开侧栏"）。
命中就 `preventDefault` + `stopPropagation` + `layout.selectPanel('home')`。

## 代价与失败模式

- 键盘 Enter / 读屏仍按官方语义（开新会话）——写入 README「已知限制」。
- 若官方重命名 `brandIdentity` 类，监听永不命中 ⇒ 行为退回官方，功能消失但不破坏任何东西。
  （这是有意选择的失败方向：宁可不生效，也不要把折叠态的展开按钮弄坏。）

## 上游

给 `ui-sidebar` 加 `sidebar.brand.action`（或把整行提升为 single 槽）可以让品牌替换拥有
点击语义；约 10 行。在此之前本文件的选择是唯一不换视觉的做法。
