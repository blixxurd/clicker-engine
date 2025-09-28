import type { GeneratorId, ResourceId, UpgradeId, RatePerSecond } from "../types/core";

/** Scope to which an upgrade modifier applies. */
export type ModifierScope =
  | { readonly kind: "generator"; readonly id: GeneratorId }
  | { readonly kind: "resource"; readonly id: ResourceId };

/** Upgrade modifier affecting rates additively or multiplicatively. */
export type Modifier =
  | { readonly type: "add"; readonly scope: ModifierScope; readonly value: RatePerSecond }
  | { readonly type: "mult"; readonly scope: ModifierScope; readonly value: number };

/** Upgrade definition (static). */
export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly modifiers: ReadonlyArray<Modifier>;
}

/** Owned upgrade state (dynamic). */
export interface UpgradeState {
  readonly id: UpgradeId;
  /** Integer level (times purchased) */
  readonly level: number;
}
