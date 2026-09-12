import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";
import {
  createShipmentLine,
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

export async function createShipment(input: ShipmentInsert): Promise<Shipment> {
  return ok(
    await supabase.from("shipments").insert(input).select("*").single()
  );
}

export async function updateShipment(
  id: number,
  input: ShipmentUpdate
): Promise<Shipment> {
  return ok(
    await supabase.from("shipments").update(input).eq("id", id).select("*").single()
  );
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
