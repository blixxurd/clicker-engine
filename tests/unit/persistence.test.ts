import { describe, it, expect } from "vitest";
import { serialize, parse, CURRENT_SCHEMA_VERSION, InvalidJsonError, UnsupportedVersionError, ValidationError, type GameState } from "../../src";

const emptyState: GameState = { version: 1, resources: [], generators: [], inventory: [], upgrades: [] };

describe("persistence", () => {
  it("roundtrips serialize/parse", () => {
    const json = serialize(emptyState);
    const parsed = parse(json);
    expect(parsed).toEqual(emptyState);
  });

  it("throws on invalid json", () => {
    expect(() => parse("not-json")).toThrow(InvalidJsonError);
  });

  it("throws on unsupported schema", () => {
    const bad = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, game: emptyState });
    expect(() => parse(bad)).toThrow(UnsupportedVersionError);
  });

  it("throws on validation error", () => {
    const bad = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, game: { ...emptyState, resources: [{ id: 123, amount: 0 }] } });
    expect(() => parse(bad)).toThrow(ValidationError);
  });
});
