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
  await createProductMapping(fields(formData));
  revalidatePath("/product-mappings");
}

export async function updateProductMappingAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  await updateProductMapping(id, fields(formData));
  revalidatePath("/product-mappings");
}
