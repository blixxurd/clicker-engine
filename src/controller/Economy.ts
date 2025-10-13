import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import type { EngineEvent } from "../core/EventBus";
import { BaseSubsystem } from "./BaseSubsystem";
import { EconomyService } from "../service/EconomyService";
import type {
  BuyGeneratorArgs,
  ApplyUpgradeArgs,
  SellResourceArgs,
  SellItemsArgs,
  GrantResourceArgs,
  ConsumeResourceArgs,
} from "../service/EconomyService";

/**
 * Coordinates purchases and upgrades in the economy domain.
 *
 * Mutates the game state through `StateAccessor` after computing results via pure helpers.
 * Public instance methods emit domain `EngineEvent`s to be published by higher layers.
 */
export class Economy extends BaseSubsystem {
  public constructor(state: StateAccessor, registries: Registries) {
    super(state, registries);
  }

  /**
   * Buy one or more generators using the provided bulk mode and current currency.
   * @param args - Purchase parameters.
   * @returns Events describing the transaction (purchase and resource delta).
   */
  public buyGenerators(args: BuyGeneratorArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.buyGenerators(curr, args, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Apply a single upgrade if affordable.
   * @param args - Upgrade parameters including cost and currency resource.
   * @returns Events describing the upgrade and resource delta.
   */
  public applyUpgrade(args: ApplyUpgradeArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.applyUpgrade(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Sell a resource into another resource at a given unit price.
   * Commonly used to sell ore for gold.
   */
  public sellResource(args: SellResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.sellResource(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Sell an inventory item into a resource at a given unit price.
   */
  public sellItems(args: SellItemsArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.sellItems(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Grant resources directly (manual actions, quest rewards, etc.).
   */
  public grantResource(args: GrantResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.grantResource(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Consume resources directly if available (crafting costs, sinks).
   */
  public consumeResource(args: ConsumeResourceArgs): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = EconomyService.consumeResource(curr, args);
    if (state !== curr) this.state.setState(state);
    return events;
  }
}

// Re-export types for convenience
export type { BuyGeneratorArgs, ApplyUpgradeArgs, SellResourceArgs, SellItemsArgs, GrantResourceArgs, ConsumeResourceArgs } from "../service/EconomyService";

