/**
 * Development-time assertion.
 * Throws an Error in development when condition is false.
 * Safe to tree-shake in production builds.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}


