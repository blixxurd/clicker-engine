import { describe, it, expect } from "vitest";
import { MigrationRegistry } from "../../../src/core/persistence/migration/registry";
import { MigrationPathError, MigrationError } from "../../../src/errors/PersistenceError";
import type { VersionedSave, ErasedMigration } from "../../../src/core/persistence/migration/types";

describe("MigrationRegistry", () => {
  describe("register", () => {
    it("given a valid migration, when registered, then it is stored", () => {
      const registry = new MigrationRegistry();
      const migration: ErasedMigration = {
        fromVersion: 1,
        toVersion: 2,
        description: "test migration",
        migrate: (d) => ({ ...d, schemaVersion: 2 }),
      };

      registry.register(migration);

      expect(registry.getAllMigrations()).toHaveLength(1);
      expect(registry.getAllMigrations()[0]).toBe(migration);
    });

    it("given chained migrations, when registered, then all are stored in order", () => {
      const registry = new MigrationRegistry();

      registry
        .register({
          fromVersion: 1,
          toVersion: 2,
          description: "v1 to v2",
          migrate: (d) => ({ ...d, schemaVersion: 2 }),
        })
        .register({
          fromVersion: 2,
          toVersion: 3,
          description: "v2 to v3",
          migrate: (d) => ({ ...d, schemaVersion: 3 }),
        });

      const migrations = registry.getAllMigrations();
      expect(migrations).toHaveLength(2);
      expect(migrations[0]?.fromVersion).toBe(1);
      expect(migrations[1]?.fromVersion).toBe(2);
    });

    it("given a non-consecutive migration, when registered, then it throws", () => {
      const registry = new MigrationRegistry();

      expect(() =>
        registry.register({
          fromVersion: 1,
          toVersion: 3, // Should be 2
          description: "invalid jump",
          migrate: (d) => d,
        })
      ).toThrow("increment version by 1");
    });

    it("given a duplicate fromVersion, when registered, then it throws", () => {
      const registry = new MigrationRegistry();
      const migration: ErasedMigration = {
        fromVersion: 1,
        toVersion: 2,
        description: "first",
        migrate: (d) => ({ ...d, schemaVersion: 2 }),
      };

      registry.register(migration);

      expect(() =>
        registry.register({
          fromVersion: 1,
          toVersion: 2,
          description: "duplicate",
          migrate: (d) => d,
        })
      ).toThrow("Duplicate migration from version 1");
    });
  });

  describe("getMigrationPath", () => {
    it("given same source and target version, when getting path, then returns single-element array", () => {
      const registry = new MigrationRegistry();

      const path = registry.getMigrationPath(1, 1);

      expect(path).toEqual([1]);
    });

    it("given a single registered migration, when getting path, then returns correct path", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "test",
        migrate: (d) => ({ ...d, schemaVersion: 2 }),
      });

      const path = registry.getMigrationPath(1, 2);

      expect(path).toEqual([1, 2]);
    });

    it("given chained migrations, when getting multi-step path, then returns full path", () => {
      const registry = new MigrationRegistry();
      registry
        .register({
          fromVersion: 1,
          toVersion: 2,
          description: "v1->v2",
          migrate: (d) => ({ ...d, schemaVersion: 2 }),
        })
        .register({
          fromVersion: 2,
          toVersion: 3,
          description: "v2->v3",
          migrate: (d) => ({ ...d, schemaVersion: 3 }),
        })
        .register({
          fromVersion: 3,
          toVersion: 4,
          description: "v3->v4",
          migrate: (d) => ({ ...d, schemaVersion: 4 }),
        });

      const path = registry.getMigrationPath(1, 4);

      expect(path).toEqual([1, 2, 3, 4]);
    });

    it("given missing migration step, when getting path, then returns null", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "test",
        migrate: (d) => d,
      });
      // Missing v2->v3

      const path = registry.getMigrationPath(1, 3);

      expect(path).toBeNull();
    });

    it("given downgrade request, when getting path, then returns null", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "test",
        migrate: (d) => d,
      });

      const path = registry.getMigrationPath(3, 1);

      expect(path).toBeNull();
    });
  });

  describe("migrate", () => {
    it("given data at target version, when migrating, then returns unchanged with migrated=false", () => {
      const registry = new MigrationRegistry();
      const data: VersionedSave = { schemaVersion: 1, game: { test: true } };

      const result = registry.migrate(data, 1);

      expect(result.migrated).toBe(false);
      expect(result.data).toBe(data); // Same reference
      expect(result.versionPath).toEqual([1]);
    });

    it("given single migration, when migrating, then applies transformation", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "add field",
        migrate: (d) => ({
          ...d,
          schemaVersion: 2,
          game: { ...d.game as object, newField: "default" },
        }),
      });
      const data: VersionedSave = { schemaVersion: 1, game: { existing: true } };

      const result = registry.migrate(data, 2);

      expect(result.migrated).toBe(true);
      expect(result.data.schemaVersion).toBe(2);
      expect((result.data.game as { newField: string }).newField).toBe("default");
      expect((result.data.game as { existing: boolean }).existing).toBe(true);
      expect(result.versionPath).toEqual([1, 2]);
    });

    it("given chained migrations, when migrating multiple steps, then applies all transformations", () => {
      const registry = new MigrationRegistry();
      registry
        .register({
          fromVersion: 1,
          toVersion: 2,
          description: "add v2Field",
          migrate: (d) => ({
            ...d,
            schemaVersion: 2,
            game: { ...d.game as object, v2Field: true },
          }),
        })
        .register({
          fromVersion: 2,
          toVersion: 3,
          description: "add v3Field",
          migrate: (d) => ({
            ...d,
            schemaVersion: 3,
            game: { ...d.game as object, v3Field: "added" },
          }),
        });
      const data: VersionedSave = { schemaVersion: 1, game: { original: 1 } };

      const result = registry.migrate(data, 3);

      expect(result.migrated).toBe(true);
      expect(result.data.schemaVersion).toBe(3);
      const game = result.data.game as { original: number; v2Field: boolean; v3Field: string };
      expect(game.original).toBe(1);
      expect(game.v2Field).toBe(true);
      expect(game.v3Field).toBe("added");
      expect(result.versionPath).toEqual([1, 2, 3]);
    });

    it("given missing migration path, when migrating, then throws MigrationPathError", () => {
      const registry = new MigrationRegistry();
      const data: VersionedSave = { schemaVersion: 1, game: {} };

      expect(() => registry.migrate(data, 5)).toThrow(MigrationPathError);

      try {
        registry.migrate(data, 5);
      } catch (err) {
        expect(err).toBeInstanceOf(MigrationPathError);
        expect((err as MigrationPathError).fromVersion).toBe(1);
        expect((err as MigrationPathError).toVersion).toBe(5);
      }
    });

    it("given migration that throws, when migrating, then wraps in MigrationError", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "throws",
        migrate: () => {
          throw new Error("something went wrong");
        },
      });
      const data: VersionedSave = { schemaVersion: 1, game: {} };

      expect(() => registry.migrate(data, 2)).toThrow(MigrationError);

      try {
        registry.migrate(data, 2);
      } catch (err) {
        expect(err).toBeInstanceOf(MigrationError);
        expect((err as MigrationError).fromVersion).toBe(1);
        expect((err as MigrationError).toVersion).toBe(2);
        expect((err as MigrationError).reason).toBe("something went wrong");
      }
    });

    it("given migration that throws non-Error, when migrating, then converts to string", () => {
      const registry = new MigrationRegistry();
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        description: "throws string",
        migrate: () => {
          throw "string error"; // eslint-disable-line no-throw-literal
        },
      });
      const data: VersionedSave = { schemaVersion: 1, game: {} };

      try {
        registry.migrate(data, 2);
      } catch (err) {
        expect(err).toBeInstanceOf(MigrationError);
        expect((err as MigrationError).reason).toBe("string error");
      }
    });
  });

  describe("getMaxSupportedVersion", () => {
    it("given no migrations registered, when getting max version, then returns 1", () => {
      const registry = new MigrationRegistry();

      expect(registry.getMaxSupportedVersion()).toBe(1);
    });

    it("given migrations registered, when getting max version, then returns highest toVersion", () => {
      const registry = new MigrationRegistry();
      registry
        .register({
          fromVersion: 1,
          toVersion: 2,
          description: "test",
          migrate: (d) => ({ ...d, schemaVersion: 2 }),
        })
        .register({
          fromVersion: 2,
          toVersion: 3,
          description: "test",
          migrate: (d) => ({ ...d, schemaVersion: 3 }),
        });

      expect(registry.getMaxSupportedVersion()).toBe(3);
    });
  });

  describe("getAllMigrations", () => {
    it("given migrations registered out of order, when getting all, then returns sorted by fromVersion", () => {
      const registry = new MigrationRegistry();
      // Register in reverse order
      registry
        .register({
          fromVersion: 3,
          toVersion: 4,
          description: "v3->v4",
          migrate: (d) => ({ ...d, schemaVersion: 4 }),
        })
        .register({
          fromVersion: 1,
          toVersion: 2,
          description: "v1->v2",
          migrate: (d) => ({ ...d, schemaVersion: 2 }),
        })
        .register({
          fromVersion: 2,
          toVersion: 3,
          description: "v2->v3",
          migrate: (d) => ({ ...d, schemaVersion: 3 }),
        });

      const migrations = registry.getAllMigrations();

      expect(migrations[0]?.fromVersion).toBe(1);
      expect(migrations[1]?.fromVersion).toBe(2);
      expect(migrations[2]?.fromVersion).toBe(3);
    });
  });
});

describe("Migration integration with parse", () => {
  // These tests verify the integration between MigrationRegistry and the parse functions
  // Since we don't have actual migrations yet (v1 is current), we test edge cases

  it("given v1 save, when parsing, then returns state without migration", async () => {
    const { parseWithMigrationInfo } = await import("../../../src/core/persistence");

    // Create a v1 save
    const v1Save = JSON.stringify({
      schemaVersion: 1,
      savedAtMs: Date.now(),
      game: {
        version: 1,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      },
    });

    const result = parseWithMigrationInfo(v1Save);

    expect(result.migrated).toBe(false);
    expect(result.versionPath).toEqual([1]);
    expect(result.state.version).toBe(1);
  });

  it("given future version save, when parsing, then throws UnsupportedVersionError", async () => {
    const { parse, UnsupportedVersionError } = await import("../../../src");

    const futureSave = JSON.stringify({
      schemaVersion: 999,
      game: {
        version: 999,
        resources: [],
        generators: [],
        inventory: [],
        upgrades: [],
      },
    });

    expect(() => parse(futureSave)).toThrow(UnsupportedVersionError);
  });
});
