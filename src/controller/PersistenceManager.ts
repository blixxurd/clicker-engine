import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import { serialize as doSerialize, parse as doParse, parseWithOffline as doParseWithOffline } from "../core/persistence";
import type { GameState } from "../model/gameState";

export interface Clock {
  nowMs(): number;
}

export class SystemClock implements Clock {
  public nowMs(): number { return Date.now(); }
}

/**
 * PersistenceManager centralizes serialize/parse and offline progress with a clock.
 */
export class PersistenceManager {
  private readonly state: StateAccessor;
  private readonly registries: Registries;
  private readonly clock: Clock;

  public constructor(state: StateAccessor, registries: Registries, clock: Clock = new SystemClock()) {
    this.state = state;
    this.registries = registries;
    this.clock = clock;
  }

  public serialize(): string {
    return doSerialize(this.state.getState());
  }

  public parse(json: string): void {
    const next = doParse(json);
    this.state.setState(next);
  }

  public parseWithOffline(json: string): void {
    const now = this.clock.nowMs();
    const next: GameState = doParseWithOffline(json, now, this.registries);
    this.state.setState(next);
  }
}


