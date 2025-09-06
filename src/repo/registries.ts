import type { GeneratorDefinition } from "../model/generator";
import type { ResourceDefinition } from "../model/resource";
import type { GeneratorId, ResourceId, ItemId, UpgradeId, TaskId } from "../types/core";
import type { ItemDefinition } from "../model/item";
import type { UpgradeDefinition } from "../model/upgrade";
import type { TaskDefinition } from "../model/task";

/** Lookup for resource definitions by id. */
export interface ResourceRegistry {
  get(id: ResourceId): ResourceDefinition | undefined;
}

/** Lookup for generator definitions by id. */
export interface GeneratorRegistry {
  get(id: GeneratorId): GeneratorDefinition | undefined;
}

/** Lookup for item definitions by id. */
export interface ItemRegistry {
  get(id: ItemId): ItemDefinition | undefined;
}

/** Lookup for upgrade definitions by id. */
export interface UpgradeRegistry {
  get(id: UpgradeId): UpgradeDefinition | undefined;
}

/** Lookup for task definitions by id. */
export interface TaskRegistry {
  get(id: TaskId): TaskDefinition | undefined;
  all?(): ReadonlyArray<TaskDefinition>;
}

/** Bundled registries passed to services and Engine. */
export interface Registries {
  readonly resources: ResourceRegistry;
  readonly generators: GeneratorRegistry;
  readonly items: ItemRegistry;
  readonly upgrades?: UpgradeRegistry;
  readonly tasks?: TaskRegistry;
}

/** Create a simple in-memory resource registry. */
export function createInMemoryResourceRegistry(defs: ReadonlyArray<ResourceDefinition>): ResourceRegistry {
  const map = new Map<ResourceId, ResourceDefinition>(defs.map((d) => [d.id, d]));
  return {
    get(id: ResourceId): ResourceDefinition | undefined {
      return map.get(id);
    },
  };
}

/** Create a simple in-memory generator registry. */
export function createInMemoryGeneratorRegistry(
  defs: ReadonlyArray<GeneratorDefinition>,
): GeneratorRegistry {
  const map = new Map<GeneratorId, GeneratorDefinition>(defs.map((d) => [d.id, d]));
  return {
    get(id: GeneratorId): GeneratorDefinition | undefined {
      return map.get(id);
    },
  };
}

/** Create a simple in-memory item registry. */
export function createInMemoryItemRegistry(defs: ReadonlyArray<ItemDefinition>): ItemRegistry {
  const map = new Map<ItemId, ItemDefinition>(defs.map((d) => [d.id, d]));
  return {
    get(id: ItemId): ItemDefinition | undefined {
      return map.get(id);
    },
  };
}

/** Create a simple in-memory upgrade registry. */
export function createInMemoryUpgradeRegistry(defs: ReadonlyArray<UpgradeDefinition>): UpgradeRegistry {
  const map = new Map<UpgradeId, UpgradeDefinition>(defs.map((d) => [d.id, d]));
  return {
    get(id: UpgradeId): UpgradeDefinition | undefined {
      return map.get(id);
    },
  };
}

/** Create a simple in-memory task registry. */
export function createInMemoryTaskRegistry(defs: ReadonlyArray<TaskDefinition>): TaskRegistry {
  const map = new Map<TaskId, TaskDefinition>(defs.map((d) => [d.id, d]));
  return {
    get(id: TaskId): TaskDefinition | undefined {
      return map.get(id);
    },
    all(): ReadonlyArray<TaskDefinition> {
      return Array.from(map.values());
    },
  };
}
