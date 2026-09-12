"use server";

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
  return createProductMapping(fields(formData));
}

export async function updateProductMappingAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  return updateProductMapping(id, fields(formData));
}
