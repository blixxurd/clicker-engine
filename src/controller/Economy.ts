import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import type { GeneratorId, ResourceId, UpgradeId, Quantity, ItemId } from "../types/core";
import type { BulkMode } from "../core/math/bulk";
import type { GameState } from "../model/gameState";
import { BaseSubsystem } from "./BaseSubsystem";
import { planPurchase } from "../core/math/bulk";
import { InventoryService } from "../service/InventoryService";

/**
 * Coordinates purchases and upgrades in the economy domain.
 *
 * Mutates the game state through `StateAccessor` after computing results via pure helpers.
 * Public instance methods emit domain `EngineEvent`s to be published by higher layers.
 */
export class Economy extends BaseSubsystem {
  public constructor(state: StateAccessor, registries: Registries) {
    super(state, registries);
  }

  /**
   * Buy one or more generators using the provided bulk mode and current currency.
   * @param args - Purchase parameters.
   * @returns Events describing the transaction (purchase and resource delta).
   */
  public buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.buyGeneratorPure(curr, args, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Apply a single upgrade if affordable.
   * @param args - Upgrade parameters including cost and currency resource.
   * @returns Events describing the upgrade and resource delta.
   */
  public applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.applyUpgradePure(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Sell a resource into another resource at a given unit price.
   * Commonly used to sell ore for gold.
   */
  public sellResource(args: SellResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.sellResourcePure(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Sell an inventory item into a resource at a given unit price.
   */
  public sellItems(args: SellItemsArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.sellItemsPure(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Grant resources directly (manual actions, quest rewards, etc.).
   */
  public grantResource(args: GrantResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.grantResourcePure(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Consume resources directly if available (crafting costs, sinks).
   */
  public consumeResource(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = Economy.consumeResourcePure(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

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
  public static buyGeneratorPure(state: Readonly<GameState>, args: BuyGeneratorArgs, registries: Registries): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const def = registries.generators.get(args.generatorId);
    const pricing = def?.pricing;
    if (!pricing) return { state: state as GameState, events: [] };
    const resIdx = state.resources.findIndex((r) => r.id === pricing.costResourceId);
    if (resIdx < 0) return { state: state as GameState, events: [] };
    const currency = state.resources[resIdx]!.amount as unknown as number;
    const plan = planPurchase(args.mode, currency, pricing.baseCost, pricing.growth);
    if (plan.count <= 0 || plan.cost <= 0) return { state: state as GameState, events: [] };
    const updatedResources = state.resources.map((r, i) => i === resIdx ? { ...r, amount: Economy.q((r.amount as unknown as number) - plan.cost) } : r);
    const genIdx = state.generators.findIndex((g) => g.id === args.generatorId);
    const updatedGenerators = genIdx >= 0 ? state.generators.map((g, i) => (i === genIdx ? { ...g, owned: g.owned + plan.count } : g)) : [...state.generators, { id: args.generatorId, owned: plan.count }];
    const next: GameState = { ...state, resources: updatedResources, generators: updatedGenerators } as GameState;
    const events: EngineEvent[] = [
      { type: "generatorPurchase", generatorId: args.generatorId, count: plan.count, costResourceId: pricing.costResourceId, cost: plan.cost } as EngineEvent,
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
  public static applyUpgradePure(state: Readonly<GameState>, args: ApplyUpgradeArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const { upgradeId, costResourceId, cost } = args;
    const resIdx = state.resources.findIndex((r) => r.id === costResourceId);
    if (resIdx < 0) return { state: state as GameState, events: [] };
    const currency = state.resources[resIdx]!.amount as unknown as number;
    if (currency < cost) return { state: state as GameState, events: [] };
    const updatedResources = state.resources.map((r, i) => (i === resIdx ? { ...r, amount: Economy.q(currency - cost) } : r));
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
  public static sellResourcePure(state: Readonly<GameState>, args: SellResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const fromIdx = state.resources.findIndex((r) => r.id === args.fromResourceId);
    const toIdx = state.resources.findIndex((r) => r.id === args.toResourceId);
    if (fromIdx < 0 || toIdx < 0) return { state: state as GameState, events: [] };
    const available = state.resources[fromIdx]!.amount as unknown as number;
    const units = Math.max(0, Math.min(Math.floor(available), args.maxUnits ?? available));
    if (units <= 0 || args.unitPrice <= 0) return { state: state as GameState, events: [] };

    const fromNext = Economy.q(available - units);
    const toCurr = state.resources[toIdx]!.amount as unknown as number;
    const toNext = Economy.q(toCurr + units * args.unitPrice);

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
  public static sellItemsPure(state: Readonly<GameState>, args: SellItemsArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const toIdx = state.resources.findIndex((r) => r.id === args.toResourceId);
    if (toIdx < 0) return { state: state as GameState, events: [] };
    const available = InventoryService.count(state.inventory, args.itemId);
    const units = Math.max(0, Math.min(available, args.maxCount ?? available));
    if (units <= 0 || args.unitPrice <= 0) return { state: state as GameState, events: [] };

    const invNext = InventoryService.consume(state.inventory, args.itemId, units);
    const toCurr = state.resources[toIdx]!.amount as unknown as number;
    const toNext = Economy.q(toCurr + units * args.unitPrice);

    const next: GameState = { ...state, inventory: invNext, resources: state.resources.map((r, i) => (i === toIdx ? { ...r, amount: toNext } : r)) } as GameState;
    const events: EngineEvent[] = [
      { type: "inventoryConsumed", itemId: args.itemId, count: units } as EngineEvent,
      { type: "resourceDelta", resourceId: state.resources[toIdx]!.id, delta: units * args.unitPrice } as EngineEvent,
    ];
    return { state: next, events };
  }

  /**
   * Pure direct resource grant.
   */
  public static grantResourcePure(state: Readonly<GameState>, args: GrantResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0 || args.amount <= 0) return { state: state as GameState, events: [] };
    const curr = state.resources[idx]!.amount as unknown as number;
    const nextAmt = Economy.q(curr + args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: args.amount } as EngineEvent] };
  }

  /**
   * Pure direct resource consumption.
   */
  public static consumeResourcePure(state: Readonly<GameState>, args: ConsumeResourceArgs): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const idx = state.resources.findIndex((r) => r.id === args.resourceId);
    if (idx < 0 || args.amount <= 0) return { state: state as GameState, events: [] };
    const curr = state.resources[idx]!.amount as unknown as number;
    if (curr < args.amount) return { state: state as GameState, events: [] };
    const nextAmt = Economy.q(curr - args.amount);
    const next: GameState = { ...state, resources: state.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    return { state: next, events: [{ type: "resourceDelta", resourceId: state.resources[idx]!.id, delta: -args.amount } as EngineEvent] };
  }

  /**
   * Arguments for purchasing generators.
   *
   * @remarks
   * Exposed for consumers' typing convenience when calling {@link Economy.buyGenerators}.
   */
  public static readonly BuyGeneratorArgs: undefined;
}

/** Purchase parameters for generators. */
export interface BuyGeneratorArgs {
  readonly generatorId: GeneratorId;
  readonly mode: BulkMode;
}

/** Parameters for applying an upgrade. */
export interface ApplyUpgradeArgs {
  readonly upgradeId: UpgradeId;
  readonly costResourceId: ResourceId;
  readonly cost: number;
}

/** Parameters for selling a resource into another resource. */
export interface SellResourceArgs {
  readonly fromResourceId: ResourceId;
  readonly toResourceId: ResourceId;
  readonly unitPrice: number;
  readonly maxUnits?: number;
}

/** Parameters for selling inventory items into a resource. */
export interface SellItemsArgs {
  readonly itemId: ItemId;
  readonly toResourceId: ResourceId;
  readonly unitPrice: number;
  readonly maxCount?: number;
}

/** Parameters for granting resources directly. */
export interface GrantResourceArgs {
  readonly resourceId: ResourceId;
  readonly amount: number;
}

/** Parameters for consuming resources directly. */
export interface ConsumeResourceArgs {
  readonly resourceId: ResourceId;
  readonly amount: number;
}


