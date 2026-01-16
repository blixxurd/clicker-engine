import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import type { Quantity, GeneratorId, ItemId } from "../types/core";
import type { BulkMode } from "../core/math/bulk";
import { planPurchase } from "../core/math/bulk";
import { InventoryService } from "./InventoryService";
import {
  InsufficientResourceError,
  GeneratorNotFoundError,
  ResourceNotFoundError,
  InvalidQuantityError,
} from "../errors/EconomyError";

/** Purchase parameters for generators. */
export interface BuyGeneratorArgs {
  readonly generatorId: string;
  readonly mode: BulkMode;
}

/** Parameters for applying an upgrade. */
export interface ApplyUpgradeArgs {
  readonly upgradeId: string;
  readonly costResourceId: string;
  readonly cost: number;
}

/** Parameters for selling a resource into another resource. */
export interface SellResourceArgs {
  readonly fromResourceId: string;
  readonly toResourceId: string;
  readonly unitPrice: number;
  readonly maxUnits?: number;
}

/** Parameters for selling inventory items into a resource. */
export interface SellItemsArgs {
  readonly itemId: string;
  readonly toResourceId: string;
  readonly unitPrice: number;
  readonly maxCount?: number;
}

/** Parameters for granting resources directly. */
export interface GrantResourceArgs {
  readonly resourceId: string;
  readonly amount: number;
}

/** Parameters for consuming resources directly. */
export interface ConsumeResourceArgs {
  readonly resourceId: string;
  readonly amount: number;
}

/**
 * Stateless, pure economy operations.
 *
 * Handles purchases, upgrades, and resource transactions without side effects.
 * Returns new state and events for controllers to apply.
 */
export class EconomyService {
  private static q(n: number): Quantity {
    return n as unknown as Quantity;
  }

  /**
   * Pure purchase logic used by controllers and tests.
   * @param state - Current immutable `GameState`.
   * @param args - Purchase parameters.
   * @param registries - Access to generator definitions and pricing.
   * @returns New state and events; returns original state if no-op.
   */
  public static buyGenerators(state: Readonly<GameState>, args: BuyGeneratorArgs, registries: Registries): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const generatorId = args.generatorId as unknown as GeneratorId;
    const def = registries.generators.get(generatorId);
    const pricing = def?.pricing;
    if (!pricing) return { state: state as GameState, events: [] };
    const resIdx = state.resources.findIndex((r) => r.id === pricing.costResourceId);
    if (resIdx < 0) return { state: state as GameState, events: [] };
    const currency = state.resources[resIdx]!.amount as unknown as number;
    const plan = planPurchase(args.mode, currency, pricing.baseCost, pricing.growth);
    if (plan.count <= 0 || plan.cost <= 0) return { state: state as GameState, events: [] };
    const updatedResources = state.resources.map((r, i) => i === resIdx ? { ...r, amount: EconomyService.q((r.amount as unknown as number) - plan.cost) } : r);
    const genIdx = state.generators.findIndex((g) => g.id === generatorId);
    const updatedGenerators = genIdx >= 0 ? state.generators.map((g, i) => (i === genIdx ? { ...g, owned: g.owned + plan.count } : g)) : [...state.generators, { id: generatorId, owned: plan.count }];
    const next: GameState = { ...state, resources: updatedResources, generators: updatedGenerators } as GameState;
    const events: EngineEvent[] = [
      { type: "generatorPurchase", generatorId: generatorId, count: plan.count, costResourceId: pricing.costResourceId, cost: plan.cost } as EngineEvent,
      { type: "resourceDelta", resourceId: pricing.costResourceId, delta: -plan.cost } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Pure upgrade logic used by controllers and tests.
   * @param state - Current immutable `GameState`.
   * @param args - Upgrade parameters including explicit cost.
   * @returns New state and events; returns original state if not affordable.
   */
  public static applyUpgrade(state: Readonly<GameState>, args: ApplyUpgradeArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const { upgradeId, costResourceId, cost } = args;
    const resIdx = state.resources.findIndex((r) => r.id === costResourceId);
    if (resIdx < 0) return { state: state as GameState, events: [] };
    const currency = state.resources[resIdx]!.amount as unknown as number;
    if (currency < cost) return { state: state as GameState, events: [] };
    const updatedResources = state.resources.map((r, i) => (i === resIdx ? { ...r, amount: EconomyService.q(currency - cost) } : r));
    const upIdx = state.upgrades.findIndex((u) => u.id === upgradeId);
    const updatedUpgrades = upIdx >= 0 ? state.upgrades.map((u, i) => (i === upIdx ? { ...u, level: u.level + 1 } : u)) : [...state.upgrades, { id: upgradeId, level: 1 }];
    const next: GameState = { ...state, resources: updatedResources, upgrades: updatedUpgrades } as GameState;
    const events: EngineEvent[] = [
      { type: "upgradeApplied", upgradeId, newLevel: upIdx >= 0 ? state.upgrades[upIdx]!.level + 1 : 1, costResourceId, cost } as EngineEvent,
      { type: "resourceDelta", resourceId: costResourceId, delta: -cost } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Pure resource exchange: move units from one resource to another at a unit price.
   * @returns New state and resource delta events; no-ops return original state.
   */
  public static sellResource(state: Readonly<GameState>, args: SellResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const fromIdx = state.resources.findIndex((r) => r.id === args.fromResourceId);
    const toIdx = state.resources.findIndex((r) => r.id === args.toResourceId);
    if (fromIdx < 0 || toIdx < 0) return { state: state as GameState, events: [] };
    const available = state.resources[fromIdx]!.amount as unknown as number;
    const units = Math.max(0, Math.min(Math.floor(available), args.maxUnits ?? available));
    if (units <= 0 || args.unitPrice <= 0) return { state: state as GameState, events: [] };

    const fromNext = EconomyService.q(available - units);
    const toCurr = state.resources[toIdx]!.amount as unknown as number;
    const toNext = EconomyService.q(toCurr + units * args.unitPrice);

    const next: GameState = {
      ...state,
      resources: state.resources.map((r, i) => (i === fromIdx ? { ...r, amount: fromNext } : i === toIdx ? { ...r, amount: toNext } : r)),
    } as GameState;

    const events: EngineEvent[] = [
      { type: "resourceDelta", resourceId: state.resources[fromIdx]!.id, delta: -units } as EngineEvent,
      { type: "resourceDelta", resourceId: state.resources[toIdx]!.id, delta: units * args.unitPrice } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Pure inventory sale: consume items and credit a resource.
   */
  public static sellItems(state: Readonly<GameState>, args: SellItemsArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const itemId = args.itemId as unknown as ItemId;
    const toIdx = state.resources.findIndex((r) => r.id === args.toResourceId);
    if (toIdx < 0) return { state: state as GameState, events: [] };
    const available = InventoryService.count(state.inventory, itemId);
    const units = Math.max(0, Math.min(available, args.maxCount ?? available));
    if (units <= 0 || args.unitPrice <= 0) return { state: state as GameState, events: [] };

    const invNext = InventoryService.consume(state.inventory, itemId, units);
    const toCurr = state.resources[toIdx]!.amount as unknown as number;
    const toNext = EconomyService.q(toCurr + units * args.unitPrice);

    const next: GameState = { ...state, inventory: invNext, resources: state.resources.map((r, i) => (i === toIdx ? { ...r, amount: toNext } : r)) } as GameState;
    const events: EngineEvent[] = [
      { type: "inventoryConsumed", itemId: itemId, count: units } as EngineEvent,
      { type: "resourceDelta", resourceId: state.resources[toIdx]!.id, delta: units * args.unitPrice } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Pure direct resource grant.
   */
  public static grantResource(state: Readonly<GameState>, args: GrantResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0 || args.amount <= 0) return { state: state as GameState, events: [] };
    const curr = state.resources[idx]!.amount as unknown as number;
    const nextAmt = EconomyService.q(curr + args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: args.amount } as EngineEvent] };
  }

  /**
   * Pure direct resource consumption.
   */
  public static consumeResource(state: Readonly<GameState>, args: ConsumeResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0 || args.amount <= 0) return { state: state as GameState, events: [] };
    const curr = state.resources[idx]!.amount as unknown as number;
    if (curr < args.amount) return { state: state as GameState, events: [] };
    const nextAmt = EconomyService.q(curr - args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: -args.amount } as EngineEvent] };
  }

  // ============================================================================
  // Throwing variants - same logic but throw typed errors instead of silent no-op
  // ============================================================================

  /**
   * Like buyGenerators but throws typed errors on failure.
   * @throws GeneratorNotFoundError if generator or pricing not found
   * @throws ResourceNotFoundError if cost resource not in state
   * @throws InsufficientResourceError if not enough currency
   */
  public static buyGeneratorsOrThrow(
    state: Readonly<GameState>,
    args: BuyGeneratorArgs,
    registries: Registries
  ): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const generatorId = args.generatorId as unknown as GeneratorId;
    const def = registries.generators.get(generatorId);
    const pricing = def?.pricing;
    if (!pricing) {
      throw new GeneratorNotFoundError(generatorId);
    }
    const resIdx = state.resources.findIndex((r) => r.id === pricing.costResourceId);
    if (resIdx < 0) {
      throw new ResourceNotFoundError(pricing.costResourceId);
    }
    const currency = state.resources[resIdx]!.amount as unknown as number;
    const plan = planPurchase(args.mode, currency, pricing.baseCost, pricing.growth);
    if (plan.count <= 0 || plan.cost <= 0) {
      throw new InsufficientResourceError(pricing.costResourceId, pricing.baseCost, currency);
    }
    const updatedResources = state.resources.map((r, i) =>
      i === resIdx ? { ...r, amount: EconomyService.q((r.amount as unknown as number) - plan.cost) } : r
    );
    const genIdx = state.generators.findIndex((g) => g.id === generatorId);
    const updatedGenerators =
      genIdx >= 0
        ? state.generators.map((g, i) => (i === genIdx ? { ...g, owned: g.owned + plan.count } : g))
        : [...state.generators, { id: generatorId, owned: plan.count }];
    const next: GameState = { ...state, resources: updatedResources, generators: updatedGenerators } as GameState;
    const events: EngineEvent[] = [
      { type: "generatorPurchase", generatorId: generatorId, count: plan.count, costResourceId: pricing.costResourceId, cost: plan.cost } as EngineEvent,
      { type: "resourceDelta", resourceId: pricing.costResourceId, delta: -plan.cost } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Like applyUpgrade but throws typed errors on failure.
   * @throws ResourceNotFoundError if cost resource not in state
   * @throws InsufficientResourceError if not enough currency
   */
  public static applyUpgradeOrThrow(
    state: Readonly<GameState>,
    args: ApplyUpgradeArgs
  ): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const { upgradeId, costResourceId, cost } = args;
    const resIdx = state.resources.findIndex((r) => r.id === costResourceId);
    if (resIdx < 0) {
      throw new ResourceNotFoundError(costResourceId);
    }
    const currency = state.resources[resIdx]!.amount as unknown as number;
    if (currency < cost) {
      throw new InsufficientResourceError(costResourceId, cost, currency);
    }
    const updatedResources = state.resources.map((r, i) => (i === resIdx ? { ...r, amount: EconomyService.q(currency - cost) } : r));
    const upIdx = state.upgrades.findIndex((u) => u.id === upgradeId);
    const updatedUpgrades =
      upIdx >= 0 ? state.upgrades.map((u, i) => (i === upIdx ? { ...u, level: u.level + 1 } : u)) : [...state.upgrades, { id: upgradeId, level: 1 }];
    const next: GameState = { ...state, resources: updatedResources, upgrades: updatedUpgrades } as GameState;
    const events: EngineEvent[] = [
      { type: "upgradeApplied", upgradeId, newLevel: upIdx >= 0 ? state.upgrades[upIdx]!.level + 1 : 1, costResourceId, cost } as EngineEvent,
      { type: "resourceDelta", resourceId: costResourceId, delta: -cost } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Like grantResource but throws typed errors on failure.
   * @throws ResourceNotFoundError if resource not in state
   * @throws InvalidQuantityError if amount is <= 0
   */
  public static grantResourceOrThrow(
    state: Readonly<GameState>,
    args: GrantResourceArgs
  ): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    if (args.amount <= 0) {
      throw new InvalidQuantityError(args.amount, "Amount must be positive");
    }
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0) {
      throw new ResourceNotFoundError(args.resourceId);
    }
    const curr = state.resources[idx]!.amount as unknown as number;
    const nextAmt = EconomyService.q(curr + args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: args.amount } as EngineEvent] };
  }

  /**
   * Like consumeResource but throws typed errors on failure.
   * @throws ResourceNotFoundError if resource not in state
   * @throws InvalidQuantityError if amount is <= 0
   * @throws InsufficientResourceError if not enough to consume
   */
  public static consumeResourceOrThrow(
    state: Readonly<GameState>,
    args: ConsumeResourceArgs
  ): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    if (args.amount <= 0) {
      throw new InvalidQuantityError(args.amount, "Amount must be positive");
    }
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0) {
      throw new ResourceNotFoundError(args.resourceId);
    }
    const curr = state.resources[idx]!.amount as unknown as number;
    if (curr < args.amount) {
      throw new InsufficientResourceError(args.resourceId, args.amount, curr);
    }
    const nextAmt = EconomyService.q(curr - args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: -args.amount } as EngineEvent] };
  }
}

