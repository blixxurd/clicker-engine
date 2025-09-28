import { describe, it, expect } from "vitest";
import { Game, tick, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry } from "../../src";

describe("Tick determinism (no-op)", () => {
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

  it("Game.step uses tick with registries and preserves state when no generators", () => {
    const s1: GameState = { resources: [], generators: [], inventory: [], upgrades: [], version: 1 } as const;
    const registries = {
      resources: createInMemoryResourceRegistry([]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const game = new Game(s1, registries);
    game.step(1);
    expect(game.accessor.getState()).toEqual(s1);
  });
});


