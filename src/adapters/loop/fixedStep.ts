/**
 * Fixed-step loop adapter for driving a tickable target from a host scheduler.
 * Handles backpressure by capping steps per host tick.
 */
import type { EngineEvent } from "../../core/EventBus";

export interface Tickable {
  stepWithEvents(dtSeconds: number): ReadonlyArray<EngineEvent>;
}

export interface FixedStepLoopOptions {
  /** Fixed dt per step in seconds. */
  readonly stepSeconds: number;
  /** Backpressure cap per host tick (default 5). */
  readonly maxStepsPerTick?: number;
  /** Scheduler cadence (default 16ms). */
  readonly intervalMs?: number;
}

export interface FixedStepLoop {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Create a fixed-step loop using setInterval.
 * @example
 * const loop = createFixedStepLoop(engine, { stepSeconds: 0.5 });
 * loop.start();
 */
export function createFixedStepLoop(engine: Tickable, opts: FixedStepLoopOptions): FixedStepLoop {
  const stepSeconds = opts.stepSeconds;
  const maxSteps = opts.maxStepsPerTick ?? 5;
  const intervalMs = opts.intervalMs ?? 16;
  let running = false;
  let pendingSeconds = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const onTick = (): void => {
    if (!running) return;
    pendingSeconds += intervalMs / 1000;
    let steps = 0;
    while (pendingSeconds >= stepSeconds && steps < maxSteps) {
      engine.stepWithEvents(stepSeconds);
      pendingSeconds -= stepSeconds;
      steps++;
    }
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      pendingSeconds = 0;
      timer = setInterval(onTick, intervalMs);
    },
    stop(): void {
      if (!running) return;
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      pendingSeconds = 0;
    },
    isRunning(): boolean {
      return running;
    },
  };
}
