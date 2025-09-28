/** Inputs for computing geometric purchase totals. */
export interface BulkCostInput {
  /** Initial cost for the next unit. */
  readonly baseCost: number;
  /** Per-purchase multiplier (>= 1). */
  readonly growth: number;
  /** Number of units to purchase. */
  readonly count: number;
}

/** Sum of geometric series for total cost of buying `count` units. */
export function totalCost({ baseCost, growth, count }: BulkCostInput): number {
  if (count <= 0) return 0;
  if (growth === 1) return baseCost * count;
  // baseCost * (g^0 + g^1 + ... + g^(count-1)) = baseCost * (g^count - 1) / (g - 1)
  return baseCost * ((Math.pow(growth, count) - 1) / (growth - 1));
}

/** Compute maximum number of units affordable given currency, baseCost, and growth. */
export function maxAffordable(currency: number, baseCost: number, growth: number): number {
  if (currency <= 0) return 0;
  if (growth === 1) return Math.floor(currency / baseCost);
  // currency >= baseCost * (g^n - 1) / (g - 1)
  // (currency * (g - 1) / baseCost) + 1 >= g^n → n <= log_g((currency*(g-1)/baseCost)+1)
  const rhs = (currency * (growth - 1)) / baseCost + 1;
  if (rhs <= 1) return 0;
  const n = Math.floor(Math.log(rhs) / Math.log(growth));
  return Math.max(0, n);
}

/** Purchase mode: fixed count or maximum affordable. */
export type BulkMode = "1" | "10" | "100" | "max";

/** Determine purchase count for mode and compute total cost. */
export function planPurchase(mode: BulkMode, currency: number, baseCost: number, growth: number): { count: number; cost: number } {
  let count = 1;
  if (mode === "10") count = 10;
  else if (mode === "100") count = 100;
  else if (mode === "max") count = maxAffordable(currency, baseCost, growth);
  const cost = totalCost({ baseCost, growth, count });
  if (mode !== "max" && cost > currency) {
    // fallback to max affordable if requested fixed count exceeds currency
    count = maxAffordable(currency, baseCost, growth);
    return { count, cost: totalCost({ baseCost, growth, count }) };
  }
  return { count, cost };
}
