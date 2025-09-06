import { describe, it, expect } from "vitest";
import {
  type GameState,
  type ResourceDefinition,
  type GeneratorDefinition,
  type UpgradeDefinition,
  type ResourceId,
  type GeneratorId,
  type UpgradeId,
  type Quantity,
  type RatePerSecond,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryUpgradeRegistry,
  tick,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const up = (s: string): UpgradeId => s as unknown as UpgradeId;
const q = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

describe("upgrades modifier composition", () => {
  it("applies generator add → mult then resource add → mult", () => {
    const ore = res("ore");
    const miner = gen("miner");

    const resources: ResourceDefinition[] = [{ id: ore }];
    const generators: GeneratorDefinition[] = [
      { id: miner, produces: [{ kind: "resource", resourceId: ore, rate: rps(2) }] },
    ];

    // Composition: ((base + gAdd) * gMult) * owned → then + rAdd, * rMult
    const upgrades: UpgradeDefinition[] = [
      { id: up("U1"), modifiers: [{ type: "add", scope: { kind: "generator", id: miner }, value: rps(1) }] }, // gAdd +1
      { id: up("U2"), modifiers: [{ type: "mult", scope: { kind: "generator", id: miner }, value: 2 }] },     // gMult x2
      { id: up("U3"), modifiers: [{ type: "add", scope: { kind: "resource", id: ore }, value: rps(3) }] },    // rAdd +3
      { id: up("U4"), modifiers: [{ type: "mult", scope: { kind: "resource", id: ore }, value: 3 }] },         // rMult x3
    ];

    const registries = {
      resources: createInMemoryResourceRegistry(resources),
      generators: createInMemoryGeneratorRegistry(generators),
      items: { get: () => undefined },
      upgrades: createInMemoryUpgradeRegistry(upgrades),
    } as const;

    const s1: GameState = {
      version: 1,
      resources: [{ id: ore, amount: q(0) }],
      generators: [{ id: miner, owned: 2 }],
      inventory: [],
      upgrades: [
        { id: up("U1"), level: 1 },
        { id: up("U2"), level: 1 },
        { id: up("U3"), level: 1 },
        { id: up("U4"), level: 1 },
      ],
    };

    // base=2, gAdd=1 → 3, gMult=2 → 6 per unit; owned=2 → 12; rAdd=3 → 15; rMult=3 → 45 per second
    const s2 = tick(s1, 2, registries);
    expect((s2.resources[0]!.amount as unknown as number)).toBe(90);
  });
});
