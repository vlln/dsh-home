# Home widget counter example

A standalone browser plugin demonstrating the public `homeWidgets` service. Add it twice to Home to get independent counters. Each instance has its own label and initial value; its settings editor updates only the host-owned draft, so Home's Save/Cancel controls remain authoritative.

## Install locally

This example is intentionally private and is **not published**. Build/install the matching dsh-home implementation first. From this directory, install into your own isolated DSH verification home (replace `<isolated-home>` with your dedicated directory):

```sh
DSH_HOME=<isolated-home> dsh plugin --profile web add .
```

For the exact distributed artifact, create a tarball without network or scripts, then install the path printed by npm:

```sh
npm pack --offline --ignore-scripts --pack-destination <artifact-directory>
DSH_HOME=<isolated-home> dsh plugin --profile web add <artifact-directory>/vlln-dsh-home-example-counter-0.1.1.tgz
```

Refresh that isolated browser host, open Home → Edit → Add component, and add **Example counter** twice. Increment one counter: the other does not change. Open an instance's settings to edit its label and initial value. Cancel must discard drafts; Save commits them. To try a controlled render failure, enable the test-only checkbox in settings: only that card should show Home's error boundary.

## Public integration pattern

The client requires host-provided `react` only. It does not import Home source, store, API implementation, or another copy of React. Its manifest uses `dsh.client.external: ["react"]`; **manifest `inject` is for package rows, not the `homeWidgets` service**.

```js
apply(ctx) {
  ctx.inject(['homeWidgets', 'locale'], scoped => {
    scoped.effect(() => scoped.homeWidgets.register(definition))
  })
}
```

The outer plugin deliberately does **not** require `homeWidgets` and does **not** return the pending child fiber. Without Home installed, it stays harmlessly inactive instead of failing the entire browser bootstrap. On Home service removal, Cordis unloads the nested scope and unregisters the type; reinsertion automatically registers it again. Home owns durable instance records and chooses whether an absent type is shown as a placeholder.

The widget config uses version 2: `{ label: string, start: number, fail?: boolean }`. Its pure v1→v2 migration supplies a missing label and initial value without mutating persisted input. `Content` receives the durable `instance.instanceId` distinct from `typeId`; `Settings` receives `onConfigChange` for drafts. The example timer runs only while visible and not editing, and every timer has a React cleanup.

For TypeScript consumers, import only the public contract as types:

```ts
import type { WidgetDefinition, WidgetContentProps } from '@vlln/dsh-home/widgets'
```

No compilation is required for this directly authored JavaScript package. If you add a bundler, externalize `react` (and any other host modules you actually import) and keep the `window.__ModuleLoader__.load` wrapper.

## Development observability

`window.__homeExampleStats` exposes `mounts`, `unmounts`, `activeTimers`, and per-instance active mount counts. This deliberately development-only global remains readable after cleanup so a test can assert `activeTimers === 0` and all per-instance counts are zero. Stable DOM attributes are `data-home-example-instance` and `data-home-example-count`, keyed by durable instance id. No probe server or runtime control surface is added by this example.

## Compatibility

Public widget contract: Home API v1, config v2. The required Cordis/React service mechanics were exercised against installed DSH 0.2.1-rc.5 on 2026-11-04 in an isolated browser probe. This example's full Home UI acceptance is a separate integration check; packaging/syntax checks alone do not claim it passed. The manifest lower bound is a compatibility declaration, not a claim that every later DSH release was tested.

## Plugin management

Remove it from the isolated profile's Plugins page, or run:

```sh
DSH_HOME=<isolated-home> dsh plugin --profile web remove @vlln/dsh-home-example-counter
```

The package never writes instance records directly. Removing it unregisters the type; persisted instance retention and restoration belong to Home. Do not install examples into the main GUI merely to run tests.
