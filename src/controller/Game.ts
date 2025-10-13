import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { StateAccessor } from "./StateAccessor";
import { createEventBus, type EventBus, type EngineEvent } from "../core/EventBus";
import { InventoryManager } from "./InventoryManager";
import { TaskManager } from "./TaskManager";
import { Economy } from "./Economy";
import type { BuyGeneratorArgs, ApplyUpgradeArgs, SellResourceArgs, SellItemsArgs, GrantResourceArgs, ConsumeResourceArgs } from "./Economy";
import { TickRunner } from "./TickRunner";
import type { ItemId } from "../types/core";
import type { TaskInstance } from "../model/task";
import { PersistenceManager, SystemClock, type Clock } from "./PersistenceManager";

/**
 * Game-scoped façade bundling state, event bus, and domain subsystems.
 *
 * Preferred high-level entrypoint for host apps. It wires up subsystems with a shared
 * `StateAccessor`, enabling simple one-stop interactions (ticks, economy, inventory, tasks,
 * persistence). For a thinner shell, see {@link Engine}.
 */
export class Game {
  public readonly accessor: StateAccessor;
  public readonly bus: EventBus;
  public readonly inventory: InventoryManager;
  public readonly tasks: TaskManager;
  public readonly economy: Economy;
  public readonly tick: TickRunner;
  public readonly persistence: PersistenceManager;

  public constructor(initialState: GameState, registries: Registries, clock: Clock = new SystemClock()) {
    let state = initialState;
    this.accessor = {
      getState: (): GameState => state,
      setState: (next: GameState): void => { state = next; },
    };
    this.bus = createEventBus();
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
  public addItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.add(itemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public consumeItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.consume(itemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public consumeResource(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.consumeResource(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
  public claimTask(taskId: TaskInstance["id"]): ReadonlyArray<EngineEvent> {
    const events = this.tasks.claim(taskId);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

}


