import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { StateAccessor } from "./StateAccessor";
import { createEventBus, type EventBus, type EngineEvent } from "../core/EventBus";
import { InventoryManager } from "./InventoryManager";
import { TaskManager } from "./TaskManager";
import { Economy } from "./Economy";
import type { BuyGeneratorArgs, ApplyUpgradeArgs, SellResourceArgs, SellItemsArgs, GrantResourceArgs, ConsumeResourceArgs } from "../service/EconomyService";
import { TickRunner } from "./TickRunner";
import type { ItemIdLike, TaskIdLike, ItemId, TaskId, ResourceId } from "../types/core";
import { PersistenceManager, SystemClock, type Clock } from "./PersistenceManager";
import { createStateStore, type StateStoreResult, type StateStoreOptions } from "../reactive";

/**
 * Game-scoped façade bundling state, event bus, and domain subsystems.
 *
 * Primary high-level entrypoint for host apps. It wires up subsystems with a shared
 * `StateAccessor`, enabling simple one-stop interactions (ticks, economy, inventory, tasks,
 * persistence). For direct access to individual controllers, instantiate them separately
 * with your own StateAccessor and Registries.
 */
export class Game {
  public readonly accessor: StateAccessor;
  public readonly bus: EventBus;
  /**
   * Reactive state store for subscribing to specific state value changes.
   *
   * @example
   * ```typescript
   * import { select } from "@fidget/idle-engine";
   *
   * // Subscribe to gold amount changes
   * game.store.subscribe(
   *   select.resource("gold").amount,
   *   (gold, prev) => console.log(`Gold: ${prev} -> ${gold}`)
   * );
   * ```
   */
  public readonly store: StateStoreResult;
  public readonly inventory: InventoryManager;
  public readonly tasks: TaskManager;
  public readonly economy: Economy;
  public readonly tick: TickRunner;
  public readonly persistence: PersistenceManager;

  public constructor(
    initialState: GameState,
    registries: Registries,
    clock: Clock = new SystemClock(),
    storeOptions?: StateStoreOptions
  ) {
    let state = initialState;
    const baseAccessor: StateAccessor = {
      getState: (): GameState => state,
      setState: (next: GameState): void => { state = next; },
    };

    this.bus = createEventBus();

    // Create reactive store, wrapping the accessor
    this.store = createStateStore(baseAccessor, storeOptions);
    // Use wrapped accessor so state changes trigger subscriptions
    this.accessor = this.store.accessor;

    this.inventory = new InventoryManager(this.accessor, registries);
    this.tasks = new TaskManager(this.accessor, registries);
    this.economy = new Economy(this.accessor, registries);
    this.tick = new TickRunner(this.accessor, registries);
    this.persistence = new PersistenceManager(this.accessor, registries, clock);
  }

  // Optional single-touchpoint forwards
  public step(dtSeconds: number): void {
    this.tick.step(dtSeconds);
  }
  public stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent> {
    const eventsTick = this.tick.stepWithEvents(dtSeconds);
    const eventsTasks = this.tasks.evaluate();
    const events = [...eventsTick, ...eventsTasks];
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.buyGenerators(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.applyUpgrade(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public sellResource(args: SellResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.sellResource(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public sellItems(args: SellItemsArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.sellItems(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public grantResource(args: GrantResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.grantResource(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public addItems(itemId: ItemIdLike, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.add(itemId as ItemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public consumeItems(itemId: ItemIdLike, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.consume(itemId as ItemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public consumeResource(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.consumeResource(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  // ============================================================================
  // Throwing variants - throw typed errors instead of silent no-op
  // ============================================================================

  /**
   * Buy generators or throw if operation cannot complete.
   * @throws GeneratorNotFoundError, ResourceNotFoundError, InsufficientResourceError
   */
  public buyGeneratorsOrThrow(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.buyGeneratorsOrThrow(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /**
   * Apply upgrade or throw if operation cannot complete.
   * @throws ResourceNotFoundError, InsufficientResourceError
   */
  public applyUpgradeOrThrow(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.applyUpgradeOrThrow(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /**
   * Grant resource or throw if operation cannot complete.
   * @throws ResourceNotFoundError, InvalidQuantityError
   */
  public grantResourceOrThrow(args: GrantResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.grantResourceOrThrow(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /**
   * Consume resource or throw if operation cannot complete.
   * @throws ResourceNotFoundError, InvalidQuantityError, InsufficientResourceError
   */
  public consumeResourceOrThrow(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.consumeResourceOrThrow(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  public claimTask(taskId: TaskIdLike): ReadonlyArray<EngineEvent> {
    const events = this.tasks.claim(taskId as TaskId);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /**
   * Query current production rates for all resources.
   * Returns a map of resource IDs to production rates per second.
   * Useful for displaying "X/sec" statistics in UI.
   */
  public getProductionRates(): Map<ResourceId, number> {
    return this.tick.getProductionRates();
  }

}


