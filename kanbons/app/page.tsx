import Link from "next/link";
import { listOpenPackingLists } from "@/lib/models/packing_lists";
import { listInTransitShipments } from "@/lib/models/shipments";

const pages = [
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/product-mappings", label: "Name matches" },
  { href: "/stock", label: "Stock" },
  { href: "/shipments", label: "Incoming containers" },
  { href: "/packing-lists", label: "Packing lists" },
  { href: "/contador", label: "Warehouse check" },
];

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default async function Home() {
  const [open, incoming] = await Promise.all([
    listOpenPackingLists(),
    listInTransitShipments(),
  ]);

  return (
    <main className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Kanbons</h1>
      <p className="mb-6 max-w-2xl text-sm text-zinc-600">
        Today&apos;s work, then any page. Change a cell and leave it to save.
      </p>

      <section className="mb-8 max-w-4xl">
        <h2 className="text-lg font-semibold">Customer orders</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Type a purchase order to make a packing slip.
        </p>
        <p className="mt-3">
          <Link href="/packing-lists/new" className="btn-primary">
            New packing slip
          </Link>
        </p>
      </section>

      <section className="mb-8 max-w-4xl">
        <h2 className="text-lg font-semibold">Need to pack or ship</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">Nothing waiting.</p>
        ) : (
          <div className="sheet mt-3">
            <table>
              <thead>
                <tr>
                  <th>List</th>
                  <th>Customer</th>
                  <th>PO</th>
                  <th>Status</th>
                  <th>Ship date</th>
                </tr>
              </thead>
              <tbody>
                {open.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/packing-lists/${row.id}`}
                        className="underline"
                      >
                        {row.num_pl}
                      </Link>
                    </td>
                    <td>{dash(row.customer)}</td>
                    <td>{dash(row.customer_po)}</td>
                    <td className="capitalize">{row.status}</td>
                    <td className="num">{dash(row.ship_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 max-w-4xl">
        <h2 className="text-lg font-semibold">Containers in transit</h2>
        {incoming.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No containers in transit.</p>
        ) : (
          <div className="sheet mt-3">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Invoice</th>
                  <th>Country</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/shipments/${row.id}`} className="underline">
                        {row.number}
                      </Link>
                    </td>
                    <td>{dash(row.invoice_number)}</td>
                    <td>{dash(row.country)}</td>
                    <td className="num">{dash(row.departure_date)}</td>
                    <td className="num">{dash(row.arrival_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Go to a page</h2>
        <div className="page-buttons">
          {pages.map((page) => (
            <Link key={page.href} href={page.href}>
              {page.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
