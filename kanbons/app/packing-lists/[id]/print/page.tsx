import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPackingSlip } from "@/lib/models/packing_slip";
import { PrintButton } from "../../print-button";
import { SlipView } from "../../slip-view";

const copies = ["Office", "Driver", "Driver"] as const;

export default async function PrintPackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const slip = await loadPackingSlip(id);
  if (!slip) notFound();

  return (
    <main className="p-6 print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/packing-lists/${id}`} className="underline text-sm">
          Packing list {slip.numPl}
        </Link>
        <PrintButton />
        <p className="text-sm text-zinc-600">
          1 office + 2 driver. Use the browser print dialog.
        </p>
      </div>
      <div className="space-y-8 print:space-y-0">
        {copies.map((label, index) => (
          <SlipView key={`${label}-${index}`} slip={slip} copyLabel={label} />
        ))}
      </div>
    </main>
  );
}
