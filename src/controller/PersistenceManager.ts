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

  /**
   * Serialize the current state to a JSON string.
   */
  public serialize(): string {
    return doSerialize(this.state.getState());
  }

  /**
   * Parse a JSON string and replace the current state.
   * @param json - Serialized state produced by {@link serialize}.
   */
  public parse(json: string): void {
    const next = doParse(json);
    this.state.setState(next);
  }

  /**
   * Parse a JSON string and apply offline progress between the saved timestamp and now.
   * @param json - Serialized state produced by {@link serialize}.
   */
  public parseWithOffline(json: string): void {
    const now = this.clock.nowMs();
    const next: GameState = doParseWithOffline(json, now, this.registries);
    this.state.setState(next);
  }
}


