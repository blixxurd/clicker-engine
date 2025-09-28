import type { ItemId } from "../types/core";
import type { StateAccessor } from "./StateAccessor";
import type { InventoryEntry } from "../model/item";
import type { Registries, ItemRegistry } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import { BaseSubsystem } from "./BaseSubsystem";

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
    const nextInv = InventoryManager.addPure(curr.inventory, itemId, count, this.registries.items);
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
    const nextInv = InventoryManager.consumePure(curr.inventory, itemId, count);
    const actuallyConsumed = curr.inventory.reduce((acc, e, i) => acc + (e.id === itemId ? e.count - (nextInv[i]?.count ?? 0) : 0), 0);
    this.state.setState({ ...curr, inventory: nextInv } as typeof curr);
    if (actuallyConsumed > 0) {
      return [{ type: "inventoryConsumed", itemId, count: actuallyConsumed } as EngineEvent];
    }
    return [];
  }

  /** Get the total count of a specific item across all stacks. */
  public count(itemId: ItemId): number {
    return InventoryManager.countPure(this.state.getState().inventory, itemId);
  }

  // Static pure variants used by services and other pure helpers
  /** Pure count computation across inventory stacks. */
  public static countPure(inventory: ReadonlyArray<InventoryEntry>, id: ItemId): number {
    let total = 0;
    for (const e of inventory) if (e.id === id) total += e.count;
    return total;
  }

  /**
   * Pure addition that respects stack limits; returns a new inventory array.
   * @param inventory - Current inventory snapshot.
   * @param id - Item id to add.
   * @param amount - Number of items to add.
   * @param itemRegistry - Item registry to resolve stack limits.
   */
  public static addPure(
    inventory: ReadonlyArray<InventoryEntry>,
    id: ItemId,
    amount: number,
    itemRegistry: ItemRegistry,
  ): ReadonlyArray<InventoryEntry> {
    if (amount <= 0) return inventory;
    const def = itemRegistry.get(id);
    const limit = def?.stackLimit ?? Number.POSITIVE_INFINITY;

    const result: InventoryEntry[] = inventory.map((e) => ({ ...e }));

    // Fill existing stacks first
    let remaining = amount;
    for (let i = 0; i < result.length && remaining > 0; i++) {
      const e = result[i]!;
      if (e.id !== id) continue;
      const canAdd = Math.max(0, Math.min(remaining, limit - e.count));
      if (canAdd > 0) {
        result[i] = { ...e, count: e.count + canAdd };
        remaining -= canAdd;
      }
    }

    // Create new stacks as needed
    while (remaining > 0) {
      const toStack = Math.min(remaining, limit);
      result.push({ id, count: toStack });
      remaining -= toStack;
    }

    return result;
  }

  /**
   * Pure consumption that removes from stacks left-to-right; returns a new inventory array.
   * @param inventory - Current inventory snapshot.
   * @param id - Item id to consume.
   * @param amount - Number of items to remove.
   */
  public static consumePure(
    inventory: ReadonlyArray<InventoryEntry>,
    id: ItemId,
    amount: number,
  ): ReadonlyArray<InventoryEntry> {
    if (amount <= 0) return inventory;
    let remaining = amount;
    const result: InventoryEntry[] = [];
    for (const e of inventory) {
      if (e.id !== id) {
        result.push(e);
        continue;
      }
      if (remaining <= 0) {
        result.push(e);
        continue;
      }
      const take = Math.min(remaining, e.count);
      const left = e.count - take;
      remaining -= take;
      if (left > 0) result.push({ id: e.id, count: left });
    }
    return result;
  }
}


