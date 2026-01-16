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

/** Thrown when no migration path exists between schema versions. */
export class MigrationPathError extends PersistenceError {
  public override name = "MigrationPathError";
  public readonly fromVersion: number;
  public readonly toVersion: number;

  public constructor(fromVersion: number, toVersion: number) {
    super(`No migration path from version ${fromVersion} to ${toVersion}`);
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
}

/** Thrown when a migration step fails during execution. */
export class MigrationError extends PersistenceError {
  public override name = "MigrationError";
  public readonly fromVersion: number;
  public readonly toVersion: number;
  public readonly reason: string;

  public constructor(fromVersion: number, toVersion: number, reason: string) {
    super(`Migration from v${fromVersion} to v${toVersion} failed: ${reason}`);
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
    this.reason = reason;
  }
}
