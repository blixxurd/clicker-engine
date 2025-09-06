import type { TaskId, ResourceId, ItemId, GeneratorId, Quantity } from "../types/core";

export type TaskRequirement =
  | { readonly kind: "resourceAtLeast"; readonly resourceId: ResourceId; readonly amount: Quantity }
  | { readonly kind: "itemAtLeast"; readonly itemId: ItemId; readonly count: number }
  | { readonly kind: "generatorAtLeast"; readonly generatorId: GeneratorId; readonly owned: number };

export type TaskReward =
  | { readonly kind: "grantResource"; readonly resourceId: ResourceId; readonly amount: Quantity }
  | { readonly kind: "grantItem"; readonly itemId: ItemId; readonly count: number };

export interface TaskDefinition {
  readonly id: TaskId;
  readonly label?: string;
  readonly category?: "task" | "quest";
  readonly requirements: ReadonlyArray<TaskRequirement>;
  readonly rewards: ReadonlyArray<TaskReward>;
  readonly repeatable?: boolean;
  readonly cooldownSeconds?: number;
}

export type TaskStatus = "locked" | "active" | "completed";

export interface TaskInstance {
  readonly id: TaskId;
  readonly status: TaskStatus;
  readonly repeatIndex?: number;
  readonly cooldownRemainingSeconds?: number;
}
