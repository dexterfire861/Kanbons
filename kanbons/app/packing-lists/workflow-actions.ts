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
import { createProductMapping } from "@/lib/models/product_mappings";
import { lineFitsStock, listStockOnHand } from "@/lib/models/stock";
import {
  loadSavedPoDraft,
  parsePurchaseOrderPdf,
  saveConfirmedPurchaseOrder,
  type ParsedPoDraft,
} from "@/lib/models/purchase_orders";
import {
  createPoIngestRun,
  diffPoFields,
  diffSnapshots,
  diffsJson,
  getPoIngestRun,
  snapshotJson,
  updatePoIngestRun,
  type PoCorrectionSnapshot,
} from "@/lib/models/po_ingest_runs";
import { updateOcrDocument } from "@/lib/models/ocr_documents";

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

type PostedNameMatch = {
  client_name?: string;
  kanbons_name?: string | null;
  item_code?: string | null;
  product_id?: number | null;
  company?: string | null;
};

export async function createAndConfirmFromPoAction(formData: FormData) {
  const posted = jsonArray<PostedLine>(text(formData, "lines"));
  const nameMatches = jsonArray<PostedNameMatch>(text(formData, "name_matches"));
  for (const match of nameMatches) {
    const clientName = match.client_name?.trim() ?? "";
    if (!clientName || match.product_id == null) continue;
    await createProductMapping({
      client_name: clientName,
      kanbons_name: match.kanbons_name?.trim() || null,
      item_code: match.item_code?.trim() || null,
      product_id: match.product_id,
      company: match.company === "Woodhaven" ? "Woodhaven" : null,
    });
  }
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
  const onHand = await listStockOnHand();
  const short = slip.lines.filter(
    (line) => !lineFitsStock(onHand, line.productId, line.yardsPieces).ok
  );
  if (short.length > 0) {
    const detail = short
      .map((line) => {
        const have = lineFitsStock(onHand, line.productId, line.yardsPieces).have;
        return `${line.asWritten || "line"} (Stock has ${have})`;
      })
      .join(", ");
    throw new Error(
      `Not enough stock: ${detail}. Reduce yards / pieces or remove the line.`
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
  let extracted =
    jsonObject<PoCorrectionSnapshot>(text(formData, "ocr_snapshot")) ?? null;
  try {
    if (ingestRunId != null) {
      const run = await getPoIngestRun(ingestRunId);
      const stored = run?.extracted_json;
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        extracted = stored as PoCorrectionSnapshot;
      }
      await updatePoIngestRun(ingestRunId, {
        packing_list_id: row.id,
        status: "saved",
        failure_reason: null,
        gold_json: snapshotJson(gold),
        resolved_json: diffsJson(diffPoFields(extracted, gold)),
      });
    } else {
      await createPoIngestRun({
        source_filename: text(formData, "ocr_source") || "typed",
        source_path: text(formData, "ocr_source") || "typed",
        packing_list_id: row.id,
        status: "saved",
        extracted_json: extracted ? snapshotJson(extracted) : null,
        gold_json: snapshotJson(gold),
        resolved_json: diffsJson(diffPoFields(extracted, gold)),
      });
    }
  } catch (error) {
    console.error("po_ingest_runs saved", error);
  }
  const ocrDocumentId = num(formData, "ocr_document_id");
  if (ocrDocumentId != null) {
    await updateOcrDocument(ocrDocumentId, {
      status: "saved",
      packing_list_id: row.id,
      confirmed_json: snapshotJson(gold),
      diff_json: diffSnapshots(
        extracted ? snapshotJson(extracted) : null,
        snapshotJson(gold)
      ),
    });
  }
  revalidatePath("/packing-lists");
  revalidatePath("/packing-lists/new");
  revalidatePath(`/packing-lists/${row.id}`);
  revalidatePath("/product-mappings");
  redirect(`/packing-lists/${row.id}`);
}

export async function findSavedPoPdfAction(
  filename: string
): Promise<ParsedPoDraft | null> {
  return loadSavedPoDraft(filename);
}

export async function readPoPdfAction(formData: FormData): Promise<ParsedPoDraft> {
  const file = formData.get("pdf");
  if (file == null || typeof file === "string" || file.size === 0) {
    throw new Error("Choose a purchase order PDF");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const name =
    "name" in file && typeof file.name === "string" ? file.name : "po.pdf";
  if (file.type && file.type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("That file is not a PDF");
  }
  return parsePurchaseOrderPdf(bytes, name);
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
  revalidatePath("/changes");
}
