"use server";

import { revalidatePath } from "next/cache";
import { num, requiredNum, text } from "@/lib/form";
import { createShipment, updateShipment } from "@/lib/models/shipments";

function fields(formData: FormData) {
  return {
    number: requiredNum(formData, "number"),
    country: text(formData, "country"),
    container_number: text(formData, "container_number"),
    arrival_date: text(formData, "arrival_date"),
    departure_date: text(formData, "departure_date"),
  };
}

export async function createShipmentAction(formData: FormData) {
  await createShipment(fields(formData));
  revalidatePath("/shipments");
}

export async function updateShipmentAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  await updateShipment(id, fields(formData));
  revalidatePath("/shipments");
  revalidatePath(`/shipments/${id}`);
}
