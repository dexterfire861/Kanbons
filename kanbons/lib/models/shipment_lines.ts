import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

export {
  SHIPMENT_UNIT_TYPES,
  type ShipmentUnitType,
} from "./shipment_unit_types";

export type ShipmentLine = Database["public"]["Tables"]["shipment_lines"]["Row"];
export type ShipmentLineInsert = Omit<
  Database["public"]["Tables"]["shipment_lines"]["Insert"],
  "id"
>;
export type ShipmentLineUpdate =
  Database["public"]["Tables"]["shipment_lines"]["Update"];

export async function listShipmentLines(
  shipmentId: number
): Promise<ShipmentLine[]> {
  return okList(
    await supabase
      .from("shipment_lines")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("id")
  );
}

export async function createShipmentLine(
  input: ShipmentLineInsert
): Promise<ShipmentLine> {
  return ok(
    await supabase.from("shipment_lines").insert(input).select("*").single()
  );
}

export async function updateShipmentLine(
  id: number,
  input: ShipmentLineUpdate
): Promise<ShipmentLine> {
  return ok(
    await supabase
      .from("shipment_lines")
      .update(input)
      .eq("id", id)
      .select("*")
      .single()
  );
}
