import { describe, it, expect } from "vitest";
import {
  type GameState,
  type ResourceDefinition,
  type GeneratorDefinition,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  serialize,
  parseWithOffline,
  type ResourceId,
  type GeneratorId,
  type Quantity,
  type RatePerSecond,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("offline progress", () => {
  it("applies dt based on savedAtMs", () => {
    const ore = res("ore");
    const miner = gen("miner");

    const resources: ResourceDefinition[] = [{ id: ore }];
    const generators: GeneratorDefinition[] = [
      { id: miner, produces: [{ kind: "resource", resourceId: ore, rate: rps(1) }] },
    ];

    const registries = {
      resources: createInMemoryResourceRegistry(resources),
      generators: createInMemoryGeneratorRegistry(generators),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    } as const;

    const s1: GameState = {
      version: 1,
      resources: [{ id: ore, amount: q(0) }],
      generators: [{ id: miner, owned: 2 }],
      inventory: [],
      upgrades: [],
    };

    const json = serialize(s1);
    const savedAt = Date.now() - 5000; // 5s ago
    const obj = JSON.parse(json) as { savedAtMs?: number };
    obj.savedAtMs = savedAt;
    const withTime = JSON.stringify(obj);
    const s2 = parseWithOffline(withTime, Date.now(), registries);
    // 2 owned * 1 rps * 5 seconds = +10
    expect((s2.resources[0]!.amount as unknown as number)).toBe(10);
  });
});
