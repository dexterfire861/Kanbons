import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackingList } from "@/lib/models/packing_lists";
import { listPackingListLines } from "@/lib/models/packing_list_lines";
import { PageIntro } from "@/app/ui/page-intro";
import { dispatchSlipAction } from "../workflow-actions";
import { PackingListLineSheet } from "./sheet";

export default async function PackingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const [header, lines] = await Promise.all([
    getPackingList(id),
    listPackingListLines(id),
  ]);
  if (!header) notFound();

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/packing-lists" className="underline">
          Packing lists
        </Link>
      </p>
      <PageIntro
        title={`Packing list ${header.num_pl}`}
        what={`${header.customer ?? "No customer"} · PO ${header.customer_po ?? "—"} · ${header.status}. Each row is a product on this list. Total is yards/pieces × price.`}
        columns={[
          { name: "Product", meaning: "SKU from our catalog." },
          { name: "Yards / pieces", meaning: "How much we packed." },
          { name: "Units", meaning: "How many packs / units." },
          { name: "Price", meaning: "Price per unit." },
          { name: "Total", meaning: "Calculated. Not typed." },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {header.status === "draft" ? (
          <Link
            href={`/packing-lists/${header.id}/confirm`}
            className="btn-primary"
          >
            Confirm
          </Link>
        ) : null}
        <Link
          href={`/packing-lists/${header.id}/print`}
          className="border border-zinc-400 px-3 py-1 text-sm"
        >
          Print
        </Link>
        {header.status === "confirmed" ? (
          <form action={dispatchSlipAction}>
            <input type="hidden" name="id" value={header.id} />
            <button type="submit" className="btn-primary">
              Dispatch
            </button>
          </form>
        ) : null}
        {header.status === "dispatched" ? (
          <p className="text-sm text-zinc-600">
            Dispatched
            {header.dispatched_at
              ? ` ${new Date(header.dispatched_at).toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
      </div>

      <PackingListLineSheet packingListId={header.id} lines={lines} />
    </main>
  );
}
