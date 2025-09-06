import type { GameState } from "../../model/gameState";
import { SaveV1Schema, type SaveV1 } from "./schema";
import { InvalidJsonError, UnsupportedVersionError, ValidationError } from "../../errors/PersistenceError";
import type { ResourceId, GeneratorId, ItemId, UpgradeId, Quantity } from "../../types/core";
import { tick } from "../../service/tick";
import type { Registries } from "../../repo/registries";

/** Schema version for saved files. */
export const CURRENT_SCHEMA_VERSION = 1 as const;

function toSaveGame(state: Readonly<GameState>): SaveV1["game"] {
  return {
    version: 1,
    resources: state.resources.map((r) => ({
      id: r.id as unknown as string,
      amount: r.amount as unknown as number,
      ...(r.capacity !== undefined ? { capacity: (r.capacity as unknown as number) } : {}),
    })),
    generators: state.generators.map((g) => ({ id: g.id as unknown as string, owned: g.owned })),
    inventory: state.inventory.map((e) => ({ id: e.id as unknown as string, count: e.count })),
    upgrades: state.upgrades.map((u) => ({ id: u.id as unknown as string, level: u.level })),
  };
}

/** Serialize a GameState to a JSON string (versioned schema). */
export function serialize(state: Readonly<GameState>): string {
  const save: SaveV1 = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAtMs: Date.now(),
    game: toSaveGame(state),
  };
  return JSON.stringify(save);
}

function brandResourceId(id: string): ResourceId {
  return id as unknown as ResourceId;
}

function brandGeneratorId(id: string): GeneratorId {
  return id as unknown as GeneratorId;
}

function brandItemId(id: string): ItemId {
  return id as unknown as ItemId;
}

function brandUpgradeId(id: string): UpgradeId {
  return id as unknown as UpgradeId;
}

function q(n: number): Quantity {
  return n as unknown as Quantity;
}

/** Parse and validate a JSON string into a GameState. Throws typed errors. */
export function parse(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new InvalidJsonError("Invalid JSON");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Invalid save object");
  }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(typeof version === "number" ? version : NaN);
  }

  const parsed = SaveV1Schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }

  const g = parsed.data.game;
  const state: GameState = {
    version: 1,
    resources: g.resources.map((r) => ({
      id: brandResourceId(r.id),
      amount: q(r.amount),
      ...(r.capacity !== undefined ? { capacity: q(r.capacity) } : {}),
    })),
    generators: g.generators.map((gen) => ({ id: brandGeneratorId(gen.id), owned: gen.owned })),
    inventory: g.inventory.map((e) => ({ id: brandItemId(e.id), count: e.count })),
    upgrades: g.upgrades.map((u) => ({ id: brandUpgradeId(u.id), level: u.level })),
  } as GameState;

  return state;
}

/** Apply offline progress by advancing state by (nowMs - savedAtMs)/1000 seconds. */
export function applyOfflineProgress(state: Readonly<GameState>, savedAtMs: number, nowMs: number, registries: Registries): GameState {
  const dt = Math.max(0, Math.floor((nowMs - savedAtMs) / 1000));
  if (dt === 0) return state as GameState;
  return tick(state, dt, registries);
}

/**
 * Parse a save JSON and apply offline progress if savedAtMs present.
 * @example
 * const state = parseWithOffline(json, Date.now(), registries);
 */
export function parseWithOffline(json: string, nowMs: number, registries: Registries): GameState {
  const raw = JSON.parse(json);
  const state = parse(json);
  const savedAtMs: unknown = (raw as { savedAtMs?: unknown }).savedAtMs;
  if (typeof savedAtMs === "number" && Number.isFinite(savedAtMs) && savedAtMs > 0) {
    return applyOfflineProgress(state, savedAtMs, nowMs, registries);
  }
  return state;
}
