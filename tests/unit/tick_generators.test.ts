import { describe, it, expect } from "vitest";
import {
  TickService,
  type GameState,
  type ResourceDefinition,
  type GeneratorDefinition,
  createInMemoryGeneratorRegistry,
  createInMemoryResourceRegistry,
  type ResourceId,
  type GeneratorId,
  type Quantity,
  type RatePerSecond,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
} from "../../src";

// Helper brand casters (for tests only)
const asResourceId = (v: string): ResourceId => v as unknown as ResourceId;
const asGeneratorId = (v: string): GeneratorId => v as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("tick with generators produces resources", () => {
  it("produces at owned * rate * dt", () => {
    const ore: ResourceId = asResourceId("ore");
    const miner: GeneratorId = asGeneratorId("miner");

    const resources: ResourceDefinition[] = [{ id: ore }];
    const generators: GeneratorDefinition[] = [
      { id: miner, produces: [{ kind: "resource", resourceId: ore, rate: rps(1) }] },
    ];

    const registries = {
      resources: createInMemoryResourceRegistry(resources),
      generators: createInMemoryGeneratorRegistry(generators),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };

    const s1: GameState = {
      version: 1,
      resources: [{ id: ore, amount: q(0) }],
      generators: [{ id: miner, owned: 2 }],
      inventory: [],
      upgrades: [],
    };

    const s2 = TickService.tick(s1, 5, registries);
    expect((s2.resources[0]!.amount as unknown as number)).toBe(10);
  });
});
