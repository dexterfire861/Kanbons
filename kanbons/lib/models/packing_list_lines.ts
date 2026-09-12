import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

export type PackingListLine =
  Database["public"]["Tables"]["packing_list_lines"]["Row"];
export type PackingListLineInsert = Omit<
  Database["public"]["Tables"]["packing_list_lines"]["Insert"],
  "id"
>;
export type PackingListLineUpdate =
  Database["public"]["Tables"]["packing_list_lines"]["Update"];
export type PackingListLineTotal =
  Database["public"]["Views"]["packing_list_line_totals"]["Row"];

export async function listPackingListLines(
  packingListId: number
): Promise<PackingListLineTotal[]> {
  return okList(
    await supabase
      .from("packing_list_line_totals")
      .select("*")
      .eq("packing_list_id", packingListId)
      .order("id")
  );
}

export async function createPackingListLine(
  input: PackingListLineInsert
): Promise<PackingListLine> {
  return ok(
    await supabase.from("packing_list_lines").insert(input).select("*").single()
  );
}

export async function updatePackingListLine(
  id: number,
  input: PackingListLineUpdate
): Promise<PackingListLine> {
  return ok(
    await supabase
      .from("packing_list_lines")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}
