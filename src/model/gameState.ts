import type { ResourceState } from "./resource";
import type { GeneratorState } from "./generator";
import type { InventoryEntry } from "./item";
import type { UpgradeState } from "./upgrade";
import type { TaskInstance } from "./task";

/**
 * Root immutable game state shape stored by the engine.
 */
export interface GameState {
  readonly resources: ReadonlyArray<ResourceState>;
  readonly generators: ReadonlyArray<GeneratorState>;
  readonly inventory: ReadonlyArray<InventoryEntry>;
  readonly upgrades: ReadonlyArray<UpgradeState>;
  readonly tasks?: ReadonlyArray<TaskInstance>;
  /**
   * Optional app-specific custom data.
   * Use this to store game-specific state that the engine doesn't manage
   * (e.g., unlocked recipes, achievements, settings).
   * This data is persisted alongside the core game state.
   */
  readonly custom?: Readonly<Record<string, unknown>>;
  readonly version: 1;
}


