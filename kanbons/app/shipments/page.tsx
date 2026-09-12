import { listShipments } from "@/lib/models/shipments";
import { PageIntro } from "@/app/ui/page-intro";
import { ShipmentAddDialog } from "./add-dialog";
import { ShipmentSheet } from "./sheet";

export default async function ShipmentsPage() {
  const rows = await listShipments();

  return (
    <main className="p-6">
      <PageIntro
        title="Incoming containers"
        what="Shipments we received. Showing the 150 most recent. Add a container with all of its products at once. Open Lines to change them later."
        columns={[
          { name: "Number", meaning: "Our shipping number." },
          { name: "Country", meaning: "Where it came from." },
          { name: "Invoice number", meaning: "Supplier invoice on this shipment." },
          { name: "Arrival / Departure", meaning: "Dates on the shipment." },
          { name: "Lines", meaning: "Products on this container." },
        ]}
      />

      <div className="mb-4">
        <ShipmentAddDialog />
      </div>

      <ShipmentSheet rows={rows} />
    </main>
  );
}
