"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jsonArray, jsonObject, num, requiredNum, requiredText, text } from "@/lib/form";
import {
  confirmPackingSlip,
  dispatchPackingSlip,
  packingSlipFromPurchaseOrder,
  persistDraft,
  type Address,
  type PurchaseOrderLine,
} from "@/lib/models/packing_slip";
import {
  parsePurchaseOrderPdf,
  saveConfirmedPurchaseOrder,
  type ParsedPoDraft,
} from "@/lib/models/purchase_orders";
import {
  createPoIngestRun,
  diffPoFields,
  diffsJson,
  snapshotJson,
  updatePoIngestRun,
  type PoCorrectionSnapshot,
} from "@/lib/models/po_ingest_runs";

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
  altCode?: string | null;
  yardsPieces?: number | null;
  unit?: number | null;
  productId?: number | null;
};

export async function createAndConfirmFromPoAction(formData: FormData) {
  const posted = jsonArray<PostedLine>(text(formData, "lines"));
  const lines: PurchaseOrderLine[] = posted
    .filter((line) => line.asWritten || line.unit)
    .map((line) => ({
      asWritten: line.asWritten ?? "",
      itemCode: line.itemCode ?? null,
      altCode: line.altCode ?? null,
      yardsPieces: line.yardsPieces ?? null,
      unit: line.unit ?? null,
      productId: line.productId ?? null,
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
  await confirmPackingSlip(row.id);
  const issues = text(formData, "ocr_issues");
  await saveConfirmedPurchaseOrder({
    packingListId: row.id,
    customerId: slip.customerId,
    customerPo: slip.customerPo,
    date: slip.date,
    shipDate: slip.shipDate,
    shipTo: slip.shipTo,
    lines: slip.lines.map((line, index) => ({
      asWritten: line.asWritten,
      itemCode: lines[index]?.itemCode ?? "",
      altCode: lines[index]?.altCode ?? null,
      yardsPieces: line.yardsPieces,
      productId: line.productId,
    })),
    ocrMarkdown: text(formData, "ocr_markdown"),
    sourceName: text(formData, "ocr_source"),
    issues: issues ? issues.split("\n").filter(Boolean) : [],
  });
  const ingestRunId = num(formData, "ingest_run_id");
  const extracted =
    jsonObject<PoCorrectionSnapshot>(text(formData, "ocr_snapshot")) ?? null;
  const gold: PoCorrectionSnapshot = {
    customerId: String(slip.customerId),
    customerPo: slip.customerPo,
    date: slip.date ?? "",
    shipDate: slip.shipDate ?? "",
    shipTo: slip.shipTo,
    billTo: slip.billTo,
    lines: lines.map((line) => ({
      asWritten: line.asWritten,
      itemCode: line.itemCode ?? "",
      altCode: line.altCode ?? "",
      yardsPieces: line.yardsPieces == null ? "" : String(line.yardsPieces),
      unit: line.unit == null ? "" : String(line.unit),
      productId: line.productId,
    })),
  };
  const resolved = diffPoFields(extracted, gold);
  try {
    if (ingestRunId != null) {
      await updatePoIngestRun(ingestRunId, {
        packing_list_id: row.id,
        status: "saved",
        failure_reason: null,
        extracted_json: extracted ? snapshotJson(extracted) : undefined,
        gold_json: snapshotJson(gold),
        resolved_json: diffsJson(resolved),
      });
    } else {
      await createPoIngestRun({
        source_filename: text(formData, "ocr_source") || "typed",
        source_path: text(formData, "ocr_source") || "typed",
        packing_list_id: row.id,
        status: "saved",
        extracted_json: extracted ? snapshotJson(extracted) : null,
        gold_json: snapshotJson(gold),
        resolved_json: diffsJson(resolved),
      });
    }
  } catch (error) {
    console.error("po_ingest_runs saved", error);
  }
  revalidatePath("/packing-lists");
  revalidatePath("/packing-lists/new");
  revalidatePath(`/packing-lists/${row.id}`);
  redirect(`/packing-lists/${row.id}`);
}

export async function readPoPdfAction(formData: FormData): Promise<ParsedPoDraft> {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a purchase order PDF");
  }
  const name = file.name.toLowerCase();
  if (file.type && file.type !== "application/pdf" && !name.endsWith(".pdf")) {
    throw new Error("That file is not a PDF");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return parsePurchaseOrderPdf(bytes, file.name);
}

export async function confirmSlipAction(formData: FormData) {
  const id = requiredNum(formData, "id");
  await confirmPackingSlip(id);
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
