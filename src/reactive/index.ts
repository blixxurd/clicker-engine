/**
 * Reactive state subscription system for the Idle Clicker Engine.
 *
 * This module provides a way to subscribe to specific state value changes
 * without polling, using type-safe selectors.
 *
 * @example
 * ```typescript
 * import { Game, select, createStateStore } from "@fidget/idle-engine";
 *
 * const game = new Game(initialState, registries);
 *
 * // Subscribe to gold amount changes
 * game.store.subscribe(
 *   select.resource("gold").amount,
 *   (gold, prev) => console.log(`Gold: ${prev} -> ${gold}`)
 * );
 *
 * // Subscribe to generator owned count
 * game.store.subscribe(
 *   select.generator("miner").owned,
 *   (owned) => updateMinerDisplay(owned)
 * );
 *
 * // Create derived selectors
 * const selectTotalWealth = createSelector(
 *   [select.resource("gold").amount, select.resource("gems").amount],
 *   (gold, gems) => gold + gems * 100
 * );
 *
 * game.store.subscribe(selectTotalWealth, (wealth) => {
 *   updateWealthDisplay(wealth);
 * });
 * ```
 *
 * @module reactive
 */

// Types
export type {
  Selector,
  SubscriptionCallback,
  Unsubscribe,
  StateStore,
  StateStoreOptions,
} from "./types";

// Selector factory
export { select } from "./selectors";
export type {
  ResourceSelector,
  GeneratorSelector,
  InventorySelector,
  UpgradeSelector,
  TaskSelector,
} from "./selectors";

// StateStore
export { createStateStore } from "./StateStore";
export type { StateStoreResult } from "./StateStore";

// Selector composition
export { createSelector } from "./compose";

// Utilities (for advanced use cases)
export { shallowEqual } from "./utils";
