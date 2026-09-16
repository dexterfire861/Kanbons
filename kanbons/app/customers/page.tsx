import { listCustomers } from "@/lib/models/customers";
import { PageIntro } from "@/app/ui/page-intro";
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
          {
            name: "Remove",
            meaning: "Deletes this company. You cannot remove someone who still has packing lists.",
          },
        ]}
      />

      <CustomerSheet rows={rows} />
    </main>
  );
}
