"use server";

import { listCustomerOptions } from "@/lib/models/customers";
import { listProductOptions } from "@/lib/models/products";

export async function loadProductOptions() {
  const rows = await listProductOptions();
  return rows.map((product) => ({
    id: product.id,
    label: `${product.num} — ${product.product}`,
  }));
}

export async function loadCustomerOptions() {
  const rows = await listCustomerOptions();
  return rows.map((customer) => ({
    id: customer.id,
    label: customer.name,
  }));
}
