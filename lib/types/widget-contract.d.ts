/** Public widget API v1. Import this module with `import type`; it has no runtime dependencies. */
import type { ComponentType } from 'react';
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
export type WidgetSize = 's' | 'm' | 'l';
export type WidgetTitle = string | (() => string);
/** Nominal shape on the 12-column grid: integer w 1..12 and h 3..30. */
export interface GridShape {
    readonly w: number;
    readonly h: number;
}
/** @deprecated String declarations remain readable for 0.17.x extensions; prefer GridShape. */
export type WidgetPreset = GridShape | `${number}x${number}`;
/** Each widget declares its own finite set of 1..16 shapes; there is no host-wide catalog.
 * The default must match one supported shape by w/h, not object identity. */
export interface WidgetSizing {
    readonly default: GridShape;
    readonly supported: readonly GridShape[];
}
/** Compatibility input only. Registered definitions always expose object shapes. */
export interface WidgetSizingInput {
    readonly default: WidgetPreset;
    readonly supported: readonly WidgetPreset[];
}
/** Durable instance identity is distinct from its registered type; many instances may share one type. */
export interface WidgetInstance<C extends JsonValue = JsonValue> {
    instanceId: string;
    typeId: string;
    configVersion: number;
    config: C;
}
/** @deprecated Legacy registration hints, validated for compatibility then mapped
 * to one fixed shape; the declared height is preserved without rounding. */
export interface WidgetDefaults {
    size: WidgetSize;
    /** Heights are grid rows, not pixels. */
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
}
export interface WidgetContentProps<C extends JsonValue = JsonValue> {
    instance: WidgetInstance<C>;
    config: C;
    size: WidgetSize;
    /** Actual rendered width and height in CSS pixels. */
    width: number;
    height: number;
    editing: boolean;
    visible: boolean;
    /** Present only in inert gallery previews. Use this data (null when absent), never live user data.
     * Suppress requests, timers, subscriptions, navigation and persistence while preview is present. */
    preview?: {
        data: JsonValue;
    };
    /** Optional durable config replacement. Content owns its editor and draft UX.
     * Absent in previews, layout-edit mode, read-only state, and while the host is busy.
     * Validates and waits for persistence; reject leaves the existing config unchanged. */
    saveConfig?(config: C): Promise<void>;
}
export interface WidgetSettingsProps<C extends JsonValue = JsonValue> extends WidgetContentProps<C> {
    /** Update only the host-owned settings draft; saving/canceling is the host's responsibility. */
    onConfigChange: (config: C) => void;
}
/** `false` or a nonempty string rejects config; true/undefined accepts it. Throwing also rejects it. */
export type WidgetConfigValidation = boolean | string | void;
export interface WidgetDefinition<C extends JsonValue = JsonValue> {
    /** Stable, namespaced identifier, e.g. `@acme/weather:forecast`; never a display label. */
    typeId: string;
    apiVersion: 1;
    title: WidgetTitle;
    description?: WidgetTitle;
    icon?: ComponentType<{
        size?: number;
    }>;
    /** @deprecated Gallery previews render Content with the preview signal instead. Ignored by Home. */
    Preview?: ComponentType;
    /** Optional synchronous, side-effect-free sample configuration and JSON data for the SAME Content.
     * Config defaults to defaultConfig(); data defaults to null. The host clones both, validates config,
     * and never persists preview instances. This is a trusted-plugin convention, not a sandbox. */
    preview?: {
        config?: () => C;
        data?: JsonValue;
    };
    /** Informational package/source label; not an authorization capability. */
    source?: string;
    /** Declare this widget's finite supported shapes. Do not combine with legacy defaults.
     * Legacy `"4x6"` declarations remain accepted, then normalized to GridShape objects. */
    sizing?: WidgetSizing | WidgetSizingInput;
    /** @deprecated Use sizing; legacy values are mapped to one fixed shape. */
    defaults?: Partial<WidgetDefaults>;
    configVersion: number;
    /** Must be synchronous. The registry clones and validates every returned value. */
    defaultConfig: () => C;
    validateConfig: (config: C) => WidgetConfigValidation;
    /** Synchronous, all-at-once migration to the current configVersion. Never mutates persisted input. */
    migrateConfig?: (config: JsonValue, fromVersion: number, toVersion: number) => C;
    Content: ComponentType<WidgetContentProps<C>>;
    /** @deprecated Not rendered by the shell. Content owns its editing UI and may reuse this component. */
    Settings?: ComponentType<WidgetSettingsProps<C>>;
}
export type RegisteredWidgetDefinition<C extends JsonValue = JsonValue> = Omit<WidgetDefinition<C>, 'defaults' | 'sizing'> & {
    readonly defaults: Readonly<WidgetDefaults>;
    readonly sizing: Readonly<WidgetSizing>;
    /** True when the plugin declared `sizing` itself rather than the deprecated legacy
     * `defaults`. Only a real declaration may re-project a saved width: a legacy
     * single-shape size is a compatibility hint, and old custom widths stay valid. */
    readonly declaredSizing: boolean;
};
/** Service consumed by independent client extensions. The caller owns the disposer through ctx.effect. */
export interface HomeWidgets {
    register<C extends JsonValue>(definition: WidgetDefinition<C>): () => void;
    get(typeId: string): RegisteredWidgetDefinition | undefined;
    getSnapshot(): readonly RegisteredWidgetDefinition[];
    subscribe(listener: () => void): () => void;
    createInstance(typeId: string, instanceId: string): WidgetInstance;
}
/** Type-only declaration: importing this contract never loads the home implementation or its stores. */
declare module '@deepseek-ai/cordis' {
    interface Context {
        homeWidgets: HomeWidgets;
    }
}
