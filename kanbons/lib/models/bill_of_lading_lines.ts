import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

export type BillOfLadingLine =
  Database["public"]["Tables"]["bill_of_lading_lines"]["Row"];
export type BillOfLadingLineInsert = Omit<
  Database["public"]["Tables"]["bill_of_lading_lines"]["Insert"],
  "id"
>;
export type BillOfLadingLineUpdate =
  Database["public"]["Tables"]["bill_of_lading_lines"]["Update"];

export async function listBillOfLadingLines(
  bolId: number
): Promise<BillOfLadingLine[]> {
  return okList(
    await supabase
      .from("bill_of_lading_lines")
      .select("*")
      .eq("bol_id", bolId)
      .order("id")
  );
}

export async function listPackingListIdsOnBills(): Promise<number[]> {
  const rows = okList(
    await supabase.from("bill_of_lading_lines").select("packing_list_id")
  );
  return [...new Set(rows.map((row) => row.packing_list_id))];
}

export async function createBillOfLadingLine(
  input: BillOfLadingLineInsert
): Promise<BillOfLadingLine> {
  return ok(
    await supabase
      .from("bill_of_lading_lines")
      .insert(input)
      .select("*")
      .single()
  );
}
