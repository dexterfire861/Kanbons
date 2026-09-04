import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackingList } from "@/lib/models/packing_lists";
import { listPackingListLines } from "@/lib/models/packing_list_lines";
import { listProducts } from "@/lib/models/products";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";
import { dispatchSlipAction } from "../workflow-actions";
import {
  createPackingListLineAction,
  updatePackingListLineAction,
} from "./actions";

export default async function PackingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const [header, lines, products] = await timePage(`/packing-lists/${id}`, () =>
    Promise.all([
      getPackingList(id),
      listPackingListLines(id),
      listProducts(),
    ])
  );
  if (!header) notFound();

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/packing-lists" className="underline">
          Packing lists
        </Link>
      </p>
      <PageIntro
        title={`Packing list ${header.num_pl}`}
        what={`${header.customer ?? "No customer"} · PO ${header.customer_po ?? "—"} · ${header.status}. Each row is a product on this list. Total is yards/pieces × price.`}
        columns={[
          { name: "Product", meaning: "SKU from our catalog." },
          { name: "Yards / pieces", meaning: "How much we packed." },
          { name: "Units", meaning: "How many packs / units." },
          { name: "Price", meaning: "Price per unit." },
          { name: "Total", meaning: "Calculated. Not typed." },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {header.status === "draft" ? (
          <Link
            href={`/packing-lists/${header.id}/confirm`}
            className="border border-zinc-800 px-3 py-1 text-sm"
          >
            Confirm
          </Link>
        ) : null}
        <Link
          href={`/packing-lists/${header.id}/print`}
          className="border border-zinc-400 px-3 py-1 text-sm"
        >
          Print
        </Link>
        {header.status === "confirmed" ? (
          <form action={dispatchSlipAction}>
            <input type="hidden" name="id" value={header.id} />
            <button type="submit" className="border border-zinc-800 px-3 py-1 text-sm">
              Dispatch
            </button>
          </form>
        ) : null}
        {header.status === "dispatched" ? (
          <p className="text-sm text-zinc-600">
            Dispatched
            {header.dispatched_at
              ? ` ${new Date(header.dispatched_at).toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
      </div>

      <form id="add-pl-line" action={createPackingListLineAction} hidden />
      {lines.map((line) => (
        <form
          key={line.id}
          id={`pl-line-${line.id}`}
          action={updatePackingListLineAction}
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
              <th>Price</th>
              <th>Total</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input type="hidden" form="add-pl-line" name="packing_list_id" value={header.id} />
                <select form="add-pl-line" name="product_id" required defaultValue="">
                  <option value="">Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.num} — {product.product}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input form="add-pl-line" name="yards_pieces" placeholder="Yards / pieces" />
              </td>
              <td>
                <input form="add-pl-line" name="unit" placeholder="Units" />
              </td>
              <td>
                <input form="add-pl-line" name="pre_uni" placeholder="Price" />
              </td>
              <td />
              <td className="actions">
                <button form="add-pl-line" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {lines.map((line) => {
              const form = `pl-line-${line.id}`;
              return (
                <tr key={line.id}>
                  <td className="num">
                    {line.id}
                    <input type="hidden" form={form} name="id" value={line.id ?? ""} />
                    <input type="hidden" form={form} name="packing_list_id" value={header.id} />
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
                    <input form={form} name="yards_pieces" defaultValue={line.yards_pieces ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="unit" defaultValue={line.unit ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="pre_uni" defaultValue={line.pre_uni ?? ""} />
                  </td>
                  <td className="num">{line.total ?? ""}</td>
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
