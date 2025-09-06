import { describe, it, expect } from "vitest";
import { formatting } from "../../src";

describe("formatShort", () => {
  it("formats small numbers without suffix", () => {
    expect(formatting.formatShort(12)).toBe("12");
    expect(formatting.formatShort(12.34)).toBe("12.34");
  });
  it("applies K/M/B/T suffixes", () => {
    expect(formatting.formatShort(1_234)).toBe("1.23K");
    expect(formatting.formatShort(12_345_678)).toBe("12.35M");
    expect(formatting.formatShort(1_234_567_890)).toBe("1.23B");
    expect(formatting.formatShort(1_234_000_000_000)).toBe("1.23T");
  });
  it("trims trailing zeros by default", () => {
    expect(formatting.formatShort(1_200)).toBe("1.2K");
  });
  it("falls back to scientific at extremes", () => {
    expect(formatting.formatShort(1e-4)).toMatch(/e-/);
    expect(formatting.formatShort(1e16)).toMatch(/e\+/);
  });
});
