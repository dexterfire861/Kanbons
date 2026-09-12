import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okMaybe } from "./result";

// Written by PO-ingestion/process.py today. The UI does not read these rows yet.

export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PurchaseOrderInsert = Omit<
  Database["public"]["Tables"]["purchase_orders"]["Insert"],
  "id"
>;
export type PurchaseOrderUpdate =
  Database["public"]["Tables"]["purchase_orders"]["Update"];

export async function getPurchaseOrder(
  id: number
): Promise<PurchaseOrder | null> {
  return okMaybe(
    await supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle()
  );
}

export async function createPurchaseOrder(
  input: PurchaseOrderInsert
): Promise<PurchaseOrder> {
  return ok(
    await supabase.from("purchase_orders").insert(input).select("*").single()
  );
}

export async function updatePurchaseOrder(
  id: number,
  input: PurchaseOrderUpdate
): Promise<PurchaseOrder> {
  return ok(
    await supabase
      .from("purchase_orders")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}
