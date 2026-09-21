import Link from "next/link";
import { listPackingListsForBol } from "@/lib/models/bills_of_lading";
import { PageIntro } from "@/app/ui/page-intro";
import { BillOfLadingForm } from "./form";

export default async function NewBillOfLadingPage() {
  const lists = await listPackingListsForBol();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/bills-of-lading" className="underline">
          Bills of lading
        </Link>
      </p>
      <PageIntro
        title="New bill of lading"
        what="Pick packing lists that are confirmed. Type how much of each line fits on this container. What does not fit becomes a packing list with -2."
        columns={[
          { name: "Packing list", meaning: "A confirmed list that is not already on a bill of lading." },
          { name: "On this container", meaning: "How much of that line goes on this container. The rest stays for the next one." },
        ]}
      />
      <BillOfLadingForm lists={lists} defaultDate={today} />
    </main>
  );
}
