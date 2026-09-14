"use server";

import { num, requiredNum, text } from "@/lib/form";
import { getCustomer } from "@/lib/models/customers";
import {
  createPackingList,
  nextPackingListNumber,
  updatePackingList,
} from "@/lib/models/packing_lists";

async function fields(formData: FormData) {
  const customerId = num(formData, "customer_id");
  const customer = customerId == null ? null : await getCustomer(customerId);
  return {
    customer_id: customerId,
    customer: customer?.name ?? text(formData, "customer"),
    date: text(formData, "date"),
    ship_date: text(formData, "ship_date"),
    customer_po: text(formData, "customer_po"),
    state: text(formData, "state"),
  };
}

export async function createPackingListAction(formData: FormData) {
  return createPackingList({
    ...(await fields(formData)),
    num_pl: await nextPackingListNumber(),
    status: "draft",
  });
}

export async function updatePackingListAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  return updatePackingList(id, {
    ...(await fields(formData)),
    num_pl: requiredNum(formData, "num_pl"),
  });
}
