import Link from "next/link";
import { notFound } from "next/navigation";
import { getShipment } from "@/lib/models/shipments";
import { listShipmentLines } from "@/lib/models/shipment_lines";
import { PageIntro } from "@/app/ui/page-intro";
import { ShipmentLineSheet } from "./sheet";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const [shipment, lines] = await Promise.all([
    getShipment(id),
    listShipmentLines(id),
  ]);
  if (!shipment) notFound();

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/shipments" className="underline">
          Incoming containers
        </Link>
      </p>
      <PageIntro
        title={`Container ${shipment.number}`}
        what={`${shipment.invoice_number ?? "No invoice number"} · ${shipment.country ?? "No country"}. Each row is a product that arrived on this container.`}
        columns={[
          { name: "Product", meaning: "SKU from our catalog." },
          { name: "Yards / pieces", meaning: "How much arrived." },
          { name: "Units", meaning: "How many packs / units." },
          { name: "Type of unit", meaning: "Yards, pieces, sets, boxes, or bundles." },
        ]}
      />

      <ShipmentLineSheet shipmentId={shipment.id} lines={lines} />
    </main>
  );
}
