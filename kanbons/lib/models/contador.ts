import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { packingListNumber } from "./packing_slip_match";
import { okList, okMaybe } from "./result";
import { searchPattern } from "./search";

export type ContadorRow = Database["public"]["Views"]["contador"]["Row"];

const PAGE_LIMIT = 80;
const FETCH_CAP = 500;
const LINE_CAP = 40;

export type ContadorReceipt = {
  container: string;
  invoice: string;
  written: string;
  yards: number | null;
};

export type ContadorSale = {
  listNumber: string;
  customer: string;
  yards: number | null;
};

export type ContadorStory = {
  row: ContadorRow;
  receipts: ContadorReceipt[];
  sales: ContadorSale[];
  reason: string;
};

export function contadorGap(row: ContadorRow): number {
  const basis =
    row.book_measurement != null
      ? Number(row.book_measurement)
      : row.book_quantity != null
        ? Number(row.book_quantity)
        : null;
  const gaps: number[] = [];
  if (basis != null && row.difference != null) {
    gaps.push(Math.abs(Number(row.difference) - basis));
  }
  if (basis != null && row.warehouse != null) {
    gaps.push(Math.abs(Number(row.warehouse) - basis));
  }
  return gaps.length === 0 ? 0 : Math.max(...gaps);
}

function amount(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function warehouseReason(row: ContadorRow): string {
  if (row.warehouse == null) return "No floor count has been entered.";
  const basis =
    row.book_measurement != null
      ? Number(row.book_measurement)
      : row.book_quantity != null
        ? Number(row.book_quantity)
        : null;
  if (basis == null) {
    return "Stock has no book quantity yet, so the floor count cannot be compared.";
  }
  const floor = Number(row.warehouse);
  const counted = row.contador_counted_at
    ? ` Counted ${new Date(row.contador_counted_at).toLocaleDateString()}.`
    : "";
  if (Math.abs(floor - basis) <= 0.01) {
    return `The floor count matches the book (${amount(basis)}).${counted}`;
  }
  const direction = floor > basis ? "higher than" : "lower than";
  return `The floor count is ${amount(floor)}, ${direction} the book quantity of ${amount(basis)}.${counted}`;
}

export async function listContador(options?: {
  q?: string;
  limit?: number;
}): Promise<ContadorRow[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? PAGE_LIMIT;
  const q = options?.q?.trim();
  let query = supabase.from("contador").select("*");
  if (q) {
    const pattern = searchPattern(q);
    query = query.or(`num.ilike."${pattern}",product.ilike."${pattern}"`);
  } else {
    query = query.or("book_mismatch.eq.true,warehouse_mismatch.eq.true");
  }
  const rows = okList(await query.limit(FETCH_CAP));
  return rows
    .sort(
      (a, b) =>
        contadorGap(b) - contadorGap(a) ||
        String(a.num ?? "").localeCompare(String(b.num ?? ""))
    )
    .slice(0, limit);
}

export async function listContadorForProducts(
  productIds: number[]
): Promise<ContadorRow[]> {
  if (productIds.length === 0) return [];
  const supabase = await createClient();
  return okList(
    await supabase.from("contador").select("*").in("product_id", productIds)
  );
}

export async function getContadorRow(
  productId: number
): Promise<ContadorRow | null> {
  const supabase = await createClient();
  return okMaybe(
    await supabase
      .from("contador")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle()
  );
}

export async function getContadorStory(
  productId: number
): Promise<ContadorStory | null> {
  const row = await getContadorRow(productId);
  if (!row) return null;
  const supabase = await createClient();
  const shipmentLines = okList(
    await supabase
      .from("shipment_lines")
      .select("shipment_id, sku, product, yards_pcs")
      .eq("product_id", productId)
      .limit(LINE_CAP)
  );
  const shipmentIds = [
    ...new Set(shipmentLines.map((line) => line.shipment_id)),
  ];
  const shipments =
    shipmentIds.length === 0
      ? []
      : okList(
          await supabase
            .from("shipments")
            .select("id, number, invoice_number, country")
            .in("id", shipmentIds)
        );
  const shipmentById = new Map(shipments.map((item) => [item.id, item]));
  const receipts: ContadorReceipt[] = shipmentLines.map((line) => {
    const shipment = shipmentById.get(line.shipment_id);
    const written = [line.sku, line.product].filter(Boolean).join(" — ");
    return {
      container: shipment
        ? `Container ${shipment.number}${shipment.country ? ` · ${shipment.country}` : ""}`
        : "Container",
      invoice: shipment?.invoice_number?.trim() || "No invoice",
      written: written || "No name on the line",
      yards: line.yards_pcs,
    };
  });

  const packingLines = okList(
    await supabase
      .from("packing_list_lines")
      .select("packing_list_id, yards_pieces")
      .eq("product_id", productId)
      .limit(LINE_CAP)
  );
  const listIds = [
    ...new Set(packingLines.map((line) => line.packing_list_id)),
  ];
  const lists =
    listIds.length === 0
      ? []
      : okList(
          await supabase
            .from("packing_lists")
            .select("id, num_pl, customer, customer_po, split")
            .in("id", listIds)
        );
  const listById = new Map(lists.map((item) => [item.id, item]));
  const sales: ContadorSale[] = packingLines.map((line) => {
    const list = listById.get(line.packing_list_id);
    return {
      listNumber: list ? packingListNumber(list) : "Packing list",
      customer: list?.customer?.trim() || "No customer",
      yards: line.yards_pieces,
    };
  });

  return { row, receipts, sales, reason: warehouseReason(row) };
}
