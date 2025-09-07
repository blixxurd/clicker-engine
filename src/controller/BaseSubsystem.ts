import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";

/** Shared base for controller classes to access state and registries. */
export abstract class BaseSubsystem {
  protected readonly state: StateAccessor;
  protected readonly registries: Registries;

  protected constructor(state: StateAccessor, registries: Registries) {
    this.state = state;
    this.registries = registries;
  }
}


