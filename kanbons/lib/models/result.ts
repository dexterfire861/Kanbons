export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

type QueryResult<T> = {
  data: T;
  error: { message: string } | null;
};

export function ok<T>(result: QueryResult<T | null>): T {
  if (result.error) throw new DatabaseError(result.error.message);
  if (result.data == null) throw new DatabaseError("No data returned");
  return result.data;
}

export function okList<T>(result: QueryResult<T[] | null>): T[] {
  if (result.error) throw new DatabaseError(result.error.message);
  return result.data ?? [];
}

export function okMaybe<T>(result: QueryResult<T | null>): T | null {
  if (result.error) throw new DatabaseError(result.error.message);
  return result.data;
}
