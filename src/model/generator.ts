import type { GeneratorId, RatePerSecond, ResourceId, ItemId } from "../types/core";

/** Generator outputs (static, not saved in state). */
export type GeneratorOutput =
  | { readonly kind: "resource"; readonly resourceId: ResourceId; readonly rate: RatePerSecond }
  | { readonly kind: "item"; readonly itemId: ItemId; readonly rate: RatePerSecond };

/** Pricing parameters for buying generators. */
export interface GeneratorPricing {
  readonly costResourceId: ResourceId;
  readonly baseCost: number;
  readonly growth: number;
}

/** Generator definition (static). */
export interface GeneratorDefinition {
  readonly id: GeneratorId;
  readonly produces: ReadonlyArray<GeneratorOutput>;
  readonly pricing?: GeneratorPricing;
}

/** Owned generator state (dynamic). */
export interface GeneratorState {
  readonly id: GeneratorId;
  readonly owned: number;
}
