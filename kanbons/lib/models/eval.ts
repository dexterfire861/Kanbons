import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { okList } from "./result";

const SAMPLE = 500;

export const OCR_JSON_FIELDS = [
  "customerId",
  "customerPo",
  "date",
  "shipDate",
  "shipTo.name",
  "shipTo.address",
  "shipTo.city",
  "shipTo.state",
  "shipTo.zip",
  "billTo.name",
  "billTo.address",
  "billTo.city",
  "billTo.state",
  "billTo.zip",
  "lines.asWritten",
  "lines.itemCode",
  "lines.altCode",
  "lines.yardsPieces",
  "lines.unit",
  "lines.productId",
] as const;

export type OcrJsonField = (typeof OCR_JSON_FIELDS)[number];

const OCR_FIELD_SET = new Set<string>(OCR_JSON_FIELDS);

export type EvalSnapshot = {
  po: {
    failed: number;
    unmatched: number;
    savedClean: number;
    savedChanged: number;
    lineMatchRatio: number | null;
    extracted: Record<OcrJsonField, number>;
    corrections: Record<OcrJsonField, number>;
  };
  mappings: {
    unlinked: number;
    woodhaven: number;
    general: number;
    ambiguous: number;
  };
  warehouse: { book: number; floor: number };
  changes: {
    stock: number;
    product_mappings: number;
    shipments: number;
  };
};

type RunRow = {
  status: string;
  extracted_json: Json | null;
  resolved_json: Json | null;
  gold_json: Json | null;
};

type MappingRow = {
  client_name: string;
  company: string | null;
  product_id: number | null;
};

function emptyFieldCounts(): Record<OcrJsonField, number> {
  return Object.fromEntries(OCR_JSON_FIELDS.map((field) => [field, 0])) as Record<
    OcrJsonField,
    number
  >;
}

function filled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim() !== "";
}

function asRecord(value: Json | null | undefined): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function jsonFieldFromPath(path: string): OcrJsonField | null {
  const parts = path.split(".");
  if (parts[0] === "lines" && parts.length >= 3 && /^\d+$/.test(parts[1])) {
    const key = `lines.${parts[2]}`;
    return OCR_FIELD_SET.has(key) ? (key as OcrJsonField) : null;
  }
  return OCR_FIELD_SET.has(path) ? (path as OcrJsonField) : null;
}

function tallyExtracted(
  extracted: Json | null,
  into: Record<OcrJsonField, number>
): void {
  const row = asRecord(extracted);
  if (!row) return;
  for (const key of ["customerId", "customerPo", "date", "shipDate"] as const) {
    if (filled(row[key])) into[key] += 1;
  }
  for (const party of ["shipTo", "billTo"] as const) {
    const addr = asRecord(row[party] as Json);
    if (!addr) continue;
    for (const part of ["name", "address", "city", "state", "zip"] as const) {
      if (filled(addr[part])) into[`${party}.${part}`] += 1;
    }
  }
  if (!Array.isArray(row.lines)) return;
  for (const line of row.lines) {
    const item = asRecord(line as Json);
    if (!item) continue;
    for (const part of [
      "asWritten",
      "itemCode",
      "altCode",
      "yardsPieces",
      "unit",
      "productId",
    ] as const) {
      if (filled(item[part])) into[`lines.${part}`] += 1;
    }
  }
}

function tallyCorrections(
  resolved: Json | null,
  into: Record<OcrJsonField, number>
): void {
  const row = asRecord(resolved);
  if (!row) return;
  for (const path of Object.keys(row)) {
    const field = jsonFieldFromPath(path);
    if (field) into[field] += 1;
  }
}

function isEmptyDiff(resolved: Json | null): boolean {
  const row = asRecord(resolved);
  if (!row) return true;
  return Object.keys(row).length === 0;
}

function lineMatchBits(gold: Json | null, resolved: Json | null): {
  matched: number;
  total: number;
} {
  const goldRow = asRecord(gold);
  const lines = goldRow && Array.isArray(goldRow.lines) ? goldRow.lines : [];
  const changed = new Set<string>();
  const resolvedRow = asRecord(resolved);
  if (resolvedRow) {
    for (const path of Object.keys(resolvedRow)) {
      if (/^lines\.\d+\.productId$/.test(path)) changed.add(path);
    }
  }
  let total = 0;
  let matched = 0;
  lines.forEach((line, index) => {
    const item = asRecord(line as Json);
    if (!item || !filled(item.productId)) return;
    total += 1;
    if (!changed.has(`lines.${index}.productId`)) matched += 1;
  });
  return { matched, total };
}

async function countTable(
  table: "po_ingest_runs" | "product_mappings" | "change_log",
  column: string,
  value: string
): Promise<number> {
  const result = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function countViewEq(
  column: "book_mismatch" | "warehouse_mismatch",
  value: boolean
): Promise<number> {
  const result = await supabase
    .from("contador")
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function countIsNull(
  table: "product_mappings",
  column: string
): Promise<number> {
  const result = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .is(column, null);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function countAll(
  table: "product_mappings"
): Promise<number> {
  const result = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (result.error) throw result.error;
  return result.count ?? 0;
}

export async function getEvalSnapshot(): Promise<EvalSnapshot> {
  const [
    failed,
    unmatched,
    unlinked,
    woodhaven,
    mappingTotal,
    bookMismatch,
    floorMismatch,
    stockChanges,
    mappingChanges,
    shipmentChanges,
    recent,
    maps,
  ] = await Promise.all([
    countTable("po_ingest_runs", "status", "failed"),
    countTable("po_ingest_runs", "status", "unmatched"),
    countIsNull("product_mappings", "product_id"),
    countTable("product_mappings", "company", "Woodhaven"),
    countAll("product_mappings"),
    countViewEq("book_mismatch", true),
    countViewEq("warehouse_mismatch", true),
    countTable("change_log", "table_name", "stock"),
    countTable("change_log", "table_name", "product_mappings"),
    countTable("change_log", "table_name", "shipments"),
    supabase
      .from("po_ingest_runs")
      .select("status, extracted_json, resolved_json, gold_json")
      .order("created_at", { ascending: false })
      .limit(SAMPLE)
      .then(okList),
    supabase
      .from("product_mappings")
      .select("client_name, company, product_id")
      .then(okList),
  ]);

  const extracted = emptyFieldCounts();
  const corrections = emptyFieldCounts();
  let savedClean = 0;
  let savedChanged = 0;
  let matchHits = 0;
  let matchTotal = 0;

  for (const run of recent as RunRow[]) {
    tallyExtracted(run.extracted_json, extracted);
    if (run.status !== "saved") continue;
    tallyCorrections(run.resolved_json, corrections);
    if (isEmptyDiff(run.resolved_json)) savedClean += 1;
    else savedChanged += 1;
    const bits = lineMatchBits(run.gold_json, run.resolved_json);
    matchHits += bits.matched;
    matchTotal += bits.total;
  }

  const ambiguousKeys = new Map<string, Set<number>>();
  for (const row of maps as MappingRow[]) {
    if (row.product_id == null) continue;
    const key = `${row.company ?? ""}|${row.client_name.trim().toUpperCase()}`;
    const ids = ambiguousKeys.get(key) ?? new Set<number>();
    ids.add(row.product_id);
    ambiguousKeys.set(key, ids);
  }
  let ambiguous = 0;
  for (const ids of ambiguousKeys.values()) {
    if (ids.size > 1) ambiguous += 1;
  }

  return {
    po: {
      failed,
      unmatched,
      savedClean,
      savedChanged,
      lineMatchRatio: matchTotal === 0 ? null : matchHits / matchTotal,
      extracted,
      corrections,
    },
    mappings: {
      unlinked,
      woodhaven,
      general: Math.max(0, mappingTotal - woodhaven),
      ambiguous,
    },
    warehouse: { book: bookMismatch, floor: floorMismatch },
    changes: {
      stock: stockChanges,
      product_mappings: mappingChanges,
      shipments: shipmentChanges,
    },
  };
}
