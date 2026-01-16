import type { GameState } from "../model/gameState";
import type { Selector } from "./types";

/**
 * Creates a derived selector from one input selector.
 */
export function createSelector<T1, R>(
  selectors: readonly [Selector<T1>],
  combiner: (v1: T1) => R
): Selector<R>;

/**
 * Creates a derived selector from two input selectors.
 */
export function createSelector<T1, T2, R>(
  selectors: readonly [Selector<T1>, Selector<T2>],
  combiner: (v1: T1, v2: T2) => R
): Selector<R>;

/**
 * Creates a derived selector from three input selectors.
 */
export function createSelector<T1, T2, T3, R>(
  selectors: readonly [Selector<T1>, Selector<T2>, Selector<T3>],
  combiner: (v1: T1, v2: T2, v3: T3) => R
): Selector<R>;

/**
 * Creates a derived selector from four input selectors.
 */
export function createSelector<T1, T2, T3, T4, R>(
  selectors: readonly [Selector<T1>, Selector<T2>, Selector<T3>, Selector<T4>],
  combiner: (v1: T1, v2: T2, v3: T3, v4: T4) => R
): Selector<R>;

/**
 * Creates a derived selector by combining multiple input selectors.
 *
 * The derived selector will have a unique key based on the input selector keys,
 * enabling proper subscription deduplication.
 *
 * @example
 * ```typescript
 * // Compute total wealth from gold and gems
 * const selectTotalWealth = createSelector(
 *   [select.resource("gold").amount, select.resource("gems").amount],
 *   (gold, gems) => gold + gems * 100
 * );
 *
 * store.subscribe(selectTotalWealth, (wealth) => {
 *   console.log("Total wealth:", wealth);
 * });
 * ```
 *
 * @param selectors - Array of input selectors
 * @param combiner - Function to combine the selected values
 * @returns A new selector that derives its value from the inputs
 */
export function createSelector<R>(
  selectors: readonly Selector<unknown>[],
  combiner: (...args: unknown[]) => R
): Selector<R> {
  // Generate unique key from input selector keys
  const key = `derived:[${selectors.map((s) => s.key).join(",")}]`;

  const selector = ((state: GameState): R => {
    const values = selectors.map((s) => s(state));
    return combiner(...values);
  }) as Selector<R>;

  Object.defineProperty(selector, "key", { value: key, writable: false });

  return selector;
}
