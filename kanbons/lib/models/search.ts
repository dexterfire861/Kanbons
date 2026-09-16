export function searchPattern(q: string): string {
  const cleaned = q
    .replace(/[%_,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `%${cleaned}%`;
}
