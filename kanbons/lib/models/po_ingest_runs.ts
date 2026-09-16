import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";
import { DatabaseError, ok, okMaybe } from "./result";
import { observePoRead } from "@/lib/metrics";
import type { Address } from "./packing_slip_match";

export type PoIngestRun = Database["public"]["Tables"]["po_ingest_runs"]["Row"];
export type PoIngestRunInsert = Omit<
  Database["public"]["Tables"]["po_ingest_runs"]["Insert"],
  "id"
>;
export type PoIngestRunUpdate =
  Database["public"]["Tables"]["po_ingest_runs"]["Update"];

export type PoCorrectionLine = {
  asWritten: string;
  itemCode: string;
  altCode: string;
  yardsPieces: string;
  unit: string;
  productId: number | null;
};

export type PoCorrectionSnapshot = {
  customerId: string;
  customerPo: string;
  date: string;
  shipDate: string;
  shipTo: Address;
  billTo: Address;
  lines: PoCorrectionLine[];
};

export type FieldChange = { from: Json; to: Json };

export async function getPoIngestRun(id: number): Promise<PoIngestRun | null> {
  return okMaybe(
    await supabase.from("po_ingest_runs").select("*").eq("id", id).maybeSingle()
  );
}

export async function createPoIngestRun(
  input: PoIngestRunInsert
): Promise<PoIngestRun> {
  const row = ok(
    await supabase.from("po_ingest_runs").insert(input).select("*").single()
  );
  observePoRead(row.status, row.duration_ms);
  return row;
}

export type PoReadResult = "Read" | "Needs you" | "Could not read";

export type PoReadView = {
  id: number;
  filename: string;
  howLong: string;
  result: PoReadResult;
  reason: string;
};

function howLong(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return "less than a second";
  const seconds = Math.round(ms / 1000);
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

export function poReadResult(status: string, failureReason: string | null): PoReadResult {
  if (status === "failed") return "Could not read";
  if (status === "unmatched" && failureReason) return "Needs you";
  return "Read";
}

function issueList(value: Json | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

function asView(row: PoIngestRun): PoReadView {
  const issues = issueList(row.issues);
  const reason = issues.join("; ") || row.failure_reason?.trim() || "";
  return {
    id: row.id,
    filename: row.source_filename,
    howLong: howLong(row.duration_ms),
    result: poReadResult(row.status, reason || null),
    reason,
  };
}

export async function listRecentPoIngestRuns(limit = 10): Promise<PoReadView[]> {
  const result = await supabase
    .from("po_ingest_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (result.error) throw new DatabaseError(result.error.message);
  return (result.data ?? []).map(asView);
}

export async function markPoIngestRunSaved(
  id: number,
  packingListId: number
): Promise<PoIngestRun> {
  return updatePoIngestRun(id, {
    status: "saved",
    packing_list_id: packingListId,
  });
}

export async function updatePoIngestRun(
  id: number,
  input: PoIngestRunUpdate
): Promise<PoIngestRun> {
  const row = ok(
    await supabase
      .from("po_ingest_runs")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
  if (input.status === "saved") {
    observePoRead("saved", row.duration_ms);
  }
  return row;
}

export function snapshotJson(snapshot: PoCorrectionSnapshot): Json {
  return snapshot as unknown as Json;
}

export function diffsJson(diff: Record<string, FieldChange>): Json {
  return diff as unknown as Json;
}

export function diffPoFields(
  extracted: PoCorrectionSnapshot | null,
  gold: PoCorrectionSnapshot
): Record<string, FieldChange> {
  const from = extracted ?? emptySnapshot();
  const out: Record<string, FieldChange> = {};
  walk("", from as unknown as Json, gold as unknown as Json, out);
  return out;
}

function emptySnapshot(): PoCorrectionSnapshot {
  return {
    customerId: "",
    customerPo: "",
    date: "",
    shipDate: "",
    shipTo: { name: null, address: null, city: null, state: null, zip: null },
    billTo: { name: null, address: null, city: null, state: null, zip: null },
    lines: [],
  };
}

function walk(
  path: string,
  left: Json | undefined,
  right: Json | undefined,
  out: Record<string, FieldChange>
): void {
  if (isPlain(left) && isPlain(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      walk(joinPath(path, key), left[key], right[key], out);
    }
    return;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    const a = Array.isArray(left) ? left : [];
    const b = Array.isArray(right) ? right : [];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      walk(joinPath(path, String(i)), a[i], b[i], out);
    }
    return;
  }
  if (asText(left) === asText(right)) return;
  out[path] = { from: left ?? null, to: right ?? null };
}

function isPlain(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function joinPath(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

function asText(value: Json | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}
