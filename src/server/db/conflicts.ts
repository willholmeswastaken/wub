export class LinkConflictError extends Error {
  constructor() {
    super("Link already exists");
    this.name = "LinkConflictError";
  }
}

export function isUniqueViolation(cause: unknown) {
  const message =
    cause instanceof Error
      ? `${cause.message} ${"code" in cause ? String(cause.code) : ""}`
      : String(cause);
  return /unique constraint|UNIQUE constraint failed|duplicate key|23505/i.test(
    message,
  );
}

export function isLinkConflictError(
  cause: unknown,
): cause is LinkConflictError {
  return cause instanceof LinkConflictError;
}
