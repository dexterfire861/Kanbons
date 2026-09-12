import { listCustomers } from "@/lib/models/customers";
import { PageIntro } from "@/app/ui/page-intro";
import { CustomerAddDialog } from "./add-dialog";
import { CustomerSheet } from "./sheet";

export default async function CustomersPage() {
  const rows = await listCustomers();

  return (
    <main className="p-6">
      <PageIntro
        title="Customers"
        what="Companies we ship to. Used when you create a packing list."
        columns={[
          { name: "Name", meaning: "Company name." },
          { name: "Customer code", meaning: "Short code (for example SOLTX)." },
          { name: "Address / City / State / ZIP", meaning: "Ship-to address." },
          { name: "Contact / Email", meaning: "Who we talk to at that company." },
        ]}
      />

      <div className="mb-4">
        <CustomerAddDialog />
      </div>

      <CustomerSheet rows={rows} />
    </main>
  );
}
