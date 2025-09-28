import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";

/**
 * Shared base class for all stateful controller subsystems.
 *
 * Controllers receive a `StateAccessor` to read and replace the immutable `GameState`,
 * and a set of typed `Registries` to look up static definitions (resources, generators, items, tasks).
 * Subclasses should delegate pure logic to Services and only perform state orchestration here.
 *
 * @remarks
 * This adheres to the repo's Controllers vs Services guideline: controllers are stateful and
 * orchestrate mutations; services remain pure and deterministic.
 */
export abstract class BaseSubsystem {
  protected readonly state: StateAccessor;
  protected readonly registries: Registries;

  /**
   * Construct a controller subsystem.
   * @param state - Accessor for the current immutable state snapshot.
   * @param registries - Static registries used by the subsystem.
   */
  protected constructor(state: StateAccessor, registries: Registries) {
    this.state = state;
    this.registries = registries;
  }
}


