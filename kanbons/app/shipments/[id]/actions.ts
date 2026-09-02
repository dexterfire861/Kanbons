"use server";

import { revalidatePath } from "next/cache";
import { num } from "@/lib/form";
import { getProduct } from "@/lib/models/products";
import {
  createShipmentLine,
  updateShipmentLine,
} from "@/lib/models/shipment_lines";

async function productFields(formData: FormData) {
  const productId = num(formData, "product_id");
  const product = productId == null ? null : await getProduct(productId);
  return {
    product_id: productId,
    sku: product?.num ?? null,
    product: product?.product ?? null,
    yards_pcs: num(formData, "yards_pcs"),
    unit: num(formData, "unit"),
    type_of_unit: product?.type_of_unit ?? null,
  };
}

export async function createShipmentLineAction(formData: FormData) {
  const shipmentId = num(formData, "shipment_id");
  if (shipmentId == null) throw new Error("shipment is required");
  await createShipmentLine({
    shipment_id: shipmentId,
    ...(await productFields(formData)),
  });
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/contador");
}

export async function updateShipmentLineAction(formData: FormData) {
  const id = num(formData, "id");
  const shipmentId = num(formData, "shipment_id");
  if (id == null || shipmentId == null) throw new Error("id is required");
  await updateShipmentLine(id, await productFields(formData));
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/contador");
}
