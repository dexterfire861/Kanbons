import Link from "next/link";
import { listPackingLists } from "@/lib/models/packing_lists";
import { PageIntro } from "@/app/ui/page-intro";
import { PackingListSheet } from "./sheet";

export default async function PackingListsPage() {
  const rows = await listPackingLists();

  return (
    <main className="p-6">
      <PageIntro
        title="Packing lists"
        what="What we packed for a customer. Showing the 150 most recent. Use New packing slip to type a PO, confirm, print, and dispatch."
        columns={[
          { name: "Number", meaning: "Packing list number." },
          { name: "Customer", meaning: "Who this list is for." },
          { name: "PO", meaning: "Customer purchase order number." },
          { name: "Date / Ship date", meaning: "When it was made and when it ships." },
          { name: "State", meaning: "Destination state." },
          { name: "Status", meaning: "Draft, confirmed, or dispatched." },
          { name: "Lines", meaning: "Products on this list." },
        ]}
      />

      <p className="mb-4">
        <Link href="/packing-lists/new" className="btn-primary">
          New packing slip
        </Link>
      </p>

      <PackingListSheet rows={rows} />
    </main>
  );
}
