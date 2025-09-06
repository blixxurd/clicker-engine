import { describe, it, expect } from "vitest";
import { planPurchase, totalCost, maxAffordable } from "../../src/core/math/bulk";

describe("bulk math", () => {
  it("totalCost geometric matches closed form", () => {
    expect(totalCost({ baseCost: 10, growth: 1, count: 5 })).toBe(50);
    // base 10, growth 1.1, count 3 → 10*(1 + 1.1 + 1.21) = 10*3.31 = 33.1
    expect(totalCost({ baseCost: 10, growth: 1.1, count: 3 })).toBeCloseTo(33.1, 9);
  });
  it("maxAffordable computes correct n", () => {
    expect(maxAffordable(100, 10, 1)).toBe(10);
    // currency 33.1 with base 10 growth 1.1 buys 3
    expect(maxAffordable(33.1, 10, 1.1)).toBe(3);
  });
  it("planPurchase modes and fallback", () => {
    const currency = 25;
    const base = 10;
    const g = 1.1;
    // 1
    expect(planPurchase("1", currency, base, g).count).toBe(1);
    // 10 exceeds currency, fallback to max
    expect(planPurchase("10", currency, base, g).count).toBe(maxAffordable(currency, base, g));
    // max
    expect(planPurchase("max", currency, base, g).count).toBe(maxAffordable(currency, base, g));
  });
});
