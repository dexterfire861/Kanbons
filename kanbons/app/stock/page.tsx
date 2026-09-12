import { listProductOptions } from "@/lib/models/products";
import { listStock } from "@/lib/models/stock";
import { PageIntro } from "@/app/ui/page-intro";
import { StockSheet } from "./sheet";

export default async function StockPage() {
  const [stock, products] = await Promise.all([
    listStock(),
    listProductOptions(),
  ]);
  const byId = Object.fromEntries(
    products.map((product) => [
      product.id,
      { num: product.num, product: product.product },
    ])
  );

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

      <StockSheet rows={stock} products={byId} />
    </main>
  );
}
