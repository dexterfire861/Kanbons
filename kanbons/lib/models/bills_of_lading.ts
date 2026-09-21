import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { DatabaseError, ok, okList, okMaybe } from "./result";
import {
  createPackingList,
  getPackingList,
  listConfirmedPackingLists,
  packingListNumber,
  type PackingList,
} from "./packing_lists";
import {
  createPackingListLine,
  deletePackingListLine,
  listPackingListLines,
  updatePackingListLine,
} from "./packing_list_lines";
import {
  createBillOfLadingLine,
  listBillOfLadingLines,
  listPackingListIdsOnBills,
  type BillOfLadingLine,
} from "./bill_of_lading_lines";
import { listProducts } from "./products";
import { packsFor } from "./packing_slip_match";

export type BillOfLading =
  Database["public"]["Tables"]["bills_of_lading"]["Row"];
export type BillOfLadingInsert = Omit<
  Database["public"]["Tables"]["bills_of_lading"]["Insert"],
  "id"
>;
export type BillOfLadingUpdate =
  Database["public"]["Tables"]["bills_of_lading"]["Update"];

export type BolPickLine = {
  packingListId: number;
  packingListLineId: number;
  onContainer: number;
};

export type BolPackingListChoice = {
  id: number;
  label: string;
  lines: Array<{
    id: number;
    product: string | null;
    yardsPieces: number;
  }>;
};

export type BillOfLadingViewLine = {
  packingListId: number;
  packingListLabel: string;
  product: string;
  yardsPieces: number | null;
};

export async function listBillsOfLading(limit = 150): Promise<BillOfLading[]> {
  return okList(
    await supabase
      .from("bills_of_lading")
      .select("*")
      .order("num_bol", { ascending: false })
      .limit(limit)
  );
}

export async function getBillOfLading(id: number): Promise<BillOfLading | null> {
  return okMaybe(
    await supabase.from("bills_of_lading").select("*").eq("id", id).maybeSingle()
  );
}

export async function createBillOfLading(
  input: BillOfLadingInsert
): Promise<BillOfLading> {
  return ok(
    await supabase.from("bills_of_lading").insert(input).select("*").single()
  );
}

export async function nextBillOfLadingNumber(): Promise<number> {
  const rows = okList(
    await supabase
      .from("bills_of_lading")
      .select("num_bol")
      .order("num_bol", { ascending: false })
      .limit(1)
  );
  return (rows[0]?.num_bol ?? 0) + 1;
}

export async function listPackingListsForBol(): Promise<BolPackingListChoice[]> {
  const taken = new Set(await listPackingListIdsOnBills());
  const headers = await listConfirmedPackingLists();
  const out: BolPackingListChoice[] = [];
  for (const header of headers) {
    if (taken.has(header.id)) continue;
    const lines = await listPackingListLines(header.id);
    const usable = lines.filter(
      (line) => line.id != null && Number(line.yards_pieces ?? 0) > 0
    );
    if (usable.length === 0) continue;
    out.push({
      id: header.id,
      label: packingListNumber(header),
      lines: usable.map((line) => ({
        id: line.id as number,
        product: line.product,
        yardsPieces: Number(line.yards_pieces ?? 0),
      })),
    });
  }
  return out;
}

export type BolAddress = {
  name: string | null;
  address: string | null;
  cityStateZip: string | null;
};

export type BolOrderRow = {
  number: string;
  pkgs: number | null;
};

export type BolCommodityRow = {
  description: string;
  qty: number | null;
};

export type BillOfLadingForm = {
  number: number;
  date: string | null;
  shipTo: BolAddress;
  billTo: BolAddress;
  orders: BolOrderRow[];
  commodities: BolCommodityRow[];
};

function cityStateZip(
  city: string | null,
  state: string | null,
  zip: string | null
): string | null {
  const line = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return line || null;
}

function addressOf(
  name: string | null,
  address: string | null,
  city: string | null,
  state: string | null,
  zip: string | null
): BolAddress {
  return {
    name,
    address,
    cityStateZip: cityStateZip(city, state, zip),
  };
}

export async function getBillOfLadingView(id: number): Promise<{
  header: BillOfLading;
  lines: BillOfLadingViewLine[];
  form: BillOfLadingForm;
} | null> {
  const header = await getBillOfLading(id);
  if (!header) return null;
  const rows = await listBillOfLadingLines(id);
  const packingIds = [...new Set(rows.map((row) => row.packing_list_id))];
  const productIds = [
    ...new Set(
      rows
        .map((row) => row.product_id)
        .filter((value): value is number => value != null)
    ),
  ];
  const labels = new Map<number, string>();
  const headers = new Map<number, PackingList>();
  for (const packingListId of packingIds) {
    const packing = await getPackingList(packingListId);
    if (packing) headers.set(packingListId, packing);
    labels.set(
      packingListId,
      packing ? packingListNumber(packing) : String(packingListId)
    );
  }
  const products = productIds.length === 0 ? [] : await listProducts();
  const productNames = new Map(
    products.map((product) => [product.id, product.product])
  );
  const unitPacks = new Map(
    products.map((product) => [product.id, product.unit_pack])
  );
  const lines = rows.map((row) => ({
    packingListId: row.packing_list_id,
    packingListLabel: labels.get(row.packing_list_id) ?? String(row.packing_list_id),
    product:
      (row.product_id != null ? productNames.get(row.product_id) : null) ??
      "—",
    yardsPieces: row.yards_pieces,
  }));
  const first = packingIds.map((packingId) => headers.get(packingId)).find(Boolean);
  const orders: BolOrderRow[] = packingIds.map((packingId) => {
    const onList = rows.filter((row) => row.packing_list_id === packingId);
    const pkgs = onList.reduce((sum, row) => {
      const packs = packsFor(
        row.yards_pieces,
        row.product_id == null ? null : unitPacks.get(row.product_id)
      );
      return packs == null ? sum : sum + packs;
    }, 0);
    const anyPacks = onList.some(
      (row) =>
        packsFor(
          row.yards_pieces,
          row.product_id == null ? null : unitPacks.get(row.product_id)
        ) != null
    );
    return {
      number: labels.get(packingId) ?? String(packingId),
      pkgs: anyPacks ? pkgs : null,
    };
  });
  return {
    header,
    lines,
    form: {
      number: header.num_bol,
      date: header.date,
      shipTo: addressOf(
        first?.ship_to_name ?? null,
        first?.ship_to_address ?? null,
        first?.ship_to_city ?? null,
        first?.ship_to_state ?? null,
        first?.ship_to_zip ?? null
      ),
      billTo: addressOf(
        first?.bill_to_name ?? null,
        first?.bill_to_address ?? null,
        first?.bill_to_city ?? null,
        first?.bill_to_state ?? null,
        first?.bill_to_zip ?? null
      ),
      orders,
      commodities: lines.map((line) => ({
        description: line.product,
        qty: line.yardsPieces,
      })),
    },
  };
}

export async function createBillOfLadingFromPicks(input: {
  date: string | null;
  picks: BolPickLine[];
}): Promise<BillOfLading> {
  if (input.picks.length === 0) {
    throw new DatabaseError("Pick at least one packing list");
  }
  const taken = new Set(await listPackingListIdsOnBills());
  const byList = new Map<number, BolPickLine[]>();
  for (const pick of input.picks) {
    if (pick.onContainer < 0) {
      throw new DatabaseError("On this container cannot be less than 0");
    }
    const rows = byList.get(pick.packingListId) ?? [];
    rows.push(pick);
    byList.set(pick.packingListId, rows);
  }

  const products = await listProducts();
  const byProduct = new Map(products.map((product) => [product.id, product]));

  const work: Array<{
    header: PackingList;
    takeLines: Array<{
      lineId: number;
      productId: number | null;
      product: string | null;
      take: number;
      leftover: number;
      have: number;
      preUni: number | null;
    }>;
  }> = [];

  for (const [packingListId, picks] of byList) {
    if (taken.has(packingListId)) {
      throw new DatabaseError(
        "That packing list is already on a bill of lading"
      );
    }
    const header = await getPackingList(packingListId);
    if (!header) throw new DatabaseError("Packing list not found");
    if (header.status !== "confirmed") {
      throw new DatabaseError(
        "Only confirmed packing lists can go on a bill of lading"
      );
    }
    const lines = await listPackingListLines(packingListId);
    const byId = new Map(
      lines
        .filter((line) => line.id != null)
        .map((line) => [line.id as number, line])
    );
    const takeLines = [];
    let anyTake = 0;
    for (const pick of picks) {
      const line = byId.get(pick.packingListLineId);
      if (!line || line.id == null) {
        throw new DatabaseError("Packing list line not found");
      }
      const have = Number(line.yards_pieces ?? 0);
      const take = pick.onContainer;
      if (take > have) {
        throw new DatabaseError(
          `On this container is more than the packing list for ${line.product ?? "a line"}`
        );
      }
      anyTake += take;
      takeLines.push({
        lineId: line.id,
        productId: line.product_id,
        product: line.product,
        take,
        leftover: have - take,
        have,
        preUni: line.pre_uni,
      });
    }
    if (anyTake <= 0) {
      throw new DatabaseError(
        `Type how much of ${packingListNumber(header)} goes on this container`
      );
    }
    work.push({ header, takeLines });
  }

  const bol = await createBillOfLading({
    num_bol: await nextBillOfLadingNumber(),
    date: input.date,
    status: "confirmed",
  });

  for (const item of work) {
    const leftoverLines: Array<{
      product_id: number | null;
      product: string | null;
      yards_pieces: number;
      unit: number | null;
      pre_uni: number | null;
    }> = [];
    for (const line of item.takeLines) {
      const product =
        line.productId == null ? null : (byProduct.get(line.productId) ?? null);
      if (line.take > 0) {
        await createBillOfLadingLine({
          bol_id: bol.id,
          packing_list_id: item.header.id,
          product_id: line.productId,
          yards_pieces: line.take,
        });
      }
      if (line.take <= 0) {
        leftoverLines.push({
          product_id: line.productId,
          product: line.product,
          yards_pieces: line.have,
          unit: packsFor(line.have, product?.unit_pack),
          pre_uni: line.preUni,
        });
        await deletePackingListLine(line.lineId);
        continue;
      }
      if (line.leftover > 0) {
        leftoverLines.push({
          product_id: line.productId,
          product: line.product,
          yards_pieces: line.leftover,
          unit: packsFor(line.leftover, product?.unit_pack),
          pre_uni: line.preUni,
        });
        await updatePackingListLine(line.lineId, {
          yards_pieces: line.take,
          unit: packsFor(line.take, product?.unit_pack),
        });
      }
    }
    if (leftoverLines.length > 0) {
      const leftover = await createPackingList({
        num_pl: item.header.num_pl,
        split: (item.header.split ?? 1) + 1,
        parent_id: item.header.id,
        customer_id: item.header.customer_id,
        customer: item.header.customer,
        customer_po: item.header.customer_po,
        date: item.header.date,
        ship_date: item.header.ship_date,
        state: item.header.state,
        status: "confirmed",
        ship_to_name: item.header.ship_to_name,
        ship_to_address: item.header.ship_to_address,
        ship_to_city: item.header.ship_to_city,
        ship_to_state: item.header.ship_to_state,
        ship_to_zip: item.header.ship_to_zip,
        bill_to_name: item.header.bill_to_name,
        bill_to_address: item.header.bill_to_address,
        bill_to_city: item.header.bill_to_city,
        bill_to_state: item.header.bill_to_state,
        bill_to_zip: item.header.bill_to_zip,
      });
      for (const line of leftoverLines) {
        await createPackingListLine({
          packing_list_id: leftover.id,
          product_id: line.product_id,
          product: line.product,
          yards_pieces: line.yards_pieces,
          unit: line.unit,
          type_of_unit: null,
          pre_uni: line.pre_uni,
        });
      }
    }
  }
  return bol;
}

export type { BillOfLadingLine };
