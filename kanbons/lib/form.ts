export function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

export function requiredText(formData: FormData, key: string): string {
  const value = text(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export function num(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requiredNum(formData: FormData, key: string): number {
  const value = num(formData, key);
  if (value == null) throw new Error(`${key} is required`);
  return value;
}

export function jsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Could not read the submitted lines");
    }
    return parsed as T[];
  } catch (error) {
    if (error instanceof Error && error.message === "Could not read the submitted lines") {
      throw error;
    }
    throw new Error("Could not read the submitted lines");
  }
}
