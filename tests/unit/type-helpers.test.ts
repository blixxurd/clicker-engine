import { describe, it, expect } from "vitest";
import {
  resourceId,
  generatorId,
  itemId,
  upgradeId,
  taskId,
  qty,
  rps,
  type ResourceId,
  type GeneratorId,
  type ItemId,
  type UpgradeId,
  type TaskId,
  type Quantity,
  type RatePerSecond,
} from "../../src";

describe("type helpers", () => {
  describe("resourceId", () => {
    it("creates branded ResourceId from string", () => {
      const gold = resourceId("gold");
      expect(gold).toBe("gold");
      // Type assertion compiles - proves typing works
      const _typed: ResourceId = gold;
      expect(_typed).toBe("gold");
    });
  });

  describe("generatorId", () => {
    it("creates branded GeneratorId from string", () => {
      const miner = generatorId("miner");
      expect(miner).toBe("miner");
      const _typed: GeneratorId = miner;
      expect(_typed).toBe("miner");
    });
  });

  describe("itemId", () => {
    it("creates branded ItemId from string", () => {
      const potion = itemId("potion");
      expect(potion).toBe("potion");
      const _typed: ItemId = potion;
      expect(_typed).toBe("potion");
    });
  });

  describe("upgradeId", () => {
    it("creates branded UpgradeId from string", () => {
      const boost = upgradeId("boost");
      expect(boost).toBe("boost");
      const _typed: UpgradeId = boost;
      expect(_typed).toBe("boost");
    });
  });

  describe("taskId", () => {
    it("creates branded TaskId from string", () => {
      const quest = taskId("quest");
      expect(quest).toBe("quest");
      const _typed: TaskId = quest;
      expect(_typed).toBe("quest");
    });
  });

  describe("qty", () => {
    it("creates branded Quantity from number", () => {
      const amount = qty(100);
      expect(amount).toBe(100);
      const _typed: Quantity = amount;
      expect(_typed).toBe(100);
    });

    it("handles zero", () => {
      const zero = qty(0);
      expect(zero).toBe(0);
    });

    it("handles negative numbers", () => {
      const neg = qty(-50);
      expect(neg).toBe(-50);
    });

    it("handles decimals", () => {
      const decimal = qty(1.5);
      expect(decimal).toBe(1.5);
    });
  });

  describe("rps", () => {
    it("creates branded RatePerSecond from number", () => {
      const rate = rps(1.5);
      expect(rate).toBe(1.5);
      const _typed: RatePerSecond = rate;
      expect(_typed).toBe(1.5);
    });

    it("handles zero rate", () => {
      const zero = rps(0);
      expect(zero).toBe(0);
    });
  });
});
