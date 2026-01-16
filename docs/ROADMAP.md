# Phase 2 Roadmap

The following items are deferred from MVP and scheduled for Phase 2.

## ~~Persistence Migrations~~ ✅ Complete
- ~~Versioned save schema (v1→v2)~~ - `MigrationRegistry` supports chained v1→v2→...→vN migrations
- ~~Snapshot tests for migration correctness~~ - Unit tests for registry and integration
- ~~Migration docs and guidelines~~ - See "Adding a Migration" section below

## CI / Developer Experience
- GitHub Actions workflow for `check` (lint + test + build + typecheck)
- Optional docs job to publish API docs (on release)

## Nice-to-haves (post-Phase 2 candidates)
- More number formatting styles (engineering, letters)
- Preset/demo packs
- Performance microbenchmarks for tick loop

---

## Adding a Migration

When you need to change the save schema (e.g., add new fields, rename properties):

1. **Create the migration file** at `src/core/persistence/migration/migrations/v1-to-v2.ts`:
   ```typescript
   import type { Migration } from "../types";
   import type { SaveV1 } from "../../schema";
   // Define SaveV2 type/schema as needed

   export const v1ToV2Migration: Migration<SaveV1, SaveV2> = {
     fromVersion: 1,
     toVersion: 2,
     description: "Add statistics tracking",
     migrate: (data) => ({
       ...data,
       schemaVersion: 2,
       game: {
         ...data.game,
         version: 2,
         statistics: { totalPlayTime: 0 }, // New field with default
       },
     }),
   };
   ```

2. **Register in migrations index** (`src/core/persistence/migration/migrations/index.ts`):
   ```typescript
   import { v1ToV2Migration } from "./v1-to-v2";
   export const allMigrations = [v1ToV2Migration] as const;
   ```

3. **Update constants** in `src/core/persistence/index.ts`:
   - Set `CURRENT_SCHEMA_VERSION = 2`
   - Update `serialize()` to produce v2 format

4. **Add tests** in `tests/unit/persistence/snapshots/v1-to-v2.test.ts`

Migrations are pure functions and must be consecutive (v1→v2, v2→v3, etc.).
