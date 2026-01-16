/**
 * Types for the schema migration system.
 *
 * The migration system enables automatic upgrading of save files from older
 * schema versions to the current version, supporting chained migrations
 * (v1→v2→v3→...→vN).
 */

/**
 * Base interface for all versioned save data.
 * Each schema version's save type must conform to this structure.
 */
export interface VersionedSave {
  readonly schemaVersion: number;
  readonly savedAtMs?: number | undefined;
  readonly game: unknown;
}

/**
 * A single migration step from version N to version N+1.
 *
 * Migrations must be pure functions: deterministic, no side effects.
 *
 * @template TFrom - The save type being migrated from
 * @template TTo - The save type being migrated to
 *
 * @example
 * ```typescript
 * const v1ToV2: Migration<SaveV1, SaveV2> = {
 *   fromVersion: 1,
 *   toVersion: 2,
 *   description: "Add statistics tracking",
 *   migrate: (data) => ({
 *     ...data,
 *     schemaVersion: 2,
 *     game: { ...data.game, statistics: { totalPlayTime: 0 } },
 *   }),
 * };
 * ```
 */
export interface Migration<TFrom extends VersionedSave, TTo extends VersionedSave> {
  /** Source schema version (e.g., 1) */
  readonly fromVersion: TFrom["schemaVersion"];

  /** Target schema version (e.g., 2). Must equal fromVersion + 1. */
  readonly toVersion: TTo["schemaVersion"];

  /** Human-readable description of what this migration does */
  readonly description: string;

  /**
   * Transform old data to new format.
   * Must be a pure function - no side effects, deterministic output.
   */
  readonly migrate: (data: TFrom) => TTo;
}

/**
 * Type-erased migration for registry storage.
 * The registry stores migrations without specific version type information
 * to allow dynamic chaining.
 */
export interface ErasedMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;
  readonly migrate: (data: VersionedSave) => VersionedSave;
}

/**
 * Result of running the migration pipeline.
 *
 * @template T - The final save type after migration
 */
export interface MigrationResult<T extends VersionedSave> {
  /** The migrated data at the target schema version */
  readonly data: T;

  /** Chain of versions traversed (e.g., [1, 2, 3] for v1→v2→v3) */
  readonly versionPath: readonly number[];

  /** Whether any migrations were applied (false if already at target version) */
  readonly migrated: boolean;
}
