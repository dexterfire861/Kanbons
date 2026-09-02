import { listProducts } from "@/lib/models/products";
import { PageIntro } from "@/app/ui/page-intro";
import { createProductAction, updateProductAction } from "./actions";

export default async function ProductsPage() {
  const rows = await listProducts();

  return (
    <main className="p-6">
      <PageIntro
        title="Products"
        what="Our catalog. Stock, containers, and packing lists all point here."
        columns={[
          { name: "ID", meaning: "Assigned by the system." },
          { name: "SKU", meaning: "Our product number (num)." },
          { name: "Name", meaning: "What we call the product." },
          { name: "Pack size", meaning: "How many pieces/yards in one pack." },
          { name: "Unit type", meaning: "How we pack it (roll, box, …)." },
          { name: "Customer unit", meaning: "How the customer names that unit." },
          { name: "Measurement", meaning: "Yards, pieces, or other." },
          { name: "Price", meaning: "Price per unit (pre_uni)." },
        ]}
      />

      <form id="add-product" action={createProductAction} hidden />
      {rows.map((row) => (
        <form key={row.id} id={`product-${row.id}`} action={updateProductAction} hidden />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Pack size</th>
              <th>Unit type</th>
              <th>Customer unit</th>
              <th>Measurement</th>
              <th>Price</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input form="add-product" name="num" placeholder="SKU" required />
              </td>
              <td>
                <input form="add-product" name="product" placeholder="Name" required />
              </td>
              <td>
                <input form="add-product" name="unit_pack" placeholder="Pack" />
              </td>
              <td>
                <input form="add-product" name="type_of_unit" placeholder="Unit type" />
              </td>
              <td>
                <input
                  form="add-product"
                  name="type_of_unit_customer"
                  placeholder="Customer unit"
                />
              </td>
              <td>
                <input
                  form="add-product"
                  name="unit_of_measurement"
                  placeholder="Measurement"
                />
              </td>
              <td>
                <input form="add-product" name="pre_uni" placeholder="Price" />
              </td>
              <td className="actions">
                <button form="add-product" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {rows.map((row) => {
              const form = `product-${row.id}`;
              return (
                <tr key={row.id}>
                  <td className="num">
                    {row.id}
                    <input type="hidden" form={form} name="id" value={row.id} />
                  </td>
                  <td>
                    <input form={form} name="num" defaultValue={row.num} required />
                  </td>
                  <td>
                    <input form={form} name="product" defaultValue={row.product} required />
                  </td>
                  <td>
                    <input form={form} name="unit_pack" defaultValue={row.unit_pack ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="type_of_unit" defaultValue={row.type_of_unit ?? ""} />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="type_of_unit_customer"
                      defaultValue={row.type_of_unit_customer ?? ""}
                    />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="unit_of_measurement"
                      defaultValue={row.unit_of_measurement ?? ""}
                    />
                  </td>
                  <td>
                    <input form={form} name="pre_uni" defaultValue={row.pre_uni ?? ""} />
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
