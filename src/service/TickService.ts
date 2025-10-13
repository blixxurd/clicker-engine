import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { Quantity, GeneratorId, ResourceId, ItemId } from "../types/core";
import type { EngineEvent } from "../core/EventBus";
import { InventoryService } from "./InventoryService";

/**
 * Stateless tick math and event production.
 *
 * Integrates generator outputs into resources/items and applies upgrade modifiers
 * without mutating inputs. Also produces resource delta events for observability.
 */
export class TickService {
  /**
   * Calculate current production rates for all resources without advancing state.
   * Useful for displaying "X per second" production stats in UI.
   * @param state - Current game state.
   * @param registries - Game registries.
   * @returns Map of resource IDs to their production rates per second.
   */
  public static calculateProductionRates(state: Readonly<GameState>, registries: Registries): Map<ResourceId, number> {
    const rates = new Map<ResourceId, number>();
    
    // Precompute modifier aggregates
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

    // Calculate production from generators
    for (const g of state.generators) {
      if (g.owned <= 0) continue;
      const def = registries.generators.get(g.id);
      if (!def) continue;
      const addG = genAdd.get(g.id) ?? 0;
      const multG = genMult.get(g.id) ?? 1;
      for (const out of def.produces) {
        if (out.kind === "resource") {
          const base = (out.rate as unknown as number);
          const ratePerUnit = (base + addG) * multG;
          const totalRate = ratePerUnit * g.owned;
          rates.set(out.resourceId, (rates.get(out.resourceId) ?? 0) + totalRate);
        }
      }
    }

    // Apply resource-level modifiers
    for (const r of state.resources) {
      const currentRate = rates.get(r.id) ?? 0;
      const addR = resAdd.get(r.id) ?? 0;
      const multR = resMult.get(r.id) ?? 1;
      const finalRate = (currentRate + addR) * multR;
      if (finalRate !== 0) {
        rates.set(r.id, finalRate);
      }
    }

    return rates;
  }
  /** Advance the simulation by `dtSeconds` and return the next state. */
  public static tick(state: Readonly<GameState>, dtSeconds: number, registries: Registries): GameState {
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
      for (const out of def.produces) {
        const base = (out.rate as unknown as number);
        const ratePerUnit = (base + addG) * multG;
        const totalRate = ratePerUnit * g.owned;

        if (out.kind === "item") {
          const addCount = Math.floor(totalRate * dtSeconds);
          if (addCount > 0) itemsToAdd.set(out.itemId, (itemsToAdd.get(out.itemId) ?? 0) + addCount);
        } else {
          const idx = resourceIndex.get(out.resourceId);
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
        let newAmount = (amounts[i] as unknown as number) + finalRate * dtSeconds;
        // Enforce capacity if defined
        if (r.capacity !== undefined) {
          const cap = r.capacity as unknown as number;
          newAmount = Math.max(0, Math.min(newAmount, cap));
        }
        amounts[i] = newAmount as Quantity;
        changed = true;
      }
    }

    // Apply item additions to inventory
    let nextInventory = state.inventory;
    if (itemsToAdd.size > 0) {
      for (const [itemId, count] of itemsToAdd) {
        nextInventory = InventoryService.add(nextInventory, itemId, count, registries.items);
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

  /** Advance and return both next state and emitted events. */
  public static tickWithEvents(state: Readonly<GameState>, dtSeconds: number, registries: Registries): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const before = state.resources.map((r) => r.amount as unknown as number);
    const events: EngineEvent[] = [];
    events.push({ type: "tickStart", dtSeconds } as EngineEvent);
    const after = TickService.tick(state, dtSeconds, registries);
    for (let i = 0; i < after.resources.length; i++) {
      const prev = before[i] ?? 0;
      const curr = after.resources[i] ? ((after.resources[i]!.amount as unknown as number)) : prev;
      const delta = curr - prev;
      if (delta !== 0) {
        events.push({ type: "resourceDelta", resourceId: after.resources[i]!.id, delta } as EngineEvent);
      }
    }
    events.push({ type: "tickEnd", dtSeconds } as EngineEvent);
    return { state: after, events };
  }
}


