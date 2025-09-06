# Clicker Game Engine (MVP)

TypeScript-first incremental/clicker engine library. Deterministic, small API, framework-agnostic.

## Quickstart

```bash
npm i
npm run build
```

```ts
import {
  Engine,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  serialize,
  parse,
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

const engine = new Engine(initial, registries);
engine.step(1);

// Loop adapter (fixed step)
const loop = createFixedStepLoop(engine, { stepSeconds: 0.5 });
loop.start();
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
engine.buyGenerators({ generatorId: "miner" as any, mode: "10" });
```

## EventBus and stepWithEvents
- Subscribe to engine events:
```ts
engine.events.on("resourceDelta", (e) => console.log(e));
engine.events.on("tickStart", (e) => {});
```
- `engine.stepWithEvents(dt)` publishes lifecycle and domain events.

## Tasks/Quests
- Define tasks via registry; engine evaluates unlocks and supports claiming rewards.
```ts
import { createInMemoryTaskRegistry, evaluateTasks } from "clicker-game-engine";
// ... add tasks to registries and call engine.claimTask(taskId)
```

## Persistence
- `serialize(state)` and `parse(json)` roundtrip GameState.

## API surface (curated)
- Engine
  - constructor(state, registries)
  - step(dtSeconds)
  - stepWithEvents(dtSeconds)
  - events (EventBus): on/off
  - buyGenerators({ generatorId, mode })
  - applyUpgrade(args)
  - addItems/consumeItems
  - claimTask(taskId)
- tick(state, dtSeconds, registries)
- adapters
  - createFixedStepLoop(engine, { stepSeconds, maxStepsPerTick?, intervalMs? })
- registries
  - createInMemoryResourceRegistry
  - createInMemoryGeneratorRegistry
  - createInMemoryItemRegistry
  - createInMemoryUpgradeRegistry
  - createInMemoryTaskRegistry
- tasks
  - evaluateTasks(state, registries)
  - claimTask(state, taskId, registries)
- inventory
  - count/add/consume
- persistence
  - serialize/parse/CURRENT_SCHEMA_VERSION

## Philosophy
- Small, composable public API
- Strict TypeScript types as public contract
- Functional core, imperative shell

## Scripts
- `check`: lint + test + build + typecheck
- `docs`: generate API docs to `docs/api`

## License
MIT
