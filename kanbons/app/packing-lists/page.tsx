import Link from "next/link";
import { listCustomers } from "@/lib/models/customers";
import { listPackingLists } from "@/lib/models/packing_lists";
import { PageIntro } from "@/app/ui/page-intro";
import { createPackingListAction, updatePackingListAction } from "./actions";

export default async function PackingListsPage() {
  const [rows, customers] = await Promise.all([
    listPackingLists(),
    listCustomers(),
  ]);

  return (
    <main className="p-6">
      <PageIntro
        title="Packing lists"
        what="What we packed for a customer. Showing the 150 most recent. Open Lines to see products on one list."
        columns={[
          { name: "ID", meaning: "Assigned by the system." },
          { name: "Number", meaning: "Packing list number (num_pl)." },
          { name: "Customer", meaning: "Who this list is for." },
          { name: "PO", meaning: "Customer purchase order number." },
          { name: "Date / Ship date", meaning: "When it was made and when it ships." },
          { name: "State", meaning: "Destination state." },
          { name: "Lines", meaning: "Products on this list." },
        ]}
      />

      <form id="add-pl" action={createPackingListAction} hidden />
      {rows.map((row) => (
        <form key={row.id} id={`pl-${row.id}`} action={updatePackingListAction} hidden />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Number</th>
              <th>Customer</th>
              <th>PO</th>
              <th>Date</th>
              <th>Ship date</th>
              <th>State</th>
              <th>Lines</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input form="add-pl" name="num_pl" placeholder="Number" required />
              </td>
              <td>
                <select form="add-pl" name="customer_id" defaultValue="">
                  <option value="">Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input form="add-pl" name="customer_po" placeholder="PO" />
              </td>
              <td>
                <input form="add-pl" name="date" type="date" />
              </td>
              <td>
                <input form="add-pl" name="ship_date" type="date" />
              </td>
              <td>
                <input form="add-pl" name="state" placeholder="State" />
              </td>
              <td />
              <td className="actions">
                <button form="add-pl" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {rows.map((row) => {
              const form = `pl-${row.id}`;
              return (
                <tr key={row.id}>
                  <td className="num">
                    {row.id}
                    <input type="hidden" form={form} name="id" value={row.id} />
                  </td>
                  <td>
                    <input form={form} name="num_pl" defaultValue={row.num_pl} required />
                  </td>
                  <td>
                    <select form={form} name="customer_id" defaultValue={row.customer_id ?? ""}>
                      <option value="">None</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input form={form} name="customer_po" defaultValue={row.customer_po ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="date" type="date" defaultValue={row.date ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="ship_date" type="date" defaultValue={row.ship_date ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="state" defaultValue={row.state ?? ""} />
                  </td>
                  <td>
                    <Link href={`/packing-lists/${row.id}`} className="underline">
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
