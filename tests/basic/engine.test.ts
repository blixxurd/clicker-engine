import { describe, it, expect } from "vitest";
import { Engine, tick, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry } from "../../src";

describe("Engine determinism (no-op)", () => {
  it("keeps state reference when no generators and dt=0", () => {
    const s1: GameState = { resources: [], generators: [], inventory: [], upgrades: [], version: 1 } as const;
    const registries = {
      resources: createInMemoryResourceRegistry([]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const s2 = tick(s1, 0, registries);
    expect(s2).toBe(s1);
  });

  it("Engine.step uses tick with registries and preserves state when no generators", () => {
    const s1: GameState = { resources: [], generators: [], inventory: [], upgrades: [], version: 1 } as const;
    const registries = {
      resources: createInMemoryResourceRegistry([]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const engine = new Engine(s1, registries);
    engine.step(1);
    expect(engine.state).toEqual(s1);
  });
});


