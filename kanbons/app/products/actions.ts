"use server";

import { num, requiredText, text } from "@/lib/form";
import { createProduct, updateProduct } from "@/lib/models/products";

function fields(formData: FormData) {
  return {
    num: requiredText(formData, "num"),
    product: requiredText(formData, "product"),
    unit_pack: num(formData, "unit_pack"),
    type_of_unit: text(formData, "type_of_unit"),
    type_of_unit_customer: text(formData, "type_of_unit_customer"),
    unit_of_measurement: text(formData, "unit_of_measurement"),
    pre_uni: num(formData, "pre_uni"),
  };
}

export async function createProductAction(formData: FormData) {
  return createProduct(fields(formData));
}

export async function updateProductAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  return updateProduct(id, fields(formData));
}
