import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { Quantity, GeneratorId, ResourceId, ItemId } from "../types/core";
import { add as invAdd } from "./inventory";
import type { GeneratorOutput } from "../model/generator";

/**
 * Deterministic, pure tick step.
 * Composition order: per-generator (add → mult), then per-resource (add → mult).
 * @param state - Current immutable game state.
 * @param dtSeconds - Delta time in seconds.
 * @param registries - Resource, generator, item and optional upgrade definitions.
 * @returns New immutable game state.
 * @example
 * const next = tick(state, 1, registries);
 */
export function tick(state: Readonly<GameState>, dtSeconds: number, registries: Registries): GameState {
  if (dtSeconds === 0) return state as GameState;

  const resourceIndex = new Map(state.resources.map((r, i) => [r.id, i] as const));
  const amounts = state.resources.map((r) => r.amount);
  const rates = new Array<number>(state.resources.length).fill(0);

  // Precompute modifier aggregates (if upgrades registry and owned upgrades exist)
  const genAdd = new Map<GeneratorId, number>();
  const genMult = new Map<GeneratorId, number>();
  const resAdd = new Map<ResourceId, number>();
  const resMult = new Map<ResourceId, number>();

  if (registries.upgrades && state.upgrades.length > 0) {
    for (const u of state.upgrades) {
      if (u.level <= 0) continue;
      const def = registries.upgrades.get(u.id);
      if (!def) continue;
      for (const m of def.modifiers) {
        if (m.type === "add") {
          const value = (m.value as unknown as number) * u.level;
          if (m.scope.kind === "generator") {
            genAdd.set(m.scope.id, (genAdd.get(m.scope.id) ?? 0) + value);
          } else {
            resAdd.set(m.scope.id, (resAdd.get(m.scope.id) ?? 0) + value);
          }
        } else if (m.type === "mult") {
          const factor = Math.pow(m.value, u.level);
          if (m.scope.kind === "generator") {
            genMult.set(m.scope.id, (genMult.get(m.scope.id) ?? 1) * factor);
          } else {
            resMult.set(m.scope.id, (resMult.get(m.scope.id) ?? 1) * factor);
          }
        }
      }
    }
  }

  // Track items to add
  const itemsToAdd = new Map<ItemId, number>();

  // From generators → resources/items
  for (const g of state.generators) {
    if (g.owned <= 0) continue;
    const def = registries.generators.get(g.id);
    if (!def) continue;
    const addG = genAdd.get(g.id) ?? 0;
    const multG = genMult.get(g.id) ?? 1;
    for (const out of def.produces as ReadonlyArray<GeneratorOutput | { resourceId: ResourceId; rate: number }>) {
      const base = 'kind' in out ? (out.rate as unknown as number) : out.rate;
      const ratePerUnit = (base + addG) * multG;
      const totalRate = ratePerUnit * g.owned;

      if ('kind' in out && out.kind === "item") {
        const addCount = Math.floor(totalRate * dtSeconds);
        if (addCount > 0) itemsToAdd.set(out.itemId, (itemsToAdd.get(out.itemId) ?? 0) + addCount);
      } else {
        const rid: ResourceId = 'kind' in out && out.kind === "resource" ? out.resourceId : (out as { resourceId: ResourceId }).resourceId;
        const idx = resourceIndex.get(rid);
        if (idx === undefined) continue;
        rates[idx] = (rates[idx] ?? 0) + totalRate;
      }
    }
  }

  // Apply resource-level modifiers and integrate over dt
  let changed = false;
  for (let i = 0; i < rates.length; i++) {
    const r = state.resources[i];
    if (!r) continue;
    const rId = r.id;
    const addR = resAdd.get(rId) ?? 0;
    const multR = resMult.get(rId) ?? 1;
    const finalRate = ((rates[i] ?? 0) + addR) * multR;
    if (finalRate !== 0) {
      amounts[i] = ((amounts[i] as unknown as number) + finalRate * dtSeconds) as Quantity;
      changed = true;
    }
  }

  // Apply item additions to inventory
  let nextInventory = state.inventory;
  if (itemsToAdd.size > 0) {
    for (const [itemId, count] of itemsToAdd) {
      nextInventory = invAdd(nextInventory, itemId, count, registries.items);
    }
    changed = true;
  }

  if (!changed) return state as GameState;

  const next = {
    ...state,
    resources: state.resources.map((r, i) => ({ ...r, amount: amounts[i] ?? r.amount })),
    inventory: nextInventory,
  } as GameState;
  return next;
}


