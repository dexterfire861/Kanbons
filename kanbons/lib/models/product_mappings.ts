import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

export type ProductMapping =
  Database["public"]["Tables"]["product_mappings"]["Row"];
export type ProductMappingInsert = Omit<
  Database["public"]["Tables"]["product_mappings"]["Insert"],
  "id"
>;
export type ProductMappingUpdate =
  Database["public"]["Tables"]["product_mappings"]["Update"];

export async function listProductMappings(): Promise<ProductMapping[]> {
  return okList(
    await supabase.from("product_mappings").select("*").order("id")
  );
}

export async function createProductMapping(
  input: ProductMappingInsert
): Promise<ProductMapping> {
  return ok(
    await supabase.from("product_mappings").insert(input).select("*").single()
  );
}

export async function updateProductMapping(
  id: number,
  input: ProductMappingUpdate
): Promise<ProductMapping> {
  return ok(
    await supabase
      .from("product_mappings")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}
