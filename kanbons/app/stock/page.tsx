import Link from "next/link";
import { listStockPage } from "@/lib/models/stock";
import { FindBar } from "@/app/ui/find-bar";
import { PageIntro } from "@/app/ui/page-intro";
import { ChangeStockDialog } from "./change-dialog";
import { StockSheet } from "./sheet";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const stock = await listStockPage({ q });

  return (
    <main className="p-6">
      <PageIntro
        title="Stock"
        what="On-hand book quantity and the last floor count. Warehouse check uses these numbers. One row per product."
        columns={[
          { name: "SKU / Name", meaning: "The product from the catalog." },
          { name: "Book qty", meaning: "Packs the system says we have." },
          { name: "Warehouse count", meaning: "What was counted on the floor." },
          { name: "Counted at", meaning: "When that floor count was saved." },
        ]}
      />

      <p className="page-note">
        <Link href="/changes" className="underline">
          Change history
        </Link>
      </p>

      <FindBar action="/stock" label="Find a product" defaultValue={q} />

      <div className="mb-4">
        <ChangeStockDialog rows={stock} />
      </div>

      {q ? (
        <p className="page-note">
          {stock.length === 0
            ? "No stock rows match that search."
            : `Showing ${stock.length} match${stock.length === 1 ? "" : "es"}.`}
        </p>
      ) : (
        <p className="page-note">
          Showing the first {stock.length} stock rows. Type to find a product.
        </p>
      )}

      <StockSheet rows={stock} />
    </main>
  );
}
