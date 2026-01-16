import type { GameState } from "../model/gameState";
import type { EventBus } from "../core/EventBus";

/**
 * A selector function that extracts a value from GameState.
 * Selectors should be pure and deterministic.
 */
export interface Selector<T> {
  (state: GameState): T;
  /** Unique key for subscription deduplication. */
  readonly key: string;
}

/**
 * Callback invoked when a subscribed value changes.
 * @param value - The new value after the change
 * @param prevValue - The previous value before the change
 */
export type SubscriptionCallback<T> = (value: T, prevValue: T) => void;

/**
 * Function to unsubscribe from state changes.
 */
export type Unsubscribe = () => void;

/**
 * Options for creating a StateStore.
 */
export interface StateStoreOptions {
  /**
   * If true, notifications are batched until flush() is called.
   * Useful for game loops where multiple state changes occur per frame.
   * @default false
   */
  readonly batched?: boolean;

  /**
   * If provided with batched:true, auto-flushes on "tickEnd" events.
   */
  readonly flushOn?: EventBus;

  /**
   * If true, skip the initial callback on subscribe.
   * By default, callbacks fire immediately with the current value.
   * @default false
   */
  readonly skipInitialCall?: boolean;
}

/**
 * Core reactive state store interface for subscribing to state changes.
 */
export interface StateStore {
  /**
   * Subscribe to changes in a selected value.
   * By default, the callback fires immediately with the current value,
   * then on each subsequent change.
   *
   * @param selector - Selector function to extract the value of interest
   * @param callback - Called when the selected value changes
   * @returns Unsubscribe function
   */
  subscribe<T>(selector: Selector<T>, callback: SubscriptionCallback<T>): Unsubscribe;

  /**
   * Get the current value without subscribing.
   * @param selector - Selector function to extract the value
   */
  get<T>(selector: Selector<T>): T;

  /**
   * Flush pending notifications (only relevant when batched:true).
   * In unbatched mode, this is a no-op.
   */
  flush(): void;

  /**
   * Remove all subscriptions and clean up.
   */
  dispose(): void;
}
