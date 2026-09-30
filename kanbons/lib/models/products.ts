import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Omit<
  Database["public"]["Tables"]["products"]["Insert"],
  "id"
>;
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type ProductOption = Pick<Product, "id" | "num" | "product">;

export async function listProducts(): Promise<Product[]> {
  const supabase = await createClient();
  return okList(await supabase.from("products").select("*").order("num"));
}

export async function listProductOptions(): Promise<ProductOption[]> {
  const supabase = await createClient();
  return okList(
    await supabase.from("products").select("id, num, product").order("num")
  );
}

export type MatchProduct = Pick<
  Product,
  "id" | "num" | "product" | "pre_uni" | "unit_pack"
>;

export async function listMatchProducts(): Promise<MatchProduct[]> {
  const supabase = await createClient();
  return okList(
    await supabase
      .from("products")
      .select("id, num, product, pre_uni, unit_pack")
      .order("num")
  );
}

export async function getProduct(id: number): Promise<Product | null> {
  const supabase = await createClient();
  return okMaybe(
    await supabase.from("products").select("*").eq("id", id).maybeSingle()
  );
}

export async function createProduct(input: ProductInsert): Promise<Product> {
  const supabase = await createClient();
  return ok(
    await supabase.from("products").insert(input).select("*").single()
  );
}

export async function updateProduct(
  id: number,
  input: ProductUpdate
): Promise<Product> {
  const supabase = await createClient();
  return ok(
    await supabase.from("products").update(input).eq("id", id).select("*").single()
  );
}
