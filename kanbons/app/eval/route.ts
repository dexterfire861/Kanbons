import { pingDatabase } from "@/lib/models/health";
import { getEvalSnapshot } from "@/lib/models/eval";

export async function GET() {
  const { ok } = await pingDatabase();
  if (!ok) {
    return Response.json({ ok: false, database: false });
  }
  const snapshot = await getEvalSnapshot();
  return Response.json({ ok: true, database: true, ...snapshot });
}
