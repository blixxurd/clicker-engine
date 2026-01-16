import type {
  ResourceId,
  GeneratorId,
  ItemId,
  UpgradeId,
  TaskId,
  Quantity,
  RatePerSecond,
} from "./core";

/**
 * Create a branded ResourceId from a plain string.
 * @example const gold = resourceId("gold");
 */
export function resourceId(s: string): ResourceId {
  return s as unknown as ResourceId;
}

/**
 * Create a branded GeneratorId from a plain string.
 * @example const miner = generatorId("miner");
 */
export function generatorId(s: string): GeneratorId {
  return s as unknown as GeneratorId;
}

/**
 * Create a branded ItemId from a plain string.
 * @example const potion = itemId("healthPotion");
 */
export function itemId(s: string): ItemId {
  return s as unknown as ItemId;
}

/**
 * Create a branded UpgradeId from a plain string.
 * @example const boost = upgradeId("clickPower");
 */
export function upgradeId(s: string): UpgradeId {
  return s as unknown as UpgradeId;
}

/**
 * Create a branded TaskId from a plain string.
 * @example const quest = taskId("firstMiner");
 */
export function taskId(s: string): TaskId {
  return s as unknown as TaskId;
}

/**
 * Create a branded Quantity from a plain number.
 * @example const amount = qty(100);
 */
export function qty(n: number): Quantity {
  return n as unknown as Quantity;
}

/**
 * Create a branded RatePerSecond from a plain number.
 * @example const rate = rps(1.5);
 */
export function rps(n: number): RatePerSecond {
  return n as unknown as RatePerSecond;
}
