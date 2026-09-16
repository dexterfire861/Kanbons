import { listProductMappingsPage } from "@/lib/models/product_mappings";
import { listProductOptions } from "@/lib/models/products";
import { FindBar } from "@/app/ui/find-bar";
import { PageIntro } from "@/app/ui/page-intro";
import { MappingAddDialog } from "./add-dialog";
import { ProductMappingSheet } from "./sheet";

export default async function ProductMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [rows, products] = await Promise.all([
    listProductMappingsPage({ q }),
    listProductOptions(),
  ]);
  const productLabels = Object.fromEntries(
    products.map((product) => [product.id, `${product.num} — ${product.product}`])
  );

  return (
    <main className="p-6">
      <PageIntro
        title="Name matches"
        what="Names customers put on orders, matched to our product. Needed when an order uses a different name than our SKU."
        columns={[
          { name: "Customer name", meaning: "What the customer calls the item." },
          { name: "Kanbons name", meaning: "Our name for the same item." },
          { name: "Item code", meaning: "Customer or our item code, if any." },
          { name: "Product", meaning: "The catalog SKU this name belongs to." },
        ]}
      />

      <FindBar
        action="/product-mappings"
        label="Find a name"
        defaultValue={q}
      />

      <div className="mb-4">
        <MappingAddDialog />
      </div>

      {q ? (
        <p className="page-note">
          {rows.length === 0
            ? "No name matches for that search."
            : `Showing ${rows.length} match${rows.length === 1 ? "" : "es"}.`}
        </p>
      ) : (
        <p className="page-note">
          Showing the first {rows.length} name matches. Type to find one.
        </p>
      )}

      <ProductMappingSheet rows={rows} productLabels={productLabels} />
    </main>
  );
}
