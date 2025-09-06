import type { ItemId } from "../types/core";

export type ItemKind = "consumable" | "equip" | "quest" | "material";

/** Item definition (static metadata). */
export interface ItemDefinition {
  readonly id: ItemId;
  readonly kind: ItemKind;
  /** Maximum stack size for this item. Use Number.POSITIVE_INFINITY for unbounded. */
  readonly stackLimit?: number;
}

/** Inventory entry (dynamic state). */
export interface InventoryEntry {
  readonly id: ItemId;
  readonly count: number;
}
