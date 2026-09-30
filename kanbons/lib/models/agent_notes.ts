import { createClient } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";
import { ok, okList } from "./result";

export type AgentNote = Database["public"]["Tables"]["agent_notes"]["Row"];

export function noteProductIds(value: Json): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number");
}

export async function listRecentAgentNotes(limit = 8): Promise<AgentNote[]> {
  const supabase = await createClient();
  return okList(
    await supabase
      .from("agent_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function listAgentNotesForProduct(
  productId: number
): Promise<AgentNote[]> {
  const rows = await listRecentAgentNotes(100);
  return rows.filter((row) => noteProductIds(row.product_ids).includes(productId));
}

export async function createAgentNote(input: {
  poIngestRunId: number | null;
  productIds: number[];
  note: string;
  proposedAction: string;
}): Promise<AgentNote> {
  const supabase = await createClient();
  return ok(
    await supabase
      .from("agent_notes")
      .insert({
        po_ingest_run_id: input.poIngestRunId,
        product_ids: input.productIds,
        note: input.note,
        proposed_action: input.proposedAction,
      })
      .select("*")
      .single()
  );
}
