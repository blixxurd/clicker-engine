import type { GameState } from "../model/gameState";
import { TickRunner } from "./TickRunner";
import type { Registries } from "../repo/registries";
import type { EngineEvent, EventBus } from "../core/EventBus";
import { Economy } from "./Economy";
import type { BuyGeneratorArgs, ApplyUpgradeArgs } from "./Economy";
import { InventoryManager } from "./InventoryManager";
import { createEventBus } from "../core/EventBus";
import { TaskManager } from "./TaskManager";
import type { ItemId } from "../types/core";
import type { TaskInstance } from "../model/task";
import type { StateAccessor } from "./StateAccessor";

/**
 * Engine is a thin imperative shell around pure services.
 * It holds the current immutable state and advances it via {@link step}.
 */
export class Engine {
  private _state: GameState;
  private readonly registries: Registries;
  private readonly bus: EventBus;
  private readonly tickRunner: TickRunner;
  private readonly economy: Economy;
  private readonly inventory: InventoryManager;
  private readonly tasks: TaskManager;
  private readonly stateAccessor: StateAccessor;

  /**
   * Create a new Engine.
   * @param initialState - Initial immutable game state.
   * @param registries - Resource/generator/item/upgrade registries.
   */
  public constructor(initialState: GameState, registries: Registries) {
    this._state = initialState;
    this.registries = registries;
    this.bus = createEventBus();
    this.stateAccessor = {
      getState: (): GameState => this._state,
      setState: (next: GameState): void => { this._state = next; },
    };
    this.tickRunner = new TickRunner(this.stateAccessor, registries);
    this.economy = new Economy(this.stateAccessor, registries);
    this.inventory = new InventoryManager(this.stateAccessor, registries);
    this.tasks = new TaskManager(this.stateAccessor, registries);
  }

  /** Current immutable state snapshot. */
  public get state(): GameState {
    return this._state;
  }

  /** Access the event bus. */
  public get events(): EventBus {
    return this.bus;
  }

  /**
   * Advance the simulation by dt seconds.
   * @param dtSeconds - Delta time in seconds.
   */
  public step(dtSeconds: number): void {
    this.tickRunner.step(dtSeconds);
  }

  /**
   * Advance the simulation by dt seconds and publish emitted events.
   */
  public stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent> {
    const eventsTick = this.tickRunner.stepWithEvents(dtSeconds);
    const eventsTasks = this.tasks.evaluate();
    const events = [...eventsTick, ...eventsTasks];
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Buy generators; publish events. */
  public buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.buyGenerators(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Apply an upgrade; publish events. */
  public applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const events = this.economy.applyUpgrade(args);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Add items to inventory and publish an event. */
  public addItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.add(itemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Consume items from inventory and publish an event. */
  public consumeItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent> {
    const events = this.inventory.consume(itemId, count);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Claim a task; publish events. */
  public claimTask(taskId: TaskInstance["id"]): ReadonlyArray<EngineEvent> {
    const events = this.tasks.claim(taskId);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
}


