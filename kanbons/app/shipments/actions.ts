"use server";

import { revalidatePath } from "next/cache";
import { jsonArray, num, requiredNum, text } from "@/lib/form";
import { getProduct, listProducts } from "@/lib/models/products";
import { listProductMappings } from "@/lib/models/product_mappings";
import {
  createShipmentWithLines,
  nextShipmentNumber,
  updateShipment,
} from "@/lib/models/shipments";
import { parseSupplierPdf } from "@/lib/models/purchase_orders";
import { packsFor, resolveProductId } from "@/lib/models/packing_slip_match";
import { updateOcrDocument } from "@/lib/models/ocr_documents";
import { diffSnapshots } from "@/lib/models/po_ingest_runs";
import type { Json } from "@/lib/database.types";

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
  const posted = jsonArray<PostedLine>(text(formData, "lines"));
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
  const row = await createShipmentWithLines(fields(formData), lines);
  revalidatePath("/shipments");
  revalidatePath("/contador");
  revalidatePath("/changes");
  return row;
}

export async function updateShipmentAction(formData: FormData) {
  const id = num(formData, "id");
  if (id == null) throw new Error("id is required");
  const row = await updateShipment(id, fields(formData));
  revalidatePath("/shipments");
  revalidatePath("/changes");
  return row;
}

export async function readSupplierPdfAction(formData: FormData) {
  const file = formData.get("pdf");
  if (file == null || typeof file === "string" || file.size === 0) {
    throw new Error("Choose a supplier PDF");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const name =
    "name" in file && typeof file.name === "string" ? file.name : "supplier.pdf";
  const draft = await parseSupplierPdf(bytes, name);
  const [products, mappings] = await Promise.all([
    listProducts(),
    listProductMappings(),
  ]);
  const matchProducts = products.map((product) => ({
    id: product.id,
    num: product.num,
    product: product.product,
    pre_uni: product.pre_uni,
    unit_pack: product.unit_pack,
  }));
  const matchMappings = mappings.map((mapping) => ({
    client_name: mapping.client_name,
    kanbons_name: mapping.kanbons_name,
    item_code: mapping.item_code,
    product_id: mapping.product_id,
    company: mapping.company,
  }));
  const byId = new Map(products.map((product) => [product.id, product]));
  const savedLines = draft.lines.map((line) => {
    const productId = resolveProductId(
      {
        asWritten: line.description,
        itemCode: line.itemCode || null,
        yardsPieces: line.quantity,
        unit: null,
        productId: null,
      },
      matchProducts,
      matchMappings
    );
    const product = productId == null ? null : (byId.get(productId) ?? null);
    return {
      product_id: productId,
      sku: product?.num ?? (line.itemCode || null),
      product: product?.product ?? line.description,
      yards_pcs: line.quantity,
      unit: packsFor(line.quantity, product?.unit_pack),
      type_of_unit: null,
    };
  });
  const extracted = {
    invoiceNumber: draft.invoiceNumber,
    country: draft.country,
    departureDate: draft.departureDate,
    arrivalDate: draft.arrivalDate,
    lines: draft.lines,
  };
  const confirmed = {
    ...extracted,
    lines: savedLines.map((line) => ({
      product: line.product,
      sku: line.sku,
      yardsPieces: line.yards_pcs,
      productId: line.product_id,
    })),
  };
  let shipmentId: number | null = null;
  if (savedLines.length > 0) {
    const shipment = await createShipmentWithLines(
      {
        number: await nextShipmentNumber(),
        country: draft.country,
        invoice_number: draft.invoiceNumber,
        departure_date: draft.departureDate,
        arrival_date: draft.arrivalDate,
      },
      savedLines
    );
    shipmentId = shipment.id;
  }
  if (draft.ocrDocumentId != null) {
    await updateOcrDocument(draft.ocrDocumentId, {
      status: shipmentId == null ? "unmatched" : "saved",
      shipment_id: shipmentId,
      confirmed_json: confirmed as unknown as Json,
      diff_json: diffSnapshots(
        extracted as unknown as Json,
        confirmed as unknown as Json
      ),
    });
  }
  revalidatePath("/shipments");
  revalidatePath("/contador");
}
