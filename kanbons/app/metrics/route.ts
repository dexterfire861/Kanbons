import { pingDatabase } from "@/lib/models/health";
import { renderMetrics, setDatabaseUp } from "@/lib/metrics";

export async function GET() {
  const { ok } = await pingDatabase();
  setDatabaseUp(ok);
  const { body, contentType } = await renderMetrics();
  return new Response(body, {
    headers: { "Content-Type": contentType },
  });
}
