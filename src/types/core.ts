import type { Brand } from "./brand";

/**
 * ID brands used internally for nominal typing safety.
 * The public API accepts both branded and plain versions for better DX.
 */
export type ResourceId = Brand<string, "ResourceId">;
export type ItemId = Brand<string, "ItemId">;
export type TaskId = Brand<string, "TaskId">;
export type GeneratorId = Brand<string, "GeneratorId">;
export type UpgradeId = Brand<string, "UpgradeId">;

/**
 * Flexible ID types that accept both branded and plain versions.
 * Use these for public API parameters.
 */
export type ResourceIdLike = ResourceId | string;
export type ItemIdLike = ItemId | string;
export type TaskIdLike = TaskId | string;
export type GeneratorIdLike = GeneratorId | string;
export type UpgradeIdLike = UpgradeId | string;

/** Numeric brands for domain-specific quantities. */
export type Quantity = Brand<number, "Quantity">;
export type RatePerSecond = Brand<number, "RatePerSecond">;

/**
 * Flexible numeric types that accept both branded and plain versions.
 * Use these for public API parameters.
 */
export type QuantityLike = Quantity | number;
export type RatePerSecondLike = RatePerSecond | number;


