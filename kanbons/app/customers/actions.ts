"use server";

import { revalidatePath } from "next/cache";
import { num, requiredText, text } from "@/lib/form";
import { createCustomer, updateCustomer } from "@/lib/models/customers";

function fields(formData: FormData) {
  return {
    name: requiredText(formData, "name"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    zip_code: text(formData, "zip_code"),
    point_of_contact: text(formData, "point_of_contact"),
    id_cust: text(formData, "id_cust"),
    email_contact: text(formData, "email_contact"),
  };
}

export async function createCustomerAction(formData: FormData) {
  await createCustomer(fields(formData));
  revalidatePath("/customers");
}

export async function updateCustomerAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  await updateCustomer(id, fields(formData));
  revalidatePath("/customers");
}
