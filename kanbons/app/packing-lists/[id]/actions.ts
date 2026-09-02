"use server";

import { revalidatePath } from "next/cache";
import { num } from "@/lib/form";
import {
  createPackingListLine,
  updatePackingListLine,
} from "@/lib/models/packing_list_lines";
import { getProduct } from "@/lib/models/products";

async function productFields(formData: FormData) {
  const productId = num(formData, "product_id");
  const product = productId == null ? null : await getProduct(productId);
  return {
    product_id: productId,
    product: product?.product ?? null,
    yards_pieces: num(formData, "yards_pieces"),
    unit: num(formData, "unit"),
    type_of_unit: product?.type_of_unit ?? null,
    pre_uni: num(formData, "pre_uni") ?? product?.pre_uni ?? null,
  };
}

export async function createPackingListLineAction(formData: FormData) {
  const packingListId = num(formData, "packing_list_id");
  if (packingListId == null) throw new Error("packing list is required");
  await createPackingListLine({
    packing_list_id: packingListId,
    ...(await productFields(formData)),
  });
  revalidatePath(`/packing-lists/${packingListId}`);
  revalidatePath("/contador");
}

export async function updatePackingListLineAction(formData: FormData) {
  const id = num(formData, "id");
  const packingListId = num(formData, "packing_list_id");
  if (id == null || packingListId == null) throw new Error("id is required");
  await updatePackingListLine(id, await productFields(formData));
  revalidatePath(`/packing-lists/${packingListId}`);
  revalidatePath("/contador");
}
