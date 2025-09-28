import { z } from "zod";

/** zod schema for a resource entry in the save file. */
export const ResourceStateSchema = z.object({
  id: z.string(),
  amount: z.number(),
  capacity: z.number().optional(),
});

/** zod schema for a generator entry in the save file. */
export const GeneratorStateSchema = z.object({
  id: z.string(),
  owned: z.number().int().nonnegative(),
});

/** zod schema for an inventory entry in the save file. */
export const InventoryEntrySchema = z.object({
  id: z.string(),
  count: z.number().int().nonnegative(),
});

/** zod schema for an upgrade entry in the save file. */
export const UpgradeStateSchema = z.object({
  id: z.string(),
  level: z.number().int().nonnegative(),
});

/** Save schema v1 definition. */
export const SaveV1Schema = z.object({
  schemaVersion: z.literal(1),
  savedAtMs: z.number().int().nonnegative().optional(),
  game: z.object({
    version: z.literal(1),
    resources: z.array(ResourceStateSchema),
    generators: z.array(GeneratorStateSchema),
    inventory: z.array(InventoryEntrySchema),
    upgrades: z.array(UpgradeStateSchema),
  }),
});

/** Type of save files conforming to v1 schema. */
export type SaveV1 = z.infer<typeof SaveV1Schema>;
