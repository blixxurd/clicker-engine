# Clicker Game Engine (MVP)

TypeScript-first incremental/clicker engine library. Deterministic, small API, framework-agnostic.

## Quickstart

```bash
npm i
npm run build
```

```ts
import {
  Game,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  createFixedStepLoop,
} from "clicker-game-engine";

const initial: GameState = {
  version: 1,
  resources: [],
  generators: [],
  inventory: [],
  upgrades: [],
};

const registries = {
  resources: createInMemoryResourceRegistry([]),
  generators: createInMemoryGeneratorRegistry([]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};

const game = new Game(initial, registries);
game.step(1);

// Loop adapter (fixed step)
const loop = createFixedStepLoop({
  start() { /* wrap Game if needed or use Engine directly */ },
  stop() {},
  isRunning() { return false; },
} as any, { stepSeconds: 0.5 });
```

## Generators: outputs and pricing
- Outputs (resource or item):
  - Resource: `{ kind: "resource", resourceId, rate }`
  - Item: `{ kind: "item", itemId, rate }` (whole items accumulated per tick)
- Pricing lives in the generator definition (single source of truth):
```ts
createInMemoryGeneratorRegistry([
  {
    id: "miner" as any,
    produces: [{ kind: "resource", resourceId: "ore" as any, rate: 1 as any }],
    pricing: { costResourceId: "cash" as any, baseCost: 25, growth: 1.1 },
  },
]);
```
- Purchase via controller:
```ts
game.buyGenerators({ generatorId: "miner" as any, mode: "10" });
```

## EventBus and stepWithEvents
- Subscribe to engine events:
```ts
game.bus.on("resourceDelta", (e) => console.log(e));
game.bus.on("tickStart", (e) => {});
```
- `game.stepWithEvents(dt)` publishes lifecycle and domain events.

## Tasks/Quests
- Define tasks via registry; `game.claimTask(taskId)` handles rewards/state.
- Pure usage: `TaskService.evaluate/claim(state, registries)`.

## Persistence
- `serialize(state)` and `parse(json)` roundtrip GameState; `PersistenceManager` lives on `Game`.

## API surface (curated)
- Game (single touchpoint)
  - step/stepWithEvents
  - buyGenerators/applyUpgrade
  - addItems/consumeItems
  - claimTask
  - bus (EventBus)
- Engine (orchestrator, alternative to Game forwards)
- Services (pure): TickService, InventoryService, TaskService
- Registries: in-memory helpers for definitions
- tick/tickWithEvents: available via TickService

## Philosophy
- Small, composable public API
- Strict TypeScript types as public contract
- Functional core, imperative shell

## Scripts
- `check`: lint + test + build + typecheck
- `docs`: generate API docs to `docs/api`

## License
MIT
