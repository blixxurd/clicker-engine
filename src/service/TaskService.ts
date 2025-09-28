import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { TaskDefinition, TaskInstance } from "../model/task";
import type { EngineEvent } from "../core/EventBus";
import type { Quantity } from "../types/core";
import { InventoryService } from "./InventoryService";

/** Stateless, pure task evaluation and claiming. */
export class TaskService {
  private static q(n: number): Quantity {
    return n as unknown as Quantity;
  }

  private static getTask(defs: Registries["tasks"], id: TaskInstance["id"]): TaskDefinition | undefined {
    return defs?.get(id);
  }

  /**
   * Evaluate the task list to unlock tasks whose requirements are now met.
   */
  public static evaluate(state: Readonly<GameState>, registries: Registries): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const defs = registries.tasks;
    if (!defs) return { state: state as GameState, events: [] };
    const current = state.tasks ?? [];
    const next: TaskInstance[] = [];
    const events: EngineEvent[] = [];

    for (const inst of current) {
      const def = TaskService.getTask(defs, inst.id);
      if (!def) { next.push(inst); continue; }
      if (inst.cooldownRemainingSeconds && inst.cooldownRemainingSeconds > 0) {
        const remaining = inst.cooldownRemainingSeconds;
        next.push({ ...inst, cooldownRemainingSeconds: remaining });
        continue;
      }
      if (inst.status === "locked") {
        if (TaskService.requirementsMet(state, def)) {
          next.push({ ...inst, status: "active" });
          events.push({ type: "taskUnlocked", taskId: inst.id } as EngineEvent);
        } else {
          next.push(inst);
        }
      } else {
        next.push(inst);
      }
    }

    if (defs.all) {
      for (const d of defs.all()) {
        if (!current.find((t) => t.id === d.id)) {
          const status = TaskService.requirementsMet(state, d) ? "active" : "locked";
          next.push({ id: d.id, status });
          if (status === "active") events.push({ type: "taskUnlocked", taskId: d.id } as EngineEvent);
        }
      }
    }

    if (events.length === 0) return { state: state as GameState, events };
    return { state: { ...state, tasks: next } as GameState, events };
  }

  /** Determine if all requirements for a task are satisfied. */
  private static requirementsMet(state: Readonly<GameState>, def: TaskDefinition): boolean {
    for (const r of def.requirements) {
      if (r.kind === "resourceAtLeast") {
        const amt = state.resources.find((x) => x.id === r.resourceId)?.amount as unknown as number | undefined;
        if ((amt ?? 0) < (r.amount as unknown as number)) return false;
      } else if (r.kind === "itemAtLeast") {
        const total = state.inventory.reduce((acc, e) => acc + (e.id === r.itemId ? e.count : 0), 0);
        if (total < r.count) return false;
      } else if (r.kind === "generatorAtLeast") {
        const owned = state.generators.find((g) => g.id === r.generatorId)?.owned ?? 0;
        if (owned < r.owned) return false;
      }
    }
    return true;
  }

  /**
   * Claim a task's rewards if active; returns updated state and events.
   */
  public static claim(state: Readonly<GameState>, taskId: TaskInstance["id"], registries: Registries): { state: GameState; events: ReadonlyArray<EngineEvent> } {
    const defs = registries.tasks;
    if (!defs) return { state: state as GameState, events: [] };
    const def = defs.get(taskId);
    if (!def) return { state: state as GameState, events: [] };
    const inst = (state.tasks ?? []).find((t) => t.id === taskId);
    if (!inst || inst.status !== "active") return { state: state as GameState, events: [] };

    let next = state as GameState;
    const events: EngineEvent[] = [];

    for (const reward of def.rewards) {
      if (reward.kind === "grantResource") {
        const idx = next.resources.findIndex((r) => r.id === reward.resourceId);
        if (idx >= 0) {
          const current = next.resources[idx]!;
          const newAmt = TaskService.q((current.amount as unknown as number) + (reward.amount as unknown as number));
          next = { ...next, resources: next.resources.map((r, i) => (i === idx ? { ...r, amount: newAmt } : r)) } as GameState;
        }
      } else if (reward.kind === "grantItem") {
        next = { ...next, inventory: InventoryService.add(next.inventory, reward.itemId, reward.count, registries.items) } as GameState;
      }
    }

    const updatedInstances: TaskInstance[] = (next.tasks ?? []).map((t) => {
      if (t.id !== taskId) return t;
      if (def.repeatable) {
        return { id: t.id, status: "locked", repeatIndex: (t.repeatIndex ?? 0) + 1, cooldownRemainingSeconds: def.cooldownSeconds ?? 0 };
      }
      return { id: t.id, status: "completed" };
    });

    next = { ...next, tasks: updatedInstances } as GameState;
    events.push({ type: "taskCompleted", taskId } as EngineEvent);
    events.push({ type: "taskClaimed", taskId } as EngineEvent);

    return { state: next, events };
  }
}


