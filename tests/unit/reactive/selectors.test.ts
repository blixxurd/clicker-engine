import { describe, it, expect } from "vitest";
import {
  select,
  type GameState,
  type ResourceId,
  type GeneratorId,
  type ItemId,
  type UpgradeId,
  type TaskId,
  type Quantity,
} from "../../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const gen = (s: string): GeneratorId => s as unknown as GeneratorId;
const item = (s: string): ItemId => s as unknown as ItemId;
const upg = (s: string): UpgradeId => s as unknown as UpgradeId;
const task = (s: string): TaskId => s as unknown as TaskId;
const q = (n: number): Quantity => n as unknown as Quantity;

describe("selectors", () => {
  describe("select.resource()", () => {
    it("extracts resource state by id", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100), capacity: q(500) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      const selector = select.resource("gold");
      const result = selector(state);

      expect(result).toEqual({ id: gold, amount: q(100), capacity: q(500) });
      expect(selector.key).toBe("resource:gold");
    });

    it("returns undefined for non-existent resource", () => {
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      const selector = select.resource("gold");
      expect(selector(state)).toBeUndefined();
    });

    it(".amount extracts just the amount (0 if not found)", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      expect(select.resource("gold").amount(state)).toBe(100);
      expect(select.resource("gold").amount.key).toBe("resource:gold:amount");

      // Returns 0 for non-existent
      expect(select.resource("missing").amount(state)).toBe(0);
    });

    it(".capacity extracts capacity (undefined if not set)", () => {
      const gold = res("gold");
      const gems = res("gems");
      const state: GameState = {
        version: 1,
        resources: [
          { id: gold, amount: q(100), capacity: q(500) },
          { id: gems, amount: q(50) },
        ],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      expect(select.resource("gold").capacity(state)).toBe(500);
      expect(select.resource("gems").capacity(state)).toBeUndefined();
    });
  });

  describe("select.generator()", () => {
    it("extracts generator state by id", () => {
      const miner = gen("miner");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [{ id: miner, owned: 5 }],
        inventory: [],
        upgrades: [],
      };

      const selector = select.generator("miner");
      expect(selector(state)).toEqual({ id: miner, owned: 5 });
      expect(selector.key).toBe("generator:miner");
    });

    it(".owned extracts owned count (0 if not found)", () => {
      const miner = gen("miner");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [{ id: miner, owned: 5 }],
        inventory: [],
        upgrades: [],
      };

      expect(select.generator("miner").owned(state)).toBe(5);
      expect(select.generator("missing").owned(state)).toBe(0);
    });
  });

  describe("select.inventory()", () => {
    it("extracts inventory entry by id", () => {
      const pickaxe = item("pickaxe");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [{ id: pickaxe, count: 3 }],
        upgrades: [],
      };

      const selector = select.inventory("pickaxe");
      expect(selector(state)).toEqual({ id: pickaxe, count: 3 });
      expect(selector.key).toBe("inventory:pickaxe");
    });

    it(".count extracts item count (0 if not found)", () => {
      const pickaxe = item("pickaxe");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [{ id: pickaxe, count: 3 }],
        upgrades: [],
      };

      expect(select.inventory("pickaxe").count(state)).toBe(3);
      expect(select.inventory("missing").count(state)).toBe(0);
    });
  });

  describe("select.upgrade()", () => {
    it("extracts upgrade state by id", () => {
      const boost = upg("boost");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [{ id: boost, level: 2 }],
      };

      const selector = select.upgrade("boost");
      expect(selector(state)).toEqual({ id: boost, level: 2 });
      expect(selector.key).toBe("upgrade:boost");
    });

    it(".level extracts upgrade level (0 if not found)", () => {
      const boost = upg("boost");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [{ id: boost, level: 2 }],
      };

      expect(select.upgrade("boost").level(state)).toBe(2);
      expect(select.upgrade("missing").level(state)).toBe(0);
    });
  });

  describe("select.task()", () => {
    it("extracts task instance by id", () => {
      const quest = task("quest1");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
        tasks: [{ id: quest, status: "active" }],
      };

      const selector = select.task("quest1");
      expect(selector(state)).toEqual({ id: quest, status: "active" });
      expect(selector.key).toBe("task:quest1");
    });

    it(".status extracts task status (undefined if not found)", () => {
      const quest = task("quest1");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
        tasks: [{ id: quest, status: "completed" }],
      };

      expect(select.task("quest1").status(state)).toBe("completed");
      expect(select.task("missing").status(state)).toBeUndefined();
    });

    it("handles missing tasks array", () => {
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      expect(select.task("quest1")(state)).toBeUndefined();
      expect(select.task("quest1").status(state)).toBeUndefined();
    });
  });

  describe("collection selectors", () => {
    it("select.resources() returns all resources", () => {
      const gold = res("gold");
      const gems = res("gems");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }, { id: gems, amount: q(50) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      const selector = select.resources();
      expect(selector(state)).toEqual(state.resources);
      expect(selector.key).toBe("resources:all");
    });

    it("select.generators() returns all generators", () => {
      const miner = gen("miner");
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [{ id: miner, owned: 5 }],
        inventory: [],
        upgrades: [],
      };

      const selector = select.generators();
      expect(selector(state)).toEqual(state.generators);
      expect(selector.key).toBe("generators:all");
    });

    it("select.tasks() returns empty array if tasks undefined", () => {
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      };

      const selector = select.tasks();
      expect(selector(state)).toEqual([]);
    });
  });
});
