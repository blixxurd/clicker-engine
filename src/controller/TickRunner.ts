import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import { TickService } from "../service/TickService";
import type { EngineEvent } from "../core/EventBus";
import type { ResourceId } from "../types/core";

/** Runs simulation ticks via `TickService` using held registries and `StateAccessor`. */
export class TickRunner {
  private readonly state: StateAccessor;
  private readonly registries: Registries;

  public constructor(state: StateAccessor, registries: Registries) {
    this.state = state;
    this.registries = registries;
  }

  /** Advance the simulation by the provided delta time in seconds. */
  public step(dtSeconds: number): void {
    const curr = this.state.getState();
    const next = TickService.tick(curr, dtSeconds, this.registries);
    if (next !== curr) this.state.setState(next);
  }

  /** Advance and return events emitted by this tick. */
  public stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = TickService.tickWithEvents(curr, dtSeconds, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Calculate current production rates for all resources without advancing state.
   * @returns Map of resource IDs to production rates per second.
   */
  public getProductionRates(): Map<ResourceId, number> {
    return TickService.calculateProductionRates(this.state.getState(), this.registries);
  }
}


