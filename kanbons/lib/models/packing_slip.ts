import { getCustomer, listCustomers, type Customer } from "./customers";
import { listProductMappings } from "./product_mappings";
import {
  createPackingList,
  getPackingList,
  nextPackingListNumber,
  updatePackingList,
  type PackingList,
} from "./packing_lists";
import {
  createPackingListLine,
  listPackingListLines,
} from "./packing_list_lines";
import { listProducts } from "./products";
import { decrementStockByUnits } from "./stock";
import { DatabaseError } from "./result";
import {
  packingSlipFromParts,
  type PackingSlip,
  type PurchaseOrderInput,
} from "./packing_slip_match";

export type {
  Address,
  PackingSlip,
  PackingSlipLine,
  PurchaseOrderInput,
  PurchaseOrderLine,
} from "./packing_slip_match";
export { packingSlipFromParts, resolveProductId } from "./packing_slip_match";

export async function packingSlipFromPurchaseOrder(
  po: PurchaseOrderInput
): Promise<PackingSlip> {
  const customer = await getCustomer(po.customerId);
  if (!customer) throw new DatabaseError("Customer not found");
  const [products, mappings, numPl] = await Promise.all([
    listProducts(),
    listProductMappings(),
    nextPackingListNumber(),
  ]);
  return packingSlipFromParts({
    numPl,
    status: "draft",
    customerId: customer.id,
    customerName: customer.name,
    customerCode: customer.id_cust,
    customerPo: po.customerPo,
    date: po.date,
    shipDate: po.shipDate,
    shipTo: po.shipTo,
    billTo: po.billTo,
    lines: po.lines,
    products,
    mappings,
    company: customer.company,
  });
}

export async function persistDraft(slip: PackingSlip): Promise<PackingList> {
  const header = await createPackingList({
    num_pl: slip.numPl,
    split: slip.split ?? 1,
    parent_id: slip.parentId ?? null,
    customer_id: slip.customerId,
    customer: slip.customerName,
    customer_po: slip.customerPo,
    date: slip.date,
    ship_date: slip.shipDate,
    state: slip.shipTo.state,
    status: "draft",
    ship_to_name: slip.shipTo.name,
    ship_to_address: slip.shipTo.address,
    ship_to_city: slip.shipTo.city,
    ship_to_state: slip.shipTo.state,
    ship_to_zip: slip.shipTo.zip,
    bill_to_name: slip.billTo.name,
    bill_to_address: slip.billTo.address,
    bill_to_city: slip.billTo.city,
    bill_to_state: slip.billTo.state,
    bill_to_zip: slip.billTo.zip,
  });
  for (const line of slip.lines) {
    await createPackingListLine({
      packing_list_id: header.id,
      product_id: line.productId,
      product: line.asWritten,
      yards_pieces: line.yardsPieces,
      unit: line.unit,
      type_of_unit: null,
      pre_uni: line.preUni,
    });
  }
  return header;
}

function samePart(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

function companyForAddress(
  customers: Customer[],
  address: Address,
  fallback: string | null
) {
  if (!address.address?.trim()) return fallback;
  const hits = customers.filter(
    (customer) =>
      samePart(customer.address, address.address) &&
      samePart(customer.city, address.city) &&
      samePart(customer.zip_code, address.zip)
  );
  if (hits.length === 1) return hits[0].name;
  return fallback;
}

export async function loadPackingSlip(id: number): Promise<PackingSlip | null> {
  const header = await getPackingList(id);
  if (!header) return null;
  const lines = await listPackingListLines(id);
  const [products, customers] = await Promise.all([
    listProducts(),
    listCustomers(),
  ]);
  const customer =
    header.customer_id == null ? null : await getCustomer(header.customer_id);
  const byId = new Map(products.map((product) => [product.id, product]));
  const status =
    header.status === "confirmed" || header.status === "dispatched"
      ? header.status
      : "draft";
  return {
    id: header.id,
    numPl: header.num_pl,
    split: header.split ?? 1,
    parentId: header.parent_id,
    status,
    customerId: header.customer_id ?? 0,
    customerName: header.customer ?? "",
    customerCode: customer?.id_cust ?? null,
    customerPo: header.customer_po ?? "",
    date: header.date,
    shipDate: header.ship_date,
    shipTo: {
      name: header.ship_to_name,
      address: header.ship_to_address,
      city: header.ship_to_city,
      state: header.ship_to_state ?? header.state,
      zip: header.ship_to_zip,
      company: companyForAddress(
        customers,
        {
          name: header.ship_to_name,
          address: header.ship_to_address,
          city: header.ship_to_city,
          state: header.ship_to_state ?? header.state,
          zip: header.ship_to_zip,
        },
        header.customer
      ),
    },
    billTo: {
      name: header.bill_to_name,
      address: header.bill_to_address,
      city: header.bill_to_city,
      state: header.bill_to_state,
      zip: header.bill_to_zip,
      company: companyForAddress(
        customers,
        {
          name: header.bill_to_name,
          address: header.bill_to_address,
          city: header.bill_to_city,
          state: header.bill_to_state,
          zip: header.bill_to_zip,
        },
        header.customer
      ),
    },
    lines: lines.map((line) => {
      const product = line.product_id ? byId.get(line.product_id) : null;
      return {
        lineId: line.id ?? undefined,
        asWritten: line.product ?? "",
        productId: line.product_id,
        sku: product?.num ?? null,
        productName: product?.product ?? null,
        yardsPieces: line.yards_pieces,
        unit: line.unit,
        preUni: line.pre_uni,
        matched: line.product_id != null,
      };
    }),
  };
}

export async function confirmPackingSlip(id: number): Promise<void> {
  const existing = await getPackingList(id);
  if (!existing) throw new DatabaseError("Packing slip not found");
  if (existing.status === "dispatched") {
    throw new DatabaseError("Already dispatched");
  }
  const slip = await loadPackingSlip(id);
  if (!slip) throw new DatabaseError("Packing slip not found");
  if (slip.lines.some((line) => line.productId == null)) {
    throw new DatabaseError("Every line needs an internal product before confirm");
  }
  await updatePackingList(id, { status: "confirmed" });
}

export async function dispatchPackingSlip(id: number): Promise<void> {
  const slip = await loadPackingSlip(id);
  if (!slip) throw new DatabaseError("Packing slip not found");
  if (slip.status === "dispatched") {
    throw new DatabaseError("Already dispatched");
  }
  if (slip.status !== "confirmed") {
    throw new DatabaseError("Confirm the slip before dispatch");
  }
  for (const line of slip.lines) {
    if (line.productId == null || line.unit == null) continue;
    await decrementStockByUnits(line.productId, line.unit);
  }
  await updatePackingList(id, {
    status: "dispatched",
    dispatched_at: new Date().toISOString(),
  });
}
