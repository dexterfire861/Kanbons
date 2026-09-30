import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { DatabaseError, ok, okList, okMaybe } from "./result";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Omit<
  Database["public"]["Tables"]["customers"]["Insert"],
  "id"
>;
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];
export type CustomerOption = Pick<Customer, "id" | "name">;

export async function listCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  return okList(
    await supabase.from("customers").select("*").order("name")
  );
}

export async function listCustomerOptions(): Promise<CustomerOption[]> {
  const supabase = await createClient();
  return okList(await supabase.from("customers").select("id, name").order("name"));
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const supabase = await createClient();
  return okMaybe(
    await supabase.from("customers").select("*").eq("id", id).maybeSingle()
  );
}

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  const supabase = await createClient();
  return ok(
    await supabase.from("customers").insert(input).select("*").single()
  );
}

export async function updateCustomer(
  id: number,
  input: CustomerUpdate
): Promise<Customer> {
  const supabase = await createClient();
  return ok(
    await supabase.from("customers").update(input).eq("id", id).select("*").single()
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const supabase = await createClient();
  const result = await supabase.from("customers").delete().eq("id", id);
  if (result.error) {
    const message = result.error.message;
    if (message.includes("packing_lists") || message.includes("purchase_orders")) {
      throw new DatabaseError(
        "This customer still has packing lists. Finish those first."
      );
    }
    throw new DatabaseError(message);
  }
}
