import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { recordFieldChanges } from "./change_log";
import { ok, okList, okMaybe } from "./result";
import { searchPattern } from "./search";

export type ProductMapping =
  Database["public"]["Tables"]["product_mappings"]["Row"];
export type ProductMappingInsert = Omit<
  Database["public"]["Tables"]["product_mappings"]["Insert"],
  "id"
>;
export type ProductMappingUpdate =
  Database["public"]["Tables"]["product_mappings"]["Update"];

const MAPPING_FIELDS = [
  "client_name",
  "kanbons_name",
  "item_code",
  "product_id",
] as const;
const PAGE_LIMIT = 80;

async function logMapping(
  before: ProductMapping | null,
  after: ProductMapping
): Promise<void> {
  await recordFieldChanges({
    table_name: "product_mappings",
    row_id: after.id,
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown>,
    fields: [...MAPPING_FIELDS],
  });
}

export async function listProductMappings(): Promise<ProductMapping[]> {
  return okList(
    await supabase.from("product_mappings").select("*").order("id")
  );
}

export async function listProductMappingsPage(options?: {
  q?: string;
  limit?: number;
}): Promise<ProductMapping[]> {
  const limit = options?.limit ?? PAGE_LIMIT;
  const q = options?.q?.trim();
  let query = supabase.from("product_mappings").select("*");
  if (q) {
    const pattern = searchPattern(q);
    query = query.or(
      `client_name.ilike."${pattern}",kanbons_name.ilike."${pattern}",item_code.ilike."${pattern}"`
    );
  }
  return okList(await query.order("id").limit(limit));
}

export async function getProductMapping(
  id: number
): Promise<ProductMapping | null> {
  return okMaybe(
    await supabase.from("product_mappings").select("*").eq("id", id).maybeSingle()
  );
}

export async function createProductMapping(
  input: ProductMappingInsert
): Promise<ProductMapping> {
  const row: ProductMapping = ok(
    await supabase.from("product_mappings").insert(input).select("*").single()
  );
  await logMapping(null, row);
  return row;
}

export async function updateProductMapping(
  id: number,
  input: ProductMappingUpdate
): Promise<ProductMapping> {
  const previous = await getProductMapping(id);
  const row: ProductMapping = ok(
    await supabase
      .from("product_mappings")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
  await logMapping(previous, row);
  return row;
}
