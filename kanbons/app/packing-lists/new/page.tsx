import Link from "next/link";
import { listCustomers } from "@/lib/models/customers";
import { listMatchProducts } from "@/lib/models/products";
import { listProductMappings } from "@/lib/models/product_mappings";
import { nextPackingListNumber } from "@/lib/models/packing_lists";
import { listRecentPoIngestRuns } from "@/lib/models/po_ingest_runs";
import { PageIntro } from "@/app/ui/page-intro";
import { PurchaseOrderForm } from "./po-form";

export const maxDuration = 300;

export default async function NewPackingSlipPage() {
  const [customers, products, mappings, nextNumber, lastReads] =
    await Promise.all([
      listCustomers(),
      listMatchProducts(),
      listProductMappings(),
      nextPackingListNumber(),
      listRecentPoIngestRuns(10),
    ]);

  return (
    <main className="p-6">
      <p className="mb-2 text-sm">
        <Link href="/packing-lists" className="underline">
          Packing lists
        </Link>
      </p>
      <PageIntro
        title="New packing slip"
        what="Drop a purchase order PDF or type the lines. The packing slip on the right updates as you go. Empty fields say Needs you. Fields you change after the read are marked You changed this. Confirm when it looks right."
        columns={[
          { name: "Purchase order PDF", meaning: "We read the PDF and fill what we can, including Item code when it is in Products or Name matches." },
          { name: "As written", meaning: "Pick the customer name from Name matches, or keep the wording from the PDF." },
          { name: "Confirm", meaning: "Saves the official packing list from this pane. Names must match." },
        ]}
      />
      <PurchaseOrderForm
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          id_cust: customer.id_cust,
          company: customer.company,
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
          company: mapping.company,
        }))}
        nextNumber={nextNumber}
      />
      <section className="mt-8 max-w-4xl">
        <h2 className="text-lg font-semibold">Last reads</h2>
        {lastReads.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">None yet.</p>
        ) : (
          <div className="sheet mt-3">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>How long</th>
                  <th>Result</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {lastReads.map((row) => (
                  <tr key={row.id}>
                    <td>{row.filename}</td>
                    <td>{row.howLong}</td>
                    <td>{row.result}</td>
                    <td>{row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
