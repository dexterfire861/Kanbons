import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { okList } from "./result";
import { searchPattern } from "./search";

export type ContadorRow = Database["public"]["Views"]["contador"]["Row"];

const PAGE_LIMIT = 80;

export async function listContador(options?: {
  q?: string;
  limit?: number;
}): Promise<ContadorRow[]> {
  const limit = options?.limit ?? PAGE_LIMIT;
  const q = options?.q?.trim();
  let query = supabase.from("contador").select("*");
  if (q) {
    const pattern = searchPattern(q);
    query = query.or(`num.ilike."${pattern}",product.ilike."${pattern}"`);
  } else {
    query = query.or("book_mismatch.eq.true,warehouse_mismatch.eq.true");
  }
  return okList(await query.order("num").limit(limit));
}
