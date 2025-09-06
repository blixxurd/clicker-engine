import { describe, it, expect, vi } from "vitest";
import {
  Engine,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  type ResourceId,
  type GeneratorId,
  type Quantity,
  type GeneratorDefinition,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;

describe("EventBus", () => {
  it("receives published events from Engine", () => {
    const ore = res("ore");
    const miner = gen("miner");

    const registries = {
      resources: createInMemoryResourceRegistry([{ id: ore }]),
      generators: createInMemoryGeneratorRegistry([{ id: miner, produces: [{ resourceId: ore, rate: 1 }] as unknown as GeneratorDefinition["produces"], pricing: { costResourceId: ore, baseCost: 25, growth: 1 } }]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };

    const s1: GameState = { version: 1, resources: [{ id: ore, amount: q(100) }], generators: [{ id: miner, owned: 0 }], inventory: [], upgrades: [] };
    const engine = new Engine(s1, registries);

    const spyDelta = vi.fn();
    const spyStart = vi.fn();
    engine.events.on("resourceDelta", (e) => spyDelta(e));
    engine.events.on("tickStart", (e) => spyStart(e));

    engine.buyGenerators({ generatorId: miner, mode: "1" });
    engine.stepWithEvents(5);

    expect(spyStart).toHaveBeenCalled();
    expect(spyDelta).toHaveBeenCalled();
  });
});
