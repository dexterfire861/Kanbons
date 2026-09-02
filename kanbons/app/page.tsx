import Link from "next/link";

const pages = [
  {
    href: "/customers",
    label: "Customers",
    what: "Who we ship to.",
    fields: "Name, customer code, address, contact, email",
  },
  {
    href: "/products",
    label: "Products",
    what: "Our catalog (SKU, pack size, price).",
    fields: "SKU, name, pack size, unit type, price",
  },
  {
    href: "/product-mappings",
    label: "Name matches",
    what: "Customer product names matched to our SKUs.",
    fields: "Customer name, Kanbons name, item code, product",
  },
  {
    href: "/stock",
    label: "Stock",
    what: "Book quantity and last warehouse count per product.",
    fields: "SKU, book qty, warehouse count, counted at",
  },
  {
    href: "/shipments",
    label: "Incoming containers",
    what: "Containers we received. Open Lines for products inside.",
    fields: "Number, country, container, arrival, departure",
  },
  {
    href: "/packing-lists",
    label: "Packing lists",
    what: "What we packed and sent to a customer. Open Lines for products.",
    fields: "List number, customer, PO, dates, state",
  },
  {
    href: "/contador",
    label: "Warehouse check",
    what: "Received − sold vs book vs floor. Read-only; edit counts on Stock.",
    fields: "SKU, received, sold, remaining, book qty, warehouse",
  },
];

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Kanbons</h1>
      <p className="mb-6 max-w-2xl text-sm text-zinc-600">
        Inventory and packing lists. Each page is one table. Change a cell and
        press Save. System IDs are assigned automatically.
      </p>
      <div className="sheet max-w-4xl">
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>What it is</th>
              <th>Columns</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.href}>
                <td>
                  <Link href={page.href} className="underline">
                    {page.label}
                  </Link>
                </td>
                <td>{page.what}</td>
                <td className="text-zinc-600">{page.fields}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
