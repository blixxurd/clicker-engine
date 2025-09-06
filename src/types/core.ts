import type { Brand } from "./brand";

/**
 * Public ID brands used across the engine. These provide nominal typing safety.
 */
export type ResourceId = Brand<string, "ResourceId">;
export type ItemId = Brand<string, "ItemId">;
export type TaskId = Brand<string, "TaskId">;
export type GeneratorId = Brand<string, "GeneratorId">;
export type UpgradeId = Brand<string, "UpgradeId">;

/**
 * Numeric brands for domain-specific quantities.
 */
export type Quantity = Brand<number, "Quantity">;
export type RatePerSecond = Brand<number, "RatePerSecond">;

/**
 * Minimal Result type for fallible operations.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

/** Create a successful Result. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** Create a failed Result. */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });


