# Home widget counter example

A standalone browser plugin demonstrating the public `homeWidgets` service. Add it twice to Home to get independent counters. Each instance has its own label and initial value, plus a **Counter options / 计数器选项** button inside its content. The component owns its options dialog, draft, Save/Cancel controls, and save-error feedback; Home does not add a settings button to the widget shell.

## Install locally

This example is intentionally private and is **not published**. Install a matching dsh-home implementation that supports `Content.saveConfig` first. From this directory, install into your own isolated DSH verification home (replace `<isolated-home>` with your dedicated directory):

```sh
DSH_HOME=<isolated-home> dsh plugin --profile web add .
```

For the exact distributed artifact, create a tarball without network or scripts, then install the path printed by npm:

```sh
npm pack --offline --ignore-scripts --pack-destination <artifact-directory>
DSH_HOME=<isolated-home> dsh plugin --profile web add <artifact-directory>/vlln-dsh-home-example-counter-0.1.3.tgz
```

Refresh that isolated browser host, open Home → Edit layout → Widgets, and drag **Example counter** onto the desktop twice. Finish editing the layout, then increment one counter: the other does not change. Click **Counter options** inside a counter to edit its label and initial value. Cancel, the close button, Escape, and clicking outside discard its draft. Save waits for Home's persistence before closing; a rejected save keeps the draft open with an error so you can retry or cancel. The dialog cannot be dismissed while saving.

## Public integration pattern

The client consumes host-provided `react` and the official `Button`, `Input`, and `Modal` components from `@deepseek-ai/dsh-client-ui-primitives`. Its manifest declares both modules in `dsh.client.external`; it does not bundle a second React or create its own host dialog. It never imports Home source, store, API implementation, or private editing helpers. **Manifest `inject` is for package rows, not the `homeWidgets` service**.

```js
apply(ctx) {
  ctx.inject(['homeWidgets', 'locale'], scoped => {
    scoped.effect(() => scoped.homeWidgets.register(definition))
  })
}
```

The outer plugin deliberately does **not** require `homeWidgets` and does **not** return the pending child fiber. Without Home installed, it stays harmlessly inactive instead of failing the entire browser bootstrap. On Home service removal, Cordis unloads the nested scope and unregisters the type; reinsertion automatically registers it again. Home owns durable instance records and chooses whether an absent type is shown as a placeholder.

`Content` receives the durable `instance.instanceId` distinct from `typeId`. Its optional `saveConfig(config): Promise<void>` capability replaces that instance's durable configuration, validates it, and resolves only after persistence. A rejection leaves the existing configuration unchanged. Home supplies this capability only when writable, outside layout-edit mode and previews; it can also be absent while Home is busy. This example hides options during layout editing and previews, and disables its options button when the capability is absent. An already-open draft remains available if the capability temporarily disappears, with its fields and Save disabled until it returns. Preview rendering never starts timers or persists config.

The component's private `Fields` editor changes only its own draft. The registration contains `Content`, **not `Settings`**. Saving submits `{ label, start }` only. The widget config remains version 2: `{ label: string, start: number, fail?: boolean }`; `start` must be a safe integer. Its pure v1→v2 migration supplies a missing label and initial value without mutating persisted input. The historical `fail` flag is accepted for backwards compatibility but is not exposed as a user option. A persisted `fail: true` displays a component-local error instead of throwing, leaving Counter options available; a successful save removes the flag and recovers the widget.

The example timer runs only while visible, outside layout editing and previews, and every timer has a React cleanup. Opening the component's options does not change this timer rule. Incrementing remains instance-local; a committed change to the initial value resets that instance's count, whereas draft edits and cancellation do not.

For TypeScript consumers, import only the public contract as types:

```ts
import type { WidgetDefinition, WidgetContentProps } from '@vlln/dsh-home/widgets'
```

No compilation is required for this directly authored JavaScript package. If you add a bundler, externalize `react` and `@deepseek-ai/dsh-client-ui-primitives` (plus any other host modules you actually import), and keep the `window.__ModuleLoader__.load` wrapper.

## Development observability

`window.__homeExampleStats` exposes `mounts`, `unmounts`, `activeTimers`, and per-instance active mount counts. This deliberately development-only global remains readable after cleanup so a test can assert `activeTimers === 0` and all per-instance counts are zero. Stable DOM attributes are `data-home-example-instance` and `data-home-example-count`, keyed by durable instance id; the component-owned editor exposes `data-home-example-editor`. No probe server or runtime control surface is added by this example.

## Compatibility

Public widget contract: Home API v1 with optional `Content.saveConfig`, config v2. The Cordis/React service mechanics were exercised against installed DSH 0.2.1-rc.5 on 2026-11-04 in an isolated browser probe, before this component-owned editor was introduced. This editor requires the matching Home capability and host ui-primitives exports; its full Home UI acceptance is a separate integration check. Packaging/syntax checks alone do not claim it passed. The manifest lower bound is a compatibility declaration, not a claim that every later DSH release was tested.

## Plugin management

Remove it from the isolated profile's Plugins page, or run:

```sh
DSH_HOME=<isolated-home> dsh plugin --profile web remove @vlln/dsh-home-example-counter
```

The package never writes instance records directly. Removing it unregisters the type; persisted instance retention and restoration belong to Home. Do not install examples into the main GUI merely to run tests.
