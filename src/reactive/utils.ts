/**
 * Shallow equality comparison for change detection.
 *
 * - Primitives: strict equality
 * - Arrays: reference equality OR element-wise strict equality
 * - Objects: reference equality OR key-wise strict equality (shallow)
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are shallowly equal
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  // Identical references or primitive equality
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }

  // Different types
  if (typeof a !== typeof b) return false;

  // Primitives that aren't equal
  if (typeof a !== "object") return false;

  // At this point both are non-null objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  // Handle arrays
  if (Array.isArray(objA)) {
    if (!Array.isArray(objB)) return false;
    if (objA.length !== objB.length) return false;
    for (let i = 0; i < objA.length; i++) {
      if (objA[i] !== objB[i]) return false;
    }
    return true;
  }

  // Handle plain objects
  if (Array.isArray(objB)) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (objA[key] !== objB[key]) return false;
  }

  return true;
}
