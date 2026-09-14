import client from "prom-client";

// One in-memory registry. Local `next dev` is a single process. Split Node
// instances (serverless) would each report their own counters.
const g = globalThis as unknown as {
  kanbonsMetrics?: {
    register: client.Registry;
    databaseUp: client.Gauge;
    poReads: client.Counter;
    poDuration: client.Histogram;
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
  return { register, databaseUp, poReads, poDuration };
}

const metrics = g.kanbonsMetrics ?? (g.kanbonsMetrics = makeMetrics());

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

export function observePoRead(
  status: string,
  durationMs: number | null | undefined
): void {
  const label =
    status === "failed" || status === "unmatched" || status === "saved"
      ? status
      : "unmatched";
  metrics.poReads.inc({ status: label });
  if (
    label !== "saved" &&
    durationMs != null &&
    durationMs >= 0
  ) {
    metrics.poDuration.observe(durationMs / 1000);
  }
}
