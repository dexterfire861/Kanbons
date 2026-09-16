"use server";

import { revalidatePath } from "next/cache";
import { num, requiredText, text } from "@/lib/form";
import {
  createProductMapping,
  updateProductMapping,
} from "@/lib/models/product_mappings";

function fields(formData: FormData) {
  return {
    client_name: requiredText(formData, "client_name"),
    kanbons_name: text(formData, "kanbons_name"),
    item_code: text(formData, "item_code"),
    product_id: num(formData, "product_id"),
  };
}

export async function createProductMappingAction(formData: FormData) {
  const company = text(formData, "company");
  const row = await createProductMapping({
    ...fields(formData),
    company: company === "Woodhaven" ? "Woodhaven" : null,
  });
  revalidatePath("/product-mappings");
  revalidatePath("/changes");
  return row;
}

export async function updateProductMappingAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  const row = await updateProductMapping(id, fields(formData));
  revalidatePath("/product-mappings");
  revalidatePath("/changes");
  return row;
}
