import { describe, it, expect, vi } from "vitest";
import {
  createStateStore,
  select,
  type GameState,
  type StateAccessor,
  type ResourceId,
  type Quantity,
} from "../../../src";

const res = (s: string): ResourceId => s as unknown as ResourceId;
const q = (n: number): Quantity => n as unknown as Quantity;

function createTestAccessor(initialState: GameState): StateAccessor & { state: GameState } {
  const accessor = {
    state: initialState,
    getState: (): GameState => accessor.state,
    setState: (next: GameState): void => { accessor.state = next; },
  };
  return accessor;
}

describe("StateStore", () => {
  describe("subscribe()", () => {
    it("calls callback immediately with current value when subscribed", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(100, 100);
    });

    it("calls callback when selected value changes", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);
      callback.mockClear();

      // Change state via wrapped accessor
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(150) }],
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(150, 100);
    });

    it("does not call callback when unrelated state changes", () => {
      const gold = res("gold");
      const gems = res("gems");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }, { id: gems, amount: q(50) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);
      callback.mockClear();

      // Change gems, not gold
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(100) }, { id: gems, amount: q(75) }],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("stops calling callback after unsubscribe", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback = vi.fn();
      const unsubscribe = store.subscribe(select.resource("gold").amount, callback);
      callback.mockClear();

      unsubscribe();

      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("handles multiple subscribers to same selector", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      store.subscribe(select.resource("gold").amount, callback1);
      store.subscribe(select.resource("gold").amount, callback2);
      callback1.mockClear();
      callback2.mockClear();

      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      expect(callback1).toHaveBeenCalledWith(200, 100);
      expect(callback2).toHaveBeenCalledWith(200, 100);
    });

    it("skips initial callback when skipInitialCall is true", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor, { skipInitialCall: true });

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      expect(callback).not.toHaveBeenCalled();

      // But still fires on change
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("get()", () => {
    it("returns current value without subscribing", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const value = store.get(select.resource("gold").amount);

      expect(value).toBe(100);
    });
  });

  describe("dispose()", () => {
    it("removes all subscriptions", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);
      callback.mockClear();

      store.dispose();

      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("throws when subscribing after dispose", () => {
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      store.dispose();

      expect(() => {
        store.subscribe(select.resource("gold").amount, vi.fn());
      }).toThrow("StateStore has been disposed");
    });
  });
});
