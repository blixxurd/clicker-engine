# Clicker Game Engine

[![npm version](https://img.shields.io/npm/v/clicker-game-engine)](https://www.npmjs.com/package/clicker-game-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

> A TypeScript-first, framework-agnostic engine for building incremental/idle/clicker games. Deterministic, composable, and production-ready.

**Clicker Game Engine** provides the core building blocks for idle games: resources, generators with cost scaling, items, upgrades, tasks, persistence with offline progress, and an event system for UI reactivity—all with strict TypeScript types and zero framework lock-in.

---

## ✨ Features

- **🪙 Resources**: Continuous values that auto-generate over time
- **⚙️ Generators**: Auto-producers with exponential cost scaling and multi-output support (resources or items)
- **🎒 Items & Inventory**: Discrete, stackable items with 4 types: consumable, equip, quest, material
- **⬆️ Upgrades & Modifiers**: Purchasable modifiers with multiplicative and additive effects on production
- **📋 Tasks/Quests**: Unlockable progression system with requirements, rewards, and state tracking
- **🛒 Bulk Buy**: Purchase 1, 10, 100, or max generators in a single transaction
- **🔢 Number Formatting**: Built-in short-scale formatting (K, M, B, T) with scientific notation fallback
- **💾 Persistence**: JSON serialization, versioned save schemas, and offline progress calculation
- **🔔 Event System**: Reactive event bus for UI integration (resource changes, purchases, task completion, etc.)
- **🧩 Framework-Agnostic**: Works with React, Vue, Svelte, vanilla JS—your choice
- **✅ Deterministic & Testable**: Pure functions for game logic, predictable behavior, 85%+ test coverage
- **📘 TypeScript-First**: Strict typing with branded types for compile-time safety

---

## 🎯 Why Use This?

Building an idle game from scratch means reinventing:
- Cost scaling formulas
- Bulk-buy calculations
- Save/load with versioning
- Offline progress computation
- Event-driven UI updates
- Modifier ordering and composition

**Clicker Game Engine** gives you all of this out of the box with a clean, composable API. Focus on making your game unique instead of rebuilding the engine.

---

## 📦 Installation

```bash
npm install clicker-game-engine
```

**Requirements**: Node.js ≥ 18, TypeScript ≥ 5.4 (recommended)

---

## 🚀 Quick Start

Here's a minimal working example:

```typescript
import {
  Game,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  createFixedStepLoop,
} from "clicker-game-engine";

// Define initial state
const initialState: GameState = {
  version: 1,
  resources: [],
  generators: [],
  inventory: [],
  upgrades: [],
};

// Set up registries (define your game's resources, generators, items, upgrades)
const registries = {
  resources: createInMemoryResourceRegistry([]),
  generators: createInMemoryGeneratorRegistry([]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};

// Create game instance
const game = new Game(initialState, registries);

// Advance the game by 1 second
game.step(1);

// Optional: Set up a fixed-step game loop
const loop = createFixedStepLoop(game, { stepSeconds: 0.5 });
loop.start();
// loop.stop(); // when you want to pause
```

---

## 💡 Core Concepts

### Resources
Resources are continuous numeric values (e.g., gold, ore, energy) that can be produced by generators or spent on purchases.

```typescript
import type { ResourceDefinition, ResourceId, Quantity } from "clicker-game-engine";

const RES_GOLD = "gold" as unknown as ResourceId;

const resources: ResourceDefinition[] = [
  { id: RES_GOLD },
];

// Initial resource state
const initialState: GameState = {
  version: 1,
  resources: [
    { id: RES_GOLD, amount: 100 as unknown as Quantity },
  ],
  generators: [],
  inventory: [],
  upgrades: [],
};
```

### Generators
Generators produce resources or items at a specified rate per second. They have exponential cost scaling built-in.

```typescript
import type { GeneratorDefinition, GeneratorId, RatePerSecond } from "clicker-game-engine";

const GEN_MINER = "miner" as unknown as GeneratorId;
const RES_ORE = "ore" as unknown as ResourceId;

const generators: GeneratorDefinition[] = [
  {
    id: GEN_MINER,
    produces: [
      { kind: "resource", resourceId: RES_ORE, rate: 1 as unknown as RatePerSecond },
    ],
    pricing: {
      costResourceId: RES_GOLD,
      baseCost: 10,
      growth: 1.15, // 15% cost increase per purchase
    },
  },
];

// Buy generators
game.buyGenerators({ generatorId: GEN_MINER, mode: "1" });  // Buy 1
game.buyGenerators({ generatorId: GEN_MINER, mode: "10" }); // Buy 10
game.buyGenerators({ generatorId: GEN_MINER, mode: "max" }); // Buy as many as possible
```

### Items & Inventory
Items are discrete, stackable objects. They can be produced by generators or consumed for crafting/upgrades.

```typescript
import type { ItemDefinition, ItemId } from "clicker-game-engine";

const ITEM_PICKAXE = "pickaxe" as unknown as ItemId;

const items: ItemDefinition[] = [
  {
    id: ITEM_PICKAXE,
    kind: "equip", // or "consumable", "quest", "material"
    stackLimit: Number.POSITIVE_INFINITY,
  },
];

// Add/consume items
game.addItems(ITEM_PICKAXE, 5);
game.consumeItems(ITEM_PICKAXE, 1);
```

### Upgrades & Modifiers
Upgrades apply permanent modifiers to generators or resources. Modifiers can multiply (`mult`) or add (`add`) to production rates.

```typescript
import type { UpgradeDefinition, UpgradeId } from "clicker-game-engine";

const UP_DOUBLE = "doubleProduction" as unknown as UpgradeId;

const upgrades: UpgradeDefinition[] = [
  {
    id: UP_DOUBLE,
    modifiers: [
      {
        type: "mult",
        scope: { kind: "generator", id: GEN_MINER },
        value: 2, // 2x production
      },
    ],
  },
];

// Apply upgrade (costs handled externally or via task rewards)
game.applyUpgrade({
  upgradeId: UP_DOUBLE,
  costResourceId: RES_GOLD,
  cost: 100,
});
```

### Tasks/Quests
Tasks track requirements (resource amounts, generator counts, etc.) and grant rewards when claimed.

```typescript
import type { TaskDefinition, TaskId } from "clicker-game-engine";

const TASK_FIRST_MINER = "firstMiner" as unknown as TaskId;

const tasks: TaskDefinition[] = [
  {
    id: TASK_FIRST_MINER,
    initialState: "active",
    repeatable: false,
    requirements: [
      { type: "ownGenerator", generatorId: GEN_MINER, count: 1 },
    ],
    rewards: [
      { type: "resource", resourceId: RES_GOLD, amount: 50 },
    ],
  },
];

// Tasks are evaluated and claimed via TaskManager
game.claimTask(TASK_FIRST_MINER);
```

---

## 📖 Usage Examples

### Setting Up a Complete Game

```typescript
import {
  Game,
  type GameState,
  type Registries,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  type ResourceId,
  type GeneratorId,
  type Quantity,
  type RatePerSecond,
} from "clicker-game-engine";

// Type-safe IDs (using branded types)
const RES_GOLD = "gold" as unknown as ResourceId;
const RES_ORE = "ore" as unknown as ResourceId;
const GEN_MINER = "miner" as unknown as GeneratorId;

// Helper functions for branded types
const qty = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

// Create registries
const registries: Registries = {
  resources: createInMemoryResourceRegistry([
    { id: RES_GOLD },
    { id: RES_ORE },
  ]),
  generators: createInMemoryGeneratorRegistry([
    {
      id: GEN_MINER,
      produces: [{ kind: "resource", resourceId: RES_ORE, rate: rps(1) }],
      pricing: { costResourceId: RES_GOLD, baseCost: 10, growth: 1.15 },
    },
  ]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};

// Initial state with starting gold
const initialState: GameState = {
  version: 1,
  resources: [
    { id: RES_GOLD, amount: qty(100) },
    { id: RES_ORE, amount: qty(0) },
  ],
  generators: [],
  inventory: [],
  upgrades: [],
};

// Create game
const game = new Game(initialState, registries);

// Buy a miner
game.buyGenerators({ generatorId: GEN_MINER, mode: "1" });

// Simulate 10 seconds of gameplay
game.step(10);

// Check state
const state = game.accessor.getState();
console.log(state.resources);
```

### Listening to Events

```typescript
// Subscribe to specific events
game.bus.on("resourceDelta", (event) => {
  console.log(`Resource ${event.resourceId} changed by ${event.delta}`);
});

game.bus.on("generatorPurchase", (event) => {
  console.log(`Bought ${event.quantity} of ${event.generatorId}`);
});

game.bus.on("tickEnd", () => {
  // Update UI after each tick
  updateUI();
});

// Step with events (automatically emits to bus)
const events = game.stepWithEvents(1);
```

### Persistence & Offline Progress

```typescript
import { serialize, parse, applyOfflineProgress } from "clicker-game-engine";

// Save game
const json = serialize(game.accessor.getState());
localStorage.setItem("savegame", json);

// Load game
const savedJson = localStorage.getItem("savegame");
if (savedJson) {
  const loadedState = parse(savedJson);
  
  // Apply offline progress (time since last save)
  const lastSaveTime = Date.now() - 3600000; // 1 hour ago
  const stateWithOffline = applyOfflineProgress(
    loadedState,
    registries,
    lastSaveTime,
    Date.now()
  );
  
  const game = new Game(stateWithOffline, registries);
}
```

### Game Loop Integration

```typescript
import { createFixedStepLoop } from "clicker-game-engine";

// Create a fixed-step loop (handles framerate independence)
const loop = createFixedStepLoop(game, {
  stepSeconds: 0.5,      // 500ms per game tick
  maxStepsPerTick: 5,    // Catch up max 5 steps if lagging
  intervalMs: 16,        // ~60 FPS update rate
});

loop.start();

// Later...
loop.stop();
```

---

## 🏗️ Architecture

The engine follows a **functional core, imperative shell** pattern:

### Controllers (Stateful)
Controllers orchestrate game operations, mutate state, and emit events:
- **`Game`**: Single-touchpoint façade composing all subsystems
- **`Economy`**: Handles purchases, upgrades, resource transactions
- **`InventoryManager`**: Item add/consume operations
- **`TaskManager`**: Task evaluation and claiming
- **`TickRunner`**: Game loop driver
- **`PersistenceManager`**: Save/load with offline progress

### Services (Pure)
Services contain pure game logic—deterministic, stateless, and easy to test:
- **`TickService`**: Core tick simulation (resources production, modifiers)
- **`InventoryService`**: Inventory math and validation
- **`TaskService`**: Task requirement evaluation

### Why This Split?
- **Controllers** express use cases and sequencing (stateful layer)
- **Services** isolate domain rules (pure, testable logic)
- Keeps hot paths (tick loop) allocation-light and branch-predictable
- Strict boundaries for clarity and maintainability

---

## 🔔 Event System

The engine emits typed events for UI reactivity:

```typescript
type EngineEvent =
  | ResourceDeltaEvent      // Resource amount changed
  | GeneratorPurchaseEvent  // Generator purchased
  | UpgradeAppliedEvent     // Upgrade applied
  | InventoryAddedEvent     // Item added to inventory
  | InventoryConsumedEvent  // Item consumed from inventory
  | TickStartEvent          // Tick started
  | TickEndEvent            // Tick ended
  | TaskUnlockedEvent       // Task unlocked
  | TaskCompletedEvent      // Task requirements met
  | TaskClaimedEvent;       // Task reward claimed

// Subscribe to events
game.bus.on("resourceDelta", (event) => { /* ... */ });
game.bus.on("generatorPurchase", (event) => { /* ... */ });

// Emit events by calling game methods
game.stepWithEvents(1);        // Emits tick events
game.buyGenerators({ ... });   // Emits purchase events
game.applyUpgrade({ ... });    // Emits upgrade events
```

---

## 📚 API Overview

### `Game` Class
The primary entry point for most applications:

```typescript
class Game {
  // Subsystems
  readonly accessor: StateAccessor;
  readonly bus: EventBus;
  readonly economy: Economy;
  readonly inventory: InventoryManager;
  readonly tasks: TaskManager;
  readonly persistence: PersistenceManager;

  // High-level operations
  step(dtSeconds: number): void;
  stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent>;
  
  // Economy operations
  buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent>;
  applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent>;
  sellResource(args: SellResourceArgs): ReadonlyArray<EngineEvent>;
  grantResource(args: GrantResourceArgs): ReadonlyArray<EngineEvent>;
  consumeResource(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent>;
  
  // Inventory operations
  addItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent>;
  consumeItems(itemId: ItemId, count: number): ReadonlyArray<EngineEvent>;
  
  // Task operations
  claimTask(taskId: TaskId): ReadonlyArray<EngineEvent>;
}
```

### Key Types

```typescript
// Core branded types (compile-time safety)
type ResourceId = Brand<string, "ResourceId">;
type GeneratorId = Brand<string, "GeneratorId">;
type ItemId = Brand<string, "ItemId">;
type UpgradeId = Brand<string, "UpgradeId">;
type TaskId = Brand<string, "TaskId">;
type Quantity = Brand<number, "Quantity">;
type RatePerSecond = Brand<number, "RatePerSecond">;

// Game state (immutable)
interface GameState {
  readonly version: 1;
  readonly resources: ReadonlyArray<ResourceState>;
  readonly generators: ReadonlyArray<GeneratorState>;
  readonly inventory: ReadonlyArray<InventoryEntry>;
  readonly upgrades: ReadonlyArray<UpgradeState>;
}
```

### Utilities

```typescript
// Number formatting
import { formatShort } from "clicker-game-engine";
formatShort(1234567);  // "1.23M"

// Bulk buy calculations
import { bulk } from "clicker-game-engine";
bulk.maxAffordable(currentGold, baseCost, growth, owned); // Calculate max buyable

// Persistence
import { serialize, parse, applyOfflineProgress } from "clicker-game-engine";
```

---

## 🎮 Examples

Check out the [examples folder](./examples) for a complete, playable demo:

- **[clickminer-react](./examples/clickminer-react)**: Full-featured React + Vite demo showcasing resources, generators, items, crafting, upgrades, and progression

To run the example:

```bash
# Build the engine first
npm run build

# Run the React demo
cd examples/clickminer-react
npm install
npm run dev
```

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Type check
npm run typecheck

# Full check (lint + test + build + typecheck)
npm run check

# Generate API documentation
npm run docs
```

### Project Structure

```
clicker-game-engine/
├── src/
│   ├── controller/    # Stateful orchestration layer
│   ├── service/       # Pure game logic
│   ├── core/          # Event bus, math, formatting, persistence
│   ├── model/         # Type definitions
│   ├── repo/          # Registry implementations
│   ├── adapters/      # Loop adapters, integrations
│   ├── types/         # Branded types and core types
│   └── index.ts       # Public API surface
├── tests/             # Test suites
├── examples/          # Demo applications
└── docs/              # Generated API docs
```

---

## 🧪 Testing

- **Coverage Target**: ≥ 85%
- **Philosophy**: Deterministic tests only (no timers, no network, seeded RNG)
- **Style**: Given/When/Then naming for clarity

Run tests:

```bash
npm test
```

---

## 🎨 Design Philosophy

1. **Small, composable API**: Clear separation between orchestration (controllers) and pure logic (services)
2. **TypeScript types are the contract**: Strict mode, branded types, no `any` in public exports
3. **Functional core, imperative shell**: Services are pure; controllers handle state
4. **Framework-agnostic**: No React/Vue/Svelte imports in core—use with any framework
5. **Performance matters**: Hot paths (tick loop) are allocation-light and branch-predictable
6. **Extensible by design**: Bring your own UI, persistence layer, or game loop

---

## 📄 API Documentation

Full API documentation is available in the [`docs/api`](./docs/api) folder, generated from JSDoc comments.

Build docs locally:

```bash
npm run docs
```

---

## 🗺️ Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for planned features and improvements.

**Coming soon**:
- Enhanced persistence migrations (v1→v2 schema evolution)
- CI/CD with GitHub Actions
- More number formatting styles (engineering, letter notation)
- Performance microbenchmarks

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

- **Conventional Commits**: Use `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`
- **One feature per PR**: Keep changes focused (< 400 lines net change when possible)
- **Tests required**: All new features must include tests
- **Update docs**: JSDoc for all public APIs, update README/CHANGELOG as needed

### PR Checklist

- [ ] Types are precise and exported as needed
- [ ] JSDoc and examples updated
- [ ] Tests added/updated and passing
- [ ] No TODOs left in code (move to issues if needed)
- [ ] Public API changes mentioned in CHANGELOG

---

## 📜 License

[MIT](./LICENSE) © 2024

---

## 🙏 Acknowledgments

Built with inspiration from classic idle games and modern TypeScript best practices. Special thanks to the incremental games community for design insights and feedback.

---

**Made with ❤️ for the idle/incremental games community.**

*Start building your next idle game masterpiece today!* 🚀
