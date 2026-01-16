/**
 * Public entry point for the Idle Clicker Engine.
 *
 * The primary interface is the {@link Game} class, which orchestrates all subsystems
 * with a shared state. Advanced users can import controllers and services directly
 * for more granular control.
 */
// Core types
export type { Brand } from "./types/brand";
export type { 
  ResourceId, ItemId, TaskId, GeneratorId, UpgradeId, Quantity, RatePerSecond,
  ResourceIdLike, ItemIdLike, TaskIdLike, GeneratorIdLike, UpgradeIdLike, QuantityLike, RatePerSecondLike
} from "./types/core";
export type { GameState } from "./model/gameState";

// Type helper functions for creating branded types without casting
export {
  resourceId,
  generatorId,
  itemId,
  upgradeId,
  taskId,
  qty,
  rps,
} from "./types/helpers";

// Tick services and controllers
export { TickService } from "./service/TickService";
export { TickRunner } from "./controller/TickRunner";

// Events
export type { EngineEvent, ResourceDeltaEvent, GeneratorPurchaseEvent, UpgradeAppliedEvent, InventoryAddedEvent, InventoryConsumedEvent, TickStartEvent, TickEndEvent, TaskUnlockedEvent, TaskCompletedEvent, TaskClaimedEvent } from "./core/EventBus";
export type { EventBus } from "./core/EventBus";
export { createEventBus } from "./core/EventBus";

// Loop adapters
export { createFixedStepLoop, type FixedStepLoop, type FixedStepLoopOptions, type Tickable } from "./adapters/loop/fixedStep";

// Model types
export type { ResourceDefinition, ResourceState } from "./model/resource";
export type { GeneratorDefinition, GeneratorState, GeneratorOutput } from "./model/generator";
export type { ItemDefinition, InventoryEntry } from "./model/item";
export type { UpgradeDefinition, Modifier, ModifierScope, UpgradeState } from "./model/upgrade";
export type { TaskDefinition, TaskInstance, TaskRequirement, TaskReward } from "./model/task";

// Inventory
export { InventoryManager } from "./controller/InventoryManager";
export { InventoryService } from "./service/InventoryService";

// Economy service
export { EconomyService } from "./service/EconomyService";

// Formatting / math
export * as formatting from "./core/formatting/short";
export { formatShort } from "./core/formatting/short";
export * as bulk from "./core/math/bulk";

// Registries
export type { Registries, ResourceRegistry, GeneratorRegistry, ItemRegistry, UpgradeRegistry, TaskRegistry } from "./repo/registries";
export { createInMemoryResourceRegistry, createInMemoryGeneratorRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, createInMemoryTaskRegistry } from "./repo/registries";

// Persistence
export { CURRENT_SCHEMA_VERSION, MIN_SUPPORTED_VERSION, serialize, parse, applyOfflineProgress, parseWithOffline, parseWithMigrationInfo, createMigrationRegistry } from "./core/persistence";
export type { ParseWithMigrationResult, MigrationResult, VersionedSave, Migration, ErasedMigration } from "./core/persistence";
export { PersistenceError, InvalidJsonError, ValidationError, UnsupportedVersionError, MigrationPathError, MigrationError } from "./errors/PersistenceError";
export {
  EconomyError,
  InsufficientResourceError,
  GeneratorNotFoundError,
  ItemNotFoundError,
  ResourceNotFoundError,
  UpgradeNotFoundError,
  InvalidQuantityError,
} from "./errors/EconomyError";

// Controllers
export { Economy, type BuyGeneratorArgs, type ApplyUpgradeArgs, type SellResourceArgs, type SellItemsArgs, type GrantResourceArgs, type ConsumeResourceArgs } from "./controller/Economy";
export { TaskManager } from "./controller/TaskManager";
export { TaskService } from "./service/TaskService";
export type { StateAccessor } from "./controller/StateAccessor";
export { PersistenceManager, SystemClock, type Clock } from "./controller/PersistenceManager";

// Reactive state subscriptions
export { select, createSelector, createStateStore, shallowEqual } from "./reactive";
export type {
  Selector,
  SubscriptionCallback,
  Unsubscribe,
  StateStore,
  StateStoreOptions,
  StateStoreResult,
  ResourceSelector,
  GeneratorSelector,
  InventorySelector,
  UpgradeSelector,
  TaskSelector,
} from "./reactive";

// Main entry point
export { Game } from "./controller/Game";
