import Link from "next/link";
import { listContador } from "@/lib/models/contador";
import { FindBar } from "@/app/ui/find-bar";
import { PageIntro } from "@/app/ui/page-intro";
import { ContadorTable } from "./table";

export default async function ContadorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listContador({ q });

  return (
    <main className="p-6">
      <PageIntro
        title="Warehouse check"
        what="Compares paperwork to the floor. Highlighted rows do not match. Use Adjust count to add to the warehouse number. That updates Stock."
        columns={[
          { name: "SKU / Name", meaning: "The product." },
          { name: "Received", meaning: "Sum of incoming container lines." },
          { name: "Sold", meaning: "Sum of packing-list lines." },
          { name: "Remaining", meaning: "Received minus sold." },
          { name: "Book qty", meaning: "Packs on Stock." },
          { name: "Warehouse", meaning: "Last floor count from Stock." },
        ]}
      />

      <p className="page-note">
        <Link href="/changes" className="underline">
          Change history
        </Link>
      </p>

      <FindBar action="/contador" label="Find a product" defaultValue={q} />

      {q ? (
        <p className="page-note">
          {rows.length === 0
            ? "No products match that search."
            : `Showing ${rows.length} match${rows.length === 1 ? "" : "es"}.`}
        </p>
      ) : (
        <p className="page-note">
          {rows.length === 0
            ? "None that do not match. Type to find a product."
            : "Showing products that do not match. Type to find others."}
        </p>
      )}

      <ContadorTable rows={rows} />
    </main>
  );
}
