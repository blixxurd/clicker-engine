import type { TaskId, ResourceId, ItemId, GeneratorId, Quantity } from "../types/core";

/** Conditions required to activate a task instance. */
export type TaskRequirement =
  | { readonly kind: "resourceAtLeast"; readonly resourceId: ResourceId; readonly amount: Quantity }
  | { readonly kind: "itemAtLeast"; readonly itemId: ItemId; readonly count: number }
  | { readonly kind: "generatorAtLeast"; readonly generatorId: GeneratorId; readonly owned: number };

/** Rewards granted when a task is claimed. */
export type TaskReward =
  | { readonly kind: "grantResource"; readonly resourceId: ResourceId; readonly amount: Quantity }
  | { readonly kind: "grantItem"; readonly itemId: ItemId; readonly count: number };

/** Static task definition. */
export interface TaskDefinition {
  readonly id: TaskId;
  readonly label?: string;
  readonly category?: "task" | "quest";
  readonly requirements: ReadonlyArray<TaskRequirement>;
  readonly rewards: ReadonlyArray<TaskReward>;
  readonly repeatable?: boolean;
  readonly cooldownSeconds?: number;
}

/** Lifecycle status of a task instance. */
export type TaskStatus = "locked" | "active" | "completed";

/** Dynamic task instance tracked in state. */
export interface TaskInstance {
  readonly id: TaskId;
  readonly status: TaskStatus;
  readonly repeatIndex?: number;
  readonly cooldownRemainingSeconds?: number;
}
