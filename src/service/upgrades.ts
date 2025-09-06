/**
 * Upgrade application service: increments level and deducts resource cost.
 * Emits upgradeApplied and resourceDelta events when successful.
 */
import type { GameState } from "../model/gameState";
import type { UpgradeId, ResourceId, Quantity } from "../types/core";
import type { EngineEvent } from "../core/events/types";

function q(n: number): Quantity {
  return n as unknown as Quantity;
}

export interface ApplyUpgradeArgs {
  readonly upgradeId: UpgradeId;
  readonly costResourceId: ResourceId;
  readonly cost: number;
}

export interface ApplyResult {
  readonly state: GameState;
  readonly events: ReadonlyArray<EngineEvent>;
}

/**
 * Apply an upgrade purchase: deduct cost and raise level.
 * @example
 * const { state, events } = applyUpgrade(state, { upgradeId, costResourceId: ore, cost: 100 });
 */
export function applyUpgrade(state: Readonly<GameState>, args: ApplyUpgradeArgs): ApplyResult {
  const { upgradeId, costResourceId, cost } = args;
  const resIdx = state.resources.findIndex((r) => r.id === costResourceId);
  if (resIdx < 0) return { state: state as GameState, events: [] };
  const currency = state.resources[resIdx]!.amount as unknown as number;
  if (currency < cost) return { state: state as GameState, events: [] };

  const updatedResources = state.resources.map((r, i) => (i === resIdx ? { ...r, amount: q(currency - cost) } : r));
  const upIdx = state.upgrades.findIndex((u) => u.id === upgradeId);
  const updatedUpgrades = upIdx >= 0
    ? state.upgrades.map((u, i) => (i === upIdx ? { ...u, level: u.level + 1 } : u))
    : [...state.upgrades, { id: upgradeId, level: 1 }];

  const next: GameState = { ...state, resources: updatedResources, upgrades: updatedUpgrades } as GameState;

  const events: EngineEvent[] = [
    { type: "upgradeApplied", upgradeId, newLevel: upIdx >= 0 ? state.upgrades[upIdx]!.level + 1 : 1, costResourceId, cost } as EngineEvent,
    { type: "resourceDelta", resourceId: costResourceId, delta: -cost } as EngineEvent,
  ];

  return { state: next, events };
}
