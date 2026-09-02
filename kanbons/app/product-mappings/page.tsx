import { listProductMappings } from "@/lib/models/product_mappings";
import { listProducts } from "@/lib/models/products";
import { PageIntro } from "@/app/ui/page-intro";
import {
  createProductMappingAction,
  updateProductMappingAction,
} from "./actions";

export default async function ProductMappingsPage() {
  const [rows, products] = await Promise.all([
    listProductMappings(),
    listProducts(),
  ]);

  return (
    <main className="p-6">
      <PageIntro
        title="Name matches"
        what="Names customers put on orders, matched to our product. Needed when an order uses a different name than our SKU."
        columns={[
          { name: "ID", meaning: "Assigned by the system." },
          { name: "Customer name", meaning: "What the customer calls the item." },
          { name: "Kanbons name", meaning: "Our name for the same item." },
          { name: "Item code", meaning: "Customer or our item code, if any." },
          { name: "Product", meaning: "The catalog SKU this name belongs to." },
        ]}
      />

      <form id="add-mapping" action={createProductMappingAction} hidden />
      {rows.map((row) => (
        <form
          key={row.id}
          id={`mapping-${row.id}`}
          action={updateProductMappingAction}
          hidden
        />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer name</th>
              <th>Kanbons name</th>
              <th>Item code</th>
              <th>Product</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input form="add-mapping" name="client_name" placeholder="Customer name" required />
              </td>
              <td>
                <input form="add-mapping" name="kanbons_name" placeholder="Kanbons name" />
              </td>
              <td>
                <input form="add-mapping" name="item_code" placeholder="Item code" />
              </td>
              <td>
                <select form="add-mapping" name="product_id" defaultValue="">
                  <option value="">None</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.num} — {product.product}
                    </option>
                  ))}
                </select>
              </td>
              <td className="actions">
                <button form="add-mapping" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {rows.map((row) => {
              const form = `mapping-${row.id}`;
              return (
                <tr key={row.id}>
                  <td className="num">
                    {row.id}
                    <input type="hidden" form={form} name="id" value={row.id} />
                  </td>
                  <td>
                    <input form={form} name="client_name" defaultValue={row.client_name} required />
                  </td>
                  <td>
                    <input form={form} name="kanbons_name" defaultValue={row.kanbons_name ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="item_code" defaultValue={row.item_code ?? ""} />
                  </td>
                  <td>
                    <select form={form} name="product_id" defaultValue={row.product_id ?? ""}>
                      <option value="">None</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.num} — {product.product}
                        </option>
                      ))}
                    </select>
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
