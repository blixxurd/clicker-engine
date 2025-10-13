import type { ItemId } from "../types/core";
import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import { BaseSubsystem } from "./BaseSubsystem";
import { InventoryService } from "../service/InventoryService";

/**
 * Coordinates inventory operations and writes next state via `StateAccessor`.
 *
 * Provides imperative APIs that return domain events; also exposes pure static helpers
 * to support deterministic testing and reuse.
 */
export class InventoryManager extends BaseSubsystem {
  public constructor(state: StateAccessor, registries: Registries) {
    super(state, registries);
  }

  /**
   * Add items into the inventory, respecting per-item stack limits.
   * @param itemId - Item definition id from the registry.
   * @param count - Number of items to add.
   * @returns Event capturing the addition, or empty if no-op.
   */
  public add(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const nextInv = InventoryService.add(curr.inventory, itemId, count, this.registries.items);
    this.state.setState({ ...curr, inventory: nextInv } as typeof curr);
    return [{ type: "inventoryAdded", itemId, count } as EngineEvent];
  }

  /**
   * Consume items from the inventory.
   * @param itemId - Item definition id from the registry.
   * @param count - Number of items to consume.
   * @returns Event capturing the actual consumed count (may be less if insufficient), or empty if none.
   */
  public consume(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const nextInv = InventoryService.consume(curr.inventory, itemId, count);
    const actuallyConsumed = curr.inventory.reduce((acc, e, i) => acc + (e.id === itemId ? e.count - (nextInv[i]?.count ?? 0) : 0), 0);
    this.state.setState({ ...curr, inventory: nextInv } as typeof curr);
    if (actuallyConsumed > 0) {
      return [{ type: "inventoryConsumed", itemId, count: actuallyConsumed } as EngineEvent];
    }
    return [];
  }

  /** Get the total count of a specific item across all stacks. */
  public count(itemId: ItemId): number {
    return InventoryService.count(this.state.getState().inventory, itemId);
  }
}

