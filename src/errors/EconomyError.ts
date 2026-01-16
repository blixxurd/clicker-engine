import type { ResourceId, GeneratorId, ItemId, UpgradeId } from "../types/core";

/** Base class for economy-related errors with stable names for discrimination. */
export class EconomyError extends Error {
  public override name = "EconomyError";
  public constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an operation requires more resources than available. */
export class InsufficientResourceError extends EconomyError {
  public override name = "InsufficientResourceError";
  public readonly resourceId: string;
  public readonly required: number;
  public readonly available: number;

  public constructor(
    resourceId: ResourceId | string,
    required: number,
    available: number
  ) {
    super(
      `Insufficient ${resourceId}: required ${required}, available ${available}`
    );
    this.resourceId = resourceId as string;
    this.required = required;
    this.available = available;
  }
}

/** Thrown when referencing a generator that does not exist in the registry. */
export class GeneratorNotFoundError extends EconomyError {
  public override name = "GeneratorNotFoundError";
  public readonly generatorId: string;

  public constructor(generatorId: GeneratorId | string) {
    super(`Generator not found: ${generatorId}`);
    this.generatorId = generatorId as string;
  }
}

/** Thrown when referencing an item that does not exist in the registry. */
export class ItemNotFoundError extends EconomyError {
  public override name = "ItemNotFoundError";
  public readonly itemId: string;

  public constructor(itemId: ItemId | string) {
    super(`Item not found: ${itemId}`);
    this.itemId = itemId as string;
  }
}

/** Thrown when referencing a resource that does not exist in state. */
export class ResourceNotFoundError extends EconomyError {
  public override name = "ResourceNotFoundError";
  public readonly resourceId: string;

  public constructor(resourceId: ResourceId | string) {
    super(`Resource not found: ${resourceId}`);
    this.resourceId = resourceId as string;
  }
}

/** Thrown when referencing an upgrade that does not exist in the registry. */
export class UpgradeNotFoundError extends EconomyError {
  public override name = "UpgradeNotFoundError";
  public readonly upgradeId: string;

  public constructor(upgradeId: UpgradeId | string) {
    super(`Upgrade not found: ${upgradeId}`);
    this.upgradeId = upgradeId as string;
  }
}

/** Thrown when passing an invalid quantity (negative, NaN, etc.). */
export class InvalidQuantityError extends EconomyError {
  public override name = "InvalidQuantityError";
  public readonly value: number;
  public readonly reason: string;

  public constructor(value: number, reason: string = "Invalid quantity") {
    super(`${reason}: ${value}`);
    this.value = value;
    this.reason = reason;
  }
}
