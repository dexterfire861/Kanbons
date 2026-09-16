import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
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
  return okList(
    await supabase.from("customers").select("*").order("name")
  );
}

export const listCustomerOptions = unstable_cache(
  async (): Promise<CustomerOption[]> =>
    okList(await supabase.from("customers").select("id, name").order("name")),
  ["customer-options"],
  { revalidate: 45 }
);

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

export async function deleteCustomer(id: number): Promise<void> {
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
