import { describe, it, expect, vi } from "vitest";
import {
  createStateStore,
  createSelector,
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

describe("createSelector", () => {
  it("creates a derived selector from single input", () => {
    const gold = res("gold");
    const state: GameState = {
      version: 1,
      resources: [{ id: gold, amount: q(100) }],
      generators: [],
      inventory: [],
      upgrades: [],
    };

    const selectDoubleGold = createSelector(
      [select.resource("gold").amount],
      (gold) => gold * 2
    );

    expect(selectDoubleGold(state)).toBe(200);
    expect(selectDoubleGold.key).toBe("derived:[resource:gold:amount]");
  });

  it("creates a derived selector from multiple inputs", () => {
    const gold = res("gold");
    const gems = res("gems");
    const state: GameState = {
      version: 1,
      resources: [
        { id: gold, amount: q(100) },
        { id: gems, amount: q(10) },
      ],
      generators: [],
      inventory: [],
      upgrades: [],
    };

    const selectTotalWealth = createSelector(
      [select.resource("gold").amount, select.resource("gems").amount],
      (gold, gems) => gold + gems * 100
    );

    expect(selectTotalWealth(state)).toBe(1100); // 100 + 10*100
    expect(selectTotalWealth.key).toBe("derived:[resource:gold:amount,resource:gems:amount]");
  });

  it("works with StateStore subscriptions", () => {
    const gold = res("gold");
    const gems = res("gems");
    const state: GameState = {
      version: 1,
      resources: [
        { id: gold, amount: q(100) },
        { id: gems, amount: q(10) },
      ],
      generators: [],
      inventory: [],
      upgrades: [],
    };
    const baseAccessor = createTestAccessor(state);
    const store = createStateStore(baseAccessor);

    const selectTotalWealth = createSelector(
      [select.resource("gold").amount, select.resource("gems").amount],
      (gold, gems) => gold + gems * 100
    );

    const callback = vi.fn();
    store.subscribe(selectTotalWealth, callback);

    // Initial call
    expect(callback).toHaveBeenCalledWith(1100, 1100);
    callback.mockClear();

    // Change gold
    store.accessor.setState({
      ...state,
      resources: [
        { id: gold, amount: q(200) },
        { id: gems, amount: q(10) },
      ],
    });

    expect(callback).toHaveBeenCalledWith(1200, 1100);
  });

  it("only triggers when derived value changes", () => {
    const gold = res("gold");
    const gems = res("gems");
    const state: GameState = {
      version: 1,
      resources: [
        { id: gold, amount: q(100) },
        { id: gems, amount: q(10) },
      ],
      generators: [],
      inventory: [],
      upgrades: [],
    };
    const baseAccessor = createTestAccessor(state);
    const store = createStateStore(baseAccessor, { skipInitialCall: true });

    // Selector that rounds to nearest 100
    const selectRoundedGold = createSelector(
      [select.resource("gold").amount],
      (gold) => Math.floor(gold / 100) * 100
    );

    const callback = vi.fn();
    store.subscribe(selectRoundedGold, callback);

    // Change gold from 100 to 150 - rounded value stays 100
    store.accessor.setState({
      ...state,
      resources: [
        { id: gold, amount: q(150) },
        { id: gems, amount: q(10) },
      ],
    });

    // Should not trigger because 100 === 100
    expect(callback).not.toHaveBeenCalled();

    // Change gold to 200 - rounded value changes to 200
    store.accessor.setState({
      ...baseAccessor.state,
      resources: [
        { id: gold, amount: q(200) },
        { id: gems, amount: q(10) },
      ],
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(200, 100);
  });

  it("supports up to 4 input selectors", () => {
    const gold = res("gold");
    const gems = res("gems");
    const wood = res("wood");
    const iron = res("iron");
    const state: GameState = {
      version: 1,
      resources: [
        { id: gold, amount: q(10) },
        { id: gems, amount: q(20) },
        { id: wood, amount: q(30) },
        { id: iron, amount: q(40) },
      ],
      generators: [],
      inventory: [],
      upgrades: [],
    };

    const selectTotal = createSelector(
      [
        select.resource("gold").amount,
        select.resource("gems").amount,
        select.resource("wood").amount,
        select.resource("iron").amount,
      ],
      (g1, g2, g3, g4) => g1 + g2 + g3 + g4
    );

    expect(selectTotal(state)).toBe(100);
  });
});
