/**
 * Migration registry for managing and executing schema migrations.
 *
 * The registry holds all registered migrations and computes migration paths
 * between schema versions. It is a pure service with no state mutation.
 *
 * @example
 * ```typescript
 * const registry = new MigrationRegistry();
 * registry.register(v1ToV2Migration);
 * registry.register(v2ToV3Migration);
 *
 * const result = registry.migrate(oldSave, 3);
 * console.log(result.versionPath); // [1, 2, 3]
 * ```
 */

import type { ErasedMigration, MigrationResult, VersionedSave } from "./types";
import { MigrationError, MigrationPathError } from "../../../errors/PersistenceError";
import { allMigrations } from "./migrations";

/**
 * Registry of all schema migrations.
 * Computes migration paths and executes chained migrations.
 */
export class MigrationRegistry {
  private readonly migrations: Map<number, ErasedMigration> = new Map();

  /**
   * Register a migration. Migrations must be consecutive (v1→v2, v2→v3, etc.).
   *
   * @param migration - The migration to register
   * @returns this for method chaining
   * @throws Error if migration versions are not consecutive or duplicate
   *
   * @example
   * ```typescript
   * registry
   *   .register(v1ToV2Migration)
   *   .register(v2ToV3Migration);
   * ```
   */
  public register(migration: ErasedMigration): this {
    if (migration.toVersion !== migration.fromVersion + 1) {
      throw new Error(
        `Migration must increment version by 1. Got ${migration.fromVersion} -> ${migration.toVersion}`
      );
    }

    if (this.migrations.has(migration.fromVersion)) {
      throw new Error(`Duplicate migration from version ${migration.fromVersion}`);
    }

    this.migrations.set(migration.fromVersion, migration);
    return this;
  }

  /**
   * Get the migration path from source to target version.
   *
   * @param fromVersion - Starting schema version
   * @param toVersion - Target schema version
   * @returns Array of versions to traverse, or null if no path exists
   *
   * @example
   * ```typescript
   * registry.getMigrationPath(1, 3); // [1, 2, 3]
   * registry.getMigrationPath(1, 1); // [1]
   * registry.getMigrationPath(3, 1); // null (downgrade not supported)
   * ```
   */
  public getMigrationPath(fromVersion: number, toVersion: number): readonly number[] | null {
    if (fromVersion === toVersion) return [fromVersion];
    if (fromVersion > toVersion) return null; // Downgrade not supported

    const path: number[] = [fromVersion];
    let current = fromVersion;

    while (current < toVersion) {
      const migration = this.migrations.get(current);
      if (!migration) return null;
      current = migration.toVersion;
      path.push(current);
    }

    return path;
  }

  /**
   * Execute all migrations from source version to target version.
   *
   * @param data - The save data to migrate
   * @param targetVersion - The schema version to migrate to
   * @returns Migration result with migrated data and version path
   * @throws MigrationPathError if no valid path exists
   * @throws MigrationError if a migration step fails
   *
   * @example
   * ```typescript
   * const result = registry.migrate(oldSave, CURRENT_SCHEMA_VERSION);
   * if (result.migrated) {
   *   console.log(`Migrated through versions: ${result.versionPath.join(' -> ')}`);
   * }
   * ```
   */
  public migrate<T extends VersionedSave>(
    data: VersionedSave,
    targetVersion: number
  ): MigrationResult<T> {
    const sourceVersion = data.schemaVersion;

    if (sourceVersion === targetVersion) {
      return {
        data: data as T,
        versionPath: [sourceVersion],
        migrated: false,
      };
    }

    const path = this.getMigrationPath(sourceVersion, targetVersion);
    if (!path) {
      throw new MigrationPathError(sourceVersion, targetVersion);
    }

    let current: VersionedSave = data;

    for (let i = 0; i < path.length - 1; i++) {
      const fromVer = path[i];
      if (fromVer === undefined) {
        throw new MigrationPathError(sourceVersion, targetVersion);
      }

      const migration = this.migrations.get(fromVer);
      if (!migration) {
        const nextVer = path[i + 1];
        throw new MigrationPathError(fromVer, nextVer ?? targetVersion);
      }

      try {
        current = migration.migrate(current);
      } catch (err) {
        throw new MigrationError(
          fromVer,
          migration.toVersion,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    return {
      data: current as T,
      versionPath: path,
      migrated: true,
    };
  }

  /**
   * Get all registered migrations sorted by source version.
   * Useful for testing and debugging.
   *
   * @returns Array of all registered migrations
   */
  public getAllMigrations(): readonly ErasedMigration[] {
    return Array.from(this.migrations.values()).sort(
      (a, b) => a.fromVersion - b.fromVersion
    );
  }

  /**
   * Get the highest version this registry can migrate to.
   * Returns 1 if no migrations are registered.
   *
   * @returns The maximum reachable schema version
   */
  public getMaxSupportedVersion(): number {
    let max = 1;
    for (const m of this.migrations.values()) {
      max = Math.max(max, m.toVersion);
    }
    return max;
  }
}

/**
 * Create a pre-configured migration registry with all known migrations.
 *
 * @returns A new MigrationRegistry with all migrations registered
 */
export function createMigrationRegistry(): MigrationRegistry {
  const registry = new MigrationRegistry();

  for (const migration of allMigrations) {
    registry.register(migration);
  }

  return registry;
}
