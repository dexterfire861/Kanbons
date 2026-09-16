import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList } from "./result";

export const CHANGE_WHO = "admin";

export type ChangeLog = Database["public"]["Tables"]["change_log"]["Row"];
export type ChangeLogInsert = Omit<
  Database["public"]["Tables"]["change_log"]["Insert"],
  "id"
>;

const PAGE_LABELS: Record<string, string> = {
  stock: "Stock",
  product_mappings: "Name matches",
  shipments: "Incoming containers",
};

const FIELD_LABELS: Record<string, string> = {
  quantity: "Book qty",
  contador_physical: "Warehouse count",
  client_name: "Customer name",
  kanbons_name: "Kanbons name",
  item_code: "Item code",
  product_id: "Product",
  number: "Number",
  country: "Country",
  invoice_number: "Invoice number",
  arrival_date: "Arrival",
  departure_date: "Departure",
};

function asText(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export function changePageLabel(tableName: string): string {
  return PAGE_LABELS[tableName] ?? tableName;
}

export function changeFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export async function recordChange(input: {
  table_name: string;
  row_id: number;
  field: string;
  from_value: string | null;
  to_value: string | null;
  who?: string;
}): Promise<ChangeLog | null> {
  if (input.from_value === input.to_value) return null;
  return ok(
    await supabase
      .from("change_log")
      .insert({
        table_name: input.table_name,
        row_id: input.row_id,
        field: input.field,
        from_value: input.from_value,
        to_value: input.to_value,
        who: input.who ?? CHANGE_WHO,
      })
      .select("*")
      .single()
  );
}

export async function recordFieldChanges(input: {
  table_name: string;
  row_id: number;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  fields: string[];
  who?: string;
}): Promise<void> {
  for (const field of input.fields) {
    const from_value = asText(input.before?.[field]);
    const to_value = asText(input.after[field]);
    if (from_value === to_value) continue;
    await recordChange({
      table_name: input.table_name,
      row_id: input.row_id,
      field,
      from_value,
      to_value,
      who: input.who,
    });
  }
}

export async function listChanges(limit = 200): Promise<ChangeLog[]> {
  return okList(
    await supabase
      .from("change_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}
