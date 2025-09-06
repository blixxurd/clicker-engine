export class PersistenceError extends Error {
  public override name = "PersistenceError";
  public constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidJsonError extends PersistenceError {
  public override name = "InvalidJsonError";
}

export class ValidationError extends PersistenceError {
  public override name = "ValidationError";
}

export class UnsupportedVersionError extends PersistenceError {
  public override name = "UnsupportedVersionError";
  public readonly version: number;
  public constructor(version: number) {
    super(`Unsupported save schema version: ${version}`);
    this.version = version;
  }
}
