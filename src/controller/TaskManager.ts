import type { StateAccessor } from "./StateAccessor";
import type { Registries } from "../repo/registries";
import type { TaskInstance } from "../model/task";
import type { EngineEvent } from "../core/EventBus";
import { BaseSubsystem } from "./BaseSubsystem";
import { TaskService } from "../service/TaskService";

/**
 * Manages task lifecycle and writes next state via `StateAccessor`.
 *
 * Delegates pure logic to {@link TaskService}.
 */
export class TaskManager extends BaseSubsystem {
  public constructor(state: StateAccessor, registries: Registries) {
    super(state, registries);
  }

  /**
   * Evaluate task state and unlock tasks whose requirements are met.
   * @returns Events for unlocked or state-changed tasks.
   */
  public evaluate(): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = TaskService.evaluate(curr, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }

  /**
   * Attempt to claim and resolve rewards for a task instance.
   * @param taskId - Task instance id to claim.
   * @returns Events for task completion and reward granting.
   */
  public claim(taskId: TaskInstance["id"]): ReadonlyArray<EngineEvent> {
    const curr = this.state.getState();
    const { state, events } = TaskService.claim(curr, taskId, this.registries);
    if (state !== curr) this.state.setState(state);
    return events;
  }
}
