import { describe, it, expect, vi } from "vitest";
import { Engine, type GameState, createInMemoryResourceRegistry, createInMemoryGeneratorRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, type ResourceId, type GeneratorId, type Quantity, type RatePerSecond, createFixedStepLoop } from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const q = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("fixed-step loop adapter", () => {
  it("steps engine at fixed intervals with backpressure cap", async () => {
    vi.useFakeTimers();
    const ore = res("ore");
    const miner = gen("miner");
    const registries = {
      resources: createInMemoryResourceRegistry([{ id: ore }]),
      generators: createInMemoryGeneratorRegistry([{ id: miner, produces: [{ kind: "resource", resourceId: ore, rate: rps(1) }] }]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };
    const s1: GameState = { version: 1, resources: [{ id: ore, amount: q(0) }], generators: [{ id: miner, owned: 1 }], inventory: [], upgrades: [] };
    const engine = new Engine(s1, registries);
    const loop = createFixedStepLoop(engine, { stepSeconds: 0.5, maxStepsPerTick: 3, intervalMs: 50 });

    loop.start();
    await vi.advanceTimersByTimeAsync(2000);
    loop.stop();
    vi.useRealTimers();

    expect((engine.state.resources[0]!.amount as unknown as number)).toBeGreaterThan(0);
  });
});
