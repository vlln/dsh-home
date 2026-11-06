# 开发 Home 小组件（API v1）

小组件是**独立 DSH 代码插件**贡献的 React 组件类型，不是首页里的任意脚本输入框。
插件通过 Cordis 注入服务 `homeWidgets` 注册类型；Home 管理实例、布局与持久化；组件自己管理编辑入口、草稿和保存 / 取消 UI。
不需要、也不应运行时 import Home 的内部 store、接口实现或几何模块。

完整独立包示例：[计数器插件说明](<../examples/widget-counter/README.md>)。
公共类型声明：[widget-contract.d.ts](<../lib/types/widget-contract.d.ts>)（随构建生成并包含在安装包中）。

## 1. 最小接入与可选依赖

TypeScript 只导入类型入口；构建后该 import 必须消失：

```tsx
import type { Context } from '@deepseek-ai/cordis'
import type {
  WidgetDefinition, WidgetContentProps,
} from '@vlln/dsh-home/widgets'

type Config = { label: string }

function Content({ config, instance, saveConfig, editing, preview }: WidgetContentProps<Config>) {
  // 实际组件可自行提供完整草稿 / 弹窗；这里仅展示一个最小持久化动作。
  return <div data-instance={instance.instanceId}>
    <p>{config.label}</p>
    {!editing && !preview && saveConfig && <button onClick={() => {
      void saveConfig({ label: 'Updated greeting' }).catch(error => {
        // 真实 UI 应显示失败并保留草稿，而不是只记控制台。
        console.error(error)
      })
    }}>Update greeting</button>}
  </div>
}

const definition: WidgetDefinition<Config> = {
  typeId: '@acme/hello:message',
  apiVersion: 1,
  title: 'Hello',
  description: 'A configurable greeting',
  configVersion: 1,
  defaultConfig: () => ({ label: 'Hello' }),
  validateConfig: config => typeof config.label === 'string' && config.label.length <= 100,
  sizing: { default: { w: 4, h: 6 }, supported: [{ w: 4, h: 6 }, { w: 7, h: 9 }] },
  Content,
}

export function apply(ctx: Context): void {
  // 不在外层导出 inject = ['homeWidgets']；Home 缺席时，外层插件仍可正常启动。
  ctx.inject(['homeWidgets'], scoped => {
    scoped.effect(() => scoped.homeWidgets.register(definition))
  })
  // 不 return 等待中的子 fiber；这是可选集成。
}
```

`register` 返回撤销函数，调用方用 `scoped.effect` 持有；不要在 React render 中注册。
Home 服务卸载时，Cordis 清理子 scope 并撤销注册；服务重新出现时重新执行回调。
如果还消费 `locale` 等服务，把它们加到这个子 scope 的注入列表，在回调内注册客户端字典，
并使用 `title: () => t(...)` / `description: () => t(...)`。这些取词函数应同步、无副作用。

**为什么不要求外层服务？** 在 DSH `0.2.1-rc.5` 的独立浏览器机制探针中，
外层 required `inject: ['homeWidgets']` 在 Home 缺席的初始启动阶段会导致
`Failed to load plugins` / `pending (waiting for service: homeWidgets)`。
嵌套 `ctx.inject` 的可选写法则允许宿主正常启动。这个结果验证服务装配机制，
不代替具体插件的安装、设置保存或完整 Home UI 验收。

## 2. 打包边界：类型、模块与服务不是一回事

Home 的 `@vlln/dsh-home/widgets` 导出只有 `types` 条件，对应包内
`lib/types/widget-contract.d.ts`；**没有运行时 JS 出口**。不要把它写进运行时
`require`、`import` 或客户端 `external`。开发时可把匹配版本的 Home 包作为类型开发依赖，
但不得将 Home 的 client bundle 打进自己的插件。

客户端 manifest 的最小相关部分：

```json
{
  "dsh": {
    "client": {
      "platform": "web",
      "external": ["react", "react/jsx-runtime"]
    }
  }
}
```

- 构建器应 external 实际导入的宿主模块，包括 `react` 和使用自动 JSX 转换时的
  `react/jsx-runtime`；manifest 的 `external` 与之对应。直接使用 `React.createElement`
  的 JS 示例只请求 `react`。使用其他宿主 UI / locale 模块时也要分别声明实际 specifier。
- 运行时必须复用宿主 React；不要嵌入第二份 React、React DOM 或 Cordis。
  开发用类型 / SDK 依赖不等于要内联它们。
- `dsh.client.external` 是**模块 specifier**列表，参与宿主模块图排序；不能包含自身包名。
- manifest 的 `dsh.client.inject` 是**包行依赖**，不是 Cordis 服务名列表。
  不要放 `homeWidgets`，也不要仅为可选服务集成引入强制 Home 包行依赖。
- `ctx.inject(['homeWidgets'], ...)` 才是**服务与生命周期**依赖。
- 客户端产物仍需标准 `window.__ModuleLoader__.load({ id, factory })` 包装；
  bundle 的宿主入口、patch、图标与 locale 分发等照常遵守 DSH 插件契约。

独立机制探针实测了两个分别打包的插件通过服务协作、共享同一 React、多个实例挂载，
以及提供者移除/重插后的 scope 清理和重新激活；没有依赖插件间运行时代码 import。
这不表示所有宿主版本、所有安装渠道或你的新插件已经通过验证。

## 3. 类型与实例

| 对象 | 职责 |
|---|---|
| `typeId` | 发布后保持稳定的命名空间身份，如 `@acme/weather:forecast`；不是显示标题 |
| `apiVersion: 1` | Home 组件契约版本，不是 npm 版本或配置版本 |
| `configVersion` | 本类型的配置格式版本，整数 `1..1_000_000` |
| `instanceId` | Home 创建的独立实例身份；同一 `typeId` 可以添加多次 |
| `source` | 可选来源说明，不赋予权限；目录以类型命名空间展示来源 |

持久化实例严格是 `{ instanceId, typeId, configVersion, config }`。
公开注册拒绝重复 `typeId`，不覆盖已有提供者；撤销旧注册不会删除同名的新注册。
命名空间采用小写稳定段；`legacy:` 是 Home 内部兼容适配器保留前缀，不用于新插件。

注册只让类型出现在组件目录，**不会自动创建实例**。用户进入首页的
**编辑布局 → 小组件** 后，把标题或把手拖到桌面有效落点松手，才创建实例。每次拖入生成新 `instanceId`；取消或画布外松手不创建。当前原型移除隐藏、复制和独立实例管理页；外壳仅提供移动 / 删除（把卡片拖到页首的删除目标，或用把手聚焦后按 Delete），另有显式整理布局，不提供任何用户改尺寸入口（尺寸手柄、下拉和键盘尺寸切换均取消）；配置编辑完全由 Content 自行提供；删除是拖动到页首删除目标（或把手聚焦按 Delete），立即生效、不再弹确认框。历史隐藏记录仍原样保留，删除经确认后移除该实例及全部断点位置。卸载扩展只撤销类型，
不删除已经保存的实例；缺失类型以占位卡保留，重新安装相同 `typeId` 后可恢复。

`createInstance(typeId, instanceId)` 服务方法只生成本地配置记录，不替代 Home 的用户添加流程，
也不会持久化或修改桌面。一般扩展只需要 `register`；`get`、`getSnapshot`、`subscribe`
提供只读类型目录，快照引用在注册变化前保持稳定，可用于 `useSyncExternalStore`。

### 真实内容预览与可选样例数据

组件库与拖动影像渲染同一个 `Content`，不是另写的缩略图。可选定义 `preview: { config: () => sampleConfig, data: sampleJson }`，配置会经过正常校验，数据遵守相同 JSON 上界且独立克隆。缺省 config 使用 `defaultConfig()`，缺省 data 为 `null`，不自动读取实时现场。原 `Preview` 字段已废弃，仅保留类型兼容，不再用于展示。

`Content` 在预览中收到 `props.preview = { data }`，普通桌面实例不带此字段。组件必须在 preview 存在时停用网络、计时器、订阅、导航和写入，使用样例或空数据渲染同一视图。内置组件提供隔离的空 runtime / 样例数据，不创建 HomeStore，不调用模型或活动 API。预览正文 inert 且不进入键盘导航；这不是安全沙箱，不能替不遵守约定的第三方代码清理副作用。预览异常只隔离该卡，不持久化预览实例。

## 4. 组件 props 与自行编辑

`Content` 收到 `{ instance, config, size, width, height, editing, visible, saveConfig? }`，预览另带 `preview`：

- `config` 为当前实例配置，不可原地修改；组件自己克隆草稿，并决定表单、编辑入口与弹窗。
- `size` 为按当前宽度归类的兼容 `s | m | l`，不是档位身份；窄断点会合并宽度，不能用它反推出原标称档位。响应式内容应使用 `width` / `height`，二者为真实正文区域 CSS 像素，而非网格列 / 行。
- `editing` 表示 Home 布局编辑态，正文 inert，此时不提供 `saveConfig`。
- `visible` 不是视口交叉观察保证；隐藏通常卸载，必须清理计时器 / 请求 / 订阅。
- 可选 `saveConfig(nextConfig): Promise<void>` 替换本实例完整配置。Home 克隆并校验，等待持久化成功后更新，失败 reject 且旧配置不变。仅在可写、非忙、非布局编辑的真实实例中提供；预览绝不提供。
- 编辑入口和草稿保存 / 取消 / 错误提示是具体组件自己的能力，不能依赖通用外壳按钮。没有配置需求的组件不必实现编辑器。
- `Settings` 定义字段已废弃，仅为旧类型检查保留；Home 不自动渲染它。已有扩展需将原表单接入自己的 Content，并通过 `saveConfig` 保存。`WidgetSettingsProps.onConfigChange` 可作为扩展内部草稿表单约定，但不再代表 Home 管理的设置面。

内置便笺 / 时钟 / 快捷 / 工作足迹显式选用内部 `WidgetConfigEditor` 帮手；该帮手不是公共运行时出口，第三方不得 import Home 内部文件，应使用自己的代码与宿主 UI 控件。取消不调用保存；错误保留草稿；表单渲染失败禁止提交。

正文渲染异常只影响该卡；标题/图标也有相应降级边界。错误边界不是代码权限隔离。

## 5. 组件声明的有限网格尺寸与配置限制

**新实例使用组件的 `sizing.default`，宿主不提供任何用户改尺寸能力。** `sizing.supported` 与旧 `defaults` 保留为兼容元数据，不再产生可切换尺寸、尺寸手柄、下拉或键盘改尺寸入口。宽 `w` 是 12 列标称网格列数，高 `h` 是网格行数，不是正文像素；已保存矩形不因默认值或声明变化而重置。API v1 与持久化格式不因此改版。

新定义使用可选的 `sizing` 对象：

```ts
sizing: {
  default: { w: 4, h: 6 },
  supported: [{ w: 4, h: 6 }, { w: 7, h: 9 }],
}
```

- 每个组合只含 `w/h`：`w` 为整数 `1..12`，`h` 为整数 `3..30`。`supported` 包含 1..16 个互不重复的组合，`default` 必须与其中一项的 `w` 和 `h` 都相等，不按对象引用匹配；非法值、重复组合或额外字段拒绝。
- **推荐档位（不是硬校验）**：宽度取 `4 / 8 / 12`，高度取 `4 / 6 / 8 / 10`。画板列数是 4 的整数倍，所以 4 列宽的任意组合都能铺满整行；宽度取 5 / 7 这类值会在同行留下永远填不满的残列（0.26.0 已把全部内置组件迁到该档位）。注册表仍接受上一条的完整合法范围，第三方历史声明不会因档位约定被拒绝或改写。
- 新实例与库拖入草稿采用 `default`；类型注册本身不创建实例。`supported` 沿用原有校验与兼容语义，但不是用户可选项；默认尺寸及历史保存尺寸仍需真实内容适配，不能把几何合法等同于内容可用。
- 注册表独立克隆尺寸声明，并深度冻结发布的 `sizing`、`default`、`supported` 及其中每个尺寸对象；调用方之后修改原对象或数组不能改变已注册定义。
- `sizing` 与已废弃的 `defaults` **不得同时提供**，即使旧字段只用于 min/max 也不允许。
- 仅为兼容 0.17 字符串声明，解析器仍接受任意合法 ASCII `WxH`（如 `'7x9'`），宽高边界同上；这不是新代码的推荐写法，也不构成向用户展示的统一目录。

投影由宿主完成，高度保持不变，适用于所有合法标称宽度：

| 断点 | 实际宽度 |
|---|---|
| 12 列 | `w` |
| 6 列 | `w <= 4 ? min(w, 3) : min(w, 6)` |
| 2 列 | `min(w, 2)` |

断点映射仍用于新实例默认矩形与缺失断点的投影；已有断点坐标优先，不把 `supported` 呈现为用户尺寸目录。

### 编辑态只移动、删除与整理

所有用户改尺寸交互均已取消，包括固定单组合或持有不同旧保存尺寸的实例；没有尺寸手柄、尺寸预览事务或显式转换入口。移动把手的方向键仍用于逐格移动，Delete / Backspace 立即删除，二者都不承担尺寸切换。React Grid Layout 的 resize 保持关闭。

布局与留白由宿主负责，扩展不 import 或重写碰撞 / 拖拽算法。用户显式整理只改变位置，保留每张卡宽高；普通移动仍允许留白，不自动整理。0.18 尺寸手柄方案及其验收仅属历史，不是现行契约或本版验收。

### 旧 `defaults` 兼容

旧 API v1 定义仍可提供 `defaults`，未提供的字段先沿用旧值：

```ts
{ size: 'm', height: 4, minWidth: 3, maxWidth: 12, minHeight: 3, maxHeight: 30 }
```

旧字段先按原规则校验：宽度 min/max 是整数 `3..12`，高度及其 min/max 是整数 `3..30`；最小值不得大于最大值，默认高度必须在高度范围内，`s/m/l` 对应标称宽 `4/8/12` 并必须在宽度范围内。通过后，直接用该宽桶和**真实默认 height**形成唯一支持组合，不向上取整、不截到 12。例如旧 `{ size: 's', height: 5 }` 对应 `{ w: 4, h: 5 }`，旧高度 7 或 30 原样保留；两种尺寸字段都省略时对应 `{ w: 8, h: 4 }`。

旧 `defaults` 及 min/max 仅保留兼容输入与元数据语义，**不提供用户改尺寸权限**，也不能生成额外用户选项。旧式定义仍按上述规则推导新建所用默认矩形。注册表返回的 `RegisteredWidgetDefinition.defaults` 是宿主从有效尺寸声明派生并冻结的兼容值，不是旧输入原样回传；新扩展应读取 / 声明 `sizing`，而不是把兼容 min/max 当成缩放权限。

### 历史布局保留

已有合法保存矩形继续按原几何边界接受，包括宽 1/2、不在组件声明组合中的宽高及高至 30 行的旧记录；不会因为类型升级、组合变化或默认值兼容而静默夹紧、改写或移动。进入编辑、移动及显式整理不转换尺寸，也不再提供将旧尺寸转换为声明组合的用户入口；不会自动 reset 或 rearrange。

持久化仍使用各断点的 `{ x, y, w, h }`，不新增尺寸身份字段或文档格式；只修改当前断点，保留其他断点、历史隐藏及缺失类型的记录。缺失断点只做独立投影，浏览断点或组件库不写布局。只有旧 order/size、所有断点均无坐标的内置实例继续使用历史默认宽高与用户 size 覆盖，不被新默认组合重新解释；新实例则在当前断点先物化默认矩形。配置迁移不得借机修改几何。

`defaultConfig()` 每次必须同步返回 JSON；即使扩展重复返回同一对象，Home 也会独立克隆。
`validateConfig(config)` 同步返回 `true` / `undefined` 表示接受，`false` 或非空字符串表示拒绝；
抛错也拒绝。诊断字符串用于说明原因，不保证直接显示在设置 UI。验证器不得靠修改参数实现规范化。

每份配置限制为 **JSON 序列化后 UTF-8 不超过 8 KiB、深度不超过 8、节点不超过 4,096、
键长不超过 256**。允许递归 JSON，包括数组、有限数字和 null；不允许 undefined、函数、
Promise、BigInt、非有限数字、循环引用、稀疏数组、getter、自定义对象原型、symbol 或
`__proto__` / `constructor` / `prototype` 键。实例 id 最长 120 字符。
整个桌面最多 64 实例，工作台写入还受总文档/请求体大小限制；单份配置合规不代表无限实例可保存。

## 6. 同步配置迁移与失败恢复

升级配置格式时提高 `configVersion`，保留稳定 `typeId`，并提供：

```ts
migrateConfig(config, fromVersion, toVersion) {
  // 根据已支持的历史版本显式迁移；这是一次到目标版本的同步调用。
  if (fromVersion === 1 && toVersion === 2) {
    return { ...readV1(config), extra: false }
  }
  throw new Error('Unsupported config migration')
}
```

`readV1` 是扩展自行实现的旧格式检查；不要把示例中的名字当 SDK 函数。
迁移接收隔离的旧配置，返回完整目标配置；输出还要通过 JSON 限制与 `validateConfig`。
API v1 不支持异步迁移、网络补全或 Promise 返回。旧记录缺迁移函数、迁移抛错、输出非法，
或记录版本新于安装版本时，Home 保留原始实例/配置而不是静默重置默认值。
渲染侧显示该实例不可用/配置错误状态，不把坏记录传给正常正文；重装兼容版本或修复迁移后再恢复。

v2 状态文档升级时，已有内置卡及旧布局引用的 id（包括隐藏、size 和各断点位置）迁移为实例；
旧第三方 id 对应 `legacy:<原 slot id>`。迁移不以扩展此刻是否安装为准。

## 7. 旧 `home.widget` 兼容与安全边界

旧 list/root slot 仍可注册，原组件仍只收到 `{ size: 's' | 'm' | 'l' }`。
Home 内部把它适配为目录中的类型；**新安装的 slot 贡献不会自动铺到桌面**，由用户添加。
旧布局引用的实例按上一节保留。新代码请用 `homeWidgets`，不要自行注册 `legacy:` 类型。

小组件是可信插件代码，与宿主处于同一浏览器运行环境，**不是安全沙箱**：
JSON 校验、错误边界和来源标签不能限制恶意代码的 DOM、网络或其他可用宿主能力。
只安装可信来源；不要把令牌、密码、实时缓存或大量业务数据塞进实例配置。
持久化业务数据/网络代理由扩展自己的宿主服务管理，必要权限仍按宿主机制声明。

## 8. 本地安装与验证

Home `0.14.0` 的本地开发包不等于已发布 npm 版本。在 Home 仓库根构建并打包，
再安装到你自己的隔离验证 home（替换命令中的占位符）：

```sh
pnpm run build
pnpm pack
DSH_HOME=<isolated-home> dsh plugin --profile web add ./vlln-dsh-home-0.14.0.tgz
```

独立示例包的构建/安装命令见[计数器说明](<../examples/widget-counter/README.md#install-locally>)。
不要复用日常 GUI 的共享 home 来做启停、故障与迁移测试；安装后刷新**该隔离实例**的浏览器。
涉及 Node 半边产物更新时重启对应隔离进程；不要启动另一个服务器来冒充已打开页面更新。

交付前至少实际验证：缺 Home 时正常启动、类型出现但无自动实例、添加两次互不影响、
组件自有编辑保存/取消、写盘失败不丢原配置、独立确认删除、扩展停用占位及重启恢复、
迁移成功/失败、渲染抛错只坏一张、卸载后定时器/订阅清零，以及 zh/en、浅深主题和窄屏。
检查实际 tarball 的入口、类型声明、locale 与图标；单测通过或页面能打开不替代这些真实链路。
