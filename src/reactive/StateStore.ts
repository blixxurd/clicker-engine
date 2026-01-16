import type { GameState } from "../model/gameState";
import type { StateAccessor } from "../controller/StateAccessor";
import type { Selector, SubscriptionCallback, Unsubscribe, StateStore, StateStoreOptions } from "./types";
import { shallowEqual } from "./utils";

interface SubscriptionEntry<T = unknown> {
  readonly selector: Selector<T>;
  readonly callback: SubscriptionCallback<T>;
  prevValue: T;
}

interface PendingChange {
  readonly selector: Selector<unknown>;
  readonly prev: unknown;
  next: unknown;
}

/**
 * Internal StateStore implementation.
 */
class StateStoreImpl implements StateStore {
  private readonly baseAccessor: StateAccessor;
  private readonly subscriptions = new Map<string, Set<SubscriptionEntry>>();
  private readonly batched: boolean;
  private readonly skipInitialCall: boolean;
  private pending: Map<string, PendingChange> | null = null;
  private disposed = false;

  /** Wrapped accessor that triggers change detection on setState. */
  public readonly accessor: StateAccessor;

  constructor(baseAccessor: StateAccessor, options: StateStoreOptions = {}) {
    this.baseAccessor = baseAccessor;
    this.batched = options.batched ?? false;
    this.skipInitialCall = options.skipInitialCall ?? false;

    if (this.batched) {
      this.pending = new Map();
    }

    // Create wrapped accessor that intercepts setState
    this.accessor = {
      getState: baseAccessor.getState,
      setState: (next: GameState): void => {
        const prev = baseAccessor.getState();
        baseAccessor.setState(next);
        if (prev !== next) {
          this.handleStateChange(prev, next);
        }
      },
    };

    // Auto-flush on tickEnd if configured
    if (options.flushOn && this.batched) {
      options.flushOn.on("tickEnd", () => this.flush());
    }
  }

  subscribe<T>(selector: Selector<T>, callback: SubscriptionCallback<T>): Unsubscribe {
    if (this.disposed) {
      throw new Error("StateStore has been disposed");
    }

    const key = selector.key;
    let set = this.subscriptions.get(key);
    if (!set) {
      set = new Set();
      this.subscriptions.set(key, set);
    }

    const currentValue = selector(this.baseAccessor.getState());

    const entry: SubscriptionEntry<T> = {
      selector,
      callback,
      prevValue: currentValue,
    };

    set.add(entry as SubscriptionEntry);

    // Fire initial callback unless skipInitialCall is set
    if (!this.skipInitialCall) {
      callback(currentValue, currentValue);
    }

    return (): void => {
      set?.delete(entry as SubscriptionEntry);
      if (set?.size === 0) {
        this.subscriptions.delete(key);
      }
    };
  }

  get<T>(selector: Selector<T>): T {
    return selector(this.baseAccessor.getState());
  }

  flush(): void {
    if (!this.batched || !this.pending) return;

    for (const [key, { prev, next }] of this.pending) {
      const entries = this.subscriptions.get(key);
      if (entries) {
        for (const entry of entries) {
          entry.callback(next, prev);
          entry.prevValue = next;
        }
      }
    }
    this.pending.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.subscriptions.clear();
    this.pending?.clear();
  }

  private handleStateChange(prev: GameState, next: GameState): void {
    for (const [key, entries] of this.subscriptions) {
      if (entries.size === 0) continue;

      // Get the selector from first entry (all entries for same key use same selector)
      const firstEntry = entries.values().next().value;
      if (!firstEntry) continue;

      const selector = firstEntry.selector;
      const prevValue = selector(prev);
      const nextValue = selector(next);

      if (!shallowEqual(prevValue, nextValue)) {
        if (this.batched && this.pending) {
          // Store for batch processing - keep first prev, update to latest next
          const existing = this.pending.get(key);
          if (existing) {
            existing.next = nextValue;
          } else {
            this.pending.set(key, {
              selector,
              prev: prevValue,
              next: nextValue,
            });
          }
        } else {
          // Immediate notification
          for (const entry of entries) {
            entry.callback(nextValue, entry.prevValue);
            entry.prevValue = nextValue;
          }
        }
      }
    }
  }
}

/**
 * Result of createStateStore, including both the StateStore and the wrapped accessor.
 */
export interface StateStoreResult extends StateStore {
  /**
   * Wrapped StateAccessor that triggers change detection.
   * Use this accessor in place of the original to enable reactive subscriptions.
   */
  readonly accessor: StateAccessor;
}

/**
 * Creates a reactive StateStore that wraps a StateAccessor.
 *
 * The returned store provides:
 * - `subscribe()` to watch for state changes via selectors
 * - `get()` to read current values without subscribing
 * - `flush()` for batched mode to trigger pending notifications
 * - `accessor` - wrapped StateAccessor that triggers change detection
 *
 * @example
 * ```typescript
 * const store = createStateStore(accessor);
 *
 * // Subscribe to gold changes
 * const unsubscribe = store.subscribe(
 *   select.resource("gold").amount,
 *   (gold, prev) => console.log(`Gold: ${prev} -> ${gold}`)
 * );
 *
 * // Use wrapped accessor for state changes
 * store.accessor.setState(newState); // Triggers subscriptions
 *
 * // Clean up
 * unsubscribe();
 * ```
 *
 * @param accessor - The StateAccessor to wrap
 * @param options - Configuration options
 * @returns StateStore with wrapped accessor
 */
export function createStateStore(
  accessor: StateAccessor,
  options?: StateStoreOptions
): StateStoreResult {
  return new StateStoreImpl(accessor, options);
}
