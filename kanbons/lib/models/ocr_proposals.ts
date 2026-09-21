import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { ok } from "./result";

export type OcrProposalKind = "customer_po" | "supplier" | "bill_of_lading";

export async function createOcrProposal(input: {
  kind: OcrProposalKind;
  summary: string;
  document_ids: number[];
}): Promise<{ id: number } | null> {
  try {
    return ok(
      await supabase
        .from("ocr_proposals")
        .insert({
          kind: input.kind,
          summary: input.summary,
          document_ids: input.document_ids as unknown as Json,
          status: "proposed",
        })
        .select("id")
        .single()
    );
  } catch (error) {
    console.error("ocr_proposals", error);
    return null;
  }
}
