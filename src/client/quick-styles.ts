/** Append to the home stylesheet; only host tokens, no independent light/dark theme. */
export const quickStyles = `
.dsh-quick-widget, .dsh-quick-widget-links, .dsh-quick-settings {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.dsh-quick-widget .dsh-quick-widget-action {
  width: 100%;
  min-width: 0;
  justify-content: space-between;
  gap: 8px;
  text-align: start;
  font: var(--dsw-font-s-14);
}
.dsh-quick-widget > .dsh-quick-widget-action:first-child { font-weight: 600; }
.dsh-quick-widget > .dsh-quick-widget-action:first-child .dsh-key {
  color: inherit;
  opacity: .72;
}
.dsh-quick-widget > .dsh-quick-widget-action:not(:first-child) { color: var(--dsw-alias-label-secondary); }
.dsh-quick-widget > .dsh-muted { overflow-wrap: anywhere; }
.dsh-quick-widget > .dsh-widget-own-editor {
  margin-top: 0;
  padding-top: 4px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.dsh-quick-widget :is(.dsh-quick-widget-action,.dsh-quick-widget-link) {
  transition: background-color 120ms ease-out, color 120ms ease-out;
}
.dsh-quick-widget-action > span:first-child, .dsh-quick-widget-link > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-quick-widget-kind {
  flex-shrink: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
}
.dsh-quick-widget-links {
  gap: 4px;
  padding-block-start: 4px;
  border-block-start: .5px solid var(--dsw-alias-border-l2);
}
/* A web destination is a native anchor, not a button pretending to navigate. */
.dsh-quick-widget-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-link);
  font: var(--dsw-font-s-14);
  text-decoration: none;
  box-sizing: border-box;
}
.dsh-quick-widget-link:is(:hover,:focus-visible):not([aria-disabled=true]) { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-quick-widget-link:active { background: var(--dsw-alias-interactive-bg-active); }
.dsh-quick-widget-link:focus-visible { outline: 2px solid var(--dsw-alias-link); outline-offset: 2px; }
.dsh-quick-widget-link[aria-disabled=true] { opacity: .5; cursor: default; }
.dsh-quick-widget-error {
  margin: 0;
  color: var(--dsw-alias-state-error-primary);
  font: var(--dsw-font-xs-13);
  overflow-wrap: anywhere;
}
.dsh-quick-settings { gap: 12px; }
.dsh-quick-settings-row {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 12px 0;
  border: 0;
  border-block-start: .5px solid var(--dsw-alias-border-l2);
}
.dsh-quick-settings-row legend {
  padding-inline-end: 8px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
}
.dsh-quick-settings-field {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
}
.dsh-quick-settings-field input { width: 100%; min-width: 0; box-sizing: border-box; }
.dsh-quick-settings-row > button, .dsh-quick-settings > button { justify-self: start; }
@media (prefers-reduced-motion: reduce) {
  .dsh-quick-widget :is(.dsh-quick-widget-action,.dsh-quick-widget-link) { transition: none; }
}
`
