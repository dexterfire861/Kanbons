import Link from "next/link";
import { listShipments } from "@/lib/models/shipments";
import { PageIntro } from "@/app/ui/page-intro";
import { createShipmentAction, updateShipmentAction } from "./actions";

export default async function ShipmentsPage() {
  const rows = await listShipments();

  return (
    <main className="p-6">
      <PageIntro
        title="Incoming containers"
        what="Shipments we received. Each row is one container. Open Lines to see the products inside."
        columns={[
          { name: "ID", meaning: "Assigned by the system." },
          { name: "Number", meaning: "Our shipping number." },
          { name: "Country", meaning: "Where it came from." },
          { name: "Container", meaning: "Container number on the box." },
          { name: "Arrival / Departure", meaning: "Dates on the shipment." },
          { name: "Lines", meaning: "Products on this container." },
        ]}
      />

      <form id="add-shipment" action={createShipmentAction} hidden />
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
              <th>Container</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Lines</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input form="add-shipment" name="number" placeholder="Number" required />
              </td>
              <td>
                <input form="add-shipment" name="country" placeholder="Country" />
              </td>
              <td>
                <input form="add-shipment" name="container_number" placeholder="Container" />
              </td>
              <td>
                <input form="add-shipment" name="arrival_date" type="date" />
              </td>
              <td>
                <input form="add-shipment" name="departure_date" type="date" />
              </td>
              <td />
              <td className="actions">
                <button form="add-shipment" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
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
                      name="container_number"
                      defaultValue={row.container_number ?? ""}
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
