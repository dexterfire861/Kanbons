import { listShipmentCountryTiles } from "@/lib/models/shipments";
import { listOcrDocuments } from "@/lib/models/ocr_documents";
import { PageIntro } from "@/app/ui/page-intro";
import { ShipmentAddDialog } from "./add-dialog";
import { CountryTiles } from "./tiles";
import { SupplierPdfForm } from "./supplier-pdf";

export default async function ShipmentsPage() {
  const [tiles, documents] = await Promise.all([
    listShipmentCountryTiles(),
    listOcrDocuments("supplier"),
  ]);

  return (
    <main className="p-6">
      <PageIntro
        title="Incoming containers"
        what="Shipments grouped by country. Open a container to see or change its products. Add a container with all of its products at once."
        columns={[
          { name: "Country", meaning: "Where the containers came from." },
          { name: "Products", meaning: "What we have received from that country." },
          { name: "Recent containers", meaning: "The five most recent, with invoice and arrival." },
          { name: "Supplier PDF", meaning: "We keep the file and add the products on it to an incoming container." },
        ]}
      />

      <div className="mb-4">
        <ShipmentAddDialog />
      </div>

      <SupplierPdfForm />

      <section className="mb-8 max-w-4xl">
        <h2 className="text-lg font-semibold">Supplier documents</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">None yet.</p>
        ) : (
          <div className="sheet mt-3">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Result</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((row) => (
                  <tr key={row.id}>
                    <td>{row.filename}</td>
                    <td>
                      {row.status === "saved"
                        ? "Saved"
                        : row.status === "failed"
                          ? "Could not read"
                          : "Needs you"}
                    </td>
                    <td>
                      {row.url ? (
                        <a href={row.url} className="underline">
                          PDF
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tiles.length === 0 ? (
        <p className="page-note">No containers yet.</p>
      ) : (
        <CountryTiles tiles={tiles} />
      )}
    </main>
  );
}
