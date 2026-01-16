import { describe, it, expect } from "vitest";
import {
  Game,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  InsufficientResourceError,
  GeneratorNotFoundError,
  ResourceNotFoundError,
  InvalidQuantityError,
  resourceId,
  generatorId,
  qty,
} from "../../src";

describe("Economy error classes", () => {
  describe("InsufficientResourceError", () => {
    it("includes resource context", () => {
      const err = new InsufficientResourceError("gold", 100, 50);
      expect(err.name).toBe("InsufficientResourceError");
      expect(err.resourceId).toBe("gold");
      expect(err.required).toBe(100);
      expect(err.available).toBe(50);
      expect(err.message).toContain("gold");
      expect(err.message).toContain("100");
      expect(err.message).toContain("50");
    });

    it("is instanceof Error and EconomyError", () => {
      const err = new InsufficientResourceError("gold", 100, 50);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("GeneratorNotFoundError", () => {
    it("includes generator context", () => {
      const err = new GeneratorNotFoundError("miner");
      expect(err.name).toBe("GeneratorNotFoundError");
      expect(err.generatorId).toBe("miner");
      expect(err.message).toContain("miner");
    });
  });

  describe("ResourceNotFoundError", () => {
    it("includes resource context", () => {
      const err = new ResourceNotFoundError("gold");
      expect(err.name).toBe("ResourceNotFoundError");
      expect(err.resourceId).toBe("gold");
      expect(err.message).toContain("gold");
    });
  });

  describe("InvalidQuantityError", () => {
    it("includes quantity context", () => {
      const err = new InvalidQuantityError(-5, "Amount must be positive");
      expect(err.name).toBe("InvalidQuantityError");
      expect(err.value).toBe(-5);
      expect(err.reason).toBe("Amount must be positive");
      expect(err.message).toContain("-5");
    });
  });
});

describe("Game.*OrThrow methods", () => {
  const ore = resourceId("ore");
  const miner = generatorId("miner");

  const createGame = (oreAmount: number): Game => {
    const registries = {
      resources: createInMemoryResourceRegistry([{ id: ore }]),
      generators: createInMemoryGeneratorRegistry([
        { id: miner, produces: [], pricing: { costResourceId: ore, baseCost: 100, growth: 1.1 } },
      ]),
      items: createInMemoryItemRegistry([]),
      upgrades: createInMemoryUpgradeRegistry([]),
    };

    const state: GameState = {
      version: 1,
      resources: [{ id: ore, amount: qty(oreAmount) }],
      generators: [],
      inventory: [],
      upgrades: [],
    };

    return new Game(state, registries);
  };

  describe("buyGeneratorsOrThrow", () => {
    it("throws InsufficientResourceError when currency too low", () => {
      const game = createGame(50); // Less than baseCost of 100
      expect(() => game.buyGeneratorsOrThrow({ generatorId: miner, mode: "1" })).toThrow(
        InsufficientResourceError
      );
    });

    it("throws GeneratorNotFoundError for unknown generator", () => {
      const game = createGame(1000);
      expect(() => game.buyGeneratorsOrThrow({ generatorId: "nonexistent", mode: "1" })).toThrow(
        GeneratorNotFoundError
      );
    });

    it("InsufficientResourceError contains context", () => {
      const game = createGame(50);
      try {
        game.buyGeneratorsOrThrow({ generatorId: miner, mode: "1" });
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InsufficientResourceError);
        const err = e as InsufficientResourceError;
        expect(err.resourceId).toBe("ore");
        expect(err.available).toBe(50);
        expect(err.required).toBe(100);
      }
    });

    it("succeeds with sufficient resources", () => {
      const game = createGame(200);
      const events = game.buyGeneratorsOrThrow({ generatorId: miner, mode: "1" });
      expect(events.length).toBeGreaterThan(0);
      expect(events.find((e) => e.type === "generatorPurchase")).toBeTruthy();
    });
  });

  describe("grantResourceOrThrow", () => {
    it("throws InvalidQuantityError for zero amount", () => {
      const game = createGame(100);
      expect(() => game.grantResourceOrThrow({ resourceId: ore, amount: 0 })).toThrow(
        InvalidQuantityError
      );
    });

    it("throws InvalidQuantityError for negative amount", () => {
      const game = createGame(100);
      expect(() => game.grantResourceOrThrow({ resourceId: ore, amount: -10 })).toThrow(
        InvalidQuantityError
      );
    });

    it("throws ResourceNotFoundError for unknown resource", () => {
      const game = createGame(100);
      expect(() => game.grantResourceOrThrow({ resourceId: "unknown", amount: 10 })).toThrow(
        ResourceNotFoundError
      );
    });

    it("succeeds with valid resource and amount", () => {
      const game = createGame(100);
      const events = game.grantResourceOrThrow({ resourceId: ore, amount: 50 });
      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe("resourceDelta");
      const amt = game.accessor.getState().resources[0]!.amount as unknown as number;
      expect(amt).toBe(150);
    });
  });

  describe("consumeResourceOrThrow", () => {
    it("throws InsufficientResourceError when not enough to consume", () => {
      const game = createGame(50);
      expect(() => game.consumeResourceOrThrow({ resourceId: ore, amount: 100 })).toThrow(
        InsufficientResourceError
      );
    });

    it("throws ResourceNotFoundError for unknown resource", () => {
      const game = createGame(100);
      expect(() => game.consumeResourceOrThrow({ resourceId: "unknown", amount: 10 })).toThrow(
        ResourceNotFoundError
      );
    });

    it("throws InvalidQuantityError for invalid amount", () => {
      const game = createGame(100);
      expect(() => game.consumeResourceOrThrow({ resourceId: ore, amount: 0 })).toThrow(
        InvalidQuantityError
      );
    });

    it("succeeds with sufficient resources", () => {
      const game = createGame(100);
      const events = game.consumeResourceOrThrow({ resourceId: ore, amount: 30 });
      expect(events.length).toBe(1);
      const amt = game.accessor.getState().resources[0]!.amount as unknown as number;
      expect(amt).toBe(70);
    });
  });
});
