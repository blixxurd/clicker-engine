import { describe, it, expect } from "vitest";
import {
  Engine,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  type ResourceId,
  type UpgradeId,
  type Quantity,
  type ItemId,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const up = (s: string): UpgradeId => s as unknown as UpgradeId;
const item = (s: string): ItemId => s as unknown as ItemId;
const q = (n: number): Quantity => n as unknown as Quantity;

describe("controller ops events", () => {
  it("applyUpgrade deducts resource and emits events", () => {
    const cash = res("cash");
    const u1 = up("u1");
    const registries = {
      resources: createInMemoryResourceRegistry([{ id: cash }]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const s1: GameState = { version: 1, resources: [{ id: cash, amount: q(100) }], generators: [], inventory: [], upgrades: [] };
    const engine = new Engine(s1, registries);
    const events = engine.applyUpgrade({ upgradeId: u1, costResourceId: cash, cost: 30 });
    expect(engine.state.upgrades[0]!.level).toBe(1);
    expect((engine.state.resources[0]!.amount as unknown as number)).toBe(70);
    expect(events.find((e) => e.type === "upgradeApplied")).toBeTruthy();
  });

  it("inventory add/consume emit events", () => {
    const potion = item("potion");
    const registries = {
      resources: createInMemoryResourceRegistry([]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([{ id: potion, kind: "consumable", stackLimit: 3 }]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const s1: GameState = { version: 1, resources: [], generators: [], inventory: [], upgrades: [] };
    const engine = new Engine(s1, registries);
    const addEvents = engine.addItems(potion, 4);
    expect(addEvents.find((e) => e.type === "inventoryAdded")).toBeTruthy();
    const consumeEvents = engine.consumeItems(potion, 2);
    expect(consumeEvents.find((e) => e.type === "inventoryConsumed")).toBeTruthy();
  });
});
