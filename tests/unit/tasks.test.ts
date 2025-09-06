import { describe, it, expect } from "vitest";
import {
  type GameState,
  type ResourceId,
  type TaskDefinition,
  type Quantity,
  type TaskId,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  createInMemoryTaskRegistry,
  evaluateTasks,
  claimTask,
} from "../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const tid = (s: string): TaskId => s as unknown as TaskId;
const q = (n: number): Quantity => n as unknown as Quantity;

describe("tasks", () => {
  it("unlocks when requirements met and claim grants rewards", () => {
    const cash = res("cash");
    const tasks: TaskDefinition[] = [
      {
        id: tid("t1"),
        requirements: [{ kind: "resourceAtLeast", resourceId: cash, amount: q(10) }],
        rewards: [
          { kind: "grantResource", resourceId: cash, amount: q(5) },
        ],
      },
    ];

    const registries = {
      resources: createInMemoryResourceRegistry([{ id: cash }]),
      generators: createInMemoryGeneratorRegistry([]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
      tasks: createInMemoryTaskRegistry(tasks),
    };

    const s1: GameState = { version: 1, resources: [{ id: cash, amount: q(10) }], generators: [], inventory: [], upgrades: [], tasks: [] };
    const eval1 = evaluateTasks(s1, registries);
    expect(eval1.events.find((e) => e.type === "taskUnlocked")).toBeTruthy();

    const s2 = eval1.state;
    const claim = claimTask(s2, tid("t1"), registries);
    expect(claim.events.find((e) => e.type === "taskClaimed")).toBeTruthy();
    expect((claim.state.resources[0]!.amount as unknown as number)).toBe(15);
  });
});
