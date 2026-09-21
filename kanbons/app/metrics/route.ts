import { pingDatabase } from "@/lib/models/health";
import { getEvalSnapshot } from "@/lib/models/eval";
import { renderMetrics, setDatabaseUp, setEvalGauges } from "@/lib/metrics";

export async function GET() {
  const { ok } = await pingDatabase();
  setDatabaseUp(ok);
  if (ok) {
    setEvalGauges(await getEvalSnapshot());
  }
  const { body, contentType } = await renderMetrics();
  return new Response(body, {
    headers: { "Content-Type": contentType },
  });
}
