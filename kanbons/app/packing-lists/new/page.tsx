import Link from "next/link";
import { listCustomers } from "@/lib/models/customers";
import { listMatchProducts } from "@/lib/models/products";
import { listProductMappings } from "@/lib/models/product_mappings";
import { nextPackingListNumber } from "@/lib/models/packing_lists";
import { listRecentPoIngestRuns } from "@/lib/models/po_ingest_runs";
import { listStockOnHand } from "@/lib/models/stock";
import { PageIntro } from "@/app/ui/page-intro";
import { PurchaseOrderForm } from "./po-form";

export const maxDuration = 300;

export default async function NewPackingSlipPage() {
  const [customers, products, mappings, nextNumber, lastReads, stock] =
    await Promise.all([
      listCustomers(),
      listMatchProducts(),
      listProductMappings(),
      nextPackingListNumber(),
      listRecentPoIngestRuns(10),
      listStockOnHand(),
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
          { name: "Purchase order PDF", meaning: "We read the PDF and fill what we can, including Item code when it is in Products or Name matches. If this file was already saved, we ask whether to read it again." },
          { name: "Ship to / Bill to", meaning: "Find a customer by name or customer code to fill that block. They can be different. Ship to also sets Customer. Bill to only fills Bill to." },
          { name: "As written", meaning: "Pick the customer name from Name matches, or keep the wording from the PDF." },
          { name: "Our product", meaning: "If the name is new, pick our SKU here instead of leaving for Name matches." },
          { name: "Confirm", meaning: "Saves the packing list. New names can be saved so the next order finds them. Confirm waits if a line asks for more than Stock has." },
        ]}
      />
      <PurchaseOrderForm
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          id_cust: customer.id_cust,
          company: customer.company,
          point_of_contact: customer.point_of_contact,
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
          unit_pack: product.unit_pack,
        }))}
        mappings={mappings.map((mapping) => ({
          client_name: mapping.client_name,
          kanbons_name: mapping.kanbons_name,
          item_code: mapping.item_code,
          product_id: mapping.product_id,
          company: mapping.company,
        }))}
        nextNumber={nextNumber}
        stock={stock}
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
