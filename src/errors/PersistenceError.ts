/** Base class for persistence-related errors with stable names for discrimination. */
export class PersistenceError extends Error {
  public override name = "PersistenceError";
  public constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a save string cannot be parsed as valid JSON. */
export class InvalidJsonError extends PersistenceError {
  public override name = "InvalidJsonError";
}

/** Thrown when a parsed save does not conform to the expected schema. */
export class ValidationError extends PersistenceError {
  public override name = "ValidationError";
}

/** Thrown when a save uses an unsupported schema version. */
export class UnsupportedVersionError extends PersistenceError {
  public override name = "UnsupportedVersionError";
  public readonly version: number;
  public constructor(version: number) {
    super(`Unsupported save schema version: ${version}`);
    this.version = version;
  }
}
