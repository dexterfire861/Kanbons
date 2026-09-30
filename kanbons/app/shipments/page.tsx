import { listShipmentCountryTiles } from "@/lib/models/shipments";
import { PageIntro } from "@/app/ui/page-intro";
import { ShipmentAddDialog } from "./add-dialog";
import { CountryTiles } from "./tiles";

export default async function ShipmentsPage() {
  const tiles = await listShipmentCountryTiles();

  return (
    <main className="p-6">
      <PageIntro
        title="Incoming containers"
        what="Shipments grouped by country. Open a container to see or change its products. Add a container with all of its products at once."
        columns={[
          { name: "Country", meaning: "Where the containers came from." },
          { name: "Products", meaning: "What we have received from that country." },
          { name: "Recent containers", meaning: "The five most recent, with invoice and arrival." },
        ]}
      />

      <div className="mb-4">
        <ShipmentAddDialog />
      </div>

      {tiles.length === 0 ? (
        <p className="page-note">No containers yet.</p>
      ) : (
        <CountryTiles tiles={tiles} />
      )}
    </main>
  );
}
