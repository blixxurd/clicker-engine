import { describe, it, expect } from "vitest";
import { inventory, type InventoryEntry, type ItemDefinition, createInMemoryItemRegistry, type ItemId } from "../../src";

const item = (id: string, kind: ItemDefinition["kind"], stackLimit?: number): ItemDefinition => {
  const base = { id: id as unknown as ItemId, kind } as const;
  return stackLimit === undefined ? (base as unknown as ItemDefinition) : ({ ...base, stackLimit } as ItemDefinition);
};

describe("inventory", () => {
  it("adds items filling existing stacks then creating new ones with limit", () => {
    const potion = item("potion", "consumable", 3);
    const reg = createInMemoryItemRegistry([potion]);
    const inv: InventoryEntry[] = [
      { id: potion.id, count: 2 },
      { id: potion.id, count: 3 },
    ];
    const out = inventory.add(inv, potion.id, 4, reg);
    // Expected: first stack fills to 3 (used 1), remaining 3 -> adds one full stack of 3
    expect(out).toEqual([
      { id: potion.id, count: 3 },
      { id: potion.id, count: 3 },
      { id: potion.id, count: 3 },
    ]);
  });

  it("consumes items across stacks", () => {
    const ore = item("ore", "material");
    const inv: InventoryEntry[] = [
      { id: ore.id, count: 5 },
      { id: ore.id, count: 2 },
    ];
    const out = inventory.consume(inv, ore.id, 6);
    expect(out).toEqual([{ id: ore.id, count: 1 }]);
  });
});
