import Link from "next/link";
import { listCustomers } from "@/lib/models/customers";
import { listProducts } from "@/lib/models/products";
import { listProductMappings } from "@/lib/models/product_mappings";
import { nextPackingListNumber } from "@/lib/models/packing_lists";
import { timePage } from "@/lib/timing";
import { PageIntro } from "@/app/ui/page-intro";
import { PurchaseOrderForm } from "./po-form";

export default async function NewPackingSlipPage() {
  const { customers, products, mappings, nextNumber } = await timePage(
    "/packing-lists/new",
    async () => {
      const [customers, products, mappings, nextNumber] = await Promise.all([
        listCustomers(),
        listProducts(),
        listProductMappings(),
        nextPackingListNumber(),
      ]);
      return { customers, products, mappings, nextNumber };
    }
  );

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/packing-lists" className="underline">
          Packing lists
        </Link>
      </p>
      <PageIntro
        title="New packing slip"
        what="Pick the name as written on the PO. The packing slip on the right updates as you go. That name is what prints. Confirm when it looks right."
        columns={[
          { name: "As written", meaning: "Pick the customer name from Name matches. Punctuation and extra spaces are ignored when matching." },
          { name: "Confirm", meaning: "Saves the official packing list from this pane. Names must match." },
        ]}
      />
      <PurchaseOrderForm
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          id_cust: customer.id_cust,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zip_code: customer.zip_code,
        }))}
        products={products.map((product) => ({
          id: product.id,
          num: product.num,
          product: product.product,
          pre_uni: product.pre_uni,
        }))}
        mappings={mappings.map((mapping) => ({
          client_name: mapping.client_name,
          kanbons_name: mapping.kanbons_name,
          item_code: mapping.item_code,
          product_id: mapping.product_id,
        }))}
        nextNumber={nextNumber}
      />
    </main>
  );
}
