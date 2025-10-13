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
const loop = createFixedStepLoop(game, { stepSeconds: 0.5 });
```

## Examples
- `examples/minimal.ts`: Smallest possible setup and single tick.
- `examples/runemine.ts`: RuneScape-inspired mining demo showing resources, generators, upgrades, and a simple simulation. Run it with:
```bash
ts-node examples/runemine.ts
```
- `examples/runemine-react`: Modern React + Vite browser demo. Build the engine first, then run:
```bash
npm run build
cd examples/runemine-react
npm i
npm run dev
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
- Engine: removed. Use `Game` as the single touchpoint.
- Services (pure): TickService, InventoryService, TaskService
- Registries: in-memory helpers for definitions
- tick/tickWithEvents: available via TickService

## Philosophy
- **Small, composable public API**: clear separation between orchestration (controllers) and pure logic (services).
- **Strict TypeScript types are the public contract**: `strict`, branded types, no `any` in exported surfaces.
- **Functional core, imperative shell**: services are pure/deterministic; controllers own state transitions and event emission.
- **Single touchpoint DX**: `Game` forwards common actions; pure services remain available for functional workflows.

## Architecture
- **Controllers (stateful, orchestrate, emit events)**
  - `Game`: composition container with `StateAccessor`, `EventBus`, managers/services; forwards `step`, `buy`, `apply`, `add/consume`, `claim`.
  - `TickRunner`: drives ticks using `TickService`.
  - `Economy`: domain ops for buys/upgrades.
  - `InventoryManager`: stateful inventory operations (uses pure service under the hood as needed).
  - `TaskManager`: stateful task evaluation and claiming (encapsulated helpers).
  - `BaseSubsystem`: shared base holding `state` and `registries`.
- **Services (stateless, pure)**
  - `TickService`: `tick`, `tickWithEvents`.
  - `InventoryService`: `add`, `consume`, `count`.
  - `TaskService`: `evaluate`, `claim`.
- **Registries**: in-memory helpers for definitions; `RegistriesContainer` for bundling.

### Why this split?
- Controllers express use-cases and sequencing; they are the only layer that mutates state or emits events.
- Services isolate domain rules; they’re deterministic, easy to test, and reusable across controllers.
- This design keeps hot paths allocation-light and maintains strict boundaries for clarity and testability.

## Migration notes (from pre-0.2)
- Removed legacy service functions (`service/*` adapters). Use controller methods or service classes directly:
  - `tick`, `tickWithEvents` → `TickService.tick(state, dt, registries)` / `TickService.tickWithEvents(...)`.
  - `inventory.add/consume/count` → `InventoryService.add/consume/count` or `Game.addItems/consumeItems`.
  - `evaluateTasks/claimTask` → `TaskService.evaluate/claim` or `Game.claimTask`.
- Introduced `Game` single-touchpoint API. `Engine` remains available; both expose the same operations.
- `