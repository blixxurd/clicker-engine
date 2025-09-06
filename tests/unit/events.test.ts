import { describe, it, expect } from "vitest";
import {
  type GameState,
  type ResourceDefinition,
  type GeneratorDefinition,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  tickWithEvents,
  type ResourceId,
  type GeneratorId,
  type Quantity,
  type RatePerSecond,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("events", () => {
  it("emits lifecycle and resourceDelta events for produced resources", () => {
    const ore = res("ore");
    const miner = gen("miner");

    const resources: ResourceDefinition[] = [{ id: ore }];
    const generators: GeneratorDefinition[] = [
      { id: miner, produces: [{ kind: "resource", resourceId: ore, rate: rps(2) }] },
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
      generators: [{ id: miner, owned: 3 }],
      inventory: [],
      upgrades: [],
    };

    const { state: s2, events } = tickWithEvents(s1, 4, registries);
    expect((s2.resources[0]!.amount as unknown as number)).toBe(24);
    expect(events.length).toBe(3);
    expect(events[0]).toMatchObject({ type: "tickStart", dtSeconds: 4 });
    expect(events[1]).toMatchObject({ type: "resourceDelta", resourceId: ore, delta: 24 });
    expect(events[2]).toMatchObject({ type: "tickEnd", dtSeconds: 4 });
  });
});
