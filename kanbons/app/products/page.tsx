import { listProducts } from "@/lib/models/products";
import { PageIntro } from "@/app/ui/page-intro";
import { ProductSheet } from "./sheet";

export default async function ProductsPage() {
  const rows = await listProducts();

  return (
    <main className="p-6">
      <PageIntro
        title="Products"
        what="Our catalog. Stock, containers, and packing lists all point here. Leave a changed cell to save."
        columns={[
          { name: "SKU", meaning: "Our product number." },
          { name: "Name", meaning: "What we call the product." },
          { name: "Pack size", meaning: "How many pieces/yards in one pack." },
          { name: "Unit type", meaning: "How we pack it (roll, box, …)." },
          { name: "Customer unit", meaning: "How the customer names that unit." },
          { name: "Measurement", meaning: "Yards, pieces, or other." },
          { name: "Price", meaning: "Price per unit." },
        ]}
      />

      <ProductSheet rows={rows} />
    </main>
  );
}
