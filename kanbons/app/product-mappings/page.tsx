import { listProductMappings } from "@/lib/models/product_mappings";
import { listProductOptions } from "@/lib/models/products";
import { PageIntro } from "@/app/ui/page-intro";
import { ProductMappingSheet } from "./sheet";

export default async function ProductMappingsPage() {
  const [rows, products] = await Promise.all([
    listProductMappings(),
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

      <ProductMappingSheet rows={rows} productLabels={productLabels} />
    </main>
  );
}
