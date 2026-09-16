import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { recordFieldChanges } from "./change_log";
import { ok, okList, okMaybe } from "./result";
import {
  createShipmentLine,
  listShipmentLineSummaries,
  type ShipmentLineInsert,
} from "./shipment_lines";

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Omit<
  Database["public"]["Tables"]["shipments"]["Insert"],
  "id"
>;
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type InTransitShipment = Pick<
  Shipment,
  "id" | "number" | "invoice_number" | "country" | "arrival_date" | "departure_date"
>;

export type CountryTile = {
  country: string;
  countryKey: string;
  shipmentCount: number;
  products: string[];
  recent: Pick<Shipment, "id" | "number" | "invoice_number" | "arrival_date">[];
};

const SHIPMENT_FIELDS = [
  "number",
  "country",
  "invoice_number",
  "arrival_date",
  "departure_date",
] as const;

function countryKey(country: string | null): string {
  return country?.trim() ? country.trim() : "";
}

function countryLabel(key: string): string {
  return key === "" ? "No country yet" : key;
}

async function logShipment(before: Shipment | null, after: Shipment): Promise<void> {
  await recordFieldChanges({
    table_name: "shipments",
    row_id: after.id,
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown>,
    fields: [...SHIPMENT_FIELDS],
  });
}

export async function listShipments(limit = 150): Promise<Shipment[]> {
  return okList(
    await supabase
      .from("shipments")
      .select("*")
      .order("number", { ascending: false })
      .limit(limit)
  );
}

export async function listInTransitShipments(): Promise<InTransitShipment[]> {
  const today = new Date().toISOString().slice(0, 10);
  return okList(
    await supabase
      .from("shipments")
      .select(
        "id, number, invoice_number, country, arrival_date, departure_date"
      )
      .or(`arrival_date.is.null,arrival_date.gt.${today}`)
      .order("number", { ascending: false })
  );
}

export async function getShipment(id: number): Promise<Shipment | null> {
  return okMaybe(
    await supabase.from("shipments").select("*").eq("id", id).maybeSingle()
  );
}

export async function listShipmentCountryTiles(): Promise<CountryTile[]> {
  const shipments = await listShipments(150);
  const lines = await listShipmentLineSummaries(shipments.map((row) => row.id));
  const productsByShipment = new Map<number, string[]>();
  for (const line of lines) {
    const label = [line.sku, line.product].filter(Boolean).join(" — ");
    if (!label) continue;
    const current = productsByShipment.get(line.shipment_id) ?? [];
    if (!current.includes(label)) current.push(label);
    productsByShipment.set(line.shipment_id, current);
  }

  const groups = new Map<string, Shipment[]>();
  for (const shipment of shipments) {
    const key = countryKey(shipment.country);
    const current = groups.get(key) ?? [];
    current.push(shipment);
    groups.set(key, current);
  }

  const tiles: CountryTile[] = [];
  for (const [key, rows] of groups) {
    const ordered = [...rows].sort((a, b) => {
      const aDate = a.arrival_date ?? "";
      const bDate = b.arrival_date ?? "";
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return b.number - a.number;
    });
    const productNames = new Set<string>();
    for (const row of rows) {
      for (const name of productsByShipment.get(row.id) ?? []) {
        productNames.add(name);
      }
    }
    tiles.push({
      country: countryLabel(key),
      countryKey: key,
      shipmentCount: rows.length,
      products: [...productNames].slice(0, 12),
      recent: ordered.slice(0, 5).map((row) => ({
        id: row.id,
        number: row.number,
        invoice_number: row.invoice_number,
        arrival_date: row.arrival_date,
      })),
    });
  }
  tiles.sort((a, b) => a.country.localeCompare(b.country));
  return tiles;
}

export async function createShipment(input: ShipmentInsert): Promise<Shipment> {
  const row: Shipment = ok(
    await supabase.from("shipments").insert(input).select("*").single()
  );
  await logShipment(null, row);
  return row;
}

export async function updateShipment(
  id: number,
  input: ShipmentUpdate
): Promise<Shipment> {
  const previous = await getShipment(id);
  const row: Shipment = ok(
    await supabase.from("shipments").update(input).eq("id", id).select("*").single()
  );
  await logShipment(previous, row);
  return row;
}

export async function createShipmentWithLines(
  header: ShipmentInsert,
  lines: Omit<ShipmentLineInsert, "shipment_id">[]
): Promise<Shipment> {
  const shipment = await createShipment(header);
  for (const line of lines) {
    if (line.product_id == null && !line.product && !line.sku) continue;
    await createShipmentLine({ ...line, shipment_id: shipment.id });
  }
  return shipment;
}
