import type { ResourceId, GeneratorId, UpgradeId, ItemId, TaskId } from "../../types/core";

export interface ResourceDeltaEvent {
  readonly type: "resourceDelta";
  readonly resourceId: ResourceId;
  readonly delta: number; // applied change this tick or op
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
