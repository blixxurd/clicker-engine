import { z } from "zod";

export const ResourceStateSchema = z.object({
  id: z.string(),
  amount: z.number(),
  capacity: z.number().optional(),
});

export const GeneratorStateSchema = z.object({
  id: z.string(),
  owned: z.number().int().nonnegative(),
});

export const InventoryEntrySchema = z.object({
  id: z.string(),
  count: z.number().int().nonnegative(),
});

export const UpgradeStateSchema = z.object({
  id: z.string(),
  level: z.number().int().nonnegative(),
});

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

export type SaveV1 = z.infer<typeof SaveV1Schema>;
