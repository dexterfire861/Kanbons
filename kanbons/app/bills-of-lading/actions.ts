"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jsonArray, requiredNum, text } from "@/lib/form";
import {
  createBillOfLadingFromPicks,
  getBillOfLadingView,
  type BolPickLine,
} from "@/lib/models/bills_of_lading";
import {
  createOcrDocument,
  uploadOcrPdf,
} from "@/lib/models/ocr_documents";
import type { Json } from "@/lib/database.types";

type PostedPick = {
  packingListId?: number;
  packingListLineId?: number;
  onContainer?: number;
};

export async function createBillOfLadingAction(formData: FormData) {
  const posted = jsonArray<PostedPick>(text(formData, "picks"));
  const picks: BolPickLine[] = posted.map((row) => ({
    packingListId: Number(row.packingListId),
    packingListLineId: Number(row.packingListLineId),
    onContainer: Number(row.onContainer),
  }));
  if (picks.some((pick) => !Number.isFinite(pick.packingListId))) {
    throw new Error("Pick at least one packing list");
  }
  const row = await createBillOfLadingFromPicks({
    date: text(formData, "date"),
    picks,
  });
  const view = await getBillOfLadingView(row.id);
  if (view) {
    const snapshot = view.form as unknown as Json;
    await createOcrDocument({
      kind: "bill_of_lading",
      filename: `bill-of-lading-${view.form.number}`,
      storage_path: null,
      extracted_json: snapshot,
      confirmed_json: snapshot,
      diff_json: {},
      status: "saved",
      bol_id: row.id,
    });
  }
  revalidatePath("/bills-of-lading");
  revalidatePath("/bills-of-lading/new");
  revalidatePath("/packing-lists");
  revalidatePath("/");
  redirect(`/bills-of-lading/${row.id}`);
}

export async function saveBolPdfAction(formData: FormData) {
  const id = requiredNum(formData, "id");
  const file = formData.get("pdf");
  if (file == null || typeof file === "string" || file.size === 0) {
    throw new Error("Choose a bill of lading PDF");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const name =
    "name" in file && typeof file.name === "string" ? file.name : "bill-of-lading.pdf";
  const storagePath = await uploadOcrPdf("bill_of_lading", name, bytes);
  await createOcrDocument({
    kind: "bill_of_lading",
    filename: name,
    storage_path: storagePath,
    extracted_json: null,
    status: "unmatched",
    bol_id: id,
  });
  revalidatePath(`/bills-of-lading/${id}`);
}
