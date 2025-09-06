import { Engine, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry } from "../src";

const initial: GameState = { resources: [], generators: [], inventory: [], upgrades: [], version: 1 };
const registries = {
  resources: createInMemoryResourceRegistry([]),
  generators: createInMemoryGeneratorRegistry([]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};
const engine = new Engine(initial, registries);
engine.step(1);
console.log("tick OK", engine.state.version);


