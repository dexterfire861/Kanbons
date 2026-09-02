"use server";

import { revalidatePath } from "next/cache";
import { num } from "@/lib/form";
import { updateStock, upsertStock } from "@/lib/models/stock";

function fields(formData: FormData) {
  const physical = num(formData, "contador_physical");
  return {
    quantity: num(formData, "quantity"),
    contador_physical: physical,
    contador_counted_at: physical == null ? null : new Date().toISOString(),
  };
}

export async function createStockAction(formData: FormData) {
  const productId = num(formData, "product_id");
  if (productId == null) throw new Error("product is required");
  await upsertStock({ product_id: productId, ...fields(formData) });
  revalidatePath("/stock");
  revalidatePath("/contador");
}

export async function updateStockAction(formData: FormData) {
  const productId = num(formData, "product_id");
  if (productId == null) throw new Error("product is required");
  await updateStock(productId, fields(formData));
  revalidatePath("/stock");
  revalidatePath("/contador");
}
