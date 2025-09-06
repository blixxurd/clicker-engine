/**
 * Fixed-step loop adapter for driving the Engine from a host scheduler.
 * Handles backpressure by capping steps per host tick.
 */
import type { Engine } from "../../controller/Engine";

export interface FixedStepLoopOptions {
  readonly stepSeconds: number; // fixed dt per step
  readonly maxStepsPerTick?: number; // backpressure cap per host tick
  readonly intervalMs?: number; // scheduler cadence (default 16ms)
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
export function createFixedStepLoop(engine: Engine, opts: FixedStepLoopOptions): FixedStepLoop {
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
