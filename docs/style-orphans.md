# styles.ts 的孤儿规则候选

生成方式：抓 `styles.ts` 里所有 `.dsh-*` 选择器，减去 `src/client/*.tsx` 中出现的类名。
**这是候选，不是判决**：类名可能在运行时拼接（如 `dsh-${state}`），删除前必须按组核对、
删完跑 `check:assets` + `npm test` + 整页截图。

共 139 个类，其中 62 个在 tsx 里找不到。

| 前缀组 | 个数 | 类名 |
|---|---|---|
| `dsh-focus-*` | 13 | `dsh-focus`, `dsh-focus-actions`, `dsh-focus-empty`, `dsh-focus-empty-text`, `dsh-focus-eyebrow`, `dsh-focus-eyebrow-row` … |
| `dsh-active-*` | 10 | `dsh-active`, `dsh-active-band`, `dsh-active-band-empty`, `dsh-active-bar`, `dsh-active-bars`, `dsh-active-col` … |
| `dsh-tray-*` | 8 | `dsh-tray`, `dsh-tray-glyph`, `dsh-tray-head`, `dsh-tray-item`, `dsh-tray-list`, `dsh-tray-name` … |
| `dsh-manager-*` | 4 | `dsh-manager-actions`, `dsh-manager-description`, `dsh-manager-heading`, `dsh-manager-info` |
| `dsh-debris-*` | 3 | `dsh-debris`, `dsh-debris-halo`, `dsh-debris-particle` |
| `dsh-home-*` | 3 | `dsh-home-dot`, `dsh-home-grid`, `dsh-home-heading` |
| `dsh-w-*` | 3 | `dsh-w-extra`, `dsh-w-facts`, `dsh-w-skeleton` |
| `dsh-instance-*` | 2 | `dsh-instance-item`, `dsh-instance-list` |
| `dsh-quick-*` | 2 | `dsh-quick-button`, `dsh-quick-primary` |
| `dsh-row-*` | 2 | `dsh-row-arrow`, `dsh-row-live` |
| `dsh-drag-*` | 1 | `dsh-drag-surface` |
| `dsh-duo-*` | 1 | `dsh-duo` |
| `dsh-empty-*` | 1 | `dsh-empty-action` |
| `dsh-expand-*` | 1 | `dsh-expand` |
| `dsh-field-*` | 1 | `dsh-field` |
| `dsh-icon-*` | 1 | `dsh-icon-button` |
| `dsh-remove-*` | 1 | `dsh-remove-widget` |
| `dsh-session-*` | 1 | `dsh-session-reason` |
| `dsh-skeleton-*` | 1 | `dsh-skeleton` |
| `dsh-spin-*` | 1 | `dsh-spin` |
| `dsh-widget-*` | 1 | `dsh-widget-drag-cover` |
| `dsh-ws-*` | 1 | `dsh-ws-pill` |
