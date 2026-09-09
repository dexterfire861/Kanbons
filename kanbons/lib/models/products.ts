import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { debugLog } from "@/lib/timing";
import { ok, okList, okMaybe } from "./result";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Omit<
  Database["public"]["Tables"]["products"]["Insert"],
  "id"
>;
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type ProductOption = Pick<Product, "id" | "num" | "product">;

export async function listProducts(): Promise<Product[]> {
  const start = performance.now();
  const rows = okList(await supabase.from("products").select("*").order("num"));
  // #region agent log
  debugLog("E", "lib/models/products.ts:listProducts", "catalog fetch", {
    ms: Math.round(performance.now() - start),
    rowCount: rows.length,
  });
  // #endregion
  return rows;
}

export async function listProductOptions(): Promise<ProductOption[]> {
  const start = performance.now();
  const rows = okList(
    await supabase.from("products").select("id, num, product").order("num")
  );
  // #region agent log
  debugLog("E", "lib/models/products.ts:listProductOptions", "catalog options", {
    ms: Math.round(performance.now() - start),
    rowCount: rows.length,
  });
  // #endregion
  return rows;
}

export async function getProduct(id: number): Promise<Product | null> {
  return okMaybe(
    await supabase.from("products").select("*").eq("id", id).maybeSingle()
  );
}

export async function createProduct(input: ProductInsert): Promise<Product> {
  return ok(
    await supabase.from("products").insert(input).select("*").single()
  );
}

export async function updateProduct(
  id: number,
  input: ProductUpdate
): Promise<Product> {
  return ok(
    await supabase.from("products").update(input).eq("id", id).select("*").single()
  );
}
