import type { GameState } from "../model/gameState";
import { tick } from "../service/tick";
import type { Registries } from "../repo/registries";
import { tickWithEvents } from "../service/tickEvents";
import type { EngineEvent } from "../core/events/types";
import { buyGenerator, type BuyGeneratorArgs } from "../service/generators";
import { applyUpgrade, type ApplyUpgradeArgs } from "../service/upgrades";
import { add as invAdd, consume as invConsume } from "../service/inventory";
import type { EventBus } from "../core/events/bus";
import { createEventBus } from "../core/events/bus";
import { evaluateTasks, claimTask as svcClaimTask } from "../service/tasks";

/**
 * Engine is a thin imperative shell around pure services.
 * It holds the current immutable state and advances it via {@link step}.
 */
export class Engine {
  private _state: GameState;
  private readonly registries: Registries;
  private readonly bus: EventBus;

  /**
   * Create a new Engine.
   * @param initialState - Initial immutable game state.
   * @param registries - Resource/generator/item/upgrade registries.
   */
  public constructor(initialState: GameState, registries: Registries) {
    this._state = initialState;
    this.registries = registries;
    this.bus = createEventBus();
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
    this._state = tick(this._state, dtSeconds, this.registries);
  }

  /**
   * Advance the simulation by dt seconds and publish emitted events.
   */
  public stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent> {
    const prod = tickWithEvents(this._state, dtSeconds, this.registries);
    this._state = prod.state;
    const taskEval = evaluateTasks(this._state, this.registries);
    this._state = taskEval.state;
    const events = [...prod.events, ...taskEval.events];
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Buy generators; publish events. */
  public buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const { state, events } = buyGenerator(this._state, args, this.registries);
    this._state = state;
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Apply an upgrade; publish events. */
  public applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const { state, events } = applyUpgrade(this._state, args);
    this._state = state;
    events.forEach((e) => this.bus.emit(e));
    return events;
  }

  /** Add items to inventory and publish an event. */
  public addItems(itemId: Parameters<typeof invAdd>[1], count: number): ReadonlyArray<EngineEvent> {
    const nextInv = invAdd(this._state.inventory, itemId, count, this.registries.items);
    this._state = { ...this._state, inventory: nextInv } as GameState;
    const ev = { type: "inventoryAdded", itemId, count } as EngineEvent;
    this.bus.emit(ev);
    return [ev];
  }

  /** Consume items from inventory and publish an event. */
  public consumeItems(itemId: Parameters<typeof invConsume>[1], count: number): ReadonlyArray<EngineEvent> {
    const prev = this._state.inventory;
    const nextInv = invConsume(prev, itemId, count);
    const actuallyConsumed = prev.reduce((acc, e, i) => acc + (e.id === itemId ? e.count - (nextInv[i]?.count ?? 0) : 0), 0);
    this._state = { ...this._state, inventory: nextInv } as GameState;
    if (actuallyConsumed > 0) {
      const ev = { type: "inventoryConsumed", itemId, count: actuallyConsumed } as EngineEvent;
      this.bus.emit(ev);
      return [ev];
    }
    return [];
  }

  /** Claim a task; publish events. */
  public claimTask(taskId: Parameters<typeof svcClaimTask>[1]): ReadonlyArray<EngineEvent> {
    const { state, events } = svcClaimTask(this._state, taskId, this.registries);
    this._state = state;
    events.forEach((e) => this.bus.emit(e));
    return events;
  }
}


