import { listCustomers } from "@/lib/models/customers";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";
import { CustomerAddDialog } from "./add-dialog";
import { updateCustomerAction } from "./actions";

export default async function CustomersPage() {
  const rows = await timePage("/customers", () => listCustomers());

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

      <div className="mb-4">
        <CustomerAddDialog />
      </div>

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
