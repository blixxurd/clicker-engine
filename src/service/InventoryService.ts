import type { InventoryEntry } from "../model/item";
import type { ItemId } from "../types/core";
import type { ItemRegistry } from "../repo/registries";

/** Stateless, pure inventory operations. */
export class InventoryService {
  public static count(inventory: ReadonlyArray<InventoryEntry>, id: ItemId): number {
    let total = 0;
    for (const e of inventory) if (e.id === id) total += e.count;
    return total;
  }

  public static add(
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

  public static consume(
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


