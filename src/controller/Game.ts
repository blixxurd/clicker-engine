import type { GameState } from "../model/gameState";
import type { Registries } from "../repo/registries";
import type { StateAccessor } from "./StateAccessor";
import { createEventBus, type EventBus, type EngineEvent } from "../core/EventBus";
import { InventoryManager } from "./InventoryManager";
import { TaskManager } from "./TaskManager";
import { Economy } from "./Economy";
import type { BuyGeneratorArgs, ApplyUpgradeArgs } from "./Economy";
import { TickRunner } from "./TickRunner";
import { Engine } from "./Engine";
import type { ItemId } from "../types/core";
import type { TaskInstance } from "../model/task";
import { PersistenceManager, SystemClock, type Clock } from "./PersistenceManager";

/** Game-scoped context bundling state, bus, and domain managers. */
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

  /** Create an Engine bound to this Game's state and registries. */
  public createEngine(): Engine {
    return new Engine(this.accessor.getState(), this['registriesForEngine']());
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
  public claimTask(taskId: TaskInstance["id"]): ReadonlyArray<EngineEvent> {
    const events = this.tasks.claim(taskId);
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  // Expose registries to Engine creation without widening public API
  private registriesForEngine(): Registries {
    // Reconstruct registries references from subsystems (they all share the same ref)
    return (this.tick as unknown as { registries: Registries }).registries;
  }
}


