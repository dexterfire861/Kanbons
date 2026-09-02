import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ok, okList, okMaybe } from "./result";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Omit<
  Database["public"]["Tables"]["customers"]["Insert"],
  "id"
>;
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export async function listCustomers(): Promise<Customer[]> {
  return okList(
    await supabase.from("customers").select("*").order("name")
  );
}

export async function getCustomer(id: number): Promise<Customer | null> {
  return okMaybe(
    await supabase.from("customers").select("*").eq("id", id).maybeSingle()
  );
}

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  return ok(
    await supabase.from("customers").insert(input).select("*").single()
  );
}

export async function updateCustomer(
  id: number,
  input: CustomerUpdate
): Promise<Customer> {
  return ok(
    await supabase.from("customers").update(input).eq("id", id).select("*").single()
  );
}
