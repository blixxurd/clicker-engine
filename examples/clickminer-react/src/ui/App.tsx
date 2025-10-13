import React from "react";
import { Game, type GameState, createInMemoryGeneratorRegistry, createInMemoryResourceRegistry, createInMemoryItemRegistry, createInMemoryUpgradeRegistry, type GeneratorDefinition, type ResourceDefinition, type ItemDefinition, type UpgradeDefinition, type ResourceId, type GeneratorId, type UpgradeId, type Quantity, type RatePerSecond, type ItemId, type EngineEvent, createFixedStepLoop } from "@fidget/idle-engine";

// Resources
const RES_GOLD = "gold" as unknown as ResourceId;
const RES_XP = "xp" as unknown as ResourceId;
const RES_ORE_COPPER = "ore_copper" as unknown as ResourceId;
const RES_ORE_TIN = "ore_tin" as unknown as ResourceId;
const RES_ORE_IRON = "ore_iron" as unknown as ResourceId;
const RES_ORE_COAL = "ore_coal" as unknown as ResourceId;

// Pickaxe items
const ITEM_BRONZE_PICK = "bronze_pick" as unknown as ItemId;
const ITEM_IRON_PICK = "iron_pick" as unknown as ItemId;
const ITEM_STEEL_PICK = "steel_pick" as unknown as ItemId;
const ITEM_IRON_BAR = "iron_bar" as unknown as ItemId;
const ITEM_STEEL_BAR = "steel_bar" as unknown as ItemId;
const ITEM_BRONZE_BAR = "bronze_bar" as unknown as ItemId;

// Store pricing (buy>sell to avoid arbitrage)
const PRICE = {
  buy: {
    copper: 2,
    iron: 6,
    coal: 12,
    ironBar: 2000,
    bronzePick: 10,
    ironPick: 10000,
    steelPick: 50000,
  },
  sell: {
    copper: 1,
    iron: 3,
    coal: 6,
    ironBar: 1000,
    bronzePick: 5,
    ironPick: 5000,
    steelPick: 25000,
  },
} as const;

// Upgrades
const UP_TECH = "techniqueI" as unknown as UpgradeId;

// Technique target
type PassiveTarget = "copper" | "tin" | "iron" | "coal";

const qty = (n: number): Quantity => n as unknown as Quantity;
const rps = (n: number): RatePerSecond => n as unknown as RatePerSecond;

const levelFromXp = (xp: number): number => {
  // Steeper curve: xp ≈ 100 * (level - 1)^3
  // L2 ~ 100, L3 ~ 800, L5 ~ 6400, L10 ~ 72900
  const level = Math.floor(Math.cbrt(Math.max(0, xp) / 100)) + 1;
  return Math.max(1, level);
};

const resources: ReadonlyArray<ResourceDefinition> = [
  { id: RES_GOLD },
  { id: RES_XP },
  { id: RES_ORE_COPPER },
  { id: RES_ORE_TIN },
  { id: RES_ORE_IRON },
  { id: RES_ORE_COAL },
];

// Generators are present but disabled (rates 0) — passive comes from Technique
const generators: ReadonlyArray<GeneratorDefinition> = [
  { id: "bronzePickGen" as unknown as GeneratorId, produces: [{ kind: "resource", resourceId: RES_ORE_COPPER, rate: rps(0) }] },
  { id: "ironPickGen" as unknown as GeneratorId, produces: [{ kind: "resource", resourceId: RES_ORE_IRON, rate: rps(0) }] },
  { id: "steelPickGen" as unknown as GeneratorId, produces: [{ kind: "resource", resourceId: RES_ORE_COAL, rate: rps(0) }] },
];

const items: ReadonlyArray<ItemDefinition> = [
  { id: ITEM_BRONZE_PICK, kind: "equip", stackLimit: Number.POSITIVE_INFINITY },
  { id: ITEM_IRON_PICK, kind: "equip", stackLimit: Number.POSITIVE_INFINITY },
  { id: ITEM_STEEL_PICK, kind: "equip", stackLimit: Number.POSITIVE_INFINITY },
  { id: ITEM_IRON_BAR, kind: "material", stackLimit: Number.POSITIVE_INFINITY },
  { id: ITEM_STEEL_BAR, kind: "material", stackLimit: Number.POSITIVE_INFINITY },
  { id: ITEM_BRONZE_BAR, kind: "material", stackLimit: Number.POSITIVE_INFINITY },
];

const upgrades: ReadonlyArray<UpgradeDefinition> = [
  { id: UP_TECH, modifiers: [] },
];

function useGame(): { game: Game; state: GameState; step: (dt: number) => void; refresh: () => void } {
  const [game] = React.useState(() => {
    const initial: GameState = {
      version: 1,
      resources: [
        { id: RES_GOLD, amount: qty(0) },
        { id: RES_XP, amount: qty(0) },
        { id: RES_ORE_COPPER, amount: qty(0) },
        { id: RES_ORE_TIN, amount: qty(0) },
        { id: RES_ORE_IRON, amount: qty(0) },
        { id: RES_ORE_COAL, amount: qty(0) },
      ],
      generators: [],
      inventory: [
        { id: ITEM_BRONZE_PICK, count: 1 },
      ],
      upgrades: [],
    };
    const registries = {
      resources: createInMemoryResourceRegistry(resources),
      generators: createInMemoryGeneratorRegistry(generators),
      items: createInMemoryItemRegistry(items),
      upgrades: createInMemoryUpgradeRegistry(upgrades),
    };
    return new Game(initial, registries);
  });
  const [state, setState] = React.useState<GameState>(game.accessor.getState());
  const step = React.useCallback((dt: number): void => {
    game.step(dt);
    setState(game.accessor.getState());
  }, [game]);
  const refresh = React.useCallback((): void => {
    setState(game.accessor.getState());
  }, [game]);
  return { game, state, step, refresh };
}

export function App(): JSX.Element {
  const { game, state, refresh } = useGame();
  const [running, setRunning] = React.useState(true);
  const [passive, setPassive] = React.useState<PassiveTarget>("copper");
  const [techniqueLastGrant, setTechniqueLastGrant] = React.useState<number>(0);
  const [techniqueToast, setTechniqueToast] = React.useState<string>("");
  const [bronzeRemaining, setBronzeRemaining] = React.useState<number>(100);
  const [ironRemaining, setIronRemaining] = React.useState<number>(100);
  const [steelRemaining, setSteelRemaining] = React.useState<number>(100);
  const [recipes, setRecipes] = React.useState<{ bronzeBar: boolean; ironBar: boolean; steelBar: boolean; bronzePick: boolean; ironPick: boolean }>({ bronzeBar: false, ironBar: false, steelBar: false, bronzePick: false, ironPick: false });

  const RECIPE_UNLOCK = {
    bronzeBar: { gold: 1500, level: 3 },
    ironBar: { gold: 1000, level: 5 },
    steelBar: { gold: 5000, level: 8 },
    bronzePick: { gold: 500, level: 3 },
    ironPick: { gold: 10000, level: 7 },
  } as const;

  const countItem = React.useCallback((id: ItemId): number => {
    return state.inventory.reduce((acc, e) => acc + (e.id === id ? e.count : 0), 0);
  }, [state.inventory]);

  const spendGoldAnd = React.useCallback((cost: number, action: () => void): void => {
    const gs = game.accessor.getState();
    const goldIdx = gs.resources.findIndex((r) => r.id === RES_GOLD);
    const curr = goldIdx >= 0 ? (gs.resources[goldIdx]!.amount as unknown as number) : 0;
    if (curr < cost) return;
    const nextGold = qty(curr - cost);
    const nextState: GameState = { ...gs, resources: gs.resources.map((r, i) => (i === goldIdx ? { ...r, amount: nextGold } : r)) } as GameState;
    game.accessor.setState(nextState);
    action();
    refresh();
  }, [game, refresh]);

  const consumeResourceLocal = React.useCallback((resourceId: ResourceId, amountToConsume: number): boolean => {
    if (amountToConsume <= 0) return false;
    const gs = game.accessor.getState();
    const idx = gs.resources.findIndex((r) => r.id === resourceId);
    if (idx < 0) return false;
    const curr = gs.resources[idx]!.amount as unknown as number;
    if (curr < amountToConsume) return false;
    const nextAmt = qty(curr - amountToConsume);
    const next: GameState = { ...gs, resources: gs.resources.map((r, i) => (i === idx ? { ...r, amount: nextAmt } : r)) } as GameState;
    game.accessor.setState(next);
    return true;
  }, [game]);

  const decrementItem = React.useCallback((itemId: ItemId): void => {
    game.consumeItems(itemId, 1);
    refresh();
  }, [game, refresh]);

  const applyMinedAndDurability = React.useCallback((itemId: ItemId, minedDelta: number, getRemaining: () => number, setRemaining: (n: number) => void): void => {
    if (minedDelta <= 0) return;
    setRemaining((prev) => {
      let remaining = prev;
      // If no picks, keep remaining at 100 baseline
      const count = state.inventory.reduce((acc, e) => acc + (e.id === itemId ? e.count : 0), 0);
      if (count <= 0) return 100;
      remaining -= minedDelta;
      while (remaining <= 0 && state.inventory.reduce((acc, e) => acc + (e.id === itemId ? e.count : 0), 0) > 0) {
        decrementItem(itemId);
        remaining += 100;
      }
      return Math.min(100, remaining);
    });
  }, [state.inventory, decrementItem]);

  React.useEffect(() => {
    const onUpgrade = (e: Extract<EngineEvent, { type: "upgradeApplied" }>): void => {
      if (e.upgradeId === UP_TECH) {
        setTechniqueToast("Passive Mining unlocked. Bonus is now active for the selected rock.");
        window.setTimeout(() => setTechniqueToast(""), 2000);
        refresh();
      }
    };
    game.bus.on("upgradeApplied", onUpgrade);
    return (): void => { game.bus.off("upgradeApplied", onUpgrade); };
  }, [game, refresh]);

  React.useEffect(() => {
    const techniqueRatePerPick: Record<PassiveTarget, number> = { copper: 0.15, tin: 0.15, iron: 0.25, coal: 0.4 };

    const tickable = {
      stepWithEvents: (dt: number): ReadonlyArray<EngineEvent> => {
        const gs = game.accessor.getState();
        const bronzeCount = gs.inventory.reduce((acc, e) => acc + (e.id === ITEM_BRONZE_PICK ? e.count : 0), 0);
        const ironCount = gs.inventory.reduce((acc, e) => acc + (e.id === ITEM_IRON_PICK ? e.count : 0), 0);
        const steelCount = gs.inventory.reduce((acc, e) => acc + (e.id === ITEM_STEEL_PICK ? e.count : 0), 0);
        const hasTechniqueUp = (gs.upgrades.find((u) => u.id === UP_TECH)?.level ?? 0) > 0;

        let lastGrant = 0;
        if (hasTechniqueUp) {
          if (passive === "copper" && bronzeCount > 0) {
            const amt = bronzeCount * techniqueRatePerPick.copper * dt;
            lastGrant = amt;
            game.grantResource({ resourceId: RES_ORE_COPPER, amount: amt });
            applyMinedAndDurability(ITEM_BRONZE_PICK, amt, () => bronzeRemaining, setBronzeRemaining);
          } else if (passive === "tin" && bronzeCount > 0) {
            const amt = bronzeCount * techniqueRatePerPick.tin * dt;
            lastGrant = amt;
            game.grantResource({ resourceId: RES_ORE_TIN, amount: amt });
            applyMinedAndDurability(ITEM_BRONZE_PICK, amt, () => bronzeRemaining, setBronzeRemaining);
          } else if (passive === "iron" && ironCount > 0) {
            const amt = ironCount * techniqueRatePerPick.iron * dt;
            lastGrant = amt;
            game.grantResource({ resourceId: RES_ORE_IRON, amount: amt });
            applyMinedAndDurability(ITEM_IRON_PICK, amt, () => ironRemaining, setIronRemaining);
          } else if (passive === "coal" && steelCount > 0) {
            const amt = steelCount * techniqueRatePerPick.coal * dt;
            lastGrant = amt;
            game.grantResource({ resourceId: RES_ORE_COAL, amount: amt });
            applyMinedAndDurability(ITEM_STEEL_PICK, amt, () => steelRemaining, setSteelRemaining);
          }
        }
        setTechniqueLastGrant(lastGrant);

        const bronzeRate = 4, ironRate = 8, steelRate = 16;
        const xpPerSec = hasTechniqueUp ? (bronzeCount * bronzeRate + ironCount * ironRate + steelCount * steelRate) : 0;
        if (xpPerSec > 0) game.grantResource({ resourceId: RES_XP, amount: xpPerSec * dt });

        return game.stepWithEvents(dt);
      },
    };

    const onTickEnd = (): void => refresh();
    game.bus.on("tickEnd", onTickEnd);

    const loop = createFixedStepLoop(tickable, { stepSeconds: 0.25, maxStepsPerTick: 5, intervalMs: 16 });
    if (running) loop.start();

    return (): void => {
      loop.stop();
      game.bus.off("tickEnd", onTickEnd);
    };
  }, [game, passive, running, refresh, applyMinedAndDurability]);

  const amount = (id: ResourceId): number => Number((state.resources.find((r: { id: ResourceId; amount: Quantity }) => r.id === id)?.amount as unknown as number) ?? 0);
  const xp = amount(RES_XP);
  const level = levelFromXp(xp);
  const gold = amount(RES_GOLD);
  const copper = amount(RES_ORE_COPPER);
  const tin = amount(RES_ORE_TIN);
  const ironOre = amount(RES_ORE_IRON);
  const coalOre = amount(RES_ORE_COAL);
  const hasTechnique = (state.upgrades.find((u) => u.id === UP_TECH)?.level ?? 0) > 0;

  const bronzeCount = countItem(ITEM_BRONZE_PICK);
  const ironCount = countItem(ITEM_IRON_PICK);
  const steelCount = countItem(ITEM_STEEL_PICK);

  const canSeeIronTier = level >= 5;
  const canSeeSteelTier = level >= 10;
  const canPassiveCopper = hasTechnique && canSeeIronTier;
  const canPassiveTin = hasTechnique && canSeeIronTier;
  const canPassiveIron = hasTechnique && canSeeSteelTier;

  React.useEffect(() => {
    if ((passive === "copper" || passive === "tin") && !canSeeIronTier) {
      // fallback: none available, keep as copper but no passive will apply until unlocked
      setPassive("copper");
    } else if (passive === "iron" && !canPassiveIron) {
      if (canPassiveTin) setPassive("tin");
      else if (canPassiveCopper) setPassive("copper");
    }
  }, [passive, canPassiveCopper, canPassiveTin, canPassiveIron, canSeeIronTier]);

  const buyBronzeCost = 10;
  const buyIronCost = 150;
  const buySteelCost = 1000;

  const buyPicks = (itemId: ItemId, unitCost: number, count: number): void => {
    spendGoldAnd(unitCost * count, () => { game.addItems(itemId, count); });
  };

  const craftIronBar = (): void => {
    // Cost: 25 iron ore
    const ore = amount(RES_ORE_IRON);
    if (ore < 25) return;
    const ok = consumeResourceLocal(RES_ORE_IRON, 25);
    if (!ok) return;
    game.addItems(ITEM_IRON_BAR, 1);
    refresh();
  };
  const craftSteelBar = (): void => {
    // Cost: 50 iron ore + 25 coal
    const ore = amount(RES_ORE_IRON);
    const coal = amount(RES_ORE_COAL);
    if (ore < 50 || coal < 25) return;
    // Consume both resources atomically (best-effort ordering)
    const okIron = consumeResourceLocal(RES_ORE_IRON, 50);
    if (!okIron) return;
    const okCoal = consumeResourceLocal(RES_ORE_COAL, 25);
    if (!okCoal) {
      // rollback iron if coal fails (simple rollback for demo)
      consumeResourceLocal(RES_ORE_IRON, -50);
      return;
    }
    game.addItems(ITEM_STEEL_BAR, 1);
    refresh();
  };
  const craftIronPick = (): void => {
    // Cost: 2 iron bars
    const bars = state.inventory.reduce((acc, e) => acc + (e.id === ITEM_IRON_BAR ? e.count : 0), 0);
    if (bars < 2) return;
    game.consumeItems(ITEM_IRON_BAR, 2);
    game.addItems(ITEM_IRON_PICK, 1);
    refresh();
  };

  const buyBronze = (): void => buyPicks(ITEM_BRONZE_PICK, buyBronzeCost, 1);
  const buyIron = (): void => buyPicks(ITEM_IRON_PICK, buyIronCost, 1);
  const buySteel = (): void => buyPicks(ITEM_STEEL_PICK, buySteelCost, 1);

  const disabledStyle = (cond: boolean): React.CSSProperties => cond ? { opacity: 0.6, pointerEvents: "none" } : {};

  const clickMineCopper = (): void => { if (bronzeCount > 0) { game.grantResource({ resourceId: RES_ORE_COPPER, amount: 1 }); game.grantResource({ resourceId: RES_XP, amount: 1 }); applyMinedAndDurability(ITEM_BRONZE_PICK, 1, () => bronzeRemaining, setBronzeRemaining); refresh(); } };
  const clickMineTin = (): void => { if (bronzeCount > 0) { game.grantResource({ resourceId: RES_ORE_TIN, amount: 1 }); game.grantResource({ resourceId: RES_XP, amount: 1 }); applyMinedAndDurability(ITEM_BRONZE_PICK, 1, () => bronzeRemaining, setBronzeRemaining); refresh(); } };
  const clickMineIron = (): void => { if (ironCount > 0) { game.grantResource({ resourceId: RES_ORE_IRON, amount: 1 }); game.grantResource({ resourceId: RES_XP, amount: 1 }); applyMinedAndDurability(ITEM_IRON_PICK, 1, () => ironRemaining, setIronRemaining); refresh(); } };
  const clickMineCoal = (): void => { if (steelCount > 0) { game.grantResource({ resourceId: RES_ORE_COAL, amount: 1 }); game.grantResource({ resourceId: RES_XP, amount: 1 }); applyMinedAndDurability(ITEM_STEEL_PICK, 1, () => steelRemaining, setSteelRemaining); refresh(); } };

  return (
    <div style={{ color: "#e6e6e6", background: "#0f1115", minHeight: "100vh", padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica Neue, Arial" }}>
      <h1 style={{ margin: 0, marginBottom: 16 }}>ClickMiner — React</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card label="Level" value={String(level)} />
        <Card label="XP" value={xp.toFixed(0)} />
        <Card label="Gold" value={gold.toFixed(2)} />
        <Card label="Copper Ore" value={copper.toFixed(2)} />
        <Card label="Tin Ore" value={tin.toFixed(2)} />
        <Card label="Iron Ore" value={ironOre.toFixed(2)} />
        <Card label="Coal" value={coalOre.toFixed(2)} />
      </div>
      <div style={{ height: 12 }} />

      <Section title="Mine">
        <div className="muted" style={{ opacity: 0.75, marginBottom: 6 }}>
          Click to mine instantly. All manual mining requires the matching pickaxe.
        </div>
        <Row>
          <span style={{ opacity: 0.75 }}>Bronze Picks: {bronzeCount}</span>
          {bronzeCount > 0 && <span className="muted" style={{ opacity: 0.75 }}>Durability: {Math.max(0, Math.ceil(bronzeRemaining))}/100</span>}
          {bronzeCount > 0 && <Button onClick={clickMineCopper}>Mine Copper (click)</Button>}
          {bronzeCount > 0 && <Button onClick={clickMineTin}>Mine Tin (click)</Button>}
        </Row>
        {canSeeIronTier && (
          <Row>
            <span style={{ opacity: 0.75 }}>Iron Picks: {ironCount}</span>
            {ironCount > 0 && <span className="muted" style={{ opacity: 0.75 }}>Durability: {Math.max(0, Math.ceil(ironRemaining))}/100</span>}
            {ironCount > 0 && <Button onClick={clickMineIron}>Mine Iron (click)</Button>}
          </Row>
        )}
        {canSeeSteelTier && (
          <Row>
            <span style={{ opacity: 0.75 }}>Steel Picks: {steelCount}</span>
            {steelCount > 0 && <span className="muted" style={{ opacity: 0.75 }}>Durability: {Math.max(0, Math.ceil(steelRemaining))}/100</span>}
            {steelCount > 0 && <Button onClick={clickMineCoal}>Mine Coal (click)</Button>}
          </Row>
        )}
      </Section>

      <Section title="Prospector Store">
        <div className="muted" style={{ opacity: 0.75, marginBottom: 6 }}>
          Buy and sell ore, bars, and pickaxes for gold. Prices shown per unit.
        </div>
        {/* Ore rows */}
        <Row>
          <div style={{ minWidth: 220 }}>Copper Ore — Buy {PRICE.buy.copper}g | Sell {PRICE.sell.copper}g</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 1, () => game.grantResource({ resourceId: RES_ORE_COPPER, amount: 1 }))} style={disabledStyle(gold < PRICE.buy.copper)}>Buy 1</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 5, () => game.grantResource({ resourceId: RES_ORE_COPPER, amount: 5 }))} style={disabledStyle(gold < PRICE.buy.copper * 5)}>Buy 5</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 10, () => game.grantResource({ resourceId: RES_ORE_COPPER, amount: 10 }))} style={disabledStyle(gold < PRICE.buy.copper * 10)}>Buy 10</Button>
            <Button onClick={(): void => { game.sellResource({ fromResourceId: RES_ORE_COPPER, toResourceId: RES_GOLD, unitPrice: PRICE.sell.copper }); refresh(); }}>Sell all</Button>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 220 }}>Tin Ore — Buy {PRICE.buy.copper}g | Sell {PRICE.sell.copper}g</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 1, () => game.grantResource({ resourceId: RES_ORE_TIN, amount: 1 }))} style={disabledStyle(gold < PRICE.buy.copper)}>Buy 1</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 5, () => game.grantResource({ resourceId: RES_ORE_TIN, amount: 5 }))} style={disabledStyle(gold < PRICE.buy.copper * 5)}>Buy 5</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.copper * 10, () => game.grantResource({ resourceId: RES_ORE_TIN, amount: 10 }))} style={disabledStyle(gold < PRICE.buy.copper * 10)}>Buy 10</Button>
            <Button onClick={(): void => { game.sellResource({ fromResourceId: RES_ORE_TIN, toResourceId: RES_GOLD, unitPrice: PRICE.sell.copper }); refresh(); }}>Sell all</Button>
          </div>
        </Row>
        {canSeeIronTier && (
          <Row>
            <div style={{ minWidth: 220 }}>Iron Ore — Buy {PRICE.buy.iron}g | Sell {PRICE.sell.iron}g</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.iron * 1, () => game.grantResource({ resourceId: RES_ORE_IRON, amount: 1 }))} style={disabledStyle(gold < PRICE.buy.iron)}>Buy 1</Button>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.iron * 5, () => game.grantResource({ resourceId: RES_ORE_IRON, amount: 5 }))} style={disabledStyle(gold < PRICE.buy.iron * 5)}>Buy 5</Button>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.iron * 10, () => game.grantResource({ resourceId: RES_ORE_IRON, amount: 10 }))} style={disabledStyle(gold < PRICE.buy.iron * 10)}>Buy 10</Button>
              <Button onClick={(): void => { game.sellResource({ fromResourceId: RES_ORE_IRON, toResourceId: RES_GOLD, unitPrice: PRICE.sell.iron }); refresh(); }}>Sell all</Button>
            </div>
          </Row>
        )}
        {canSeeSteelTier && (
          <Row>
            <div style={{ minWidth: 220 }}>Coal — Buy {PRICE.buy.coal}g | Sell {PRICE.sell.coal}g</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.coal * 1, () => game.grantResource({ resourceId: RES_ORE_COAL, amount: 1 }))} style={disabledStyle(gold < PRICE.buy.coal)}>Buy 1</Button>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.coal * 5, () => game.grantResource({ resourceId: RES_ORE_COAL, amount: 5 }))} style={disabledStyle(gold < PRICE.buy.coal * 5)}>Buy 5</Button>
              <Button onClick={(): void => spendGoldAnd(PRICE.buy.coal * 10, () => game.grantResource({ resourceId: RES_ORE_COAL, amount: 10 }))} style={disabledStyle(gold < PRICE.buy.coal * 10)}>Buy 10</Button>
              <Button onClick={(): void => { game.sellResource({ fromResourceId: RES_ORE_COAL, toResourceId: RES_GOLD, unitPrice: PRICE.sell.coal }); refresh(); }}>Sell all</Button>
            </div>
          </Row>
        )}
        {/* Bars */}
        <Row>
          <div style={{ minWidth: 220 }}>Bronze Bar — Buy 500g | Sell 250g</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={(): void => spendGoldAnd(500 * 1, () => game.addItems(ITEM_BRONZE_BAR, 1))} style={disabledStyle(gold < 500)}>Buy 1</Button>
            <Button onClick={(): void => spendGoldAnd(500 * 5, () => game.addItems(ITEM_BRONZE_BAR, 5))} style={disabledStyle(gold < 2500)}>Buy 5</Button>
            <Button onClick={(): void => spendGoldAnd(500 * 10, () => game.addItems(ITEM_BRONZE_BAR, 10))} style={disabledStyle(gold < 5000)}>Buy 10</Button>
            <Button onClick={(): void => { game.sellItems({ itemId: ITEM_BRONZE_BAR, toResourceId: RES_GOLD, unitPrice: 250 }); refresh(); }}>Sell all</Button>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 220 }}>Iron Bar — Buy {PRICE.buy.ironBar}g | Sell {PRICE.sell.ironBar}g</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.ironBar * 1, () => game.addItems(ITEM_IRON_BAR, 1))} style={disabledStyle(gold < PRICE.buy.ironBar)}>Buy 1</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.ironBar * 5, () => game.addItems(ITEM_IRON_BAR, 5))} style={disabledStyle(gold < PRICE.buy.ironBar * 5)}>Buy 5</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.ironBar * 10, () => game.addItems(ITEM_IRON_BAR, 10))} style={disabledStyle(gold < PRICE.buy.ironBar * 10)}>Buy 10</Button>
            <Button onClick={(): void => { game.sellItems({ itemId: ITEM_IRON_BAR, toResourceId: RES_GOLD, unitPrice: PRICE.sell.ironBar }); refresh(); }}>Sell all</Button>
          </div>
        </Row>
        {/* Pickaxes */}
        <Row>
          <div style={{ minWidth: 220 }}>Bronze Pickaxe — Buy {PRICE.buy.bronzePick}g | Sell {PRICE.sell.bronzePick}g</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.bronzePick * 1, () => game.addItems(ITEM_BRONZE_PICK, 1))} style={disabledStyle(gold < PRICE.buy.bronzePick)}>Buy 1</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.bronzePick * 5, () => game.addItems(ITEM_BRONZE_PICK, 5))} style={disabledStyle(gold < PRICE.buy.bronzePick * 5)}>Buy 5</Button>
            <Button onClick={(): void => spendGoldAnd(PRICE.buy.bronzePick * 10, () => game.addItems(ITEM_BRONZE_PICK, 10))} style={disabledStyle(gold < PRICE.buy.bronzePick * 10)}>Buy 10</Button>
            <Button onClick={(): void => { game.sellItems({ itemId: ITEM_BRONZE_PICK, toResourceId: RES_GOLD, unitPrice: PRICE.sell.bronzePick }); refresh(); }}>Sell all</Button>
          </div>
        </Row>
        {canSeeIronTier && (
          <Row>
            <div style={{ minWidth: 220 }}>Iron Pickaxe — Sell {PRICE.sell.ironPick}g</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={(): void => { game.sellItems({ itemId: ITEM_IRON_PICK, toResourceId: RES_GOLD, unitPrice: PRICE.sell.ironPick }); refresh(); }}>Sell all</Button>
            </div>
          </Row>
        )}
        {canSeeSteelTier && (
          <Row>
            <div style={{ minWidth: 220 }}>Steel Pickaxe — Sell {PRICE.sell.steelPick}g</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={(): void => { game.sellItems({ itemId: ITEM_STEEL_PICK, toResourceId: RES_GOLD, unitPrice: PRICE.sell.steelPick }); refresh(); }}>Sell all</Button>
            </div>
          </Row>
        )}
      </Section>

      <Section title="Buy Pickaxes (Requires Level)">
        <div className="muted" style={{ opacity: 0.75, marginBottom: 6 }}>
          Unlock higher tiers by leveling up; spend gold to buy pickaxes that increase passive potential.
        </div>
        <Row>
          <div style={{ minWidth: 180 }}>Bronze (L1, 10g)</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={buyBronze} style={disabledStyle(gold < buyBronzeCost)}>Buy 1</Button>
            <Button onClick={(): void => buyPicks(ITEM_BRONZE_PICK, buyBronzeCost, 5)} style={disabledStyle(gold < buyBronzeCost * 5)}>Buy 5</Button>
            <Button onClick={(): void => buyPicks(ITEM_BRONZE_PICK, buyBronzeCost, 10)} style={disabledStyle(gold < buyBronzeCost * 10)}>Buy 10</Button>
          </div>
        </Row>
        {canSeeIronTier && (
          <Row>
            <div style={{ minWidth: 180 }}>Iron (L5, 150g)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={buyIron} style={disabledStyle(gold < buyIronCost)}>Buy 1</Button>
              <Button onClick={(): void => buyPicks(ITEM_IRON_PICK, buyIronCost, 5)} style={disabledStyle(gold < buyIronCost * 5)}>Buy 5</Button>
              <Button onClick={(): void => buyPicks(ITEM_IRON_PICK, buyIronCost, 10)} style={disabledStyle(gold < buyIronCost * 10)}>Buy 10</Button>
            </div>
          </Row>
        )}
        {canSeeSteelTier && (
          <Row>
            <div style={{ minWidth: 180 }}>Steel (L10, 1000g)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={buySteel} style={disabledStyle(gold < buySteelCost)}>Buy 1</Button>
              <Button onClick={(): void => buyPicks(ITEM_STEEL_PICK, buySteelCost, 5)} style={disabledStyle(gold < buySteelCost * 5)}>Buy 5</Button>
              <Button onClick={(): void => buyPicks(ITEM_STEEL_PICK, buySteelCost, 10)} style={disabledStyle(gold < buySteelCost * 10)}>Buy 10</Button>
            </div>
          </Row>
        )}
      </Section>

      <Section title="Passive Mining (Technique I)">
        <div className="muted" style={{ opacity: 0.75, marginBottom: 6 }}>
          Grants a small passive bonus to the selected rock (requires Passive Mining upgrade). Each owned matching pickaxe increases the bonus. Passive becomes available once you unlock the NEXT material.
        </div>
        {techniqueToast && (
          <div style={{ background: "#12381f", border: "1px solid #1f6b3a", color: "#b5f2c8", borderRadius: 6, padding: 8, marginBottom: 8 }}>
            {techniqueToast}
          </div>
        )}
        <Row>
          {canPassiveCopper && (
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" name="focus" checked={passive === "copper"} onChange={(): void => setPassive("copper")} /> Copper
            </label>
          )}
          {canPassiveTin && (
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" name="focus" checked={passive === "tin"} onChange={(): void => setPassive("tin")} /> Tin
            </label>
          )}
          {canPassiveIron && (
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" name="focus" checked={passive === "iron"} onChange={(): void => setPassive("iron")} /> Iron
            </label>
          )}
          {!canPassiveCopper && !canPassiveTin && !canPassiveIron && (
            <span className="muted" style={{ opacity: 0.7 }}>Unlock Iron to enable Copper/Tin passive</span>
          )}
        </Row>
        <div style={{ height: 6 }} />
        <Row>
          <span style={{ opacity: 0.85 }}>
            Status: {hasTechnique ? (
              <>
                Active — +{(
                  passive === "copper"
                    ? (bronzeCount * 0.15)
                    : passive === "tin"
                    ? (bronzeCount * 0.15)
                    : passive === "iron"
                    ? (ironCount * 0.25)
                    : (steelCount * 0.4)
                ).toFixed(2)} {passive} ore/sec
              </>
            ) : (
              <>Locked</>
            )}
          </span>
          <span style={{ width: 12 }} />
          <span className="muted" style={{ opacity: 0.75 }}>
            Last tick: {techniqueLastGrant.toFixed(2)} {passive}
          </span>
          <span style={{ width: 8 }} />
          <Button onClick={(): void => { if (!hasTechnique && gold >= 50) { game.applyUpgrade({ upgradeId: UP_TECH, costResourceId: RES_GOLD, cost: 50 }); } }} style={hasTechnique || gold < 50 ? { opacity: 0.6, pointerEvents: "none" } : {}}>
            {hasTechnique ? "Passive Mining Unlocked" : "Unlock Passive Mining (50g)"}
          </Button>
        </Row>
        <div style={{ height: 6 }} />
        <div className="muted" style={{ opacity: 0.7 }}>
          {hasTechnique ? (
            <>Change focus to redirect the bonus. Top-tier passive is disabled until a future tier exists.</>
          ) : (
            <>Buy Passive Mining to enable a small automatic yield on the selected rock.</>
          )}
        </div>
      </Section>

      <Section title="Inventory">
        {state.inventory.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No items</div>
        ) : (
          <ul>
            {state.inventory.map((e: { id: unknown; count: number }) => (
              <li key={String(e.id)}>{String(e.id)} × {e.count}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Crafting">
        <div className="muted" style={{ opacity: 0.75, marginBottom: 6 }}>
          Unlock recipes, then craft items using resources or materials.
        </div>
        <Row>
          <div style={{ minWidth: 260 }}>
            Bronze Bar — Requires: 20 Copper Ore + 10 Tin Ore
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!recipes.bronzeBar ? (
              <Button
                onClick={(): void => spendGoldAnd(RECIPE_UNLOCK.bronzeBar.gold, () => setRecipes((r) => ({ ...r, bronzeBar: true })))}
                style={disabledStyle(gold < RECIPE_UNLOCK.bronzeBar.gold || level < RECIPE_UNLOCK.bronzeBar.level)}
              >
                Unlock Recipe ({RECIPE_UNLOCK.bronzeBar.gold}g) — Req L{RECIPE_UNLOCK.bronzeBar.level}
              </Button>
            ) : (
              <Button
                onClick={(): void => { if (copper >= 20 && tin >= 10) { const ok1 = consumeResourceLocal(RES_ORE_COPPER, 20); const ok2 = consumeResourceLocal(RES_ORE_TIN, 10); if (ok1 && ok2) { game.addItems(ITEM_BRONZE_BAR, 1); refresh(); } } }}
                style={disabledStyle(copper < 20 || tin < 10)}
              >
                Craft 1
              </Button>
            )}
            <span className="muted" style={{ opacity: 0.75 }}>Stock: Copper {copper.toFixed(0)} | Tin {tin.toFixed(0)}</span>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 260 }}>
            Iron Bar — Requires: 25 Iron Ore
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!recipes.ironBar ? (
              <Button
                onClick={(): void => spendGoldAnd(RECIPE_UNLOCK.ironBar.gold, () => setRecipes((r) => ({ ...r, ironBar: true })))}
                style={disabledStyle(gold < RECIPE_UNLOCK.ironBar.gold || level < RECIPE_UNLOCK.ironBar.level)}
              >
                Unlock Recipe ({RECIPE_UNLOCK.ironBar.gold}g) — Req L{RECIPE_UNLOCK.ironBar.level}
              </Button>
            ) : (
              <Button onClick={craftIronBar} style={disabledStyle(ironOre < 25)}>Craft 1</Button>
            )}
            <span className="muted" style={{ opacity: 0.75 }}>Stock: Iron Ore {ironOre.toFixed(0)}</span>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 260 }}>
            Steel Bar — Requires: 50 Iron Ore + 25 Coal
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!recipes.steelBar ? (
              <Button
                onClick={(): void => spendGoldAnd(RECIPE_UNLOCK.steelBar.gold, () => setRecipes((r) => ({ ...r, steelBar: true })))}
                style={disabledStyle(gold < RECIPE_UNLOCK.steelBar.gold || level < RECIPE_UNLOCK.steelBar.level)}
              >
                Unlock Recipe ({RECIPE_UNLOCK.steelBar.gold}g) — Req L{RECIPE_UNLOCK.steelBar.level}
              </Button>
            ) : (
              <Button onClick={craftSteelBar} style={disabledStyle(ironOre < 50 || coalOre < 25)}>Craft 1</Button>
            )}
            <span className="muted" style={{ opacity: 0.75 }}>Stock: Iron {ironOre.toFixed(0)} | Coal {coalOre.toFixed(0)}</span>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 260 }}>
            Bronze Pickaxe — Requires: 2 Bronze Bars
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!recipes.bronzePick ? (
              <Button
                onClick={(): void => spendGoldAnd(RECIPE_UNLOCK.bronzePick.gold, () => setRecipes((r) => ({ ...r, bronzePick: true })))}
                style={disabledStyle(gold < RECIPE_UNLOCK.bronzePick.gold || level < RECIPE_UNLOCK.bronzePick.level)}
              >
                Unlock Recipe ({RECIPE_UNLOCK.bronzePick.gold}g) — Req L{RECIPE_UNLOCK.bronzePick.level}
              </Button>
            ) : (
              <Button
                onClick={(): void => { const bars = state.inventory.reduce((a,e)=>a+(e.id===ITEM_BRONZE_BAR?e.count:0),0); if (bars>=2){ game.consumeItems(ITEM_BRONZE_BAR,2); game.addItems(ITEM_BRONZE_PICK,1); refresh(); } }}
                style={disabledStyle(state.inventory.reduce((a,e)=>a+(e.id===ITEM_BRONZE_BAR?e.count:0),0) < 2)}
              >
                Craft 1
              </Button>
            )}
            <span className="muted" style={{ opacity: 0.75 }}>Stock: Bronze Bars {state.inventory.reduce((a,e)=>a+(e.id===ITEM_BRONZE_BAR?e.count:0),0)}</span>
          </div>
        </Row>
        <Row>
          <div style={{ minWidth: 260 }}>
            Iron Pickaxe — Requires: 2 Iron Bars
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!recipes.ironPick ? (
              <Button
                onClick={(): void => spendGoldAnd(RECIPE_UNLOCK.ironPick.gold, () => setRecipes((r) => ({ ...r, ironPick: true })))}
                style={disabledStyle(gold < RECIPE_UNLOCK.ironPick.gold || level < RECIPE_UNLOCK.ironPick.level)}
              >
                Unlock Recipe ({RECIPE_UNLOCK.ironPick.gold}g) — Req L{RECIPE_UNLOCK.ironPick.level}
              </Button>
            ) : (
              <Button onClick={craftIronPick} style={disabledStyle(state.inventory.reduce((acc, e) => acc + (e.id === ITEM_IRON_BAR ? e.count : 0), 0) < 2)}>Craft 1</Button>
            )}
            <span className="muted" style={{ opacity: 0.75 }}>Stock: Iron Bars {state.inventory.reduce((acc, e) => acc + (e.id === ITEM_IRON_BAR ? e.count : 0), 0)}</span>
          </div>
        </Row>
      </Section>

      <Row>
        <Button onClick={(): void => setRunning(r => !r)}>{running ? "Pause" : "Resume"}</Button>
      </Row>
    </div>
  );
}

function Card(props: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ background: "#151923", border: "1px solid #23283b", borderRadius: 8, padding: 16, minWidth: 220, flex: 1 }}>
      <div style={{ opacity: 0.75, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>{props.label}</div>
      <div style={{ fontSize: 20, marginTop: 6 }}>{props.value}</div>
    </div>
  );
}

function Button(props: React.PropsWithChildren<{ onClick?: () => void; style?: React.CSSProperties }>): JSX.Element {
  return (
    <button onClick={props.onClick} style={{ background: "#2b3248", color: "#e6e6e6", border: "1px solid #394160", padding: "8px 12px", borderRadius: 6, cursor: "pointer", ...(props.style ?? {}) }}>
      {props.children}
    </button>
  );
}

function Section(props: React.PropsWithChildren<{ title: string }>): JSX.Element {
  return (
    <div style={{ background: "#151923", border: "1px solid #23283b", borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ opacity: 0.75, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>{props.title}</div>
      <div style={{ height: 8 }} />
      {props.children}
    </div>
  );
}

function Row(props: React.PropsWithChildren): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {props.children}
    </div>
  );
}
