import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillOfLadingView } from "@/lib/models/bills_of_lading";
import { PageIntro } from "@/app/ui/page-intro";
import { PrintButton } from "@/app/packing-lists/print-button";
import { BolView } from "../bol-view";
import { saveBolPdfAction } from "../actions";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default async function BillOfLadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const view = await getBillOfLadingView(id);
  if (!view) notFound();

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/bills-of-lading" className="underline">
          Bills of lading
        </Link>
      </p>
      <PageIntro
        title={`Bill of lading ${view.header.num_bol}`}
        what={`${dash(view.header.date)} · ${view.header.status}. The form below is this container. Weight, pallet, trailer, and class stay blank.`}
        columns={[
          { name: "Ship to", meaning: "Where this container is going." },
          { name: "Customer order number", meaning: "The packing list on this container." },
          { name: "# PKGS", meaning: "Packs on this container." },
          { name: "Commodity description", meaning: "The product. Package qty is yards / pieces." },
        ]}
      />

      <div className="no-print mb-4 flex flex-wrap items-end gap-4">
        <PrintButton label="Print" />
        <form action={saveBolPdfAction} className="dialog-fields">
          <input type="hidden" name="id" value={view.header.id} />
          <label>
            <span>Bill of lading PDF</span>
            <input type="file" name="pdf" accept="application/pdf" required />
          </label>
          <button type="submit" className="border border-zinc-400 px-3 py-1 text-sm">
            Keep this PDF
          </button>
        </form>
      </div>

      <BolView form={view.form} />
    </main>
  );
}
