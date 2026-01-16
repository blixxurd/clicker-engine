/**
 * Aggregates all schema migrations for the migration registry.
 *
 * When adding a new migration (e.g., v1→v2):
 * 1. Create a new file: v1-to-v2.ts
 * 2. Import it here
 * 3. Add it to the allMigrations array
 *
 * @example
 * ```typescript
 * // After creating v1-to-v2.ts:
 * import { v1ToV2Migration } from "./v1-to-v2";
 *
 * export const allMigrations = [
 *   v1ToV2Migration,
 * ] as const;
 * ```
 */

import type { ErasedMigration } from "../types";

// Import migrations here as they are created:
// import { v1ToV2Migration } from "./v1-to-v2";

/**
 * All registered migrations in order.
 * The migration registry will use these to build migration paths.
 */
export const allMigrations: readonly ErasedMigration[] = [
  // Add migrations here in order:
  // v1ToV2Migration,
] as const;
