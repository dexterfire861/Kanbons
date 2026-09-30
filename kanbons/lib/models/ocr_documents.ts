import { createClient } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { ok, okMaybe } from "./result";

export type OcrKind = "customer_po" | "supplier" | "bill_of_lading";
export type OcrStatus = "failed" | "unmatched" | "saved";

export type OcrDocument = {
  id: number;
  kind: string;
  filename: string;
  storage_path: string | null;
  extracted_json: Json | null;
  confirmed_json: Json | null;
  diff_json: Json | null;
  status: string;
  packing_list_id: number | null;
  shipment_id: number | null;
  bol_id: number | null;
  created_at: string;
};

export async function uploadOcrPdf(
  kind: OcrKind,
  filename: string,
  bytes: Buffer
): Promise<string | null> {
  const supabase = await createClient();
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, "_") || "document.pdf";
  const path = `${kind}/${Date.now()}-${safe}`;
  const result = await supabase.storage
    .from("ocr-documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (result.error) {
    console.error("ocr-documents upload", result.error.message);
    return null;
  }
  return path;
}

export async function createOcrDocument(input: {
  kind: OcrKind;
  filename: string;
  storage_path: string | null;
  extracted_json: Json | null;
  status: OcrStatus;
  packing_list_id?: number | null;
  shipment_id?: number | null;
  bol_id?: number | null;
  confirmed_json?: Json | null;
  diff_json?: Json | null;
}): Promise<OcrDocument | null> {
  const supabase = await createClient();
  try {
    return ok(
      await supabase.from("ocr_documents").insert(input).select("*").single()
    );
  } catch (error) {
    console.error("ocr_documents", error);
    return null;
  }
}

export async function updateOcrDocument(
  id: number,
  input: {
    status?: OcrStatus;
    extracted_json?: Json | null;
    confirmed_json?: Json | null;
    diff_json?: Json | null;
    packing_list_id?: number | null;
    shipment_id?: number | null;
    bol_id?: number | null;
    storage_path?: string | null;
  }
): Promise<OcrDocument | null> {
  const supabase = await createClient();
  try {
    return ok(
      await supabase
        .from("ocr_documents")
        .update(input)
        .eq("id", id)
        .select("*")
        .single()
    );
  } catch (error) {
    console.error("ocr_documents", error);
    return null;
  }
}

export async function getOcrDocument(id: number): Promise<OcrDocument | null> {
  const supabase = await createClient();
  return okMaybe(
    await supabase.from("ocr_documents").select("*").eq("id", id).maybeSingle()
  );
}
