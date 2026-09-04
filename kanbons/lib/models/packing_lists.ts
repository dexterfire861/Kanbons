import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";

export type PackingList = Database["public"]["Tables"]["packing_lists"]["Row"];
export type PackingListInsert = Omit<
  Database["public"]["Tables"]["packing_lists"]["Insert"],
  "id"
>;
export type PackingListUpdate =
  Database["public"]["Tables"]["packing_lists"]["Update"];

export async function listPackingLists(
  limit = 150
): Promise<PackingList[]> {
  return okList(
    await supabase
      .from("packing_lists")
      .select("*")
      .order("num_pl", { ascending: false })
      .limit(limit)
  );
}

export async function getPackingList(id: number): Promise<PackingList | null> {
  return okMaybe(
    await supabase.from("packing_lists").select("*").eq("id", id).maybeSingle()
  );
}

export async function createPackingList(
  input: PackingListInsert
): Promise<PackingList> {
  return ok(
    await supabase.from("packing_lists").insert(input).select("*").single()
  );
}

export async function updatePackingList(
  id: number,
  input: PackingListUpdate
): Promise<PackingList> {
  return ok(
    await supabase
      .from("packing_lists")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}

export async function nextPackingListNumber(): Promise<number> {
  const rows = okList(
    await supabase
      .from("packing_lists")
      .select("num_pl")
      .order("num_pl", { ascending: false })
      .limit(1)
  );
  return (rows[0]?.num_pl ?? 0) + 1;
}
