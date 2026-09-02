import Link from "next/link";
import { notFound } from "next/navigation";
import { listProducts } from "@/lib/models/products";
import { getShipment } from "@/lib/models/shipments";
import { listShipmentLines } from "@/lib/models/shipment_lines";
import { PageIntro } from "@/app/ui/page-intro";
import {
  createShipmentLineAction,
  updateShipmentLineAction,
} from "./actions";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const [shipment, lines, products] = await Promise.all([
    getShipment(id),
    listShipmentLines(id),
    listProducts(),
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
        what={`${shipment.container_number ?? "No container number"} · ${shipment.country ?? "No country"}. Each row is a product that arrived on this container.`}
        columns={[
          { name: "Product", meaning: "SKU from our catalog." },
          { name: "Yards / pieces", meaning: "How much arrived." },
          { name: "Units", meaning: "How many packs / units." },
        ]}
      />

      <form id="add-ship-line" action={createShipmentLineAction} hidden />
      {lines.map((line) => (
        <form
          key={line.id}
          id={`ship-line-${line.id}`}
          action={updateShipmentLineAction}
          hidden
        />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Yards / pieces</th>
              <th>Units</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input type="hidden" form="add-ship-line" name="shipment_id" value={shipment.id} />
                <select form="add-ship-line" name="product_id" required defaultValue="">
                  <option value="">Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.num} — {product.product}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input form="add-ship-line" name="yards_pcs" placeholder="Yards / pieces" />
              </td>
              <td>
                <input form="add-ship-line" name="unit" placeholder="Units" />
              </td>
              <td className="actions">
                <button form="add-ship-line" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {lines.map((line) => {
              const form = `ship-line-${line.id}`;
              return (
                <tr key={line.id}>
                  <td className="num">
                    {line.id}
                    <input type="hidden" form={form} name="id" value={line.id} />
                    <input type="hidden" form={form} name="shipment_id" value={shipment.id} />
                  </td>
                  <td>
                    <select form={form} name="product_id" defaultValue={line.product_id ?? ""}>
                      <option value="">None</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.num} — {product.product}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input form={form} name="yards_pcs" defaultValue={line.yards_pcs ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="unit" defaultValue={line.unit ?? ""} />
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
