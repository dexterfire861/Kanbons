import Link from "next/link";
import { listProducts } from "@/lib/models/products";
import { listShipments } from "@/lib/models/shipments";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";
import { ShipmentAddDialog } from "./add-dialog";
import { updateShipmentAction } from "./actions";

export default async function ShipmentsPage() {
  const [rows, products] = await timePage("/shipments", () =>
    Promise.all([listShipments(), listProducts()])
  );

  return (
    <main className="p-6">
      <PageIntro
        title="Incoming containers"
        what="Shipments we received. Add a container with all of its products at once. Open Lines to change them later."
        columns={[
          { name: "ID", meaning: "Assigned by the system." },
          { name: "Number", meaning: "Our shipping number." },
          { name: "Country", meaning: "Where it came from." },
          { name: "Invoice number", meaning: "Supplier invoice on this shipment." },
          { name: "Arrival / Departure", meaning: "Dates on the shipment." },
          { name: "Lines", meaning: "Products on this container." },
        ]}
      />

      <div className="mb-4">
        <ShipmentAddDialog
          products={products.map((product) => ({
            id: product.id,
            num: product.num,
            product: product.product,
          }))}
        />
      </div>

      {rows.map((row) => (
        <form key={row.id} id={`shipment-${row.id}`} action={updateShipmentAction} hidden />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Number</th>
              <th>Country</th>
              <th>Invoice number</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Lines</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const form = `shipment-${row.id}`;
              return (
                <tr key={row.id}>
                  <td className="num">
                    {row.id}
                    <input type="hidden" form={form} name="id" value={row.id} />
                  </td>
                  <td>
                    <input form={form} name="number" defaultValue={row.number} required />
                  </td>
                  <td>
                    <input form={form} name="country" defaultValue={row.country ?? ""} />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="invoice_number"
                      defaultValue={row.invoice_number ?? ""}
                    />
                  </td>
                  <td>
                    <input form={form} name="arrival_date" type="date" defaultValue={row.arrival_date ?? ""} />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="departure_date"
                      type="date"
                      defaultValue={row.departure_date ?? ""}
                    />
                  </td>
                  <td>
                    <Link href={`/shipments/${row.id}`} className="underline">
                      Lines
                    </Link>
                  </td>
                  <td className="actions">
                    <button form={form} type="submit" className="border border-zinc-400 px-2 py-1 text-sm">
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
