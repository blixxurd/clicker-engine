import type { Quantity, ResourceId } from "../types/core";

/** Resource definition (static, not saved in state). */
export interface ResourceDefinition {
  readonly id: ResourceId;
  readonly hasCapacity?: boolean;
}

export interface ResourceState {
  readonly id: ResourceId;
  readonly amount: Quantity;
  readonly capacity?: Quantity;
}
