import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { okList } from "./result";

export type ContadorRow = Database["public"]["Views"]["contador"]["Row"];

export async function listContador(): Promise<ContadorRow[]> {
  return okList(await supabase.from("contador").select("*").order("num"));
}
