import { listCustomers } from "@/lib/models/customers";
import { PageIntro } from "@/app/ui/page-intro";
import { createCustomerAction, updateCustomerAction } from "./actions";

export default async function CustomersPage() {
  const rows = await listCustomers();

  return (
    <main className="p-6">
      <PageIntro
        title="Customers"
        what="Companies we ship to. Used when you create a packing list."
        columns={[
          { name: "ID", meaning: "Assigned by the system. Do not type this." },
          { name: "Name", meaning: "Company name." },
          { name: "Customer code", meaning: "Short code (for example SOLTX)." },
          { name: "Address / City / State / ZIP", meaning: "Ship-to address." },
          { name: "Contact / Email", meaning: "Who we talk to at that company." },
        ]}
      />

      <form id="add-customer" action={createCustomerAction} hidden />
      {rows.map((row) => (
        <form
          key={row.id}
          id={`customer-${row.id}`}
          action={updateCustomerAction}
          hidden
        />
      ))}

      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Customer code</th>
              <th>City</th>
              <th>State</th>
              <th>Address</th>
              <th>ZIP</th>
              <th>Contact</th>
              <th>Email</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num text-zinc-400">new</td>
              <td>
                <input form="add-customer" name="name" placeholder="Name" required />
              </td>
              <td>
                <input form="add-customer" name="id_cust" placeholder="Code" />
              </td>
              <td>
                <input form="add-customer" name="city" placeholder="City" />
              </td>
              <td>
                <input form="add-customer" name="state" placeholder="State" />
              </td>
              <td>
                <input form="add-customer" name="address" placeholder="Address" />
              </td>
              <td>
                <input form="add-customer" name="zip_code" placeholder="ZIP" />
              </td>
              <td>
                <input form="add-customer" name="point_of_contact" placeholder="Contact" />
              </td>
              <td>
                <input form="add-customer" name="email_contact" placeholder="Email" />
              </td>
              <td className="actions">
                <button form="add-customer" type="submit" className="border border-zinc-800 px-2 py-1 text-sm">
                  Add
                </button>
              </td>
            </tr>
            {rows.map((row) => {
              const form = `customer-${row.id}`;
              return (
                <tr key={row.id}>
                  <td className="num">
                    {row.id}
                    <input type="hidden" form={form} name="id" value={row.id} />
                  </td>
                  <td>
                    <input form={form} name="name" defaultValue={row.name} required />
                  </td>
                  <td>
                    <input form={form} name="id_cust" defaultValue={row.id_cust ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="city" defaultValue={row.city ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="state" defaultValue={row.state ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="address" defaultValue={row.address ?? ""} />
                  </td>
                  <td>
                    <input form={form} name="zip_code" defaultValue={row.zip_code ?? ""} />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="point_of_contact"
                      defaultValue={row.point_of_contact ?? ""}
                    />
                  </td>
                  <td>
                    <input
                      form={form}
                      name="email_contact"
                      defaultValue={row.email_contact ?? ""}
                    />
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
