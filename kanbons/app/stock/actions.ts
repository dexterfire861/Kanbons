"use server";

import { revalidatePath } from "next/cache";
import { num } from "@/lib/form";
import {
  addWarehouseCount,
  getStock,
  updateStock,
  upsertStock,
} from "@/lib/models/stock";

function revalidateStock() {
  revalidatePath("/stock");
  revalidatePath("/contador");
  revalidatePath("/changes");
}

function fields(formData: FormData) {
  const physical = num(formData, "contador_physical");
  return {
    quantity: num(formData, "quantity"),
    contador_physical: physical,
    contador_counted_at: physical == null ? null : new Date().toISOString(),
  };
}

export async function updateStockAction(formData: FormData) {
  const productId = num(formData, "product_id");
  if (productId == null) throw new Error("product is required");
  const row = await updateStock(productId, fields(formData));
  revalidateStock();
  return row;
}

export async function changeStockAction(formData: FormData) {
  const productId = num(formData, "product_id");
  if (productId == null) throw new Error("product is required");
  const current = await getStock(productId);
  const next = {
    product_id: productId,
    quantity: current?.quantity ?? null,
    contador_physical: current?.contador_physical ?? null,
    contador_counted_at: current?.contador_counted_at ?? null,
  };
  if (String(formData.get("quantity") ?? "").trim() !== "") {
    next.quantity = num(formData, "quantity");
  }
  if (String(formData.get("contador_physical") ?? "").trim() !== "") {
    next.contador_physical = num(formData, "contador_physical");
    next.contador_counted_at = new Date().toISOString();
  }
  const row = await upsertStock(next);
  revalidateStock();
  return row;
}

export async function adjustWarehouseCountAction(formData: FormData) {
  const productId = num(formData, "product_id");
  const delta = num(formData, "delta");
  if (productId == null) throw new Error("product is required");
  if (delta == null) throw new Error("amount is required");
  const row = await addWarehouseCount(productId, delta);
  revalidateStock();
  return row;
}
