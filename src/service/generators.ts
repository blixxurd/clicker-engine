import type { GameState } from "../model/gameState";
import type { GeneratorId, Quantity } from "../types/core";
import type { EngineEvent } from "../core/events/types";
import { planPurchase, type BulkMode } from "../core/math/bulk";
import type { Registries } from "../repo/registries";

function q(n: number): Quantity {
  return n as unknown as Quantity;
}

export interface BuyGeneratorArgs {
  readonly generatorId: GeneratorId;
  readonly mode: BulkMode;
}

export interface BuyResult {
  readonly state: GameState;
  readonly events: ReadonlyArray<EngineEvent>;
}

/**
 * Purchase generators using pricing from the registry.
 * @example
 * const { state, events } = buyGenerator(state, { generatorId: miner, mode: "10" }, registries);
 */
export function buyGenerator(state: Readonly<GameState>, args: BuyGeneratorArgs, registries: Registries): BuyResult {
  const { generatorId, mode } = args;
  const def = registries.generators.get(generatorId);
  const pricing = def?.pricing;
  if (!pricing) return { state: state as GameState, events: [] };

  const resIdx = state.resources.findIndex((r) => r.id === pricing.costResourceId);
  if (resIdx < 0) return { state: state as GameState, events: [] };

  const currency = state.resources[resIdx]!.amount as unknown as number;
  const plan = planPurchase(mode, currency, pricing.baseCost, pricing.growth);
  if (plan.count <= 0 || plan.cost <= 0) return { state: state as GameState, events: [] };

  // Deduct currency
  const updatedResources = state.resources.map((r, i) =>
    i === resIdx ? { ...r, amount: q((r.amount as unknown as number) - plan.cost) } : r,
  );

  // Increment generator owned
  const genIdx = state.generators.findIndex((g) => g.id === generatorId);
  const updatedGenerators = genIdx >= 0
    ? state.generators.map((g, i) => (i === genIdx ? { ...g, owned: g.owned + plan.count } : g))
    : [...state.generators, { id: generatorId, owned: plan.count }];

  const next: GameState = { ...state, resources: updatedResources, generators: updatedGenerators } as GameState;

  const events: EngineEvent[] = [
    { type: "generatorPurchase", generatorId, count: plan.count, costResourceId: pricing.costResourceId, cost: plan.cost },
    { type: "resourceDelta", resourceId: pricing.costResourceId, delta: -plan.cost },
  ];

  return { state: next, events };
}
