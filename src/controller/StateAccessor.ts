import type { GameState } from "../model/gameState";

/**
 * Minimal interface to read and atomically replace the immutable `GameState` snapshot.
 *
 * Controllers receive a `StateAccessor` rather than a mutable state object to ensure
 * explicit state transitions and enable structural sharing.
 */
export interface StateAccessor {
  /** Retrieve the current immutable state snapshot. */
  readonly getState: () => GameState;
  /** Replace the current state with a new immutable snapshot. */
  readonly setState: (next: GameState) => void;
}


