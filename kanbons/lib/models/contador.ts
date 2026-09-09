import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { debugLog } from "@/lib/timing";
import { okList } from "./result";

export type ContadorRow = Database["public"]["Views"]["contador"]["Row"];

export async function listContador(): Promise<ContadorRow[]> {
  const start = performance.now();
  const rows = okList(
    await supabase
      .from("contador")
      .select(
        "product_id, num, product, have, sold, difference, book_quantity, warehouse, book_mismatch, warehouse_mismatch"
      )
      .order("num")
  );
  // #region agent log
  debugLog("B", "lib/models/contador.ts:listContador", "warehouse check view", {
    ms: Math.round(performance.now() - start),
    rowCount: rows.length,
  });
  // #endregion
  return rows;
}
