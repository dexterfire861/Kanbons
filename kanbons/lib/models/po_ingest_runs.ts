import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok } from "./result";

export type PoIngestRun = Database["public"]["Tables"]["po_ingest_runs"]["Row"];
export type PoIngestRunInsert = Omit<
  Database["public"]["Tables"]["po_ingest_runs"]["Insert"],
  "id"
>;
export type PoIngestRunUpdate =
  Database["public"]["Tables"]["po_ingest_runs"]["Update"];

export async function createPoIngestRun(
  input: PoIngestRunInsert
): Promise<PoIngestRun> {
  return ok(
    await supabase.from("po_ingest_runs").insert(input).select("*").single()
  );
}

export async function updatePoIngestRun(
  id: number,
  input: PoIngestRunUpdate
): Promise<PoIngestRun> {
  return ok(
    await supabase
      .from("po_ingest_runs")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}
