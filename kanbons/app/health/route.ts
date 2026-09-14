import { pingDatabase } from "@/lib/models/health";

export async function GET() {
  const { ok } = await pingDatabase();
  return Response.json({ ok, database: ok });
}
