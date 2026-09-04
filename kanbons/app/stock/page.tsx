import { listProducts } from "@/lib/models/products";
import { listStock } from "@/lib/models/stock";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";
import { createStockAction, updateStockAction } from "./actions";

export default async function StockPage() {
  const [stock, products] = await timePage("/stock", () =>
    Promise.all([listStock(), listProducts()])
  );
  const byId = new Map(products.map((product) => [product.id, product]));
  const withStock = new Set(stock.map((row) => row.product_id));
  const withoutStock = products.filter((product) => !withStock.has(product.id));

  return (
    <main className="p-6">
      <PageIntro
        title="Stock"
        what="On-hand book quantity and the last floor count. Warehouse check uses these numbers. One row per product."
        columns={[
          { name: "SKU / Name", meaning: "The product from the catalog." },
          { name: "Book qty", meaning: "Packs the system says we have." },
          { name: "Warehouse count", meaning: "What was counted on the floor." },
          { name: "Counted at", meaning: "When that floor count was saved." },
        ]}
      />

      <form id="add-stock" action={createStockAction} hidden />
      {stock.map((row) => (
        <form
          key={row.product_id}
          id={`stock-${row.product_id}`}
          action={updateStockAction}
          hidden
        />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Book qty</th>
              <th>Warehouse count</th>
              <th>Counted at</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {withoutStock.length > 0 ? (
              <tr>
                <td colSpan={2}>
                  <select form="add-stock" name="product_id" required defaultValue="">
                    <option value="">Product</option>
                    {withoutStock.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.num} — {product.product}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input form="add-stock" name="quantity" placeholder="Book qty" />
                </td>
                <td>
                  <input
                    form="add-stock"
                    name="contador_physical"
                    placeholder="Warehouse count"
                  />
                </td>
                <td />
                <td className="actions">
                  <button form="add-stock" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                    Add
                  </button>
                </td>
              </tr>
            ) : null}
            {stock.map((row) => {
              const product = byId.get(row.product_id);
              const form = `stock-${row.product_id}`;
              return (
                <tr key={row.product_id}>
                  <td className="num">
                    {product?.num ?? row.product_id}
                    <input type="hidden" form={form} name="product_id" value={row.product_id} />
                  </td>
                  <td>{product?.product ?? ""}</td>
                  <td>
                    <input form={form} name="quantity" defaultValue={row.quantity ?? ""} />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="contador_physical"
                      defaultValue={row.contador_physical ?? ""}
                    />
                  </td>
                  <td className="num text-zinc-600">
                    {row.contador_counted_at
                      ? new Date(row.contador_counted_at).toLocaleString()
                      : ""}
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
