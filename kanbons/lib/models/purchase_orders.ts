import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawn } from "child_process";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";
import { createPurchaseOrderLine } from "./purchase_order_lines";
import type { Address } from "./packing_slip_match";
import {
  createPoIngestRun,
  snapshotJson,
  type PoCorrectionSnapshot,
} from "./po_ingest_runs";
import { ok, okMaybe } from "./result";

export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PurchaseOrderInsert = Omit<
  Database["public"]["Tables"]["purchase_orders"]["Insert"],
  "id"
>;
export type PurchaseOrderUpdate =
  Database["public"]["Tables"]["purchase_orders"]["Update"];

export type ParsedPoLine = {
  asWritten: string;
  itemCode: string;
  altCode: string | null;
  yardsPieces: number | null;
  productId: number | null;
};

export type ParsedPoDraft = {
  customerId: number | null;
  customerPo: string;
  date: string | null;
  shipDate: string | null;
  shipTo: Address;
  lines: ParsedPoLine[];
  issues: string[];
  ocrMarkdown: string | null;
  sourceName: string | null;
  ingestRunId: number | null;
};

export type ConfirmedPoInput = {
  packingListId: number;
  customerId: number;
  customerPo: string;
  date: string | null;
  shipDate: string | null;
  shipTo: Address;
  lines: ParsedPoLine[];
  ocrMarkdown: string | null;
  sourceName: string | null;
  issues: string[];
};

type ReviewJson = {
  customer_id?: number | null;
  customer_po?: string | null;
  date?: string | null;
  ship_date?: string | null;
  ship_to_name?: string | null;
  ship_to_address?: string | null;
  ship_to_city?: string | null;
  ship_to_state?: string | null;
  ship_to_zip?: string | null;
  lines?: Array<{
    description?: string | null;
    item_code?: string | null;
    alt_code?: string | null;
    quantity?: number | null;
    product_id?: number | null;
  }>;
  issues?: string[];
  ocr_markdown?: string | null;
};

export async function getPurchaseOrder(
  id: number
): Promise<PurchaseOrder | null> {
  return okMaybe(
    await supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle()
  );
}

export async function createPurchaseOrder(
  input: PurchaseOrderInsert
): Promise<PurchaseOrder> {
  return ok(
    await supabase.from("purchase_orders").insert(input).select("*").single()
  );
}

export async function updatePurchaseOrder(
  id: number,
  input: PurchaseOrderUpdate
): Promise<PurchaseOrder> {
  return ok(
    await supabase
      .from("purchase_orders")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}

export async function saveConfirmedPurchaseOrder(
  input: ConfirmedPoInput
): Promise<PurchaseOrder> {
  const gold: Json = {
    customer_id: input.customerId,
    customer_po: input.customerPo,
    date: input.date,
    ship_date: input.shipDate,
    ship_to: {
      name: input.shipTo.name,
      address: input.shipTo.address,
      city: input.shipTo.city,
      state: input.shipTo.state,
      zip: input.shipTo.zip,
    },
    lines: input.lines.map((line) => ({
      as_written: line.asWritten,
      item_code: line.itemCode,
      alt_code: line.altCode,
      yards_pieces: line.yardsPieces,
      product_id: line.productId,
    })),
  };
  const row = await createPurchaseOrder({
    customer_id: input.customerId,
    customer_po: input.customerPo,
    date: input.date,
    ship_date: input.shipDate,
    ship_to_name: input.shipTo.name,
    ship_to_address: input.shipTo.address,
    ship_to_city: input.shipTo.city,
    ship_to_state: input.shipTo.state,
    ship_to_zip: input.shipTo.zip,
    packing_list_id: input.packingListId,
    status: "ready",
    ocr_markdown: input.ocrMarkdown,
    source_path: input.sourceName,
    issues: input.issues.length > 0 ? input.issues.join("; ") : null,
    gold_json: gold,
  });
  for (const line of input.lines) {
    await createPurchaseOrderLine({
      purchase_order_id: row.id,
      description: line.asWritten || null,
      item_code: line.itemCode || null,
      quantity: line.yardsPieces,
      product_id: line.productId,
    });
  }
  return row;
}

const WAREHOUSE_READ_ERROR =
  "Could not read this purchase order. Type it below or try again.";

export async function parsePurchaseOrderPdf(
  bytes: Buffer,
  filename: string
): Promise<ParsedPoDraft> {
  const root = repoRoot();
  const python = pythonBin(root);
  const dir = await mkdtemp(join(tmpdir(), "kanbons-po-"));
  const safeName = filename.replace(/[^A-Za-z0-9._-]+/g, "_") || "po.pdf";
  const dest = join(dir, safeName);
  const started = Date.now();
  try {
    await writeFile(dest, bytes);
    const raw = await runPython(
      python,
      [join(root, "PO-ingestion", "process.py"), "--review", dest],
      root
    );
    let parsed: ReviewJson;
    try {
      parsed = JSON.parse(raw) as ReviewJson;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON from process.py: ${detail}`);
    }
    const draft = fromReviewJson(parsed, filename);
    const lineCount = draft.lines.filter((line) => line.asWritten).length;
    const recordedIssues = [...draft.issues];
    if (draft.customerId == null) recordedIssues.push("No customer");
    if (lineCount === 0) recordedIssues.push("No product lines");
    const run = await recordPoRead({
      filename,
      durationMs: Date.now() - started,
      status: "unmatched",
      failure_reason: recordedIssues.length > 0 ? recordedIssues.join("; ") : null,
      extracted: draftSnapshot(draft),
    });
    return { ...draft, ingestRunId: run?.id ?? null };
  } catch (error) {
    console.error("parsePurchaseOrderPdf", error);
    const detail = error instanceof Error ? error.message : String(error);
    await recordPoRead({
      filename,
      durationMs: Date.now() - started,
      status: "failed",
      failure_reason: detail,
      extracted: null,
    });
    throw new Error(
      detail.startsWith("Could not read") ? detail : WAREHOUSE_READ_ERROR
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function recordPoRead(input: {
  filename: string;
  durationMs: number;
  status: "failed" | "unmatched";
  failure_reason: string | null;
  extracted: PoCorrectionSnapshot | null;
}): Promise<{ id: number } | null> {
  try {
    return await createPoIngestRun({
      source_filename: input.filename,
      source_path: input.filename,
      duration_ms: input.durationMs,
      status: input.status,
      failure_reason: input.failure_reason,
      extracted_json: input.extracted ? snapshotJson(input.extracted) : null,
    });
  } catch (error) {
    console.error("po_ingest_runs", error);
    return null;
  }
}

export function draftSnapshot(draft: ParsedPoDraft): PoCorrectionSnapshot {
  return {
    customerId: draft.customerId == null ? "" : String(draft.customerId),
    customerPo: draft.customerPo,
    date: draft.date ?? "",
    shipDate: draft.shipDate ?? "",
    shipTo: draft.shipTo,
    billTo: draft.shipTo,
    lines: draft.lines.map((line) => ({
      asWritten: line.asWritten,
      itemCode: line.itemCode,
      altCode: line.altCode ?? "",
      yardsPieces: line.yardsPieces == null ? "" : String(line.yardsPieces),
      unit: "",
      productId: line.productId,
    })),
  };
}

function fromReviewJson(raw: ReviewJson, filename: string): ParsedPoDraft {
  const lines = (raw.lines ?? []).map((line) => ({
    asWritten: (line.description || line.item_code || "").trim(),
    itemCode: (line.item_code || "").trim(),
    altCode: (line.alt_code || "").trim() || null,
    yardsPieces:
      line.quantity == null || !Number.isFinite(Number(line.quantity))
        ? null
        : Number(line.quantity),
    productId: line.product_id ?? null,
  }));
  return {
    customerId: raw.customer_id ?? null,
    customerPo: (raw.customer_po || "").trim(),
    date: raw.date ?? null,
    shipDate: raw.ship_date ?? null,
    shipTo: {
      name: raw.ship_to_name ?? null,
      address: raw.ship_to_address ?? null,
      city: raw.ship_to_city ?? null,
      state: raw.ship_to_state ?? null,
      zip: raw.ship_to_zip ?? null,
    },
    lines: lines.length > 0
      ? lines
      : [{ asWritten: "", itemCode: "", altCode: null, yardsPieces: null, productId: null }],
    issues: Array.isArray(raw.issues) ? raw.issues : [],
    ocrMarkdown: raw.ocr_markdown ?? null,
    sourceName: filename,
    ingestRunId: null,
  };
}

function repoRoot(): string {
  if (process.env.KANBONS_ROOT) return process.env.KANBONS_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "PO-ingestion", "process.py"))) return dir;
    dir = resolve(dir, "..");
  }
  return resolve(process.cwd(), "..");
}

function pythonBin(root: string): string {
  const fromEnv = process.env.KANBONS_PYTHON;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const venv = join(root, ".venv", "bin", "python");
  return existsSync(venv) ? venv : "python3";
}

function jsonFromStdout(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    JSON.parse(slice);
    return slice;
  } catch {
    return null;
  }
}

function runPython(python: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, args, {
      cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Could not read this purchase order. It took too long."));
    }, 10 * 60 * 1000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (stderr.trim()) {
        console.error(stderr);
      }
      const json = jsonFromStdout(stdout);
      if (json) {
        resolvePromise(json);
        return;
      }
      const detail =
        stderr.trim() ||
        stdout.trim() ||
        `process.py exited ${code ?? "?"} with no JSON`;
      reject(new Error(detail));
    });
  });
}
