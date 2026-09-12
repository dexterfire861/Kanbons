import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
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
  return okList(await supabase.from("products").select("*").order("num"));
}

export const listProductOptions = unstable_cache(
  async (): Promise<ProductOption[]> => {
    return okList(
      await supabase.from("products").select("id, num, product").order("num")
    );
  },
  ["product-options"],
  { revalidate: 45 }
);

export type MatchProduct = Pick<Product, "id" | "num" | "product" | "pre_uni">;

export const listMatchProducts = unstable_cache(
  async (): Promise<MatchProduct[]> =>
    okList(
      await supabase
        .from("products")
        .select("id, num, product, pre_uni")
        .order("num")
    ),
  ["match-products"],
  { revalidate: 45 }
);

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
