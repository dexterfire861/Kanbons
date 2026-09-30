import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackingList, packingListNumber } from "@/lib/models/packing_lists";
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
        title={`Packing list ${packingListNumber(header)}`}
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

      {lines.some(
        (line) =>
          line.detected_yards != null &&
          line.yards_pieces != null &&
          line.detected_yards > line.yards_pieces
      ) ? (
        <section className="mb-6 max-w-4xl">
          <h2 className="text-lg font-semibold">Still to fulfill</h2>
          <div className="sheet mt-2">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Detected</th>
                  <th>On this slip</th>
                  <th>Still owed</th>
                </tr>
              </thead>
              <tbody>
                {lines.flatMap((line) => {
                  if (
                    line.detected_yards == null ||
                    line.yards_pieces == null ||
                    !(line.detected_yards > line.yards_pieces)
                  ) {
                    return [];
                  }
                  return [
                    <tr key={line.id}>
                      <td>{line.product || "Line"}</td>
                      <td className="num">{line.detected_yards}</td>
                      <td className="num">{line.yards_pieces}</td>
                      <td className="num">{line.detected_yards - line.yards_pieces}</td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <PackingListLineSheet packingListId={header.id} lines={lines} />
    </main>
  );
}
