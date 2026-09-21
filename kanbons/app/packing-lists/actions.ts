"use server";

import { num, requiredNum, text } from "@/lib/form";
import { getCustomer, type Customer } from "@/lib/models/customers";
import {
  createPackingList,
  getPackingList,
  nextPackingListNumber,
  updatePackingList,
  type PackingList,
} from "@/lib/models/packing_lists";

function contactName(customer: Customer): string | null {
  const point = customer.point_of_contact?.trim() ?? "";
  if (
    point &&
    !/^(no|n\/a|na|none|yes|xx|pending)$/i.test(point) &&
    !/^\d+$/.test(point)
  ) {
    return point;
  }
  return customer.name;
}

function shipFromCustomer(customer: Customer | null) {
  if (!customer) {
    return {
      state: null,
      ship_to_name: null,
      ship_to_address: null,
      ship_to_city: null,
      ship_to_state: null,
      ship_to_zip: null,
    };
  }
  const contact = contactName(customer);
  return {
    state: customer.state,
    ship_to_name: contact,
    ship_to_address: customer.address,
    ship_to_city: customer.city,
    ship_to_state: customer.state,
    ship_to_zip: customer.zip_code,
  };
}

function billFromCustomer(customer: Customer | null) {
  if (!customer) {
    return {
      bill_to_name: null,
      bill_to_address: null,
      bill_to_city: null,
      bill_to_state: null,
      bill_to_zip: null,
    };
  }
  const contact = contactName(customer);
  return {
    bill_to_name: contact,
    bill_to_address: customer.address,
    bill_to_city: customer.city,
    bill_to_state: customer.state,
    bill_to_zip: customer.zip_code,
  };
}

function addressFromCustomer(customer: Customer | null) {
  return {
    ...shipFromCustomer(customer),
    ...billFromCustomer(customer),
  };
}

function partyKey(
  name: string | null,
  address: string | null,
  city: string | null,
  state: string | null,
  zip: string | null
) {
  return [name, address, city, state, zip]
    .map((value) => (value ?? "").trim())
    .join("\n");
}

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
    customerRow: customer,
  };
}

export async function createPackingListAction(formData: FormData) {
  const { customerRow, ...row } = await fields(formData);
  return createPackingList({
    ...row,
    ...addressFromCustomer(customerRow),
    num_pl: await nextPackingListNumber(),
    status: "draft",
  });
}

function billFollowsShip(list: PackingList) {
  return (
    partyKey(
      list.ship_to_name,
      list.ship_to_address,
      list.ship_to_city,
      list.ship_to_state,
      list.ship_to_zip
    ) ===
    partyKey(
      list.bill_to_name,
      list.bill_to_address,
      list.bill_to_city,
      list.bill_to_state,
      list.bill_to_zip
    )
  );
}

export async function updatePackingListAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  const { customerRow, ...row } = await fields(formData);
  const existing = await getPackingList(id);
  const customerChanged = (existing?.customer_id ?? null) !== row.customer_id;
  const replaceBill = existing == null || billFollowsShip(existing);
  return updatePackingList(id, {
    ...row,
    ...(customerChanged ? shipFromCustomer(customerRow) : {}),
    ...(customerChanged && replaceBill ? billFromCustomer(customerRow) : {}),
    num_pl: requiredNum(formData, "num_pl"),
  });
}
