"use server";

import { revalidatePath } from "next/cache";
import { num, requiredNum, text } from "@/lib/form";
import { getProduct } from "@/lib/models/products";
import { createShipmentWithLines, updateShipment } from "@/lib/models/shipments";

function fields(formData: FormData) {
  return {
    number: requiredNum(formData, "number"),
    country: text(formData, "country"),
    invoice_number: text(formData, "invoice_number"),
    arrival_date: text(formData, "arrival_date"),
    departure_date: text(formData, "departure_date"),
  };
}

type PostedLine = {
  product_id?: number | null;
  yards_pcs?: number | null;
  unit?: number | null;
  type_of_unit?: string | null;
};

export async function createShipmentAction(formData: FormData) {
  let posted: PostedLine[] = [];
  const raw = text(formData, "lines");
  if (raw) {
    posted = JSON.parse(raw) as PostedLine[];
  }
  const lines = [];
  for (const line of posted) {
    const productId = line.product_id ?? null;
    if (productId == null && line.yards_pcs == null && line.unit == null) continue;
    const product = productId == null ? null : await getProduct(productId);
    lines.push({
      product_id: productId,
      sku: product?.num ?? null,
      product: product?.product ?? null,
      yards_pcs: line.yards_pcs ?? null,
      unit: line.unit ?? null,
      type_of_unit: line.type_of_unit ?? null,
    });
  }
  await createShipmentWithLines(fields(formData), lines);
  revalidatePath("/shipments");
  revalidatePath("/contador");
}

export async function updateShipmentAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  await updateShipment(id, fields(formData));
  revalidatePath("/shipments");
  revalidatePath(`/shipments/${id}`);
}
