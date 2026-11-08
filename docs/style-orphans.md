# styles.ts 的孤儿规则候选（已修正）

统计口径：抓 `styles.ts` 里的 `.dsh-*` 选择器，减去**消费者**中的出现——消费者包括
`src/client/**/*.ts` 与 `*.tsx`，但**排除** `*-styles.ts` / `styles.ts` 自身（否则定义即被算作使用）
与 `src/client/ui/`（那一层只吃 Tailwind 类）。

> 第一版清单是 62 个，因为只扫了 `*.tsx`：`debris-burst.ts`、`store.ts` 这类 `.ts` 消费者被漏掉，
> 于是把仍在用的类（如 `dsh-debris-*`）算成了孤儿。修正后是 **35 个**。

共 116 个类，其中 35 个找不到消费者。

**仍是候选，不是判决**：类名可能运行时拼接，删除前按组核对，删完跑四项验证。

| 前缀组 | 个数 | 类名 |
|---|---|---|
| `dsh-tray-*` | 8 | `dsh-tray`, `dsh-tray-glyph`, `dsh-tray-head`, `dsh-tray-item`, `dsh-tray-list`, `dsh-tray-name` … |
| `dsh-manager-*` | 4 | `dsh-manager-actions`, `dsh-manager-description`, `dsh-manager-heading`, `dsh-manager-info` |
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
