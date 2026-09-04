"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requiredNum, requiredText, text } from "@/lib/form";
import {
  confirmPackingSlip,
  dispatchPackingSlip,
  packingSlipFromPurchaseOrder,
  persistDraft,
  type Address,
  type PurchaseOrderLine,
} from "@/lib/models/packing_slip";

function address(formData: FormData, prefix: string): Address {
  return {
    name: text(formData, `${prefix}_name`),
    address: text(formData, `${prefix}_address`),
    city: text(formData, `${prefix}_city`),
    state: text(formData, `${prefix}_state`),
    zip: text(formData, `${prefix}_zip`),
  };
}

type PostedLine = {
  asWritten?: string;
  itemCode?: string | null;
  yardsPieces?: number | null;
  unit?: number | null;
  productId?: number | null;
};

export async function createAndConfirmFromPoAction(formData: FormData) {
  let posted: PostedLine[] = [];
  const raw = text(formData, "lines");
  if (raw) posted = JSON.parse(raw) as PostedLine[];
  const lines: PurchaseOrderLine[] = posted
    .filter((line) => line.asWritten || line.unit)
    .map((line) => ({
      asWritten: line.asWritten ?? "",
      itemCode: line.itemCode ?? null,
      yardsPieces: line.yardsPieces ?? null,
      unit: line.unit ?? null,
      productId: null,
    }));
  if (lines.length === 0) throw new Error("Add at least one product line");
  if (lines.some((line) => !line.asWritten)) {
    throw new Error("Every line needs the name as written on the PO");
  }

  const slip = await packingSlipFromPurchaseOrder({
    customerId: requiredNum(formData, "customer_id"),
    customerPo: requiredText(formData, "customer_po"),
    date: text(formData, "date"),
    shipDate: text(formData, "ship_date"),
    shipTo: address(formData, "ship_to"),
    billTo: address(formData, "bill_to"),
    lines,
  });
  const unmatched = slip.lines.filter((line) => line.productId == null);
  if (unmatched.length > 0) {
    throw new Error(
      `No name match for: ${unmatched.map((line) => line.asWritten).join(", ")}. Add it on Name matches or change As written.`
    );
  }
  const row = await persistDraft(slip);
  await confirmPackingSlip(row.id, []);
  revalidatePath("/packing-lists");
  revalidatePath(`/packing-lists/${row.id}`);
  redirect(`/packing-lists/${row.id}`);
}

export async function confirmSlipAction(formData: FormData) {
  const id = requiredNum(formData, "id");
  const lineIds = formData.getAll("line_id").map((value) => Number(value));
  const productIds = formData.getAll("product_id").map((value) => Number(value));
  const fixes = lineIds
    .map((lineId, index) => ({ lineId, productId: productIds[index] }))
    .filter(
      (fix) =>
        Number.isFinite(fix.lineId) &&
        fix.lineId > 0 &&
        Number.isFinite(fix.productId) &&
        fix.productId > 0
    );
  await confirmPackingSlip(id, fixes);
  revalidatePath("/packing-lists");
  revalidatePath(`/packing-lists/${id}`);
  redirect(`/packing-lists/${id}`);
}

export async function dispatchSlipAction(formData: FormData) {
  const id = requiredNum(formData, "id");
  await dispatchPackingSlip(id);
  revalidatePath("/packing-lists");
  revalidatePath(`/packing-lists/${id}`);
  revalidatePath("/stock");
  revalidatePath("/contador");
}
