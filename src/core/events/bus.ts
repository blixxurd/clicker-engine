/**
 * Event bus utilities for Engine domain events (subscribe/emit).
 * Framework-agnostic, minimal, in-memory pub/sub.
 */
import type { EngineEvent } from "./types";

/** Minimal pub/sub interface for engine events. */
export interface EventBus {
  on<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void;
  off<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void;
  emit(event: EngineEvent): void;
}

/**
 * Create a new in-memory EventBus instance.
 * @example
 * const bus = createEventBus();
 * bus.on("tickStart", (e) => {});
 * bus.emit({ type: "tickStart", dtSeconds: 1 });
 */
export function createEventBus(): EventBus {
  const handlers = new Map<EngineEvent["type"], Set<(e: EngineEvent) => void>>();
  return {
    on<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler as (e: EngineEvent) => void);
    },
    off<T extends EngineEvent["type"]>(type: T, handler: (event: Extract<EngineEvent, { type: T }>) => void): void {
      handlers.get(type)?.delete(handler as (e: EngineEvent) => void);
    },
    emit(event: EngineEvent): void {
      handlers.get(event.type)?.forEach((h) => h(event));
    },
  };
}
