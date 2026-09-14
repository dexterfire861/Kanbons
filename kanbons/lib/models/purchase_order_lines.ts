import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

// Written by PO-ingestion/process.py today. The UI does not read these rows yet.

export type PurchaseOrderLine =
  Database["public"]["Tables"]["purchase_order_lines"]["Row"];
export type PurchaseOrderLineInsert = Omit<
  Database["public"]["Tables"]["purchase_order_lines"]["Insert"],
  "id"
>;
export type PurchaseOrderLineUpdate =
  Database["public"]["Tables"]["purchase_order_lines"]["Update"];

export async function listPurchaseOrderLines(
  purchaseOrderId: number
): Promise<PurchaseOrderLine[]> {
  return okList(
    await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", purchaseOrderId)
      .order("id")
  );
}

export async function createPurchaseOrderLine(
  input: PurchaseOrderLineInsert
): Promise<PurchaseOrderLine> {
  return ok(
    await supabase
      .from("purchase_order_lines")
      .insert(input)
      .select("*")
      .single()
  );
}
