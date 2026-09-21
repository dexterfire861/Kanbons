import client from "prom-client";
import {
  OCR_JSON_FIELDS,
  type EvalSnapshot,
} from "@/lib/models/eval";

// One in-memory registry. Local `next dev` is a single process. Split Node
// instances (serverless) would each report their own counters.
const g = globalThis as unknown as {
  kanbonsMetricsVersion?: number;
  kanbonsMetrics?: {
    register: client.Registry;
    databaseUp: client.Gauge;
    poReads: client.Counter;
    poDuration: client.Histogram;
    poRuns: client.Gauge<"outcome">;
    poExtracted: client.Gauge<"field">;
    poCorrections: client.Gauge<"field">;
    poLineMatch: client.Gauge;
    mappings: client.Gauge<"kind">;
    warehouseMismatch: client.Gauge<"kind">;
    changes: client.Gauge<"table">;
  };
};

function makeMetrics() {
  const register = new client.Registry();
  const databaseUp = new client.Gauge({
    name: "kanbons_database_up",
    help: "1 if the local database answered a ping, else 0",
    registers: [register],
  });
  const poReads = new client.Counter({
    name: "kanbons_po_reads_total",
    help: "Purchase order PDF reads by status",
    labelNames: ["status"] as const,
    registers: [register],
  });
  const poDuration = new client.Histogram({
    name: "kanbons_po_read_duration_seconds",
    help: "Time to read a purchase order PDF",
    buckets: [1, 2, 5, 10, 20, 30, 60, 120, 300],
    registers: [register],
  });
  const poRuns = new client.Gauge({
    name: "kanbons_po_runs",
    help: "PO ingest runs: failed, unmatched, saved with no OCR diffs, saved after a person changed the extract",
    labelNames: ["outcome"] as const,
    registers: [register],
  });
  const poExtracted = new client.Gauge({
    name: "kanbons_po_extracted",
    help: "How often each OCR JSON field came back with a value (recent reads; line fields count each product line)",
    labelNames: ["field"] as const,
    registers: [register],
  });
  const poCorrections = new client.Gauge({
    name: "kanbons_po_field_corrections",
    help: "How often a person changed that OCR JSON field before save (recent saved reads)",
    labelNames: ["field"] as const,
    registers: [register],
  });
  const poLineMatch = new client.Gauge({
    name: "kanbons_po_line_match_ratio",
    help: "Share of saved OCR lines whose productId was left as extracted",
    registers: [register],
  });
  const mappings = new client.Gauge({
    name: "kanbons_mappings",
    help: "Name match rows: unlinked to a product, Woodhaven, general, or the same wording for two products",
    labelNames: ["kind"] as const,
    registers: [register],
  });
  const warehouseMismatch = new client.Gauge({
    name: "kanbons_warehouse_mismatch",
    help: "Products whose book qty or floor count does not match remaining",
    labelNames: ["kind"] as const,
    registers: [register],
  });
  const changes = new client.Gauge({
    name: "kanbons_changes",
    help: "Rows in the change log by table",
    labelNames: ["table"] as const,
    registers: [register],
  });
  return {
    register,
    databaseUp,
    poReads,
    poDuration,
    poRuns,
    poExtracted,
    poCorrections,
    poLineMatch,
    mappings,
    warehouseMismatch,
    changes,
  };
}

const METRICS_VERSION = 2;
const metrics =
  g.kanbonsMetricsVersion === METRICS_VERSION && g.kanbonsMetrics
    ? g.kanbonsMetrics
    : (g.kanbonsMetrics = makeMetrics());
g.kanbonsMetricsVersion = METRICS_VERSION;

export async function renderMetrics(): Promise<{
  body: string;
  contentType: string;
}> {
  return {
    body: await metrics.register.metrics(),
    contentType: metrics.register.contentType,
  };
}

export function setDatabaseUp(up: boolean): void {
  metrics.databaseUp.set(up ? 1 : 0);
}

export function setEvalGauges(snapshot: EvalSnapshot): void {
  metrics.poRuns.set({ outcome: "failed" }, snapshot.po.failed);
  metrics.poRuns.set({ outcome: "unmatched" }, snapshot.po.unmatched);
  metrics.poRuns.set({ outcome: "saved_clean" }, snapshot.po.savedClean);
  metrics.poRuns.set({ outcome: "saved_changed" }, snapshot.po.savedChanged);
  for (const field of OCR_JSON_FIELDS) {
    metrics.poExtracted.set({ field }, snapshot.po.extracted[field]);
    metrics.poCorrections.set({ field }, snapshot.po.corrections[field]);
  }
  metrics.poLineMatch.set(snapshot.po.lineMatchRatio ?? 0);
  metrics.mappings.set({ kind: "unlinked" }, snapshot.mappings.unlinked);
  metrics.mappings.set({ kind: "woodhaven" }, snapshot.mappings.woodhaven);
  metrics.mappings.set({ kind: "general" }, snapshot.mappings.general);
  metrics.mappings.set({ kind: "ambiguous" }, snapshot.mappings.ambiguous);
  metrics.warehouseMismatch.set({ kind: "book" }, snapshot.warehouse.book);
  metrics.warehouseMismatch.set({ kind: "floor" }, snapshot.warehouse.floor);
  metrics.changes.set({ table: "stock" }, snapshot.changes.stock);
  metrics.changes.set(
    { table: "product_mappings" },
    snapshot.changes.product_mappings
  );
  metrics.changes.set({ table: "shipments" }, snapshot.changes.shipments);
}

export function observePoRead(
  status: string,
  durationMs: number | null | undefined
): void {
  const label =
    status === "failed" || status === "unmatched" || status === "saved"
      ? status
      : "unmatched";
  metrics.poReads.inc({ status: label });
  if (durationMs != null && durationMs >= 0 && label !== "saved") {
    metrics.poDuration.observe(durationMs / 1000);
  }
}
