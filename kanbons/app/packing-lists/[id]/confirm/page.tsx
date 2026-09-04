import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPackingSlip } from "@/lib/models/packing_slip";
import { PageIntro } from "@/app/ui/page-intro";
import { SlipView } from "../../slip-view";
import { confirmSlipAction } from "../../workflow-actions";

export default async function ConfirmPackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const slip = await loadPackingSlip(id);
  if (!slip) notFound();

  const unmatched = slip.lines.filter((line) => !line.matched);

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href={`/packing-lists/${id}`} className="underline">
          Packing list {slip.numPl}
        </Link>
      </p>
      <PageIntro
        title="Confirm packing slip"
        what="As written is what we ship. Names must already match on Name matches."
        columns={[
          { name: "As written", meaning: "Name from the customer PO. We match from this." },
          { name: "Confirm", meaning: "Makes the packing list official." },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-zinc-300 bg-white p-6 text-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            As typed on the PO
          </p>
          <p className="mt-1 font-semibold">PO {slip.customerPo || "—"}</p>
          <p>{slip.customerName}</p>
          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b py-1 text-left">As written</th>
                <th className="border-b py-1 text-left">Yards / pieces</th>
                <th className="border-b py-1 text-left">Units</th>
              </tr>
            </thead>
            <tbody>
              {slip.lines.map((line, index) => (
                <tr key={line.lineId ?? index}>
                  <td className="border-b py-1">{line.asWritten || "—"}</td>
                  <td className="border-b py-1">{line.yardsPieces ?? ""}</td>
                  <td className="border-b py-1">{line.unit ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <SlipView slip={slip} />
      </div>

      {slip.status !== "draft" ? (
        <p className="mt-6 text-sm">
          This slip is {slip.status}.{" "}
          <Link href={`/packing-lists/${id}`} className="underline">
            Open the packing list
          </Link>
        </p>
      ) : unmatched.length > 0 ? (
        <p className="mt-6 text-sm">
          No name match for: {unmatched.map((line) => line.asWritten).join(", ")}.
          Add it on{" "}
          <Link href="/product-mappings" className="underline">
            Name matches
          </Link>{" "}
          or change As written.
        </p>
      ) : (
        <form action={confirmSlipAction} className="mt-6">
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="border border-zinc-800 px-3 py-1 text-sm">
            Confirm packing slip
          </button>
        </form>
      )}
    </main>
  );
}
