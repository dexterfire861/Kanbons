import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { debugLog } from "@/lib/timing";
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
  const start = performance.now();
  const rows = okList(
    await supabase
      .from("shipment_lines")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("id")
  );
  // #region agent log
  debugLog("D", "lib/models/shipment_lines.ts:listShipmentLines", "container lines", {
    shipmentId,
    ms: Math.round(performance.now() - start),
    rowCount: rows.length,
  });
  // #endregion
  return rows;
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
