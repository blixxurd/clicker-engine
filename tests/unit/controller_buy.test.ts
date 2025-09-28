import { describe, it, expect } from "vitest";
import {
  Game,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  type ResourceId,
  type GeneratorId,
  type Quantity,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;

describe("Game.buyGenerators", () => {
  it("deducts currency and increases owned, emitting events", () => {
    const ore = res("ore");
    const miner = gen("miner");

    const registries = {
      resources: createInMemoryResourceRegistry([{ id: ore }]),
      generators: createInMemoryGeneratorRegistry([{ id: miner, produces: [], pricing: { costResourceId: ore, baseCost: 25, growth: 1.1 } }]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };

    const s1: GameState = {
      version: 1,
      resources: [{ id: ore, amount: q(100) }],
      generators: [{ id: miner, owned: 0 }],
      inventory: [],
      upgrades: [],
    };

    const game = new Game(s1, registries);
    const events = game.buyGenerators({ generatorId: miner, mode: "1" });

    expect(game.accessor.getState().generators[0]!.owned).toBe(1);
    expect((game.accessor.getState().resources[0]!.amount as unknown as number)).toBeCloseTo(75, 9);
    expect(events.find((e) => e.type === "generatorPurchase")).toBeTruthy();
  });
});
