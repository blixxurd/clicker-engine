// export type { Brand } from "./types/brand";
// export type { ResourceId, ItemId, TaskId, GeneratorId, UpgradeId, Quantity, RatePerSecond, Result, Ok, Err } from "./types/core";
// export { ok, err } from "./types/core";
// export { assert } from "./utils/assert";
// export type { GameState } from "./model/gameState";
// import { TickService as _TickService } from "./service/TickService";
// export { TickService } from "./service/TickService";
// export const tick = _TickService.tick;
// export const tickWithEvents = _TickService.tickWithEvents;
// export { TickRunner } from "./controller/TickRunner";
// export { Engine } from "./controller/Engine";
// // TickEventsProcessor merged into TickRunner
// export type { EngineEvent, ResourceDeltaEvent, GeneratorPurchaseEvent, UpgradeAppliedEvent, InventoryAddedEvent, InventoryConsumedEvent, TickStartEvent, TickEndEvent, TaskUnlockedEvent, TaskCompletedEvent, TaskClaimedEvent } from "./core/EventBus";
// export type { EventBus } from "./core/EventBus";
// export { createEventBus, InMemoryEventBus } from "./core/EventBus";
// export { createFixedStepLoop, type FixedStepLoop, type FixedStepLoopOptions } from "./adapters/loop/fixedStep";
// export type { ResourceDefinition, ResourceState } from "./model/resource";
// export type { GeneratorDefinition, GeneratorState, GeneratorOutput } from "./model/generator";
// export type { ItemDefinition, InventoryEntry } from "./model/item";
// export type { UpgradeDefinition, Modifier, ModifierScope, UpgradeState } from "./model/upgrade";
// export type { TaskDefinition, TaskInstance, TaskRequirement, TaskReward } from "./model/task";
// export { InventoryManager } from "./controller/InventoryManager";
// export { InventoryService } from "./service/InventoryService";
// export { InventoryService as inventory } from "./service/InventoryService";
// export * as formatting from "./core/formatting/short";
// export { formatShort } from "./core/formatting/short";
// export * as bulk from "./core/math/bulk";
// export type { Registries, ResourceRegistry, GeneratorRegistry, ItemRegistry, UpgradeRegistry, TaskRegistry } from "./repo/registries";
// export { InMemoryRegistry, RegistriesContainer } from "./repo/registries";
// export { createInMemoryResourceRegistry, createInMemoryGeneratorRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, createInMemoryTaskRegistry } from "./repo/registries";
// export { CURRENT_SCHEMA_VERSION, serialize, parse, applyOfflineProgress, parseWithOffline } from "./core/persistence";
// export { PersistenceError, InvalidJsonError, ValidationError, UnsupportedVersionError } from "./errors/PersistenceError";
// export { Economy, type BuyGeneratorArgs, type ApplyUpgradeArgs } from "./controller/Economy";
// export { TaskManager } from "./controller/TaskManager";
// // Keep legacy pure service names by forwarding to controller statics
// export { TaskService } from "./service/TaskService";
// export { TaskService as tasks } from "./service/TaskService";
// export type { StateAccessor } from "./controller/StateAccessor";
// export { PersistenceManager, SystemClock, type Clock } from "./controller/PersistenceManager";
// export { Game } from "./controller/Game";

/**
 * Public entry point.
 *
 * Consumers can import `Game` to orchestrate subsystems with a shared state,
 * or import specific controllers/services/types from their respective modules.
 */
export type { Brand } from "./types/brand";
export type { ResourceId, ItemId, TaskId, GeneratorId, UpgradeId, Quantity, RatePerSecond, Result, Ok, Err } from "./types/core";
export { ok, err } from "./types/core";
export { assert } from "./utils/assert";
export type { GameState } from "./model/gameState";

// Tick services and controllers
import { TickService as _TickService } from "./service/TickService";
export { TickService } from "./service/TickService";
export const tick = _TickService.tick;
export const tickWithEvents = _TickService.tickWithEvents;
export { TickRunner } from "./controller/TickRunner";

// Events
export type { EngineEvent, ResourceDeltaEvent, GeneratorPurchaseEvent, UpgradeAppliedEvent, InventoryAddedEvent, InventoryConsumedEvent, TickStartEvent, TickEndEvent, TaskUnlockedEvent, TaskCompletedEvent, TaskClaimedEvent } from "./core/EventBus";
export type { EventBus } from "./core/EventBus";
export { createEventBus, InMemoryEventBus } from "./core/EventBus";

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
export { InventoryService as inventory } from "./service/InventoryService";

// Formatting / math
export * as formatting from "./core/formatting/short";
export { formatShort } from "./core/formatting/short";
export * as bulk from "./core/math/bulk";

// Registries
export type { Registries, ResourceRegistry, GeneratorRegistry, ItemRegistry, UpgradeRegistry, TaskRegistry } from "./repo/registries";
export { InMemoryRegistry, RegistriesContainer } from "./repo/registries";
export { createInMemoryResourceRegistry, createInMemoryGeneratorRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, createInMemoryTaskRegistry } from "./repo/registries";

// Persistence
export { CURRENT_SCHEMA_VERSION, serialize, parse, applyOfflineProgress, parseWithOffline } from "./core/persistence";
export { PersistenceError, InvalidJsonError, ValidationError, UnsupportedVersionError } from "./errors/PersistenceError";

// Economy / tasks / state access
export { Economy, type BuyGeneratorArgs, type ApplyUpgradeArgs, type SellResourceArgs, type SellItemsArgs, type GrantResourceArgs, type ConsumeResourceArgs } from "./controller/Economy";
export { TaskManager } from "./controller/TaskManager";
export { TaskService } from "./service/TaskService";
export { TaskService as tasks } from "./service/TaskService";
export type { StateAccessor } from "./controller/StateAccessor";
export { PersistenceManager, SystemClock, type Clock } from "./controller/PersistenceManager";
export { Game } from "./controller/Game";
