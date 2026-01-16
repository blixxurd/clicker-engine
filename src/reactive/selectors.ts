import type { GameState } from "../model/gameState";
import type { ResourceState } from "../model/resource";
import type { GeneratorState } from "../model/generator";
import type { InventoryEntry } from "../model/item";
import type { UpgradeState } from "../model/upgrade";
import type { TaskInstance, TaskStatus } from "../model/task";
import type {
  ResourceIdLike,
  GeneratorIdLike,
  ItemIdLike,
  UpgradeIdLike,
  TaskIdLike,
} from "../types/core";
import type { Selector } from "./types";

/**
 * Creates a selector with an attached unique key for subscription deduplication.
 */
function createSelectorWithKey<T>(key: string, fn: (state: GameState) => T): Selector<T> {
  const selector = fn as Selector<T>;
  Object.defineProperty(selector, "key", { value: key, writable: false });
  return selector;
}

/**
 * Selector for a specific resource, with chainable property accessors.
 */
export interface ResourceSelector extends Selector<ResourceState | undefined> {
  /** Select just the resource amount (returns 0 if resource not found). */
  readonly amount: Selector<number>;
  /** Select just the resource capacity (returns undefined if not set). */
  readonly capacity: Selector<number | undefined>;
}

/**
 * Selector for a specific generator, with chainable property accessors.
 */
export interface GeneratorSelector extends Selector<GeneratorState | undefined> {
  /** Select just the owned count (returns 0 if generator not found). */
  readonly owned: Selector<number>;
}

/**
 * Selector for a specific inventory item, with chainable property accessors.
 */
export interface InventorySelector extends Selector<InventoryEntry | undefined> {
  /** Select just the item count (returns 0 if item not found). */
  readonly count: Selector<number>;
}

/**
 * Selector for a specific upgrade, with chainable property accessors.
 */
export interface UpgradeSelector extends Selector<UpgradeState | undefined> {
  /** Select just the upgrade level (returns 0 if upgrade not found). */
  readonly level: Selector<number>;
}

/**
 * Selector for a specific task, with chainable property accessors.
 */
export interface TaskSelector extends Selector<TaskInstance | undefined> {
  /** Select just the task status (returns undefined if task not found). */
  readonly status: Selector<TaskStatus | undefined>;
}

function createResourceSelector(id: ResourceIdLike): ResourceSelector {
  const key = `resource:${id}`;

  const base = createSelectorWithKey(key, (state: GameState): ResourceState | undefined => {
    return state.resources.find((r) => r.id === id);
  });

  const amount = createSelectorWithKey(`${key}:amount`, (state: GameState): number => {
    const r = state.resources.find((res) => res.id === id);
    return r ? (r.amount as number) : 0;
  });

  const capacity = createSelectorWithKey(
    `${key}:capacity`,
    (state: GameState): number | undefined => {
      const r = state.resources.find((res) => res.id === id);
      return r?.capacity as number | undefined;
    }
  );

  return Object.assign(base, { amount, capacity }) as ResourceSelector;
}

function createGeneratorSelector(id: GeneratorIdLike): GeneratorSelector {
  const key = `generator:${id}`;

  const base = createSelectorWithKey(key, (state: GameState): GeneratorState | undefined => {
    return state.generators.find((g) => g.id === id);
  });

  const owned = createSelectorWithKey(`${key}:owned`, (state: GameState): number => {
    const g = state.generators.find((gen) => gen.id === id);
    return g?.owned ?? 0;
  });

  return Object.assign(base, { owned }) as GeneratorSelector;
}

function createInventorySelector(id: ItemIdLike): InventorySelector {
  const key = `inventory:${id}`;

  const base = createSelectorWithKey(key, (state: GameState): InventoryEntry | undefined => {
    return state.inventory.find((i) => i.id === id);
  });

  const count = createSelectorWithKey(`${key}:count`, (state: GameState): number => {
    const i = state.inventory.find((inv) => inv.id === id);
    return i?.count ?? 0;
  });

  return Object.assign(base, { count }) as InventorySelector;
}

function createUpgradeSelector(id: UpgradeIdLike): UpgradeSelector {
  const key = `upgrade:${id}`;

  const base = createSelectorWithKey(key, (state: GameState): UpgradeState | undefined => {
    return state.upgrades.find((u) => u.id === id);
  });

  const level = createSelectorWithKey(`${key}:level`, (state: GameState): number => {
    const u = state.upgrades.find((upg) => upg.id === id);
    return u?.level ?? 0;
  });

  return Object.assign(base, { level }) as UpgradeSelector;
}

function createTaskSelector(id: TaskIdLike): TaskSelector {
  const key = `task:${id}`;

  const base = createSelectorWithKey(key, (state: GameState): TaskInstance | undefined => {
    return state.tasks?.find((t) => t.id === id);
  });

  const status = createSelectorWithKey(
    `${key}:status`,
    (state: GameState): TaskStatus | undefined => {
      const t = state.tasks?.find((task) => task.id === id);
      return t?.status;
    }
  );

  return Object.assign(base, { status }) as TaskSelector;
}

/**
 * Selector factory for creating type-safe state selectors.
 *
 * @example
 * ```typescript
 * // Subscribe to gold amount changes
 * store.subscribe(select.resource("gold").amount, (gold) => {
 *   console.log("Gold is now:", gold);
 * });
 *
 * // Subscribe to full generator state
 * store.subscribe(select.generator("miner"), (gen) => {
 *   if (gen) console.log("Miner owned:", gen.owned);
 * });
 * ```
 */
export const select = {
  /** Select a resource by ID. */
  resource: createResourceSelector,

  /** Select a generator by ID. */
  generator: createGeneratorSelector,

  /** Select an inventory item by ID. */
  inventory: createInventorySelector,

  /** Select an upgrade by ID. */
  upgrade: createUpgradeSelector,

  /** Select a task by ID. */
  task: createTaskSelector,

  /** Select all resources as a readonly array. */
  resources: (): Selector<ReadonlyArray<ResourceState>> =>
    createSelectorWithKey("resources:all", (state) => state.resources),

  /** Select all generators as a readonly array. */
  generators: (): Selector<ReadonlyArray<GeneratorState>> =>
    createSelectorWithKey("generators:all", (state) => state.generators),

  /** Select all inventory entries as a readonly array. */
  inventoryAll: (): Selector<ReadonlyArray<InventoryEntry>> =>
    createSelectorWithKey("inventory:all", (state) => state.inventory),

  /** Select all upgrades as a readonly array. */
  upgrades: (): Selector<ReadonlyArray<UpgradeState>> =>
    createSelectorWithKey("upgrades:all", (state) => state.upgrades),

  /** Select all task instances as a readonly array. */
  tasks: (): Selector<ReadonlyArray<TaskInstance>> =>
    createSelectorWithKey("tasks:all", (state) => state.tasks ?? []),
};
