import { describe, it, expect } from "vitest";
import {
  type GameState,
  type ResourceDefinition,
  type GeneratorDefinition,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  TickService,
  type GeneratorId,
  type ItemId,
  type RatePerSecond,
} from "../../src";

const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const item = (s: string): ItemId => s as unknown as ItemId;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("generator item outputs", () => {
  it("adds whole items based on rate * owned * dt", () => {
    const miner = gen("miner");
    const shard = item("shard");

    const resources: ResourceDefinition[] = [];
    const generators: GeneratorDefinition[] = [
      { id: miner, produces: [{ kind: "item", itemId: shard, rate: rps(0.6) }] },
    ];

    const registries = {
      resources: createInMemoryResourceRegistry(resources),
      generators: createInMemoryGeneratorRegistry(generators),
      items: createInMemoryItemRegistry([{ id: shard, kind: "material" }]),
      upgrades: createInMemoryUpgradeRegistry([]),
    } as const;

    const s1: GameState = {
      version: 1,
      resources: [],
      generators: [{ id: miner, owned: 2 }],
      inventory: [],
      upgrades: [],
    };

    const s2 = TickService.tick(s1, 5, registries);
    // rate 0.6 * owned 2 * dt 5 = 6 → 6 items
    const total = s2.inventory.reduce((acc, e) => acc + (e.id === shard ? e.count : 0), 0);
    expect(total).toBe(6);
  });
});
