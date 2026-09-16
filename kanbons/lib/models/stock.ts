import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { recordFieldChanges } from "./change_log";
import { ok, okList, okMaybe } from "./result";
import { searchPattern } from "./search";

export type Stock = Database["public"]["Tables"]["stock"]["Row"];
export type StockInsert = Database["public"]["Tables"]["stock"]["Insert"];
export type StockUpdate = Database["public"]["Tables"]["stock"]["Update"];

export type StockListRow = Stock & { num: string; product: string };

const STOCK_FIELDS = ["quantity", "contador_physical"] as const;
const PAGE_LIMIT = 50;

async function logStock(
  before: Stock | null,
  after: Stock
): Promise<void> {
  await recordFieldChanges({
    table_name: "stock",
    row_id: after.product_id,
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown>,
    fields: [...STOCK_FIELDS],
  });
}

export async function listStock(): Promise<Stock[]> {
  return okList(await supabase.from("stock").select("*").order("product_id"));
}

export async function listStockPage(options?: {
  q?: string;
  limit?: number;
}): Promise<StockListRow[]> {
  const limit = options?.limit ?? PAGE_LIMIT;
  const q = options?.q?.trim();
  if (q) {
    const pattern = searchPattern(q);
    const products = await okList(
      await supabase
        .from("products")
        .select("id, num, product")
        .or(`num.ilike."${pattern}",product.ilike."${pattern}"`)
        .order("num")
        .limit(limit)
    );
    if (products.length === 0) return [];
    const stockRows = await okList(
      await supabase
        .from("stock")
        .select("*")
        .in(
          "product_id",
          products.map((product) => product.id)
        )
    );
    const byId = Object.fromEntries(stockRows.map((row) => [row.product_id, row]));
    return products.flatMap((product) => {
      const row = byId[product.id];
      if (!row) return [];
      return [{ ...row, num: product.num, product: product.product }];
    });
  }

  const stockRows = await okList(
    await supabase.from("stock").select("*").order("product_id").limit(limit)
  );
  if (stockRows.length === 0) return [];
  const products = await okList(
    await supabase
      .from("products")
      .select("id, num, product")
      .in(
        "id",
        stockRows.map((row) => row.product_id)
      )
  );
  const labels = Object.fromEntries(
    products.map((product) => [product.id, product])
  );
  return stockRows.map((row) => ({
    ...row,
    num: labels[row.product_id]?.num ?? String(row.product_id),
    product: labels[row.product_id]?.product ?? "",
  }));
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

export async function addWarehouseCount(
  productId: number,
  delta: number
): Promise<Stock> {
  const current = await getStock(productId);
  const next = (current?.contador_physical ?? 0) + delta;
  const countedAt = new Date().toISOString();
  if (current) {
    return updateStock(productId, {
      contador_physical: next,
      contador_counted_at: countedAt,
    });
  }
  return upsertStock({
    product_id: productId,
    contador_physical: next,
    contador_counted_at: countedAt,
  });
}

export async function upsertStock(input: StockInsert): Promise<Stock> {
  const previous = await getStock(input.product_id);
  const row: Stock = ok(
    await supabase.from("stock").upsert(input).select("*").single()
  );
  await logStock(previous, row);
  return row;
}

export async function updateStock(
  productId: number,
  input: StockUpdate
): Promise<Stock> {
  const previous = await getStock(productId);
  const row: Stock = ok(
    await supabase
      .from("stock")
      .update(input)
      .eq("product_id", productId)
      .select("*")
      .single()
  );
  await logStock(previous, row);
  return row;
}
