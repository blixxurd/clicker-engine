import { describe, it, expect, vi } from "vitest";
import {
  createStateStore,
  createEventBus,
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

describe("StateStore batching", () => {
  describe("batched mode", () => {
    it("does not call callbacks until flush()", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor, { batched: true, skipInitialCall: true });

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      // Change state
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      // Callback not called yet
      expect(callback).not.toHaveBeenCalled();

      // Flush triggers callback
      store.flush();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(200, 100);
    });

    it("coalesces multiple changes between flushes", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor, { batched: true, skipInitialCall: true });

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      // Multiple changes before flush
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(150) }],
      });
      store.accessor.setState({
        ...baseAccessor.state,
        resources: [{ id: gold, amount: q(200) }],
      });
      store.accessor.setState({
        ...baseAccessor.state,
        resources: [{ id: gold, amount: q(250) }],
      });

      // Still not called
      expect(callback).not.toHaveBeenCalled();

      // Flush - should call once with first prev (100) and last next (250)
      store.flush();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(250, 100);
    });

    it("flush is a no-op when no pending changes", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor, { batched: true, skipInitialCall: true });

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      // Flush with no changes
      store.flush();
      expect(callback).not.toHaveBeenCalled();
    });

    it("auto-flushes on tickEnd when flushOn is configured", () => {
      const gold = res("gold");
      const state: GameState = {
        version: 1,
        resources: [{ id: gold, amount: q(100) }],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const bus = createEventBus();
      const store = createStateStore(baseAccessor, { batched: true, flushOn: bus, skipInitialCall: true });

      const callback = vi.fn();
      store.subscribe(select.resource("gold").amount, callback);

      // Change state
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      // Not called yet
      expect(callback).not.toHaveBeenCalled();

      // Emit tickEnd - should trigger flush
      bus.emit({ type: "tickEnd", dtSeconds: 1 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(200, 100);
    });
  });

  describe("unbatched mode (default)", () => {
    it("calls callbacks immediately on state change", () => {
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

      // Change state
      store.accessor.setState({
        ...state,
        resources: [{ id: gold, amount: q(200) }],
      });

      // Called immediately
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(200, 100);
    });

    it("flush() is a no-op in unbatched mode", () => {
      const state: GameState = {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      };
      const baseAccessor = createTestAccessor(state);
      const store = createStateStore(baseAccessor);

      // Should not throw
      store.flush();
    });
  });
});
