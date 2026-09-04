import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";

export type Stock = Database["public"]["Tables"]["stock"]["Row"];
export type StockInsert = Database["public"]["Tables"]["stock"]["Insert"];
export type StockUpdate = Database["public"]["Tables"]["stock"]["Update"];

export async function listStock(): Promise<Stock[]> {
  return okList(await supabase.from("stock").select("*").order("product_id"));
}

export async function getStock(productId: number): Promise<Stock | null> {
  return okMaybe(
    await supabase.from("stock").select("*").eq("product_id", productId).maybeSingle()
  );
}

export async function decrementStockByUnits(
  productId: number,
  units: number
): Promise<Stock> {
  const current = await getStock(productId);
  const quantity = (current?.quantity ?? 0) - units;
  if (current) {
    return updateStock(productId, { quantity });
  }
  return upsertStock({ product_id: productId, quantity });
}

export async function upsertStock(input: StockInsert): Promise<Stock> {
  return ok(
    await supabase.from("stock").upsert(input).select("*").single()
  );
}

export async function updateStock(
  productId: number,
  input: StockUpdate
): Promise<Stock> {
  return ok(
    await supabase
      .from("stock")
      .update(input)
      .eq("product_id", productId)
      .select("*")
      .single()
  );
}
