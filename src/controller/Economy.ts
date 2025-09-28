import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import type { GeneratorId, ResourceId, UpgradeId, Quantity } from "../types/core";
import type { BulkMode } from "../core/math/bulk";
import type { GameState } from "../model/gameState";
import { BaseSubsystem } from "./BaseSubsystem";
import { planPurchase } from "../core/math/bulk";

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


