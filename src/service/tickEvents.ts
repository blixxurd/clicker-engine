/**
 * Tick wrapper that emits EngineEvent deltas around the pure tick() step.
 * Produces resourceDelta, tickStart, and tickEnd events based on state changes.
 */
import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import { tick } from "./tick";
import type { EngineEvent } from "../core/events/types";

export interface TickResult {
  readonly state: GameState;
  readonly events: ReadonlyArray<EngineEvent>;
}

/**
 * Run a tick and collect events for resource deltas and lifecycle.
 * @example
 * const { state, events } = tickWithEvents(state, 1, registries);
 */
export function tickWithEvents(state: Readonly<GameState>, dtSeconds: number, registries: Registries): TickResult {
  const before = state.resources.map((r) => r.amount as unknown as number);
  const events: EngineEvent[] = [];
  events.push({ type: "tickStart", dtSeconds } as EngineEvent);
  const after = tick(state, dtSeconds, registries);
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
