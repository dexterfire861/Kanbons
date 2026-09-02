import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Omit<
  Database["public"]["Tables"]["shipments"]["Insert"],
  "id"
>;
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export async function listShipments(): Promise<Shipment[]> {
  return okList(
    await supabase.from("shipments").select("*").order("number", { ascending: false })
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
