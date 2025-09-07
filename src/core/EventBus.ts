import type { ResourceId, GeneratorId, UpgradeId, ItemId, TaskId } from "../types/core";

// Domain event types
export interface ResourceDeltaEvent {
  readonly type: "resourceDelta";
  readonly resourceId: ResourceId;
  readonly delta: number;
}

export interface GeneratorPurchaseEvent {
  readonly type: "generatorPurchase";
  readonly generatorId: GeneratorId;
  readonly count: number;
  readonly costResourceId: ResourceId;
  readonly cost: number;
}

export interface UpgradeAppliedEvent {
  readonly type: "upgradeApplied";
  readonly upgradeId: UpgradeId;
  readonly newLevel: number;
  readonly costResourceId: ResourceId;
  readonly cost: number;
}

export interface InventoryAddedEvent {
  readonly type: "inventoryAdded";
  readonly itemId: ItemId;
  readonly count: number;
}

export interface InventoryConsumedEvent {
  readonly type: "inventoryConsumed";
  readonly itemId: ItemId;
  readonly count: number;
}

export interface TickStartEvent {
  readonly type: "tickStart";
  readonly dtSeconds: number;
}

export interface TickEndEvent {
  readonly type: "tickEnd";
  readonly dtSeconds: number;
}

export interface TaskUnlockedEvent {
  readonly type: "taskUnlocked";
  readonly taskId: TaskId;
}

export interface TaskCompletedEvent {
  readonly type: "taskCompleted";
  readonly taskId: TaskId;
  readonly repeatIndex?: number;
}

export interface TaskClaimedEvent {
  readonly type: "taskClaimed";
  readonly taskId: TaskId;
}

export type EngineEvent =
  | ResourceDeltaEvent
  | GeneratorPurchaseEvent
  | UpgradeAppliedEvent
  | InventoryAddedEvent
  | InventoryConsumedEvent
  | TickStartEvent
  | TickEndEvent
  | TaskUnlockedEvent
  | TaskCompletedEvent
  | TaskClaimedEvent;

// EventBus API
export interface EventBus {
  on<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void;
  off<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void;
  emit(event: EngineEvent): void;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<EngineEvent["type"], Set<(e: EngineEvent) => void>>();

  public on<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as (e: EngineEvent) => void);
  }

  public off<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void {
    this.handlers.get(type)?.delete(handler as (e: EngineEvent) => void);
  }

  public emit(event: EngineEvent): void {
    this.handlers.get(event.type)?.forEach((h) => h(event));
  }
}

export function createEventBus(): EventBus {
  return new InMemoryEventBus();
}


