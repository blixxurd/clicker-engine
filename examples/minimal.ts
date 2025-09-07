import { Game, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry } from "../src";

const initial: GameState = { resources: [], generators: [], inventory: [], upgrades: [], version: 1 };
const registries = {
  resources: createInMemoryResourceRegistry([]),
  generators: createInMemoryGeneratorRegistry([]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};
const game = new Game(initial, registries);
game.step(1);
console.log("tick OK", game.accessor.getState().version);


