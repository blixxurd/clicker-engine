import type { GameState } from "../model/gameState";

/** Provides read/write access to the current immutable GameState snapshot. */
export interface StateAccessor {
  readonly getState: () => GameState;
  readonly setState: (next: GameState) => void;
}


