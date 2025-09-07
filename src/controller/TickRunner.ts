import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import { TickService } from "../service/TickService";
import type { EngineEvent } from "../core/EventBus";

/** Runs tick and tickWithEvents using held registries and StateAccessor. */
export class TickRunner {
  private readonly state: StateAccessor;
  private readonly registries: Registries;

  public constructor(state: StateAccessor, registries: Registries) {
    this.state = state;
    this.registries = registries;
  }

  public step(dtSeconds: number): void {
    const curr = this.state.getState();
    const next = TickService.tick(curr, dtSeconds, this.registries);
    if (next !== curr) this.state.setState(next);
  }

  public stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = TickService.tickWithEvents(curr, dtSeconds, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }
}


