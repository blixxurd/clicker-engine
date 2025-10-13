import { Game, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, type GeneratorDefinition, type ResourceDefinition, type ItemDefinition, type UpgradeDefinition, type Registries, type ResourceId, type GeneratorId, type ItemId, type UpgradeId, type RatePerSecond, type Quantity } from "../src";

// IDs (string brands in consumer space)
const RES_GOLD = "gold" as unknown as ResourceId;
const RES_ORE = "ore" as unknown as ResourceId;

const GEN_BRONZE = "bronzePick" as unknown as GeneratorId;
const GEN_IRON = "ironPick" as unknown as GeneratorId;

const ITEM_BAR = "bar" as unknown as ItemId;

const UP_TECH = "techniqueI" as unknown as UpgradeId;

const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;
const qty = (n: number): Quantity => n as unknown as Quantity;

// Definitions
const resources: ReadonlyArray<ResourceDefinition> = [
  { id: RES_GOLD },
  { id: RES_ORE },
];

const items: ReadonlyArray<ItemDefinition> = [
  { id: ITEM_BAR, kind: "material", stackLimit: Number.POSITIVE_INFINITY },
];

const generators: ReadonlyArray<GeneratorDefinition> = [
  {
    id: GEN_BRONZE,
    produces: [
      { kind: "resource", resourceId: RES_ORE, rate: rps(0.5) },
    ],
    pricing: { costResourceId: RES_GOLD, baseCost: 10, growth: 1.15 },
  },
  {
    id: GEN_IRON,
    produces: [
      { kind: "resource", resourceId: RES_ORE, rate: rps(2) },
    ],
    pricing: { costResourceId: RES_GOLD, baseCost: 100, growth: 1.15 },
  },
];

const upgrades: ReadonlyArray<UpgradeDefinition> = [
  {
    id: UP_TECH,
    modifiers: [
      { type: "mult", scope: { kind: "generator", id: GEN_BRONZE }, value: 1.5 },
    ],
  },
];

// Initial state with some starting gold
const initial: GameState = {
  resources: [
    { id: RES_GOLD, amount: qty(100) },
    { id: RES_ORE, amount: qty(0) },
  ],
  generators: [],
  inventory: [],
  upgrades: [],
  version: 1,
};

// Registries bundle
const registries: Registries = {
  resources: createInMemoryResourceRegistry(resources),
  generators: createInMemoryGeneratorRegistry(generators),
  items: createInMemoryItemRegistry(items),
  upgrades: createInMemoryUpgradeRegistry(upgrades),
};

// Simple scripted demo
function runDemo(): void {
  const game = new Game(initial, registries);

  const stepSeconds = 0.5;

  // Helper to read numeric amounts
  const get = (id: ResourceId): number => {
    const s = game.accessor.getState();
    const r = s.resources.find((x) => x.id === id);
    return (r?.amount as unknown as number) ?? 0;
  };

  const log = (label: string): void => {
    const gold = get(RES_GOLD);
    const ore = get(RES_ORE);
    const ownedBronze = game.accessor.getState().generators.find(g => g.id === GEN_BRONZE)?.owned ?? 0;
    const ownedIron = game.accessor.getState().generators.find(g => g.id === GEN_IRON)?.owned ?? 0;
    // eslint-disable-next-line no-console
    console.log(`${label} | Gold=${gold.toFixed(2)} Ore=${ore.toFixed(2)} Bronze=${ownedBronze} Iron=${ownedIron}`);
  };

  log("Start");

  // Buy a Bronze pick if affordable
  game.buyGenerators({ generatorId: GEN_BRONZE, mode: "1" });
  log("Bought 1 BronzePick");

  // Simulate 10 seconds
  for (let t = 0; t < 10 / stepSeconds; t++) {
    game.step(stepSeconds);
  }
  log("After 10s mining");

  // Apply upgrade if we can afford (cost 50 gold)
  const cost = 50;
  if (get(RES_GOLD) >= cost) {
    game.applyUpgrade({ upgradeId: UP_TECH, costResourceId: RES_GOLD, cost });
    log("Applied Technique I");
  }

  // Mine more, then try to buy Iron pick in bulk max with current gold
  for (let t = 0; t < 10 / stepSeconds; t++) {
    game.step(stepSeconds);
  }
  game.buyGenerators({ generatorId: GEN_IRON, mode: "max" });
  log("Bought IronPick (max)");

  // Final 10 seconds
  for (let t = 0; t < 10 / stepSeconds; t++) {
    game.step(stepSeconds);
  }
  log("After 30s total");
}

runDemo();
