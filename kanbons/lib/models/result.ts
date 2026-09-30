export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

type QueryError = { message: string } | null;

export function ok<T>(result: { data: T; error: QueryError }): Exclude<T, null> {
  if (result.error) throw new DatabaseError(result.error.message);
  if (result.data == null) throw new DatabaseError("No data returned");
  return result.data as Exclude<T, null>;
}

export function okList<T>(result: {
  data: T[] | null;
  error: QueryError;
}): T[] {
  if (result.error) throw new DatabaseError(result.error.message);
  return result.data ?? [];
}

export function okMaybe<T>(result: { data: T; error: QueryError }): T | null {
  if (result.error) throw new DatabaseError(result.error.message);
  return result.data;
}
