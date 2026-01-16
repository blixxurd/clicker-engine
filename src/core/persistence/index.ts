import type { GameState } from "../../model/gameState";
import { SaveV1Schema, type SaveV1 } from "./schema";
import { InvalidJsonError, UnsupportedVersionError, ValidationError } from "../../errors/PersistenceError";
import type { ResourceId, GeneratorId, ItemId, UpgradeId, Quantity } from "../../types/core";
import { TickService } from "../../service/TickService";
import type { Registries } from "../../repo/registries";
import { createMigrationRegistry, type MigrationRegistry, type VersionedSave } from "./migration";

/** Schema version for saved files - the current/latest version. */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/** Minimum schema version we can migrate from. */
export const MIN_SUPPORTED_VERSION = 1 as const;

// Singleton registry instance (lazily initialized)
let migrationRegistry: MigrationRegistry | null = null;

function getRegistry(): MigrationRegistry {
  if (!migrationRegistry) {
    migrationRegistry = createMigrationRegistry();
  }
  return migrationRegistry;
}

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
    ...(state.custom !== undefined ? { custom: state.custom as Record<string, unknown> } : {}),
  };
}

/** Serialize a `GameState` to a JSON string (versioned schema). */
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

/**
 * Extract the schema version from raw JSON before full parsing.
 * @throws ValidationError if the save object is invalid
 * @throws UnsupportedVersionError if version is missing or invalid
 */
function extractVersion(raw: unknown): number {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Invalid save object");
  }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;

  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new UnsupportedVersionError(typeof version === "number" ? version : NaN);
  }

  return version;
}

/**
 * Convert a validated SaveV1 to GameState.
 */
function saveToGameState(save: SaveV1): GameState {
  const g = save.game;
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
    ...(g.custom !== undefined ? { custom: g.custom } : {}),
  } as GameState;

  return state;
}

/**
 * Result of parsing with migration information.
 */
export interface ParseWithMigrationResult {
  /** The parsed game state */
  readonly state: GameState;
  /** Whether any migrations were applied */
  readonly migrated: boolean;
  /** Chain of versions traversed (e.g., [1, 2, 3]) */
  readonly versionPath: readonly number[];
  /** Timestamp from the save file, if present */
  readonly savedAtMs: number | undefined;
}

/**
 * Internal: Parse JSON and migrate to current version if needed.
 */
function parseAndMigrate(json: string): { save: SaveV1; migrated: boolean; path: readonly number[]; savedAtMs: number | undefined } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new InvalidJsonError("Invalid JSON");
  }

  const version = extractVersion(raw);

  // Reject saves from future versions
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(version);
  }

  // Reject saves older than minimum supported
  if (version < MIN_SUPPORTED_VERSION) {
    throw new UnsupportedVersionError(version);
  }

  // Extract savedAtMs before potential migration
  const savedAtMs = typeof (raw as { savedAtMs?: unknown }).savedAtMs === "number"
    ? (raw as { savedAtMs: number }).savedAtMs
    : undefined;

  let migrationResult = {
    data: raw as VersionedSave,
    versionPath: [version] as readonly number[],
    migrated: false,
  };

  // Apply migrations if not at current version
  if (version < CURRENT_SCHEMA_VERSION) {
    const registry = getRegistry();
    migrationResult = registry.migrate<SaveV1>(raw as VersionedSave, CURRENT_SCHEMA_VERSION);
  }

  // Validate against current schema
  const parsed = SaveV1Schema.safeParse(migrationResult.data);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }

  return {
    save: parsed.data,
    migrated: migrationResult.migrated,
    path: migrationResult.versionPath,
    savedAtMs,
  };
}

/** Parse and validate a JSON string into a `GameState`. Throws typed errors. */
export function parse(json: string): GameState {
  const { save } = parseAndMigrate(json);
  return saveToGameState(save);
}

/**
 * Parse a save JSON with migration information exposed.
 * Useful for debugging and displaying migration feedback to users.
 *
 * @param json - The JSON string to parse
 * @returns The game state with migration metadata
 * @throws InvalidJsonError if JSON is malformed
 * @throws ValidationError if the save structure is invalid
 * @throws UnsupportedVersionError if the version is unsupported
 * @throws MigrationPathError if no migration path exists
 * @throws MigrationError if a migration step fails
 *
 * @example
 * ```typescript
 * const result = parseWithMigrationInfo(savedJson);
 * if (result.migrated) {
 *   console.log(`Save upgraded from v${result.versionPath[0]} to v${result.versionPath.at(-1)}`);
 * }
 * ```
 */
export function parseWithMigrationInfo(json: string): ParseWithMigrationResult {
  const { save, migrated, path, savedAtMs } = parseAndMigrate(json);
  return {
    state: saveToGameState(save),
    migrated,
    versionPath: path,
    savedAtMs,
  };
}

/** Apply offline progress by advancing state by (nowMs - savedAtMs)/1000 seconds. */
export function applyOfflineProgress(state: Readonly<GameState>, savedAtMs: number, nowMs: number, registries: Registries): GameState {
  const dt = Math.max(0, Math.floor((nowMs - savedAtMs) / 1000));
  if (dt === 0) return state as GameState;
  return TickService.tick(state, dt, registries);
}

/**
 * Parse a save JSON and apply offline progress if savedAtMs present.
 * @example
 * const state = parseWithOffline(json, Date.now(), registries);
 */
export function parseWithOffline(json: string, nowMs: number, registries: Registries): GameState {
  const { state, savedAtMs } = parseWithMigrationInfo(json);
  if (savedAtMs !== undefined && Number.isFinite(savedAtMs) && savedAtMs > 0) {
    return applyOfflineProgress(state, savedAtMs, nowMs, registries);
  }
  return state;
}

// Re-export migration registry creator for advanced use cases
export { createMigrationRegistry } from "./migration";
export type { MigrationResult, VersionedSave, Migration, ErasedMigration } from "./migration";
