/**
 * Schema migration system for save file versioning.
 *
 * This module provides infrastructure for automatically upgrading save files
 * from older schema versions to the current version.
 *
 * @example
 * ```typescript
 * import { createMigrationRegistry, type MigrationResult } from "./migration";
 *
 * const registry = createMigrationRegistry();
 * const result = registry.migrate(oldSave, CURRENT_SCHEMA_VERSION);
 * ```
 */

export type {
  VersionedSave,
  Migration,
  ErasedMigration,
  MigrationResult,
} from "./types";

export { MigrationRegistry, createMigrationRegistry } from "./registry";
