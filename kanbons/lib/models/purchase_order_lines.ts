import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

// Confirm on New packing slip writes these rows. No page lists them.

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
  const supabase = await createClient();
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
  const supabase = await createClient();
  return ok(
    await supabase
      .from("purchase_order_lines")
      .insert(input)
      .select("*")
      .single()
  );
}
