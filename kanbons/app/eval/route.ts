import { currentPerson } from "@/lib/auth/session";
import { pingDatabase } from "@/lib/models/health";
import { getEvalSnapshot } from "@/lib/models/eval";

export async function GET() {
  const person = await currentPerson();
  if (person?.role !== "admin") {
    return Response.json({ ok: false }, { status: 403 });
  }
  const { ok } = await pingDatabase();
  if (!ok) {
    return Response.json({ ok: false, database: false });
  }
  const snapshot = await getEvalSnapshot();
  return Response.json({ ok: true, database: true, ...snapshot });
}
