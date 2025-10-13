# Examples

This folder contains example applications demonstrating how to use **Idle Clicker Engine** in real-world scenarios.

---

## 🎮 Available Examples

### [clickminer-react](./clickminer-react)

**A full-featured idle mining game built with React + Vite.**

**What it demonstrates:**
- Multi-resource economy (gold, XP, ores, coal)
- Item-based progression (pickaxes with durability)
- Manual clicking and passive generation
- Crafting system (bars, tools)
- Level-gated unlocks
- Buy/sell economy with dynamic pricing
- Recipe unlocking
- Upgrade system (passive mining technique)
- Event-driven UI updates
- Game loop integration with `createFixedStepLoop`

**Features:**
- 📊 Resource tracking (gold, XP, copper, tin, iron, coal)
- ⛏️ Click-to-mine mechanics with tool durability
- 🏪 Store for buying/selling ores, bars, and pickaxes
- 🔨 Crafting recipes (bronze/iron/steel bars and pickaxes)
- ⬆️ Progression system with XP levels (1-10+)
- 💎 Passive mining upgrade with focus targeting
- ⏸️ Pause/resume functionality

**Complexity Level:** Intermediate to Advanced

**Tech Stack:**
- React 18
- TypeScript 5.4
- Vite 5.4
- Idle Clicker Engine (`@fidget/idle-engine`)

---

## 🚀 Running the Examples

### Prerequisites

1. **Build the engine first** (from the repository root):

```bash
npm install
npm run build
```

### Running clickminer-react

```bash
cd examples/clickminer-react
npm install
npm run dev
```

Then open your browser to `http://localhost:5173` (or the URL shown in your terminal).

---

## 📚 What You'll Learn

### From clickminer-react

1. **Setting up a Game instance**
   - Defining resources, items, generators, and upgrades
   - Creating registries with type-safe IDs
   - Initializing game state

2. **React integration**
   - Using `useState` and `useCallback` with the engine
   - Subscribing to game events with `game.bus.on()`
   - Triggering UI updates on state changes

3. **Game loop integration**
   - Using `createFixedStepLoop` for fixed-timestep simulation
   - Integrating custom tick logic (passive mining, durability)
   - Managing loop lifecycle (start/stop)

4. **Economy & transactions**
   - Buying and selling resources with dynamic pricing
   - Implementing crafting recipes
   - Managing item consumption and creation

5. **Progression systems**
   - Level-gating features and content
   - Recipe unlocking with requirements
   - Upgrade purchases with permanent effects

6. **Custom mechanics**
   - Tool durability tracking
   - Focus-based passive generation
   - Manual click mining with instant rewards

---

## 🛠️ Creating Your Own Example

Want to build your own game with the engine? Here's a quick starter template:

```typescript
import {
  Game,
  type GameState,
  createInMemoryResourceRegistry,
  createInMemoryGeneratorRegistry,
  createInMemoryItemRegistry,
  createInMemoryUpgradeRegistry,
  createFixedStepLoop,
} from "@fidget/idle-engine";

// 1. Define your IDs (use branded types in production)
const RES_CURRENCY = "currency" as any;
const GEN_PRODUCER = "producer" as any;

// 2. Create registries
const registries = {
  resources: createInMemoryResourceRegistry([
    { id: RES_CURRENCY },
  ]),
  generators: createInMemoryGeneratorRegistry([
    {
      id: GEN_PRODUCER,
      produces: [
        { kind: "resource", resourceId: RES_CURRENCY, rate: 1 as any },
      ],
      pricing: { costResourceId: RES_CURRENCY, baseCost: 10, growth: 1.15 },
    },
  ]),
  items: createInMemoryItemRegistry([]),
  upgrades: createInMemoryUpgradeRegistry([]),
};

// 3. Set up initial state
const initialState: GameState = {
  version: 1,
  resources: [{ id: RES_CURRENCY, amount: 100 as any }],
  generators: [],
  inventory: [],
  upgrades: [],
};

// 4. Create game and start loop
const game = new Game(initialState, registries);
const loop = createFixedStepLoop(game, { stepSeconds: 0.5 });

// 5. Subscribe to events
game.bus.on("tickEnd", () => {
  console.log("Tick complete!");
});

// 6. Start the game
loop.start();
```

---

## 📖 Additional Resources

- [Main README](../README.md) - Full documentation and API reference
- [API Docs](../docs/api) - Generated JSDoc documentation
- [CHANGELOG](../CHANGELOG.md) - Version history and breaking changes
- [ROADMAP](../docs/ROADMAP.md) - Planned features and improvements

---

## 💡 Tips for Building Your Game

1. **Start simple**: Begin with a single resource and generator, then expand
2. **Type safety**: Use branded types (`ResourceId`, `GeneratorId`) for compile-time safety
3. **Event-driven UI**: Subscribe to engine events instead of polling state
4. **Test your rules**: Service classes are pure—easy to unit test
5. **Iterate on balance**: Adjust `baseCost` and `growth` for your desired progression curve
6. **Profile hot paths**: The tick loop runs frequently—keep custom logic efficient

---

## 🤝 Contributing Examples

Have an interesting example to share? We'd love to include it!

**Guidelines:**
- Keep it focused on demonstrating specific features
- Include a brief README explaining what it showcases
- Use TypeScript and follow the project's style guide
- Test that it builds and runs correctly

Submit a PR with your example in a new folder under `examples/`.

---

**Happy building!** 🎮✨

